/* =====================================================================
   BATCH 5 — Lomba & Prestasi, Publikasi (aplikasi internal)
   Jadwal Lomba · Peserta Lomba · Prestasi · Berita · Dokumentasi
   Hak akses PRD §3.2: Sekretaris kelola lomba/peserta/prestasi; Wakil &
   Sekretaris kelola berita/dokumentasi; Anggota daftarkan siswa & ajukan prestasi.
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, BULAN, BLN, PERINGKAT, avatar, toast, modal, konfirmasi, Router, validasi, debounce, emptyState, skeletonCards, kompresGambar } = window.K;
  const { Auth, Data } = window.KKG;
  const { shell, muatBadge } = window.AppKit;
  const UI = window.UI;
  const adalah = (...r) => r.includes(Auth.profil.role);
  const PENGURUS = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara'];
  const TH = () => new Date().getFullYear();
  const hariIni = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const gagal = (el, e) => { el.innerHTML = `<div class="alert error" style="grid-column:1/-1"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div>`; };
  const JENIS = ['O2SN', 'POPDA', 'Pekan Seni', 'Lainnya'];
  const TINGKAT = ['Gugus', 'Kecamatan', 'Kota', 'Provinsi', 'Nasional'];
  const WARNA_JENIS = { O2SN: 'b-navy', POPDA: 'b-teal', 'Pekan Seni': 'b-amber' };
  const badgePeringkat = (p) => { const k = PERINGKAT[p] || {}; return `<span class="badge ${k.cls || 'b-slate'}"><i class="bi ${k.icon || 'bi-award'}"></i>${esc(k.label || p)}</span>`; };
  const selisihHari = (t) => Math.round((new Date(t + 'T00:00:00') - new Date(hariIni() + 'T00:00:00')) / 864e5);

  // Status efektif lomba dari tanggal (status "selesai" manual tetap dihormati)
  function statusLomba(l) {
    const t = hariIni(), akhir = l.tanggal_selesai || l.tanggal;
    if (l.status === 'selesai' || (akhir && akhir < t)) return 'selesai';
    if (l.tanggal && l.tanggal <= t) return 'berlangsung';
    if (!l.batas_daftar || l.batas_daftar >= t) return 'dibuka';
    return 'ditutup';
  }
  const ST_LOMBA = { dibuka: ['b-teal', 'Pendaftaran Dibuka', true], ditutup: ['b-amber', 'Pendaftaran Ditutup'], berlangsung: ['b-navy', 'Berlangsung', true], selesai: ['b-slate', 'Selesai'] };
  const badgeLomba = (s) => `<span class="badge ${ST_LOMBA[s][0]}">${ST_LOMBA[s][2] ? '<span class="dot pulse"></span>' : ''}${ST_LOMBA[s][1]}</span>`;
  const rentang = (a, b) => !a ? 'Jadwal menyusul' : !b || a === b ? fmt.tgl(a) : `${fmt.tglPendek(a)} – ${fmt.tglPendek(b)}`;

  // Kolom unggah sertifikat/gambar sederhana
  function kolomBerkas(id, label, bantu, accept = 'image/jpeg,image/png,application/pdf') {
    return `<div class="field"><span class="label">${label}</span><label class="dropzone" for="${id}"><span class="preview" id="${id}P"><i class="bi bi-cloud-arrow-up"></i></span>
      <span id="${id}N"><b>Pilih berkas</b><br><span class="help">${bantu}</span></span></label><input type="file" id="${id}" class="sr-only" accept="${accept}"></div>`;
  }
  function ikatBerkas(m, id, set, opsi) {
    const inp = $('#' + id, m);
    inp.onchange = async () => {
      try {
        const b = await UI.siapkanBerkas(inp.files[0], opsi);
        set(b);
        $('#' + id + 'P', m).innerHTML = b.mime.startsWith('image/') ? `<img src="${b.dataUrl}" alt="">` : '<i class="bi bi-filetype-pdf" style="color:var(--danger)"></i>';
        $('#' + id + 'N', m).innerHTML = `<b>${esc(b.nama)}</b><br><span class="help">Siap diunggah</span>`;
      } catch (e) { set(null); toast(e.message, 'error'); }
    };
  }
  const unggah = async (kategori, b) => (await Data.upload(kategori, { base64: b.base64, mime: b.mime, nama: b.nama, dataUrl: b.dataUrl })).url;

  // ==================================================================
  // JADWAL LOMBA
  // ==================================================================
  async function halLomba() {
    const el = await shell('lomba', 'Jadwal Lomba', 'Seleksi & kejuaraan siswa');
    const kelola = adalah('sekretaris');
    const bisaDaftar = !!Auth.profil.anggota_id && !kelola;
    const f = { tab: 'aktif', cari: '', jenis: '' };
    el.innerHTML = `<div class="page-head"><div><h1>Jadwal Lomba & Seleksi</h1><p>${kelola ? 'Kelola jadwal O2SN, POPDA, dan Pekan Seni. Pendaftaran siswa oleh guru disetujui melalui menu Persetujuan.' : 'Daftarkan siswa binaan Anda selama pendaftaran masih dibuka.'}</p></div>
        ${kelola ? '<div class="acts"><button class="btn btn-primary" id="lBaru"><i class="bi bi-plus-lg"></i> Tambah Lomba</button></div>' : ''}</div>
      <div class="chip-tabs" id="lTabs" role="tablist"></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="lCari" placeholder="Cari nama lomba, cabang, lokasi…" aria-label="Cari lomba"></div>
        <select class="select" id="lJenis" aria-label="Jenis lomba"><option value="">Semua jenis</option>${JENIS.map((j) => `<option>${j}</option>`).join('')}</select></div></div>
      <div class="grid-3" id="lList">${skeletonCards(3, 160)}</div>`;
    let data = [];
    const muat = async () => { try { data = await Data.lombaDaftar(); data.forEach((l) => { l._st = statusLomba(l); l._n = ((l.lomba_peserta || [])[0] || {}).count || 0; }); render(); } catch (e) { gagal($('#lList'), e); } };
    function render() {
      const grup = { aktif: (l) => l._st !== 'selesai', dibuka: (l) => l._st === 'dibuka', selesai: (l) => l._st === 'selesai', semua: () => true };
      $('#lTabs').innerHTML = [['aktif', 'Akan Datang & Berjalan'], ['dibuka', 'Pendaftaran Dibuka'], ['selesai', 'Selesai'], ['semua', 'Semua']].map(([k, l]) =>
        `<button role="tab" aria-selected="${f.tab === k}" class="${f.tab === k ? 'active' : ''}" data-t="${k}">${l} <span class="n">${data.filter(grup[k]).length}</span></button>`).join('');
      $$('#lTabs [data-t]').forEach((b) => b.onclick = () => { f.tab = b.dataset.t; render(); });
      const q = f.cari.toLowerCase();
      const rows = data.filter(grup[f.tab]).filter((l) => (!f.jenis || l.jenis === f.jenis) && (!q || [l.nama, l.cabang, l.lokasi, l.kode].join(' ').toLowerCase().includes(q)))
        .sort((a, b) => f.tab === 'selesai' || f.tab === 'semua' ? String(b.tanggal).localeCompare(String(a.tanggal)) : String(a.tanggal).localeCompare(String(b.tanggal)));
      $('#lList').innerHTML = rows.length ? rows.map((l) => {
        const sisa = l.batas_daftar ? selisihHari(l.batas_daftar) : null;
        return `<article class="card card-hover lomba-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge ${WARNA_JENIS[l.jenis] || 'b-slate'}">${esc(l.jenis)} · ${esc(l.tingkat || '-')}</span>${badgeLomba(l._st)}</div>
          <div class="body-sm muted tabnum" style="margin-top:12px">${esc(l.kode || '')}</div><h3 style="font-size:18px;font-weight:700;margin:2px 0 10px">${esc(l.nama)}</h3>
          <div class="meta" style="flex-direction:column;align-items:flex-start;gap:6px"><span><i class="bi bi-flag"></i>${esc(l.cabang || 'Cabang menyusul')}</span><span><i class="bi bi-calendar-event"></i>${rentang(l.tanggal, l.tanggal_selesai)}</span>
            <span><i class="bi bi-geo-alt"></i>${esc(l.lokasi || '-')}</span><span><i class="bi bi-people"></i>${l._n} peserta${adalah(...PENGURUS) ? '' : ' binaan Anda'}</span></div>
          ${l._st === 'dibuka' && l.batas_daftar ? `<div class="deadline ${sisa <= 3 ? 'urgent' : ''}"><i class="bi bi-hourglass-split"></i> Batas daftar <b>${fmt.tglPendek(l.batas_daftar)}</b> · ${sisa === 0 ? 'hari ini' : sisa + ' hari lagi'}</div>` : ''}
          <div class="lomba-acts">${bisaDaftar && l._st === 'dibuka' ? `<button class="btn btn-primary btn-sm" data-daftar="${esc(l.id)}"><i class="bi bi-person-plus"></i> Daftarkan Siswa</button>` : ''}
            <a class="btn btn-outline btn-sm" href="#/app/peserta?lomba=${esc(l.id)}"><i class="bi bi-list-ul"></i> Peserta</a>
            ${kelola ? `<span style="flex:1"></span><button class="btn btn-ghost btn-icon" data-ubah="${esc(l.id)}" aria-label="Ubah ${esc(l.nama)}"><i class="bi bi-pencil-square"></i></button>
              <button class="btn btn-ghost btn-icon" data-hapus="${esc(l.id)}" aria-label="Hapus ${esc(l.nama)}"><i class="bi bi-trash3"></i></button>` : ''}</div></article>`; }).join('')
        : `<div class="card" style="grid-column:1/-1">${emptyState('Tidak ada lomba', kelola ? 'Tambahkan jadwal lomba atau seleksi.' : 'Belum ada lomba pada kategori ini.', 'bi-flag')}</div>`;
      const cari = (id) => data.find((l) => l.id === id);
      $$('[data-daftar]').forEach((b) => b.onclick = () => formDaftar(cari(b.dataset.daftar)));
      $$('[data-ubah]').forEach((b) => b.onclick = () => form(cari(b.dataset.ubah)));
      $$('[data-hapus]').forEach((b) => b.onclick = async () => {
        const l = cari(b.dataset.hapus);
        const k = await konfirmasi({ judul: 'Hapus lomba?', bahaya: true, ok: 'Hapus', pesan: `Lomba <b>${esc(l.nama)}</b> beserta <b>${l._n} peserta</b> dan prestasinya akan dihapus permanen. Untuk lomba yang sudah lewat, cukup ubah status menjadi <b>Selesai</b>.` });
        if (!k.ok) return;
        try { await Data.hapusLomba(l.id); toast('Lomba dihapus.', 'success'); muat(); } catch (e) { toast(e.message, 'error'); }
      });
    }
    $('#lCari').oninput = debounce((e) => { f.cari = e.target.value; render(); }, 200);
    $('#lJenis').onchange = (e) => { f.jenis = e.target.value; render(); };
    if (kelola) $('#lBaru').onclick = () => form(null);
    muat();

    function form(l) {
      modal({
        judul: l ? 'Ubah Lomba' : 'Tambah Lomba', wide: true,
        isi: `<form id="fL" novalidate><div class="field"><label for="m1">Nama Lomba <span class="req">*</span></label><input class="input" id="m1" name="nama" value="${esc(l ? l.nama : '')}" placeholder="Contoh: O2SN Tingkat Kecamatan Tegal Timur"><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="m2">Jenis</label><select class="select" id="m2" name="jenis">${JENIS.map((j) => `<option ${l && l.jenis === j ? 'selected' : ''}>${j}</option>`).join('')}</select></div>
            <div class="field"><label for="m3">Tingkat</label><select class="select" id="m3" name="tingkat">${TINGKAT.map((j) => `<option ${(l ? l.tingkat : 'Kecamatan') === j ? 'selected' : ''}>${j}</option>`).join('')}</select></div></div>
          <div class="field"><label for="m4">Cabang / Nomor Lomba</label><input class="input" id="m4" name="cabang" value="${esc(l ? l.cabang || '' : '')}" placeholder="Pisahkan dengan koma: Atletik, Renang, Pencak Silat"></div>
          <div class="grid-3"><div class="field"><label for="m5">Tanggal Mulai</label><input class="input" id="m5" name="tanggal" type="date" value="${esc(l ? l.tanggal || '' : '')}"></div>
            <div class="field"><label for="m6">Tanggal Selesai</label><input class="input" id="m6" name="tanggal_selesai" type="date" value="${esc(l ? l.tanggal_selesai || '' : '')}"><div class="err"></div></div>
            <div class="field"><label for="m7">Batas Pendaftaran</label><input class="input" id="m7" name="batas_daftar" type="date" value="${esc(l ? l.batas_daftar || '' : '')}"><div class="err"></div></div></div>
          <div class="grid-2"><div class="field"><label for="m8">Lokasi</label><input class="input" id="m8" name="lokasi" value="${esc(l ? l.lokasi || '' : '')}"></div>
            <div class="field"><label for="m9">Status</label><select class="select" id="m9" name="status"><option value="pendaftaran_dibuka">Otomatis dari tanggal</option><option value="selesai" ${l && l.status === 'selesai' ? 'selected' : ''}>Selesai (tutup manual)</option></select></div></div>
          <div class="field"><label for="m10">Keterangan / Juknis Singkat</label><textarea class="textarea" id="m10" name="deskripsi" style="min-height:90px">${esc(l ? l.deskripsi || '' : '')}</textarea></div></form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fLs"><i class="bi bi-save"></i> Simpan</button>',
        onOpen: (m, close) => {
          $('#fLs', m).onclick = async () => {
            const fm = $('#fL', m);
            const ok = validasi(fm, { nama: (v) => v.length < 3 ? 'Isi nama lomba.' : '',
              tanggal_selesai: (v) => v && fm.tanggal.value && v < fm.tanggal.value ? 'Tidak boleh sebelum tanggal mulai.' : '',
              batas_daftar: (v) => v && fm.tanggal.value && v > fm.tanggal.value ? 'Batas daftar harus sebelum tanggal lomba.' : '' });
            if (!ok) return;
            try {
              await Data.simpanLomba({ id: l && l.id, nama: fm.nama.value.trim(), jenis: fm.jenis.value, tingkat: fm.tingkat.value, cabang: fm.cabang.value.trim(), tanggal: fm.tanggal.value,
                tanggal_selesai: fm.tanggal_selesai.value, batas_daftar: fm.batas_daftar.value, lokasi: fm.lokasi.value.trim(), status: fm.status.value, deskripsi: fm.deskripsi.value.trim() });
              close(); toast(l ? 'Lomba diperbarui.' : 'Lomba ditambahkan.', 'success'); muat();
            } catch (e) { toast(e.message, 'error'); }
          };
        }
      });
    }
  }

  // Modal guru mendaftarkan beberapa siswa sekaligus
  function formDaftar(l, selesai) {
    const cabang = String(l.cabang || '').split(',').map((x) => x.trim()).filter(Boolean);
    const baris = (i) => `<div class="siswa-row" data-row="${i}"><span class="no">${i + 1}</span>
      <input class="input" data-k="nama_siswa" placeholder="Nama lengkap siswa" aria-label="Nama siswa ${i + 1}">
      <select class="select" data-k="kelas" aria-label="Kelas siswa ${i + 1}"><option value="">Kelas</option>${[1, 2, 3, 4, 5, 6].map((k) => `<option>${k}</option>`).join('')}</select>
      <input class="input" data-k="cabang" list="dlCab" placeholder="Cabang / nomor" aria-label="Cabang siswa ${i + 1}" value="${esc(cabang.length === 1 ? cabang[0] : '')}">
      <button type="button" class="btn btn-ghost btn-icon" data-del aria-label="Hapus baris"><i class="bi bi-x-lg"></i></button></div>`;
    modal({
      judul: 'Daftarkan Siswa', wide: true,
      isi: `<div class="alert info" style="margin-bottom:16px"><i class="bi bi-flag"></i><div><b>${esc(l.nama)}</b><br>${rentang(l.tanggal, l.tanggal_selesai)} · ${esc(l.lokasi || '')}${l.batas_daftar ? ` · batas daftar ${fmt.tglPendek(l.batas_daftar)}` : ''}</div></div>
        <p class="body-sm muted" style="margin-bottom:10px">Sekolah otomatis mengikuti sekolah Anda (<b>${esc((Auth.profil.anggota || {}).sekolah || '-')}</b>). Pendaftaran diverifikasi Sekretaris/Ketua.</p>
        <datalist id="dlCab">${cabang.map((c) => `<option>${esc(c)}</option>`).join('')}</datalist>
        <div id="sRows">${baris(0)}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="sTambah" style="margin-top:8px"><i class="bi bi-plus-lg"></i> Tambah siswa</button>`,
      foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="sGo"><i class="bi bi-send"></i> Kirim Pendaftaran</button>',
      onOpen: (m, close) => {
        let n = 1;
        const ikat = () => $$('[data-del]', m).forEach((b) => b.onclick = () => { if ($$('.siswa-row', m).length > 1) b.closest('.siswa-row').remove(); $$('.siswa-row .no', m).forEach((x, i) => { x.textContent = i + 1; }); });
        ikat();
        $('#sTambah', m).onclick = () => { if ($$('.siswa-row', m).length >= 30) return toast('Maksimal 30 siswa per pengajuan.', 'warning'); $('#sRows', m).insertAdjacentHTML('beforeend', baris(n++)); $$('.siswa-row .no', m).forEach((x, i) => { x.textContent = i + 1; }); ikat(); $$('.siswa-row', m).pop().querySelector('input').focus(); };
        $('#sGo', m).onclick = async () => {
          const siswa = $$('.siswa-row', m).map((r) => Object.fromEntries($$('[data-k]', r).map((x) => [x.dataset.k, x.value.trim()]))).filter((s) => s.nama_siswa || s.kelas);
          $$('.siswa-row', m).forEach((r) => r.classList.toggle('invalid', (r.querySelector('[data-k=nama_siswa]').value.trim().length < 3) && !!(r.querySelector('[data-k=kelas]').value || r.querySelector('[data-k=nama_siswa]').value)));
          if (!siswa.length) return toast('Isi minimal satu nama siswa.', 'warning');
          if (siswa.some((s) => s.nama_siswa.length < 3)) return toast('Nama siswa minimal 3 huruf.', 'warning');
          const btn = $('#sGo', m); btn.disabled = true;
          try { const r = await Data.daftarkanPeserta(l.id, siswa); close(); toast(`${r.jumlah} siswa didaftarkan (${r.kode || ''}). Menunggu verifikasi.`, 'success'); muatBadge(); selesai && selesai(); }
          catch (e) { toast(e.message, 'error'); btn.disabled = false; }
        };
      }
    });
  }

  // ==================================================================
  // PESERTA LOMBA
  // ==================================================================
  async function halPeserta(q) {
    const pengurus = adalah(...PENGURUS);
    const kelola = adalah('sekretaris');
    const el = await shell('peserta', 'Peserta Lomba', pengurus ? 'Kontingen sekolah binaan' : 'Siswa binaan saya');
    const st = { cari: '', lomba: (q && q.lomba) || '', status: '', halaman: 1, per: 15, urut: null, naik: true };
    el.innerHTML = `<div class="page-head"><div><h1>${pengurus ? 'Peserta Lomba' : 'Siswa Binaan Saya'}</h1><p>${kelola ? 'Tambah peserta langsung, catat hasil lomba, dan pantau pendaftaran dari guru.' : pengurus ? 'Daftar kontingen seluruh sekolah binaan.' : 'Siswa yang Anda daftarkan. Setelah lomba, ajukan prestasi beserta sertifikatnya.'}</p></div>
        <div class="acts"><button class="btn btn-outline" id="pXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button><button class="btn btn-outline" id="pPdf"><i class="bi bi-printer"></i> PDF</button>
          ${kelola ? '<button class="btn btn-primary" id="pBaru"><i class="bi bi-plus-lg"></i> Tambah Peserta</button>' : ''}</div></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="pCari" placeholder="Cari siswa, sekolah, cabang…" aria-label="Cari peserta"></div>
        <select class="select" id="pLomba" aria-label="Lomba"><option value="">Semua lomba</option></select>
        <select class="select" id="pSt" aria-label="Status"><option value="">Semua status</option><option value="menunggu">Menunggu</option><option value="disetujui">Disetujui</option><option value="ditolak">Ditolak</option></select></div></div>
      <div id="pTabel"></div>`;
    let data = null, lomba = [];
    const hasil = (p) => (p.prestasi || []).find((x) => x.status !== 'ditolak');
    const t = UI.tabel({ el: $('#pTabel'), state: st,
      kosong: { judul: 'Belum ada peserta', pesan: pengurus ? 'Peserta muncul setelah guru mendaftarkan siswa atau Sekretaris menambahkannya.' : 'Daftarkan siswa dari menu Jadwal Lomba saat pendaftaran dibuka.', ikon: 'bi-person-badge' },
      kolom: [
        { key: 'nama_siswa', label: 'Siswa', sort: true, render: (p) => `<b>${esc(p.nama_siswa)}</b><div class="body-sm muted">Kelas ${esc(p.kelas || '-')} · ${esc(p.sekolah)}</div>` },
        { key: 'lomba', label: 'Lomba & Cabang', render: (p) => `${esc(p.lomba ? p.lomba.nama : '-')}<div class="body-sm muted">${esc(p.cabang || '')}${p.lomba && p.lomba.tanggal ? ' · ' + fmt.tglPendek(p.lomba.tanggal) : ''}</div>` },
        { key: 'guru', label: 'Guru Pendamping', render: (p) => esc(p.anggota ? p.anggota.nama : '—') },
        { key: 'status', label: 'Status', render: (p) => UI.badgeStatus(p.status) },
        { key: 'hasil', label: 'Hasil', render: (p) => { const h = hasil(p); return h ? badgePeringkat(h.peringkat) + (h.status === 'menunggu' ? '<div class="body-sm" style="color:var(--b-amber-tx)">diverifikasi</div>' : '') : '<span class="muted">—</span>'; } }],
      aksi: (p) => {
        const h = hasil(p); let s = '';
        if (kelola && p.status === 'disetujui') s += `<button class="btn btn-sm btn-teal-solid" data-hasil="${esc(p.id)}"><i class="bi bi-trophy"></i> ${h ? 'Ubah Hasil' : 'Catat Hasil'}</button>`;
        if (!kelola && p.guru_pendamping_id === Auth.profil.anggota_id && p.status !== 'ditolak' && !h) s += `<button class="btn btn-sm btn-outline" data-aju="${esc(p.id)}"><i class="bi bi-award"></i> Ajukan Prestasi</button>`;
        if (h && h.sertifikat_url) s += `<button class="btn btn-ghost btn-icon" data-sert="${esc(p.id)}" aria-label="Lihat sertifikat"><i class="bi bi-file-earmark-richtext"></i></button>`;
        if (kelola) s += `<button class="btn btn-ghost btn-icon" data-ubah="${esc(p.id)}" aria-label="Ubah"><i class="bi bi-pencil-square"></i></button>`;
        if (kelola || (p.guru_pendamping_id === Auth.profil.anggota_id && p.status === 'menunggu')) s += `<button class="btn btn-ghost btn-icon" data-hapus="${esc(p.id)}" aria-label="${kelola ? 'Hapus' : 'Batalkan pendaftaran'}"><i class="bi bi-trash3"></i></button>`;
        return s || '<span class="muted body-sm">—</span>';
      },
      muat: async (s) => {
        if (!data) {
          [data, lomba] = await Promise.all([Data.pesertaDaftar(), Data.lombaDaftar()]);
          const sel = $('#pLomba');
          sel.innerHTML = '<option value="">Semua lomba</option>' + lomba.map((l) => `<option value="${esc(l.id)}" ${st.lomba === l.id ? 'selected' : ''}>${esc(l.nama)} (${l.tanggal ? new Date(l.tanggal).getFullYear() : '-'})</option>`).join('');
        }
        return UI.saringLokal(data, s, { cari: ['nama_siswa', 'sekolah', 'cabang', 'kelas'], filter: { lomba: (x, v) => x.lomba_id === v, status: (x, v) => x.status === v } });
      },
      onRender: (rows) => {
        const cari = (id) => data.find((p) => p.id === id);
        $$('[data-hasil]').forEach((b) => b.onclick = () => formHasil(cari(b.dataset.hasil), segar));
        $$('[data-aju]').forEach((b) => b.onclick = () => formAjukanPrestasi({ peserta: cari(b.dataset.aju), selesai: segar }));
        $$('[data-sert]').forEach((b) => b.onclick = () => { const p = cari(b.dataset.sert); UI.lihatBerkas(hasil(p).sertifikat_url, 'sertifikat-' + p.nama_siswa); });
        $$('[data-ubah]').forEach((b) => b.onclick = () => formPeserta(cari(b.dataset.ubah)));
        $$('[data-hapus]').forEach((b) => b.onclick = async () => {
          const p = cari(b.dataset.hapus);
          const k = await konfirmasi({ judul: kelola ? 'Hapus peserta?' : 'Batalkan pendaftaran?', bahaya: true, ok: kelola ? 'Hapus' : 'Batalkan', pesan: `<b>${esc(p.nama_siswa)}</b> akan dihapus dari ${esc(p.lomba ? p.lomba.nama : 'lomba')}${hasil(p) ? ' beserta data prestasinya' : ''}.` });
          if (!k.ok) return;
          try { await Data.hapusPeserta(p.id); toast('Peserta dihapus.', 'success'); segar(); } catch (e) { toast(e.message, 'error'); }
        });
      } });
    const segar = () => { data = null; t.muat(); };
    $('#pCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
    $('#pLomba').onchange = (e) => { st.lomba = e.target.value; t.muat(true); };
    $('#pSt').onchange = (e) => { st.status = e.target.value; t.muat(true); };
    const kolEk = [{ label: 'Nama Siswa', key: 'nama_siswa' }, { label: 'Kelas', key: 'kelas' }, { label: 'Sekolah', key: 'sekolah' }, { label: 'Lomba', val: (p) => p.lomba ? p.lomba.nama : '' },
      { label: 'Cabang', key: 'cabang' }, { label: 'Guru Pendamping', val: (p) => p.anggota ? p.anggota.nama : '' }, { label: 'Status', key: 'status' }, { label: 'Hasil', val: (p) => { const h = hasil(p); return h ? (PERINGKAT[h.peringkat] || {}).label : ''; } }];
    const semua = () => UI.saringLokal(data || [], Object.assign({}, st, { halaman: 1, per: 1e9 }), { cari: ['nama_siswa', 'sekolah', 'cabang', 'kelas'], filter: { lomba: (x, v) => x.lomba_id === v, status: (x, v) => x.status === v } }).semua;
    $('#pXls').onclick = () => UI.eksporCSV('peserta_lomba', kolEk, semua());
    $('#pPdf').onclick = async () => { const l = lomba.find((x) => x.id === st.lomba);
      UI.cetak({ judul: 'Daftar Peserta Lomba', sub: l ? `${l.nama} · ${rentang(l.tanggal, l.tanggal_selesai)}` : 'Semua lomba', kolom: kolEk, rows: semua(), ttd: await UI.penandatangan(['ketua', 'sekretaris']) }); };
    if (kelola) $('#pBaru').onclick = () => formPeserta(null);

    async function formPeserta(p) {
      const guru = await Data.anggotaPilihan().catch(() => []);
      modal({
        judul: p ? 'Ubah Peserta' : 'Tambah Peserta', wide: true,
        isi: `<form id="fP" novalidate><div class="field"><label for="p1">Lomba <span class="req">*</span></label><select class="select" id="p1" name="lomba_id"><option value="">— Pilih lomba —</option>${lomba.map((l) => `<option value="${esc(l.id)}" ${(p ? p.lomba_id : st.lomba) === l.id ? 'selected' : ''}>${esc(l.nama)} (${l.tanggal ? fmt.tglPendek(l.tanggal) : '-'})</option>`).join('')}</select><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="p2">Nama Siswa <span class="req">*</span></label><input class="input" id="p2" name="nama_siswa" value="${esc(p ? p.nama_siswa : '')}"><div class="err"></div></div>
            <div class="field"><label for="p3">Kelas</label><select class="select" id="p3" name="kelas"><option value="">-</option>${['1', '2', '3', '4', '5', '6', '5–6'].map((k) => `<option ${p && p.kelas === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
            <div class="field"><label for="p4">Sekolah <span class="req">*</span></label>${UI.kolomSekolah({ id: 'p4', nilai: p ? p.sekolah : '' })}<div class="err"></div></div>
            <div class="field"><label for="p5">Cabang / Nomor</label><input class="input" id="p5" name="cabang" value="${esc(p ? p.cabang || '' : '')}"></div></div>
          <div class="field"><label for="p6">Guru Pendamping</label><select class="select" id="p6" name="guru_pendamping_id"><option value="">—</option>${guru.map((g) => `<option value="${esc(g.id)}" ${p && p.guru_pendamping_id === g.id ? 'selected' : ''}>${esc(g.nama)} — ${esc(g.sekolah || '')}</option>`).join('')}</select>
            <span class="help">Guru pendamping dapat mengajukan prestasi siswa ini dari akunnya.</span></div></form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fPs"><i class="bi bi-save"></i> Simpan</button>',
        onOpen: (m, close) => {
          const fm = $('#fP', m);
          UI.pasangSaranSekolah(fm.sekolah, guru.map((g) => g.sekolah));
          fm.guru_pendamping_id.onchange = () => { const g = guru.find((x) => x.id === fm.guru_pendamping_id.value); if (g && !fm.sekolah.value) fm.sekolah.value = g.sekolah; };
          $('#fPs', m).onclick = async () => {
            if (!validasi(fm, { lomba_id: (v) => !v ? 'Pilih lomba.' : '', nama_siswa: (v) => v.length < 3 ? 'Isi nama siswa.' : '', sekolah: (v) => UI.cekSekolah(v) })) return;
            try {
              await Data.simpanPeserta({ id: p && p.id, lomba_id: fm.lomba_id.value, nama_siswa: fm.nama_siswa.value.trim(), kelas: fm.kelas.value, sekolah: UI.rapikanSekolah(fm.sekolah.value), cabang: fm.cabang.value.trim(), guru_pendamping_id: fm.guru_pendamping_id.value });
              close(); toast('Peserta disimpan.', 'success'); segar();
            } catch (e) { toast(e.message, 'error'); }
          };
        }
      });
    }
  }

  // Sekretaris mencatat hasil lomba (langsung sah)
  function formHasil(p, selesai) {
    const ada = (p.prestasi || []).find((x) => x.status !== 'ditolak');
    let berkas = null;
    modal({
      judul: 'Catat Hasil Lomba',
      isi: `<p><b>${esc(p.nama_siswa)}</b> · ${esc(p.sekolah)}</p><p class="body-sm muted" style="margin-bottom:16px">${esc(p.lomba ? p.lomba.nama : '')} — ${esc(p.cabang || '')}</p>
        <div class="field"><span class="label">Peringkat <span class="req">*</span></span><div class="peringkat-pilih">${Object.entries(PERINGKAT).map(([k, v]) => `<label><input type="radio" name="pk" value="${k}" ${ada && ada.peringkat === k ? 'checked' : ''}><span class="${v.cls}"><i class="bi ${v.icon}"></i> ${v.label}</span></label>`).join('')}</div><div class="err">Pilih peringkat.</div></div>
        ${kolomBerkas('hF', 'Sertifikat / piagam (opsional)', 'JPG/PNG/PDF · maks 5 MB')}
        <p class="help">Hasil yang dicatat Sekretaris langsung sah dan tampil di Hall of Fame website.</p>`,
      foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="hGo"><i class="bi bi-trophy"></i> Simpan Hasil</button>',
      onOpen: (m, close) => {
        ikatBerkas(m, 'hF', (b) => { berkas = b; });
        $('#hGo', m).onclick = async () => {
          const pk = $('[name=pk]:checked', m);
          if (!pk) { $('.peringkat-pilih', m).closest('.field').classList.add('invalid'); return; }
          const btn = $('#hGo', m); btn.disabled = true;
          try { const url = berkas ? await unggah('sertifikat', berkas) : null; await Data.catatHasil(p.id, pk.value, url); close(); toast(`Hasil ${p.nama_siswa}: ${PERINGKAT[pk.value].label}.`, 'success'); selesai && selesai(); }
          catch (e) { toast(e.message, 'error'); btn.disabled = false; }
        };
      }
    });
  }

  // Anggota mengajukan prestasi: dari peserta binaan, atau siswa lain di lomba yang tercatat
  async function formAjukanPrestasi({ peserta = null, selesai } = {}) {
    let binaan = [], lomba = [];
    if (!peserta) [binaan, lomba] = await Promise.all([Data.pesertaDaftar().then((r) => r.filter((p) => p.guru_pendamping_id === Auth.profil.anggota_id && p.status !== 'ditolak' && !(p.prestasi || []).some((x) => x.status !== 'ditolak'))).catch(() => []), Data.lombaDaftar().catch(() => [])]);
    let berkas = null;
    modal({
      judul: 'Ajukan Prestasi Siswa', wide: true,
      isi: `<div class="alert info" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><div>Prestasi diverifikasi Sekretaris/Ketua. Setelah disetujui tampil di Hall of Fame website (nama siswa, sekolah, peringkat).</div></div>
        ${peserta ? `<div class="field"><span class="label">Siswa</span><div class="kv-box"><b>${esc(peserta.nama_siswa)}</b> · Kelas ${esc(peserta.kelas || '-')}<br><span class="body-sm muted">${esc(peserta.lomba ? peserta.lomba.nama : '')} — ${esc(peserta.cabang || '')}</span></div></div>`
          : `<div class="segmented" style="display:grid;grid-template-columns:1fr 1fr;margin-bottom:14px"><button type="button" class="active" data-mode="binaan">Siswa yang sudah didaftarkan</button><button type="button" data-mode="baru">Siswa lain</button></div>
          <div id="modeBinaan"><div class="field"><label for="a1">Pilih siswa <span class="req">*</span></label><select class="select" id="a1"><option value="">— Pilih —</option>${binaan.map((p) => `<option value="${esc(p.id)}">${esc(p.nama_siswa)} — ${esc(p.lomba ? p.lomba.nama : '')} (${esc(p.cabang || '')})</option>`).join('')}</select>
            ${binaan.length ? '' : '<span class="help">Belum ada siswa terdaftar yang bisa diajukan. Gunakan pilihan "Siswa lain".</span>'}<div class="err">Pilih siswa.</div></div></div>
          <div id="modeBaru" hidden><div class="field"><label for="a2">Lomba <span class="req">*</span></label><select class="select" id="a2"><option value="">— Pilih lomba —</option>${lomba.map((l) => `<option value="${esc(l.id)}">${esc(l.nama)} (${l.tanggal ? fmt.tglPendek(l.tanggal) : '-'})</option>`).join('')}</select><div class="err">Pilih lomba.</div>
              <span class="help">Lomba belum ada di daftar? Minta Sekretaris menambahkannya terlebih dahulu.</span></div>
            <div class="grid-3"><div class="field"><label for="a3">Nama Siswa <span class="req">*</span></label><input class="input" id="a3"><div class="err">Isi nama siswa.</div></div>
              <div class="field"><label for="a4">Kelas</label><select class="select" id="a4"><option value="">-</option>${[1, 2, 3, 4, 5, 6].map((k) => `<option>${k}</option>`).join('')}</select></div>
              <div class="field"><label for="a5">Cabang / Nomor</label><input class="input" id="a5"></div></div></div>`}
        <div class="field"><span class="label">Peringkat <span class="req">*</span></span><div class="peringkat-pilih">${Object.entries(PERINGKAT).map(([k, v]) => `<label><input type="radio" name="pk" value="${k}"><span class="${v.cls}"><i class="bi ${v.icon}"></i> ${v.label}</span></label>`).join('')}</div><div class="err">Pilih peringkat.</div></div>
        ${kolomBerkas('aF', 'Sertifikat / piagam <span class="req">*</span>', 'Foto atau PDF · maks 5 MB')}`,
      foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="aGo"><i class="bi bi-send"></i> Kirim Pengajuan</button>',
      onOpen: (m, close) => {
        let mode = 'binaan';
        $$('[data-mode]', m).forEach((b) => b.onclick = () => { mode = b.dataset.mode; $$('[data-mode]', m).forEach((x) => x.classList.toggle('active', x === b)); $('#modeBinaan', m).hidden = mode !== 'binaan'; $('#modeBaru', m).hidden = mode !== 'baru'; });
        ikatBerkas(m, 'aF', (b) => { berkas = b; });
        const salah = (sel, kondisi) => { const f = $(sel, m).closest('.field'); f.classList.toggle('invalid', kondisi); return kondisi; };
        $('#aGo', m).onclick = async () => {
          const d = { peringkat: ($('[name=pk]:checked', m) || {}).value };
          let err = false;
          if (peserta) d.peserta_id = peserta.id;
          else if (mode === 'binaan') { d.peserta_id = $('#a1', m).value; err = salah('#a1', !d.peserta_id) || err; }
          else { Object.assign(d, { lomba_id: $('#a2', m).value, nama_siswa: $('#a3', m).value.trim(), kelas: $('#a4', m).value, cabang: $('#a5', m).value.trim() }); err = salah('#a2', !d.lomba_id) || err; err = salah('#a3', d.nama_siswa.length < 3) || err; }
          if (!d.peringkat) { $('.peringkat-pilih', m).closest('.field').classList.add('invalid'); err = true; } else $('.peringkat-pilih', m).closest('.field').classList.remove('invalid');
          if (err) return;
          if (!berkas) return toast('Unggah sertifikat atau piagam sebagai bukti.', 'warning');
          const btn = $('#aGo', m); btn.disabled = true;
          try { d.sertifikat_url = await unggah('sertifikat', berkas); const r = await Data.ajukanPrestasi(d); close(); toast(`Prestasi diajukan (${r.kode || ''}). Menunggu verifikasi.`, 'success'); muatBadge(); selesai && selesai(); }
          catch (e) { toast(e.message, 'error'); btn.disabled = false; }
        };
      }
    });
  }

  // ==================================================================
  // PRESTASI
  // ==================================================================
  async function halPrestasi() {
    const pengurus = adalah(...PENGURUS);
    const kelola = adalah('sekretaris');
    const bisaAju = !!Auth.profil.anggota_id && !kelola;
    const el = await shell('prestasi', 'Prestasi', 'Hall of fame siswa binaan');
    const st = { cari: '', tahun: String(TH()), jenis: '', status: '', halaman: 1, per: 15, urut: null, naik: true };
    el.innerHTML = `<div class="page-head"><div><h1>Prestasi Siswa</h1><p>${kelola ? 'Hasil lomba yang sah tampil di Hall of Fame website. Atur tampil publik per prestasi.' : pengurus ? 'Rekap prestasi siswa binaan seluruh sekolah.' : 'Prestasi siswa binaan Anda. Ajukan prestasi baru beserta sertifikatnya.'}</p></div>
        <div class="acts"><button class="btn btn-outline" id="rXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button><button class="btn btn-outline" id="rPdf"><i class="bi bi-printer"></i> PDF</button>
          ${bisaAju ? '<button class="btn btn-primary" id="rAju"><i class="bi bi-award"></i> Ajukan Prestasi</button>' : ''}${kelola ? '<a class="btn btn-primary" href="#/app/peserta"><i class="bi bi-trophy"></i> Catat Hasil Lomba</a>' : ''}</div></div>
      <div class="medal-strip" id="rMedal"></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="rCari" placeholder="Cari siswa, sekolah, cabang…" aria-label="Cari prestasi"></div>
        <select class="select" id="rTh" aria-label="Tahun"><option value="">Semua tahun</option>${[TH(), TH() - 1, TH() - 2, TH() - 3].map((y) => `<option ${String(y) === st.tahun ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <select class="select" id="rJenis" aria-label="Jenis"><option value="">Semua jenis</option>${JENIS.map((j) => `<option>${j}</option>`).join('')}</select>
        <select class="select" id="rSt" aria-label="Status"><option value="">Semua status</option><option value="disetujui">Disetujui</option><option value="menunggu">Menunggu</option><option value="ditolak">Ditolak</option></select></div></div>
      <div id="rTabel"></div>`;
    let data = null;
    const tahunDari = (x) => { const l = (x.lomba_peserta || {}).lomba || {}; return String(l.tanggal || x.dibuat_pada || '').slice(0, 4); };
    const filter = { tahun: (x, v) => tahunDari(x) === v, jenis: (x, v) => (((x.lomba_peserta || {}).lomba || {}).jenis) === v, status: (x, v) => x.status === v };
    const cariF = (x) => { const p = x.lomba_peserta || {}; return [p.nama_siswa, p.sekolah, p.cabang, (p.lomba || {}).nama].join(' '); };
    const saring = (s) => { const r = data.map((x) => Object.assign(x, { _q: cariF(x) })); return UI.saringLokal(r, s, { cari: ['_q'], filter }); };
    function medali() {
      const rows = saring(Object.assign({}, st, { halaman: 1, per: 1e9 })).semua.filter((x) => x.status === 'disetujui');
      const n = (p) => rows.filter((x) => x.peringkat === p).length;
      $('#rMedal').innerHTML = [['juara_1', 'gold', 'bi-trophy-fill', 'Emas'], ['juara_2', 'silver', 'bi-award-fill', 'Perak'], ['juara_3', 'bronze', 'bi-award-fill', 'Perunggu']]
        .map(([p, c, ic, l]) => `<div class="medal-tile b-${c}"><i class="bi ${ic}"></i><b>${n(p)}</b><small>${l}</small></div>`).join('')
        + `<div class="medal-tile b-teal"><i class="bi bi-star-fill"></i><b>${n('harapan_1') + n('harapan_2') + n('harapan_3')}</b><small>Harapan</small></div>`;
    }
    const t = UI.tabel({ el: $('#rTabel'), state: st,
      kosong: { judul: 'Belum ada prestasi', pesan: bisaAju ? 'Ajukan prestasi siswa binaan Anda beserta sertifikatnya.' : 'Prestasi muncul setelah hasil lomba dicatat atau pengajuan disetujui.', ikon: 'bi-trophy' },
      kolom: [
        { key: 'peringkat', label: 'Peringkat', render: (x) => badgePeringkat(x.peringkat) },
        { key: 'siswa', label: 'Siswa', render: (x) => { const p = x.lomba_peserta || {}; return `<b>${esc(p.nama_siswa || '-')}</b><div class="body-sm muted">Kelas ${esc(p.kelas || '-')} · ${esc(p.sekolah || '')}</div>`; } },
        { key: 'lomba', label: 'Lomba', render: (x) => { const p = x.lomba_peserta || {}, l = p.lomba || {}; return `${esc(l.nama || '-')}<div class="body-sm muted">${esc(p.cabang || '')} · ${esc(l.jenis || '')} ${tahunDari(x)}</div>`; } },
        { key: 'guru', label: 'Guru', render: (x) => esc(((x.lomba_peserta || {}).anggota || {}).nama || '—') },
        { key: 'status', label: 'Status', render: (x) => UI.badgeStatus(x.status) },
        { key: 'publik', label: 'Website', render: (x) => kelola && x.status === 'disetujui'
          ? `<label class="switch" title="Tampil di website"><input type="checkbox" data-pub="${esc(x.id)}" ${x.tampil_publik ? 'checked' : ''} aria-label="Tampil di website"><span></span></label>`
          : x.status === 'disetujui' && x.tampil_publik ? '<span class="badge b-teal">Tampil</span>' : '<span class="muted">—</span>' }],
      aksi: (x) => `${x.sertifikat_url ? `<button class="btn btn-ghost btn-icon" data-sert="${esc(x.id)}" aria-label="Lihat sertifikat"><i class="bi bi-file-earmark-richtext"></i></button>` : ''}${kelola ? `<button class="btn btn-ghost btn-icon" data-hapus="${esc(x.id)}" aria-label="Hapus prestasi"><i class="bi bi-trash3"></i></button>` : ''}` || '<span class="muted">—</span>',
      muat: async (s) => { if (!data) data = await Data.prestasiDaftar(); medali(); return saring(s); },
      onRender: () => {
        const cari = (id) => data.find((x) => x.id === id);
        $$('[data-sert]').forEach((b) => b.onclick = () => { const x = cari(b.dataset.sert); UI.lihatBerkas(x.sertifikat_url, 'sertifikat'); });
        $$('[data-pub]').forEach((c) => c.onchange = async () => {
          const x = cari(c.dataset.pub); const v = c.checked; x.tampil_publik = v;
          try { await Data.setPrestasiPublik(x.id, v); toast(v ? 'Ditampilkan di website.' : 'Disembunyikan dari website.', 'success', 1800); } catch (e) { x.tampil_publik = !v; c.checked = !v; toast(e.message, 'error'); }
        });
        $$('[data-hapus]').forEach((b) => b.onclick = async () => {
          const x = cari(b.dataset.hapus);
          const k = await konfirmasi({ judul: 'Hapus prestasi?', bahaya: true, ok: 'Hapus', pesan: `Prestasi <b>${esc((x.lomba_peserta || {}).nama_siswa || '')}</b> (${(PERINGKAT[x.peringkat] || {}).label}) akan dihapus dari rekap dan website.` });
          if (!k.ok) return;
          try { await Data.hapusPrestasi(x.id); toast('Prestasi dihapus.', 'success'); data = null; t.muat(); } catch (e) { toast(e.message, 'error'); }
        });
      } });
    $('#rCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
    $('#rTh').onchange = (e) => { st.tahun = e.target.value; t.muat(true); };
    $('#rJenis').onchange = (e) => { st.jenis = e.target.value; t.muat(true); };
    $('#rSt').onchange = (e) => { st.status = e.target.value; t.muat(true); };
    if (bisaAju) $('#rAju').onclick = () => formAjukanPrestasi({ selesai: () => { data = null; t.muat(); } });
    const kolEk = [{ label: 'Peringkat', val: (x) => (PERINGKAT[x.peringkat] || {}).label }, { label: 'Nama Siswa', val: (x) => (x.lomba_peserta || {}).nama_siswa }, { label: 'Kelas', val: (x) => (x.lomba_peserta || {}).kelas },
      { label: 'Sekolah', val: (x) => (x.lomba_peserta || {}).sekolah }, { label: 'Lomba', val: (x) => ((x.lomba_peserta || {}).lomba || {}).nama }, { label: 'Cabang', val: (x) => (x.lomba_peserta || {}).cabang },
      { label: 'Tingkat', val: (x) => ((x.lomba_peserta || {}).lomba || {}).tingkat }, { label: 'Tahun', val: tahunDari }, { label: 'Guru', val: (x) => ((x.lomba_peserta || {}).anggota || {}).nama }, { label: 'Status', key: 'status' }];
    const semua = () => saring(Object.assign({}, st, { halaman: 1, per: 1e9 })).semua;
    $('#rXls').onclick = () => UI.eksporCSV('prestasi_siswa' + (st.tahun ? '_' + st.tahun : ''), kolEk, semua());
    $('#rPdf').onclick = async () => UI.cetak({ judul: 'Rekap Prestasi Siswa', sub: (st.tahun ? 'Tahun ' + st.tahun : 'Semua tahun') + (st.jenis ? ' · ' + st.jenis : ''), kolom: kolEk.slice(0, 9), rows: semua().filter((x) => x.status === 'disetujui'), ttd: await UI.penandatangan(['ketua', 'sekretaris']) });
  }

  // ==================================================================
  // BERITA
  // ==================================================================
  const KAT_BERITA = ['Kegiatan', 'Prestasi', 'Kurikulum', 'Organisasi', 'Pengumuman'];
  async function halBerita() {
    const el = await shell('berita', 'Berita', 'Kelola berita & pengumuman website');
    const kelola = adalah('wakil_ketua', 'sekretaris');
    const st = { cari: '', status: '', kategori: '', halaman: 1, per: 10, urut: null, naik: true };
    el.innerHTML = `<div class="page-head"><div><h1>Berita & Pengumuman</h1><p>Berita berstatus <b>Terbit</b> langsung tampil di website. Simpan sebagai draf untuk dilanjutkan nanti.</p></div>
        ${kelola ? '<div class="acts"><button class="btn btn-primary" id="bBaru"><i class="bi bi-pencil-square"></i> Tulis Berita</button></div>' : ''}</div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="bCari" placeholder="Cari judul berita…" aria-label="Cari berita"></div>
        <select class="select" id="bKat" aria-label="Kategori"><option value="">Semua kategori</option>${KAT_BERITA.map((k) => `<option>${k}</option>`).join('')}</select>
        <select class="select" id="bSt" aria-label="Status"><option value="">Semua status</option><option value="terbit">Terbit</option><option value="draf">Draf</option></select></div></div>
      <div id="bTabel"></div>`;
    let data = null;
    const t = UI.tabel({ el: $('#bTabel'), state: st,
      kosong: { judul: 'Belum ada berita', pesan: kelola ? 'Tulis berita pertama untuk website.' : 'Belum ada berita.', ikon: 'bi-newspaper' },
      kolom: [
        { key: 'judul', label: 'Berita', render: (b) => `<div style="display:flex;gap:12px;align-items:center"><div class="thumb">${b.gambar_url ? `<img src="${esc(b.gambar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i class="bi bi-image"></i>'}</div>
            <div style="min-width:0"><b>${esc(b.judul)}</b><div class="body-sm muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:420px">${esc(b.ringkasan || '')}</div></div></div>` },
        { key: 'kategori', label: 'Kategori', render: (b) => `<span class="badge b-navy">${esc(b.kategori || '-')}</span>` },
        { key: 'status', label: 'Status', render: (b) => UI.badgeStatus(b.status) },
        { key: 'tanggal_terbit', label: 'Tanggal', render: (b) => `<span style="white-space:nowrap">${b.tanggal_terbit ? fmt.tglPendek(b.tanggal_terbit) : '<span class="muted">belum terbit</span>'}</span>` }],
      aksi: (b) => `${b.status === 'terbit' ? `<a class="btn btn-ghost btn-icon" href="#/berita/${esc(b.slug || b.id)}" target="_blank" rel="noopener" aria-label="Lihat di website"><i class="bi bi-box-arrow-up-right"></i></a>` : ''}
        ${kelola ? `<button class="btn btn-ghost btn-icon" data-ubah="${esc(b.id)}" aria-label="Ubah"><i class="bi bi-pencil-square"></i></button><button class="btn btn-ghost btn-icon" data-hapus="${esc(b.id)}" aria-label="Hapus"><i class="bi bi-trash3"></i></button>` : ''}`,
      muat: async (s) => { if (!data) data = await Data.beritaDaftar(); return UI.saringLokal(data, s, { cari: ['judul', 'ringkasan'], filter: { status: (x, v) => x.status === v, kategori: (x, v) => x.kategori === v } }); },
      onRender: () => {
        const cari = (id) => data.find((b) => b.id === id);
        $$('[data-ubah]').forEach((b) => b.onclick = () => editor(cari(b.dataset.ubah)));
        $$('[data-hapus]').forEach((b) => b.onclick = async () => {
          const x = cari(b.dataset.hapus);
          const k = await konfirmasi({ judul: 'Hapus berita?', bahaya: true, ok: 'Hapus', pesan: `Berita <b>${esc(x.judul)}</b> akan dihapus${x.status === 'terbit' ? ' dan hilang dari website' : ''}.` });
          if (!k.ok) return;
          try { await Data.hapusBerita(x.id); toast('Berita dihapus.', 'success'); data = null; t.muat(); } catch (e) { toast(e.message, 'error'); }
        });
      } });
    $('#bCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
    $('#bKat').onchange = (e) => { st.kategori = e.target.value; t.muat(true); };
    $('#bSt').onchange = (e) => { st.status = e.target.value; t.muat(true); };
    if (kelola) $('#bBaru').onclick = () => editor(null);

    function editor(b) {
      let gambar = null, hapusGambar = false;
      modal({
        judul: b ? 'Ubah Berita' : 'Tulis Berita', wide: true,
        isi: `<form id="fB" novalidate><div class="field"><label for="w1">Judul <span class="req">*</span></label><input class="input" id="w1" name="judul" value="${esc(b ? b.judul : '')}" maxlength="150" style="font-size:18px;font-weight:700"><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="w2">Kategori</label><select class="select" id="w2" name="kategori">${KAT_BERITA.map((k) => `<option ${b && b.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
            <div class="field"><span class="label">Gambar Sampul</span><label class="dropzone" for="wF" style="min-height:0;padding:10px"><span class="preview" id="wFP">${b && b.gambar_url ? `<img src="${esc(b.gambar_url)}" alt="" referrerpolicy="no-referrer">` : '<i class="bi bi-image"></i>'}</span>
              <span id="wFN">${b && b.gambar_url ? '<b>Ganti gambar</b>' : '<b>Pilih foto</b>'}<br><span class="help">JPG/PNG, otomatis dikompres</span></span></label><input type="file" id="wF" class="sr-only" accept="image/jpeg,image/png">
              ${b && b.gambar_url ? '<button type="button" class="btn btn-ghost btn-sm" id="wHapusG" style="margin-top:4px"><i class="bi bi-x"></i> Hapus gambar</button>' : ''}</div></div>
          <div class="field"><label for="w3">Ringkasan <span class="req">*</span></label><textarea class="textarea" id="w3" name="ringkasan" maxlength="220" style="min-height:70px" placeholder="1–2 kalimat yang tampil di kartu berita">${esc(b ? b.ringkasan || '' : '')}</textarea><div class="help" id="w3n"></div><div class="err"></div></div>
          <div class="field"><label for="w4">Isi Berita <span class="req">*</span></label><textarea class="textarea" id="w4" name="isi" style="min-height:260px" placeholder="Tulis isi berita. Pisahkan paragraf dengan baris kosong.">${esc(b ? b.isi || '' : '')}</textarea><div class="err"></div></div></form>`,
        foot: `<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-outline" data-st="draf"><i class="bi bi-floppy"></i> Simpan Draf</button><button class="btn btn-primary" data-st="terbit"><i class="bi bi-send-check"></i> ${b && b.status === 'terbit' ? 'Simpan & Tetap Terbit' : 'Terbitkan'}</button>`,
        onOpen: (m, close) => {
          const fm = $('#fB', m);
          const hitung = () => { $('#w3n', m).textContent = `${fm.ringkasan.value.length}/220 karakter`; };
          fm.ringkasan.oninput = hitung; hitung();
          ikatBerkas(m, 'wF', (x) => { gambar = x; hapusGambar = false; }, { dokumen: false });
          if ($('#wHapusG', m)) $('#wHapusG', m).onclick = (e) => { hapusGambar = true; gambar = null; $('#wFP', m).innerHTML = '<i class="bi bi-image"></i>'; e.target.closest('button').remove(); };
          $$('[data-st]', m).forEach((btn) => btn.onclick = async () => {
            const terbit = btn.dataset.st === 'terbit';
            const ok = validasi(fm, { judul: (v) => v.length < 8 ? 'Judul minimal 8 karakter.' : '', ringkasan: (v) => terbit && v.length < 20 ? 'Ringkasan minimal 20 karakter untuk diterbitkan.' : '',
              isi: (v) => terbit && v.length < 50 ? 'Isi berita minimal 50 karakter untuk diterbitkan.' : '' });
            if (!ok) return;
            $$('[data-st]', m).forEach((x) => { x.disabled = true; });
            try {
              const gambar_url = gambar ? await unggah('dokumentasi', gambar) : hapusGambar ? null : (b ? b.gambar_url : null);
              await Data.simpanBerita({ id: b && b.id, judul: fm.judul.value.trim(), kategori: fm.kategori.value, ringkasan: fm.ringkasan.value.trim(), isi: fm.isi.value, gambar_url, status: btn.dataset.st });
              close(); toast(terbit ? 'Berita terbit di website.' : 'Draf disimpan.', 'success'); data = null; t.muat();
            } catch (e) { toast(e.message, 'error'); $$('[data-st]', m).forEach((x) => { x.disabled = false; }); }
          });
        }
      });
    }
  }

  // ==================================================================
  // DOKUMENTASI (album foto)
  // ==================================================================
  async function halDokumentasi(q) {
    if (q && q.id) return album(q.id);
    const el = await shell('dokumentasi', 'Dokumentasi', 'Album foto kegiatan');
    const kelola = adalah('wakil_ketua', 'sekretaris');
    el.innerHTML = `<div class="page-head"><div><h1>Dokumentasi Kegiatan</h1><p>Album foto tampil di halaman Dokumentasi website. Foto dikompres otomatis sebelum diunggah.</p></div>
        ${kelola ? '<div class="acts"><button class="btn btn-primary" id="dBaru"><i class="bi bi-plus-lg"></i> Album Baru</button></div>' : ''}</div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="dCari" placeholder="Cari album…" aria-label="Cari album"></div></div></div>
      <div class="grid-3" id="dList">${skeletonCards(3, 200)}</div>`;
    let data = [], cari = '';
    const render = () => {
      const rows = data.filter((a) => !cari || [a.judul, a.kategori, (a.kegiatan || {}).judul].join(' ').toLowerCase().includes(cari));
      $('#dList').innerHTML = rows.length ? rows.map((a) => { const n = ((a.dokumentasi_foto || [])[0] || {}).count || 0;
        return `<a class="card card-hover album-card" href="#/app/dokumentasi?id=${esc(a.id)}"><div class="cover">${a.sampul_url ? `<img src="${esc(a.sampul_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i class="bi bi-images"></i>'}<span class="count"><i class="bi bi-image"></i> ${n}</span></div>
          <div class="body"><span class="badge b-navy">${esc(a.kategori || 'Kegiatan')}</span><h3>${esc(a.judul)}</h3><div class="body-sm muted"><i class="bi bi-calendar3"></i> ${fmt.tgl(a.tanggal)}${a.kegiatan && a.kegiatan.judul ? ' · ' + esc(a.kegiatan.judul) : ''}</div></div></a>`; }).join('')
        : `<div class="card" style="grid-column:1/-1">${emptyState('Belum ada album', kelola ? 'Buat album lalu unggah foto kegiatan.' : 'Album dokumentasi akan tampil di sini.', 'bi-images')}</div>`;
    };
    const muat = async () => { try { data = await Data.albumDaftar(); render(); } catch (e) { gagal($('#dList'), e); } };
    $('#dCari').oninput = debounce((e) => { cari = e.target.value.toLowerCase(); render(); }, 200);
    if (kelola) $('#dBaru').onclick = () => formAlbum(null, (a) => Router.go('/app/dokumentasi?id=' + a.id));
    muat();
  }

  async function formAlbum(a, selesai) {
    const keg = await Data.kegiatanPilihan().catch(() => []);
    modal({
      judul: a ? 'Ubah Album' : 'Album Baru',
      isi: `<form id="fA" novalidate><div class="field"><label for="al1">Judul Album <span class="req">*</span></label><input class="input" id="al1" name="judul" value="${esc(a ? a.judul : '')}"><div class="err"></div></div>
        <div class="grid-2"><div class="field"><label for="al2">Tanggal</label><input class="input" id="al2" name="tanggal" type="date" value="${esc(a ? a.tanggal : hariIni())}"></div>
          <div class="field"><label for="al3">Kategori</label><select class="select" id="al3" name="kategori">${['Kegiatan', 'Workshop', 'Lomba', 'Koordinasi', 'Organisasi', 'Sosial'].map((k) => `<option ${a && a.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div></div>
        <div class="field"><label for="al4">Kegiatan Terkait</label><select class="select" id="al4" name="kegiatan_id"><option value="">— Tidak terkait —</option>${keg.map((k) => `<option value="${esc(k.id)}" ${a && a.kegiatan_id === k.id ? 'selected' : ''}>${esc(k.judul)} (${fmt.tglPendek(k.tanggal)})</option>`).join('')}</select></div></form>`,
      foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fAs"><i class="bi bi-save"></i> Simpan</button>',
      onOpen: (m, close) => {
        const fm = $('#fA', m);
        fm.kegiatan_id.onchange = () => { const k = keg.find((x) => x.id === fm.kegiatan_id.value); if (k) { if (!fm.judul.value.trim()) fm.judul.value = k.judul; fm.tanggal.value = k.tanggal; } };
        $('#fAs', m).onclick = async () => {
          if (!validasi(fm, { judul: (v) => v.length < 3 ? 'Isi judul album.' : '' })) return;
          try { const r = await Data.simpanAlbum({ id: a && a.id, judul: fm.judul.value.trim(), tanggal: fm.tanggal.value || hariIni(), kategori: fm.kategori.value, kegiatan_id: fm.kegiatan_id.value, sampul_url: a ? a.sampul_url : null });
            close(); toast(a ? 'Album diperbarui.' : 'Album dibuat. Silakan unggah foto.', 'success'); selesai && selesai(r || a); }
          catch (e) { toast(e.message, 'error'); }
        };
      }
    });
  }

  async function album(id) {
    const el = await shell('dokumentasi', 'Album Foto', 'Dokumentasi kegiatan');
    const kelola = adalah('wakil_ketua', 'sekretaris');
    el.innerHTML = '<div class="skel skel-block" style="height:360px"></div>';
    let a;
    try { a = await Data.albumDetail(id); } catch (e) { el.innerHTML = '<a href="#/app/dokumentasi" class="btn btn-ghost btn-sm"><i class="bi bi-arrow-left"></i> Semua album</a>'; gagal(el.appendChild(document.createElement('div')), e); return; }
    const render = () => {
      el.innerHTML = `<a href="#/app/dokumentasi" class="btn btn-ghost btn-sm" style="margin-bottom:12px"><i class="bi bi-arrow-left"></i> Semua album</a>
        <div class="page-head"><div><span class="badge b-navy">${esc(a.kategori || 'Kegiatan')}</span><h1 style="margin-top:8px">${esc(a.judul)}</h1><p>${fmt.tgl(a.tanggal)}${a.kegiatan && a.kegiatan.judul ? ' · ' + esc(a.kegiatan.judul) : ''} · ${a.foto.length} foto</p></div>
          <div class="acts"><a class="btn btn-outline" href="#/dokumentasi/${esc(a.id)}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> Lihat di website</a>
            ${kelola ? '<button class="btn btn-ghost btn-icon" id="aUbah" aria-label="Ubah album"><i class="bi bi-pencil-square"></i></button><button class="btn btn-ghost btn-icon" id="aHapus" aria-label="Hapus album"><i class="bi bi-trash3"></i></button><label class="btn btn-primary" for="aFile"><i class="bi bi-cloud-upload"></i> Unggah Foto</label><input type="file" id="aFile" class="sr-only" accept="image/jpeg,image/png" multiple>' : ''}</div></div>
        <div id="aProg"></div>
        <div class="foto-grid" id="aGrid">${a.foto.length ? a.foto.map((f, i) => `<figure class="foto-item ${a.sampul_url === f.foto_url ? 'sampul' : ''}"><button class="foto-btn" data-lihat="${i}" aria-label="Perbesar foto ${i + 1}"><img src="${esc(f.foto_url)}" alt="${esc(f.keterangan || a.judul)}" loading="lazy" referrerpolicy="no-referrer"></button>
            ${a.sampul_url === f.foto_url ? '<span class="tag-sampul"><i class="bi bi-star-fill"></i> Sampul</span>' : ''}
            <figcaption>${esc(f.keterangan || '')}</figcaption>
            ${kelola ? `<div class="foto-acts"><button class="btn btn-sm btn-white" data-sampul="${esc(f.id)}" title="Jadikan sampul" aria-label="Jadikan sampul"><i class="bi bi-star"></i></button><button class="btn btn-sm btn-white" data-ket="${esc(f.id)}" title="Keterangan" aria-label="Ubah keterangan"><i class="bi bi-chat-left-text"></i></button><button class="btn btn-sm btn-white" data-del="${esc(f.id)}" title="Hapus" aria-label="Hapus foto"><i class="bi bi-trash3"></i></button></div>` : ''}</figure>`).join('')
          : `<div class="card" style="grid-column:1/-1">${emptyState('Album masih kosong', kelola ? 'Klik Unggah Foto. Anda bisa memilih banyak foto sekaligus.' : 'Belum ada foto.', 'bi-camera')}</div>`}</div>`;
      $$('[data-lihat]').forEach((b) => b.onclick = () => window.Lightbox && window.Lightbox(a.foto.map((f) => ({ src: f.foto_url, ket: f.keterangan })), Number(b.dataset.lihat)));
      if (!kelola) return;
      $('#aUbah').onclick = () => formAlbum(a, async () => { a = await Data.albumDetail(id); render(); });
      $('#aHapus').onclick = async () => {
        const k = await konfirmasi({ judul: 'Hapus album?', bahaya: true, ok: 'Hapus album', pesan: `Album <b>${esc(a.judul)}</b> dan ${a.foto.length} catatan fotonya dihapus dari aplikasi & website. Berkas asli tetap ada di Google Drive.` });
        if (!k.ok) return;
        try { await Data.hapusAlbum(a.id); toast('Album dihapus.', 'success'); Router.go('/app/dokumentasi'); } catch (e) { toast(e.message, 'error'); }
      };
      $('#aFile').onchange = (e) => unggahBanyak([...e.target.files]);
      const cari = (fid) => a.foto.find((f) => f.id === fid);
      $$('[data-sampul]').forEach((b) => b.onclick = async () => { const f = cari(b.dataset.sampul);
        try { await Data.simpanAlbum(Object.assign({}, a, { sampul_url: f.foto_url, foto: undefined, kegiatan: undefined })); a.sampul_url = f.foto_url; toast('Sampul album diperbarui.', 'success'); render(); } catch (er) { toast(er.message, 'error'); } });
      $$('[data-ket]').forEach((b) => b.onclick = () => { const f = cari(b.dataset.ket);
        modal({ judul: 'Keterangan Foto', isi: `<div class="field"><label for="kt">Keterangan</label><input class="input" id="kt" maxlength="140" value="${esc(f.keterangan || '')}" placeholder="Contoh: Sesi praktik lari estafet"></div>`,
          foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="ktGo">Simpan</button>',
          onOpen: (m, close) => { $('#kt', m).focus(); $('#ktGo', m).onclick = async () => { try { await Data.ubahFoto(f.id, $('#kt', m).value.trim()); f.keterangan = $('#kt', m).value.trim(); close(); render(); } catch (er) { toast(er.message, 'error'); } }; } }); });
      $$('[data-del]').forEach((b) => b.onclick = async () => { const f = cari(b.dataset.del);
        const k = await konfirmasi({ judul: 'Hapus foto?', bahaya: true, ok: 'Hapus', pesan: 'Foto dihapus dari album dan website.' });
        if (!k.ok) return;
        try { await Data.hapusFoto(f.id); a.foto = a.foto.filter((x) => x.id !== f.id); if (a.sampul_url === f.foto_url) { a.sampul_url = a.foto[0] ? a.foto[0].foto_url : null; await Data.simpanAlbum(Object.assign({}, a, { foto: undefined, kegiatan: undefined })); } toast('Foto dihapus.', 'success'); render(); }
        catch (er) { toast(er.message, 'error'); } });
    };
    // Unggah satu per satu (aman untuk koneksi HP & batas payload GAS)
    async function unggahBanyak(files) {
      if (!files.length) return;
      if (files.length > 30) { toast('Maksimal 30 foto sekali unggah.', 'warning'); files = files.slice(0, 30); }
      let ok = 0;
      for (let i = 0; i < files.length; i++) {
        $('#aProg').innerHTML = `<div class="card upload-prog"><div style="display:flex;justify-content:space-between"><b>Mengunggah foto ${i + 1} dari ${files.length}…</b><span class="tabnum">${Math.round(i / files.length * 100)}%</span></div><div class="progress" style="margin-top:8px"><span style="width:${Math.round(i / files.length * 100)}%"></span></div></div>`;
        try {
          if (!files[i].type.startsWith('image/')) throw new Error(files[i].name + ' bukan gambar.');
          const b = await kompresGambar(files[i], 1600, 0.8);
          const url = await unggah('dokumentasi', b);
          const f = await Data.tambahFoto(a.id, url, null);
          a.foto.push(f || { id: 'tmp' + i, foto_url: url });
          if (!a.sampul_url) { a.sampul_url = url; await Data.simpanAlbum(Object.assign({}, a, { foto: undefined, kegiatan: undefined })); }
          ok++;
        } catch (e) { toast(`${files[i].name}: ${e.message}`, 'error'); }
      }
      toast(`${ok} foto berhasil diunggah.`, 'success');
      render();
    }
    render();
  }

  Object.assign(window.AppPages, { lomba: halLomba, peserta: halPeserta, prestasi: halPrestasi, berita: halBerita, dokumentasi: halDokumentasi });
  window.KKG.formDaftarLomba = formDaftar;
})();
