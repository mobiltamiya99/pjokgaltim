/* =====================================================================
   APLIKASI INTERNAL — shell, sidebar per peran, dashboard, pengaturan,
   akun pengguna, notifikasi + bootstrap SPA
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, BLN, ROLE_LABEL, PERINGKAT, avatar, toast, modal, konfirmasi, Theme, Router, validasi, kompresGambar, debounce, emptyState } = window.K;
  const { Auth, Data, DEMO } = window.KKG;
  const C = window.APP_CONFIG || {};

  const SEMUA = ['admin_it', 'ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'anggota'];
  const PENGURUS = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara'];

  // Menu per fungsi & hak akses (PRD §3.2, §7.1). `batch` = tahap pembangunan PRD §8.2
  const MENU = [
    { grup: 'Utama', items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', peran: SEMUA },
      { id: 'persetujuan', label: 'Persetujuan', icon: 'bi-check2-square', peran: PENGURUS, badge: 'persetujuan', batch: 2 },
      { id: 'notifikasi', label: 'Notifikasi', icon: 'bi-bell', peran: SEMUA, badge: 'notif' }] },
    { grup: 'Organisasi', items: [
      { id: 'anggota', label: 'Data Anggota', icon: 'bi-people', peran: ['admin_it', ...PENGURUS], batch: 2 },
      { id: 'pengurus', label: 'Struktur Pengurus', icon: 'bi-diagram-3', peran: SEMUA, batch: 2 },
      { id: 'pendaftaran', label: 'Pendaftaran Anggota', icon: 'bi-person-plus', peran: ['admin_it', 'ketua', 'wakil_ketua', 'sekretaris'], badge: 'pendaftaran', batch: 2 }] },
    { grup: 'Kegiatan', items: [
      { id: 'program', label: 'Program Kerja', icon: 'bi-clipboard-data', peran: SEMUA, batch: 3 },
      { id: 'kegiatan', label: 'Kegiatan & Kehadiran', icon: 'bi-calendar2-check', peran: SEMUA, batch: 3 }] },
    { grup: 'Administrasi', items: [
      { id: 'surat', label: 'Surat Masuk / Keluar', icon: 'bi-envelope-paper', peran: ['ketua', 'wakil_ketua', 'sekretaris'], batch: 3 },
      { id: 'notulen', label: 'Notulen', icon: 'bi-journal-text', peran: ['ketua', 'wakil_ketua', 'sekretaris'], batch: 3 },
      { id: 'dokumen', label: 'Dokumen', icon: 'bi-folder2-open', peran: SEMUA, batch: 3 }] },
    { grup: 'Keuangan', items: [
      { id: 'kas', label: 'Buku Kas', icon: 'bi-cash-stack', peran: ['ketua', 'bendahara', 'wakil_ketua'], batch: 4 },
      { id: 'iuran', label: 'Iuran Anggota', icon: 'bi-wallet2', peran: ['ketua', 'bendahara', 'wakil_ketua'], batch: 4 },
      { id: 'tunggakan', label: 'Tunggakan', icon: 'bi-exclamation-diamond', peran: ['ketua', 'bendahara'], badge: 'tunggakan', batch: 4 },
      { id: 'iuran-saya', label: 'Iuran Saya', icon: 'bi-receipt', peran: ['anggota'], batch: 4 }] },
    { grup: 'Lomba & Prestasi', items: [
      { id: 'lomba', label: 'Jadwal Lomba', icon: 'bi-flag', peran: SEMUA, batch: 5 },
      { id: 'peserta', label: 'Peserta Lomba', icon: 'bi-person-badge', peran: SEMUA, batch: 5 },
      { id: 'prestasi', label: 'Prestasi', icon: 'bi-trophy', peran: SEMUA, batch: 5 }] },
    { grup: 'Publikasi', items: [
      { id: 'berita', label: 'Berita', icon: 'bi-newspaper', peran: ['ketua', 'wakil_ketua', 'sekretaris'], batch: 5 },
      { id: 'dokumentasi', label: 'Dokumentasi', icon: 'bi-images', peran: ['ketua', 'wakil_ketua', 'sekretaris'], batch: 5 }] },
    { grup: 'Laporan', items: [
      { id: 'laporan', label: 'Pusat Laporan', icon: 'bi-file-earmark-bar-graph', peran: ['admin_it', ...PENGURUS], batch: 6 }] },
    { grup: 'Sistem', items: [
      { id: 'akun', label: 'Akun Pengguna', icon: 'bi-person-gear', peran: ['admin_it', 'ketua'] },
      { id: 'pengaturan', label: 'Pengaturan', icon: 'bi-sliders', peran: ['admin_it', 'ketua', 'sekretaris'] },
      { id: 'log', label: 'Log Aktivitas', icon: 'bi-clock-history', peran: ['admin_it', 'ketua'], batch: 6 }] }
  ];
  const ITEM = Object.fromEntries(MENU.flatMap((g) => g.items).map((i) => [i.id, i]));
  const boleh = (id) => !!(ITEM[id] && Auth.profil && ITEM[id].peran.includes(Auth.profil.role));

  let badges = {};
  let charts = [];

  // ------------------------------------------------------------------
  // SHELL
  // ------------------------------------------------------------------
  async function shell(aktif, judul, sub = '') {
    const p = Auth.profil;
    const org = await Data.org();
    if (!$('#appShell')) {
      $('#root').innerHTML = `
        <div class="app" id="appShell">
          <aside class="sidebar" id="sidebar" aria-label="Navigasi aplikasi">
            <div class="sb-brand"><span class="brand-logo">${org.logo_url ? `<img src="${esc(org.logo_url)}" alt="">` : '<i class="bi bi-trophy"></i>'}</span>
              <div><b>${esc(org.singkatan)}</b><small>Sistem Administrasi</small></div></div>
            <nav class="sb-nav" id="sbNav"></nav>
            <div class="sb-user">
              <div class="who">${avatar(p.nama, p.anggota && p.anggota.foto_url)}<div style="min-width:0"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.nama)}</b><span class="role-pill">${ROLE_LABEL[p.role]}</span></div></div>
              <div class="row"><button data-act="profil"><i class="bi bi-person"></i> Profil</button><button class="logout" data-act="logout"><i class="bi bi-box-arrow-right"></i> Keluar</button></div>
            </div>
          </aside>
          <div class="main">
            <header class="topbar">
              <button class="icon-btn burger" data-act="burger" aria-label="Buka menu"><i class="bi bi-list"></i></button>
              <div class="title"><b id="tbTitle"></b><small id="tbSub"></small></div>
              <div class="spacer"></div>
              <div class="search-pill"><i class="bi bi-search"></i><input id="menuSearch" placeholder="Cari menu…" aria-label="Cari menu"></div>
              <button class="icon-btn" data-act="theme" aria-label="Ganti tema"><i data-theme-icon class="bi"></i></button>
              <div style="position:relative"><button class="icon-btn" data-act="bell" aria-label="Notifikasi"><i class="bi bi-bell"></i><span class="dot hidden" id="bellDot"></span></button></div>
              <a class="icon-btn" href="#/" aria-label="Lihat website publik" title="Website publik"><i class="bi bi-globe2"></i></a>
            </header>
            <main class="content" id="content"></main>
          </div>
        </div>
        ${DEMO ? `<div class="demo-bar"><i class="bi bi-cone-striped" style="color:var(--amber)"></i><span class="t">Mode demo · peran</span>
          <select id="demoRole" aria-label="Ganti peran demo">${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}" ${k === p.role ? 'selected' : ''}>${v}</option>`).join('')}</select></div>` : ''}`;

      $('[data-act="theme"]').onclick = Theme.toggle;
      $('[data-act="burger"]').onclick = () => toggleSidebar();
      $('[data-act="logout"]').onclick = logout;
      $('[data-act="profil"]').onclick = () => Router.go('/app/profil');
      $('[data-act="bell"]').onclick = (e) => { e.stopPropagation(); bellPanel(); };
      $('#menuSearch').oninput = debounce((e) => renderNav(Router.path().split('/')[2], e.target.value), 120);
      if (DEMO) $('#demoRole').onchange = (e) => { Auth.masukDemo(e.target.value); $('#appShell').remove(); Router.resolve(); };
      if (!shell.bound) {
        shell.bound = true;
        document.addEventListener('click', (e) => {
          const sb = $('#sidebar');
          if (sb && sb.classList.contains('open') && !e.target.closest('#sidebar') && !e.target.closest('[data-act="burger"]')) toggleSidebar(false);
          const np = $('#notifPanel');
          if (np && !e.target.closest('#notifPanel') && !e.target.closest('[data-act="bell"]')) np.remove();
        });
      }
      Theme.apply(Theme.get());
      muatBadge();
    }
    renderNav(aktif);
    $('#tbTitle').textContent = judul;
    $('#tbSub').textContent = sub || org.singkatan;
    document.title = judul + ' · ' + (C.APP_NAME || 'KKG PJOK');
    toggleSidebar(false);
    destroyCharts();
    $('#content').scrollTop = 0; window.scrollTo(0, 0);
    return $('#content');
  }

  function renderNav(aktif, filter = '') {
    const f = filter.trim().toLowerCase();
    $('#sbNav').innerHTML = MENU.map((g) => {
      const items = g.items.filter((i) => boleh(i.id) && (!f || i.label.toLowerCase().includes(f)));
      if (!items.length) return '';
      return `<div class="sb-group">${g.grup}</div>` + items.map((i) => {
        const n = i.badge && badges[i.badge];
        return `<a class="sb-link ${aktif === i.id ? 'active' : ''}" href="#/app/${i.id}" ${aktif === i.id ? 'aria-current="page"' : ''}>
          <i class="bi ${i.icon}"></i><span>${i.label}</span>${n ? `<span class="count">${n > 99 ? '99+' : n}</span>` : ''}</a>`;
      }).join('');
    }).join('') || '<p class="muted body-sm" style="padding:12px;color:rgba(255,255,255,.6)">Menu tidak ditemukan.</p>';
  }

  function toggleSidebar(buka) {
    const sb = $('#sidebar'); if (!sb) return;
    sb.classList.toggle('open', buka === undefined ? !sb.classList.contains('open') : buka);
  }

  async function muatBadge() {
    try {
      const d = await Data.dashboard();
      const pm = d.pengajuan_menunggu || {};
      badges = {
        persetujuan: Object.entries(pm).filter(([k]) => !['pendaftaran_anggota', 'aktivasi_akun'].includes(k)).reduce((a, [, v]) => a + Number(v || 0), 0),
        pendaftaran: Number(pm.pendaftaran_anggota || pm.aktivasi_akun || 0),
        tunggakan: d.keuangan ? Number(d.keuangan.menunggak || 0) : 0,
        notif: Number(Auth.profil.notif_belum_dibaca || 0)
      };
      const dot = $('#bellDot');
      if (dot) { dot.textContent = badges.notif; dot.classList.toggle('hidden', !badges.notif); }
      renderNav(Router.path().split('/')[2]);
    } catch (e) { /* badge tidak kritis */ }
  }

  async function logout() {
    const r = await konfirmasi({ judul: 'Keluar dari sistem?', pesan: 'Sesi Anda akan diakhiri di perangkat ini.', ok: 'Keluar' });
    if (!r.ok) return;
    await Auth.logout();
    $('#appShell') && $('#appShell').remove();
    $('.demo-bar') && $('.demo-bar').remove();
    toast('Anda telah keluar.', 'success');
    Router.go('/masuk');
  }

  async function bellPanel() {
    if ($('#notifPanel')) return $('#notifPanel').remove();
    const wrap = $('[data-act="bell"]').parentElement;
    const panel = document.createElement('div');
    panel.id = 'notifPanel'; panel.className = 'card notif-panel';
    panel.innerHTML = '<div class="skel skel-block"></div>';
    wrap.appendChild(panel);
    try {
      const rows = await Data.notifikasi();
      panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px"><b>Notifikasi</b>
          <button class="btn btn-ghost btn-sm" data-all>Tandai semua dibaca</button></div>
        ${rows.length ? rows.slice(0, 6).map(notifItem).join('') : emptyState('Tidak ada notifikasi', 'Pemberitahuan baru akan tampil di sini.', 'bi-bell-slash')}
        <a class="btn btn-ghost btn-block btn-sm" href="#/app/notifikasi" style="margin-top:6px">Lihat semua</a>`;
      ikatNotif(panel);
    } catch (e) { panel.innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i>${esc(e.message)}</div>`; }
  }
  const notifItem = (n) => `<div class="notif-item ${n.dibaca ? '' : 'unread'}" data-id="${esc(n.id)}" data-link="${esc(n.tautan || '')}" tabindex="0" role="button">
      ${n.dibaca ? '<span style="width:8px;flex:none"></span>' : '<span class="dot"></span>'}<div><b style="font-size:14px">${esc(n.judul)}</b>
      <div class="body-sm muted">${esc(n.isi || '')}</div><small class="muted">${fmt.relatif(n.dibuat_pada)}</small></div></div>`;
  function ikatNotif(root) {
    $$('.notif-item', root).forEach((el) => el.onclick = async () => {
      await Data.tandaiDibaca(el.dataset.id).catch(() => {});
      Auth.profil.notif_belum_dibaca = Math.max(0, (Auth.profil.notif_belum_dibaca || 1) - (el.classList.contains('unread') ? 1 : 0));
      if (el.dataset.link) location.hash = el.dataset.link.replace(/^#/, '');
      muatBadge();
    });
    const all = root.querySelector('[data-all]');
    if (all) all.onclick = async () => { await Data.tandaiDibaca(); Auth.profil.notif_belum_dibaca = 0; $$('.notif-item', root).forEach((x) => x.classList.remove('unread')); muatBadge(); toast('Semua notifikasi ditandai dibaca.', 'success'); };
  }

  // ------------------------------------------------------------------
  // CHART HELPER (Chart.js, warna dari token desain, ikut tema)
  // ------------------------------------------------------------------
  function warna() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      dark, navy: dark ? '#6E95D6' : '#173D72', teal: dark ? '#2CCFC6' : '#16B8B0', amber: dark ? '#FBBF24' : '#F59E0B',
      navy2: '#2F5D9E', slate: dark ? '#475569' : '#CBD5E1', red: '#DC2626', green: '#16A34A',
      grid: dark ? 'rgba(148,163,184,.14)' : 'rgba(15,30,54,.07)', text: dark ? '#94A3B8' : '#5B6B82',
      gold: '#E9B949', silver: '#A8B0BC', bronze: '#D98A4E'
    };
  }
  function chart(canvasId, config) {
    const el = document.getElementById(canvasId);
    if (!el || !window.Chart) return;
    const w = warna();
    Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
    Chart.defaults.color = w.text;
    const base = {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', padding: 14 } },
        tooltip: { backgroundColor: '#0F1E36', titleColor: '#fff', bodyColor: '#E6EDF7', padding: 10, cornerRadius: 8, displayColors: true }
      }
    };
    if (config.type !== 'doughnut') {
      base.scales = {
        x: { grid: { display: false }, ticks: { color: w.text }, border: { display: false } },
        y: { grid: { color: w.grid }, ticks: { color: w.text }, border: { display: false }, beginAtZero: true }
      };
    }
    config.options = deepMerge(base, config.options || {});
    charts.push(new Chart(el, config));
  }
  function deepMerge(a, b) {
    const o = Array.isArray(a) ? [...a] : { ...a };
    Object.entries(b).forEach(([k, v]) => { o[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? deepMerge(a[k], v) : v; });
    return o;
  }
  function destroyCharts() { charts.forEach((c) => c.destroy()); charts = []; }
  document.addEventListener('themechange', () => { if (Router.path() === '/app/dashboard' && $('#appShell')) dashboard(); });

  // ------------------------------------------------------------------
  // DASHBOARD
  // ------------------------------------------------------------------
  async function dashboard() {
    const el = await shell('dashboard', 'Dashboard', 'Ringkasan organisasi');
    const p = Auth.profil;
    const th = new Date().getFullYear();
    el.innerHTML = `
      <div class="welcome">
        <div><span class="badge b-navy"><i class="bi bi-shield-check"></i> ${ROLE_LABEL[p.role]}</span>
          <h1 style="margin-top:10px">Selamat datang, ${esc(p.nama.split(',')[0])}</h1>
          <p class="muted">Ikhtisar metrik keanggotaan, keuangan, kegiatan, dan prestasi tahun ${th}.</p></div>
        <div style="display:flex;gap:10px;align-items:center">
          <select class="select" id="dTahun" style="width:auto" aria-label="Tahun">${[th, th - 1, th - 2].map((y) => `<option>${y}</option>`).join('')}</select>
          <button class="btn btn-outline" id="dRefresh"><i class="bi bi-arrow-clockwise"></i> Muat ulang</button></div>
      </div>
      <div class="kpi-grid" id="kpi">${Array.from({ length: 4 }, () => '<div class="skel" style="height:150px;border-radius:16px"></div>').join('')}</div>
      <div class="dash-grid" id="dGrid">${Array.from({ length: 4 }, () => '<div class="card span-6"><div class="skel skel-line" style="width:40%"></div><div class="skel" style="height:220px;margin-top:14px"></div></div>').join('')}</div>`;
    const muat = async (paksa) => {
      if (paksa) Data.clearDashCache();
      try { renderDashboard(await Data.dashboard(Number($('#dTahun').value))); }
      catch (e) { $('#dGrid').innerHTML = `<div class="alert error span-12"><i class="bi bi-x-circle"></i><div>Gagal memuat dashboard: ${esc(e.message)}</div></div>`; $('#kpi').innerHTML = ''; }
    };
    $('#dTahun').onchange = () => muat(true);
    $('#dRefresh').onclick = () => { muat(true); toast('Data dashboard diperbarui.', 'success', 2000); };
    muat(false);
  }

  function renderDashboard(d) {
    destroyCharts();
    const w = warna();
    const role = d.role;
    const pm = d.pengajuan_menunggu || {};
    const totalPm = Object.values(pm).reduce((a, b) => a + Number(b || 0), 0);
    const bulanIni = new Date().getMonth();
    const k = d.keuangan;
    const agt = d.anggota;
    const medTotal = d.medali ? Object.values(d.medali).reduce((a, b) => a + Number(b), 0) : 0;

    // ---- KPI per peran ----
    const kpi = (cls, ic, lbl, val, unit, sub) => `<div class="kpi ${cls}"><span class="ic"><i class="bi ${ic}"></i></span><div class="lbl">${lbl}</div>
      <div class="val">${val}${unit ? `<small>${unit}</small>` : ''}</div><div class="sub">${sub}</div></div>`;
    const iuranPersen = k ? (k.iuran_persen[bulanIni] || {}).persen || 0 : 0;
    const set = {
      ketua: [
        kpi('navy', 'bi-people-fill', 'Total Anggota Aktif', fmt.num(agt.aktif), 'guru', `+${agt.baru_bulan_ini} bulan ini · ${agt.nonaktif} nonaktif`),
        kpi('teal', 'bi-bank', 'Saldo Kas KKG', fmt.rpSingkat(k.saldo), '', `Masuk ${fmt.rpSingkat(k.masuk_bulan_ini)} · Keluar ${fmt.rpSingkat(k.keluar_bulan_ini)}`),
        kpi('amber', 'bi-graph-up-arrow', 'Kepatuhan Iuran', fmt.num(iuranPersen), '%', `Lunas ${k.lunas_bulan_ini} · Menunggak ${k.menunggak}`),
        kpi('deep', 'bi-hourglass-split', 'Persetujuan Pending', totalPm, 'berkas', 'Menunggu keputusan Anda')],
      bendahara: [
        kpi('teal', 'bi-bank', 'Saldo Kas', fmt.rpSingkat(k.saldo), '', 'Seluruh periode'),
        kpi('navy', 'bi-arrow-down-circle', 'Pemasukan Bulan Ini', fmt.rpSingkat(k.masuk_bulan_ini), '', 'Iuran & sumbangan'),
        kpi('deep', 'bi-arrow-up-circle', 'Pengeluaran Bulan Ini', fmt.rpSingkat(k.keluar_bulan_ini), '', 'Operasional & kegiatan'),
        kpi('amber', 'bi-exclamation-diamond', 'Anggota Menunggak', fmt.num(k.menunggak), 'guru', `Total ${fmt.rp(k.total_tunggakan)}`)],
      wakil_ketua: [
        kpi('navy', 'bi-people-fill', 'Anggota Aktif', fmt.num(agt.aktif), 'guru', `+${agt.baru_bulan_ini} bulan ini`),
        kpi('teal', 'bi-clipboard-data', 'Program Berjalan', (d.program || []).filter((x) => x.status !== 'selesai').length, 'program', `${(d.program || []).length} program tahun ini`),
        kpi('deep', 'bi-calendar2-check', 'Kegiatan Tahun Ini', (d.kegiatan || []).length, 'kegiatan', 'Termasuk yang sudah selesai'),
        kpi('amber', 'bi-wallet2', 'Ringkasan Saldo', d.keuangan_ringkas ? fmt.rpSingkat(d.keuangan_ringkas.saldo) : '-', '', `Iuran bulan ini ${d.keuangan_ringkas ? d.keuangan_ringkas.iuran_persen_bulan_ini : 0}%`)],
      sekretaris: [
        kpi('navy', 'bi-people-fill', 'Anggota Aktif', fmt.num(agt.aktif), 'guru', `${agt.negeri} SD Negeri · ${agt.swasta} Swasta`),
        kpi('amber', 'bi-person-plus', 'Pendaftar Menunggu', fmt.num(pm.pendaftaran_anggota || 0), 'orang', 'Perlu verifikasi'),
        kpi('deep', 'bi-check2-square', 'Pengajuan Pending', totalPm - (pm.pendaftaran_anggota || 0), 'berkas', 'Data, lomba, prestasi'),
        kpi('teal', 'bi-trophy-fill', 'Prestasi Tahun Ini', medTotal, 'medali', `${(d.medali || {}).juara_1 || 0} emas`)],
      admin_it: [
        kpi('navy', 'bi-people-fill', 'Anggota Aktif', fmt.num(agt.aktif), 'guru', `${agt.nonaktif} nonaktif`),
        kpi('amber', 'bi-person-check', 'Menunggu Aktivasi', fmt.num(pm.aktivasi_akun || 0), 'akun', 'Sudah disetujui pengurus'),
        kpi('teal', 'bi-person-plus', 'Anggota Baru', fmt.num(agt.baru_bulan_ini), 'bulan ini', 'Bergabung bulan berjalan'),
        kpi('deep', 'bi-activity', 'Aktivitas Terbaru', (d.aktivitas || []).length, 'catatan', 'Lihat linimasa di bawah')],
      anggota: (() => {
        const is = d.iuran_saya || { lunas: [], menunggu: [] };
        const sampai = is.lunas.length ? BLN[Math.max(...is.lunas) - 1] : '—';
        const tunggak = Math.max(0, bulanIni + 1 - is.lunas.length - is.menunggu.length);
        return [
          kpi(tunggak ? 'amber' : 'teal', 'bi-receipt', 'Status Iuran Saya', tunggak ? tunggak : 'Lunas', tunggak ? 'bln tertunggak' : '', `Lunas s.d. ${sampai} · ${is.menunggu.length} menunggu verifikasi`),
          kpi('navy', 'bi-calendar2-check', 'Kegiatan Diikuti', fmt.num((d.kehadiran_saya || {}).terdaftar), 'kegiatan', `${(d.kehadiran_saya || {}).hadir || 0} kali hadir`),
          kpi('deep', 'bi-hourglass-split', 'Pengajuan Saya', totalPm, 'menunggu', 'Perubahan data, lomba, prestasi'),
          kpi('teal', 'bi-trophy-fill', 'Medali KKG Tahun Ini', medTotal, 'medali', 'Seluruh kontingen Tegal Timur')];
      })()
    };
    $('#kpi').innerHTML = (set[role] || []).join('');

    // ---- Kartu grafik (hanya yang tersedia untuk peran ini) ----
    const kartu = [];
    if (agt) kartu.push(['span-4', 'Status Keaktifan Anggota', `<span class="badge b-slate">Total ${agt.aktif + agt.nonaktif}</span>`, '<div class="chart-box sm"><canvas id="cAktif"></canvas></div>']);
    if (d.pertumbuhan) kartu.push(['span-8', 'Pertumbuhan Anggota', '<span class="badge b-teal">12 bulan</span>', '<div class="chart-box sm"><canvas id="cTumbuh"></canvas></div>']);
    if (k) {
      kartu.push(['span-7', 'Pemasukan vs Pengeluaran Kas', '', '<div class="chart-box"><canvas id="cKas"></canvas></div>']);
      kartu.push(['span-5', 'Pembayaran Iuran Bulanan', '<span class="badge b-amber">Target ≥ 85%</span>', '<div class="chart-box"><canvas id="cIuran"></canvas></div>']);
      kartu.push(['span-4', 'Status Iuran Bulan Ini', '', '<div class="chart-box sm"><canvas id="cLunas"></canvas></div>']);
    }
    if (d.iuran_saya) kartu.push(['span-4', `Iuran Saya ${d.tahun}`, `<span class="badge b-slate">${fmt.rp(d.iuran_saya.nominal)}/bln</span>`, `<div id="gridIuran" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"></div>`]);
    if (d.kegiatan) kartu.push([k ? 'span-8' : 'span-8', 'Kegiatan & Tingkat Kehadiran', '', '<div class="chart-box"><canvas id="cKeg"></canvas></div>']);
    if (d.per_sekolah) kartu.push(['span-4', 'Distribusi Anggota per Sekolah', '', '<div class="chart-box"><canvas id="cSekolah"></canvas></div>']);
    if (d.program) kartu.push(['span-4', `Progres Program Kerja ${d.tahun}`, '', `<div id="progList" class="rank-list"></div>`]);
    if (d.medali) {
      kartu.push(['span-4', 'Perolehan Juara', `<span class="badge b-gold"><i class="bi bi-trophy-fill"></i>${medTotal} total</span>`, '<div class="chart-box sm"><canvas id="cMedali"></canvas></div>']);
      kartu.push(['span-4', 'Top 5 SD Berprestasi', '<span class="badge b-slate">Skor poin</span>', '<div id="topList" class="rank-list"></div>']);
    }
    if (Object.keys(pm).length || role !== 'anggota') kartu.push(['span-4', 'Pengajuan Menunggu', totalPm ? `<span class="badge b-amber">${totalPm} total</span>` : '', '<div id="pmList" class="rank-list"></div>']);
    if (d.aktivitas) kartu.push(['span-4', 'Aktivitas Organisasi', '', '<div id="aktList" class="timeline"></div>']);

    $('#dGrid').innerHTML = kartu.map(([span, judul, extra, body]) =>
      `<section class="card ${span} fade-in"><div class="card-title"><h3>${judul}</h3>${extra}</div>${body}</section>`).join('');

    // ---- Render grafik ----
    const labelBln = BLN;
    if (agt) chart('cAktif', { type: 'doughnut', data: { labels: ['Aktif', 'Tidak aktif'], datasets: [{ data: [agt.aktif, agt.nonaktif], backgroundColor: [w.teal, w.slate], borderWidth: 0 }] },
      options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } } });
    if (d.pertumbuhan) chart('cTumbuh', { type: 'line', data: { labels: labelBln, datasets: [{ label: 'Jumlah anggota', data: d.pertumbuhan.map((x) => x.jumlah), borderColor: w.navy, backgroundColor: w.teal + '26', fill: true, tension: .35, pointRadius: 3, pointBackgroundColor: w.navy }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } } });
    if (k) {
      chart('cKas', { type: 'bar', data: { labels: labelBln, datasets: [
        { label: 'Pemasukan', data: k.kas_bulanan.map((x) => x.masuk), backgroundColor: w.teal, borderRadius: 6, maxBarThickness: 18 },
        { label: 'Pengeluaran', data: k.kas_bulanan.map((x) => x.keluar), backgroundColor: w.amber, borderRadius: 6, maxBarThickness: 18 }] },
        options: { plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt.rp(c.raw)}` } } }, scales: { y: { ticks: { callback: (v) => fmt.rpSingkat(v).replace('Rp ', '') } } } } });
      chart('cIuran', { type: 'bar', data: { labels: labelBln, datasets: [
        { label: '% lunas', data: k.iuran_persen.map((x) => x.persen), backgroundColor: k.iuran_persen.map((x) => (x.persen >= 85 ? w.navy : w.amber)), borderRadius: 6, maxBarThickness: 16 },
        { type: 'line', label: 'Target 85%', data: labelBln.map(() => 85), borderColor: w.red, borderDash: [5, 5], pointRadius: 0, borderWidth: 1.5 }] },
        options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw}%` } } }, scales: { y: { max: 100, ticks: { callback: (v) => v + '%' } } } } });
      chart('cLunas', { type: 'doughnut', data: { labels: ['Lunas', 'Menunggak'], datasets: [{ data: [k.lunas_bulan_ini, k.menunggak], backgroundColor: [w.green, w.red], borderWidth: 0 }] },
        options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } } });
    }
    if (d.iuran_saya) {
      const is = d.iuran_saya;
      $('#gridIuran').innerHTML = BLN.map((b, i) => {
        const m = i + 1;
        const st = is.lunas.includes(m) ? ['b-green', 'bi-check-lg'] : is.menunggu.includes(m) ? ['b-amber', 'bi-hourglass-split'] : m <= bulanIni + 1 ? ['b-red', 'bi-x-lg'] : ['b-slate', 'bi-dash'];
        return `<div class="${st[0]}" style="border-radius:10px;padding:8px 4px;text-align:center"><div class="label-sm">${b}</div><i class="bi ${st[1]}"></i></div>`;
      }).join('') + `<p class="body-sm muted" style="grid-column:1/-1;margin-top:6px">Hijau = lunas · Kuning = menunggu verifikasi · Merah = belum dibayar</p>`;
    }
    if (d.kegiatan) chart('cKeg', { type: 'bar', data: { labels: d.kegiatan.map((x) => x.judul.length > 18 ? x.judul.slice(0, 17) + '…' : x.judul), datasets: [
      { label: 'Peserta terdaftar', data: d.kegiatan.map((x) => x.peserta), backgroundColor: w.navy, borderRadius: 6, maxBarThickness: 26 },
      { type: 'line', label: 'Kehadiran (%)', data: d.kegiatan.map((x) => (x.peserta ? Math.round(x.hadir / x.peserta * 100) : 0)), borderColor: w.amber, backgroundColor: w.amber, yAxisID: 'y1', tension: .3 }] },
      options: { scales: { y1: { position: 'right', max: 100, grid: { display: false }, ticks: { callback: (v) => v + '%' } } } } });
    if (d.per_sekolah) chart('cSekolah', { type: 'bar', data: { labels: d.per_sekolah.map((x) => x.label.replace('SD Negeri', 'SDN')), datasets: [{ label: 'Guru', data: d.per_sekolah.map((x) => x.jumlah), backgroundColor: w.teal, borderRadius: 6, maxBarThickness: 14 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: w.grid } }, y: { grid: { display: false } } } } });
    if (d.program) $('#progList').innerHTML = d.program.length ? d.program.map((x) => `<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:14px"><span style="font-weight:600">${esc(x.judul)}</span><b class="tabnum">${x.progres}%</b></div>
        <div class="progress ${x.progres < 30 ? 'amber' : ''}" style="margin-top:6px"><span style="width:${x.progres}%"></span></div></div>`).join('') : emptyState('Belum ada program', 'Program kerja tahun ini belum diisi.', 'bi-clipboard');
    if (d.medali) {
      const urut = ['juara_1', 'juara_2', 'juara_3', 'harapan_1', 'harapan_2', 'harapan_3'];
      chart('cMedali', { type: 'bar', data: { labels: urut.map((p) => PERINGKAT[p].label), datasets: [{ data: urut.map((p) => d.medali[p] || 0), backgroundColor: [w.gold, w.silver, w.bronze, w.teal, w.teal, w.teal], borderRadius: 6, maxBarThickness: 28 }] },
        options: { plugins: { legend: { display: false } } } });
      const top = d.top_sekolah || [];
      const maks = top.length ? Math.max(...top.map((t) => t.poin)) : 1;
      $('#topList').innerHTML = top.length ? top.map((t, i) => `<div class="rank-row"><span class="rank-no">${i + 1}</span><div><div style="font-weight:600;font-size:14px">${esc(t.sekolah)}</div>
          <div class="progress ${i === 0 ? 'amber' : ''}" style="margin-top:6px"><span style="width:${Math.round(t.poin / maks * 100)}%"></span></div></div><b class="tabnum" style="font-size:13px">${t.poin} poin</b></div>`).join('')
        : emptyState('Belum ada data', 'Peringkat muncul setelah hasil lomba disahkan.', 'bi-bar-chart');
    }
    if ($('#pmList')) {
      const label = { pendaftaran_anggota: ['Pendaftaran Anggota', 'bi-person-plus', 'pendaftaran'], aktivasi_akun: ['Akun Menunggu Aktivasi', 'bi-person-check', 'pendaftaran'],
        perubahan_data: ['Perubahan Data Pribadi', 'bi-pencil-square', 'persetujuan'], usulan_kegiatan: ['Usulan Kegiatan', 'bi-lightbulb', 'persetujuan'],
        peserta_lomba: ['Peserta Lomba', 'bi-person-badge', 'persetujuan'], prestasi: ['Validasi Prestasi', 'bi-trophy', 'persetujuan'], bukti_bayar: ['Bukti Bayar Iuran', 'bi-receipt', 'persetujuan'] };
      const ent = Object.entries(pm).filter(([, v]) => Number(v) > 0);
      $('#pmList').innerHTML = ent.length ? ent.map(([j, n]) => { const L = label[j] || [j, 'bi-dot', 'persetujuan'];
        return `<a href="#/app/${L[2]}" style="display:flex;gap:12px;align-items:center;color:inherit;text-decoration:none"><span class="icon-tile navy" style="width:36px;height:36px;font-size:16px"><i class="bi ${L[1]}"></i></span>
          <span style="flex:1;font-weight:600;font-size:14px">${L[0]}</span><span class="badge b-amber">${n} berkas</span></a>`; }).join('')
        : emptyState('Semua beres', 'Tidak ada pengajuan yang menunggu.', 'bi-check2-all');
    }
    if (d.aktivitas) {
      const aksi = { INSERT: 'menambah data', UPDATE: 'memperbarui', DELETE: 'menghapus data', LOGIN: 'masuk ke sistem', APPROVE: 'menyetujui', REJECT: 'menolak' };
      const tabel = (t) => String(t || '').replace(/_/g, ' ');
      $('#aktList').innerHTML = d.aktivitas.length ? d.aktivitas.slice(0, 6).map((a) => `<div class="tl-item">${avatar(a.nama_aktor, null)}<div><b>${esc(a.nama_aktor)}</b>
          <span class="body-sm"> ${aksi[a.aksi] || a.aksi.toLowerCase()} ${esc(tabel(a.tabel))}</span><small>${fmt.relatif(a.waktu)}</small></div></div>`).join('')
        : emptyState('Belum ada aktivitas', 'Aktivitas pengguna akan tercatat otomatis.', 'bi-activity');
    }
  }

  // ------------------------------------------------------------------
  // PENGATURAN ORGANISASI (Admin IT ubah; Ketua & Sekretaris lihat)
  // ------------------------------------------------------------------
  async function pengaturan() {
    const el = await shell('pengaturan', 'Pengaturan Organisasi', 'Identitas, penandatangan, iuran, penomoran surat');
    const bisaUbah = Auth.profil.role === 'admin_it';
    el.innerHTML = '<div class="skel skel-block" style="height:400px"></div>';
    const [org, anggota] = await Promise.all([Data.org(true), Data.anggotaPilihan().catch(() => [])]);
    const opsi = (sel) => `<option value="">— Pilih anggota —</option>` + anggota.map((a) => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.nama)}</option>`).join('');
    const dis = bisaUbah ? '' : 'disabled';
    el.innerHTML = `
      <div class="page-head"><div><h1>Pengaturan Organisasi</h1><p>Data ini dipakai di website publik, kop laporan, dan penomoran surat.</p></div>
        ${bisaUbah ? '' : '<span class="badge b-slate"><i class="bi bi-lock"></i> Hanya Admin IT yang dapat mengubah</span>'}</div>
      <form id="orgForm" novalidate>
      <div class="dash-grid">
        <section class="card span-8"><div class="card-title"><h3><i class="bi bi-building" style="color:var(--teal)"></i> Identitas Organisasi</h3></div>
          <div class="grid-2">
            <div class="field"><label for="o_nama">Nama Resmi <span class="req">*</span></label><input class="input" id="o_nama" name="nama" value="${esc(org.nama)}" ${dis}><div class="err"></div></div>
            <div class="field"><label for="o_singkatan">Nama Singkat</label><input class="input" id="o_singkatan" name="singkatan" value="${esc(org.singkatan || '')}" ${dis}></div>
            <div class="field"><label for="o_email">Email Resmi</label><input class="input" id="o_email" name="email" type="email" value="${esc(org.email || '')}" ${dis}><div class="err"></div></div>
            <div class="field"><label for="o_tel">Telepon / WhatsApp</label><input class="input" id="o_tel" name="telepon" value="${esc(org.telepon || '')}" ${dis}></div>
            <div class="field"><label for="o_sk">Nomor SK Kepengurusan</label><input class="input" id="o_sk" name="nomor_sk" value="${esc(org.nomor_sk || '')}" ${dis}></div>
            <div class="field"><label for="o_pembina">Instansi Pembina</label><input class="input" id="o_pembina" name="instansi_pembina" value="${esc(org.instansi_pembina || '')}" ${dis}></div>
          </div>
          <div class="field"><label for="o_alamat">Alamat Sekretariat</label><input class="input" id="o_alamat" name="alamat" value="${esc(org.alamat || '')}" ${dis}></div>
          <div class="field"><label for="o_tentang">Tentang Organisasi</label><textarea class="textarea" id="o_tentang" name="tentang" ${dis}>${esc(org.tentang || '')}</textarea></div>
          <div class="field"><label for="o_visi">Visi</label><textarea class="textarea" id="o_visi" name="visi" style="min-height:90px" ${dis}>${esc(org.visi || '')}</textarea></div>
          <div class="field"><label for="o_misi">Misi <span class="muted">(satu misi per baris)</span></label><textarea class="textarea" id="o_misi" name="misi" ${dis}>${esc((org.misi || []).join('\n'))}</textarea></div>
        </section>
        <div class="span-4" style="display:flex;flex-direction:column;gap:20px">
          <section class="card"><div class="card-title"><h3>Logo Organisasi</h3></div>
            <div class="dropzone" id="logoDz" ${bisaUbah ? 'tabindex="0" role="button"' : ''}><span class="preview" id="logoPrev">${org.logo_url ? `<img src="${esc(org.logo_url)}" alt="Logo">` : '<i class="bi bi-image"></i>'}</span>
              <span class="body-sm">${bisaUbah ? '<b>Ganti logo</b><br><span class="help">PNG/JPG persegi, dikompres otomatis.</span>' : 'Logo hanya dapat diubah Admin IT.'}</span></div>
            <input type="file" id="logoFile" accept="image/png,image/jpeg" class="sr-only"></section>
          <section class="card"><div class="card-title"><h3>Pejabat Penandatangan</h3></div>
            <div class="field"><label for="o_ketua">Ketua KKG</label><select class="select" id="o_ketua" name="ketua_id" ${dis}>${opsi(org.ketua_id)}</select></div>
            <div class="field"><label for="o_sekre">Sekretaris</label><select class="select" id="o_sekre" name="sekretaris_id" ${dis}>${opsi(org.sekretaris_id)}</select></div>
            <div class="field" style="margin:0"><label for="o_bend">Bendahara</label><select class="select" id="o_bend" name="bendahara_id" ${dis}>${opsi(org.bendahara_id)}</select></div></section>
          <section class="card"><div class="card-title"><h3>Iuran & Periode</h3></div>
            <div class="field"><label for="o_iuran">Nominal Iuran / Bulan (Rp) <span class="req">*</span></label><input class="input tabnum" id="o_iuran" name="nominal_iuran" type="number" min="0" step="1000" value="${Number(org.nominal_iuran || 0)}" ${dis}><div class="err"></div></div>
            <div class="grid-2"><div class="field"><label for="o_th">Tahun Anggaran</label><input class="input tabnum" id="o_th" name="tahun_anggaran" type="number" value="${Number(org.tahun_anggaran)}" ${dis}><div class="err"></div></div>
            <div class="field"><label for="o_periode">Periode Pengurus</label><input class="input" id="o_periode" name="periode_pengurus" value="${esc(org.periode_pengurus || '')}" ${dis}></div></div></section>
          <section class="card"><div class="card-title"><h3>Penomoran Surat Keluar</h3></div>
            <div class="field"><label for="o_fmt">Pola Nomor</label><input class="input" id="o_fmt" name="format_nomor_surat" value="${esc(org.format_nomor_surat)}" ${dis}>
              <span class="help">Gunakan {NO}, {ROMAWI}, {TAHUN}.</span></div>
            <div class="body-sm muted">Pratinjau:</div><div class="badge b-teal" id="fmtPrev" style="font-size:13px;text-transform:none;letter-spacing:0;height:auto;padding:6px 12px;margin-top:6px"></div></section>
        </div>
      </div>
      ${bisaUbah ? `<div class="savebar">
        <button type="button" class="btn btn-ghost" id="orgReset">Batalkan perubahan</button><button class="btn btn-primary" id="orgSimpan"><i class="bi bi-save"></i> Simpan Pengaturan</button></div>` : ''}
      </form>`;

    const romawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const prev = () => { const n = new Date(); $('#fmtPrev').textContent = $('#o_fmt').value.replace('{NO}', '012').replace('{ROMAWI}', romawi[n.getMonth()]).replace('{TAHUN}', n.getFullYear()); };
    prev(); $('#o_fmt').oninput = prev;
    if (!bisaUbah) return;

    let logoUrl = org.logo_url;
    $('#logoDz').onclick = () => $('#logoFile').click();
    $('#logoDz').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#logoFile').click(); } };
    $('#logoFile').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const g = await kompresGambar(f, 512, 0.9);
        $('#logoPrev').innerHTML = `<img src="${g.dataUrl}" alt="Logo baru">`;
        toast('Mengunggah logo…', 'info', 1500);
        const up = await Data.upload('foto_profil', { base64: g.base64, mime: g.mime, nama: 'logo-kkg.jpg', dataUrl: g.dataUrl });
        logoUrl = up.url; toast('Logo terunggah. Klik Simpan untuk menerapkan.', 'success');
      } catch (err) { toast(err.message, 'error'); }
    };
    $('#orgReset').onclick = () => pengaturan();
    $('#orgForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const ok = validasi(f, {
        nama: (v) => v.length < 5 ? 'Nama resmi wajib diisi.' : '',
        email: (v) => v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Format email tidak valid.' : '',
        nominal_iuran: (v) => !(Number(v) >= 0) || v === '' ? 'Nominal harus angka positif.' : '',
        tahun_anggaran: (v) => !(Number(v) >= 2020 && Number(v) <= 2100) ? 'Tahun tidak valid.' : ''
      });
      if (!ok) return;
      const btn = $('#orgSimpan'); btn.disabled = true;
      const patch = {
        nama: f.nama.value.trim(), singkatan: f.singkatan.value.trim(), email: f.email.value.trim(), telepon: f.telepon.value.trim(),
        nomor_sk: f.nomor_sk.value.trim(), instansi_pembina: f.instansi_pembina.value.trim(), alamat: f.alamat.value.trim(),
        tentang: f.tentang.value.trim(), visi: f.visi.value.trim(), misi: f.misi.value.split('\n').map((s) => s.trim()).filter(Boolean),
        ketua_id: f.ketua_id.value || null, sekretaris_id: f.sekretaris_id.value || null, bendahara_id: f.bendahara_id.value || null,
        nominal_iuran: Number(f.nominal_iuran.value), tahun_anggaran: Number(f.tahun_anggaran.value), periode_pengurus: f.periode_pengurus.value.trim(),
        format_nomor_surat: f.format_nomor_surat.value.trim(), logo_url: logoUrl || null
      };
      try { await Data.updateOrg(patch); toast('Pengaturan organisasi tersimpan.', 'success'); }
      catch (err) { toast(err.message, 'error'); }
      finally { btn.disabled = false; }
    };
  }

  // ------------------------------------------------------------------
  // AKUN PENGGUNA (Admin IT kelola; Ketua lihat)
  // ------------------------------------------------------------------
  async function akun() {
    const el = await shell('akun', 'Akun Pengguna', 'Hak akses login Google per peran');
    const admin = Auth.profil.role === 'admin_it';
    const st = { cari: '', role: '', status: '', halaman: 1, per: 10, urut: 'nama', naik: true };
    el.innerHTML = `
      <div class="page-head"><div><h1>Manajemen Akun Pengguna</h1><p>Hanya email Google yang terdaftar & aktif di sini yang dapat masuk ke sistem.</p></div>
        ${admin ? '<div class="acts"><button class="btn btn-primary" id="uBaru"><i class="bi bi-person-plus"></i> Tambah Akun</button></div>' : '<span class="badge b-slate"><i class="bi bi-eye"></i> Mode lihat</span>'}</div>
      <div class="card" style="padding:16px 16px 0;margin-bottom:0;border-bottom-left-radius:0;border-bottom-right-radius:0">
        <div class="toolbar"><div class="search"><i class="bi bi-search"></i><input class="input" id="uCari" placeholder="Cari nama atau email…" aria-label="Cari"></div>
          <select class="select" id="uRole" aria-label="Filter peran"><option value="">Semua peran</option>${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
          <select class="select" id="uStatus" aria-label="Filter status"><option value="">Semua status</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></div></div>
      <div class="card table-card" style="border-top-left-radius:0;border-top-right-radius:0"><div class="table-wrap"><table class="tbl stack">
        <thead><tr><th class="sortable" data-sort="nama">Nama <i class="bi bi-arrow-down-up"></i></th><th class="sortable" data-sort="email">Email Google <i class="bi bi-arrow-down-up"></i></th>
          <th class="sortable" data-sort="role">Peran <i class="bi bi-arrow-down-up"></i></th><th>Status</th><th class="sortable" data-sort="terakhir_login">Login Terakhir <i class="bi bi-arrow-down-up"></i></th>${admin ? '<th class="col-aksi" style="text-align:right">Aksi</th>' : ''}</tr></thead>
        <tbody id="uBody"></tbody></table></div>
        <div class="tbl-foot"><span class="body-sm muted" id="uInfo"></span><div class="pager" id="uPager"></div></div></div>`;

    const roleCls = { admin_it: 'b-slate', ketua: 'b-solid-navy', wakil_ketua: 'b-navy', sekretaris: 'b-teal', bendahara: 'b-amber', anggota: 'b-slate' };
    const muat = async () => {
      $('#uBody').innerHTML = Array.from({ length: 5 }, () => `<tr><td colspan="6"><div class="skel skel-line"></div></td></tr>`).join('');
      try {
        const { rows, total } = await Data.pengguna(st);
        $('#uBody').innerHTML = rows.length ? rows.map((u) => `<tr>
            <td data-label="Nama"><div style="display:flex;gap:10px;align-items:center">${avatar(u.nama)}<div><b>${esc(u.nama)}</b><div class="body-sm muted">${esc((u.anggota && u.anggota.sekolah) || '—')}</div></div></div></td>
            <td data-label="Email">${esc(u.email)}</td>
            <td data-label="Peran"><span class="badge ${roleCls[u.role]}">${ROLE_LABEL[u.role]}</span></td>
            <td data-label="Status">${u.status_aktif ? '<span class="badge b-green"><span class="dot"></span>Aktif</span>' : '<span class="badge b-slate">Nonaktif</span>'}</td>
            <td data-label="Login">${u.terakhir_login ? fmt.relatif(u.terakhir_login) : '<span class="muted">Belum pernah</span>'}</td>
            ${admin ? `<td class="no-label col-aksi"><div class="actions">
              <button class="btn btn-ghost btn-icon" data-edit="${esc(u.id)}" aria-label="Ubah ${esc(u.nama)}" title="Ubah"><i class="bi bi-pencil-square"></i></button>
              <button class="btn btn-ghost btn-icon" data-tog="${esc(u.id)}" data-aktif="${u.status_aktif}" aria-label="${u.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}" title="${u.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}">
                <i class="bi ${u.status_aktif ? 'bi-person-x' : 'bi-person-check'}"></i></button></div></td>` : ''}</tr>`).join('')
          : `<tr><td colspan="6" class="no-label">${emptyState('Tidak ada akun', 'Ubah kata kunci atau filter pencarian.', 'bi-person-x')}</td></tr>`;
        const hal = Math.max(1, Math.ceil(total / st.per));
        $('#uInfo').textContent = total ? `Menampilkan ${(st.halaman - 1) * st.per + 1}–${Math.min(st.halaman * st.per, total)} dari ${total} akun` : '';
        $('#uPager').innerHTML = `<button ${st.halaman <= 1 ? 'disabled' : ''} data-pg="${st.halaman - 1}" aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>`
          + Array.from({ length: hal }, (_, i) => i + 1).filter((i) => Math.abs(i - st.halaman) < 3 || i === 1 || i === hal).map((i) => `<button class="${i === st.halaman ? 'active' : ''}" data-pg="${i}">${i}</button>`).join('')
          + `<button ${st.halaman >= hal ? 'disabled' : ''} data-pg="${st.halaman + 1}" aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button>`;
        $$('#uPager [data-pg]').forEach((b) => b.onclick = () => { st.halaman = Number(b.dataset.pg); muat(); });
        $$('[data-edit]').forEach((b) => b.onclick = () => formAkun(rows.find((r) => r.id === b.dataset.edit)));
        $$('[data-tog]').forEach((b) => b.onclick = async () => {
          const aktif = b.dataset.aktif === 'true';
          const u = rows.find((r) => r.id === b.dataset.tog);
          if (u.id === Auth.profil.id) return toast('Anda tidak dapat menonaktifkan akun sendiri.', 'warning');
          const r = await konfirmasi({ judul: aktif ? 'Nonaktifkan akun?' : 'Aktifkan akun?', pesan: `<b>${esc(u.nama)}</b> ${aktif ? 'tidak akan bisa masuk lagi. Riwayat data tetap tersimpan.' : 'akan dapat masuk kembali.'}`, ok: aktif ? 'Nonaktifkan' : 'Aktifkan', bahaya: aktif });
          if (!r.ok) return;
          try { await Data.setStatusPengguna(u.id, !aktif); toast(`Akun ${u.nama} ${aktif ? 'dinonaktifkan' : 'diaktifkan'}.`, 'success'); muat(); } catch (e) { toast(e.message, 'error'); }
        });
      } catch (e) { $('#uBody').innerHTML = `<tr><td colspan="6"><div class="alert error"><i class="bi bi-x-circle"></i>${esc(e.message)}</div></td></tr>`; }
    };

    $('#uCari').oninput = debounce((e) => { st.cari = e.target.value; st.halaman = 1; muat(); }, 300);
    $('#uRole').onchange = (e) => { st.role = e.target.value; st.halaman = 1; muat(); };
    $('#uStatus').onchange = (e) => { st.status = e.target.value; st.halaman = 1; muat(); };
    $$('th[data-sort]').forEach((th) => th.onclick = () => { st.naik = st.urut === th.dataset.sort ? !st.naik : true; st.urut = th.dataset.sort; muat(); });
    if (admin) $('#uBaru').onclick = () => formAkun(null);

    async function formAkun(u) {
      const agt = await Data.anggotaPilihan().catch(() => []);
      modal({
        judul: u ? 'Ubah Akun Pengguna' : 'Tambah Akun Pengguna',
        isi: `<form id="aForm" novalidate>
          <div class="field"><label for="a_nama">Nama Lengkap <span class="req">*</span></label><input class="input" id="a_nama" name="nama" value="${esc(u ? u.nama : '')}"><div class="err"></div></div>
          <div class="field"><label for="a_email">Email Google <span class="req">*</span></label><input class="input" id="a_email" name="email" type="email" value="${esc(u ? u.email : '')}" placeholder="nama@gmail.com"><div class="err"></div>
            <span class="help">Pengguna login dengan akun Google beralamat email ini.</span></div>
          <div class="grid-2"><div class="field"><label for="a_role">Peran <span class="req">*</span></label><select class="select" id="a_role" name="role">${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}" ${(u ? u.role : 'anggota') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            <div class="field"><label for="a_agt">Tautkan ke Data Anggota</label><select class="select" id="a_agt" name="anggota_id"><option value="">— Tidak ditautkan —</option>${agt.map((a) => `<option value="${esc(a.id)}" ${u && u.anggota_id === a.id ? 'selected' : ''}>${esc(a.nama)}</option>`).join('')}</select></div></div>
          <label class="check"><input type="checkbox" name="status_aktif" ${!u || u.status_aktif ? 'checked' : ''}> <span>Akun aktif (dapat login)</span></label></form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="aSimpan"><i class="bi bi-save"></i> Simpan</button>',
        onOpen: (m, close) => {
          $('#aSimpan', m).onclick = async () => {
            const f = $('#aForm', m);
            const ok = validasi(f, { nama: (v) => v.length < 3 ? 'Nama wajib diisi.' : '', email: (v) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Format email tidak valid.' : '' });
            if (!ok) return;
            const btn = $('#aSimpan', m); btn.disabled = true;
            try {
              await Data.simpanPengguna({ id: u && u.id, nama: f.nama.value.trim(), email: f.email.value.trim(), role: f.role.value, anggota_id: f.anggota_id.value || null, status_aktif: f.status_aktif.checked });
              close(); toast(u ? 'Akun diperbarui.' : 'Akun ditambahkan. Pengguna kini dapat masuk dengan Google.', 'success'); muat();
            } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
          };
        }
      });
    }
    muat();
  }

  // ------------------------------------------------------------------
  // NOTIFIKASI
  // ------------------------------------------------------------------
  async function notifikasi() {
    const el = await shell('notifikasi', 'Notifikasi', 'Pemberitahuan untuk Anda');
    el.innerHTML = `<div class="page-head"><div><h1>Notifikasi</h1><p>Riwayat pemberitahuan sistem untuk akun Anda.</p></div>
      <div class="acts"><button class="btn btn-outline" data-all><i class="bi bi-check2-all"></i> Tandai semua dibaca</button></div></div>
      <div class="card" id="nList" style="padding:8px"><div class="skel skel-block"></div></div>`;
    try {
      const rows = await Data.notifikasi();
      $('#nList').innerHTML = rows.length ? rows.map(notifItem).join('') : emptyState('Tidak ada notifikasi', 'Pemberitahuan baru akan tampil di sini.', 'bi-bell-slash');
      ikatNotif(el);
    } catch (e) { $('#nList').innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i>${esc(e.message)}</div>`; }
  }

  // ------------------------------------------------------------------
  // MODUL TAHAP BERIKUTNYA
  // ------------------------------------------------------------------
  async function segera(id) {
    const it = ITEM[id] || { label: 'Profil Saya', icon: 'bi-person', batch: 2 };
    const el = await shell(id, it.label);
    el.innerHTML = `<div class="page-head"><div><h1>${esc(it.label)}</h1></div></div>
      <div class="card">${emptyState('Modul dibangun pada Batch ' + it.batch, 'Fondasi data, hak akses, dan RPC untuk modul ini sudah siap di database. Antarmukanya dikerjakan pada tahap ' + it.batch + ' sesuai rencana PRD.', it.icon, '<a class="btn btn-primary" href="#/app/dashboard">Kembali ke Dashboard</a>')}</div>`;
  }

  // ------------------------------------------------------------------
  // ROUTES + BOOTSTRAP
  // ------------------------------------------------------------------
  const P = window.PublicPages;
  Router.add('/', P.beranda);
  Router.add('/profil', P.profil);
  Router.add('/kontak', P.kontak);
  Router.add('/daftar', P.daftar);
  Router.add('/masuk', P.masuk);
  [['anggota', 'Data Anggota'], ['program', 'Program Kerja'], ['agenda', 'Agenda Kegiatan'], ['lomba', 'Jadwal Lomba'], ['prestasi', 'Prestasi Siswa'], ['berita', 'Berita & Pengumuman'], ['dokumentasi', 'Dokumentasi']]
    .forEach(([k, j]) => Router.add('/' + k, () => (P[k] ? P[k]() : P.segera(k, j))));
  Router.add(/^\/berita\/([\w-]+)$/, (m) => P.beritaDetail(m));
  Router.add(/^\/dokumentasi\/([\w-]+)$/, (m) => P.albumPublik(m));

  // Registri halaman: modul batch lain menambah lewat window.AppPages
  const HAL = window.AppPages = Object.assign(window.AppPages || {}, { dashboard, pengaturan, akun, notifikasi });
  // Perkakas bersama untuk modul halaman
  window.AppKit = { shell, chart, warna, destroyCharts, boleh, muatBadge, segera, ITEM };
  Router.add(/^\/app\/([\w-]+)$/, async ([id]) => {
    if (!Auth.profil) return Router.go('/masuk');
    if (id !== 'profil' && !boleh(id)) { toast('Menu ini tidak tersedia untuk peran Anda.', 'warning'); return Router.go('/app/dashboard'); }
    return HAL[id] ? HAL[id](Router.query()) : segera(id);
  });

  // Logout otomatis setelah tidak aktif (PRD §5.10)
  let idleTimer;
  function resetIdle() {
    clearTimeout(idleTimer);
    if (!Auth.profil) return;
    idleTimer = setTimeout(async () => {
      if (!Auth.profil) return;
      await Auth.logout();
      $('#appShell') && $('#appShell').remove();
      modal({ judul: 'Sesi Berakhir Demi Keamanan', isi: `<div style="text-align:center"><div class="empty" style="padding:8px"><div class="ill"><i class="bi bi-lock"></i></div>
        <p>Anda tidak aktif selama ${C.SESSION_IDLE_MINUTES || 30} menit. Silakan masuk kembali.</p></div></div>`,
        foot: '<a class="btn btn-primary" href="#/masuk" data-close>Masuk Kembali</a>' });
      Router.go('/masuk');
    }, (C.SESSION_IDLE_MINUTES || 30) * 60 * 1000);
  }
  ['click', 'keydown', 'mousemove', 'touchstart'].forEach((ev) => document.addEventListener(ev, debounce(resetIdle, 1000), { passive: true }));

  async function boot() {
    Theme.apply(Theme.get());
    try {
      await Auth.init();
      if (Auth.profil && (!location.hash || location.hash === '#/' || location.hash === '#/masuk')) {
        let tujuan = null;
        try { tujuan = localStorage.getItem('kkg_after_login'); localStorage.removeItem('kkg_after_login'); } catch (e) { /* abaikan */ }
        if (tujuan) location.hash = tujuan.replace(/^#/, '');
      }
      if (!Auth.profil && Auth.galat) location.hash = '/masuk';
    } catch (e) {
      toast('Gagal terhubung ke server: ' + e.message, 'error', 8000);
    }
    await Router.start();
    resetIdle();
    const ld = $('#loader'); if (ld) { ld.classList.add('done'); setTimeout(() => ld.remove(), 350); }
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
