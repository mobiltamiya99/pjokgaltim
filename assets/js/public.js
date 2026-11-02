/* =====================================================================
   WEBSITE PUBLIK — Beranda, Profil & Struktur, Kontak, Daftar, Masuk
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, BLN, PERINGKAT, avatar, toast, Router, Theme, validasi, kompresGambar, skeletonCards, emptyState } = window.K;
  const { Auth, Data, DEMO } = window.KKG;

  const MENU = [
    { href: '#/', label: 'Beranda', key: 'beranda' },
    { label: 'Profil', key: 'profil', sub: [
      { href: '#/profil', label: 'Profil & Visi Misi' }, { href: '#/profil#struktur', label: 'Struktur Pengurus' }, { href: '#/anggota', label: 'Data Anggota' }] },
    { href: '#/program', label: 'Program Kerja', key: 'program' },
    { href: '#/agenda', label: 'Agenda', key: 'agenda' },
    { label: 'Lomba', key: 'lomba', sub: [{ href: '#/lomba', label: 'Jadwal Lomba' }, { href: '#/prestasi', label: 'Prestasi' }] },
    { href: '#/berita', label: 'Berita', key: 'berita' },
    { href: '#/dokumentasi', label: 'Dokumentasi', key: 'dokumentasi' },
    { href: '#/kontak', label: 'Kontak', key: 'kontak' }
  ];

  function brand(org) {
    return `<a class="brand" href="#/" aria-label="Beranda ${esc(org.singkatan)}">
      <span class="brand-logo">${org.logo_url ? `<img src="${esc(org.logo_url)}" alt="">` : '<i class="bi bi-trophy"></i>'}</span>
      <span><b>${esc(org.singkatan || 'KKG PJOK Tegal Timur')}</b><small>Disdikbud Kota Tegal</small></span></a>`;
  }

  async function shell(aktif, kontenHtml) {
    const org = await Data.org();
    const menuHtml = MENU.map((m) => m.sub
      ? `<div class="dd-wrap"><button class="dd" aria-haspopup="true">${m.label} <i class="bi bi-chevron-down" style="font-size:11px"></i></button>
           <div class="dd-menu">${m.sub.map((s) => `<a href="${s.href}">${s.label}</a>`).join('')}</div></div>`
      : `<a href="${m.href}" class="${aktif === m.key ? 'active' : ''}">${m.label}</a>`).join('');
    const masuk = Auth.profil
      ? `<a class="btn btn-primary btn-sm hide-sm" href="#/app/dashboard"><i class="bi bi-speedometer2"></i> Dashboard</a>`
      : `<a class="btn btn-primary btn-sm hide-sm" href="#/masuk"><i class="bi bi-google"></i> Masuk</a>`;

    $('#root').innerHTML = `
      <a href="#main" class="sr-only">Lewati ke konten</a>
      <header class="pub-nav" id="pubNav"><div class="container">
        ${brand(org)}
        <nav class="pub-menu" aria-label="Menu utama">${menuHtml}</nav>
        <div class="pub-actions">
          <button class="icon-btn" data-act="theme" aria-label="Ganti tema"><i data-theme-icon class="bi"></i></button>
          <a class="btn btn-outline btn-sm hide-md" href="#/daftar">Daftar Anggota</a>
          ${masuk}
          <button class="icon-btn pub-burger" data-act="drawer" aria-label="Buka menu"><i class="bi bi-list"></i></button>
        </div></div></header>
      <main id="main" class="fade-in">${kontenHtml}</main>
      ${footer(org)}`;
    Theme.apply(Theme.get());
    $('[data-act="theme"]').onclick = Theme.toggle;
    $('[data-act="drawer"]').onclick = () => bukaDrawer(aktif);
    window.onscroll = () => { const n = $('#pubNav'); n && n.classList.toggle('scrolled', window.scrollY > 8); };
    window.scrollTo(0, 0);
    return org;
  }

  function bukaDrawer(aktif) {
    const bd = document.createElement('div');
    bd.className = 'drawer-backdrop';
    const dr = document.createElement('nav');
    dr.className = 'pub-drawer';
    dr.setAttribute('aria-label', 'Menu');
    dr.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <b>Menu</b><button class="btn btn-icon btn-white-outline" aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div>
      ${MENU.flatMap((m) => m.sub ? m.sub : [m]).map((m) => `<a href="${m.href}" class="${aktif === m.key ? 'active' : ''}">${m.label}</a>`).join('')}
      <div style="margin-top:auto;display:grid;gap:10px;padding-top:16px">
        <a class="btn btn-amber" href="#/daftar">Daftar Menjadi Anggota</a>
        <a class="btn btn-white" href="${Auth.profil ? '#/app/dashboard' : '#/masuk'}">${Auth.profil ? 'Dashboard' : 'Masuk dengan Google'}</a></div>`;
    const tutup = () => { bd.remove(); dr.remove(); };
    bd.onclick = tutup; dr.querySelector('button').onclick = tutup;
    $$('a', dr).forEach((a) => a.addEventListener('click', tutup));
    document.body.append(bd, dr);
  }

  function footer(org) {
    return `<footer class="pub-footer"><div class="container">
      <div class="cols">
        <div><div class="brand" style="color:#fff;margin-bottom:14px"><span class="brand-logo"><i class="bi bi-trophy"></i></span>
          <span><b>${esc(org.singkatan)}</b><small style="color:rgba(255,255,255,.6)">Kecamatan Tegal Timur</small></span></div>
          <p>${esc(org.tentang || '')}</p></div>
        <div><h5>Tautan Cepat</h5><a href="#/profil">Profil & Visi Misi</a><a href="#/agenda">Agenda Kegiatan</a><a href="#/prestasi">Prestasi Siswa</a><a href="#/berita">Berita</a></div>
        <div><h5>Layanan</h5><a href="#/daftar">Daftar Anggota</a><a href="#/masuk">Masuk Portal</a><a href="#/lomba">Jadwal Lomba</a><a href="#/kontak">Kontak</a></div>
        <div><h5>Kontak</h5><p style="margin-bottom:8px"><i class="bi bi-geo-alt"></i> ${esc(org.alamat || '-')}</p>
          <p style="margin-bottom:8px"><i class="bi bi-envelope"></i> ${esc(org.email || '-')}</p><p><i class="bi bi-telephone"></i> ${esc(org.telepon || '-')}</p></div>
      </div>
      <div class="copy"><span>© ${new Date().getFullYear()} ${esc(org.nama)}. Hak cipta dilindungi.</span><span>${esc(org.instansi_pembina || '')}</span></div>
    </div></footer>`;
  }

  // ------------------------------------------------------------------
  // BERANDA
  // ------------------------------------------------------------------
  async function beranda() {
    const org = await shell('beranda', `
      <section class="hero"><div class="container">
        <div>
          <span class="hero-chip"><i class="bi bi-patch-check-fill" style="color:var(--teal)"></i> Wilayah Kecamatan Tegal Timur — Disdikbud Kota Tegal</span>
          <h1 class="display-hero" style="margin-top:18px">Bersama Meningkatkan Profesionalisme Guru PJOK & Prestasi Olahraga Pelajar</h1>
          <p class="lead">Wadah kolaborasi guru Pendidikan Jasmani, Olahraga, dan Kesehatan untuk inovasi pembelajaran, asesmen kebugaran, dan pembinaan atlet usia dini se-Tegal Timur.</p>
          <div class="cta">
            <a class="btn btn-amber" href="#/daftar"><i class="bi bi-person-plus"></i> Daftar Menjadi Anggota</a>
            <a class="btn btn-white-outline" href="#/agenda"><i class="bi bi-calendar-event"></i> Lihat Agenda Kegiatan</a>
          </div>
          <div class="trust"><span><i class="bi bi-shield-check"></i> <span id="hSk">SK Penetapan Pengurus</span></span><span><i class="bi bi-people"></i> Basis data guru PJOK terverifikasi</span></div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="court"><div class="circle"></div><div class="lane"></div>
            <div class="icons"><span><i class="bi bi-stopwatch"></i></span><span><i class="bi bi-dribbble"></i></span><span><i class="bi bi-heart-pulse"></i></span></div></div>
          <div class="float-card tl"><span class="icon-tile"><i class="bi bi-people-fill"></i></span><div><b id="hAgt">—</b>Guru PJOK aktif</div></div>
          <div class="float-card br"><span class="icon-tile amber"><i class="bi bi-trophy-fill"></i></span><div><b id="hPres">—</b>Prestasi tercatat</div></div>
        </div>
      </div></section>

      <div class="container">
        <div class="stats-row" id="stats">${skeletonCards(4, 40)}</div>

        <section class="section" aria-labelledby="hAgenda">
          <div class="section-head"><div><span class="label-sm eyebrow">Jadwal Gugus</span><h2 id="hAgenda">Agenda Terdekat</h2>
            <p>Pelatihan, rapat koordinasi, dan agenda keolahragaan terdekat.</p></div>
            <a class="btn btn-ghost btn-sm" href="#/agenda">Lihat kalender penuh <i class="bi bi-arrow-right"></i></a></div>
          <div class="grid-3" id="agenda">${skeletonCards(3, 70)}</div>
        </section>

        <section class="section" aria-labelledby="hBerita">
          <div class="section-head"><div><span class="label-sm eyebrow">Warta Komunitas</span><h2 id="hBerita">Warta & Berita Terbaru</h2>
            <p>Informasi kedinasan, liputan kegiatan olahraga, dan rilis materi KKG.</p></div>
            <a class="btn btn-ghost btn-sm" href="#/berita">Semua berita <i class="bi bi-arrow-right"></i></a></div>
          <div class="grid-3" id="berita">${skeletonCards(3, 160)}</div>
        </section>

        <section class="section" aria-labelledby="hFame">
          <div class="section-head"><div><span class="label-sm eyebrow">Prestasi Siswa Binaan</span><h2 id="hFame">Hall of Fame Tegal Timur</h2>
            <p>Perolehan medali resmi O2SN, POPDA, dan Pekan Seni tahun ${new Date().getFullYear()}.</p></div>
            <a class="btn btn-ghost btn-sm" href="#/prestasi">Rekap lengkap <i class="bi bi-arrow-right"></i></a></div>
          <div class="dash-grid">
            <div class="card span-4"><div class="card-title"><h3>Perolehan Medali</h3></div><div class="medal-tiles" id="medali"><div class="skel skel-block" style="grid-column:span 3"></div></div></div>
            <div class="card span-4"><div class="card-title"><h3>Top 5 SD Berprestasi</h3><span class="badge b-slate">Skor poin</span></div><div class="rank-list" id="topSd"><div class="skel skel-block"></div></div></div>
            <div class="card span-4"><div class="card-title"><h3>Sorotan Atlet Muda</h3></div><div class="rank-list" id="sorotan"><div class="skel skel-block"></div></div></div>
          </div>
        </section>

        <section class="section" aria-labelledby="hLomba">
          <div class="section-head"><div><span class="label-sm eyebrow">Kejuaraan Resmi</span><h2 id="hLomba">Pusat Seleksi & Turnamen</h2>
            <p>Pendaftaran kontingen sekolah dilakukan oleh guru pendamping melalui portal anggota.</p></div></div>
          <div class="grid-3" id="lomba">${skeletonCards(3, 90)}</div>
        </section>

        <div class="cta-band">
          <div><span class="badge b-teal">Komunitas Resmi Guru Olahraga SD</span>
            <h2 class="h-xl" style="margin-top:14px">Siap Bergabung dengan KKG PJOK Tegal Timur?</h2>
            <p>Dapatkan akses agenda pelatihan, modul ajar, pendaftaran lomba siswa, dan administrasi iuran dalam satu portal.</p></div>
          <div style="display:grid;gap:10px;min-width:240px">
            <a class="btn btn-amber" href="#/daftar"><i class="bi bi-person-plus"></i> Daftar Guru Sekarang</a>
            <a class="btn btn-white-outline" href="#/kontak"><i class="bi bi-chat-dots"></i> Hubungi Sekretariat</a></div>
        </div>
      </div>`);

    if (org.nomor_sk) $('#hSk').textContent = 'SK ' + org.nomor_sk;

    // Muat semua bagian paralel (satu render per bagian, tanpa menunggu bagian lain)
    Data.statPublik().then((s) => {
      $('#hAgt').textContent = fmt.num(s.anggota_aktif); $('#hPres').textContent = fmt.num(s.prestasi);
      const item = [['bi-people-fill', s.anggota_aktif, 'Anggota Guru PJOK Aktif', ''], ['bi-mortarboard-fill', s.sekolah, 'Sekolah Dasar Binaan', 'navy'],
        ['bi-clipboard-check', s.program_kerja, 'Program Kerja Tahun Ini', ''], ['bi-trophy-fill', s.prestasi, 'Prestasi Lomba Siswa', 'amber']];
      $('#stats').innerHTML = item.map(([ic, n, l, c]) => `<div class="card stat-card"><div><div class="num">${fmt.num(n)}</div><div class="lbl">${l}</div></div><span class="icon-tile ${c}"><i class="bi ${ic}"></i></span></div>`).join('');
    }).catch(gagal('#stats'));

    Data.kegiatanMendatang(3).then((rows) => {
      $('#agenda').innerHTML = rows.length ? rows.map((k) => {
        const d = new Date(k.tanggal);
        return `<article class="card card-hover agenda-card"><div class="date-block"><small>${BLN[d.getMonth()]}</small><b>${d.getDate()}</b><small style="color:rgba(255,255,255,.7)">${d.getFullYear()}</small></div>
          <div><span class="badge b-teal">${esc(k.kategori || 'Kegiatan')}</span><h4>${esc(k.judul)}</h4>
          <div class="meta"><span><i class="bi bi-clock"></i>${fmt.jam(k.jam_mulai)}${k.jam_selesai ? '–' + fmt.jam(k.jam_selesai) : ''} WIB</span><span><i class="bi bi-geo-alt"></i>${esc(k.lokasi || '-')}</span></div></div></article>`;
      }).join('') : `<div class="card" style="grid-column:1/-1">${emptyState('Belum ada agenda terdekat', 'Agenda baru akan tampil di sini setelah dipublikasikan pengurus.', 'bi-calendar2-week')}</div>`;
    }).catch(gagal('#agenda'));

    Data.beritaTerbaru(3).then((rows) => {
      const ikon = { Kurikulum: 'bi-journal-text', Prestasi: 'bi-trophy', Organisasi: 'bi-people' };
      $('#berita').innerHTML = rows.length ? rows.map((b) => `<a class="card card-hover news-card" href="#/berita/${esc(b.slug || b.id)}">
          <div class="news-cover">${b.gambar_url ? `<img src="${esc(b.gambar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<i class="bi ${ikon[b.kategori] || 'bi-newspaper'}"></i>`}</div>
          <div class="body"><div class="meta"><span class="badge b-navy">${esc(b.kategori || 'Berita')}</span><span><i class="bi bi-calendar3"></i>${fmt.tglPendek(b.tanggal_terbit)}</span></div>
          <h4>${esc(b.judul)}</h4><p>${esc(b.ringkasan || '')}</p><span class="more">BACA SELENGKAPNYA →</span></div></a>`).join('')
        : `<div class="card" style="grid-column:1/-1">${emptyState('Belum ada berita', 'Berita yang sudah terbit akan tampil di sini.', 'bi-newspaper')}</div>`;
    }).catch(gagal('#berita'));

    Data.prestasiSemua().then((rows) => {
      const th = new Date().getFullYear();
      const tahunIni = rows.filter((r) => r.tahun === th);
      const n = (p) => tahunIni.filter((r) => r.peringkat === p).length;
      const tiles = [['juara_1', 'gold', 'bi-trophy-fill', 'Medali Emas'], ['juara_2', 'silver', 'bi-award-fill', 'Medali Perak'], ['juara_3', 'bronze', 'bi-award-fill', 'Medali Perunggu']];
      const harapan = n('harapan_1') + n('harapan_2') + n('harapan_3');
      $('#medali').innerHTML = tiles.map(([p, c, ic, l]) => `<div class="medal-tile b-${c}"><i class="bi ${ic}"></i><b>${n(p)}</b><small>${l}</small></div>`).join('')
        + `<div class="medal-tile b-teal" style="grid-column:span 3;display:flex;justify-content:space-between;align-items:center;text-align:left"><div><small>Juara Harapan 1–3</small><b>${harapan}</b></div><i class="bi bi-star-fill" style="font-size:28px"></i></div>`;
      const poin = { juara_1: 5, juara_2: 4, juara_3: 3 };
      const agg = {};
      tahunIni.forEach((r) => { agg[r.sekolah] = (agg[r.sekolah] || 0) + (poin[r.peringkat] || 1); });
      const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const maks = top.length ? top[0][1] : 1;
      $('#topSd').innerHTML = top.length ? top.map(([s, p], i) => `<div class="rank-row"><span class="rank-no">${i + 1}</span>
          <div><div style="font-weight:600;font-size:14px">${esc(s)}</div><div class="progress ${i === 0 ? 'amber' : ''}" style="margin-top:6px"><span style="width:${Math.round(p / maks * 100)}%"></span></div></div>
          <b class="tabnum" style="font-size:13px">${p} poin</b></div>`).join('')
        : emptyState('Belum ada data', 'Peringkat muncul setelah hasil lomba disahkan.', 'bi-bar-chart');
    }).catch(gagal('#medali'));

    Data.prestasiTerbaru(4).then((rows) => {
      $('#sorotan').innerHTML = rows.length ? rows.map((r) => {
        const pk = PERINGKAT[r.peringkat] || {};
        return `<div style="display:flex;gap:12px;align-items:flex-start">${avatar(r.nama_siswa, null)}
          <div style="min-width:0"><span class="badge ${pk.cls}"><i class="bi ${pk.icon}"></i>${pk.label}</span>
          <div style="font-weight:700;margin-top:4px">${esc(r.nama_siswa)}</div>
          <div class="body-sm muted">${esc(r.cabang || '')} · ${esc(r.sekolah)}</div></div></div>`;
      }).join('') : emptyState('Belum ada prestasi', 'Prestasi yang disahkan akan tampil di sini.', 'bi-trophy');
    }).catch(gagal('#sorotan'));

    Data.lombaAktif(3).then((rows) => {
      const warna = { O2SN: 'b-navy', POPDA: 'b-teal', 'Pekan Seni': 'b-amber' };
      $('#lomba').innerHTML = rows.length ? rows.map((l) => `<a class="card card-hover" href="#/lomba" style="color:inherit;text-decoration:none">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="badge ${warna[l.jenis] || 'b-slate'}">${esc(l.jenis)} ${new Date(l.tanggal || Date.now()).getFullYear()}</span>
          <span class="badge b-teal"><span class="dot pulse"></span>Pendaftaran Dibuka</span></div>
          <h4 style="font-size:18px;font-weight:700;margin:12px 0 6px">${esc(l.nama)}</h4>
          <div class="meta"><span><i class="bi bi-flag"></i>${esc(l.cabang || '-')}</span><span><i class="bi bi-geo-alt"></i>${esc(l.lokasi || '-')}</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
            <span class="body-sm muted">Batas daftar</span><b style="color:var(--amber-hover)">${fmt.tglPendek(l.batas_daftar || l.tanggal)}</b></div></a>`).join('')
        : `<div class="card" style="grid-column:1/-1">${emptyState('Belum ada lomba dibuka', 'Jadwal seleksi akan diumumkan di sini.', 'bi-flag')}</div>`;
    }).catch(gagal('#lomba'));
  }

  function gagal(sel) {
    return (e) => { const el = $(sel); if (el) el.innerHTML = `<div class="alert error" style="grid-column:1/-1"><i class="bi bi-wifi-off"></i><div>Gagal memuat data: ${esc(e.message)}</div></div>`; };
  }

  // ------------------------------------------------------------------
  // PROFIL & STRUKTUR PENGURUS
  // ------------------------------------------------------------------
  async function profil() {
    const org = await shell('profil', `
      <section class="page-band"><div class="container"><div class="crumb"><a href="#/">Beranda</a> / Profil</div>
        <h1 class="h-xl">Profil Kelompok Kerja Guru PJOK</h1><p id="pTentang"></p></div></section>
      <div class="container">
        <div class="split-2" style="margin-top:32px">
          <div class="card" style="background:var(--navy);color:#fff;border:0"><span class="label-sm" style="color:var(--teal)">Visi Organisasi</span>
            <p id="pVisi" style="font-size:22px;font-weight:700;line-height:1.45;margin-top:14px"></p></div>
          <div class="card"><div class="card-title"><h3>Misi Strategis</h3><span class="badge b-slate" id="pPeriode"></span></div><ol id="pMisi" style="margin:0;padding:0;list-style:none;display:grid;gap:12px"></ol></div>
        </div>
        <section class="section" id="struktur"><div class="section-head"><div><span class="label-sm eyebrow">Tata Kelola</span><h2>Struktur Kepengurusan</h2>
          <p>Susunan pengurus KKG PJOK Tegal Timur periode berjalan.</p></div></div>
          <div class="org" id="org">${skeletonCards(1, 140)}</div></section>
        <section class="section"><div class="card"><div class="card-title"><h3>Data Administrasi & Ketetapan</h3></div>
          <div class="grid-2" id="pAdm"></div></div></section>
      </div>`);
    $('#pTentang').textContent = org.tentang || '';
    $('#pVisi').textContent = '“' + (org.visi || '-') + '”';
    $('#pPeriode').textContent = 'Periode ' + (org.periode_pengurus || '');
    const misi = Array.isArray(org.misi) ? org.misi : [];
    $('#pMisi').innerHTML = misi.map((m, i) => `<li style="display:flex;gap:12px;align-items:flex-start"><span class="rank-no" style="background:var(--amber);color:var(--ink-on-amber);border:0;flex:none">${String(i + 1).padStart(2, '0')}</span><span style="padding-top:3px">${esc(m)}</span></li>`).join('');
    $('#pAdm').innerHTML = [['Nama Resmi', org.nama], ['Nomor SK', org.nomor_sk], ['Instansi Pembina', org.instansi_pembina], ['Sekretariat', org.alamat], ['Email', org.email], ['Telepon', org.telepon]]
      .map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)"><span class="muted body-sm">${k}</span><b style="text-align:right">${esc(v || '-')}</b></div>`).join('');

    try {
      const rows = await Data.pengurusPublik();
      if (!rows.length) { $('#org').innerHTML = `<div class="card">${emptyState('Struktur belum diisi', 'Sekretaris dapat mengisi struktur pengurus dari portal.', 'bi-diagram-3')}</div>`; return; }
      const kartu = (p, top) => `<div class="card org-card ${top ? 'top' : ''}">${avatar(p.nama, p.foto_url, 'lg ring')}
          <span class="badge ${top ? 'b-solid-navy' : 'b-navy'}">${esc(p.jabatan)}</span><h4 style="margin-top:10px">${esc(p.nama)}</h4><div class="body-sm muted">${esc(p.sekolah || '')}</div></div>`;
      const [ketua, ...lain] = rows;
      const wakil = lain.filter((p) => /wakil/i.test(p.jabatan));
      const sisa = lain.filter((p) => !/wakil/i.test(p.jabatan));
      $('#org').innerHTML = `<div class="org-row">${kartu(ketua, true)}</div>${wakil.length ? `<div class="org-row">${wakil.map((p) => kartu(p)).join('')}</div>` : ''}<div class="org-row">${sisa.map((p) => kartu(p)).join('')}</div>`;
      if (location.hash.includes('#struktur')) $('#struktur').scrollIntoView();
    } catch (e) { gagal('#org')(e); }
  }

  // ------------------------------------------------------------------
  // KONTAK
  // ------------------------------------------------------------------
  async function kontak() {
    const org = await shell('kontak', `
      <section class="page-band"><div class="container"><div class="crumb"><a href="#/">Beranda</a> / Kontak</div><h1 class="h-xl">Sekretariat KKG PJOK</h1>
        <p>Pusat koordinasi, layanan administrasi, dan informasi kegiatan.</p></div></section>
      <div class="container"><div class="split-2" style="margin-top:32px"><div class="card" id="kInfo"></div>
        <div class="card" style="background:var(--navy);color:#fff;border:0;display:flex;flex-direction:column;gap:14px;justify-content:center">
          <h2 class="h-lg">Ingin bergabung?</h2><p style="color:rgba(255,255,255,.8)">Guru PJOK SD di wilayah Tegal Timur dapat mendaftar secara daring. Pengurus akan memverifikasi data Anda.</p>
          <div><a class="btn btn-amber" href="#/daftar"><i class="bi bi-person-plus"></i> Daftar Menjadi Anggota</a></div></div></div></div>`);
    $('#kInfo').innerHTML = [['bi-geo-alt-fill', 'Alamat Sekretariat', org.alamat], ['bi-envelope-fill', 'Email', org.email], ['bi-telephone-fill', 'Telepon / WhatsApp', org.telepon], ['bi-clock-fill', 'Waktu Layanan', 'Senin–Sabtu, 07.30–14.00 WIB']]
      .map(([ic, l, v]) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--border)"><span class="icon-tile"><i class="bi ${ic}"></i></span><div><div class="label-sm muted">${l}</div><b>${esc(v || '-')}</b></div></div>`).join('');
  }

  // ------------------------------------------------------------------
  // HALAMAN PUBLIK TAHAP BERIKUTNYA (Batch 5)
  // ------------------------------------------------------------------
  async function segera(key, judul) {
    await shell(key, `<section class="page-band"><div class="container"><div class="crumb"><a href="#/">Beranda</a> / ${esc(judul)}</div><h1 class="h-xl">${esc(judul)}</h1></div></section>
      <div class="container" style="margin-top:32px"><div class="card">${emptyState('Halaman sedang disiapkan', 'Bagian ini dibangun pada tahap berikutnya. Sementara itu, ringkasannya tersedia di Beranda.', 'bi-tools', '<a class="btn btn-primary" href="#/">Kembali ke Beranda</a>')}</div></div>`);
  }

  // ------------------------------------------------------------------
  // DAFTAR ANGGOTA
  // ------------------------------------------------------------------
  async function daftar() {
    await shell('', `<div class="container" style="padding:40px 16px 0;max-width:760px">
      <div class="card" style="border-top:3px solid var(--teal);padding:32px" id="dfCard">
        <span class="label-sm muted">Formulir Resmi</span>
        <h1 class="h-lg" style="margin:6px 0 14px">Formulir Pendaftaran Anggota KKG</h1>
        <div class="alert info" style="margin-bottom:24px"><i class="bi bi-info-circle"></i><div>Gunakan <b>email Google aktif</b> yang akan dipakai untuk masuk ke sistem. Pendaftaran ditinjau Ketua/Sekretaris sebelum akun diaktifkan Admin IT.</div></div>
        <form id="dfForm" novalidate>
          <div class="field"><label for="nama">Nama Lengkap Beserta Gelar <span class="req">*</span></label>
            <input class="input" id="nama" name="nama" placeholder="Contoh: Budi Santoso, S.Pd.Jas" autocomplete="name"><div class="err"></div></div>
          <div class="grid-2">
            <div class="field"><label for="nip">NIP (18 digit) <span class="req">*</span></label>
              <input class="input tabnum" id="nip" name="nip" inputmode="numeric" maxlength="20" placeholder="198705122010011008"><div class="err"></div>
              <span class="help">Non-PNS dapat mengisi NUPTK.</span></div>
            <div class="field"><label for="email">Email Google <span class="req">*</span></label>
              <input class="input" id="email" name="email" type="email" placeholder="nama.anda@gmail.com" autocomplete="email"><div class="err"></div></div>
          </div>
          <div class="grid-2">
            <div class="field"><label for="sekolah">Sekolah Induk <span class="req">*</span></label>
              <select class="select" id="sekolah" name="sekolah"><option value="">Memuat daftar sekolah…</option></select><div class="err"></div></div>
            <div class="field"><label for="no_hp">No. WhatsApp <span class="muted">(opsional)</span></label>
              <input class="input" id="no_hp" name="no_hp" inputmode="tel" placeholder="0812-3456-7890"><div class="err"></div>
              <span class="help">Untuk pengingat & koordinasi gugus.</span></div>
          </div>
          <div class="field"><span class="label">Foto Profil Formal <span class="req">*</span></span>
            <label class="dropzone" id="dz" for="foto"><span class="preview" id="dzPrev"><i class="bi bi-camera"></i></span>
              <span><b>Pilih foto</b> atau seret ke area ini<br><span class="help">JPG/PNG rasio 1:1, otomatis dikompres. Maks 2 MB.</span></span></label>
            <input type="file" id="foto" name="foto" accept="image/jpeg,image/png" class="sr-only"><div class="err"></div></div>
          <div class="field"><label class="check"><input type="checkbox" name="setuju"> <span>Saya menyatakan data di atas benar dan bersedia mematuhi AD/ART serta ketentuan organisasi KKG PJOK Tegal Timur.</span></label><div class="err"></div></div>
          <button class="btn btn-primary btn-block" type="submit" id="dfBtn" style="min-height:52px"><i class="bi bi-send"></i> Kirim Pendaftaran Anggota</button>
          <p class="body-sm muted" style="text-align:center;margin-top:14px">Sudah memiliki akun aktif? <a href="#/masuk">Masuk dengan Google</a></p>
        </form>
      </div></div>`);

    const form = $('#dfForm');
    let foto = null;
    Data.sekolah().then((list) => {
      form.sekolah.innerHTML = '<option value="">Pilih sekolah asal tugas…</option>' + list.map((s) => `<option>${esc(s.nama)}</option>`).join('');
    }).catch(() => { form.sekolah.innerHTML = '<option value="">Gagal memuat — muat ulang halaman</option>'; });

    const pilihFoto = async (file) => {
      if (!file) return;
      try {
        foto = await kompresGambar(file, 800, 0.85);
        if (foto.ukuran > 2 * 1024 * 1024) throw new Error('Foto melebihi 2 MB setelah dikompres.');
        $('#dzPrev').innerHTML = `<img src="${foto.dataUrl}" alt="Pratinjau foto">`;
        form.foto.closest('.field').classList.remove('invalid');
      } catch (e) { foto = null; toast(e.message, 'error'); }
    };
    form.foto.onchange = () => pilihFoto(form.foto.files[0]);
    const dz = $('#dz');
    ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', (e) => pilihFoto(e.dataTransfer.files[0]));
    form.nip.addEventListener('input', () => { form.nip.value = form.nip.value.replace(/\D/g, ''); });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const ok = validasi(form, {
        nama: (v) => v.length < 3 ? 'Nama lengkap wajib diisi.' : '',
        nip: (v) => !/^\d{8,20}$/.test(v) ? 'NIP/NUPTK berupa angka 8–20 digit.' : '',
        email: (v) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Format email tidak valid.' : '',
        sekolah: (v) => !v ? 'Pilih sekolah induk.' : '',
        no_hp: (v) => v && !/^[0-9+\-\s]{9,16}$/.test(v) ? 'Nomor HP tidak valid.' : '',
        foto: () => !foto ? 'Foto profil wajib diunggah.' : '',
        setuju: (v) => !v ? 'Centang pernyataan untuk melanjutkan.' : ''
      });
      if (!ok) return;
      const btn = $('#dfBtn');
      btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Mengirim…';
      try {
        const up = await Data.uploadPendaftaran({ base64: foto.base64, mime: foto.mime, nama: foto.nama, dataUrl: foto.dataUrl });
        await Data.daftar({ nama: form.nama.value.trim(), nip: form.nip.value.trim(), email: form.email.value.trim().toLowerCase(),
          sekolah: form.sekolah.value, no_hp: form.no_hp.value.trim() || null, foto_url: up && up.url && !String(up.url).startsWith('data:') ? up.url : null });
        $('#dfCard').innerHTML = `<div style="text-align:center;padding:24px 0" class="fade-in">
          <div class="ill" style="width:84px;height:84px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:var(--b-green-bg);color:var(--b-green-tx);font-size:40px"><i class="bi bi-check-lg"></i></div>
          <h2 class="h-lg">Pendaftaran Terkirim</h2><p class="muted" style="margin-top:8px">Status Anda: <span class="badge b-amber">Menunggu Verifikasi</span></p>
          <div class="stepper"><span class="st done"><i>✓</i>Diajukan</span><span class="sep"></span><span class="st"><i>2</i>Diverifikasi Ketua/Sekretaris</span><span class="sep"></span><span class="st"><i>3</i>Akun Diaktifkan Admin IT</span></div>
          <p class="body-sm muted" style="margin-top:20px">Pemberitahuan dikirim ke email Anda setelah akun aktif.</p>
          <a class="btn btn-primary" style="margin-top:20px" href="#/">Kembali ke Beranda</a></div>`;
        window.scrollTo(0, 0);
      } catch (err) {
        toast(err.message, 'error', 6000);
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-send"></i> Kirim Pendaftaran Anggota';
      }
    };
  }

  // ------------------------------------------------------------------
  // MASUK (Google)
  // ------------------------------------------------------------------
  async function masuk() {
    if (Auth.profil) return Router.go('/app/dashboard');
    const org = await Data.org();
    $('#root').innerHTML = `
      <header class="pub-nav"><div class="container">${brand(org)}<div class="pub-actions" style="margin-left:auto">
        <button class="icon-btn" data-act="theme" aria-label="Ganti tema"><i data-theme-icon class="bi"></i></button>
        <a class="btn btn-ghost btn-sm" href="#/" aria-label="Kembali ke Beranda"><i class="bi bi-arrow-left"></i> <span class="lbl">Beranda</span></a></div></div></header>
      <div class="auth-wrap">
        <div class="auth-side"><span class="hero-chip" style="align-self:flex-start"><i class="bi bi-shield-lock"></i> Portal Internal</span>
          <h1 class="h-xl">Sistem Administrasi Digital ${esc(org.singkatan)}</h1>
          <p>Kelola keanggotaan, agenda, persuratan, iuran, lomba, dan laporan organisasi dalam satu portal yang aman.</p>
          <div style="display:grid;gap:12px;margin-top:8px">${[['bi-google', 'Login aman dengan akun Google'], ['bi-person-badge', 'Menu sesuai peran pengurus & anggota'], ['bi-shield-check', 'Data dilindungi hak akses berlapis']]
            .map(([i, t]) => `<div style="display:flex;gap:12px;align-items:center"><span class="icon-tile" style="background:rgba(255,255,255,.12);color:#fff"><i class="bi ${i}"></i></span>${t}</div>`).join('')}</div></div>
        <div class="auth-main"><div class="card auth-card fade-in">
          <div style="text-align:center"><span class="brand-logo" style="margin:0 auto 14px;width:56px;height:56px;font-size:26px"><i class="bi bi-trophy"></i></span>
            <h2 class="h-md">Masuk ke Sistem KKG</h2><p class="muted body-sm" style="margin-top:6px">Gunakan akun Google yang sudah terdaftar dan diaktifkan Admin IT.</p></div>
          ${Auth.galat ? `<div class="alert error" style="margin-top:20px"><i class="bi bi-exclamation-octagon"></i><div>${esc(Auth.galat)}</div></div>` : ''}
          <button class="btn btn-google btn-block" id="gBtn" style="margin-top:24px">
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Masuk dengan Google</button>
          ${DEMO ? `<div class="alert warning" style="margin-top:20px"><i class="bi bi-cone-striped"></i><div><b>Mode demo</b> — Supabase belum dikonfigurasi. Pilih peran untuk mencoba tampilan:</div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px" id="demoRoles">
            ${Object.entries(window.K.ROLE_LABEL).map(([k, v]) => `<button class="btn btn-outline btn-sm" data-role="${k}">${v}</button>`).join('')}</div>` : ''}
          <hr style="border:0;border-top:1px solid var(--border);margin:24px 0">
          <p class="body-sm muted" style="text-align:center">Belum terdaftar? <a href="#/daftar">Daftar menjadi anggota</a></p>
        </div></div></div>`;
    Theme.apply(Theme.get());
    $('[data-act="theme"]').onclick = Theme.toggle;
    $('#gBtn').onclick = async () => {
      if (DEMO) return toast('Mode demo: pilih salah satu peran di bawah tombol.', 'warning');
      $('#gBtn').disabled = true;
      try { await Auth.loginGoogle(); } catch (e) { toast(e.message, 'error'); $('#gBtn').disabled = false; }
    };
    $$('#demoRoles [data-role]').forEach((b) => b.onclick = () => { Auth.masukDemo(b.dataset.role); Router.go('/app/dashboard'); });
  }

  window.PublicPages = { beranda, profil, kontak, daftar, masuk, segera, _shell: shell, _gagal: gagal };
})();
