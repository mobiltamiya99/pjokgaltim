/* =====================================================================
   UI — komponen bersama untuk semua modul:
   tabel data, drawer, pratinjau berkas, ekspor CSV/Excel, cetak PDF berkop
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, modal, emptyState, toast } = window.K;

  // ------------------------------------------------------------------
  // Badge status generik
  // ------------------------------------------------------------------
  const STATUS = {
    menunggu: ['b-amber', 'Menunggu'], disetujui: ['b-green', 'Disetujui'], ditolak: ['b-red', 'Ditolak'],
    aktif: ['b-teal', 'Akun Aktif'], lunas: ['b-green', 'Lunas'], draf: ['b-slate', 'Draf'], terbit: ['b-teal', 'Terbit']
  };
  function badgeStatus(s, label) {
    const [c, l] = STATUS[s] || ['b-slate', s || '-'];
    return `<span class="badge ${c}">${s === 'menunggu' ? '<span class="dot pulse"></span>' : ''}${esc(label || l)}</span>`;
  }

  // ------------------------------------------------------------------
  // Tabel data
  //   kolom: [{ key, label, sort, render(row), cls, mobile }]
  //   muat(state) → { rows, total }
  // ------------------------------------------------------------------
  function tabel(opt) {
    // Pakai objek state milik halaman (bukan salinan) agar filter yang diubah halaman ikut terbaca
    const st = opt.state || {};
    Object.entries({ halaman: 1, per: 10, urut: null, naik: true }).forEach(([k, v]) => { if (st[k] === undefined) st[k] = v; });
    const pilihan = new Set();
    let rows = [];
    const id = 'tb' + Math.random().toString(36).slice(2, 7);
    const ncol = opt.kolom.length + (opt.pilih ? 1 : 0) + (opt.aksi ? 1 : 0);

    opt.el.innerHTML = `
      <div class="card table-card"><div class="table-wrap"><table class="tbl stack" id="${id}">
        <thead><tr>
          ${opt.pilih ? `<th style="width:44px"><input type="checkbox" class="cbx" data-all aria-label="Pilih semua"></th>` : ''}
          ${opt.kolom.map((k) => `<th class="${k.sort ? 'sortable' : ''} ${k.cls || ''}" ${k.sort ? `data-sort="${k.key}" tabindex="0" aria-sort="none"` : ''} ${k.lebar ? `style="width:${k.lebar}"` : ''}>${esc(k.label)}${k.sort ? ' <i class="bi bi-arrow-down-up" aria-hidden="true"></i>' : ''}</th>`).join('')}
          ${opt.aksi ? '<th class="col-aksi" style="text-align:right">Aksi</th>' : ''}
        </tr></thead><tbody></tbody></table></div>
        <div class="tbl-foot"><span class="body-sm muted" data-info></span><div class="pager" data-pager></div></div></div>`;
    const tb = $('tbody', opt.el);

    const api = {
      state: st,
      rows: () => rows,
      terpilih: () => rows.filter((r) => pilihan.has(String(r[opt.idKey || 'id']))),
      bersihkanPilihan: () => { pilihan.clear(); syncPilih(); },
      async muat(reset) {
        if (reset) st.halaman = 1;
        tb.innerHTML = Array.from({ length: Math.min(st.per, 6) }, () => `<tr><td colspan="${ncol}" class="no-label"><div class="skel skel-line"></div></td></tr>`).join('');
        try {
          const r = await opt.muat(st);
          rows = r.rows; render(r.total);
        } catch (e) {
          tb.innerHTML = `<tr><td colspan="${ncol}" class="no-label"><div class="alert error"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div></td></tr>`;
        }
      }
    };

    function render(total) {
      const idk = opt.idKey || 'id';
      tb.innerHTML = rows.length ? rows.map((r) => `<tr data-id="${esc(r[idk])}">
          ${opt.pilih ? `<td class="no-label"><input type="checkbox" class="cbx" data-row="${esc(r[idk])}" ${pilihan.has(String(r[idk])) ? 'checked' : ''} aria-label="Pilih baris"></td>` : ''}
          ${opt.kolom.map((k) => `<td data-label="${esc(k.label)}" class="${k.cls || ''}">${k.render ? k.render(r) : esc(r[k.key] ?? '-')}</td>`).join('')}
          ${opt.aksi ? `<td class="no-label col-aksi"><div class="actions">${opt.aksi(r)}</div></td>` : ''}</tr>`).join('')
        : `<tr><td colspan="${ncol}" class="no-label">${emptyState((opt.kosong || {}).judul || 'Tidak ada data', (opt.kosong || {}).pesan || 'Ubah kata kunci atau filter pencarian.', (opt.kosong || {}).ikon || 'bi-search')}</td></tr>`;

      const hal = Math.max(1, Math.ceil(total / st.per));
      $('[data-info]', opt.el).textContent = total ? `Menampilkan ${(st.halaman - 1) * st.per + 1}–${Math.min(st.halaman * st.per, total)} dari ${fmt.num(total)} data` : '';
      const nomor = Array.from({ length: hal }, (_, i) => i + 1).filter((i) => i === 1 || i === hal || Math.abs(i - st.halaman) <= 1);
      let prev = 0;
      $('[data-pager]', opt.el).innerHTML = hal <= 1 ? '' :
        `<button ${st.halaman <= 1 ? 'disabled' : ''} data-pg="${st.halaman - 1}" aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>`
        + nomor.map((i) => { const gap = i - prev > 1 ? '<span class="muted" style="padding:0 4px">…</span>' : ''; prev = i; return gap + `<button class="${i === st.halaman ? 'active' : ''}" data-pg="${i}" ${i === st.halaman ? 'aria-current="page"' : ''}>${i}</button>`; }).join('')
        + `<button ${st.halaman >= hal ? 'disabled' : ''} data-pg="${st.halaman + 1}" aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button>`;
      $$('[data-pg]', opt.el).forEach((b) => b.onclick = () => { st.halaman = Number(b.dataset.pg); api.muat(); });

      $$('[data-row]', opt.el).forEach((c) => c.onchange = () => { c.checked ? pilihan.add(c.dataset.row) : pilihan.delete(c.dataset.row); syncPilih(); });
      syncPilih();
      $$('th[data-sort]', opt.el).forEach((th) => th.setAttribute('aria-sort', th.dataset.sort === st.urut ? (st.naik ? 'ascending' : 'descending') : 'none'));
      opt.onRender && opt.onRender(rows, api);
    }

    function syncPilih() {
      const all = $('[data-all]', opt.el);
      if (all) {
        const ids = rows.map((r) => String(r[opt.idKey || 'id']));
        all.checked = ids.length > 0 && ids.every((i) => pilihan.has(i));
        all.indeterminate = !all.checked && ids.some((i) => pilihan.has(i));
      }
      opt.onPilih && opt.onPilih(api.terpilih());
    }

    const all = $('[data-all]', opt.el);
    if (all) all.onchange = () => { rows.forEach((r) => { const i = String(r[opt.idKey || 'id']); all.checked ? pilihan.add(i) : pilihan.delete(i); }); $$('[data-row]', opt.el).forEach((c) => { c.checked = all.checked; }); syncPilih(); };
    $$('th[data-sort]', opt.el).forEach((th) => {
      const go = () => { st.naik = st.urut === th.dataset.sort ? !st.naik : true; st.urut = th.dataset.sort; api.muat(); };
      th.onclick = go; th.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
    api.muat();
    return api;
  }

  // Penyaring & pengurut lokal (untuk data kecil yang sudah di memori — instan)
  function saringLokal(data, st, { cari = [], filter = {} } = {}) {
    let r = data;
    const q = String(st.cari || '').trim().toLowerCase();
    if (q) r = r.filter((x) => cari.some((k) => String(x[k] ?? '').toLowerCase().includes(q)));
    Object.entries(filter).forEach(([k, fn]) => { if (st[k]) r = r.filter((x) => fn(x, st[k])); });
    if (st.urut) r = [...r].sort((a, b) => String(a[st.urut] ?? '').localeCompare(String(b[st.urut] ?? ''), 'id', { numeric: true }) * (st.naik ? 1 : -1));
    return { rows: r.slice((st.halaman - 1) * st.per, st.halaman * st.per), total: r.length, semua: r };
  }

  // ------------------------------------------------------------------
  // Drawer kanan
  // ------------------------------------------------------------------
  function drawer({ judul, isi, foot = '', onOpen }) {
    const bd = document.createElement('div');
    bd.className = 'drawer-backdrop';
    const dr = document.createElement('aside');
    dr.className = 'side-drawer';
    dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true'); dr.setAttribute('aria-label', judul);
    dr.innerHTML = `<div class="modal-head"><h3>${esc(judul)}</h3><button class="btn btn-ghost btn-icon" data-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div>
      <div class="drawer-body">${isi}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}`;
    const close = () => { bd.remove(); dr.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    bd.onclick = close;
    dr.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(bd, dr);
    $('[data-close]', dr).focus();
    onOpen && onOpen(dr, close);
    return { el: dr, close };
  }

  // ------------------------------------------------------------------
  // Pratinjau berkas dalam modal (gambar / PDF) + unduh
  // ------------------------------------------------------------------
  async function lihatBerkas(url, nama = 'berkas') {
    const m = modal({ judul: 'Pratinjau Berkas', wide: true, isi: '<div style="display:grid;place-items:center;min-height:320px"><div class="spinner"></div></div>' });
    try {
      const r = await window.KKG.Data.bukaBerkas(url);
      const src = r.dataUrl || r.url;
      const pdf = (r.mime || '').includes('pdf') || /\.pdf($|\?)/i.test(src) || /\/file\/d\//.test(src) || /^data:text\/html/.test(src);
      const body = $('.modal-body', m.el);
      body.innerHTML = pdf
        ? `<iframe src="${esc(src.replace('/view', '/preview'))}" title="Pratinjau PDF" style="width:100%;height:70vh;border:0;border-radius:12px;background:var(--surface-2)"></iframe>`
        : `<img src="${esc(src)}" alt="Pratinjau ${esc(nama)}" style="max-height:70vh;margin:auto;border-radius:12px" referrerpolicy="no-referrer">`;
      const foot = document.createElement('div');
      foot.className = 'modal-foot';
      foot.innerHTML = `<button class="btn btn-ghost" data-close>Tutup</button><a class="btn btn-primary" href="${esc(src)}" download="${esc(r.nama || nama)}" target="_blank" rel="noopener"><i class="bi bi-download"></i> Unduh</a>`;
      $('.modal', m.el).appendChild(foot);
    } catch (e) {
      $('.modal-body', m.el).innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div>`;
    }
  }

  // ------------------------------------------------------------------
  // Ekspor CSV (dibuka langsung oleh Excel, ber-BOM UTF-8, pemisah ;)
  // ------------------------------------------------------------------
  function eksporCSV(namaFile, kolom, rows) {
    const sel = (v) => { const s = String(v ?? '').replace(/"/g, '""'); return /[;"\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${/^[=+\-@]/.test(s) ? "'" + s : s}"` : s; };
    const isi = [kolom.map((k) => sel(k.label)).join(';')]
      .concat(rows.map((r) => kolom.map((k) => sel(k.val ? k.val(r) : r[k.key])).join(';'))).join('\r\n');
    const blob = new Blob(['﻿' + isi], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = namaFile.replace(/\s+/g, '_') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`${rows.length} baris diekspor ke ${a.download}`, 'success');
  }

  // Baca CSV (pemisah , atau ; otomatis, mendukung tanda kutip)
  function bacaCSV(teks) {
    teks = teks.replace(/^﻿/, '');
    const baris1 = teks.split(/\r?\n/)[0] || '';
    const sep = (baris1.match(/;/g) || []).length > (baris1.match(/,/g) || []).length ? ';' : ',';
    const out = []; let row = [], sel = '', kutip = false;
    for (let i = 0; i < teks.length; i++) {
      const c = teks[i];
      if (kutip) { if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; } else if (c === '"') kutip = false; else sel += c; }
      else if (c === '"') kutip = true;
      else if (c === sep) { row.push(sel); sel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; row.push(sel); out.push(row); row = []; sel = ''; }
      else sel += c;
    }
    if (sel || row.length) { row.push(sel); out.push(row); }
    const rows = out.filter((r) => r.some((x) => x.trim() !== ''));
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }

  // ------------------------------------------------------------------
  // Cetak / Simpan PDF dengan kop organisasi (via dialog cetak browser)
  // ------------------------------------------------------------------
  // Susun HTML dokumen berkop. Tata letak memakai tabel agar sama rapinya
  // saat dicetak browser maupun saat diubah ke PDF oleh Google Apps Script.
  async function htmlDokumen({ judul, sub = '', body, ttd = [], landscape = false, meta = '', ringkasan = [] }) {
    const org = await window.KKG.Data.org();
    const now = new Date();
    const jam = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const logo = org.logo_url ? `<img src="${esc(org.logo_url)}" alt="" style="width:64px;height:64px;object-fit:contain">`
      : '<div style="width:64px;height:64px;background:#173D72;color:#fff;border-radius:10px;text-align:center;line-height:64px;font-weight:800;font-size:20px">KKG</div>';
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(judul)}</title>
      <style>
        @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 16mm 14mm 18mm; @bottom-right { content: "Halaman " counter(page) " dari " counter(pages); font: 9pt Arial; color: #555; } }
        body { font: 10pt Arial, Helvetica, sans-serif; color: #111; margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        .kop td { border: 0; padding: 0 0 8px; vertical-align: middle; }
        .kop h1 { margin: 0; font-size: 15pt; color: #173D72; letter-spacing: .02em; }
        .kop p { margin: 2px 0 0; font-size: 9pt; color: #333; }
        .garis { border-top: 3px double #173D72; height: 0; margin: 0 0 4px; }
        h2 { text-align: center; font-size: 13pt; margin: 14px 0 2px; text-transform: uppercase; }
        .sub { text-align: center; font-size: 9.5pt; color: #444; margin-bottom: 12px; }
        .data th { background: #173D72; color: #fff; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .03em; padding: 6px; border: 1px solid #173D72; text-align: left; }
        .data td { border: 1px solid #C9D3E0; padding: 5px 6px; font-size: 9pt; vertical-align: top; }
        .data td.num, .data th.num { text-align: right; white-space: nowrap; }
        .data tr.total td { font-weight: bold; background: #EEF2F7; }
        tr { page-break-inside: avoid; } thead { display: table-header-group; }
        .rk { margin-bottom: 12px; } .rk td { border: 1px solid #C9D3E0; padding: 6px 8px; font-size: 9pt; width: 25%; }
        .rk b { display: block; font-size: 12pt; color: #173D72; }
        .kv td { border: 0; padding: 3px 6px; } .kv td:first-child { width: 150px; color: #444; }
        .isi { line-height: 1.6; font-size: 10.5pt; white-space: pre-wrap; margin-top: 12px; }
        .meta td { border: 0; font-size: 8.5pt; color: #555; padding-top: 8px; }
        .ttd { margin-top: 30px; page-break-inside: avoid; } .ttd td { border: 0; text-align: center; vertical-align: top; font-size: 10pt; }
        .ttd .nm { padding-top: 64px; font-weight: bold; text-decoration: underline; }
      </style></head><body>
      <table class="kop"><tr><td style="width:76px">${logo}</td>
        <td><h1>${esc((org.nama || '').toUpperCase())}</h1><p>${esc(org.instansi_pembina || '')}</p><p>${esc(org.alamat || '')}${org.email ? ' · ' + esc(org.email) : ''}${org.telepon ? ' · ' + esc(org.telepon) : ''}</p></td></tr></table>
      <div class="garis"></div>
      <h2>${esc(judul)}</h2><div class="sub">${esc(sub)}</div>
      ${ringkasan.length ? `<table class="rk"><tr>${ringkasan.map(([k, v]) => `<td>${esc(k)}<b>${esc(v)}</b></td>`).join('')}</tr></table>` : ''}
      ${body}
      <table class="meta"><tr><td>${meta}</td><td style="text-align:right">Dicetak: ${fmt.tgl(now)} ${jam} WIB</td></tr></table>
      ${ttd.length ? `<table class="ttd"><tr>${ttd.map((t) => `<td>${t.kota ? esc(t.kota) + '<br>' : ''}${esc(t.jabatan)}<div class="nm">${esc(t.nama || '(....................................)')}</div>${t.nip ? `<div>NIP. ${esc(t.nip)}</div>` : ''}</td>`).join('')}</tr></table>` : ''}
      </body></html>`;
  }
  // Cetak via dialog browser (Simpan sebagai PDF / printer)
  async function cetakDokumen(opt) { cetakHtml(await htmlDokumen(opt)); }
  function cetakHtml(html) {
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    fr.contentDocument.open(); fr.contentDocument.write(html); fr.contentDocument.close();
    setTimeout(() => { fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(() => fr.remove(), 2000); }, 400);
  }
  // ---- Kolom SEKOLAH: diketik manual + saran nama yang sudah pernah dipakai ----
  function kolomSekolah({ id, nama = 'sekolah', nilai = '', placeholder = 'Ketik nama sekolah, contoh: SD Negeri Kejambon 2' } = {}) {
    return `<input class="input" id="${id}" name="${nama}" list="${id}_dl" autocomplete="off" autocapitalize="words" maxlength="120" value="${esc(nilai || '')}" placeholder="${esc(placeholder)}"><datalist id="${id}_dl"></datalist>`;
  }
  const rapikanSekolah = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  async function pasangSaranSekolah(input, tambahan = []) {
    if (!input) return;
    const dl = document.getElementById(input.id + '_dl');
    let list = [];
    try { list = (await window.KKG.Data.sekolah()).map((s) => s.nama); } catch (e) { /* saran opsional */ }
    const semua = [...new Set(list.concat(tambahan).map(rapikanSekolah).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
    if (dl) dl.innerHTML = semua.map((n) => `<option value="${esc(n)}"></option>`).join('');
    // samakan penulisan bila nama yang diketik sudah ada (beda huruf besar/kecil/spasi)
    input.addEventListener('change', () => {
      const v = rapikanSekolah(input.value);
      const sama = semua.find((n) => n.toLowerCase() === v.toLowerCase());
      input.value = sama || v;
    });
  }
  function cekSekolah(v, wajib = true) {
    const s = rapikanSekolah(v);
    if (!s) return wajib ? 'Ketik nama sekolah.' : '';
    if (s.length < 5) return 'Nama sekolah terlalu pendek.';
    return '';
  }

  // Badan tabel data laporan (dipakai cetak & Pusat Laporan)
  function tabelData(kolom, rows, total) {
    return `<table class="data"><thead><tr><th style="width:28px">No</th>${kolom.map((k) => `<th class="${k.num ? 'num' : ''}"${k.lebar ? ` style="width:${k.lebar}"` : ''}>${esc(k.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td>${kolom.map((k) => `<td class="${k.num ? 'num' : ''}">${esc(k.val ? k.val(r) : r[k.key] ?? '')}</td>`).join('')}</tr>`).join('')}
      ${total ? `<tr class="total"><td></td>${kolom.map((k) => `<td class="${k.num ? 'num' : ''}">${esc(total[k.label] ?? '')}</td>`).join('')}</tr>` : ''}</tbody></table>`;
  }

  // Cetak tabel data (laporan daftar)
  function cetak({ judul, sub = '', kolom, rows, ttd = [] }) {
    return cetakDokumen({ judul, sub, body: tabelData(kolom, rows), ttd, landscape: kolom.length > 6, meta: 'Jumlah data: ' + rows.length });
  }

  // Cetak dokumen naratif (notulen, berita acara): pasangan info + isi teks
  function cetakIsi({ judul, sub = '', info = [], isi = '', ttd = [] }) {
    const body = `${info.length ? `<table class="kv">${info.map(([k, v]) => `<tr><td>${esc(k)}</td><td>: ${esc(v || '-')}</td></tr>`).join('')}</table>` : ''}<div class="isi">${esc(isi)}</div>`;
    return cetakDokumen({ judul, sub, body, ttd });
  }

  // Siapkan berkas untuk diunggah: gambar dikompres; PDF/Word/Excel maks 5 MB
  const MIME_DOK = { 'application/pdf': 'PDF', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel' };
  async function siapkanBerkas(file, { dokumen = true } = {}) {
    if (!file) throw new Error('Belum ada berkas dipilih.');
    if (file.type.startsWith('image/')) return window.K.kompresGambar(file, 1600, 0.82);
    if (!dokumen || !MIME_DOK[file.type]) throw new Error('Format tidak didukung. Gunakan JPG/PNG' + (dokumen ? ', PDF, Word (.docx), atau Excel (.xlsx).' : '.'));
    if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran berkas maksimal 5 MB.');
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Gagal membaca berkas.')); r.readAsDataURL(file); });
    return { base64: dataUrl.split(',')[1], mime: file.type, nama: file.name, dataUrl, ukuran: file.size, jenis: MIME_DOK[file.type] };
  }

  // Penanda tangan dari pengaturan organisasi (PRD §7.4)
  async function penandatangan(jabatan = ['ketua', 'sekretaris']) {
    const org = await window.KKG.Data.org();
    const agt = await window.KKG.Data.anggotaPilihan().catch(() => []);
    const cari = (id) => agt.find((a) => a.id === id) || {};
    const L = { ketua: ['Ketua', org.ketua_id], sekretaris: ['Sekretaris', org.sekretaris_id], bendahara: ['Bendahara', org.bendahara_id] };
    const out = jabatan.map((j) => { const a = cari(L[j][1]); return { jabatan: L[j][0] + ' ' + (org.singkatan || ''), nama: a.nama, nip: a.nip }; });
    if (out.length > 1) out[0].kota = 'Mengetahui,';
    if (out.length) out[out.length - 1].kota = 'Tegal, ' + fmt.tgl(new Date());
    return out;
  }

  window.UI = { tabel, saringLokal, drawer, lihatBerkas, eksporCSV, bacaCSV, cetak, cetakIsi, cetakDokumen, htmlDokumen, cetakHtml, tabelData, siapkanBerkas, penandatangan, badgeStatus,
    kolomSekolah, pasangSaranSekolah, rapikanSekolah, cekSekolah };
})();
