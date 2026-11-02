/* =====================================================================
   DATA — lapisan akses Supabase (baca/tulis + RPC) dan GAS (Drive/email)
   Semua halaman memanggil fungsi di objek `Data` & `Auth`; mode demo
   (demo.js) mengganti implementasinya tanpa mengubah halaman.
   ===================================================================== */
(function () {
  'use strict';
  const C = window.APP_CONFIG || {};
  const DEMO = !C.SUPABASE_URL || !C.SUPABASE_ANON_KEY;

  let sb = null;
  if (!DEMO && window.supabase) {
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  // Cache ringan di memori + sessionStorage untuk data jarang berubah (PRD §6 kinerja)
  const cache = {
    mem: {},
    get(k, ttlMs) {
      const hit = cache.mem[k];
      if (hit && Date.now() - hit.t < ttlMs) return hit.v;
      try {
        const s = JSON.parse(sessionStorage.getItem('kkg_c_' + k) || 'null');
        if (s && Date.now() - s.t < ttlMs) { cache.mem[k] = s; return s.v; }
      } catch (e) { /* abaikan */ }
      return null;
    },
    set(k, v) {
      cache.mem[k] = { t: Date.now(), v };
      try { sessionStorage.setItem('kkg_c_' + k, JSON.stringify(cache.mem[k])); } catch (e) { /* abaikan */ }
      return v;
    },
    clear(k) { delete cache.mem[k]; try { sessionStorage.removeItem('kkg_c_' + k); } catch (e) { /* abaikan */ } }
  };

  async function q(promise) {
    const { data, error, count } = await promise;
    if (error) throw new Error(pesanGalat(error));
    return count !== undefined && count !== null ? { data, count } : data;
  }
  function pesanGalat(e) {
    const m = e.message || String(e);
    if (/row-level security/i.test(m)) return 'Anda tidak memiliki izin untuk tindakan ini.';
    if (/duplicate key/i.test(m)) return 'Data sudah ada (duplikat).';
    if (/JWT expired/i.test(m)) return 'Sesi berakhir. Silakan login ulang.';
    return m;
  }

  // ---------------------------------------------------------------
  // GAS (REST, POST text/plain agar bebas CORS preflight)
  // ---------------------------------------------------------------
  const GAS = {
    async post(action, data, publik = false) {
      if (!C.GAS_URL) throw new Error('GAS_URL belum diisi di config.js.');
      let token = null;
      if (!publik) {
        const { data: s } = await sb.auth.getSession();
        token = s.session && s.session.access_token;
      }
      const res = await fetch(C.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token, data })
      });
      const out = await res.json();
      if (!out.success) throw new Error(out.message || 'Permintaan gagal.');
      return out;
    },
    upload: (kategori, berkas, extra = {}) => GAS.post('upload', Object.assign({ kategori }, berkas, extra)).then((r) => r.data),
    uploadPendaftaran: (berkas) => GAS.post('uploadPendaftaran', berkas, true).then((r) => r.data)
  };

  // ---------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------
  const Auth = {
    profil: null,
    galat: null,
    demo: DEMO,

    async init() {
      // Bersihkan ?code= dari URL setelah PKCE ditukar oleh supabase-js
      const { data } = await sb.auth.getSession();
      if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + (location.hash || '#/app/dashboard'));
      if (data.session) await Auth.klaim();
      sb.auth.onAuthStateChange((evt) => {
        if (evt === 'SIGNED_OUT') { Auth.profil = null; }
      });
      return Auth.profil;
    },

    async klaim() {
      const r = await q(sb.rpc('klaim_akun'));
      if (!r.ok) {
        Auth.galat = r.pesan;
        Auth.profil = null;
        await sb.auth.signOut();
        return null;
      }
      Auth.profil = r.profil;
      Auth.galat = null;
      return Auth.profil;
    },

    async refreshProfil() {
      Auth.profil = await q(sb.rpc('profil_saya'));
      return Auth.profil;
    },

    async loginGoogle() {
      try { localStorage.setItem('kkg_after_login', '#/app/dashboard'); } catch (e) { /* abaikan */ }
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } }
      });
      if (error) throw new Error(error.message);
    },

    async logout() {
      Auth.profil = null;
      cache.clear('dash');
      await sb.auth.signOut();
    }
  };

  // ---------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------
  const Data = {
    // ---------- publik ----------
    async org(paksa = false) {
      const hit = !paksa && cache.get('org', 10 * 60 * 1000);
      if (hit) return hit;
      return cache.set('org', await q(sb.from('pengaturan_organisasi').select('*').eq('id', 1).single()));
    },
    statPublik: () => q(sb.from('v_statistik_publik').select('*').single()),
    sekolah: async () => cache.get('sekolah', 30 * 60 * 1000) ||
      cache.set('sekolah', await q(sb.from('sekolah').select('nama,gugus,status').order('nama'))),
    kegiatanMendatang: (n = 3) => q(sb.from('kegiatan').select('id,judul,kategori,tanggal,jam_mulai,jam_selesai,lokasi,deskripsi,status')
      .eq('tampil_publik', true).gte('tanggal', new Date().toISOString().slice(0, 10)).order('tanggal').limit(n)),
    beritaTerbaru: (n = 3) => q(sb.from('berita').select('id,judul,slug,kategori,ringkasan,gambar_url,tanggal_terbit')
      .eq('status', 'terbit').order('tanggal_terbit', { ascending: false }).limit(n)),
    prestasiTerbaru: (n = 4) => q(sb.from('v_prestasi_publik').select('*').order('tahun', { ascending: false }).limit(n)),
    prestasiSemua: () => q(sb.from('v_prestasi_publik').select('peringkat,sekolah,tahun')),
    lombaAktif: (n = 3) => q(sb.from('lomba').select('*').neq('status', 'selesai').order('tanggal').limit(n)),
    pengurusPublik: () => q(sb.from('v_pengurus_publik').select('*').order('urutan')),

    async daftar(payload) {
      return q(sb.from('pendaftaran_anggota').insert(payload));
    },

    // ---------- internal ----------
    async dashboard(tahun) {
      const k = 'dash_' + (tahun || 'now');
      const hit = cache.get(k, 60 * 1000);
      if (hit) return hit;
      return cache.set(k, await q(sb.rpc('dashboard_ringkasan', { p_tahun: tahun || null })));
    },
    clearDashCache() { Object.keys(cache.mem).filter((k) => k.startsWith('dash_')).forEach(cache.clear); },

    async updateOrg(patch) {
      const r = await q(sb.from('pengaturan_organisasi').update(patch).eq('id', 1).select().single());
      cache.set('org', r);
      return r;
    },
    anggotaPilihan: () => q(sb.from('anggota').select('id,nama,nip,sekolah').eq('status_aktif', true).order('nama')),

    // Akun pengguna (Admin IT)
    async pengguna({ cari = '', role = '', status = '', halaman = 1, per = 10, urut = 'nama', naik = true } = {}) {
      let x = sb.from('pengguna').select('id,email,nama,role,status_aktif,terakhir_login,auth_id,anggota_id,anggota(sekolah,nip)', { count: 'exact' });
      cari = String(cari).replace(/[,()*%]/g, ' ').trim();   // cegah injeksi sintaks filter PostgREST
      if (cari) x = x.or(`nama.ilike.%${cari}%,email.ilike.%${cari}%`);
      if (role) x = x.eq('role', role);
      if (status) x = x.eq('status_aktif', status === 'aktif');
      x = x.order(urut, { ascending: naik }).range((halaman - 1) * per, halaman * per - 1);
      const r = await q(x);
      return { rows: r.data, total: r.count };
    },
    simpanPengguna: (row) => row.id
      ? q(sb.from('pengguna').update({ nama: row.nama, email: row.email.toLowerCase(), role: row.role, status_aktif: row.status_aktif, anggota_id: row.anggota_id || null }).eq('id', row.id))
      : q(sb.from('pengguna').insert({ nama: row.nama, email: row.email.toLowerCase(), role: row.role, status_aktif: row.status_aktif, anggota_id: row.anggota_id || null })),
    setStatusPengguna: (id, aktif) => q(sb.from('pengguna').update({ status_aktif: aktif }).eq('id', id)),

    // Notifikasi
    notifikasi: () => q(sb.from('notifikasi').select('*').order('dibuat_pada', { ascending: false }).limit(20)),
    tandaiDibaca: (id) => id
      ? q(sb.from('notifikasi').update({ dibaca: true }).eq('id', id))
      : q(sb.from('notifikasi').update({ dibaca: true }).eq('dibaca', false)),

    // Berkas privat lewat GAS
    async bukaBerkas(url) {
      if (!url) throw new Error('Berkas tidak ada.');
      if (!String(url).startsWith('drive:')) return { url };
      const r = await GAS.post('ambilBerkas', { url });
      return { dataUrl: `data:${r.data.mime};base64,${r.data.base64}`, nama: r.data.nama, mime: r.data.mime };
    },
    upload: GAS.upload,
    uploadPendaftaran: GAS.uploadPendaftaran
  };

  window.KKG = { DEMO, sb, Auth, Data, GAS, cache };
})();
