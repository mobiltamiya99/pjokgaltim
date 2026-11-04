/* =====================================================================
   DATA — lapisan akses Supabase (baca/tulis + RPC) dan GAS (Drive/email)
   Semua halaman memanggil fungsi di objek `Data` & `Auth`; mode demo
   (demo.js) mengganti implementasinya tanpa mengubah halaman.
   ===================================================================== */
(function () {
  'use strict';
  const C = window.APP_CONFIG || {};
  C.SUPABASE_URL = String(C.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  C.SUPABASE_ANON_KEY = String(C.SUPABASE_ANON_KEY || '').trim();
  C.GAS_URL = String(C.GAS_URL || '').trim();
  // index.html (aplikasi asli) memasang window.KKG_PRODUKSI = true; demo.html tidak.
  const PRODUKSI = !!window.KKG_PRODUKSI;
  const KOSONG = !C.SUPABASE_URL || !C.SUPABASE_ANON_KEY;
  const DEMO = KOSONG && !PRODUKSI;

  // Periksa isi config.js agar salah isi terdeteksi dengan pesan yang jelas
  const galatKonfig = [];
  if (PRODUKSI) {
    if (!C.SUPABASE_URL) galatKonfig.push('SUPABASE_URL belum diisi.');
    else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(C.SUPABASE_URL)) galatKonfig.push('SUPABASE_URL harus berbentuk https://<Project ID>.supabase.co (bukan alamat GitHub Pages atau dashboard).');
    if (!C.SUPABASE_ANON_KEY) galatKonfig.push('SUPABASE_ANON_KEY belum diisi.');
    else if (/^sb_secret_/.test(C.SUPABASE_ANON_KEY)) galatKonfig.push('BAHAYA: SUPABASE_ANON_KEY berisi Secret key. Segera ganti dengan Publishable key (sb_publishable_…) dan buat ulang Secret key di Supabase.');
    else if (!/^(sb_publishable_|eyJ)/.test(C.SUPABASE_ANON_KEY)) galatKonfig.push('SUPABASE_ANON_KEY tidak dikenali. Gunakan Publishable key (sb_publishable_…).');
    if (!C.GAS_URL) galatKonfig.push('GAS_URL belum diisi (diperlukan untuk unggah berkas, email, dan PDF laporan).');
    else if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(C.GAS_URL)) galatKonfig.push('GAS_URL harus berbentuk https://script.google.com/macros/s/…/exec (salin dari Deploy → Manage deployments).');
  }
  const BELUM_SIAP = PRODUKSI && galatKonfig.some((g) => !/^GAS_URL/.test(g));

  let sb = null;
  if (!DEMO && !BELUM_SIAP && window.supabase) {
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
  const DOMAIN_USERNAME = 'akun.kkgpjok.id';
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

    // Username tanpa "@" diubah menjadi email buatan (akun dibuat Admin IT, tidak pernah dikirimi email)
    keEmail(id) {
      const v = String(id || '').trim().toLowerCase();
      return v.includes('@') ? v : v + '@' + DOMAIN_USERNAME;
    },
    async loginSandi(id, sandi) {
      if (!String(id || '').trim() || !sandi) throw new Error('Isi username/email dan kata sandi.');
      const { error } = await sb.auth.signInWithPassword({ email: Auth.keEmail(id), password: sandi });
      if (error) {
        const m = error.message || '';
        if (/invalid login credentials/i.test(m)) throw new Error('Username/email atau kata sandi salah.');
        if (/email not confirmed/i.test(m)) throw new Error('Akun belum diaktifkan. Hubungi Admin IT.');
        if (/rate limit|too many/i.test(m)) throw new Error('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.');
        throw new Error(m);
      }
      const p = await Auth.klaim();
      if (!p) throw new Error(Auth.galat || 'Akun belum terdaftar di aplikasi. Hubungi Admin IT.');
      return p;
    },
    async gantiSandi(baru) {
      if (String(baru).length < 8 || !/[A-Za-z]/.test(baru) || !/[0-9]/.test(baru)) throw new Error('Kata sandi minimal 8 karakter dan memuat huruf serta angka.');
      const { error } = await sb.auth.updateUser({ password: baru });
      if (error) throw new Error(/same/i.test(error.message) ? 'Kata sandi baru harus berbeda dari yang lama.' : error.message);
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
    sekolah: async () => cache.get('sekolah', 5 * 60 * 1000) ||
      cache.set('sekolah', await q(sb.from('sekolah').select('nama,gugus,status').order('nama'))),
    kegiatanMendatang: (n = 3) => q(sb.from('kegiatan').select('id,judul,kategori,tanggal,jam_mulai,jam_selesai,lokasi,deskripsi,status')
      .eq('tampil_publik', true).gte('tanggal', new Date().toISOString().slice(0, 10)).order('tanggal').limit(n)),
    beritaTerbaru: (n = 3) => q(sb.from('berita').select('id,judul,slug,kategori,ringkasan,gambar_url,tanggal_terbit')
      .eq('status', 'terbit').order('tanggal_terbit', { ascending: false }).limit(n)),
    prestasiTerbaru: (n = 4) => q(sb.from('v_prestasi_publik').select('*').order('tahun', { ascending: false }).order('dibuat_pada', { ascending: false }).limit(n)),
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
    clearDashCache() { Object.keys(cache.mem).filter((k) => k.startsWith('dash_')).forEach(cache.clear); cache.clear('sekolah'); },

    async updateOrg(patch) {
      const r = await q(sb.from('pengaturan_organisasi').update(patch).eq('id', 1).select().single());
      cache.set('org', r);
      return r;
    },
    anggotaPilihan: () => q(sb.from('anggota').select('id,nama,nip,sekolah').eq('status_aktif', true).order('nama')),

    // Akun pengguna (Admin IT)
    async pengguna({ cari = '', role = '', status = '', halaman = 1, per = 10, urut = 'nama', naik = true } = {}) {
      let x = sb.from('pengguna').select('id,email,nama,role,status_aktif,terakhir_login,auth_id,anggota_id,metode_login,anggota(sekolah,nip)', { count: 'exact' });
      cari = String(cari).replace(/[,()*%]/g, ' ').trim();   // cegah injeksi sintaks filter PostgREST
      if (cari) x = x.or(`nama.ilike.%${cari}%,email.ilike.%${cari}%`);
      if (role) x = x.eq('role', role);
      if (status) x = x.eq('status_aktif', status === 'aktif');
      x = x.order(urut, { ascending: naik }).range((halaman - 1) * per, halaman * per - 1);
      const r = await q(x);
      return { rows: r.data, total: r.count };
    },
    simpanPengguna: (row) => row.id
      ? q(sb.from('pengguna').update({ nama: row.nama, email: row.email.toLowerCase(), role: row.role, status_aktif: row.status_aktif, anggota_id: row.anggota_id || null, metode_login: row.metode_login || 'google' }).eq('id', row.id))
      : q(sb.from('pengguna').insert({ nama: row.nama, email: row.email.toLowerCase(), role: row.role, status_aktif: row.status_aktif, anggota_id: row.anggota_id || null, metode_login: row.metode_login || 'google' })),
    aturSandi: (email, sandi) => GAS.post('aturSandi', { email, sandi }),
    setStatusPengguna: (id, aktif) => q(sb.from('pengguna').update({ status_aktif: aktif }).eq('id', id)),

    // Notifikasi
    notifikasi: () => q(sb.from('notifikasi').select('*').order('dibuat_pada', { ascending: false }).limit(20)),
    tandaiDibaca: (id) => id
      ? q(sb.from('notifikasi').update({ dibaca: true }).eq('id', id))
      : q(sb.from('notifikasi').update({ dibaca: true }).eq('dibaca', false)),

    // ---------- BATCH 2: anggota ----------
    async anggota({ cari = '', sekolah = '', status = '', publik = '', kepeg = '', halaman = 1, per = 10, urut = 'nama', naik = true, semua = false } = {}) {
      let x = sb.from('anggota').select('*', { count: 'exact' });
      cari = String(cari).replace(/[,()*%]/g, ' ').trim();
      if (cari) x = x.or(`nama.ilike.%${cari}%,nip.ilike.%${cari}%,nuptk.ilike.%${cari}%,sekolah.ilike.%${cari}%`);
      if (sekolah) x = x.eq('sekolah', sekolah);
      if (status) x = x.eq('status_aktif', status === 'aktif');
      if (publik) x = x.eq('tampil_publik', publik === 'ya');
      if (kepeg) x = x.eq('status_kepegawaian', kepeg);
      x = x.order(urut || 'nama', { ascending: naik });
      x = semua ? x.limit(2000) : x.range((halaman - 1) * per, halaman * per - 1);
      const r = await q(x);
      return { rows: r.data, total: r.count };
    },
    async simpanAnggota(row) {
      const d = { nama: row.nama, nip: row.nip || null, nuptk: row.nuptk || null, email: row.email ? row.email.toLowerCase() : null,
        sekolah: String(row.sekolah || '').replace(/\s+/g, ' ').trim() || null, status_kepegawaian: row.status_kepegawaian, no_hp: row.no_hp || null, kompetensi: row.kompetensi || null,
        foto_url: row.foto_url || null, tampil_publik: !!row.tampil_publik, status_aktif: !!row.status_aktif };
      const r = row.id ? await q(sb.from('anggota').update(d).eq('id', row.id).select().single()) : await q(sb.from('anggota').insert(d).select().single());
      Data.clearDashCache(); return r;
    },
    hapusAnggota: (id) => q(sb.from('anggota').delete().eq('id', id)).then((r) => { Data.clearDashCache(); return r; }),
    setPublik: (ids, nilai) => q(sb.from('anggota').update({ tampil_publik: nilai }).in('id', [].concat(ids))),
    async imporAnggota(rows) {
      const r = await q(sb.from('anggota').insert(rows).select('id'));
      Data.clearDashCache(); return r.length;
    },
    async detailAnggota(id) {
      const th = new Date().getFullYear();
      const [a, iuran, keg, jab] = await Promise.all([
        q(sb.from('anggota').select('*').eq('id', id).single()),
        q(sb.from('iuran').select('bulan,status').eq('anggota_id', id).eq('tahun', th)).catch(() => null),
        q(sb.from('kegiatan_peserta').select('hadir, kegiatan(judul,tanggal)').eq('anggota_id', id).order('terdaftar_pada', { ascending: false }).limit(5)).catch(() => []),
        q(sb.from('pengurus').select('jabatan,periode_mulai,periode_selesai').eq('anggota_id', id)).catch(() => [])
      ]);
      return { anggota: a, iuran, kegiatan: keg, jabatan: jab };
    },

    // ---------- BATCH 2: pengurus ----------
    pengurusDaftar: () => q(sb.from('pengurus').select('*, anggota(id,nama,nip,sekolah,foto_url)').order('periode_mulai', { ascending: false }).order('urutan')),
    simpanPengurus: (row) => {
      const d = { anggota_id: row.anggota_id, jabatan: row.jabatan, periode_mulai: Number(row.periode_mulai), periode_selesai: Number(row.periode_selesai), urutan: Number(row.urutan || 10), sk_nomor: row.sk_nomor || null };
      return row.id ? q(sb.from('pengurus').update(d).eq('id', row.id)) : q(sb.from('pengurus').insert(d));
    },
    hapusPengurus: (id) => q(sb.from('pengurus').delete().eq('id', id)),
    async aturUrutan(daftar) { // [{id, urutan}]
      await Promise.all(daftar.map((p) => q(sb.from('pengurus').update({ urutan: p.urutan }).eq('id', p.id))));
    },

    // ---------- BATCH 2: pendaftaran ----------
    pendaftaran: () => q(sb.from('pendaftaran_anggota').select('*').order('dibuat_pada', { ascending: false }).limit(500)),
    async putuskanPendaftaran(id, setuju, catatan) {
      const r = await q(sb.rpc('putuskan_pendaftaran', { p_id: id, p_setujui: setuju, p_catatan: catatan }));
      Data.clearDashCache(); return r;
    },
    async aktivasiAkun(id, role) {
      const r = await q(sb.rpc('aktivasi_akun', { p_pendaftaran_id: id, p_role: role }));
      Data.clearDashCache(); return r;
    },

    // ---------- BATCH 2: pengajuan ----------
    pengajuanDaftar: (milikSaya = false) => q(sb.rpc('daftar_pengajuan', { p_milik_saya: milikSaya })),
    pengajuanDetail: (id) => q(sb.rpc('detail_pengajuan', { p_id: id })),
    async putuskanPengajuan(id, setuju, catatan) {
      const r = await q(sb.rpc('putuskan_pengajuan', { p_id: id, p_setujui: setuju, p_catatan: catatan }));
      Data.clearDashCache(); return r;
    },
    async ajukan({ jenis, ref_id = null, ref_tabel = null, ringkasan, data_usulan = {}, lampiran_url = null }) {
      const r = await q(sb.from('pengajuan').insert({ jenis, ref_id, ref_tabel, ringkasan, data_usulan, lampiran_url, pengaju_id: Auth.profil.id }).select('id,kode').single());
      Data.clearDashCache(); return r;
    },

    // ---------- BATCH 2: profil saya ----------
    async updateProfilSaya(patch) {
      const id = Auth.profil.anggota_id;
      if (!id) throw new Error('Akun Anda belum ditautkan ke data anggota.');
      const r = await q(sb.from('anggota').update(patch).eq('id', id).select().single());
      Auth.profil.anggota = Object.assign(Auth.profil.anggota || {}, r);
      return r;
    },

    // ---------- BATCH 3: program kerja ----------
    programDaftar: (tahun) => q(sb.from('program_kerja').select('*').eq('tahun', tahun).order('kode')),
    async simpanProgram(row) {
      const d = { judul: row.judul, deskripsi: row.deskripsi || null, penanggung_jawab: row.penanggung_jawab || null, target: row.target || null,
        tanggal_mulai: row.tanggal_mulai || null, tanggal_selesai: row.tanggal_selesai || null, progres_persen: Number(row.progres_persen || 0),
        status: row.status || 'belum_mulai', tahun: Number(row.tahun) };
      const r = row.id ? await q(sb.from('program_kerja').update(d).eq('id', row.id)) : await q(sb.from('program_kerja').insert(d));
      Data.clearDashCache(); return r;
    },
    hapusProgram: (id) => q(sb.from('program_kerja').delete().eq('id', id)).then((r) => { Data.clearDashCache(); return r; }),

    // ---------- BATCH 3: kegiatan & kehadiran ----------
    kegiatanDaftar: (tahun) => q(sb.rpc('daftar_kegiatan', { p_tahun: tahun || null })),
    kegiatanPilihan: () => q(sb.from('kegiatan').select('id,judul,tanggal').order('tanggal', { ascending: false }).limit(100)),
    async simpanKegiatan(row) {
      const d = { judul: row.judul, kategori: row.kategori, program_id: row.program_id || null, tanggal: row.tanggal, jam_mulai: row.jam_mulai || null,
        jam_selesai: row.jam_selesai || null, lokasi: row.lokasi || null, deskripsi: row.deskripsi || null, kuota: row.kuota ? Number(row.kuota) : null,
        status: row.status || 'akan_datang', tampil_publik: !!row.tampil_publik };
      const r = row.id ? await q(sb.from('kegiatan').update(d).eq('id', row.id)) : await q(sb.from('kegiatan').insert(d));
      Data.clearDashCache(); return r;
    },
    hapusKegiatan: (id) => q(sb.from('kegiatan').delete().eq('id', id)),
    pesertaKegiatan: (id) => q(sb.from('kegiatan_peserta').select('*, anggota(id,nama,nip,sekolah,foto_url)').eq('kegiatan_id', id)),
    async simpanPresensi(id, data) {
      const r = await q(sb.rpc('simpan_presensi', { p_kegiatan: id, p_data: data }));
      Data.clearDashCache(); return r;
    },
    ikutKegiatan: (id) => q(sb.from('kegiatan_peserta').insert({ kegiatan_id: id, anggota_id: Auth.profil.anggota_id })),
    batalIkut: (id) => q(sb.from('kegiatan_peserta').delete().eq('kegiatan_id', id).eq('anggota_id', Auth.profil.anggota_id)),

    // ---------- BATCH 3: persuratan & arsip ----------
    surat: (jenis) => q(sb.from(jenis === 'keluar' ? 'surat_keluar' : 'surat_masuk').select('*').order('tanggal', { ascending: false }).limit(1000)),
    simpanSurat(jenis, row) {
      const t = jenis === 'keluar' ? 'surat_keluar' : 'surat_masuk';
      const d = jenis === 'keluar'
        ? { tanggal: row.tanggal, tujuan: row.tujuan, perihal: row.perihal, file_url: row.file_url || null, status: row.status || 'draf' }
        : { nomor_surat: row.nomor_surat, tanggal_surat: row.tanggal_surat || null, tanggal: row.tanggal, pengirim: row.pengirim, perihal: row.perihal, disposisi: row.disposisi || null, file_url: row.file_url || null };
      if (jenis === 'keluar' && row.id) d.nomor_surat = row.nomor_surat;
      return row.id ? q(sb.from(t).update(d).eq('id', row.id)) : q(sb.from(t).insert(d).select().single());
    },
    hapusSurat: (jenis, id) => q(sb.from(jenis === 'keluar' ? 'surat_keluar' : 'surat_masuk').delete().eq('id', id)),
    nomorSuratBerikutnya: (tgl) => q(sb.rpc('nomor_surat_berikutnya', { p_tanggal: tgl })),
    notulen: () => q(sb.from('notulen').select('*, kegiatan(judul,tanggal)').order('tanggal', { ascending: false }).limit(500)),
    simpanNotulen(row) {
      const d = { judul: row.judul, kegiatan_id: row.kegiatan_id || null, tanggal: row.tanggal, pemimpin: row.pemimpin || null, notulis: row.notulis || null,
        isi: row.isi || null, file_url: row.file_url || null, status: row.status || 'draf' };
      return row.id ? q(sb.from('notulen').update(d).eq('id', row.id)) : q(sb.from('notulen').insert(d));
    },
    hapusNotulen: (id) => q(sb.from('notulen').delete().eq('id', id)),
    dokumen: () => q(sb.from('dokumen').select('*').order('dibuat_pada', { ascending: false }).limit(1000)),
    simpanDokumen(row) {
      const d = { judul: row.judul, kode: row.kode || null, kategori: row.kategori, penerbit: row.penerbit || null, akses: row.akses, file_url: row.file_url || null, ukuran_kb: row.ukuran_kb || null };
      return row.id ? q(sb.from('dokumen').update(d).eq('id', row.id)) : q(sb.from('dokumen').insert(d));
    },
    hapusDokumen: (id) => q(sb.from('dokumen').delete().eq('id', id)),

    // ---------- BATCH 4: keuangan ----------
    ringkasanKeuangan: (tahun) => q(sb.rpc('ringkasan_keuangan', { p_tahun: tahun || null })),
    kasDaftar: (tahun) => q(sb.from('kas_transaksi').select('*').gte('tanggal', tahun + '-01-01').lte('tanggal', tahun + '-12-31')
      .order('tanggal', { ascending: true }).order('dibuat_pada', { ascending: true }).limit(5000)),
    async simpanKas(row) {
      const d = { tanggal: row.tanggal, jenis: row.jenis, kategori: row.kategori || 'Lainnya', uraian: row.uraian, nominal: Number(row.nominal), bukti_url: row.bukti_url || null };
      const r = row.id ? await q(sb.from('kas_transaksi').update(d).eq('id', row.id).select().single()) : await q(sb.from('kas_transaksi').insert(d).select().single());
      Data.clearDashCache(); return r;
    },
    hapusKas: (id) => q(sb.from('kas_transaksi').delete().eq('id', id)).then((r) => { Data.clearDashCache(); return r; }),
    async iuranRekap(tahun) {
      const [anggota, iuran] = await Promise.all([
        q(sb.from('anggota').select('id,nama,sekolah,no_hp,email,foto_url,tanggal_gabung').eq('status_aktif', true).order('nama').limit(2000)),
        q(sb.from('iuran').select('*').eq('tahun', tahun).limit(20000))]);
      return { anggota, iuran };
    },
    tandaiLunas: (anggotaId, tahun, bulan) => q(sb.rpc('tandai_lunas', { p_anggota_id: anggotaId, p_tahun: tahun, p_bulan: bulan, p_metode: 'tunai' })).then((r) => { Data.clearDashCache(); return r; }),
    batalkanLunas: (iuranId) => q(sb.rpc('batalkan_lunas', { p_iuran_id: iuranId })).then((r) => { Data.clearDashCache(); return r; }),
    iuranSaya: (tahun) => q(sb.from('iuran').select('*').eq('anggota_id', Auth.profil.anggota_id).eq('tahun', tahun)),
    ajukanBuktiIuran: (tahun, bulan, bukti_url, catatan) => q(sb.rpc('ajukan_bukti_iuran', { p_tahun: tahun, p_bulan: bulan, p_bukti_url: bukti_url, p_catatan: catatan || null }))
      .then((r) => { Data.clearDashCache(); return r; }),
    tunggakan: () => q(sb.from('v_tunggakan_iuran').select('*').order('jumlah_bulan', { ascending: false }).order('nama')),
    kirimPengingat: (ids) => GAS.post('kirimPengingat', { anggota_ids: ids }),
    statusAntrean: () => GAS.post('statusAntrean', {}).then((r) => r.data),
    prosesAntreanKini: () => GAS.post('prosesAntreanKini', {}).then((r) => r.data),

    // ---------- BATCH 5: halaman publik ----------
    anggotaPublik: () => q(sb.from('v_anggota_publik').select('*').order('nama').limit(1000)),
    programPublik: (tahun) => q(sb.from('program_kerja').select('id,kode,judul,deskripsi,penanggung_jawab,target,tanggal_mulai,tanggal_selesai,progres_persen,status,tahun').eq('tahun', tahun).order('kode')),
    agendaPublik: (tahun) => q(sb.rpc('daftar_kegiatan', { p_tahun: tahun || null })),
    lombaSemua: () => q(sb.from('lomba').select('*').order('tanggal', { ascending: false }).limit(500)),
    prestasiPublik: () => q(sb.from('v_prestasi_publik').select('*').order('tahun', { ascending: false }).limit(3000)),
    beritaPublik: () => q(sb.from('berita').select('id,judul,slug,kategori,ringkasan,gambar_url,tanggal_terbit').eq('status', 'terbit').order('tanggal_terbit', { ascending: false }).limit(300)),
    async beritaDetail(kunci) {
      const kol = /^[0-9a-f-]{36}$/i.test(kunci) ? 'id' : 'slug';
      const r = await q(sb.from('berita').select('*').eq(kol, kunci).maybeSingle());
      if (!r) throw new Error('Berita tidak ditemukan atau belum diterbitkan.');
      return r;
    },
    albumPublik: () => q(sb.from('dokumentasi_album').select('*, kegiatan(judul), dokumentasi_foto(count)').order('tanggal', { ascending: false }).limit(300)),
    async albumDetail(id) {
      const [album, foto] = await Promise.all([q(sb.from('dokumentasi_album').select('*, kegiatan(judul)').eq('id', id).maybeSingle()),
        q(sb.from('dokumentasi_foto').select('*').eq('album_id', id).order('dibuat_pada'))]);
      if (!album) throw new Error('Album tidak ditemukan.');
      return Object.assign(album, { foto });
    },

    // ---------- BATCH 5: lomba, peserta, prestasi ----------
    lombaDaftar: () => q(sb.from('lomba').select('*, lomba_peserta(count)').order('tanggal', { ascending: false }).limit(500)),
    simpanLomba(row) {
      const d = { nama: row.nama, jenis: row.jenis, cabang: row.cabang || null, tingkat: row.tingkat || null, tanggal: row.tanggal || null, tanggal_selesai: row.tanggal_selesai || null,
        batas_daftar: row.batas_daftar || null, lokasi: row.lokasi || null, deskripsi: row.deskripsi || null, status: row.status || 'pendaftaran_dibuka' };
      return row.id ? q(sb.from('lomba').update(d).eq('id', row.id)) : q(sb.from('lomba').insert(d).select().single());
    },
    hapusLomba: (id) => q(sb.from('lomba').delete().eq('id', id)),
    pesertaDaftar: () => q(sb.from('lomba_peserta').select('*, lomba(id,nama,jenis,cabang,tingkat,tanggal,status), anggota(nama), prestasi(id,peringkat,status,sertifikat_url,tampil_publik)')
      .order('dibuat_pada', { ascending: false }).limit(3000)),
    simpanPeserta(row) {
      const d = { lomba_id: row.lomba_id, nama_siswa: row.nama_siswa, kelas: row.kelas || null, sekolah: row.sekolah, cabang: row.cabang || null, guru_pendamping_id: row.guru_pendamping_id || null };
      return row.id ? q(sb.from('lomba_peserta').update(d).eq('id', row.id)) : q(sb.from('lomba_peserta').insert(Object.assign(d, { status: 'disetujui' })));
    },
    hapusPeserta: (id) => q(sb.from('lomba_peserta').delete().eq('id', id)),
    daftarkanPeserta: (lombaId, siswa) => q(sb.rpc('daftarkan_peserta', { p_lomba: lombaId, p_siswa: siswa })).then((r) => { Data.clearDashCache(); return r; }),
    async catatHasil(pesertaId, peringkat, sertifikat_url) {
      const ada = await q(sb.from('prestasi').select('id,sertifikat_url').eq('peserta_id', pesertaId).neq('status', 'ditolak').maybeSingle());
      const r = ada ? await q(sb.from('prestasi').update({ peringkat, status: 'disetujui', sertifikat_url: sertifikat_url || ada.sertifikat_url }).eq('id', ada.id))
        : await q(sb.from('prestasi').insert({ peserta_id: pesertaId, peringkat, sertifikat_url: sertifikat_url || null, status: 'disetujui', tampil_publik: true }));
      Data.clearDashCache(); return r;
    },
    prestasiDaftar: () => q(sb.from('prestasi').select('*, lomba_peserta(id,nama_siswa,kelas,sekolah,cabang,guru_pendamping_id, lomba(id,nama,jenis,tingkat,tanggal), anggota(nama))')
      .order('dibuat_pada', { ascending: false }).limit(3000)),
    setPrestasiPublik: (id, v) => q(sb.from('prestasi').update({ tampil_publik: v }).eq('id', id)),
    hapusPrestasi: (id) => q(sb.from('prestasi').delete().eq('id', id)).then((r) => { Data.clearDashCache(); return r; }),
    ajukanPrestasi: (d) => q(sb.rpc('ajukan_prestasi', { p_peringkat: d.peringkat, p_sertifikat: d.sertifikat_url, p_peserta: d.peserta_id || null,
      p_lomba: d.lomba_id || null, p_nama_siswa: d.nama_siswa || null, p_kelas: d.kelas || null, p_cabang: d.cabang || null })).then((r) => { Data.clearDashCache(); return r; }),

    // ---------- BATCH 5: berita & dokumentasi ----------
    beritaDaftar: () => q(sb.from('berita').select('*').order('dibuat_pada', { ascending: false }).limit(500)),
    simpanBerita(row) {
      const d = { judul: row.judul, kategori: row.kategori, ringkasan: row.ringkasan || null, isi: row.isi || null, gambar_url: row.gambar_url || null, status: row.status };
      return row.id ? q(sb.from('berita').update(d).eq('id', row.id).select().single()) : q(sb.from('berita').insert(d).select().single());
    },
    hapusBerita: (id) => q(sb.from('berita').delete().eq('id', id)),
    albumDaftar: () => q(sb.from('dokumentasi_album').select('*, kegiatan(judul), dokumentasi_foto(count)').order('tanggal', { ascending: false }).limit(500)),
    simpanAlbum(row) {
      const d = { judul: row.judul, kegiatan_id: row.kegiatan_id || null, tanggal: row.tanggal, kategori: row.kategori || null, sampul_url: row.sampul_url || null };
      return row.id ? q(sb.from('dokumentasi_album').update(d).eq('id', row.id).select().single()) : q(sb.from('dokumentasi_album').insert(d).select().single());
    },
    hapusAlbum: (id) => q(sb.from('dokumentasi_album').delete().eq('id', id)),
    tambahFoto: (albumId, foto_url, keterangan) => q(sb.from('dokumentasi_foto').insert({ album_id: albumId, foto_url, keterangan: keterangan || null }).select().single()),
    ubahFoto: (id, keterangan) => q(sb.from('dokumentasi_foto').update({ keterangan: keterangan || null }).eq('id', id)),
    hapusFoto: (id) => q(sb.from('dokumentasi_foto').delete().eq('id', id)),

    // ---------- BATCH 6: pusat laporan & log ----------
    laporanArsip: () => q(sb.from('laporan_arsip').select('*').order('dibuat_pada', { ascending: false }).limit(300)),
    simpanLaporanPdf: (d) => GAS.post('simpanLaporan', d).then((r) => r.data),
    catatEkspor: (jenis, judul, periode, format = 'xlsx') => q(sb.rpc('catat_ekspor', { p_jenis: jenis, p_judul: judul, p_periode: periode, p_format: format })).catch(() => null),
    rekapKehadiran: (mulai, selesai) => q(sb.rpc('rekap_kehadiran', { p_mulai: mulai, p_selesai: selesai })),
    async logAktivitas({ dari = '', sampai = '', aksi = '', tabel = '', cari = '', halaman = 1, per = 20, semua = false } = {}) {
      let x = sb.from('log_aktivitas').select('*', { count: 'exact' });
      if (dari) x = x.gte('waktu', dari + 'T00:00:00+07:00');
      if (sampai) x = x.lte('waktu', sampai + 'T23:59:59+07:00');
      if (aksi) x = x.eq('aksi', aksi);
      if (tabel) x = x.eq('tabel', tabel);
      cari = String(cari).replace(/[,()*%]/g, ' ').trim();
      if (cari) x = x.ilike('nama_aktor', '%' + cari + '%');
      x = x.order('waktu', { ascending: false });
      x = semua ? x.limit(5000) : x.range((halaman - 1) * per, halaman * per - 1);
      const r = await q(x);
      return { rows: r.data, total: r.count };
    },

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

  window.KKG = { DOMAIN_USERNAME, DEMO, PRODUKSI, BELUM_SIAP, galatKonfig, sb, Auth, Data, GAS, cache };
})();
