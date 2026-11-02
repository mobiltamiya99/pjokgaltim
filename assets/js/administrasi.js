/* =====================================================================
   BATCH 3 — Kegiatan & Administrasi
   Program Kerja · Kegiatan & Kehadiran (daftar, kalender, presensi) ·
   Surat Masuk/Keluar · Notulen · Arsip Dokumen
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, BULAN, BLN, avatar, toast, modal, konfirmasi, Router, validasi, debounce, emptyState } = window.K;
  const { Auth, Data } = window.KKG;
  const { shell, muatBadge } = window.AppKit;
  const UI = window.UI;
  const adalah = (...r) => r.includes(Auth.profil.role);
  const TH = () => new Date().getFullYear();
  const hariIni = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const opsiTahun = (pilih) => [TH() + 1, TH(), TH() - 1, TH() - 2].map((y) => `<option ${y === pilih ? 'selected' : ''}>${y}</option>`).join('');
  const gagal = (el, e) => { el.innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div>`; };

  // Kartu kecil ringkasan (KPI putih)
  const stat = (ikon, nilai, label, cls = '') => `<div class="card stat-card" style="padding:18px"><div><div class="num" style="font-size:28px">${nilai}</div><div class="lbl">${label}</div></div><span class="icon-tile ${cls}"><i class="bi ${ikon}"></i></span></div>`;

  // Kolom unggah berkas yang dipakai banyak formulir
  function kolomBerkas(id, label, bantu, urlLama) {
    return `<div class="field"><span class="label">${label}</span>
      <label class="dropzone" for="${id}"><span class="preview" id="${id}P">${urlLama ? '<i class="bi bi-file-earmark-check" style="color:var(--teal-text)"></i>' : '<i class="bi bi-paperclip"></i>'}</span>
        <span id="${id}N">${urlLama ? '<b>Berkas sudah ada</b><br><span class="help">Pilih berkas baru untuk mengganti</span>' : `<b>Pilih berkas</b> atau seret ke sini<br><span class="help">${bantu}</span>`}</span></label>
      <input type="file" id="${id}" class="sr-only" accept="image/jpeg,image/png,application/pdf,.docx,.xlsx"></div>`;
  }
  function ikatBerkas(m, id, simpan) {
    const inp = $('#' + id, m);
    const dz = inp.previousElementSibling;
    const pilih = async (file) => {
      try {
        const b = await UI.siapkanBerkas(file);
        simpan(b);
        $('#' + id + 'P', m).innerHTML = b.mime.startsWith('image/') ? `<img src="${b.dataUrl}" alt="">` : `<i class="bi bi-filetype-${b.jenis === 'Word' ? 'docx' : b.jenis === 'Excel' ? 'xlsx' : 'pdf'}" style="color:var(--danger)"></i>`;
        $('#' + id + 'N', m).innerHTML = `<b>${esc(b.nama)}</b><br><span class="help">Siap diunggah</span>`;
      } catch (e) { simpan(null); toast(e.message, 'error'); }
    };
    inp.onchange = () => pilih(inp.files[0]);
    ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', (e) => pilih(e.dataTransfer.files[0]));
  }
  const unggah = async (kategori, b, extra) => (b ? (await Data.upload(kategori, { base64: b.base64, mime: b.mime, nama: b.nama, dataUrl: b.dataUrl }, extra)).url : null);

  // ==================================================================
  // PROGRAM KERJA
  // ==================================================================
  const ST_PROG = { belum_mulai: ['b-slate', 'Belum Mulai'], berjalan: ['b-teal', 'Berjalan'], selesai: ['b-green', 'Selesai'] };
  const badgeProg = (s) => `<span class="badge ${(ST_PROG[s] || ST_PROG.belum_mulai)[0]}">${(ST_PROG[s] || ST_PROG.belum_mulai)[1]}</span>`;

  async function halProgram() {
    const el = await shell('program', 'Program Kerja', 'Rencana & capaian tahunan');
    const kelola = adalah('wakil_ketua', 'ketua');
    const st = { tahun: TH(), cari: '', status: '', halaman: 1, per: 10, urut: 'kode', naik: true };
    el.innerHTML = `<div class="page-head"><div><h1>Rencana & Program Kerja Tahunan</h1><p>Pantau target, periode, dan progres setiap program KKG.</p></div>
        <div class="acts"><select class="select" id="prTh" style="width:auto" aria-label="Tahun">${opsiTahun(st.tahun)}</select>
          <button class="btn btn-outline" id="prXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button><button class="btn btn-outline" id="prPdf"><i class="bi bi-printer"></i> PDF</button>
          ${kelola ? '<button class="btn btn-primary" id="prBaru"><i class="bi bi-plus-lg"></i> Tambah Program</button>' : ''}</div></div>
      <div class="grid-4" id="prStat" style="margin-bottom:20px"></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="prCari" placeholder="Cari program, kode, penanggung jawab…" aria-label="Cari program"></div>
        <select class="select" id="prSt" aria-label="Status"><option value="">Semua status</option><option value="belum_mulai">Belum mulai</option><option value="berjalan">Berjalan</option><option value="selesai">Selesai</option></select></div></div>
      <div id="prTabel"></div>`;
    let data = null;
    const t = UI.tabel({
      el: $('#prTabel'), state: st,
      kosong: { judul: 'Belum ada program kerja', pesan: kelola ? 'Tambahkan program pertama untuk tahun ini.' : 'Program kerja tahun ini belum diisi.', ikon: 'bi-clipboard-data' },
      kolom: [
        { key: 'kode', label: 'Kode & Program', sort: true, render: (p) => `<div class="body-sm muted tabnum">${esc(p.kode || '')}</div><b>${esc(p.judul)}</b>` },
        { key: 'penanggung_jawab', label: 'Penanggung Jawab', sort: true, render: (p) => esc(p.penanggung_jawab || '—') },
        { key: 'target', label: 'Target', render: (p) => p.target ? `<span class="badge b-slate" style="text-transform:none;letter-spacing:0">${esc(p.target)}</span>` : '—' },
        { key: 'tanggal_mulai', label: 'Periode', sort: true, render: (p) => `<span style="white-space:nowrap">${p.tanggal_mulai ? fmt.tglPendek(p.tanggal_mulai) : '—'}</span><div class="body-sm muted">s.d. ${p.tanggal_selesai ? fmt.tglPendek(p.tanggal_selesai) : '—'}</div>` },
        { key: 'progres_persen', label: 'Progres', sort: true, render: (p) => { const telat = p.tanggal_selesai && p.tanggal_selesai < hariIni() && p.progres_persen < 100;
          return `<div style="min-width:140px"><div style="display:flex;justify-content:space-between;font-size:13px"><b class="tabnum">${p.progres_persen}%</b>${telat ? '<span style="color:var(--b-amber-tx);font-weight:600">Lewat target</span>' : ''}</div>
            <div class="progress ${telat ? 'amber' : ''}" style="margin-top:6px"><span style="width:${p.progres_persen}%"></span></div></div>`; } },
        { key: 'status', label: 'Status', render: (p) => badgeProg(p.status) }
      ],
      aksi: kelola ? (p) => `<button class="btn btn-sm btn-teal-solid" data-prog="${esc(p.id)}">Update</button>
          <button class="btn btn-ghost btn-icon" data-ubah="${esc(p.id)}" aria-label="Ubah ${esc(p.judul)}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-ghost btn-icon" data-hapus="${esc(p.id)}" aria-label="Hapus ${esc(p.judul)}"><i class="bi bi-trash3"></i></button>` : null,
      muat: async (s) => {
        if (!data || s._segar) { data = await Data.programDaftar(s.tahun); s._segar = false; ringkas(); }
        return UI.saringLokal(data, s, { cari: ['kode', 'judul', 'penanggung_jawab', 'target'], filter: { status: (x, v) => x.status === v } });
      },
      onRender: (rows) => {
        $$('[data-prog]').forEach((b) => b.onclick = () => updateProgres(rows.find((r) => r.id === b.dataset.prog)));
        $$('[data-ubah]').forEach((b) => b.onclick = () => form(rows.find((r) => r.id === b.dataset.ubah)));
        $$('[data-hapus]').forEach((b) => b.onclick = async () => {
          const p = rows.find((r) => r.id === b.dataset.hapus);
          const k = await konfirmasi({ judul: 'Hapus program kerja?', bahaya: true, ok: 'Hapus', pesan: `Program <b>${esc(p.judul)}</b> akan dihapus. Kegiatan yang terhubung tetap ada.` });
          if (!k.ok) return;
          try { await Data.hapusProgram(p.id); toast('Program dihapus.', 'success'); segar(); } catch (e) { toast(e.message, 'error'); }
        });
      }
    });
    function ringkas() {
      const n = data.length, rata = n ? Math.round(data.reduce((a, p) => a + p.progres_persen, 0) / n) : 0;
      $('#prStat').innerHTML = stat('bi-clipboard-data', n, 'Program tahun ' + st.tahun, 'navy') + stat('bi-graph-up', rata + '%', 'Rata-rata progres')
        + stat('bi-check2-circle', data.filter((p) => p.status === 'selesai').length, 'Program selesai') + stat('bi-hourglass-split', data.filter((p) => p.status === 'berjalan').length, 'Sedang berjalan', 'amber');
    }
    const segar = () => { st._segar = true; t.muat(); };
    $('#prTh').onchange = (e) => { st.tahun = Number(e.target.value); st._segar = true; t.muat(true); };
    $('#prCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
    $('#prSt').onchange = (e) => { st.status = e.target.value; t.muat(true); };
    const kolomEkspor = [{ label: 'Kode', key: 'kode' }, { label: 'Program', key: 'judul' }, { label: 'Penanggung Jawab', key: 'penanggung_jawab' }, { label: 'Target', key: 'target' },
      { label: 'Mulai', val: (p) => p.tanggal_mulai ? fmt.tglPendek(p.tanggal_mulai) : '' }, { label: 'Selesai', val: (p) => p.tanggal_selesai ? fmt.tglPendek(p.tanggal_selesai) : '' },
      { label: 'Progres', val: (p) => p.progres_persen + '%' }, { label: 'Status', val: (p) => (ST_PROG[p.status] || [])[1] }];
    $('#prXls').onclick = () => UI.eksporCSV('program_kerja_' + st.tahun, kolomEkspor, data || []);
    $('#prPdf').onclick = async () => UI.cetak({ judul: 'Laporan Program Kerja & Progres', sub: 'Tahun ' + st.tahun, kolom: kolomEkspor, rows: data || [], ttd: await UI.penandatangan(['ketua', 'sekretaris']) });
    if (kelola) $('#prBaru').onclick = () => form(null);

    function updateProgres(p) {
      modal({
        judul: 'Update Progres Program',
        isi: `<p style="font-weight:700">${esc(p.judul)}</p><p class="body-sm muted">${esc(p.kode || '')} · Target: ${esc(p.target || '-')}</p>
          <div style="text-align:center;margin:20px 0 8px"><span id="upNilai" style="font-size:48px;font-weight:800;color:var(--teal-text)" class="tabnum">${p.progres_persen}%</span></div>
          <input type="range" id="upRange" min="0" max="100" step="5" value="${p.progres_persen}" style="width:100%;accent-color:var(--teal)" aria-label="Progres persen">
          <div style="display:flex;justify-content:space-between" class="body-sm muted"><span>0%</span><span>50%</span><span>100%</span></div>
          <p class="help" style="margin-top:12px">Status otomatis: 0% = Belum mulai · 1–99% = Berjalan · 100% = Selesai.</p>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="upGo"><i class="bi bi-save"></i> Simpan Progres</button>',
        onOpen: (m, close) => {
          $('#upRange', m).oninput = (e) => { $('#upNilai', m).textContent = e.target.value + '%'; };
          $('#upGo', m).onclick = async () => {
            const v = Number($('#upRange', m).value);
            const lama = p.progres_persen; p.progres_persen = v; close(); t.muat(); // optimistik
            try { await Data.simpanProgram(Object.assign({}, p, { progres_persen: v })); toast('Progres diperbarui menjadi ' + v + '%.', 'success'); segar(); }
            catch (e) { p.progres_persen = lama; t.muat(); toast(e.message, 'error'); }
          };
        }
      });
    }

    async function form(p) {
      const pengurus = await Data.anggotaPilihan().catch(() => []);
      modal({
        judul: p ? 'Ubah Program Kerja' : 'Tambah Program Kerja', wide: true,
        isi: `<form id="fPr" novalidate>
          <div class="field"><label for="g1">Nama Program <span class="req">*</span></label><input class="input" id="g1" name="judul" value="${esc(p ? p.judul : '')}"><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="g2">Penanggung Jawab</label><input class="input" id="g2" name="penanggung_jawab" list="dlPj" value="${esc(p ? p.penanggung_jawab || '' : '')}">
              <datalist id="dlPj">${pengurus.map((a) => `<option>${esc(a.nama)}</option>`).join('')}</datalist></div>
            <div class="field"><label for="g3">Target / Output</label><input class="input" id="g3" name="target" value="${esc(p ? p.target || '' : '')}" placeholder="Contoh: 60 guru terlatih"></div>
            <div class="field"><label for="g4">Tanggal Mulai</label><input class="input" id="g4" name="tanggal_mulai" type="date" value="${esc(p ? p.tanggal_mulai || '' : '')}"></div>
            <div class="field"><label for="g5">Tanggal Selesai</label><input class="input" id="g5" name="tanggal_selesai" type="date" value="${esc(p ? p.tanggal_selesai || '' : '')}"><div class="err"></div></div>
            <div class="field"><label for="g6">Tahun Program <span class="req">*</span></label><input class="input tabnum" id="g6" name="tahun" type="number" value="${p ? p.tahun : st.tahun}"><div class="err"></div></div>
            <div class="field"><label for="g7">Progres Awal (%)</label><input class="input tabnum" id="g7" name="progres_persen" type="number" min="0" max="100" value="${p ? p.progres_persen : 0}"><div class="err"></div></div></div>
          <div class="field"><label for="g8">Deskripsi</label><textarea class="textarea" id="g8" name="deskripsi" style="min-height:90px">${esc(p ? p.deskripsi || '' : '')}</textarea></div></form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fPrS"><i class="bi bi-save"></i> Simpan</button>',
        onOpen: (m, close) => {
          $('#fPrS', m).onclick = async () => {
            const f = $('#fPr', m);
            const ok = validasi(f, { judul: (v) => v.length < 3 ? 'Nama program wajib diisi.' : '', tahun: (v) => !(+v > 2000) ? 'Tahun tidak valid.' : '',
              progres_persen: (v) => !(+v >= 0 && +v <= 100) ? 'Isi 0–100.' : '',
              tanggal_selesai: (v) => v && f.tanggal_mulai.value && v < f.tanggal_mulai.value ? 'Tidak boleh sebelum tanggal mulai.' : '' });
            if (!ok) return;
            try {
              await Data.simpanProgram({ id: p && p.id, status: p ? p.status : 'belum_mulai', judul: f.judul.value.trim(), penanggung_jawab: f.penanggung_jawab.value.trim(), target: f.target.value.trim(),
                tanggal_mulai: f.tanggal_mulai.value, tanggal_selesai: f.tanggal_selesai.value, tahun: f.tahun.value, progres_persen: f.progres_persen.value, deskripsi: f.deskripsi.value.trim() });
              close(); toast('Program kerja disimpan.', 'success'); segar();
            } catch (e) { toast(e.message, 'error'); }
          };
        }
      });
    }
  }

  // ==================================================================
  // KEGIATAN & KEHADIRAN
  // ==================================================================
  const ST_KEG = { akan_datang: ['b-teal', 'Akan Datang'], berlangsung: ['b-amber', 'Berlangsung'], selesai: ['b-slate', 'Selesai'], dibatalkan: ['b-red', 'Dibatalkan'] };
  const badgeKeg = (s) => `<span class="badge ${ST_KEG[s][0]}">${s === 'berlangsung' ? '<span class="dot pulse"></span>' : ''}${ST_KEG[s][1]}</span>`;
  const KATEGORI = ['Workshop', 'Pelatihan', 'Koordinasi', 'Seminar', 'Lomba', 'Sosial', 'Usulan Anggota'];
  const blokTgl = (t) => { const d = new Date(t); return `<div class="date-block" style="width:56px"><small>${BLN[d.getMonth()]}</small><b>${d.getDate()}</b><small style="color:rgba(255,255,255,.7)">${d.getFullYear()}</small></div>`; };

  async function halKegiatan(q) {
    if (q && q.id) return presensi(q.id);
    const el = await shell('kegiatan', 'Kegiatan & Kehadiran', 'Agenda & presensi digital');
    const kelola = adalah('wakil_ketua', 'ketua');
    const pengurus = adalah('ketua', 'wakil_ketua', 'sekretaris', 'bendahara');
    const bisaUsul = !kelola && !!Auth.profil.anggota_id;
    const st = { tahun: TH(), status: '', cari: '', halaman: 1, per: 10, urut: 'tanggal', naik: false, mode: 'daftar', bulan: new Date().getMonth() };
    el.innerHTML = `<div class="page-head"><div><h1>Kegiatan & Rekap Kehadiran</h1><p>${kelola ? 'Kelola agenda dan isi presensi digital peserta.' : 'Daftar ikut kegiatan dan pantau kehadiran Anda.'}</p></div>
        <div class="acts"><div class="segmented" role="tablist"><button class="active" data-mode="daftar" role="tab">Daftar</button><button data-mode="kalender" role="tab">Kalender</button></div>
          ${bisaUsul ? '<button class="btn btn-outline" id="kUsul"><i class="bi bi-lightbulb"></i> Ajukan Usulan</button>' : ''}
          ${kelola ? '<button class="btn btn-primary" id="kBaru"><i class="bi bi-plus-lg"></i> Tambah Kegiatan</button>' : ''}</div></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0">
        <div class="search"><i class="bi bi-search"></i><input class="input" id="kCari" placeholder="Cari kegiatan, lokasi, kode…" aria-label="Cari kegiatan"></div>
        <select class="select" id="kTh" aria-label="Tahun">${opsiTahun(st.tahun)}</select>
        <select class="select" id="kSt" aria-label="Status"><option value="">Semua status</option>${Object.entries(ST_KEG).map(([k, v]) => `<option value="${k}">${v[1]}</option>`).join('')}</select></div></div>
      <div id="kIsi"></div>`;
    let data = null;
    let t = null;
    const muatData = async () => { data = await Data.kegiatanDaftar(st.tahun); };

    const kolom = [
      { key: 'tanggal', label: 'Tanggal', sort: true, lebar: '84px', render: (k) => blokTgl(k.tanggal) },
      { key: 'judul', label: 'Kegiatan', sort: true, render: (k) => `<div class="body-sm muted tabnum">${esc(k.kode || '')}${k.tampil_publik ? '' : ' · <i class="bi bi-lock"></i> internal'}</div><b>${esc(k.judul)}</b>
          <div class="body-sm muted">${esc(k.kategori || '')}${k.program_judul ? ' · ' + esc(k.program_judul) : ''}</div>` },
      { key: 'lokasi', label: 'Waktu & Lokasi', render: (k) => `<div style="white-space:nowrap"><i class="bi bi-clock"></i> ${k.jam_mulai ? fmt.jam(k.jam_mulai) + (k.jam_selesai ? '–' + fmt.jam(k.jam_selesai) : '') + ' WIB' : '—'}</div><div class="body-sm muted"><i class="bi bi-geo-alt"></i> ${esc(k.lokasi || '—')}</div>` },
      { key: 'jumlah_peserta', label: 'Peserta', sort: true, render: (k) => { const pr = k.jumlah_peserta ? Math.round(k.jumlah_hadir / k.jumlah_peserta * 100) : 0;
        return `<b class="tabnum">${k.jumlah_peserta}${k.kuota ? '/' + k.kuota : ''}</b> terdaftar${k.status_efektif === 'selesai' && k.jumlah_peserta ? `<div class="body-sm" style="color:var(--teal-text)">${k.jumlah_hadir} hadir (${pr}%)</div>` : ''}`; } },
      { key: 'status_efektif', label: 'Status', render: (k) => badgeKeg(k.status_efektif) + (k.saya_terdaftar ? `<div style="margin-top:4px">${k.saya_hadir === 'hadir' ? '<span class="badge b-green">Saya hadir</span>' : k.saya_hadir === 'izin' ? '<span class="badge b-amber">Saya izin</span>' : k.saya_hadir === 'alpa' ? '<span class="badge b-red">Saya alpa</span>' : '<span class="badge b-navy">Terdaftar</span>'}</div>` : '') }
    ];
    const aksi = (k) => {
      let h = '';
      if (pengurus) h += `<a class="btn btn-sm ${kelola ? 'btn-teal-solid' : 'btn-outline'}" href="#/app/kegiatan?id=${esc(k.id)}"><i class="bi bi-clipboard-check"></i> ${kelola ? 'Presensi' : 'Kehadiran'}</a>`;
      if (Auth.profil.anggota_id && !kelola && k.status_efektif === 'akan_datang') {
        const penuh = k.kuota && k.jumlah_peserta >= k.kuota && !k.saya_terdaftar;
        h += k.saya_terdaftar ? `<button class="btn btn-sm btn-ghost" data-batal="${esc(k.id)}">Batal ikut</button>`
          : `<button class="btn btn-sm btn-primary" data-ikut="${esc(k.id)}" ${penuh ? 'disabled title="Kuota penuh"' : ''}>${penuh ? 'Penuh' : 'Daftar Ikut'}</button>`;
      }
      if (kelola) h += `<button class="btn btn-ghost btn-icon" data-ubah="${esc(k.id)}" aria-label="Ubah ${esc(k.judul)}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-ghost btn-icon" data-hapus="${esc(k.id)}" aria-label="Hapus ${esc(k.judul)}"><i class="bi bi-trash3"></i></button>`;
      return h || '<span class="muted body-sm">—</span>';
    };
    const ikat = (rows) => {
      $$('[data-ikut]').forEach((b) => b.onclick = async () => {
        const k = rows.find((r) => r.id === b.dataset.ikut);
        b.disabled = true;
        try { await Data.ikutKegiatan(k.id); k.saya_terdaftar = true; k.jumlah_peserta++; toast(`Anda terdaftar di "${k.judul}".`, 'success'); render(); }
        catch (e) { b.disabled = false; toast(e.message, 'error'); }
      });
      $$('[data-batal]').forEach((b) => b.onclick = async () => {
        const k = rows.find((r) => r.id === b.dataset.batal);
        const r = await konfirmasi({ judul: 'Batal ikut kegiatan?', pesan: `Pendaftaran Anda di <b>${esc(k.judul)}</b> akan dibatalkan.`, ok: 'Batalkan' });
        if (!r.ok) return;
        try { await Data.batalIkut(k.id); k.saya_terdaftar = false; k.jumlah_peserta--; toast('Pendaftaran dibatalkan.', 'success'); render(); } catch (e) { toast(e.message, 'error'); }
      });
      $$('[data-ubah]').forEach((b) => b.onclick = () => formKegiatan(rows.find((r) => r.id === b.dataset.ubah)));
      $$('[data-hapus]').forEach((b) => b.onclick = async () => {
        const k = rows.find((r) => r.id === b.dataset.hapus);
        const r = await konfirmasi({ judul: 'Hapus kegiatan?', bahaya: true, ok: 'Hapus', pesan: `Kegiatan <b>${esc(k.judul)}</b> beserta data presensinya akan dihapus permanen. Untuk pembatalan, sebaiknya ubah status menjadi <b>Dibatalkan</b> agar peserta diberi tahu.` });
        if (!r.ok) return;
        try { await Data.hapusKegiatan(k.id); toast('Kegiatan dihapus.', 'success'); await muatData(); render(); } catch (e) { toast(e.message, 'error'); }
      });
    };
    const saring = (s) => UI.saringLokal(data, s, { cari: ['judul', 'lokasi', 'kode', 'kategori'], filter: { status: (x, v) => x.status_efektif === v } });

    function render() {
      if (st.mode === 'daftar') {
        if (!t || !$('#kIsi .table-card')) {
          t = UI.tabel({ el: $('#kIsi'), state: st, kolom, aksi,
            kosong: { judul: 'Belum ada kegiatan', pesan: kelola ? 'Tambahkan agenda kegiatan pertama.' : 'Kegiatan tahun ini belum dijadwalkan.', ikon: 'bi-calendar2-week' },
            muat: async (s) => { if (!data) await muatData(); return saring(s); }, onRender: ikat });
        } else t.muat();
      } else kalender();
    }

    function kalender() {
      const th = st.tahun, bln = st.bulan;
      const awal = new Date(th, bln, 1), jml = new Date(th, bln + 1, 0).getDate();
      const geser = (awal.getDay() + 6) % 7; // Senin = kolom pertama
      const per = {};
      saring(Object.assign({}, st, { halaman: 1, per: 9999 })).semua.forEach((k) => { (per[k.tanggal] = per[k.tanggal] || []).push(k); });
      const kunci = (d) => `${th}-${String(bln + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const sel = Array.from({ length: geser }, () => '<div class="cal-cell kosong"></div>').concat(Array.from({ length: jml }, (_, i) => {
        const d = i + 1, ev = per[kunci(d)] || [];
        return `<button class="cal-cell ${kunci(d) === hariIni() ? 'today' : ''} ${ev.length ? 'ada' : ''}" data-tgl="${kunci(d)}" aria-label="${d} ${BULAN[bln]}${ev.length ? ', ' + ev.length + ' kegiatan' : ''}">
          <span class="d">${d}</span>${ev.slice(0, 2).map((k) => `<span class="ev ${k.status_efektif}">${esc(k.judul)}</span>`).join('')}${ev.length > 2 ? `<span class="more">+${ev.length - 2} lagi</span>` : ''}</button>`;
      })).join('');
      $('#kIsi').innerHTML = `<div class="dash-grid"><section class="card span-8"><div class="card-title"><button class="btn btn-ghost btn-icon" data-nav="-1" aria-label="Bulan sebelumnya"><i class="bi bi-chevron-left"></i></button>
          <h3>${BULAN[bln]} ${th}</h3><button class="btn btn-ghost btn-icon" data-nav="1" aria-label="Bulan berikutnya"><i class="bi bi-chevron-right"></i></button></div>
          <div class="cal-grid">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((h) => `<div class="cal-h">${h}</div>`).join('')}${sel}</div></section>
        <section class="card span-4"><div class="card-title"><h3 id="calJudul">Kegiatan ${BULAN[bln]}</h3></div><div id="calList"></div></section></div>`;
      const daftarHari = (tgl) => {
        const ev = tgl ? (per[tgl] || []) : Object.keys(per).filter((k) => k.startsWith(`${th}-${String(bln + 1).padStart(2, '0')}`)).sort().flatMap((k) => per[k]);
        $('#calJudul').textContent = tgl ? fmt.tgl(tgl) : 'Kegiatan ' + BULAN[bln];
        $('#calList').innerHTML = ev.length ? ev.map((k) => `<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">${blokTgl(k.tanggal)}
            <div style="min-width:0"><b style="font-size:14px">${esc(k.judul)}</b><div class="body-sm muted">${k.jam_mulai ? fmt.jam(k.jam_mulai) + ' WIB · ' : ''}${esc(k.lokasi || '')}</div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${badgeKeg(k.status_efektif)}${pengurus ? `<a class="btn btn-sm btn-ghost" href="#/app/kegiatan?id=${esc(k.id)}">Kehadiran</a>` : ''}</div></div></div>`).join('')
          : emptyState('Tidak ada kegiatan', tgl ? 'Pilih tanggal lain di kalender.' : 'Belum ada agenda di bulan ini.', 'bi-calendar2');
      };
      daftarHari(null);
      $$('.cal-cell[data-tgl]').forEach((c) => c.onclick = () => { $$('.cal-cell.sel').forEach((x) => x.classList.remove('sel')); c.classList.add('sel'); daftarHari(c.dataset.tgl); });
      $$('[data-nav]').forEach((b) => b.onclick = async () => {
        st.bulan += Number(b.dataset.nav);
        if (st.bulan < 0 || st.bulan > 11) { st.tahun += st.bulan < 0 ? -1 : 1; st.bulan = (st.bulan + 12) % 12; $('#kTh').value = st.tahun; await muatData(); }
        kalender();
      });
    }

    $$('[data-mode]').forEach((b) => b.onclick = () => { $$('[data-mode]').forEach((x) => x.classList.toggle('active', x === b)); st.mode = b.dataset.mode; t = null; render(); });
    $('#kCari').oninput = debounce((e) => { st.cari = e.target.value; st.halaman = 1; render(); }, 250);
    $('#kTh').onchange = async (e) => { st.tahun = Number(e.target.value); st.halaman = 1; await muatData(); render(); };
    $('#kSt').onchange = (e) => { st.status = e.target.value; st.halaman = 1; render(); };
    if (kelola) $('#kBaru').onclick = () => formKegiatan(null);
    if (bisaUsul) $('#kUsul').onclick = formUsulan;
    try { await muatData(); render(); } catch (e) { gagal($('#kIsi'), e); }

    async function formKegiatan(k) {
      const program = await Data.programDaftar(k ? new Date(k.tanggal).getFullYear() : st.tahun).catch(() => []);
      modal({
        judul: k ? 'Ubah Kegiatan' : 'Tambah Kegiatan', wide: true,
        isi: `<form id="fK" novalidate>
          <div class="field"><label for="k1">Nama Kegiatan <span class="req">*</span></label><input class="input" id="k1" name="judul" value="${esc(k ? k.judul : '')}"><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="k2">Kategori</label><select class="select" id="k2" name="kategori">${KATEGORI.map((x) => `<option ${k && k.kategori === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
            <div class="field"><label for="k3">Program Kerja Terkait</label><select class="select" id="k3" name="program_id"><option value="">— Tidak terkait —</option>${program.map((p) => `<option value="${esc(p.id)}" ${k && k.program_id === p.id ? 'selected' : ''}>${esc(p.judul)}</option>`).join('')}</select></div>
            <div class="field"><label for="k4">Tanggal <span class="req">*</span></label><input class="input" id="k4" name="tanggal" type="date" value="${esc(k ? k.tanggal : '')}"><div class="err"></div></div>
            <div class="field"><label for="k5">Lokasi</label><input class="input" id="k5" name="lokasi" value="${esc(k ? k.lokasi || '' : '')}" placeholder="Contoh: GOR Wisanggeni Tegal"></div>
            <div class="field"><label for="k6">Jam Mulai</label><input class="input" id="k6" name="jam_mulai" type="time" value="${esc(k && k.jam_mulai ? fmt.jam(k.jam_mulai) : '')}"></div>
            <div class="field"><label for="k7">Jam Selesai</label><input class="input" id="k7" name="jam_selesai" type="time" value="${esc(k && k.jam_selesai ? fmt.jam(k.jam_selesai) : '')}"><div class="err"></div></div>
            <div class="field"><label for="k8">Kuota Peserta</label><input class="input tabnum" id="k8" name="kuota" type="number" min="1" value="${esc(k && k.kuota ? k.kuota : '')}" placeholder="Kosongkan bila tanpa batas"></div>
            <div class="field"><label for="k9">Status</label><select class="select" id="k9" name="status"><option value="akan_datang">Terjadwal</option><option value="dibatalkan" ${k && k.status === 'dibatalkan' ? 'selected' : ''}>Dibatalkan</option></select></div></div>
          <div class="field"><label for="k10">Deskripsi</label><textarea class="textarea" id="k10" name="deskripsi" style="min-height:90px">${esc(k ? k.deskripsi || '' : '')}</textarea></div>
          <label class="check" style="justify-content:space-between;padding:14px 16px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border)"><span><b>Tampilkan di website publik</b><br><span class="help">Muncul di Beranda & halaman Agenda.</span></span>
            <span class="switch"><input type="checkbox" name="tampil_publik" ${!k || k.tampil_publik ? 'checked' : ''}><span></span></span></label>
          ${k ? '<p class="help" style="margin-top:12px"><i class="bi bi-bell"></i> Jika tanggal, jam, atau lokasi diubah — atau kegiatan dibatalkan — peserta terdaftar otomatis diberi tahu lewat notifikasi & email.</p>' : ''}</form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fKs"><i class="bi bi-save"></i> Simpan Kegiatan</button>',
        onOpen: (m, close) => {
          $('#fKs', m).onclick = async () => {
            const f = $('#fK', m);
            const ok = validasi(f, { judul: (v) => v.length < 3 ? 'Nama kegiatan wajib diisi.' : '', tanggal: (v) => !v ? 'Pilih tanggal.' : '',
              jam_selesai: (v) => v && f.jam_mulai.value && v <= f.jam_mulai.value ? 'Harus setelah jam mulai.' : '' });
            if (!ok) return;
            try {
              await Data.simpanKegiatan({ id: k && k.id, judul: f.judul.value.trim(), kategori: f.kategori.value, program_id: f.program_id.value, tanggal: f.tanggal.value,
                lokasi: f.lokasi.value.trim(), jam_mulai: f.jam_mulai.value, jam_selesai: f.jam_selesai.value, kuota: f.kuota.value, status: f.status.value,
                deskripsi: f.deskripsi.value.trim(), tampil_publik: f.tampil_publik.checked });
              close(); toast(k ? 'Kegiatan diperbarui.' : 'Kegiatan ditambahkan.', 'success'); await muatData(); render();
            } catch (e) { toast(e.message, 'error'); }
          };
        }
      });
    }

    function formUsulan() {
      modal({
        judul: 'Ajukan Usulan Kegiatan', wide: true,
        isi: `<div class="alert info" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><div>Usulan ditinjau Wakil Ketua atau Ketua. Jika disetujui, kegiatan otomatis masuk agenda.</div></div>
          <form id="fU" novalidate><div class="field"><label for="u1">Judul Kegiatan <span class="req">*</span></label><input class="input" id="u1" name="judul" placeholder="Contoh: Klinik Pembelajaran Atletik Aman"><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="u2">Usulan Tanggal</label><input class="input" id="u2" name="tanggal" type="date"><div class="err"></div></div>
            <div class="field"><label for="u3">Lokasi</label><input class="input" id="u3" name="lokasi"></div></div>
          <div class="field"><label for="u4">Deskripsi & Tujuan <span class="req">*</span></label><textarea class="textarea" id="u4" name="deskripsi" placeholder="Jelaskan tujuan, sasaran peserta, dan kebutuhan."></textarea><div class="err"></div></div></form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fUs"><i class="bi bi-send"></i> Kirim Usulan</button>',
        onOpen: (m, close) => {
          $('#fUs', m).onclick = async () => {
            const f = $('#fU', m);
            const ok = validasi(f, { judul: (v) => v.length < 5 ? 'Judul minimal 5 karakter.' : '', deskripsi: (v) => v.length < 15 ? 'Jelaskan minimal 15 karakter.' : '',
              tanggal: (v) => v && v < hariIni() ? 'Tanggal sudah lewat.' : '' });
            if (!ok) return;
            try {
              const r = await Data.ajukan({ jenis: 'usulan_kegiatan', ringkasan: f.judul.value.trim(), data_usulan: { judul: f.judul.value.trim(), tanggal: f.tanggal.value || null,
                lokasi: f.lokasi.value.trim() || null, deskripsi: f.deskripsi.value.trim(), kategori: 'Usulan Anggota' } });
              close(); toast(`Usulan ${r.kode || ''} terkirim. Pantau statusnya di Profil Saya.`, 'success');
            } catch (e) { toast(e.message, 'error'); }
          };
        }
      });
    }
  }

  // ---------- Presensi satu kegiatan ----------
  async function presensi(id) {
    const el = await shell('kegiatan', 'Presensi Kegiatan', 'Rekap kehadiran digital');
    const kelola = adalah('wakil_ketua', 'ketua');
    if (!adalah('ketua', 'wakil_ketua', 'sekretaris', 'bendahara')) { Router.go('/app/kegiatan'); return; }
    el.innerHTML = '<div class="skel skel-block" style="height:380px"></div>';
    let k, peserta;
    try {
      const semua = await Data.kegiatanDaftar(null);
      k = semua.find((x) => x.id === id);
      if (!k) throw new Error('Kegiatan tidak ditemukan.');
      peserta = (await Data.pesertaKegiatan(id)).sort((a, b) => (a.anggota ? a.anggota.nama : '').localeCompare(b.anggota ? b.anggota.nama : ''));
    } catch (e) { el.innerHTML = `<a href="#/app/kegiatan" class="btn btn-ghost btn-sm"><i class="bi bi-arrow-left"></i> Kembali</a>`; gagal(el.appendChild(document.createElement('div')), e); return; }
    let ubah = false;

    el.innerHTML = `<a href="#/app/kegiatan" class="btn btn-ghost btn-sm" style="margin-bottom:12px"><i class="bi bi-arrow-left"></i> Daftar kegiatan</a>
      <section class="card" style="margin-bottom:20px;display:flex;gap:20px;align-items:center;flex-wrap:wrap">${blokTgl(k.tanggal)}
        <div style="flex:1;min-width:220px"><div class="body-sm muted tabnum">${esc(k.kode || '')} · ${esc(k.kategori || '')}</div><h1 style="font-size:22px;margin:4px 0">${esc(k.judul)}</h1>
          <div class="meta"><span><i class="bi bi-clock"></i>${k.jam_mulai ? fmt.jam(k.jam_mulai) + (k.jam_selesai ? '–' + fmt.jam(k.jam_selesai) : '') + ' WIB' : '—'}</span><span><i class="bi bi-geo-alt"></i>${esc(k.lokasi || '—')}</span>${badgeKeg(k.status_efektif)}</div></div>
        <div style="display:flex;gap:16px;align-items:center"><div class="ring" id="pRing"><span id="pPersen">0%</span></div>
          <div class="body-sm"><div><b id="pH">0</b> hadir</div><div><b id="pI">0</b> izin</div><div><b id="pA">0</b> alpa</div><div class="muted"><b id="pB">0</b> belum diisi</div></div></div></section>
      <div class="page-head" style="margin-bottom:16px"><div><h2 style="font-size:18px">Daftar Hadir Peserta</h2><p class="body-sm">${kelola ? 'Klik Hadir / Izin / Alpa untuk setiap peserta, lalu simpan.' : 'Mode lihat — presensi diisi Wakil Ketua atau Ketua.'}</p></div>
        <div class="acts">${kelola ? '<button class="btn btn-outline" id="pTambah"><i class="bi bi-person-plus"></i> Tambah Peserta</button><button class="btn btn-outline" id="pSemua"><i class="bi bi-check2-all"></i> Tandai semua hadir</button>' : ''}
          <button class="btn btn-outline" id="pXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button><button class="btn btn-outline" id="pCetak"><i class="bi bi-printer"></i> Cetak Daftar Hadir</button></div></div>
      <div class="card table-card"><div class="table-wrap"><table class="tbl stack"><thead><tr><th style="width:44px">No</th><th>Nama Guru</th><th>Sekolah</th><th>Kehadiran</th><th>Catatan</th></tr></thead><tbody id="pBody"></tbody></table></div></div>
      ${kelola ? '<div class="savebar"><span class="body-sm muted" id="pInfo" style="margin-right:auto;align-self:center"></span><button class="btn btn-primary" id="pSimpan"><i class="bi bi-save"></i> Simpan Presensi</button></div>' : ''}`;

    const SEG = [['hadir', 'Hadir', 'b-green'], ['izin', 'Izin', 'b-amber'], ['alpa', 'Alpa', 'b-red']];
    function rekap() {
      const n = (h) => peserta.filter((p) => p.hadir === h).length;
      const total = peserta.length, h = n('hadir');
      const pr = total ? Math.round(h / total * 100) : 0;
      $('#pPersen').textContent = pr + '%';
      $('#pRing').style.setProperty('--p', pr);
      $('#pH').textContent = h; $('#pI').textContent = n('izin'); $('#pA').textContent = n('alpa'); $('#pB').textContent = peserta.filter((p) => !p.hadir).length;
      if ($('#pInfo')) $('#pInfo').textContent = ubah ? 'Ada perubahan yang belum disimpan.' : '';
    }
    function baris() {
      $('#pBody').innerHTML = peserta.length ? peserta.map((p, i) => `<tr><td data-label="No" class="tabnum">${i + 1}</td>
          <td data-label="Nama"><div style="display:flex;gap:10px;align-items:center">${avatar(p.anggota && p.anggota.nama, p.anggota && p.anggota.foto_url)}<div><b>${esc(p.anggota ? p.anggota.nama : '-')}</b><div class="body-sm muted tabnum">${esc(p.anggota && p.anggota.nip || '')}</div></div></div></td>
          <td data-label="Sekolah">${esc(p.anggota ? p.anggota.sekolah || '' : '')}</td>
          <td data-label="Kehadiran">${kelola ? `<div class="seg-hadir" role="radiogroup" aria-label="Kehadiran ${esc(p.anggota ? p.anggota.nama : '')}">${SEG.map(([v, l]) => `<button type="button" role="radio" aria-checked="${p.hadir === v}" class="${p.hadir === v ? 'on ' + v : ''}" data-i="${i}" data-v="${v}">${l}</button>`).join('')}</div>`
            : (p.hadir ? `<span class="badge ${SEG.find((s) => s[0] === p.hadir)[2]}">${SEG.find((s) => s[0] === p.hadir)[1]}</span>` : '<span class="badge b-slate">Belum diisi</span>')}</td>
          <td data-label="Catatan">${kelola ? `<input class="input" style="min-height:38px" data-cat="${i}" value="${esc(p.catatan || '')}" placeholder="Opsional" aria-label="Catatan">` : esc(p.catatan || '—')}</td></tr>`).join('')
        : `<tr><td colspan="5" class="no-label">${emptyState('Belum ada peserta', kelola ? 'Tambahkan peserta, atau tunggu anggota mendaftar.' : 'Belum ada anggota yang mendaftar.', 'bi-people')}</td></tr>`;
      $$('[data-v]').forEach((b) => b.onclick = () => { const p = peserta[+b.dataset.i]; p.hadir = p.hadir === b.dataset.v ? null : b.dataset.v; ubah = true; baris(); });
      $$('[data-cat]').forEach((c) => c.oninput = () => { peserta[+c.dataset.cat].catatan = c.value; ubah = true; rekap(); });
      rekap();
    }
    baris();

    const kolomCetak = [{ label: 'Nama', val: (p) => p.anggota ? p.anggota.nama : '' }, { label: 'NIP', val: (p) => p.anggota ? p.anggota.nip || '' : '' },
      { label: 'Sekolah', val: (p) => p.anggota ? p.anggota.sekolah || '' : '' }, { label: 'Kehadiran', val: (p) => (SEG.find((s) => s[0] === p.hadir) || [, '—'])[1] },
      { label: 'Catatan', key: 'catatan' }, { label: 'Paraf', val: () => '', lebar: '80px' }];
    $('#pXls').onclick = () => UI.eksporCSV('presensi_' + (k.kode || k.judul), kolomCetak.slice(0, 5), peserta);
    $('#pCetak').onclick = async () => UI.cetak({ judul: 'Daftar Hadir ' + k.judul, sub: `${fmt.tgl(k.tanggal)} · ${k.lokasi || ''}`, kolom: kolomCetak, rows: peserta, ttd: await UI.penandatangan(['ketua', 'sekretaris']) });
    if (!kelola) return;

    $('#pSemua').onclick = () => { peserta.forEach((p) => { if (!p.hadir) p.hadir = 'hadir'; }); ubah = true; baris(); toast('Peserta yang belum diisi ditandai hadir.', 'info', 2000); };
    $('#pTambah').onclick = async () => {
      const ada = new Set(peserta.map((p) => p.anggota_id));
      const calon = (await Data.anggotaPilihan()).filter((a) => !ada.has(a.id));
      modal({
        judul: 'Tambah Peserta', wide: true,
        isi: calon.length ? `<div class="toolbar"><div class="search"><i class="bi bi-search"></i><input class="input" id="tCari" placeholder="Cari nama atau sekolah…" aria-label="Cari"></div>
            <label class="check"><input type="checkbox" id="tAll"> <span>Pilih semua</span></label></div>
            <div style="max-height:360px;overflow:auto;border:1px solid var(--border);border-radius:12px" id="tList">${calon.map((a) => `<label class="check" style="padding:10px 14px;border-bottom:1px solid var(--border)" data-q="${esc((a.nama + ' ' + (a.sekolah || '')).toLowerCase())}">
              <input type="checkbox" value="${esc(a.id)}"> <span><b>${esc(a.nama)}</b><br><span class="body-sm muted">${esc(a.sekolah || '')}</span></span></label>`).join('')}</div>`
          : emptyState('Semua anggota sudah ada di daftar', 'Tidak ada anggota aktif lain untuk ditambahkan.', 'bi-check2-all'),
        foot: calon.length ? '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="tGo"><i class="bi bi-plus-lg"></i> Tambahkan</button>' : '<button class="btn btn-ghost" data-close>Tutup</button>',
        onOpen: (m, close) => {
          if (!calon.length) return;
          $('#tCari', m).oninput = (e) => { const v = e.target.value.toLowerCase(); $$('#tList [data-q]', m).forEach((l) => { l.style.display = l.dataset.q.includes(v) ? '' : 'none'; }); };
          $('#tAll', m).onchange = (e) => $$('#tList [data-q]', m).forEach((l) => { if (l.style.display !== 'none') l.querySelector('input').checked = e.target.checked; });
          $('#tGo', m).onclick = () => {
            const pilih = $$('#tList input:checked', m).map((c) => calon.find((a) => a.id === c.value));
            if (!pilih.length) return toast('Pilih minimal satu anggota.', 'warning');
            pilih.forEach((a) => peserta.push({ anggota_id: a.id, hadir: null, catatan: null, anggota: a }));
            peserta.sort((a, b) => a.anggota.nama.localeCompare(b.anggota.nama));
            ubah = true; close(); baris(); toast(`${pilih.length} peserta ditambahkan. Jangan lupa simpan.`, 'info');
          };
        }
      });
    };
    $('#pSimpan').onclick = async () => {
      const btn = $('#pSimpan'); btn.disabled = true;
      try {
        const r = await Data.simpanPresensi(id, peserta.map((p) => ({ anggota_id: p.anggota_id, hadir: p.hadir || '', catatan: p.catatan || '' })));
        ubah = false; rekap(); toast(`Presensi tersimpan: ${r.hadir} hadir, ${r.izin} izin, ${r.alpa} alpa.`, 'success');
      } catch (e) { toast(e.message, 'error'); } finally { btn.disabled = false; }
    };
    // Peringatkan bila meninggalkan halaman dengan perubahan belum disimpan
    const jaga = (e) => { if (ubah && !Router.path().includes('/app/kegiatan')) { /* sudah pindah */ } };
    window.addEventListener('hashchange', jaga, { once: true });
  }

  // ==================================================================
  // SURAT MASUK & KELUAR
  // ==================================================================
  const DISPOSISI = ['Menunggu Arahan', 'Disposisi: Ketua', 'Disposisi: Wakil Ketua', 'Disposisi: Sekretaris', 'Disposisi: Bendahara', 'Selesai'];
  const badgeDisp = (d) => `<span class="badge ${d === 'Selesai' ? 'b-green' : /Menunggu/.test(d || 'Menunggu') ? 'b-amber' : 'b-navy'}" style="text-transform:none;letter-spacing:0">${esc(d || 'Menunggu Arahan')}</span>`;

  async function halSurat(q) {
    const el = await shell('surat', 'Surat Masuk / Keluar', 'Buku agenda persuratan');
    const kelola = adalah('sekretaris');
    const st = { jenis: (q && q.jenis) === 'keluar' ? 'keluar' : 'masuk', cari: '', bulan: '', tahun: String(TH()), halaman: 1, per: 10, urut: 'tanggal', naik: false };
    el.innerHTML = `<div class="page-head"><div><h1>Tata Usaha & Kearsipan Surat</h1><p>Nomor agenda surat masuk dan nomor surat keluar dibuat otomatis sesuai format di Pengaturan.</p></div>
        <div class="acts"><button class="btn btn-outline" id="sXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button><button class="btn btn-outline" id="sPdf"><i class="bi bi-printer"></i> PDF</button>
          ${kelola ? '<button class="btn btn-primary" id="sBaru"><i class="bi bi-plus-lg"></i> <span id="sBaruL">Catat Surat Masuk</span></button>' : ''}</div></div>
      <div class="chip-tabs" id="sTabs" role="tablist"></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0">
        <div class="search"><i class="bi bi-search"></i><input class="input" id="sCari" placeholder="Cari nomor, perihal, instansi…" aria-label="Cari surat"></div>
        <select class="select" id="sBln" aria-label="Bulan"><option value="">Semua bulan</option>${BULAN.map((b, i) => `<option value="${i + 1}">${b}</option>`).join('')}</select>
        <select class="select" id="sTh" aria-label="Tahun"><option value="">Semua tahun</option>${opsiTahun(TH())}</select></div></div>
      <div id="sTabel"></div>`;
    $('#sTh').value = st.tahun;
    const data = { masuk: null, keluar: null };
    const muatJenis = async (j) => { data[j] = await Data.surat(j); };
    await Promise.all([muatJenis('masuk'), muatJenis('keluar')]).catch((e) => toast(e.message, 'error'));
    const tabs = () => {
      $('#sTabs').innerHTML = [['masuk', 'Surat Masuk', 'bi-inbox'], ['keluar', 'Surat Keluar', 'bi-send']].map(([k, l, ic]) =>
        `<button role="tab" aria-selected="${st.jenis === k}" class="${st.jenis === k ? 'active' : ''}" data-j="${k}"><i class="bi ${ic}"></i> ${l} <span class="n">${(data[k] || []).length}</span></button>`).join('');
      $$('#sTabs [data-j]').forEach((b) => b.onclick = () => { st.jenis = b.dataset.j; st.urut = 'tanggal'; st.naik = false; tabs(); buat(); });
      if ($('#sBaruL')) $('#sBaruL').textContent = st.jenis === 'keluar' ? 'Buat Surat Keluar' : 'Catat Surat Masuk';
    };
    const KOL = {
      masuk: [
        { key: 'nomor_agenda', label: 'No. Agenda', sort: true, cls: 'tabnum', render: (s) => `<b style="white-space:nowrap">${esc(s.nomor_agenda || '-')}</b>` },
        { key: 'nomor_surat', label: 'Nomor & Tanggal Surat', render: (s) => `${esc(s.nomor_surat)}<div class="body-sm muted">${s.tanggal_surat ? fmt.tglPendek(s.tanggal_surat) : ''}</div>` },
        { key: 'tanggal', label: 'Diterima', sort: true, render: (s) => `<span style="white-space:nowrap">${fmt.tglPendek(s.tanggal)}</span>` },
        { key: 'pengirim', label: 'Pengirim', sort: true },
        { key: 'perihal', label: 'Perihal', sort: true },
        { key: 'disposisi', label: 'Disposisi', render: (s) => badgeDisp(s.disposisi) }],
      keluar: [
        { key: 'nomor_urut', label: 'No.', sort: true, cls: 'tabnum', lebar: '60px' },
        { key: 'nomor_surat', label: 'Nomor Surat', sort: true, render: (s) => `<b class="tabnum" style="white-space:nowrap">${esc(s.nomor_surat)}</b>` },
        { key: 'tanggal', label: 'Tanggal', sort: true, render: (s) => `<span style="white-space:nowrap">${fmt.tglPendek(s.tanggal)}</span>` },
        { key: 'tujuan', label: 'Tujuan', sort: true },
        { key: 'perihal', label: 'Perihal', sort: true },
        { key: 'status', label: 'Status', render: (s) => s.status === 'terkirim' ? '<span class="badge b-green">Terkirim</span>' : '<span class="badge b-slate">Draf</span>' }]
    };
    const berkasKol = { key: 'file_url', label: 'Berkas', render: (s) => s.file_url ? `<button class="btn btn-sm btn-ghost" data-file="${esc(s.id)}"><i class="bi bi-file-earmark-pdf" style="color:var(--danger)"></i> Lihat</button>` : '<span class="muted body-sm">—</span>' };
    const saring = (s) => UI.saringLokal(data[st.jenis] || [], s, { cari: ['nomor_agenda', 'nomor_surat', 'pengirim', 'tujuan', 'perihal'], filter: {
      bulan: (x, v) => new Date(x.tanggal).getMonth() + 1 === Number(v), tahun: (x, v) => new Date(x.tanggal).getFullYear() === Number(v) } });
    let t;
    function buat() {
      t = UI.tabel({ el: $('#sTabel'), state: st, kolom: KOL[st.jenis].concat([berkasKol]),
        kosong: { judul: 'Belum ada surat', pesan: kelola ? 'Catat surat pertama dengan tombol di kanan atas.' : 'Belum ada surat yang tercatat.', ikon: st.jenis === 'keluar' ? 'bi-send' : 'bi-inbox' },
        aksi: kelola ? (s) => `<button class="btn btn-ghost btn-icon" data-ubah="${esc(s.id)}" aria-label="Ubah"><i class="bi bi-pencil-square"></i></button><button class="btn btn-ghost btn-icon" data-hapus="${esc(s.id)}" aria-label="Hapus"><i class="bi bi-trash3"></i></button>` : null,
        muat: async (s) => saring(s),
        onRender: (rows) => {
          $$('[data-file]').forEach((b) => b.onclick = () => { const s = rows.find((r) => r.id === b.dataset.file); UI.lihatBerkas(s.file_url, 'surat-' + (s.nomor_agenda || s.nomor_surat)); });
          $$('[data-ubah]').forEach((b) => b.onclick = () => form(rows.find((r) => r.id === b.dataset.ubah)));
          $$('[data-hapus]').forEach((b) => b.onclick = async () => {
            const s = rows.find((r) => r.id === b.dataset.hapus);
            const k = await konfirmasi({ judul: 'Hapus surat?', bahaya: true, ok: 'Hapus', pesan: `Catatan surat <b>${esc(s.nomor_surat)}</b> akan dihapus dari buku agenda.${st.jenis === 'keluar' ? ' Nomor surat ini tidak akan dipakai ulang.' : ''}` });
            if (!k.ok) return;
            try { await Data.hapusSurat(st.jenis, s.id); toast('Surat dihapus.', 'success'); await muatJenis(st.jenis); tabs(); t.muat(); } catch (e) { toast(e.message, 'error'); }
          });
        } });
    }
    tabs(); buat();
    $('#sCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
    $('#sBln').onchange = (e) => { st.bulan = e.target.value; t.muat(true); };
    $('#sTh').onchange = (e) => { st.tahun = e.target.value; t.muat(true); };
    const ekspor = () => { const kol = st.jenis === 'keluar'
      ? [{ label: 'No.', key: 'nomor_urut' }, { label: 'Nomor Surat', key: 'nomor_surat' }, { label: 'Tanggal', val: (s) => fmt.tglPendek(s.tanggal) }, { label: 'Tujuan', key: 'tujuan' }, { label: 'Perihal', key: 'perihal' }, { label: 'Status', key: 'status' }]
      : [{ label: 'No. Agenda', key: 'nomor_agenda' }, { label: 'Nomor Surat', key: 'nomor_surat' }, { label: 'Diterima', val: (s) => fmt.tglPendek(s.tanggal) }, { label: 'Pengirim', key: 'pengirim' }, { label: 'Perihal', key: 'perihal' }, { label: 'Disposisi', key: 'disposisi' }];
      return { kol, rows: saring(Object.assign({}, st, { halaman: 1, per: 99999 })).semua }; };
    $('#sXls').onclick = () => { const e = ekspor(); UI.eksporCSV('surat_' + st.jenis, e.kol, e.rows); };
    $('#sPdf').onclick = async () => { const e = ekspor(); UI.cetak({ judul: 'Laporan Surat ' + (st.jenis === 'keluar' ? 'Keluar' : 'Masuk'),
      sub: (st.bulan ? BULAN[st.bulan - 1] + ' ' : '') + (st.tahun || 'Semua tahun'), kolom: e.kol, rows: e.rows, ttd: await UI.penandatangan(['ketua', 'sekretaris']) }); };
    if (kelola) $('#sBaru').onclick = () => form(null);

    function form(s) {
      const keluar = st.jenis === 'keluar';
      let berkas = null;
      modal({
        judul: (s ? 'Ubah ' : keluar ? 'Buat ' : 'Catat ') + (keluar ? 'Surat Keluar' : 'Surat Masuk'), wide: true,
        isi: `<form id="fS" novalidate>${keluar ? `
            <div class="alert info" style="margin-bottom:16px"><i class="bi bi-hash"></i><div>Nomor surat: <b class="tabnum" id="sNo">${s ? esc(s.nomor_surat) : 'memuat…'}</b>${s ? '' : '<br><span class="body-sm">Nomor final diberikan sistem saat disimpan agar tidak ada nomor ganda.</span>'}</div></div>
            <div class="grid-2"><div class="field"><label for="s1">Tanggal Surat <span class="req">*</span></label><input class="input" id="s1" name="tanggal" type="date" value="${esc(s ? s.tanggal : hariIni())}"><div class="err"></div></div>
              <div class="field"><label for="s2">Status</label><select class="select" id="s2" name="status"><option value="draf">Draf</option><option value="terkirim" ${s && s.status === 'terkirim' ? 'selected' : ''}>Terkirim</option></select></div></div>
            <div class="field"><label for="s3">Tujuan <span class="req">*</span></label><input class="input" id="s3" name="tujuan" value="${esc(s ? s.tujuan : '')}" placeholder="Contoh: Kepala SD se-Kecamatan Tegal Timur"><div class="err"></div></div>`
          : `<div class="grid-2"><div class="field"><label for="s4">Nomor Surat <span class="req">*</span></label><input class="input" id="s4" name="nomor_surat" value="${esc(s ? s.nomor_surat : '')}" placeholder="Nomor sesuai surat"><div class="err"></div></div>
              <div class="field"><label for="s5">Tanggal Surat</label><input class="input" id="s5" name="tanggal_surat" type="date" value="${esc(s ? s.tanggal_surat || '' : '')}"></div>
              <div class="field"><label for="s6">Tanggal Diterima <span class="req">*</span></label><input class="input" id="s6" name="tanggal" type="date" value="${esc(s ? s.tanggal : hariIni())}"><div class="err"></div></div>
              <div class="field"><label for="s7">Disposisi</label><select class="select" id="s7" name="disposisi">${DISPOSISI.map((d) => `<option ${s && s.disposisi === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div></div>
            <div class="field"><label for="s8">Pengirim / Instansi <span class="req">*</span></label><input class="input" id="s8" name="pengirim" value="${esc(s ? s.pengirim : '')}"><div class="err"></div></div>`}
          <div class="field"><label for="s9">Perihal <span class="req">*</span></label><input class="input" id="s9" name="perihal" value="${esc(s ? s.perihal : '')}"><div class="err"></div></div>
          ${kolomBerkas('sF', 'Berkas surat (scan)', 'PDF atau foto · maks 5 MB', s && s.file_url)}</form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fSs"><i class="bi bi-save"></i> Simpan</button>',
        onOpen: (m, close) => {
          ikatBerkas(m, 'sF', (b) => { berkas = b; });
          const f = $('#fS', m);
          const pratinjau = async () => { try { $('#sNo', m).textContent = await Data.nomorSuratBerikutnya(f.tanggal.value || hariIni()); } catch (e) { $('#sNo', m).textContent = '(otomatis saat disimpan)'; } };
          if (keluar && !s) { pratinjau(); f.tanggal.onchange = pratinjau; }
          $('#fSs', m).onclick = async () => {
            const ok = validasi(f, keluar ? { tanggal: (v) => !v ? 'Pilih tanggal.' : '', tujuan: (v) => v.length < 3 ? 'Isi tujuan surat.' : '', perihal: (v) => v.length < 3 ? 'Isi perihal.' : '' }
              : { nomor_surat: (v) => !v ? 'Isi nomor surat.' : '', tanggal: (v) => !v ? 'Pilih tanggal diterima.' : '', pengirim: (v) => v.length < 3 ? 'Isi pengirim.' : '', perihal: (v) => v.length < 3 ? 'Isi perihal.' : '' });
            if (!ok) return;
            const btn = $('#fSs', m); btn.disabled = true;
            try {
              const file_url = berkas ? await unggah(keluar ? 'surat_keluar' : 'surat_masuk', berkas) : (s ? s.file_url : null);
              const row = keluar ? { id: s && s.id, nomor_surat: s && s.nomor_surat, tanggal: f.tanggal.value, status: f.status.value, tujuan: f.tujuan.value.trim(), perihal: f.perihal.value.trim(), file_url }
                : { id: s && s.id, nomor_surat: f.nomor_surat.value.trim(), tanggal_surat: f.tanggal_surat.value, tanggal: f.tanggal.value, disposisi: f.disposisi.value, pengirim: f.pengirim.value.trim(), perihal: f.perihal.value.trim(), file_url };
              const r = await Data.simpanSurat(st.jenis, row);
              close(); toast(s ? 'Surat diperbarui.' : keluar ? `Surat keluar tersimpan dengan nomor ${r && r.nomor_surat ? r.nomor_surat : ''}.` : `Surat masuk tercatat${r && r.nomor_agenda ? ' — agenda ' + r.nomor_agenda : ''}.`, 'success');
              await muatJenis(st.jenis); tabs(); t.muat();
            } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
          };
        }
      });
    }
  }

  // ==================================================================
  // NOTULEN
  // ==================================================================
  async function halNotulen() {
    const el = await shell('notulen', 'Notulen', 'Notulensi rapat & berita acara');
    const kelola = adalah('sekretaris');
    el.innerHTML = `<div class="page-head"><div><h1>Notulen & Berita Acara Musyawarah</h1><p>Catatan keputusan rapat yang dapat dicetak beserta tanda tangan pimpinan.</p></div>
        ${kelola ? '<div class="acts"><button class="btn btn-primary" id="nBaru"><i class="bi bi-pencil-square"></i> Tulis Notulen</button></div>' : ''}</div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="nCari" placeholder="Cari judul, isi, pemimpin rapat…" aria-label="Cari notulen"></div>
        <select class="select" id="nSt" aria-label="Status"><option value="">Semua status</option><option value="terbit">Terbit</option><option value="draf">Draf</option></select></div></div>
      <div class="grid-3" id="nList">${window.K.skeletonCards(3, 120)}</div>`;
    let data = [];
    const f = { cari: '', status: '' };
    const muat = async () => { try { data = await Data.notulen(); render(); } catch (e) { gagal($('#nList'), e); } };
    function render() {
      const q = f.cari.toLowerCase();
      const rows = data.filter((n) => (!f.status || n.status === f.status) && (!q || [n.judul, n.isi, n.pemimpin, n.notulis].join(' ').toLowerCase().includes(q)));
      $('#nList').innerHTML = rows.length ? rows.map((n) => `<article class="card card-hover" style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="badge ${n.status === 'terbit' ? 'b-teal' : 'b-slate'}">${n.status === 'terbit' ? 'Terbit' : 'Draf'}</span><span class="body-sm muted">${fmt.tglPendek(n.tanggal)}</span></div>
          <h3 style="font-size:17px;font-weight:700">${esc(n.judul)}</h3>
          ${n.kegiatan ? `<div class="body-sm" style="color:var(--teal-text)"><i class="bi bi-link-45deg"></i> ${esc(n.kegiatan.judul)}</div>` : ''}
          <p class="body-sm muted" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line">${esc(n.isi || '')}</p>
          <div class="body-sm" style="margin-top:auto"><span class="muted">Pimpinan:</span> ${esc(n.pemimpin || '-')} · <span class="muted">Notulis:</span> ${esc(n.notulis || '-')}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:12px">
            <button class="btn btn-sm btn-outline" data-baca="${esc(n.id)}"><i class="bi bi-eye"></i> Baca</button><button class="btn btn-sm btn-ghost" data-cetak="${esc(n.id)}"><i class="bi bi-printer"></i> Cetak</button>
            ${kelola ? `<span style="flex:1"></span><button class="btn btn-ghost btn-icon" data-ubah="${esc(n.id)}" aria-label="Ubah"><i class="bi bi-pencil-square"></i></button><button class="btn btn-ghost btn-icon" data-hapus="${esc(n.id)}" aria-label="Hapus"><i class="bi bi-trash3"></i></button>` : ''}</div></article>`).join('')
        : `<div class="card" style="grid-column:1/-1">${emptyState('Belum ada notulen', kelola ? 'Tulis notulen rapat pertama.' : 'Notulen rapat akan tampil di sini.', 'bi-journal-text')}</div>`;
      const cari = (id) => data.find((n) => n.id === id);
      $$('[data-baca]').forEach((b) => b.onclick = () => baca(cari(b.dataset.baca)));
      $$('[data-cetak]').forEach((b) => b.onclick = () => cetakNotulen(cari(b.dataset.cetak)));
      $$('[data-ubah]').forEach((b) => b.onclick = () => form(cari(b.dataset.ubah)));
      $$('[data-hapus]').forEach((b) => b.onclick = async () => {
        const n = cari(b.dataset.hapus);
        const k = await konfirmasi({ judul: 'Hapus notulen?', bahaya: true, ok: 'Hapus', pesan: `Notulen <b>${esc(n.judul)}</b> akan dihapus permanen.` });
        if (!k.ok) return;
        try { await Data.hapusNotulen(n.id); toast('Notulen dihapus.', 'success'); muat(); } catch (e) { toast(e.message, 'error'); }
      });
    }
    const cetakNotulen = async (n) => UI.cetakIsi({ judul: 'Notulen Rapat', sub: n.judul, isi: n.isi || '',
      info: [['Hari/Tanggal', fmt.tgl(n.tanggal)], ['Kegiatan', n.kegiatan ? n.kegiatan.judul : '-'], ['Pimpinan Rapat', n.pemimpin], ['Notulis', n.notulis]],
      ttd: [{ jabatan: 'Pimpinan Rapat', nama: n.pemimpin }, { jabatan: 'Notulis', nama: n.notulis }] });
    function baca(n) {
      modal({ judul: n.judul, wide: true,
        isi: `<dl class="kv" style="margin-bottom:18px"><dt>Tanggal</dt><dd>${fmt.tgl(n.tanggal)}</dd><dt>Kegiatan</dt><dd>${esc(n.kegiatan ? n.kegiatan.judul : '-')}</dd><dt>Pimpinan rapat</dt><dd>${esc(n.pemimpin || '-')}</dd><dt>Notulis</dt><dd>${esc(n.notulis || '-')}</dd></dl>
          <div style="white-space:pre-wrap;line-height:1.7;padding:18px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border)">${esc(n.isi || '(kosong)')}</div>`,
        foot: `${n.file_url ? '<button class="btn btn-outline" id="bLamp"><i class="bi bi-paperclip"></i> Lampiran</button>' : ''}<button class="btn btn-outline" id="bCetak"><i class="bi bi-printer"></i> Cetak</button><button class="btn btn-primary" data-close>Tutup</button>`,
        onOpen: (m) => { $('#bCetak', m).onclick = () => cetakNotulen(n); if ($('#bLamp', m)) $('#bLamp', m).onclick = () => UI.lihatBerkas(n.file_url, 'lampiran-notulen'); } });
    }
    async function form(n) {
      const [keg, org, agt] = await Promise.all([Data.kegiatanPilihan().catch(() => []), Data.org(), Data.anggotaPilihan().catch(() => [])]);
      const nm = (id) => (agt.find((a) => a.id === id) || {}).nama || '';
      let berkas = null;
      modal({
        judul: n ? 'Ubah Notulen' : 'Tulis Notulen Baru', wide: true,
        isi: `<form id="fN" novalidate><div class="field"><label for="n1">Judul Rapat <span class="req">*</span></label><input class="input" id="n1" name="judul" value="${esc(n ? n.judul : '')}" placeholder="Contoh: Rakor Awal Tahun & Finalisasi Kalender Kerja"><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="n2">Kegiatan Terkait</label><select class="select" id="n2" name="kegiatan_id"><option value="">— Tidak terkait —</option>${keg.map((k) => `<option value="${esc(k.id)}" ${n && n.kegiatan_id === k.id ? 'selected' : ''}>${esc(k.judul)} (${fmt.tglPendek(k.tanggal)})</option>`).join('')}</select></div>
            <div class="field"><label for="n3">Tanggal <span class="req">*</span></label><input class="input" id="n3" name="tanggal" type="date" value="${esc(n ? n.tanggal : hariIni())}"><div class="err"></div></div>
            <div class="field"><label for="n4">Pimpinan Rapat</label><input class="input" id="n4" name="pemimpin" value="${esc(n ? n.pemimpin || '' : nm(org.ketua_id))}"></div>
            <div class="field"><label for="n5">Notulis</label><input class="input" id="n5" name="notulis" value="${esc(n ? n.notulis || '' : (Auth.profil.nama || ''))}"></div></div>
          <div class="field"><label for="n6">Isi Notulen / Keputusan <span class="req">*</span></label><textarea class="textarea" id="n6" name="isi" style="min-height:220px" placeholder="1. ...&#10;2. ...">${esc(n ? n.isi || '' : '')}</textarea><div class="err"></div>
            <span class="help">Tulis per poin. Baris baru dipertahankan saat dicetak.</span></div>
          ${kolomBerkas('nF', 'Lampiran (berita acara bertanda tangan / daftar hadir)', 'PDF atau foto · maks 5 MB', n && n.file_url)}</form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-outline" data-st="draf"><i class="bi bi-floppy"></i> Simpan Draf</button><button class="btn btn-primary" data-st="terbit"><i class="bi bi-check2-circle"></i> Terbitkan</button>',
        onOpen: (m, close) => {
          ikatBerkas(m, 'nF', (b) => { berkas = b; });
          $$('[data-st]', m).forEach((b) => b.onclick = async () => {
            const fm = $('#fN', m);
            const ok = validasi(fm, { judul: (v) => v.length < 3 ? 'Isi judul rapat.' : '', tanggal: (v) => !v ? 'Pilih tanggal.' : '', isi: (v) => b.dataset.st === 'terbit' && v.length < 10 ? 'Isi notulen minimal 10 karakter untuk diterbitkan.' : '' });
            if (!ok) return;
            $$('[data-st]', m).forEach((x) => { x.disabled = true; });
            try {
              const file_url = berkas ? await unggah('notulen', berkas) : (n ? n.file_url : null);
              await Data.simpanNotulen({ id: n && n.id, judul: fm.judul.value.trim(), kegiatan_id: fm.kegiatan_id.value, tanggal: fm.tanggal.value, pemimpin: fm.pemimpin.value.trim(),
                notulis: fm.notulis.value.trim(), isi: fm.isi.value, file_url, status: b.dataset.st });
              close(); toast(b.dataset.st === 'terbit' ? 'Notulen diterbitkan.' : 'Draf notulen disimpan.', 'success'); muat();
            } catch (e) { toast(e.message, 'error'); $$('[data-st]', m).forEach((x) => { x.disabled = false; }); }
          });
        }
      });
    }
    $('#nCari').oninput = debounce((e) => { f.cari = e.target.value; render(); }, 200);
    $('#nSt').onchange = (e) => { f.status = e.target.value; render(); };
    if (kelola) $('#nBaru').onclick = () => form(null);
    muat();
  }

  // ==================================================================
  // ARSIP DOKUMEN
  // ==================================================================
  const KAT_DOK = ['SK', 'AD-ART', 'LPJ', 'Juknis', 'Laporan', 'Lainnya'];
  const AKSES = { publik: ['b-teal', 'Publik', 'Tampil untuk siapa saja'], anggota: ['b-navy', 'Anggota', 'Semua pengguna yang login'], internal: ['b-slate', 'Internal', 'Hanya pengurus'] };
  const IKON_DOK = { SK: 'bi-patch-check', 'AD-ART': 'bi-book', LPJ: 'bi-cash-coin', Juknis: 'bi-signpost-split', Laporan: 'bi-file-earmark-bar-graph', Lainnya: 'bi-file-earmark' };

  async function halDokumen() {
    const el = await shell('dokumen', 'Dokumen', 'Arsip dokumen & legalitas');
    const kelola = adalah('sekretaris');
    el.innerHTML = `<div class="page-head"><div><h1>Arsip Dokumen & Legalitas</h1><p>SK, AD/ART, LPJ, juknis, dan laporan organisasi. Akses dokumen diatur per berkas.</p></div>
        ${kelola ? '<div class="acts"><button class="btn btn-primary" id="dBaru"><i class="bi bi-cloud-upload"></i> Unggah Dokumen</button></div>' : ''}</div>
      <div class="chip-tabs" id="dKat" role="tablist"></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="dCari" placeholder="Cari judul, kode, penerbit…" aria-label="Cari dokumen"></div>
        <select class="select" id="dAkses" aria-label="Akses"><option value="">Semua akses</option>${Object.entries(AKSES).map(([k, v]) => `<option value="${k}">${v[1]}</option>`).join('')}</select></div></div>
      <div class="grid-3" id="dList">${window.K.skeletonCards(3, 90)}</div>`;
    let data = [];
    const f = { kat: '', cari: '', akses: '' };
    const muat = async () => { try { data = await Data.dokumen(); render(); } catch (e) { gagal($('#dList'), e); } };
    function render() {
      $('#dKat').innerHTML = [['', 'Semua']].concat(KAT_DOK.map((k) => [k, k.replace('-', '/')])).map(([k, l]) => { const n = k ? data.filter((d) => d.kategori === k).length : data.length;
        return (k && !n) ? '' : `<button role="tab" aria-selected="${f.kat === k}" class="${f.kat === k ? 'active' : ''}" data-k="${k}">${l} <span class="n">${n}</span></button>`; }).join('');
      $$('#dKat [data-k]').forEach((b) => b.onclick = () => { f.kat = b.dataset.k; render(); });
      const q = f.cari.toLowerCase();
      const rows = data.filter((d) => (!f.kat || d.kategori === f.kat) && (!f.akses || d.akses === f.akses) && (!q || [d.judul, d.kode, d.penerbit].join(' ').toLowerCase().includes(q)));
      $('#dList').innerHTML = rows.length ? rows.map((d) => `<article class="card card-hover" style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;gap:14px;align-items:flex-start"><span class="icon-tile navy"><i class="bi ${IKON_DOK[d.kategori] || 'bi-file-earmark'}"></i></span>
            <div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><span class="body-sm muted tabnum">${esc(d.kode || d.kategori)}</span><span class="badge ${AKSES[d.akses][0]}">${AKSES[d.akses][1]}</span></div>
              <h3 style="font-size:16px;font-weight:700;margin-top:4px">${esc(d.judul)}</h3><div class="body-sm muted">${esc(d.penerbit || '')}</div></div></div>
          <div class="body-sm muted" style="margin-top:auto">${d.ukuran_kb ? (d.ukuran_kb >= 1024 ? (d.ukuran_kb / 1024).toFixed(1) + ' MB' : d.ukuran_kb + ' KB') + ' · ' : ''}Diunggah ${fmt.tglPendek(d.dibuat_pada)}</div>
          <div style="display:flex;gap:6px;border-top:1px solid var(--border);padding-top:12px">${d.file_url ? `<button class="btn btn-sm btn-outline" data-lihat="${esc(d.id)}"><i class="bi bi-eye"></i> Tinjau / Unduh</button>` : '<span class="body-sm muted">Tanpa berkas</span>'}
            ${kelola ? `<span style="flex:1"></span><button class="btn btn-ghost btn-icon" data-ubah="${esc(d.id)}" aria-label="Ubah"><i class="bi bi-pencil-square"></i></button><button class="btn btn-ghost btn-icon" data-hapus="${esc(d.id)}" aria-label="Hapus"><i class="bi bi-trash3"></i></button>` : ''}</div></article>`).join('')
        : `<div class="card" style="grid-column:1/-1">${emptyState('Tidak ada dokumen', kelola ? 'Unggah dokumen organisasi pertama.' : 'Belum ada dokumen yang dapat Anda akses.', 'bi-folder2-open')}</div>`;
      const cari = (id) => data.find((d) => d.id === id);
      $$('[data-lihat]').forEach((b) => b.onclick = () => { const d = cari(b.dataset.lihat); UI.lihatBerkas(d.file_url, d.judul); });
      $$('[data-ubah]').forEach((b) => b.onclick = () => form(cari(b.dataset.ubah)));
      $$('[data-hapus]').forEach((b) => b.onclick = async () => {
        const d = cari(b.dataset.hapus);
        const k = await konfirmasi({ judul: 'Hapus dokumen?', bahaya: true, ok: 'Hapus', pesan: `Dokumen <b>${esc(d.judul)}</b> akan dihapus dari arsip aplikasi. Berkas aslinya tetap tersimpan di Google Drive.` });
        if (!k.ok) return;
        try { await Data.hapusDokumen(d.id); toast('Dokumen dihapus dari arsip.', 'success'); muat(); } catch (e) { toast(e.message, 'error'); }
      });
    }
    function form(d) {
      let berkas = null;
      modal({
        judul: d ? 'Ubah Dokumen' : 'Unggah Dokumen', wide: true,
        isi: `<form id="fD" novalidate><div class="field"><label for="d1">Judul Dokumen <span class="req">*</span></label><input class="input" id="d1" name="judul" value="${esc(d ? d.judul : '')}"><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="d2">Kategori</label><select class="select" id="d2" name="kategori">${KAT_DOK.map((k) => `<option value="${k}" ${d && d.kategori === k ? 'selected' : ''}>${k.replace('-', '/')}</option>`).join('')}</select></div>
            <div class="field"><label for="d3">Kode / Nomor</label><input class="input" id="d3" name="kode" value="${esc(d ? d.kode || '' : '')}" placeholder="Contoh: DOC-SK-2025-01"></div></div>
          <div class="field"><label for="d4">Penerbit / Sumber</label><input class="input" id="d4" name="penerbit" value="${esc(d ? d.penerbit || '' : '')}" placeholder="Contoh: Disdikbud Kota Tegal"></div>
          <div class="field"><span class="label">Hak Akses <span class="req">*</span></span><div style="display:grid;gap:8px">${Object.entries(AKSES).map(([k, v]) => `<label class="check" style="padding:12px 14px;border:1px solid var(--border);border-radius:12px">
              <input type="radio" name="akses" value="${k}" ${(d ? d.akses : 'internal') === k ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--navy)"> <span><b>${v[1]}</b> — <span class="muted">${v[2]}</span></span></label>`).join('')}</div></div>
          ${kolomBerkas('dF', 'Berkas dokumen' + (d ? '' : ' <span class="req">*</span>'), 'PDF, Word, Excel, atau foto · maks 5 MB', d && d.file_url)}
          ${d ? '<p class="help">Mengubah akses tidak memindahkan berkas lama. Untuk mengubah dokumen internal menjadi publik, unggah ulang berkasnya.</p>' : ''}</form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fDs"><i class="bi bi-cloud-upload"></i> Simpan</button>',
        onOpen: (m, close) => {
          ikatBerkas(m, 'dF', (b) => { berkas = b; });
          $('#fDs', m).onclick = async () => {
            const fm = $('#fD', m);
            if (!validasi(fm, { judul: (v) => v.length < 3 ? 'Isi judul dokumen.' : '' })) return;
            if (!d && !berkas) return toast('Pilih berkas dokumen yang akan diunggah.', 'warning');
            const akses = fm.querySelector('[name=akses]:checked').value;
            const btn = $('#fDs', m); btn.disabled = true;
            try {
              const file_url = berkas ? await unggah('dokumen', berkas, { publik: akses === 'publik' }) : d.file_url;
              await Data.simpanDokumen({ id: d && d.id, judul: fm.judul.value.trim(), kategori: fm.kategori.value, kode: fm.kode.value.trim(), penerbit: fm.penerbit.value.trim(), akses, file_url,
                ukuran_kb: berkas ? Math.ceil((berkas.ukuran || berkas.base64.length * 0.75) / 1024) : d.ukuran_kb });
              close(); toast(d ? 'Dokumen diperbarui.' : 'Dokumen diunggah ke arsip.', 'success'); muat();
            } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
          };
        }
      });
    }
    $('#dCari').oninput = debounce((e) => { f.cari = e.target.value; render(); }, 200);
    $('#dAkses').onchange = (e) => { f.akses = e.target.value; render(); };
    if (kelola) $('#dBaru').onclick = () => form(null);
    muat();
  }

  Object.assign(window.AppPages, { program: halProgram, kegiatan: halKegiatan, surat: halSurat, notulen: halNotulen, dokumen: halDokumen });
})();
