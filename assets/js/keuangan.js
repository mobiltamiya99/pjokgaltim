/* =====================================================================
   BATCH 4 — Keuangan
   Buku Kas · Rekap Iuran (klik bulan = lunas) · Verifikasi Bukti Transfer ·
   Tunggakan & Pengingat (email antrean + WhatsApp) · Iuran Saya (anggota)
   Hak akses PRD §3.2: Bendahara kelola, Ketua lihat, Wakil Ketua ringkasan.
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, BULAN, BLN, avatar, toast, modal, konfirmasi, Router, validasi, debounce, emptyState } = window.K;
  const { Auth, Data } = window.KKG;
  const { shell, chart, warna, muatBadge } = window.AppKit;
  const UI = window.UI;
  const adalah = (...r) => r.includes(Auth.profil.role);
  const TH = () => new Date().getFullYear();
  const BLN_KINI = () => new Date().getMonth() + 1;
  const hariIni = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const opsiTahun = (pilih) => [TH() + 1, TH(), TH() - 1, TH() - 2].map((y) => `<option ${y === pilih ? 'selected' : ''}>${y}</option>`).join('');
  const rp = (n) => fmt.rp(Number(n || 0));
  const gagal = (el, e) => { el.innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div>`; };
  const kpi = (cls, ic, lbl, val, sub = '') => `<div class="kpi ${cls}"><span class="ic"><i class="bi ${ic}"></i></span><div class="lbl">${lbl}</div><div class="val" style="font-size:26px">${val}</div><div class="sub">${sub}</div></div>`;
  const bulanBerjalan = (th) => th < TH() ? 12 : th > TH() ? 0 : BLN_KINI();
  const KAT = { masuk: ['Iuran Anggota', 'Donasi', 'Sponsor', 'Hibah', 'Saldo Awal', 'Lainnya'], keluar: ['Konsumsi', 'ATK', 'Kegiatan', 'Transport', 'Hadiah', 'Sosial', 'Lainnya'] };

  // Panel ringkasan (dipakai Buku Kas & Iuran; satu-satunya tampilan untuk Wakil Ketua)
  function grafikKas(id, r) {
    const w = warna();
    chart(id, { type: 'bar', data: { labels: BLN, datasets: [
      { label: 'Pemasukan', data: r.per_bulan.map((x) => x.masuk), backgroundColor: w.teal, borderRadius: 6, maxBarThickness: 22 },
      { label: 'Pengeluaran', data: r.per_bulan.map((x) => x.keluar), backgroundColor: w.amber, borderRadius: 6, maxBarThickness: 22 }] },
      options: { scales: { y: { ticks: { callback: (v) => fmt.rpSingkat(v) } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${rp(c.raw)}` } } } } });
  }
  function grafikIuran(id, r) {
    const w = warna(), batas = r.bulan_berjalan;
    chart(id, { type: 'bar', data: { labels: BLN, datasets: [{ label: 'Lunas (%)', data: r.per_bulan.map((x, i) => i < batas && r.anggota_aktif ? Math.round(x.lunas / r.anggota_aktif * 1000) / 10 : null),
      backgroundColor: r.per_bulan.map((x, i) => (x.lunas / (r.anggota_aktif || 1)) >= 0.9 ? w.teal : w.amber), borderRadius: 6, maxBarThickness: 26 }] },
      options: { scales: { y: { max: 100, ticks: { callback: (v) => v + '%' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.raw}% · ${r.per_bulan[c.dataIndex].lunas} dari ${r.anggota_aktif} anggota` } } } } });
  }
  const daftarKategori = (r) => {
    const blok = (jenis, judul, warnaBar) => {
      const rows = r.per_kategori.filter((k) => k.jenis === jenis);
      const tot = rows.reduce((s, k) => s + Number(k.total), 0) || 1;
      return `<div style="margin-bottom:18px"><div class="label-sm muted" style="margin-bottom:8px">${judul}</div>${rows.length ? rows.map((k) => `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:14px"><span>${esc(k.kategori)} <span class="muted body-sm">· ${k.jumlah} trx</span></span><b class="tabnum">${rp(k.total)}</b></div>
          <div class="progress ${warnaBar}" style="margin-top:5px"><span style="width:${Math.max(2, Math.round(Number(k.total) / tot * 100))}%"></span></div></div>`).join('') : '<p class="muted body-sm">Belum ada transaksi.</p>'}</div>`;
    };
    return blok('masuk', 'Pemasukan per kategori', '') + blok('keluar', 'Pengeluaran per kategori', 'amber');
  };

  // ==================================================================
  // BUKU KAS
  // ==================================================================
  async function halKas() {
    const el = await shell('kas', 'Buku Kas', 'Pemasukan & pengeluaran organisasi');
    const kelola = adalah('bendahara');
    const lengkap = adalah('bendahara', 'ketua');
    const st = { tahun: TH(), cari: '', jenis: '', kategori: '', bulan: '', gabung: true, halaman: 1, per: 15, urut: null, naik: false };
    el.innerHTML = `<div class="page-head"><div><h1>Buku Kas Umum</h1><p>${kelola ? 'Catat pemasukan & pengeluaran beserta buktinya. Pembayaran iuran masuk otomatis.' : lengkap ? 'Mode lihat — pencatatan dilakukan Bendahara.' : 'Ringkasan keuangan organisasi. Rincian transaksi hanya untuk Ketua & Bendahara.'}</p></div>
        <div class="acts"><select class="select" id="kTh" style="width:auto" aria-label="Tahun">${opsiTahun(st.tahun)}</select>
          ${lengkap ? '<button class="btn btn-outline" id="kXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button><button class="btn btn-outline" id="kPdf"><i class="bi bi-printer"></i> PDF</button>' : ''}
          ${kelola ? '<button class="btn btn-outline" id="kKeluar"><i class="bi bi-dash-circle"></i> Pengeluaran</button><button class="btn btn-primary" id="kMasuk"><i class="bi bi-plus-circle"></i> Pemasukan</button>' : ''}</div></div>
      <div class="kpi-grid" id="kKpi">${Array.from({ length: 4 }, () => '<div class="skel" style="height:150px;border-radius:16px"></div>').join('')}</div>
      <div class="dash-grid" style="margin-bottom:20px"><section class="card span-8"><div class="card-title"><h3>Arus Kas per Bulan</h3><span class="body-sm muted" id="kSubGraf"></span></div><div class="chart-box"><canvas id="cKas"></canvas></div></section>
        <section class="card span-4"><div class="card-title"><h3>Rincian Kategori</h3></div><div id="kKat"></div></section></div>
      ${lengkap ? `<div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0">
          <div class="search"><i class="bi bi-search"></i><input class="input" id="kCari" placeholder="Cari uraian atau nomor bukti…" aria-label="Cari transaksi"></div>
          <select class="select" id="kJenis" aria-label="Jenis"><option value="">Masuk & keluar</option><option value="masuk">Pemasukan</option><option value="keluar">Pengeluaran</option></select>
          <select class="select" id="kKatF" aria-label="Kategori"><option value="">Semua kategori</option></select>
          <select class="select" id="kBln" aria-label="Bulan"><option value="">Semua bulan</option>${BULAN.map((b, i) => `<option value="${i + 1}">${b}</option>`).join('')}</select>
          <label class="check" style="white-space:nowrap"><span class="switch"><input type="checkbox" id="kGabung" checked><span></span></span> Gabungkan iuran per bulan</label></div></div>
        <div id="kTabel"></div>` : ''}`;

    let ring = null, kas = null, baris = [];
    async function muatSemua() {
      try {
        ring = await Data.ringkasanKeuangan(st.tahun);
        $('#kKpi').innerHTML = [
          kpi('deep', 'bi-box-arrow-in-right', 'Saldo Awal ' + st.tahun, fmt.rpSingkat(ring.saldo_awal), 'Sisa kas tahun sebelumnya'),
          kpi('teal', 'bi-arrow-down-circle', 'Pemasukan', fmt.rpSingkat(ring.pemasukan), `Iuran terkumpul ${fmt.rpSingkat(ring.iuran.terkumpul)}`),
          kpi('amber', 'bi-arrow-up-circle', 'Pengeluaran', fmt.rpSingkat(ring.pengeluaran), `${ring.per_kategori.filter((k) => k.jenis === 'keluar').reduce((s, k) => s + k.jumlah, 0)} transaksi`),
          kpi('navy', 'bi-bank', 'Saldo Akhir', fmt.rpSingkat(ring.saldo_akhir), st.tahun === TH() ? 'Saldo kas saat ini' : 'Per 31 Desember ' + st.tahun)].join('');
        $('#kSubGraf').textContent = 'Tahun ' + st.tahun;
        grafikKas('cKas', ring);
        $('#kKat').innerHTML = daftarKategori(ring);
      } catch (e) { gagal($('#kKpi'), e); }
      if (!lengkap) return;
      kas = null; if (t) t.muat(true);
    }

    // Susun baris: urut kronologis → saldo berjalan; iuran opsional digabung per bulan
    function susun() {
      if (!kas) return; // data sedang dimuat ulang; muat() akan menyusun sendiri
      let rows = kas.slice();
      if (st.gabung) {
        const agg = {};
        rows = rows.filter((k) => {
          if (!k.ref_iuran_id) return true;
          const m = Number(k.tanggal.slice(5, 7));
          const g = agg[m] = agg[m] || { id: 'agg-' + m, _gabung: true, jenis: 'masuk', kategori: 'Iuran Anggota', nominal: 0, n: 0, tanggal: k.tanggal, no_bukti: 'IUR-' + st.tahun + String(m).padStart(2, '0') };
          g.nominal += Number(k.nominal); g.n++; if (k.tanggal > g.tanggal) g.tanggal = k.tanggal;
          return false;
        });
        Object.values(agg).forEach((g) => { g.uraian = `Rekap iuran anggota diterima bulan ${BULAN[Number(g.tanggal.slice(5, 7)) - 1]} (${g.n} pembayaran)`; g.dibuat_pada = 'z'; rows.push(g); });
      }
      rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || String(a.dibuat_pada).localeCompare(String(b.dibuat_pada)));
      let saldo = Number(ring ? ring.saldo_awal : 0);
      rows.forEach((r) => { saldo += r.jenis === 'masuk' ? Number(r.nominal) : -Number(r.nominal); r._saldo = saldo; r._bulan = Number(r.tanggal.slice(5, 7)); });
      baris = rows;
      const kat = [...new Set(kas.map((k) => k.kategori))].sort();
      const sel = $('#kKatF'); const v = sel.value;
      sel.innerHTML = '<option value="">Semua kategori</option>' + kat.map((k) => `<option ${k === v ? 'selected' : ''}>${esc(k)}</option>`).join('');
    }
    const saring = (s) => {
      const r = UI.saringLokal(baris, Object.assign({}, s, { urut: null }), { cari: ['uraian', 'no_bukti', 'kategori'], filter: {
        jenis: (x, v) => x.jenis === v, kategori: (x, v) => x.kategori === v, bulan: (x, v) => x._bulan === Number(v) } });
      const semua = r.semua.slice().reverse(); // terbaru di atas
      return { rows: semua.slice((s.halaman - 1) * s.per, s.halaman * s.per), total: semua.length, semua };
    };

    let t = null;
    if (lengkap) {
      t = UI.tabel({ el: $('#kTabel'), state: st,
        kosong: { judul: 'Belum ada transaksi', pesan: kelola ? 'Catat pemasukan atau pengeluaran pertama tahun ini.' : 'Belum ada transaksi pada tahun ini.', ikon: 'bi-cash-stack' },
        kolom: [
          { key: 'tanggal', label: 'Tanggal', render: (k) => `<span style="white-space:nowrap">${fmt.tglPendek(k.tanggal)}</span><div class="body-sm muted tabnum">${esc(k.no_bukti || '')}</div>` },
          { key: 'uraian', label: 'Uraian', render: (k) => `<b style="font-weight:600">${esc(k.uraian)}</b><div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap"><span class="badge ${k.jenis === 'masuk' ? 'b-teal' : 'b-amber'}" style="text-transform:none;letter-spacing:0">${esc(k.kategori)}</span>${k.ref_iuran_id || k._gabung ? '<span class="badge b-slate" style="text-transform:none;letter-spacing:0"><i class="bi bi-link-45deg"></i> otomatis dari iuran</span>' : ''}</div>` },
          { key: 'masuk', label: 'Masuk', cls: 'num', render: (k) => k.jenis === 'masuk' ? `<b style="color:var(--teal-text)">${rp(k.nominal)}</b>` : '<span class="muted">—</span>' },
          { key: 'keluar', label: 'Keluar', cls: 'num', render: (k) => k.jenis === 'keluar' ? `<b style="color:var(--b-amber-tx)">${rp(k.nominal)}</b>` : '<span class="muted">—</span>' },
          { key: '_saldo', label: 'Saldo', cls: 'num', render: (k) => `<span class="tabnum" style="${k._saldo < 0 ? 'color:var(--danger)' : ''}">${rp(k._saldo)}</span>` }],
        aksi: (k) => {
          if (k._gabung) return `<button class="btn btn-sm btn-ghost" data-urai="${k._bulan}">Rincian</button>`;
          let h = k.bukti_url ? `<button class="btn btn-ghost btn-icon" data-bukti="${esc(k.id)}" aria-label="Lihat bukti"><i class="bi bi-paperclip"></i></button>` : '';
          if (kelola && !k.ref_iuran_id) h += `<button class="btn btn-ghost btn-icon" data-ubah="${esc(k.id)}" aria-label="Ubah transaksi"><i class="bi bi-pencil-square"></i></button><button class="btn btn-ghost btn-icon" data-hapus="${esc(k.id)}" aria-label="Hapus transaksi"><i class="bi bi-trash3"></i></button>`;
          return h || '<span class="muted body-sm">—</span>';
        },
        muat: async (s) => { if (!kas) { kas = await Data.kasDaftar(s.tahun); susun(); } return saring(s); },
        onRender: (rows) => {
          const cari = (id) => kas.find((k) => k.id === id);
          $$('[data-bukti]').forEach((b) => b.onclick = () => { const k = cari(b.dataset.bukti); UI.lihatBerkas(k.bukti_url, 'bukti-' + k.no_bukti); });
          $$('[data-ubah]').forEach((b) => b.onclick = () => form(cari(b.dataset.ubah)));
          $$('[data-urai]').forEach((b) => b.onclick = () => { st.gabung = false; $('#kGabung').checked = false; st.bulan = b.dataset.urai; $('#kBln').value = st.bulan; st.kategori = 'Iuran Anggota'; susun(); $('#kKatF').value = st.kategori; t.muat(true); });
          $$('[data-hapus]').forEach((b) => b.onclick = async () => {
            const k = cari(b.dataset.hapus);
            const r = await konfirmasi({ judul: 'Hapus transaksi?', bahaya: true, ok: 'Hapus', pesan: `Transaksi <b>${esc(k.no_bukti)}</b> — ${esc(k.uraian)} (${rp(k.nominal)}) akan dihapus dan saldo dihitung ulang.` });
            if (!r.ok) return;
            try { await Data.hapusKas(k.id); toast('Transaksi dihapus.', 'success'); muatSemua(); } catch (e) { toast(e.message, 'error'); }
          });
        } });
      $('#kCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
      $('#kJenis').onchange = (e) => { st.jenis = e.target.value; t.muat(true); };
      $('#kKatF').onchange = (e) => { st.kategori = e.target.value; t.muat(true); };
      $('#kBln').onchange = (e) => { st.bulan = e.target.value; t.muat(true); };
      $('#kGabung').onchange = (e) => { st.gabung = e.target.checked; if (st.gabung && st.kategori === 'Iuran Anggota') { st.kategori = ''; } susun(); $('#kKatF').value = st.kategori; t.muat(true); };
      const kolEkspor = [{ label: 'Tanggal', val: (k) => fmt.tglPendek(k.tanggal) }, { label: 'No. Bukti', key: 'no_bukti' }, { label: 'Uraian', key: 'uraian' }, { label: 'Kategori', key: 'kategori' },
        { label: 'Masuk', val: (k) => k.jenis === 'masuk' ? (k._total ? rp(k.nominal) : Number(k.nominal)) : '' }, { label: 'Keluar', val: (k) => k.jenis === 'keluar' || k._total ? (k._total ? rp(k.keluar) : Number(k.nominal)) : '' },
        { label: 'Saldo', val: (k) => k._total ? rp(k._saldo) : Number(k._saldo) }];
      const dataEkspor = () => saring(Object.assign({}, st, { halaman: 1, per: 1e9 })).semua.slice().reverse();
      $('#kXls').onclick = () => UI.eksporCSV('buku_kas_' + st.tahun, kolEkspor, dataEkspor());
      $('#kPdf').onclick = async () => {
        const rows = dataEkspor();
        const kol = kolEkspor.map((k) => k.label === 'Masuk' || k.label === 'Keluar' || k.label === 'Saldo' ? Object.assign({}, k, { val: (r) => { const v = k.val(r); return typeof v === 'number' ? rp(v) : v; } }) : k);
        const tm = rows.filter((r) => r.jenis === 'masuk').reduce((s, r) => s + Number(r.nominal), 0), tk = rows.filter((r) => r.jenis === 'keluar').reduce((s, r) => s + Number(r.nominal), 0);
        UI.cetak({ judul: 'Buku Kas Umum', sub: `Tahun ${st.tahun}${st.bulan ? ' · ' + BULAN[st.bulan - 1] : ''} · Saldo awal ${rp(ring.saldo_awal)}`, kolom: kol,
          rows: rows.concat([{ tanggal: '', no_bukti: '', uraian: 'JUMLAH', kategori: '', jenis: 'masuk', nominal: tm, keluar: tk, _saldo: rows.length ? rows[rows.length - 1]._saldo : ring.saldo_awal, _total: true }]),
          ttd: await UI.penandatangan(['ketua', 'bendahara']) });
      };
    }
    $('#kTh').onchange = (e) => { st.tahun = Number(e.target.value); muatSemua(); };
    if (kelola) { $('#kMasuk').onclick = () => form(null, 'masuk'); $('#kKeluar').onclick = () => form(null, 'keluar'); }
    muatSemua();

    function form(k, jenisAwal) {
      let berkas = null, jenis = k ? k.jenis : jenisAwal;
      modal({
        judul: k ? 'Ubah Transaksi ' + k.no_bukti : 'Catat Transaksi Kas',
        isi: `<form id="fKas" novalidate>
          <div class="segmented" role="tablist" style="width:100%;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr">
            <button type="button" data-j="masuk" class="${jenis === 'masuk' ? 'active' : ''}"><i class="bi bi-arrow-down-circle"></i> Pemasukan</button>
            <button type="button" data-j="keluar" class="${jenis === 'keluar' ? 'active' : ''}"><i class="bi bi-arrow-up-circle"></i> Pengeluaran</button></div>
          <div class="grid-2"><div class="field"><label for="x1">Tanggal <span class="req">*</span></label><input class="input" id="x1" name="tanggal" type="date" max="${hariIni()}" value="${esc(k ? k.tanggal : hariIni())}"><div class="err"></div></div>
            <div class="field"><label for="x2">Kategori <span class="req">*</span></label><input class="input" id="x2" name="kategori" list="dlKat" value="${esc(k ? k.kategori : '')}" placeholder="Pilih atau ketik"><datalist id="dlKat"></datalist><div class="err"></div></div></div>
          <div class="field"><label for="x3">Uraian <span class="req">*</span></label><input class="input" id="x3" name="uraian" value="${esc(k ? k.uraian : '')}" placeholder="Contoh: Konsumsi rapat koordinasi O2SN"><div class="err"></div></div>
          <div class="field"><label for="x4">Nominal (Rp) <span class="req">*</span></label><input class="input tabnum" id="x4" name="nominal" inputmode="numeric" value="${k ? fmt.num(k.nominal) : ''}" placeholder="0" style="font-size:20px;font-weight:700"><div class="err"></div>
            <span class="help" id="xSaldo"></span></div>
          <div class="field"><span class="label">Bukti / nota (opsional)</span>
            <label class="dropzone" for="xF"><span class="preview" id="xFP"><i class="bi ${k && k.bukti_url ? 'bi-file-earmark-check' : 'bi-receipt'}"></i></span><span id="xFN">${k && k.bukti_url ? '<b>Bukti sudah ada</b><br><span class="help">Pilih berkas baru untuk mengganti</span>' : '<b>Foto nota atau PDF</b><br><span class="help">JPG/PNG/PDF · maks 5 MB</span>'}</span></label>
            <input type="file" id="xF" class="sr-only" accept="image/jpeg,image/png,application/pdf"></div></form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="xGo"><i class="bi bi-save"></i> Simpan Transaksi</button>',
        onOpen: (m, close) => {
          const f = $('#fKas', m);
          const setJenis = (j) => { jenis = j; $$('[data-j]', m).forEach((b) => b.classList.toggle('active', b.dataset.j === j)); $('#dlKat', m).innerHTML = KAT[j].filter((x) => x !== 'Iuran Anggota').map((x) => `<option>${x}</option>`).join(''); infoSaldo(); };
          const angka = () => Number(String(f.nominal.value).replace(/\D/g, ''));
          const infoSaldo = () => { if (!ring) return; const s = Number(ring.saldo_kini) - (k ? (k.jenis === 'masuk' ? Number(k.nominal) : -Number(k.nominal)) : 0) + (jenis === 'masuk' ? angka() : -angka());
            $('#xSaldo', m).innerHTML = angka() ? `Saldo kas setelah transaksi: <b style="${s < 0 ? 'color:var(--danger)' : ''}">${rp(s)}</b>` : ''; };
          $$('[data-j]', m).forEach((b) => b.onclick = () => setJenis(b.dataset.j));
          setJenis(jenis);
          f.nominal.oninput = () => { const n = angka(); f.nominal.value = n ? fmt.num(n) : ''; infoSaldo(); };
          const inp = $('#xF', m);
          inp.onchange = async () => { try { berkas = await UI.siapkanBerkas(inp.files[0]); $('#xFP', m).innerHTML = berkas.mime.startsWith('image/') ? `<img src="${berkas.dataUrl}" alt="">` : '<i class="bi bi-filetype-pdf" style="color:var(--danger)"></i>'; $('#xFN', m).innerHTML = `<b>${esc(berkas.nama)}</b><br><span class="help">Siap diunggah</span>`; } catch (e) { berkas = null; toast(e.message, 'error'); } };
          $('#xGo', m).onclick = async () => {
            const ok = validasi(f, { tanggal: (v) => !v ? 'Pilih tanggal.' : v > hariIni() ? 'Tanggal tidak boleh di masa depan.' : '', kategori: (v) => !v.trim() ? 'Isi kategori.' : v.trim() === 'Iuran Anggota' ? 'Iuran dicatat lewat menu Iuran Anggota.' : '',
              uraian: (v) => v.trim().length < 3 ? 'Isi uraian transaksi.' : '', nominal: () => !(angka() > 0) ? 'Nominal harus lebih dari 0.' : '' });
            if (!ok) return;
            const sesudah = Number(ring ? ring.saldo_kini : 0) - (k ? (k.jenis === 'masuk' ? Number(k.nominal) : -Number(k.nominal)) : 0) + (jenis === 'masuk' ? angka() : -angka());
            if (jenis === 'keluar' && sesudah < 0) {
              const r = await konfirmasi({ judul: 'Saldo menjadi minus', bahaya: true, ok: 'Tetap simpan', pesan: `Setelah pengeluaran ini saldo kas menjadi <b>${rp(sesudah)}</b>. Pastikan nominal sudah benar.` });
              if (!r.ok) return;
            }
            const btn = $('#xGo', m); btn.disabled = true;
            try {
              const bukti_url = berkas ? (await Data.upload('bukti', { base64: berkas.base64, mime: berkas.mime, nama: berkas.nama, dataUrl: berkas.dataUrl })).url : (k ? k.bukti_url : null);
              const r = await Data.simpanKas({ id: k && k.id, tanggal: f.tanggal.value, jenis, kategori: f.kategori.value.trim(), uraian: f.uraian.value.trim(), nominal: angka(), bukti_url });
              close(); toast(k ? 'Transaksi diperbarui.' : `Transaksi ${r && r.no_bukti ? r.no_bukti + ' ' : ''}tersimpan.`, 'success'); muatSemua();
            } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
          };
        }
      });
    }
  }

  // ==================================================================
  // IURAN ANGGOTA — rekap matriks anggota × bulan + verifikasi bukti
  // ==================================================================
  async function halIuran(q) {
    const el = await shell('iuran', 'Iuran Anggota', 'Rekap pembayaran per bulan');
    const kelola = adalah('bendahara');
    const lengkap = adalah('bendahara', 'ketua');
    const st = { tahun: TH(), tab: (q && q.tab === 'verifikasi' && kelola) ? 'verifikasi' : 'rekap', cari: '', saring: '' };
    el.innerHTML = `<div class="page-head"><div><h1>Iuran Anggota</h1><p id="iSub">${kelola ? 'Klik kotak bulan untuk menandai lunas (tunai). Klik lagi kotak yang lunas untuk koreksi.' : lengkap ? 'Mode lihat — pencatatan dilakukan Bendahara.' : 'Ringkasan kepatuhan iuran. Rincian per anggota hanya untuk Ketua & Bendahara.'}</p></div>
        <div class="acts"><select class="select" id="iTh" style="width:auto" aria-label="Tahun">${opsiTahun(st.tahun)}</select>
          ${lengkap ? '<button class="btn btn-outline" id="iXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button><button class="btn btn-outline" id="iPdf"><i class="bi bi-printer"></i> PDF</button>' : ''}</div></div>
      <div class="kpi-grid" id="iKpi">${Array.from({ length: 4 }, () => '<div class="skel" style="height:150px;border-radius:16px"></div>').join('')}</div>
      ${kelola ? '<div class="chip-tabs" id="iTabs" role="tablist"></div>' : ''}
      <div id="iIsi"></div>`;
    let ring = null, data = null, verif = [];

    async function muat() {
      try {
        const [r, d, v] = await Promise.all([Data.ringkasanKeuangan(st.tahun), lengkap ? Data.iuranRekap(st.tahun) : null,
          kelola ? Data.pengajuanDaftar(false).then((x) => x.filter((p) => p.jenis === 'bukti_bayar')) : []]);
        ring = r; data = d; verif = v;
        kpiIuran(); tabs(); render();
      } catch (e) { gagal($('#iIsi'), e); }
    }
    function kpiIuran() {
      const b = ring.bulan_berjalan, bk = st.tahun === TH() ? BLN_KINI() : b;
      const pBulan = bk && ring.anggota_aktif ? Math.round(ring.per_bulan[bk - 1].lunas / ring.anggota_aktif * 1000) / 10 : 0;
      $('#iKpi').innerHTML = [
        kpi('navy', 'bi-wallet2', 'Iuran per Bulan', rp(ring.nominal_iuran), `${ring.anggota_aktif} anggota aktif`),
        kpi('teal', 'bi-piggy-bank', 'Terkumpul ' + st.tahun, fmt.rpSingkat(ring.iuran.terkumpul), `${fmt.num(ring.iuran.lunas)} pembayaran lunas`),
        kpi('amber', 'bi-graph-up-arrow', bk ? 'Lunas ' + BULAN[bk - 1] : 'Kepatuhan', fmt.num(pBulan) + '%', `${bk ? ring.per_bulan[bk - 1].lunas : 0} dari ${ring.anggota_aktif} anggota`),
        kpi('deep', 'bi-hourglass-split', 'Menunggu Verifikasi', fmt.num(ring.iuran.menunggu), `Menunggak: ${ring.iuran.menunggak} anggota`)].join('');
    }
    function tabs() {
      if (!kelola) return;
      const n = verif.filter((p) => p.status === 'menunggu').length;
      $('#iTabs').innerHTML = [['rekap', 'Rekap Iuran', 'bi-grid-3x3'], ['verifikasi', 'Verifikasi Bukti Transfer', 'bi-patch-check']].map(([k, l, ic]) =>
        `<button role="tab" aria-selected="${st.tab === k}" class="${st.tab === k ? 'active' : ''}" data-tab="${k}"><i class="bi ${ic}"></i> ${l}${k === 'verifikasi' ? ` <span class="n" style="${n ? 'background:var(--amber);color:#1F2937' : ''}">${n}</span>` : ''}</button>`).join('');
      $$('#iTabs [data-tab]').forEach((b) => b.onclick = () => { st.tab = b.dataset.tab; tabs(); render(); });
    }
    function render() {
      if (!lengkap) return ringkasanWakil();
      if (st.tab === 'verifikasi') return halVerifikasi();
      matriks();
    }

    function ringkasanWakil() {
      $('#iIsi').innerHTML = `<div class="dash-grid"><section class="card span-8"><div class="card-title"><h3>Persentase Anggota Lunas per Bulan</h3><span class="body-sm muted">Tahun ${st.tahun}</span></div><div class="chart-box"><canvas id="cIur"></canvas></div></section>
        <section class="card span-4"><div class="card-title"><h3>Ringkasan</h3></div><dl class="kv"><dt>Anggota aktif</dt><dd>${ring.anggota_aktif}</dd><dt>Terkumpul</dt><dd>${rp(ring.iuran.terkumpul)}</dd>
          <dt>Menunggu verifikasi</dt><dd>${ring.iuran.menunggu} bulan</dd><dt>Anggota menunggak</dt><dd>${ring.iuran.menunggak}</dd><dt>Total bulan tertunggak</dt><dd>${ring.iuran.bulan_tertunggak}</dd></dl>
          <div class="alert info" style="margin-top:16px"><i class="bi bi-shield-lock"></i><div>Rincian iuran per anggota hanya dapat dilihat Ketua & Bendahara (PRD §3.2).</div></div></section></div>`;
      grafikIuran('cIur', ring);
    }

    // ---- Matriks anggota × bulan ----
    const peta = () => { const m = {}; data.iuran.forEach((i) => { m[i.anggota_id + '-' + i.bulan] = i; }); return m; };
    const wajib = (a, b) => b <= bulanBerjalan(st.tahun) && `${st.tahun}-${String(b).padStart(2, '0')}-28` >= a.tanggal_gabung;
    const belumGabung = (a, b) => `${st.tahun}-${String(b).padStart(2, '0')}-28` < a.tanggal_gabung;
    function statistikBaris(a, P) {
      let lunas = 0, nunggak = 0;
      for (let b = 1; b <= 12; b++) { const i = P[a.id + '-' + b]; if (i && i.status === 'lunas') lunas++; else if (wajib(a, b)) nunggak++; }
      return { lunas, nunggak };
    }
    function matriks() {
      const P = peta();
      const qv = st.cari.toLowerCase();
      const rows = data.anggota.filter((a) => (!qv || (a.nama + ' ' + (a.sekolah || '')).toLowerCase().includes(qv)) && (!st.saring || (st.saring === 'tunggak' ? statistikBaris(a, P).nunggak > 0 : statistikBaris(a, P).nunggak === 0)));
      const sel = (a, b) => {
        const i = P[a.id + '-' + b];
        const lbl = `${a.nama}, ${BULAN[b - 1]} ${st.tahun}`;
        if (i && i.status === 'lunas') return `<button class="ic-cell lunas" data-a="${esc(a.id)}" data-b="${b}" title="Lunas ${i.metode} · ${i.tanggal_bayar ? fmt.tglPendek(i.tanggal_bayar) : ''}" aria-label="${esc(lbl)}: lunas ${i.metode}"><i class="bi bi-check-lg"></i>${i.metode === 'transfer' ? '<small>TF</small>' : ''}</button>`;
        if (i && i.status === 'menunggu') return `<button class="ic-cell tunggu" data-a="${esc(a.id)}" data-b="${b}" title="Bukti transfer menunggu verifikasi" aria-label="${esc(lbl)}: menunggu verifikasi"><i class="bi bi-hourglass-split"></i></button>`;
        if (belumGabung(a, b)) return '<span class="ic-cell na" title="Belum bergabung">·</span>';
        const kls = i && i.status === 'ditolak' ? 'tolak' : wajib(a, b) ? 'telat' : 'nanti';
        return `<button class="ic-cell ${kls}" data-a="${esc(a.id)}" data-b="${b}" ${kelola ? '' : 'disabled'} title="${kls === 'tolak' ? 'Bukti ditolak — belum lunas' : kls === 'telat' ? 'Belum bayar' : 'Belum jatuh tempo'}" aria-label="${esc(lbl)}: belum lunas">${kls === 'tolak' ? '<i class="bi bi-x-lg"></i>' : ''}</button>`;
      };
      const persen = Array.from({ length: 12 }, (_, i) => { const tot = data.anggota.filter((a) => wajib(a, i + 1)).length; const l = data.anggota.filter((a) => (P[a.id + '-' + (i + 1)] || {}).status === 'lunas').length; return i + 1 > bulanBerjalan(st.tahun) || !tot ? '' : Math.round(l / tot * 100) + '%'; });
      $('#iIsi').innerHTML = `<div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0">
          <div class="search"><i class="bi bi-search"></i><input class="input" id="iCari" value="${esc(st.cari)}" placeholder="Cari nama atau sekolah…" aria-label="Cari anggota"></div>
          <select class="select" id="iSar" aria-label="Saring"><option value="">Semua anggota</option><option value="tunggak" ${st.saring === 'tunggak' ? 'selected' : ''}>Ada tunggakan</option><option value="lunas" ${st.saring === 'lunas' ? 'selected' : ''}>Lunas s.d. bulan ini</option></select></div>
          <div class="legend-iuran"><span><span class="ic-cell lunas sm"><i class="bi bi-check-lg"></i></span> Lunas tunai</span><span><span class="ic-cell lunas sm"><i class="bi bi-check-lg"></i><small>TF</small></span> Lunas transfer</span>
            <span><span class="ic-cell tunggu sm"><i class="bi bi-hourglass-split"></i></span> Menunggu verifikasi</span><span><span class="ic-cell telat sm"></span> Belum bayar</span><span><span class="ic-cell nanti sm"></span> Belum jatuh tempo</span></div></div>
        <div class="card table-card"><div class="table-wrap iuran-wrap"><table class="tbl iuran-grid"><thead><tr><th class="stick">Anggota</th>${BLN.map((b, i) => `<th class="c ${i + 1 === BLN_KINI() && st.tahun === TH() ? 'kini' : ''}">${b}</th>`).join('')}<th class="num">Lunas</th>${kelola ? '<th class="c">Aksi</th>' : ''}</tr></thead>
          <tbody>${rows.length ? rows.map((a) => { const s = statistikBaris(a, P); return `<tr><td class="stick"><b>${esc(a.nama)}</b><div class="body-sm muted">${esc(a.sekolah || '')}</div></td>
            ${Array.from({ length: 12 }, (_, i) => `<td class="c">${sel(a, i + 1)}</td>`).join('')}
            <td class="num"><b>${s.lunas}</b>${s.nunggak ? `<div class="body-sm" style="color:var(--b-red-tx)">${s.nunggak} tunggak</div>` : ''}</td>
            ${kelola ? `<td class="c">${s.nunggak ? `<button class="btn btn-sm btn-ghost" data-lunasi="${esc(a.id)}" title="Lunasi semua bulan tertunggak">Lunasi ${s.nunggak}</button>` : '<span class="muted body-sm">—</span>'}</td>` : ''}</tr>`; }).join('')
            : `<tr><td colspan="${kelola ? 15 : 14}">${emptyState('Tidak ada anggota', 'Ubah kata kunci atau saringan.', 'bi-search')}</td></tr>`}</tbody>
          <tfoot><tr><td class="stick"><b>% lunas</b></td>${persen.map((p) => `<td class="c tabnum"><b>${p}</b></td>`).join('')}<td></td>${kelola ? '<td></td>' : ''}</tr></tfoot></table></div>
          <div class="tbl-foot"><span class="body-sm muted">${rows.length} anggota aktif · nominal ${rp(ring.nominal_iuran)}/bulan</span></div></div>`;
      $('#iCari').oninput = debounce((e) => { st.cari = e.target.value; matriks(); const c = $('#iCari'); c.focus(); c.setSelectionRange(c.value.length, c.value.length); }, 250);
      $('#iSar').onchange = (e) => { st.saring = e.target.value; matriks(); };
      $$('.iuran-grid [data-a]').forEach((b) => b.onclick = () => klikSel(b.dataset.a, Number(b.dataset.b), b));
      $$('[data-lunasi]').forEach((b) => b.onclick = () => lunasiSemua(data.anggota.find((a) => a.id === b.dataset.lunasi)));
    }

    async function klikSel(aid, bln, btn) {
      const a = data.anggota.find((x) => x.id === aid);
      const P = peta(); const i = P[aid + '-' + bln];
      if (i && i.status === 'menunggu') {
        if (!kelola) return toast('Bukti transfer sedang menunggu verifikasi Bendahara.', 'info');
        st.tab = 'verifikasi'; tabs(); render(); return;
      }
      if (!kelola) {
        if (i && i.status === 'lunas') toast(`${a.nama}: lunas ${i.metode}${i.tanggal_bayar ? ' pada ' + fmt.tgl(i.tanggal_bayar) : ''}.`, 'info');
        return;
      }
      if (i && i.status === 'lunas') {
        const r = await konfirmasi({ judul: 'Batalkan status lunas?', bahaya: true, ok: 'Batalkan lunas',
          pesan: `Iuran <b>${esc(a.nama)}</b> bulan <b>${BULAN[bln - 1]} ${st.tahun}</b> (${i.metode}${i.tanggal_bayar ? ', ' + fmt.tgl(i.tanggal_bayar) : ''}) akan dibatalkan. Entri pemasukan kas terkait ikut dihapus.` });
        if (!r.ok) return;
        try { await Data.batalkanLunas(i.id); data.iuran = data.iuran.filter((x) => x.id !== i.id); toast('Status lunas dibatalkan.', 'success'); matriks(); segarRingkas(); } catch (e) { toast(e.message, 'error'); }
        return;
      }
      if (bln > bulanBerjalan(st.tahun)) {
        const r = await konfirmasi({ judul: 'Bayar di muka?', ok: 'Tandai lunas', pesan: `Bulan <b>${BULAN[bln - 1]} ${st.tahun}</b> belum jatuh tempo. Tandai iuran <b>${esc(a.nama)}</b> lunas (tunai) sekarang?` });
        if (!r.ok) return;
      }
      // Optimistik: kotak langsung berubah, dibatalkan bila server menolak
      const sem = { id: 'tmp' + Date.now(), anggota_id: aid, tahun: st.tahun, bulan: bln, status: 'lunas', metode: 'tunai', tanggal_bayar: new Date().toISOString() };
      data.iuran = data.iuran.filter((x) => !(x.anggota_id === aid && x.bulan === bln)).concat([sem]);
      btn.className = 'ic-cell lunas'; btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      try {
        const r = await Data.tandaiLunas(aid, st.tahun, bln);
        Object.assign(sem, r.iuran || {});
        toast(`${a.nama} — ${BULAN[bln - 1]} lunas. Tercatat di Buku Kas.`, 'success', 2200);
        matriks(); segarRingkas();
      } catch (e) {
        data.iuran = data.iuran.filter((x) => x !== sem); if (i) data.iuran.push(i);
        toast(e.message, 'error'); matriks();
      }
    }
    async function lunasiSemua(a) {
      const P = peta();
      const bl = Array.from({ length: 12 }, (_, i) => i + 1).filter((b) => wajib(a, b) && !(P[a.id + '-' + b] && ['lunas', 'menunggu'].includes(P[a.id + '-' + b].status)));
      if (!bl.length) return toast('Tidak ada bulan yang bisa dilunasi.', 'info');
      const r = await konfirmasi({ judul: 'Lunasi tunggakan?', ok: `Tandai ${bl.length} bulan lunas`,
        pesan: `<b>${esc(a.nama)}</b> membayar tunai untuk <b>${bl.map((b) => BULAN[b - 1]).join(', ')}</b> sebesar <b>${rp(bl.length * ring.nominal_iuran)}</b>. Setiap bulan tercatat sebagai pemasukan kas.` });
      if (!r.ok) return;
      let ok = 0;
      for (const b of bl) { try { const x = await Data.tandaiLunas(a.id, st.tahun, b); data.iuran = data.iuran.filter((y) => !(y.anggota_id === a.id && y.bulan === b)).concat([x.iuran]); ok++; } catch (e) { toast(e.message, 'error'); break; } }
      toast(`${ok} bulan ditandai lunas untuk ${a.nama}.`, 'success'); matriks(); segarRingkas();
    }
    const segarRingkas = debounce(async () => { try { ring = await Data.ringkasanKeuangan(st.tahun); kpiIuran(); muatBadge(); } catch (e) { /* abaikan */ } }, 600);

    // ---- Verifikasi bukti transfer (Bendahara) ----
    function halVerifikasi() {
      const tunggu = verif.filter((p) => p.status === 'menunggu');
      const selesai = verif.filter((p) => p.status !== 'menunggu').slice(0, 10);
      const kartu = (p) => { const d = p.data_usulan || {};
        return `<article class="card verif-card" data-p="${esc(p.id)}"><div style="display:flex;gap:12px;align-items:center">${avatar(p.pengaju_nama || (p.pengaju || {}).nama)}
            <div style="flex:1;min-width:0"><b>${esc(p.pengaju_nama || (p.pengaju || {}).nama || '-')}</b><div class="body-sm muted">${esc(p.kode || '')} · ${fmt.relatif(p.dibuat_pada)}</div></div>
            <div style="text-align:right"><div class="tabnum" style="font-size:20px;font-weight:800">${rp(d.nominal)}</div><div class="body-sm muted">${[].concat(d.bulan || []).length} bulan</div></div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:14px 0">${[].concat(d.bulan || []).map((b) => `<span class="badge b-navy" style="text-transform:none;letter-spacing:0">${BULAN[b - 1]} ${d.tahun || ''}</span>`).join('')}</div>
          ${d.alasan ? `<p class="body-sm" style="font-style:italic;margin-bottom:12px">“${esc(d.alasan)}”</p>` : ''}
          <button class="btn btn-outline btn-block" data-lihat="${esc(p.id)}"><i class="bi bi-image"></i> Lihat bukti transfer</button>
          <div class="field" style="margin:14px 0 10px"><label for="vc${esc(p.id)}">Catatan keputusan <span class="req">*</span></label>
            <input class="input" id="vc${esc(p.id)}" data-cat="${esc(p.id)}" placeholder="Contoh: Sesuai mutasi rekening 12/11">
            <div class="chips-cepat">${['Sesuai mutasi rekening', 'Nominal tidak sesuai', 'Bukti tidak terbaca'].map((c) => `<button type="button" data-isi="${esc(p.id)}">${c}</button>`).join('')}</div><div class="err">Minimal 5 karakter.</div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn btn-danger-outline" data-v="0" data-id="${esc(p.id)}"><i class="bi bi-x-circle"></i> Tolak</button>
            <button class="btn btn-success" data-v="1" data-id="${esc(p.id)}"><i class="bi bi-check2-circle"></i> Verifikasi</button></div></article>`; };
      $('#iIsi').innerHTML = (tunggu.length ? `<div class="grid-3">${tunggu.map(kartu).join('')}</div>`
          : `<div class="card">${emptyState('Semua bukti sudah diverifikasi', 'Bukti transfer baru dari anggota akan muncul di sini dan di menu Persetujuan.', 'bi-patch-check')}</div>`)
        + (selesai.length ? `<section class="card" style="margin-top:20px"><div class="card-title"><h3>Keputusan Terakhir</h3></div>${selesai.map((p) => `<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0"><b>${esc(p.pengaju_nama || (p.pengaju || {}).nama || '-')}</b><div class="body-sm muted">${esc(p.ringkasan || '')}</div></div>${UI.badgeStatus(p.status)}</div>`).join('')}</section>` : '');
      const cari = (id) => verif.find((p) => p.id === id);
      $$('[data-lihat]').forEach((b) => b.onclick = () => { const p = cari(b.dataset.lihat); UI.lihatBerkas(p.lampiran_url, 'bukti-' + p.kode); });
      $$('[data-isi]').forEach((b) => b.onclick = () => { const i = $(`[data-cat="${b.dataset.isi}"]`); i.value = b.textContent; i.closest('.field').classList.remove('invalid'); });
      $$('[data-v]').forEach((b) => b.onclick = async () => {
        const p = cari(b.dataset.id), setuju = b.dataset.v === '1';
        const inp = $(`[data-cat="${p.id}"]`); const cat = inp.value.trim();
        if (cat.length < 5) { inp.closest('.field').classList.add('invalid'); inp.focus(); return; }
        const kartuEl = b.closest('.verif-card'); $$('button', kartuEl).forEach((x) => { x.disabled = true; });
        try {
          await Data.putuskanPengajuan(p.id, setuju, cat);
          p.status = setuju ? 'disetujui' : 'ditolak';
          toast(setuju ? `Iuran ${p.pengaju_nama || ''} terverifikasi & masuk kas.` : 'Bukti ditolak. Anggota diberi tahu untuk mengirim ulang.', 'success');
          kartuEl.style.transition = 'opacity .25s, transform .25s'; kartuEl.style.opacity = '0'; kartuEl.style.transform = 'scale(.97)';
          setTimeout(async () => { data = await Data.iuranRekap(st.tahun).catch(() => data); tabs(); render(); segarRingkas(); }, 260);
        } catch (e) { toast(e.message, 'error'); $$('button', kartuEl).forEach((x) => { x.disabled = false; }); }
      });
    }

    // ---- Ekspor ----
    if (lengkap) {
      const kol = () => [{ label: 'Nama', key: 'nama' }, { label: 'Sekolah', key: 'sekolah' }].concat(BLN.map((b, i) => ({ label: b, lebar: '34px', val: (a) => { const x = peta()[a.id + '-' + (i + 1)];
        return x && x.status === 'lunas' ? (x.metode === 'transfer' ? '✓TF' : '✓') : x && x.status === 'menunggu' ? '…' : belumGabung(a, i + 1) ? '' : wajib(a, i + 1) ? '✗' : ''; } })))
        .concat([{ label: 'Lunas', val: (a) => statistikBaris(a, peta()).lunas }, { label: 'Tunggakan', val: (a) => statistikBaris(a, peta()).nunggak ? rp(statistikBaris(a, peta()).nunggak * ring.nominal_iuran) : '-' }]);
      $('#iXls').onclick = () => data && UI.eksporCSV('rekap_iuran_' + st.tahun, kol(), data.anggota);
      $('#iPdf').onclick = async () => data && UI.cetak({ judul: 'Rekap Pembayaran Iuran Anggota', sub: `Tahun ${st.tahun} · ${rp(ring.nominal_iuran)}/bulan · ✓ lunas, TF transfer, … menunggu verifikasi, ✗ belum bayar`,
        kolom: kol(), rows: data.anggota, ttd: await UI.penandatangan(['ketua', 'bendahara']) });
    }
    $('#iTh').onchange = (e) => { st.tahun = Number(e.target.value); muat(); };
    muat();
  }

  // ==================================================================
  // TUNGGAKAN & PENGINGAT
  // ==================================================================
  const nomorWA = (hp) => { let n = String(hp || '').replace(/\D/g, ''); if (!n) return ''; if (n.startsWith('0')) n = '62' + n.slice(1); else if (n.startsWith('8')) n = '62' + n; return n; };

  async function halTunggakan() {
    const el = await shell('tunggakan', 'Tunggakan', 'Iuran belum lunas & pengingat');
    const kelola = adalah('bendahara');
    const st = { cari: '', min: '', halaman: 1, per: 15, urut: 'jumlah_bulan', naik: false };
    const [org] = await Promise.all([Data.org()]);
    el.innerHTML = `<div class="page-head"><div><h1>Tunggakan Iuran ${org.tahun_anggaran}</h1><p>Dihitung otomatis dari data iuran sampai bulan berjalan, sejak anggota bergabung. Tahun anggaran dapat diubah di Pengaturan.</p></div>
        <div class="acts"><button class="btn btn-outline" id="tXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button><button class="btn btn-outline" id="tPdf"><i class="bi bi-printer"></i> PDF</button></div></div>
      <div class="kpi-grid" id="tKpi">${Array.from({ length: 4 }, () => '<div class="skel" style="height:150px;border-radius:16px"></div>').join('')}</div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="tCari" placeholder="Cari nama atau sekolah…" aria-label="Cari anggota"></div>
        <select class="select" id="tMin" aria-label="Lama tunggakan"><option value="">Semua tunggakan</option><option value="2">≥ 2 bulan</option><option value="3">≥ 3 bulan</option><option value="6">≥ 6 bulan</option></select></div></div>
      <div id="tBulk"></div><div id="tTabel"></div>`;
    let data = null;
    const ringkas = () => {
      const tot = data.reduce((s, r) => s + Number(r.total_tunggakan), 0), bln = data.reduce((s, r) => s + r.jumlah_bulan, 0);
      $('#tKpi').innerHTML = [kpi('amber', 'bi-exclamation-diamond', 'Anggota Menunggak', fmt.num(data.length), 'orang'),
        kpi('navy', 'bi-cash-coin', 'Total Tunggakan', fmt.rpSingkat(tot), `${fmt.num(bln)} bulan tertunggak`),
        kpi('teal', 'bi-telephone', 'Bisa Dihubungi WA', fmt.num(data.filter((r) => nomorWA(r.no_hp)).length), `${data.filter((r) => r.email).length} memiliki email`),
        `<div class="kpi deep" id="tAntre"><span class="ic"><i class="bi bi-envelope-paper"></i></span><div class="lbl">Antrean Email (7 hari)</div><div class="val" style="font-size:26px">…</div><div class="sub">Memuat status…</div></div>`].join('');
      muatAntrean();
    };
    async function muatAntrean() {
      const box = $('#tAntre'); if (!box) return;
      try {
        const s = await Data.statusAntrean();
        box.innerHTML = `<span class="ic"><i class="bi bi-envelope-paper"></i></span><div class="lbl">Antrean Email (7 hari)</div><div class="val" style="font-size:26px">${fmt.num(s.terkirim)}<small>terkirim</small></div>
          <div class="sub">${s.menunggu} menunggu · ${s.gagal} gagal · kuota hari ini ${s.kuota_tersisa}${kelola && s.menunggu ? ' · <button class="btn btn-sm" id="tProses" style="background:rgba(255,255,255,.18);color:#fff;min-height:28px;padding:2px 10px">Kirim sekarang</button>' : ''}</div>`;
        if ($('#tProses')) $('#tProses').onclick = async (e) => { e.target.disabled = true; try { const r = await Data.prosesAntreanKini(); toast(`${(r && r.terkirim) || 0} email terkirim.`, 'success'); } catch (er) { toast(er.message, 'error'); } muatAntrean(); };
      } catch (e) { box.querySelector('.sub').textContent = 'Status antrean tidak tersedia (' + e.message + ')'; box.querySelector('.val').textContent = '—'; }
    }
    const pesanWA = (r) => `Assalamu'alaikum, Yth. ${r.nama}.\n\nKami mengingatkan iuran ${org.singkatan || 'KKG PJOK'} bulan ${r.bulan_tertunggak.map((b) => BULAN[b - 1]).join(', ')} ${r.tahun} sebesar ${rp(r.total_tunggakan)} belum tercatat lunas.\n\nPembayaran dapat tunai kepada Bendahara atau transfer, lalu unggah bukti di menu "Iuran Saya" pada aplikasi KKG.\n\nTerima kasih.\nBendahara ${org.singkatan || ''}`;
    const t = UI.tabel({ el: $('#tTabel'), state: st, pilih: kelola, idKey: 'anggota_id',
      kosong: { judul: 'Tidak ada tunggakan', pesan: 'Semua anggota aktif sudah lunas sampai bulan berjalan. 🎉', ikon: 'bi-emoji-smile' },
      kolom: [
        { key: 'nama', label: 'Anggota', sort: true, render: (r) => `<b>${esc(r.nama)}</b><div class="body-sm muted">${esc(r.sekolah || '')}</div>` },
        { key: 'bulan_tertunggak', label: 'Bulan Tertunggak', render: (r) => `<div style="display:flex;gap:4px;flex-wrap:wrap;max-width:320px">${r.bulan_tertunggak.map((b) => `<span class="badge b-red" style="text-transform:none;letter-spacing:0">${BLN[b - 1]}</span>`).join('')}</div>` },
        { key: 'jumlah_bulan', label: 'Lama', sort: true, cls: 'num', render: (r) => `<b>${r.jumlah_bulan}</b> bln` },
        { key: 'total_tunggakan', label: 'Total', sort: true, cls: 'num', render: (r) => `<b class="tabnum" style="color:var(--b-red-tx)">${rp(r.total_tunggakan)}</b>` }],
      aksi: (r) => { const wa = nomorWA(r.no_hp);
        return `${wa ? `<a class="btn btn-sm btn-wa" href="https://wa.me/${wa}?text=${encodeURIComponent(pesanWA(r))}" target="_blank" rel="noopener" aria-label="Kirim WhatsApp ke ${esc(r.nama)}"><i class="bi bi-whatsapp"></i> WA</a>` : '<span class="badge b-slate" title="No. WhatsApp belum diisi">Tanpa WA</span>'}
          ${kelola ? `<a class="btn btn-sm btn-ghost" href="#/app/iuran" title="Buka rekap iuran untuk menandai lunas">Lunasi</a>` : ''}`; },
      muat: async (s) => {
        if (!data) { data = await Data.tunggakan(); ringkas(); }
        return UI.saringLokal(data, s, { cari: ['nama', 'sekolah'], filter: { min: (x, v) => x.jumlah_bulan >= Number(v) } });
      },
      onPilih: (sel) => {
        if (!kelola) return;
        const email = sel.filter((r) => r.email).length;
        $('#tBulk').innerHTML = sel.length ? `<div class="bulkbar"><b>${sel.length} anggota dipilih</b><span class="body-sm" style="opacity:.85">${email} punya email</span><span class="sp"></span>
          <button class="btn btn-sm btn-teal-solid" id="tKirim" ${email ? '' : 'disabled'}><i class="bi bi-envelope"></i> Kirim Pengingat Email</button>
          <button class="btn btn-sm btn-ghost btn-icon" id="tBatal" aria-label="Batalkan pilihan"><i class="bi bi-x-lg"></i></button></div>` : '';
        if (!sel.length) return;
        $('#tBatal').onclick = () => t.bersihkanPilihan();
        $('#tKirim').onclick = async () => {
          const r = await konfirmasi({ judul: 'Kirim pengingat iuran?', ok: `Kirim ke ${email} anggota`,
            pesan: `Email pengingat berisi rincian bulan & total tunggakan akan masuk <b>antrean</b> dan dikirim bertahap sesuai kuota Gmail (±100/hari). ${sel.length - email ? `<br><br>${sel.length - email} anggota tanpa email dilewati — gunakan tombol WA.` : ''}` });
          if (!r.ok) return;
          $('#tKirim').disabled = true;
          try { const out = await Data.kirimPengingat(sel.filter((x) => x.email).map((x) => x.anggota_id)); toast(out.message || 'Pengingat masuk antrean.', 'success', 5000); t.bersihkanPilihan(); muatAntrean(); }
          catch (e) { toast(e.message, 'error'); if ($('#tKirim')) $('#tKirim').disabled = false; }
        };
      } });
    $('#tCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
    $('#tMin').onchange = (e) => { st.min = e.target.value; t.muat(true); };
    const kolEk = [{ label: 'Nama', key: 'nama' }, { label: 'Sekolah', key: 'sekolah' }, { label: 'Bulan Tertunggak', val: (r) => r.bulan_tertunggak.map((b) => BLN[b - 1]).join(', ') },
      { label: 'Jumlah Bulan', key: 'jumlah_bulan' }, { label: 'Total', val: (r) => rp(r.total_tunggakan) }, { label: 'No. HP', key: 'no_hp' }];
    const semua = () => UI.saringLokal(data || [], Object.assign({}, st, { halaman: 1, per: 1e9 }), { cari: ['nama', 'sekolah'], filter: { min: (x, v) => x.jumlah_bulan >= Number(v) } }).semua;
    $('#tXls').onclick = () => UI.eksporCSV('tunggakan_iuran_' + org.tahun_anggaran, kolEk, semua());
    $('#tPdf').onclick = async () => UI.cetak({ judul: 'Daftar Tunggakan Iuran Anggota', sub: `Tahun anggaran ${org.tahun_anggaran} · per ${fmt.tgl(new Date())}`, kolom: kolEk, rows: semua(), ttd: await UI.penandatangan(['ketua', 'bendahara']) });
  }

  // ==================================================================
  // IURAN SAYA (anggota)
  // ==================================================================
  async function halIuranSaya() {
    const el = await shell('iuran-saya', 'Iuran Saya', 'Status & bukti pembayaran');
    if (!Auth.profil.anggota_id) {
      el.innerHTML = `<div class="card" style="max-width:640px">${emptyState('Akun belum ditautkan', 'Akun Anda belum terhubung ke data anggota. Hubungi Admin IT.', 'bi-link-45deg')}</div>`; return;
    }
    const st = { tahun: TH() };
    el.innerHTML = `<div class="page-head"><div><h1>Iuran Saya</h1><p>Status iuran bulanan Anda. Bayar tunai ke Bendahara, atau transfer lalu kirim buktinya di sini.</p></div>
        <div class="acts"><select class="select" id="sTh" style="width:auto" aria-label="Tahun">${opsiTahun(st.tahun)}</select><button class="btn btn-primary" id="sKirim"><i class="bi bi-cloud-upload"></i> Kirim Bukti Transfer</button></div></div>
      <div class="dash-grid"><section class="card span-8"><div class="card-title"><h3 id="sJudul">Kalender Iuran</h3><span class="body-sm muted" id="sNom"></span></div><div class="bulan-grid" id="sGrid"><div class="skel skel-block" style="height:220px;grid-column:1/-1"></div></div></section>
        <section class="card span-4"><div class="card-title"><h3>Ringkasan</h3></div><div id="sRing"></div></section>
        <section class="card span-12"><div class="card-title"><h3>Riwayat Pengiriman Bukti</h3></div><div id="sRiw"></div></section></div>`;
    let iuran = [], org = null, riw = [];
    const P = () => Object.fromEntries(iuran.map((i) => [i.bulan, i]));
    async function muat() {
      try {
        [iuran, org, riw] = await Promise.all([Data.iuranSaya(st.tahun), Data.org(), Data.pengajuanDaftar(true).then((x) => x.filter((p) => p.jenis === 'bukti_bayar'))]);
        render();
      } catch (e) { gagal($('#sGrid'), e); }
    }
    function render() {
      const p = P(), batas = bulanBerjalan(st.tahun), gabung = (Auth.profil.anggota || {}).tanggal_gabung || '1900-01-01';
      const status = (b) => p[b] ? p[b].status : `${st.tahun}-${String(b).padStart(2, '0')}-28` < gabung ? 'na' : b <= batas ? 'belum' : 'nanti';
      const LBL = { lunas: ['Lunas', 'bi-check-circle-fill'], menunggu: ['Diverifikasi', 'bi-hourglass-split'], ditolak: ['Ditolak', 'bi-x-circle-fill'], belum: ['Belum bayar', 'bi-exclamation-circle'], nanti: ['Belum jatuh tempo', 'bi-circle'], na: ['—', 'bi-dash'] };
      $('#sNom').textContent = rp(org.nominal_iuran) + ' / bulan';
      $('#sJudul').textContent = 'Kalender Iuran ' + st.tahun;
      $('#sGrid').innerHTML = BULAN.map((b, i) => { const s = status(i + 1); const x = p[i + 1];
        return `<div class="bln-card ${s}"><div class="nm">${b}</div><i class="bi ${LBL[s][1]}"></i><div class="st">${LBL[s][0]}</div>${x && x.status === 'lunas' ? `<div class="mt">${x.metode}${x.tanggal_bayar ? ' · ' + fmt.tglPendek(x.tanggal_bayar) : ''}</div>` : x && x.status === 'ditolak' && x.catatan ? `<div class="mt">${esc(x.catatan)}</div>` : ''}</div>`; }).join('');
      const nLunas = iuran.filter((i) => i.status === 'lunas').length, nTunggu = iuran.filter((i) => i.status === 'menunggu').length;
      const tunggak = Array.from({ length: 12 }, (_, i) => i + 1).filter((b) => ['belum', 'ditolak'].includes(status(b)) && b <= batas);
      $('#sRing').innerHTML = `<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px"><div class="ring" style="--p:${batas ? Math.round(nLunas / Math.max(1, Array.from({ length: batas }, (_, i) => status(i + 1)).filter((s) => s !== 'na').length) * 100) : 0}"><span>${nLunas}</span></div>
          <div><b>${nLunas} bulan lunas</b><div class="body-sm muted">${nTunggu} sedang diverifikasi</div></div></div>
        ${tunggak.length ? `<div class="alert warning"><i class="bi bi-exclamation-triangle"></i><div>Tunggakan: <b>${tunggak.map((b) => BULAN[b - 1]).join(', ')}</b><br>Total <b>${rp(tunggak.length * org.nominal_iuran)}</b></div></div>`
          : '<div class="alert success"><i class="bi bi-emoji-smile"></i><div>Terima kasih! Iuran Anda lunas sampai bulan ini.</div></div>'}
        <p class="help" style="margin-top:12px">Bendahara: ${esc(org.telepon || '-')}</p>`;
      $('#sRiw').innerHTML = riw.length ? riw.map((r) => `<div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">
          <span class="icon-tile ${r.status === 'disetujui' ? 'teal' : r.status === 'ditolak' ? 'red' : 'amber'}"><i class="bi bi-receipt"></i></span>
          <div style="flex:1;min-width:180px"><b>${esc(r.ringkasan || '')}</b><div class="body-sm muted">${esc(r.kode || '')} · ${fmt.tgl(r.dibuat_pada)}${r.keputusan_terakhir && r.keputusan_terakhir.catatan ? ' · “' + esc(r.keputusan_terakhir.catatan) + '”' : ''}</div></div>
          ${UI.badgeStatus(r.status)}</div>`).join('') : emptyState('Belum ada pengiriman bukti', 'Bukti transfer yang Anda kirim akan tercatat di sini.', 'bi-receipt');
    }
    $('#sTh').onchange = (e) => { st.tahun = Number(e.target.value); muat(); };
    $('#sKirim').onclick = () => {
      const p = P(), batas = Math.min(12, bulanBerjalan(st.tahun) + 2);
      const bisa = Array.from({ length: 12 }, (_, i) => i + 1).filter((b) => !p[b] || p[b].status === 'ditolak');
      let berkas = null;
      modal({
        judul: 'Kirim Bukti Transfer Iuran', wide: true,
        isi: `<div class="alert info" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><div>Satu bukti boleh untuk beberapa bulan. Bendahara memverifikasi; jika disetujui status langsung <b>Lunas</b> dan tercatat di kas.</div></div>
          <div class="field"><span class="label">Bulan yang dibayar (${st.tahun}) <span class="req">*</span></span>
            <div class="bulan-pilih">${BULAN.map((b, i) => { const ok = bisa.includes(i + 1); return `<label class="${ok ? '' : 'off'}"><input type="checkbox" value="${i + 1}" ${ok ? '' : 'disabled'} ${ok && i + 1 <= bulanBerjalan(st.tahun) && i + 1 === bisa.find((x) => x <= batas) ? 'checked' : ''}><span>${BLN[i]}</span></label>`; }).join('')}</div>
            <div class="help" id="bTotal"></div><div class="err">Pilih minimal satu bulan.</div></div>
          <div class="field"><span class="label">Foto / PDF bukti transfer <span class="req">*</span></span>
            <label class="dropzone" for="bF"><span class="preview" id="bFP"><i class="bi bi-image"></i></span><span id="bFN"><b>Pilih bukti transfer</b><br><span class="help">JPG/PNG/PDF · maks 5 MB</span></span></label>
            <input type="file" id="bF" class="sr-only" accept="image/jpeg,image/png,application/pdf"></div>
          <div class="field"><label for="bC">Catatan (opsional)</label><input class="input" id="bC" placeholder="Contoh: Transfer dari rekening BRI a.n. istri"></div>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="bGo"><i class="bi bi-send"></i> Kirim Bukti</button>',
        onOpen: (m, close) => {
          const pilih = () => $$('.bulan-pilih input:checked', m).map((c) => Number(c.value));
          const total = () => { const n = pilih().length; $('#bTotal', m).innerHTML = n ? `${n} bulan × ${rp(org.nominal_iuran)} = <b>${rp(n * org.nominal_iuran)}</b>` : ''; };
          $$('.bulan-pilih input', m).forEach((c) => c.onchange = () => { total(); c.closest('.field').classList.remove('invalid'); });
          total();
          const inp = $('#bF', m);
          inp.onchange = async () => { try { berkas = await UI.siapkanBerkas(inp.files[0]); $('#bFP', m).innerHTML = berkas.mime.startsWith('image/') ? `<img src="${berkas.dataUrl}" alt="">` : '<i class="bi bi-filetype-pdf" style="color:var(--danger)"></i>'; $('#bFN', m).innerHTML = `<b>${esc(berkas.nama)}</b><br><span class="help">Siap dikirim</span>`; } catch (e) { berkas = null; toast(e.message, 'error'); } };
          $('#bGo', m).onclick = async () => {
            const bl = pilih();
            if (!bl.length) { $('.bulan-pilih', m).closest('.field').classList.add('invalid'); return; }
            if (!berkas) return toast('Pilih foto atau PDF bukti transfer.', 'warning');
            const btn = $('#bGo', m); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Mengunggah…';
            try {
              const up = await Data.upload('bukti', { base64: berkas.base64, mime: berkas.mime, nama: berkas.nama, dataUrl: berkas.dataUrl });
              const r = await Data.ajukanBuktiIuran(st.tahun, bl, up.url, $('#bC', m).value.trim());
              close(); toast(`Bukti terkirim (${r.kode || ''}). Bendahara akan memverifikasi.`, 'success'); muat();
            } catch (e) { toast(e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="bi bi-send"></i> Kirim Bukti'; }
          };
        }
      });
    };
    muat();
  }

  Object.assign(window.AppPages, { kas: halKas, iuran: halIuran, tunggakan: halTunggakan, 'iuran-saya': halIuranSaya });
})();
