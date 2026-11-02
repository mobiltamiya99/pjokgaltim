/* =====================================================================
   BATCH 5 — Website publik lengkap
   Data Anggota · Program Kerja · Agenda · Jadwal Lomba · Prestasi ·
   Berita (+ detail) · Dokumentasi (+ album & lightbox)
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, BULAN, BLN, PERINGKAT, avatar, toast, Router, debounce, skeletonCards, emptyState } = window.K;
  const { Data } = window.KKG;
  const P = window.PublicPages;
  const shell = P._shell, gagal = P._gagal;
  const TH = () => new Date().getFullYear();
  const hariIni = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const band = (crumb, judul, sub) => `<section class="page-band"><div class="container"><div class="crumb"><a href="#/">Beranda</a> / ${crumb}</div><h1 class="h-xl">${judul}</h1>${sub ? `<p>${sub}</p>` : ''}</div></section>`;
  const kosong = (j, p, ic) => `<div class="card" style="grid-column:1/-1">${emptyState(j, p, ic)}</div>`;
  const blokTgl = (t) => { const d = new Date(t); return `<div class="date-block"><small>${BLN[d.getMonth()]}</small><b>${d.getDate()}</b><small style="color:rgba(255,255,255,.7)">${d.getFullYear()}</small></div>`; };
  const WARNA_JENIS = { O2SN: 'b-navy', POPDA: 'b-teal', 'Pekan Seni': 'b-amber' };

  // ------------------------------------------------------------------
  // Lightbox foto (dipakai publik & internal)
  // ------------------------------------------------------------------
  window.Lightbox = function (items, mulai = 0) {
    let i = mulai;
    const el = document.createElement('div');
    el.className = 'lightbox'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Pratinjau foto');
    const gambar = () => {
      el.innerHTML = `<button class="lb-x" aria-label="Tutup"><i class="bi bi-x-lg"></i></button>
        ${items.length > 1 ? '<button class="lb-nav prev" aria-label="Foto sebelumnya"><i class="bi bi-chevron-left"></i></button><button class="lb-nav next" aria-label="Foto berikutnya"><i class="bi bi-chevron-right"></i></button>' : ''}
        <figure><img src="${esc(items[i].src)}" alt="${esc(items[i].ket || 'Foto dokumentasi')}" referrerpolicy="no-referrer"><figcaption>${esc(items[i].ket || '')}<span>${i + 1} / ${items.length}</span></figcaption></figure>`;
      $('.lb-x', el).onclick = tutup;
      if ($('.prev', el)) { $('.prev', el).onclick = (e) => { e.stopPropagation(); geser(-1); }; $('.next', el).onclick = (e) => { e.stopPropagation(); geser(1); }; }
      $('.lb-x', el).focus();
    };
    const geser = (d) => { i = (i + d + items.length) % items.length; gambar(); };
    const kunci = (e) => { if (e.key === 'Escape') tutup(); else if (e.key === 'ArrowLeft') geser(-1); else if (e.key === 'ArrowRight') geser(1); };
    let x0 = null;
    el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) geser(dx < 0 ? 1 : -1); x0 = null; });
    el.onclick = (e) => { if (e.target === el) tutup(); };
    function tutup() { document.removeEventListener('keydown', kunci); el.remove(); document.body.style.overflow = ''; }
    document.addEventListener('keydown', kunci);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(el); gambar();
  };

  // ------------------------------------------------------------------
  // DATA ANGGOTA (yang ditandai tampil publik)
  // ------------------------------------------------------------------
  async function anggota() {
    await shell('profil', band('Profil / Data Anggota', 'Data Anggota KKG PJOK', 'Guru PJOK yang tergabung dan bersedia ditampilkan di website. NIP disamarkan untuk menjaga privasi.') + `
      <div class="container" style="margin-top:32px"><div class="card" style="padding:16px;margin-bottom:20px"><div class="toolbar" style="margin:0">
        <div class="search"><i class="bi bi-search"></i><input class="input" id="aCari" placeholder="Cari nama guru…" aria-label="Cari nama guru"></div>
        <select class="select" id="aSek" aria-label="Sekolah"><option value="">Semua sekolah</option></select></div></div>
        <p class="body-sm muted" id="aInfo" style="margin-bottom:12px"></p><div class="grid-4 member-grid" id="aList">${skeletonCards(8, 120)}</div></div>`);
    let data = [];
    const f = { cari: '', sek: '' };
    const render = () => {
      const rows = data.filter((a) => (!f.sek || a.sekolah === f.sek) && (!f.cari || a.nama.toLowerCase().includes(f.cari)));
      $('#aInfo').textContent = `${rows.length} dari ${data.length} anggota ditampilkan`;
      $('#aList').innerHTML = rows.length ? rows.map((a) => `<article class="card member-card">${avatar(a.nama, a.foto_url, 'lg')}<h3>${esc(a.nama)}</h3>
          <div class="body-sm muted">${esc(a.sekolah || '')}</div><div class="tags">${a.status_kepegawaian ? `<span class="badge b-navy">${esc(a.status_kepegawaian)}</span>` : ''}${a.kompetensi ? `<span class="badge b-teal" style="text-transform:none;letter-spacing:0">${esc(a.kompetensi)}</span>` : ''}</div>
          ${a.nip_samaran ? `<div class="body-sm muted tabnum">NIP ${esc(a.nip_samaran)}</div>` : ''}</article>`).join('') : kosong('Tidak ditemukan', 'Coba kata kunci atau sekolah lain.', 'bi-search');
    };
    try {
      data = await Data.anggotaPublik();
      $('#aSek').innerHTML = '<option value="">Semua sekolah</option>' + [...new Set(data.map((a) => a.sekolah).filter(Boolean))].sort().map((s) => `<option>${esc(s)}</option>`).join('');
      render();
    } catch (e) { gagal('#aList')(e); }
    $('#aCari').oninput = debounce((e) => { f.cari = e.target.value.toLowerCase(); render(); }, 200);
    $('#aSek').onchange = (e) => { f.sek = e.target.value; render(); };
  }

  // ------------------------------------------------------------------
  // PROGRAM KERJA
  // ------------------------------------------------------------------
  async function program() {
    await shell('program', band('Program Kerja', 'Program Kerja Tahunan', 'Rencana kerja KKG PJOK Tegal Timur beserta capaiannya, diperbarui pengurus secara berkala.') + `
      <div class="container" style="margin-top:32px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px">
        <div class="stats-row" id="pStat" style="margin:0;flex:1"></div><select class="select" id="pTh" style="width:auto" aria-label="Tahun">${[TH(), TH() - 1, TH() - 2].map((y) => `<option>${y}</option>`).join('')}</select></div>
        <div class="grid-2" id="pList">${skeletonCards(4, 150)}</div></div>`);
    const ST = { belum_mulai: ['b-slate', 'Belum Mulai'], berjalan: ['b-teal', 'Berjalan'], selesai: ['b-green', 'Selesai'] };
    const muat = async (th) => {
      $('#pList').innerHTML = skeletonCards(4, 150);
      try {
        const rows = await Data.programPublik(th);
        const rata = rows.length ? Math.round(rows.reduce((a, p) => a + p.progres_persen, 0) / rows.length) : 0;
        $('#pStat').innerHTML = [['bi-clipboard-data', rows.length, 'Program ' + th, ''], ['bi-graph-up', rata + '%', 'Rata-rata capaian', 'navy'], ['bi-check2-circle', rows.filter((p) => p.status === 'selesai').length, 'Program selesai', 'amber']]
          .map(([ic, n, l, c]) => `<div class="card stat-card"><div><div class="num">${n}</div><div class="lbl">${l}</div></div><span class="icon-tile ${c}"><i class="bi ${ic}"></i></span></div>`).join('');
        $('#pList').innerHTML = rows.length ? rows.map((p) => `<article class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="body-sm muted tabnum">${esc(p.kode || '')}</span><span class="badge ${ST[p.status][0]}">${ST[p.status][1]}</span></div>
            <h3 style="font-size:18px;font-weight:700;margin:8px 0">${esc(p.judul)}</h3>${p.deskripsi ? `<p class="body-sm muted" style="margin-bottom:12px">${esc(p.deskripsi)}</p>` : ''}
            <div class="meta" style="margin-bottom:14px">${p.target ? `<span><i class="bi bi-bullseye"></i>${esc(p.target)}</span>` : ''}${p.tanggal_mulai ? `<span><i class="bi bi-calendar-range"></i>${fmt.tglPendek(p.tanggal_mulai)}${p.tanggal_selesai ? ' – ' + fmt.tglPendek(p.tanggal_selesai) : ''}</span>` : ''}${p.penanggung_jawab ? `<span><i class="bi bi-person"></i>${esc(p.penanggung_jawab)}</span>` : ''}</div>
            <div style="display:flex;justify-content:space-between;font-size:13px"><span class="muted">Capaian</span><b class="tabnum">${p.progres_persen}%</b></div><div class="progress" style="margin-top:6px"><span style="width:${p.progres_persen}%"></span></div></article>`).join('')
          : kosong('Belum ada program', 'Program kerja tahun ini belum dipublikasikan.', 'bi-clipboard-data');
      } catch (e) { gagal('#pList')(e); }
    };
    $('#pTh').onchange = (e) => muat(Number(e.target.value));
    muat(TH());
  }

  // ------------------------------------------------------------------
  // AGENDA KEGIATAN
  // ------------------------------------------------------------------
  async function agenda() {
    await shell('agenda', band('Agenda', 'Agenda Kegiatan', 'Pelatihan, rapat koordinasi, dan kegiatan keolahragaan KKG PJOK Tegal Timur.') + `
      <div class="container" style="margin-top:32px"><div class="chip-tabs" id="gTabs" role="tablist"></div><div class="agenda-list" id="gList">${skeletonCards(3, 90)}</div></div>`);
    let data = [], tab = 'datang';
    const render = () => {
      const t = hariIni();
      const grup = { datang: data.filter((k) => k.tanggal >= t && k.status_efektif !== 'dibatalkan').sort((a, b) => a.tanggal.localeCompare(b.tanggal)), lewat: data.filter((k) => k.tanggal < t).sort((a, b) => b.tanggal.localeCompare(a.tanggal)) };
      $('#gTabs').innerHTML = [['datang', 'Akan Datang'], ['lewat', 'Sudah Berlangsung']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'active' : ''}" data-t="${k}">${l} <span class="n">${grup[k].length}</span></button>`).join('');
      $$('#gTabs [data-t]').forEach((b) => b.onclick = () => { tab = b.dataset.t; render(); });
      $('#gList').innerHTML = grup[tab].length ? grup[tab].map((k) => `<article class="card agenda-row">${blokTgl(k.tanggal)}
          <div style="flex:1;min-width:0"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="badge b-teal">${esc(k.kategori || 'Kegiatan')}</span>${k.status_efektif === 'dibatalkan' ? '<span class="badge b-red">Dibatalkan</span>' : k.status_efektif === 'berlangsung' ? '<span class="badge b-amber"><span class="dot pulse"></span>Hari ini</span>' : ''}</div>
            <h3>${esc(k.judul)}</h3>${k.deskripsi ? `<p class="body-sm muted">${esc(k.deskripsi)}</p>` : ''}
            <div class="meta"><span><i class="bi bi-clock"></i>${k.jam_mulai ? fmt.jam(k.jam_mulai) + (k.jam_selesai ? '–' + fmt.jam(k.jam_selesai) : '') + ' WIB' : 'Waktu menyusul'}</span><span><i class="bi bi-geo-alt"></i>${esc(k.lokasi || '-')}</span>${k.program_judul ? `<span><i class="bi bi-clipboard-data"></i>${esc(k.program_judul)}</span>` : ''}</div></div></article>`).join('')
        : kosong(tab === 'datang' ? 'Belum ada agenda terdekat' : 'Belum ada kegiatan', 'Agenda dipublikasikan pengurus melalui portal.', 'bi-calendar2-week');
    };
    try { const [a, b] = await Promise.all([Data.agendaPublik(TH()), Data.agendaPublik(TH() + 1)]); data = a.concat(b); render(); } catch (e) { gagal('#gList')(e); }
  }

  // ------------------------------------------------------------------
  // JADWAL LOMBA
  // ------------------------------------------------------------------
  function statusLomba(l) {
    const t = hariIni(), akhir = l.tanggal_selesai || l.tanggal;
    if (l.status === 'selesai' || (akhir && akhir < t)) return 'selesai';
    if (l.tanggal && l.tanggal <= t) return 'berlangsung';
    if (!l.batas_daftar || l.batas_daftar >= t) return 'dibuka';
    return 'ditutup';
  }
  const ST_L = { dibuka: ['b-teal', 'Pendaftaran Dibuka', 1], ditutup: ['b-amber', 'Pendaftaran Ditutup'], berlangsung: ['b-navy', 'Berlangsung', 1], selesai: ['b-slate', 'Selesai'] };
  async function lomba() {
    await shell('lomba', band('Lomba / Jadwal Lomba', 'Jadwal Lomba & Seleksi', 'O2SN, POPDA, dan Pekan Seni untuk siswa SD binaan. Pendaftaran kontingen dilakukan guru pendamping melalui portal anggota.') + `
      <div class="container" style="margin-top:32px"><div class="chip-tabs" id="lTabs" role="tablist"></div><div class="grid-3" id="lList">${skeletonCards(3, 160)}</div>
        <div class="cta-band" style="margin-top:40px"><div><h2 class="h-lg">Guru pendamping?</h2><p>Masuk ke portal anggota untuk mendaftarkan siswa dan mengajukan prestasi.</p></div>
          <div><a class="btn btn-amber" href="#/masuk"><i class="bi bi-box-arrow-in-right"></i> Masuk Portal Anggota</a></div></div></div>`);
    let data = [], tab = 'aktif';
    const render = () => {
      const g = { aktif: data.filter((l) => l._st !== 'selesai').sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal))), selesai: data.filter((l) => l._st === 'selesai') };
      $('#lTabs').innerHTML = [['aktif', 'Akan Datang'], ['selesai', 'Selesai']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'active' : ''}" data-t="${k}">${l} <span class="n">${g[k].length}</span></button>`).join('');
      $$('#lTabs [data-t]').forEach((b) => b.onclick = () => { tab = b.dataset.t; render(); });
      $('#lList').innerHTML = g[tab].length ? g[tab].map((l) => `<article class="card lomba-card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span class="badge ${WARNA_JENIS[l.jenis] || 'b-slate'}">${esc(l.jenis)} · ${esc(l.tingkat || '')}</span>
          <span class="badge ${ST_L[l._st][0]}">${ST_L[l._st][2] ? '<span class="dot pulse"></span>' : ''}${ST_L[l._st][1]}</span></div>
          <h3 style="font-size:18px;font-weight:700;margin:12px 0 8px">${esc(l.nama)}</h3>${l.deskripsi ? `<p class="body-sm muted" style="margin-bottom:10px">${esc(l.deskripsi)}</p>` : ''}
          <div class="meta" style="flex-direction:column;align-items:flex-start;gap:6px"><span><i class="bi bi-flag"></i>${esc(l.cabang || '-')}</span><span><i class="bi bi-calendar-event"></i>${l.tanggal ? fmt.tgl(l.tanggal) : 'Jadwal menyusul'}</span><span><i class="bi bi-geo-alt"></i>${esc(l.lokasi || '-')}</span></div>
          ${l._st === 'dibuka' && l.batas_daftar ? `<div class="deadline"><i class="bi bi-hourglass-split"></i> Batas pendaftaran <b>${fmt.tglPendek(l.batas_daftar)}</b></div>` : ''}
          ${l._st === 'selesai' ? `<a class="btn btn-ghost btn-sm" style="margin-top:12px;align-self:flex-start" href="#/prestasi?lomba=${esc(l.id)}">Lihat hasil <i class="bi bi-arrow-right"></i></a>` : ''}</article>`).join('')
        : kosong('Belum ada lomba', 'Jadwal seleksi akan diumumkan di sini.', 'bi-flag');
    };
    try { data = await Data.lombaSemua(); data.forEach((l) => { l._st = statusLomba(l); }); render(); } catch (e) { gagal('#lList')(e); }
  }

  // ------------------------------------------------------------------
  // PRESTASI (Hall of Fame)
  // ------------------------------------------------------------------
  async function prestasi() {
    const q = Router.query();
    await shell('lomba', band('Lomba / Prestasi', 'Hall of Fame Prestasi Siswa', 'Prestasi resmi siswa SD binaan KKG PJOK Tegal Timur yang telah diverifikasi pengurus.') + `
      <div class="container" style="margin-top:32px">
        <div class="card" style="padding:16px;margin-bottom:20px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="rCari" placeholder="Cari nama siswa, sekolah, cabang…" aria-label="Cari prestasi"></div>
          <select class="select" id="rTh" aria-label="Tahun"><option value="">Semua tahun</option></select>
          <select class="select" id="rJenis" aria-label="Jenis lomba"><option value="">Semua lomba</option><option>O2SN</option><option>POPDA</option><option>Pekan Seni</option><option>Lainnya</option></select></div></div>
        <div class="dash-grid" style="margin-bottom:24px"><div class="card span-4"><div class="card-title"><h3>Perolehan Medali</h3></div><div class="medal-tiles" id="rMedal"><div class="skel skel-block" style="grid-column:span 3"></div></div></div>
          <div class="card span-8"><div class="card-title"><h3>Peringkat Sekolah</h3><span class="badge b-slate hide-sm">Emas 5 · Perak 4 · Perunggu 3 · Harapan 1</span></div><div class="rank-list" id="rRank"><div class="skel skel-block"></div></div></div></div>
        <div class="grid-3" id="rList">${skeletonCards(6, 110)}</div><div style="text-align:center;margin-top:20px"><button class="btn btn-outline" id="rMore" hidden>Tampilkan lebih banyak</button></div></div>`);
    let data = [], batas = 24;
    const f = { cari: '', th: q.lomba ? '' : String(TH()), jenis: '', lomba: q.lomba || '' };
    const POIN = { juara_1: 5, juara_2: 4, juara_3: 3 };
    const render = () => {
      const qq = f.cari.toLowerCase();
      const rows = data.filter((r) => (!f.th || String(r.tahun) === f.th) && (!f.jenis || r.jenis_lomba === f.jenis) && (!f.lomba || r.lomba_id === f.lomba)
        && (!qq || [r.nama_siswa, r.sekolah, r.cabang, r.lomba].join(' ').toLowerCase().includes(qq)));
      const n = (p) => rows.filter((r) => r.peringkat === p).length;
      $('#rMedal').innerHTML = [['juara_1', 'gold', 'bi-trophy-fill', 'Emas'], ['juara_2', 'silver', 'bi-award-fill', 'Perak'], ['juara_3', 'bronze', 'bi-award-fill', 'Perunggu']]
        .map(([p, c, ic, l]) => `<div class="medal-tile b-${c}"><i class="bi ${ic}"></i><b>${n(p)}</b><small>${l}</small></div>`).join('')
        + `<div class="medal-tile b-teal" style="grid-column:span 3;display:flex;justify-content:space-between;align-items:center;text-align:left"><div><small>Juara Harapan</small><b>${n('harapan_1') + n('harapan_2') + n('harapan_3')}</b></div><i class="bi bi-star-fill" style="font-size:28px"></i></div>`;
      const agg = {};
      rows.forEach((r) => { const a = agg[r.sekolah] = agg[r.sekolah] || { poin: 0, e: 0, p: 0, b: 0 }; a.poin += POIN[r.peringkat] || 1; if (r.peringkat === 'juara_1') a.e++; if (r.peringkat === 'juara_2') a.p++; if (r.peringkat === 'juara_3') a.b++; });
      const top = Object.entries(agg).sort((a, b) => b[1].poin - a[1].poin || b[1].e - a[1].e).slice(0, 8);
      const maks = top.length ? top[0][1].poin : 1;
      $('#rRank').innerHTML = top.length ? top.map(([s, a], i) => `<div class="rank-row"><span class="rank-no">${i + 1}</span><div><div style="font-weight:600;font-size:14px">${esc(s)}</div>
          <div class="progress ${i === 0 ? 'amber' : ''}" style="margin-top:6px"><span style="width:${Math.round(a.poin / maks * 100)}%"></span></div></div>
          <div style="text-align:right"><b class="tabnum" style="font-size:13px">${a.poin} poin</b><div class="body-sm muted tabnum">🥇${a.e} 🥈${a.p} 🥉${a.b}</div></div></div>`).join('')
        : emptyState('Belum ada data', 'Peringkat muncul setelah hasil lomba disahkan.', 'bi-bar-chart');
      $('#rList').innerHTML = rows.length ? rows.slice(0, batas).map((r) => { const pk = PERINGKAT[r.peringkat] || {};
        return `<article class="card prestasi-card ${r.peringkat}"><div style="display:flex;gap:12px;align-items:flex-start">${avatar(r.nama_siswa, null)}
          <div style="min-width:0;flex:1"><span class="badge ${pk.cls}"><i class="bi ${pk.icon}"></i>${pk.label}</span><h3>${esc(r.nama_siswa)}</h3>
          <div class="body-sm muted">${r.kelas ? 'Kelas ' + esc(r.kelas) + ' · ' : ''}${esc(r.sekolah)}</div></div></div>
          <div class="meta" style="margin-top:12px;flex-direction:column;align-items:flex-start;gap:4px"><span><i class="bi bi-flag"></i>${esc(r.cabang || '-')}</span><span><i class="bi bi-trophy"></i>${esc(r.lomba)} · ${esc(r.tingkat || '')} ${r.tahun}</span>${r.guru_pendamping ? `<span><i class="bi bi-person-check"></i>Pendamping: ${esc(r.guru_pendamping)}</span>` : ''}</div></article>`; }).join('')
        : kosong('Belum ada prestasi', 'Ubah saringan tahun atau jenis lomba.', 'bi-trophy');
      $('#rMore').hidden = rows.length <= batas;
    };
    try {
      data = await Data.prestasiPublik();
      const th = [...new Set(data.map((r) => r.tahun))].sort((a, b) => b - a);
      $('#rTh').innerHTML = '<option value="">Semua tahun</option>' + th.map((y) => `<option ${String(y) === f.th ? 'selected' : ''}>${y}</option>`).join('');
      if (f.th && !th.map(String).includes(f.th)) f.th = '';
      render();
    } catch (e) { gagal('#rList')(e); }
    $('#rCari').oninput = debounce((e) => { f.cari = e.target.value; batas = 24; render(); }, 200);
    $('#rTh').onchange = (e) => { f.th = e.target.value; f.lomba = ''; batas = 24; render(); };
    $('#rJenis').onchange = (e) => { f.jenis = e.target.value; batas = 24; render(); };
    $('#rMore').onclick = () => { batas += 24; render(); };
  }

  // ------------------------------------------------------------------
  // BERITA (daftar & detail)
  // ------------------------------------------------------------------
  const IKON_KAT = { Kurikulum: 'bi-journal-text', Prestasi: 'bi-trophy', Organisasi: 'bi-people', Pengumuman: 'bi-megaphone', Kegiatan: 'bi-calendar-event' };
  const kartuBerita = (b) => `<a class="card card-hover news-card" href="#/berita/${esc(b.slug || b.id)}"><div class="news-cover">${b.gambar_url ? `<img src="${esc(b.gambar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<i class="bi ${IKON_KAT[b.kategori] || 'bi-newspaper'}"></i>`}</div>
    <div class="body"><div class="meta"><span class="badge b-navy">${esc(b.kategori || 'Berita')}</span><span><i class="bi bi-calendar3"></i>${fmt.tglPendek(b.tanggal_terbit)}</span></div>
    <h4>${esc(b.judul)}</h4><p>${esc(b.ringkasan || '')}</p><span class="more">BACA SELENGKAPNYA →</span></div></a>`;
  async function berita() {
    await shell('berita', band('Berita', 'Berita & Pengumuman', 'Informasi kedinasan, liputan kegiatan, dan prestasi siswa binaan.') + `
      <div class="container" style="margin-top:32px"><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:20px"><div class="chip-tabs" id="nKat" style="margin:0;flex:1"></div>
        <div class="search" style="min-width:220px"><i class="bi bi-search"></i><input class="input" id="nCari" placeholder="Cari berita…" aria-label="Cari berita"></div></div>
        <div class="grid-3" id="nList">${skeletonCards(6, 220)}</div></div>`);
    let data = [], kat = '', cari = '';
    const render = () => {
      const k = [...new Set(data.map((b) => b.kategori).filter(Boolean))];
      $('#nKat').innerHTML = [['', 'Semua']].concat(k.map((x) => [x, x])).map(([v, l]) => `<button role="tab" aria-selected="${kat === v}" class="${kat === v ? 'active' : ''}" data-k="${esc(v)}">${esc(l)}</button>`).join('');
      $$('#nKat [data-k]').forEach((b) => b.onclick = () => { kat = b.dataset.k; render(); });
      const rows = data.filter((b) => (!kat || b.kategori === kat) && (!cari || (b.judul + ' ' + (b.ringkasan || '')).toLowerCase().includes(cari)));
      $('#nList').innerHTML = rows.length ? rows.map(kartuBerita).join('') : kosong('Belum ada berita', 'Berita yang terbit akan tampil di sini.', 'bi-newspaper');
    };
    try { data = await Data.beritaPublik(); render(); } catch (e) { gagal('#nList')(e); }
    $('#nCari').oninput = debounce((e) => { cari = e.target.value.toLowerCase(); render(); }, 200);
  }
  async function beritaDetail([kunci]) {
    await shell('berita', `<div class="container article-wrap" id="artikel"><div class="skel skel-block" style="height:420px;margin-top:32px"></div></div>`);
    try {
      const b = await Data.beritaDetail(kunci);
      document.title = b.judul + ' · KKG PJOK Tegal Timur';
      const url = location.href;
      const paragraf = String(b.isi || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
      $('#artikel').innerHTML = `<div class="crumb" style="margin-top:28px"><a href="#/">Beranda</a> / <a href="#/berita">Berita</a> / ${esc(b.kategori || '')}</div>
        <article class="artikel"><span class="badge b-navy">${esc(b.kategori || 'Berita')}</span>${b.status === 'draf' ? ' <span class="badge b-slate">Draf — hanya pengurus</span>' : ''}
          <h1>${esc(b.judul)}</h1><div class="meta"><span><i class="bi bi-calendar3"></i>${b.tanggal_terbit ? fmt.tgl(b.tanggal_terbit) : 'Belum terbit'}</span><span><i class="bi bi-building"></i>KKG PJOK Tegal Timur</span></div>
          ${b.gambar_url ? `<figure class="cover"><img src="${esc(b.gambar_url)}" alt="" referrerpolicy="no-referrer"></figure>` : ''}
          ${b.ringkasan ? `<p class="lead-text">${esc(b.ringkasan)}</p>` : ''}<div class="isi">${paragraf || '<p class="muted">Isi berita belum tersedia.</p>'}</div>
          <div class="share"><span class="body-sm muted">Bagikan:</span><a class="btn btn-sm btn-wa" href="https://wa.me/?text=${encodeURIComponent(b.judul + ' ' + url)}" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> WhatsApp</a>
            <button class="btn btn-sm btn-outline" id="salin"><i class="bi bi-link-45deg"></i> Salin tautan</button></div></article>
        <section class="section" style="margin-top:32px"><div class="section-head"><div><h2>Berita Lainnya</h2></div><a class="btn btn-ghost btn-sm" href="#/berita">Semua berita <i class="bi bi-arrow-right"></i></a></div><div class="grid-3" id="lain">${skeletonCards(3, 200)}</div></section>`;
      $('#salin').onclick = async () => { try { await navigator.clipboard.writeText(url); toast('Tautan disalin.', 'success', 1800); } catch (e) { toast('Salin manual: ' + url, 'info'); } };
      Data.beritaTerbaru(4).then((r) => { const l = r.filter((x) => x.id !== b.id).slice(0, 3); $('#lain').innerHTML = l.length ? l.map(kartuBerita).join('') : kosong('Belum ada berita lain', '', 'bi-newspaper'); }).catch(gagal('#lain'));
    } catch (e) {
      $('#artikel').innerHTML = `<div style="margin-top:40px" class="card">${emptyState('Berita tidak ditemukan', e.message, 'bi-newspaper', '<a class="btn btn-primary" href="#/berita">Kembali ke daftar berita</a>')}</div>`;
    }
  }

  // ------------------------------------------------------------------
  // DOKUMENTASI (album & foto)
  // ------------------------------------------------------------------
  async function dokumentasi() {
    await shell('dokumentasi', band('Dokumentasi', 'Galeri Dokumentasi', 'Momen kegiatan, pelatihan, dan kejuaraan KKG PJOK Tegal Timur.') + `<div class="container" style="margin-top:32px"><div class="grid-3" id="gList">${skeletonCards(6, 220)}</div></div>`);
    try {
      const rows = await Data.albumPublik();
      $('#gList').innerHTML = rows.length ? rows.map((a) => { const n = ((a.dokumentasi_foto || [])[0] || {}).count || 0;
        return `<a class="card card-hover album-card" href="#/dokumentasi/${esc(a.id)}"><div class="cover">${a.sampul_url ? `<img src="${esc(a.sampul_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i class="bi bi-images"></i>'}<span class="count"><i class="bi bi-image"></i> ${n}</span></div>
          <div class="body"><span class="badge b-navy">${esc(a.kategori || 'Kegiatan')}</span><h3>${esc(a.judul)}</h3><div class="body-sm muted"><i class="bi bi-calendar3"></i> ${fmt.tgl(a.tanggal)}</div></div></a>`; }).join('')
        : kosong('Belum ada dokumentasi', 'Album foto kegiatan akan tampil di sini.', 'bi-images');
    } catch (e) { gagal('#gList')(e); }
  }
  async function albumPublik([id]) {
    await shell('dokumentasi', `<div class="container" id="alb"><div class="skel skel-block" style="height:360px;margin-top:32px"></div></div>`);
    try {
      const a = await Data.albumDetail(id);
      $('#alb').innerHTML = `<div class="crumb" style="margin-top:28px"><a href="#/">Beranda</a> / <a href="#/dokumentasi">Dokumentasi</a></div>
        <div class="section-head" style="margin-top:12px"><div><span class="badge b-navy">${esc(a.kategori || 'Kegiatan')}</span><h1 class="h-xl" style="margin-top:8px">${esc(a.judul)}</h1>
          <p>${fmt.tgl(a.tanggal)}${a.kegiatan && a.kegiatan.judul ? ' · ' + esc(a.kegiatan.judul) : ''} · ${a.foto.length} foto</p></div><a class="btn btn-ghost btn-sm" href="#/dokumentasi"><i class="bi bi-arrow-left"></i> Semua album</a></div>
        <div class="foto-grid">${a.foto.length ? a.foto.map((f, i) => `<figure class="foto-item"><button class="foto-btn" data-i="${i}" aria-label="Perbesar foto ${i + 1}"><img src="${esc(f.foto_url)}" alt="${esc(f.keterangan || a.judul)}" loading="lazy" referrerpolicy="no-referrer"></button>${f.keterangan ? `<figcaption>${esc(f.keterangan)}</figcaption>` : ''}</figure>`).join('')
          : kosong('Album masih kosong', 'Foto akan segera ditambahkan.', 'bi-camera')}</div>`;
      $$('[data-i]').forEach((b) => b.onclick = () => window.Lightbox(a.foto.map((f) => ({ src: f.foto_url, ket: f.keterangan })), Number(b.dataset.i)));
    } catch (e) {
      $('#alb').innerHTML = `<div style="margin-top:40px" class="card">${emptyState('Album tidak ditemukan', e.message, 'bi-images', '<a class="btn btn-primary" href="#/dokumentasi">Semua album</a>')}</div>`;
    }
  }

  Object.assign(P, { anggota, program, agenda, lomba, prestasi, berita, beritaDetail, dokumentasi, albumPublik });
})();
