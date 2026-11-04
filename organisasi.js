/* =====================================================================
   BATCH 2 — Organisasi & Persetujuan
   Data Anggota · Struktur Pengurus · Pendaftaran & Aktivasi ·
   Persetujuan (kotak masuk + tinjau) · Profil Saya
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, BULAN, BLN, ROLE_LABEL, PERINGKAT, avatar, toast, modal, konfirmasi, Router, validasi, kompresGambar, debounce, emptyState } = window.K;
  const { Auth, Data } = window.KKG;
  const { shell, muatBadge } = window.AppKit;
  const UI = window.UI;
  const peran = () => Auth.profil.role;
  const adalah = (...r) => r.includes(peran());

  const KEPEG = ['PNS', 'PPPK', 'Honorer'];
  const kepegBadge = (k) => `<span class="badge ${k === 'PNS' ? 'b-navy' : k === 'PPPK' ? 'b-teal' : 'b-slate'}">${esc(k || '-')}</span>`;

  // Unggah berkas (gambar dikompres, PDF dibaca apa adanya)
  async function siapkanBerkas(file) {
    if (file.type.startsWith('image/')) return kompresGambar(file, 1600, 0.82);
    if (file.type !== 'application/pdf') throw new Error('Hanya gambar (JPG/PNG) atau PDF.');
    if (file.size > 5 * 1024 * 1024) throw new Error('PDF maksimal 5 MB.');
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Gagal membaca berkas.')); r.readAsDataURL(file); });
    return { base64: dataUrl.split(',')[1], mime: 'application/pdf', nama: file.name, dataUrl };
  }

  // ==================================================================
  // DATA ANGGOTA
  // ==================================================================
  async function halAnggota() {
    const el = await shell('anggota', 'Data Anggota', 'Direktori guru PJOK');
    const kelola = adalah('sekretaris');
    const impor = adalah('sekretaris', 'admin_it');
    const sekolah = await Data.sekolah().catch(() => []);
    el.innerHTML = `
      <div class="page-head"><div><h1>Direktori & Data Keanggotaan</h1><p>Basis data guru PJOK se-Kecamatan Tegal Timur. ${kelola ? 'Atur juga anggota yang tampil di website publik.' : ''}</p></div>
        <div class="acts">
          ${impor ? '<button class="btn btn-outline" id="aImpor"><i class="bi bi-upload"></i> Impor CSV</button>' : ''}
          <button class="btn btn-outline" id="aXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button>
          <button class="btn btn-outline" id="aPdf"><i class="bi bi-printer"></i> PDF</button>
          ${kelola ? '<button class="btn btn-primary" id="aBaru"><i class="bi bi-person-plus"></i> Tambah Anggota</button>' : ''}</div></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0">
        <div class="search"><i class="bi bi-search"></i><input class="input" id="fCari" placeholder="Cari nama, NIP, NUPTK, sekolah…" aria-label="Cari anggota"></div>
        <select class="select" id="fSekolah" aria-label="Filter sekolah"><option value="">Semua sekolah</option>${sekolah.map((s) => `<option>${esc(s.nama)}</option>`).join('')}</select>
        <select class="select" id="fKepeg" aria-label="Filter kepegawaian"><option value="">Semua kepegawaian</option>${KEPEG.map((k) => `<option>${k}</option>`).join('')}</select>
        <select class="select" id="fStatus" aria-label="Filter status"><option value="">Semua status</option><option value="aktif">Aktif</option><option value="nonaktif">Tidak aktif</option></select>
        <select class="select" id="fPublik" aria-label="Filter tampil publik"><option value="">Tampil publik: semua</option><option value="ya">Tampil di website</option><option value="tidak">Disembunyikan</option></select>
      </div></div>
      <div id="tAnggota"></div><div id="bulk"></div>`;

    const t = UI.tabel({
      el: $('#tAnggota'), pilih: kelola, state: { urut: 'nama' },
      kosong: { judul: 'Belum ada anggota', pesan: 'Ubah filter, atau tambahkan anggota baru.', ikon: 'bi-people' },
      kolom: [
        { key: 'nama', label: 'Nama', sort: true, render: (a) => `<div style="display:flex;gap:10px;align-items:center">${avatar(a.nama, a.foto_url)}<div><b>${esc(a.nama)}</b><div class="body-sm muted">${a.nuptk ? 'NUPTK ' + esc(a.nuptk) : esc(a.email || '')}</div></div></div>` },
        { key: 'nip', label: 'NIP', sort: true, cls: 'tabnum', render: (a) => `<span style="white-space:nowrap">${esc(a.nip || '—')}</span>` },
        { key: 'sekolah', label: 'Sekolah', sort: true },
        { key: 'no_hp', label: 'No. WA', render: (a) => a.no_hp ? esc(a.no_hp) : '<span class="muted">—</span>' },
        { key: 'status_kepegawaian', label: 'Status', sort: true, render: (a) => `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">${kepegBadge(a.status_kepegawaian)}${a.status_aktif ? '<span class="badge b-green"><span class="dot"></span>Aktif</span>' : '<span class="badge b-slate">Tidak aktif</span>'}</div>` },
        { key: 'tampil_publik', label: 'Publik', render: (a) => kelola
            ? `<label class="switch" title="Tampilkan di website"><input type="checkbox" data-pub="${esc(a.id)}" ${a.tampil_publik ? 'checked' : ''} aria-label="Tampilkan ${esc(a.nama)} di website"><span></span></label>`
            : (a.tampil_publik ? '<span class="badge b-teal">Tampil</span>' : '<span class="badge b-slate">Tersembunyi</span>') }
      ],
      aksi: (a) => `<button class="btn btn-ghost btn-icon" data-lihat="${esc(a.id)}" title="Detail" aria-label="Detail ${esc(a.nama)}"><i class="bi bi-eye"></i></button>`
        + (kelola ? `<button class="btn btn-ghost btn-icon" data-ubah="${esc(a.id)}" title="Ubah" aria-label="Ubah ${esc(a.nama)}"><i class="bi bi-pencil-square"></i></button>
           <button class="btn btn-ghost btn-icon" data-hapus="${esc(a.id)}" title="Hapus" aria-label="Hapus ${esc(a.nama)}"><i class="bi bi-trash3"></i></button>` : ''),
      muat: (st) => Data.anggota(st),
      onRender: (rows) => {
        $$('[data-lihat]').forEach((b) => b.onclick = () => detailAnggota(b.dataset.lihat));
        $$('[data-ubah]').forEach((b) => b.onclick = () => formAnggota(rows.find((r) => r.id === b.dataset.ubah)));
        $$('[data-hapus]').forEach((b) => b.onclick = () => hapus(rows.find((r) => r.id === b.dataset.hapus)));
        // Optimistic toggle: UI berubah seketika, sinkron di latar
        $$('[data-pub]').forEach((c) => c.onchange = async () => {
          const r = rows.find((x) => x.id === c.dataset.pub);
          r.tampil_publik = c.checked;
          try { await Data.setPublik(r.id, c.checked); toast(`${r.nama} ${c.checked ? 'ditampilkan di' : 'disembunyikan dari'} website.`, 'success', 2200); }
          catch (e) { c.checked = !c.checked; r.tampil_publik = c.checked; toast(e.message, 'error'); }
        });
      },
      onPilih: (sel) => {
        $('#bulk').innerHTML = sel.length ? `<div class="bulkbar"><b>${sel.length} anggota dipilih</b><span class="sp"></span>
          <button class="btn btn-sm btn-teal-solid" data-bulk="tampil"><i class="bi bi-eye"></i> Tampilkan di website</button>
          <button class="btn btn-sm btn-ghost" data-bulk="sembunyi"><i class="bi bi-eye-slash"></i> Sembunyikan</button>
          <button class="btn btn-sm btn-ghost" data-bulk="ekspor"><i class="bi bi-download"></i> Ekspor</button>
          <button class="btn btn-sm btn-ghost btn-icon" data-bulk="batal" aria-label="Batalkan pilihan"><i class="bi bi-x-lg"></i></button></div>` : '';
        $$('[data-bulk]').forEach((b) => b.onclick = async () => {
          const aksi = b.dataset.bulk;
          if (aksi === 'batal') return t.bersihkanPilihan();
          if (aksi === 'ekspor') return UI.eksporCSV('anggota_terpilih', KOLOM_EKSPOR, sel);
          try { await Data.setPublik(sel.map((s) => s.id), aksi === 'tampil'); toast(`${sel.length} anggota ${aksi === 'tampil' ? 'ditampilkan' : 'disembunyikan'}.`, 'success'); t.bersihkanPilihan(); t.muat(); }
          catch (e) { toast(e.message, 'error'); }
        });
      }
    });

    const filter = (k) => (e) => { t.state[k] = e.target.value; t.muat(true); };
    $('#fCari').oninput = debounce(filter('cari'), 300);
    $('#fSekolah').onchange = filter('sekolah');
    $('#fKepeg').onchange = filter('kepeg');
    $('#fStatus').onchange = filter('status');
    $('#fPublik').onchange = filter('publik');
    if (kelola) $('#aBaru').onclick = () => formAnggota(null);
    if (impor) $('#aImpor').onclick = imporAnggota;
    const semua = async () => (await Data.anggota(Object.assign({}, t.state, { semua: true }))).rows;
    $('#aXls').onclick = async () => UI.eksporCSV('data_anggota_kkg_pjok', KOLOM_EKSPOR, await semua());
    $('#aPdf').onclick = async () => {
      const rows = await semua();
      UI.cetak({ judul: 'Laporan Data Anggota', sub: 'Keadaan per ' + fmt.tgl(new Date()) + (t.state.sekolah ? ' · ' + t.state.sekolah : ''),
        kolom: [{ label: 'Nama', key: 'nama' }, { label: 'NIP', key: 'nip' }, { label: 'Sekolah', key: 'sekolah' }, { label: 'Kepegawaian', key: 'status_kepegawaian' }, { label: 'Status', val: (a) => a.status_aktif ? 'Aktif' : 'Tidak aktif' }],
        rows, ttd: await UI.penandatangan(['ketua', 'sekretaris']) });
    };

    async function hapus(a) {
      const r = await konfirmasi({ judul: 'Hapus data anggota?', bahaya: true, ok: 'Hapus permanen',
        pesan: `Data <b>${esc(a.nama)}</b> beserta riwayat kegiatan dan iurannya akan dihapus permanen. Jika hanya berhenti aktif, sebaiknya ubah status menjadi <b>Tidak aktif</b>.` });
      if (!r.ok) return;
      try { await Data.hapusAnggota(a.id); toast('Data anggota dihapus.', 'success'); t.muat(); } catch (e) { toast(e.message, 'error'); }
    }

    function formAnggota(a) {
      let foto = null;
      modal({
        judul: a ? 'Ubah Data Anggota' : 'Tambah Anggota', wide: true,
        isi: `<form id="fA" novalidate>
          <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
            <div style="flex:none;text-align:center"><label class="dropzone" for="fAfoto" style="flex-direction:column;padding:12px;gap:8px">
              <span class="preview" id="fAprev" style="width:104px;height:104px">${a && a.foto_url ? `<img src="${esc(a.foto_url)}" alt="">` : '<i class="bi bi-person-bounding-box"></i>'}</span>
              <span class="body-sm"><b>Pasfoto</b><br><span class="help">Klik untuk ganti</span></span></label>
              <input type="file" id="fAfoto" accept="image/jpeg,image/png" class="sr-only"></div>
            <div style="flex:1;min-width:260px">
              <div class="field"><label for="a1">Nama Lengkap & Gelar <span class="req">*</span></label><input class="input" id="a1" name="nama" value="${esc(a ? a.nama : '')}"><div class="err"></div></div>
              <div class="grid-2">
                <div class="field"><label for="a2">NIP</label><input class="input tabnum" id="a2" name="nip" inputmode="numeric" value="${esc(a ? a.nip || '' : '')}"><div class="err"></div></div>
                <div class="field"><label for="a3">NUPTK</label><input class="input tabnum" id="a3" name="nuptk" inputmode="numeric" value="${esc(a ? a.nuptk || '' : '')}"><div class="err"></div></div>
              </div>
            </div></div>
          <div class="grid-2">
            <div class="field"><label for="a4">Email Google</label><input class="input" id="a4" name="email" type="email" value="${esc(a ? a.email || '' : '')}"><div class="err"></div></div>
            <div class="field"><label for="a5">No. WhatsApp</label><input class="input" id="a5" name="no_hp" inputmode="tel" value="${esc(a ? a.no_hp || '' : '')}"><div class="err"></div></div>
            <div class="field"><label for="a6">Sekolah Induk <span class="req">*</span></label>${UI.kolomSekolah({ id: 'a6', nilai: a ? a.sekolah : '' })}<div class="err"></div><span class="help">Ketik manual; saran muncul dari sekolah yang sudah terdaftar.</span></div>
            <div class="field"><label for="a7">Status Kepegawaian</label><select class="select" id="a7" name="status_kepegawaian">${KEPEG.map((k) => `<option ${a && a.status_kepegawaian === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
          </div>
          <div class="field"><label for="a8">Kompetensi / Cabang Olahraga</label><input class="input" id="a8" name="kompetensi" value="${esc(a ? a.kompetensi || '' : '')}" placeholder="Contoh: Atletik & Senam"></div>
          <div style="display:grid;gap:12px;padding:16px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border)">
            <label class="check" style="justify-content:space-between"><span><b>Status keaktifan organisasi</b><br><span class="help">Anggota tidak aktif tidak dihitung dalam iuran & statistik.</span></span>
              <span class="switch"><input type="checkbox" name="status_aktif" ${!a || a.status_aktif ? 'checked' : ''}><span></span></span></label>
            <label class="check" style="justify-content:space-between"><span><b>Tampilkan di website publik</b><br><span class="help">Nama, sekolah & foto tampil di halaman Data Anggota. NIP disamarkan, No. HP tidak pernah tampil.</span></span>
              <span class="switch"><input type="checkbox" name="tampil_publik" ${a && a.tampil_publik ? 'checked' : ''}><span></span></span></label>
          </div></form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fAsimpan"><i class="bi bi-save"></i> Simpan Data</button>',
        onOpen: (m, close) => {
          const f = $('#fA', m);
          UI.pasangSaranSekolah(f.sekolah);
          f.nip.oninput = () => { f.nip.value = f.nip.value.replace(/\D/g, ''); };
          f.nuptk.oninput = () => { f.nuptk.value = f.nuptk.value.replace(/\D/g, ''); };
          $('#fAfoto', m).onchange = async (e) => {
            try { foto = await kompresGambar(e.target.files[0], 600, 0.85); $('#fAprev', m).innerHTML = `<img src="${foto.dataUrl}" alt="">`; } catch (err) { toast(err.message, 'error'); }
          };
          $('#fAsimpan', m).onclick = async () => {
            const ok = validasi(f, {
              nama: (v) => v.length < 3 ? 'Nama wajib diisi.' : '',
              nip: (v) => v && !/^\d{8,20}$/.test(v) ? 'NIP berupa angka 8–20 digit.' : (!v && !f.nuptk.value.trim() ? 'Isi NIP atau NUPTK.' : ''),
              email: (v) => v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Format email tidak valid.' : '',
              no_hp: (v) => v && !/^[0-9+\-\s]{9,16}$/.test(v) ? 'Nomor tidak valid.' : '',
              sekolah: (v) => UI.cekSekolah(v)
            });
            if (!ok) return;
            const btn = $('#fAsimpan', m); btn.disabled = true;
            try {
              let foto_url = a ? a.foto_url : null;
              if (foto) foto_url = (await Data.upload('foto_profil', { base64: foto.base64, mime: foto.mime, nama: foto.nama, dataUrl: foto.dataUrl })).url;
              await Data.simpanAnggota({ id: a && a.id, nama: f.nama.value.trim(), nip: f.nip.value.trim(), nuptk: f.nuptk.value.trim(), email: f.email.value.trim(),
                no_hp: f.no_hp.value.trim(), sekolah: UI.rapikanSekolah(f.sekolah.value), status_kepegawaian: f.status_kepegawaian.value, kompetensi: f.kompetensi.value.trim(),
                foto_url, status_aktif: f.status_aktif.checked, tampil_publik: f.tampil_publik.checked });
              close(); toast(a ? 'Data anggota diperbarui.' : 'Anggota baru ditambahkan.', 'success'); t.muat();
            } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
          };
        }
      });
    }

    function imporAnggota() {
      let valid = [];
      const templat = 'nama;nip;nuptk;email;sekolah;status_kepegawaian;no_hp;kompetensi\r\nBudi Santoso, S.Pd.Jas;198204152008011008;;budi@gmail.com;SD Negeri Slerok 2;PNS;081234567890;Atletik';
      modal({
        judul: 'Impor Data Anggota (CSV)', wide: true,
        isi: `<div class="alert info" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><div>Simpan berkas Excel sebagai <b>CSV</b>. Kolom: <code>nama; nip; nuptk; email; sekolah; status_kepegawaian; no_hp; kompetensi</code>.
            <a href="data:text/csv;charset=utf-8,${encodeURIComponent('﻿' + templat)}" download="templat_impor_anggota.csv">Unduh templat</a></div></div>
          <label class="dropzone" for="impFile"><span class="preview"><i class="bi bi-filetype-csv"></i></span><span><b>Pilih berkas CSV</b> atau seret ke sini<br><span class="help">Data dicek dulu sebelum disimpan — tidak ada yang tersimpan sampai Anda menekan Impor.</span></span></label>
          <input type="file" id="impFile" accept=".csv,text/csv" class="sr-only"><div id="impHasil" style="margin-top:16px"></div>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="impGo" disabled><i class="bi bi-cloud-upload"></i> Impor</button>',
        onOpen: (m, close) => {
          $('#impFile', m).onchange = async (e) => {
            const file = e.target.files[0]; if (!file) return;
            $('#impHasil', m).innerHTML = '<div class="skel skel-block"></div>';
            try {
              const data = UI.bacaCSV(await file.text());
              if (!data.length) throw new Error('Berkas kosong atau format tidak dikenali.');
              if (!('nama' in data[0])) throw new Error('Kolom "nama" tidak ditemukan. Gunakan templat.');
              const ada = new Set((await Data.anggota({ semua: true })).rows.map((a) => a.nip).filter(Boolean));
              const dlmBerkas = new Set();
              const hasil = data.map((r) => {
                const nip = String(r.nip || '').replace(/\D/g, '');
                let st = 'OK';
                if (!r.nama || r.nama.length < 3) st = 'Nama kosong';
                else if (nip && !/^\d{8,20}$/.test(nip)) st = 'NIP tidak valid';
                else if (!nip && !r.nuptk) st = 'NIP/NUPTK kosong';
                else if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) st = 'Email tidak valid';
                else if (nip && ada.has(nip)) st = 'Duplikat (sudah ada)';
                else if (nip && dlmBerkas.has(nip)) st = 'Duplikat (dalam berkas)';
                if (nip) dlmBerkas.add(nip);
                return { st, row: { nama: r.nama, nip: nip || null, nuptk: r.nuptk || null, email: r.email ? r.email.toLowerCase() : null, sekolah: UI.rapikanSekolah(r.sekolah) || null,
                  status_kepegawaian: KEPEG.includes(r.status_kepegawaian) ? r.status_kepegawaian : 'PNS', no_hp: r.no_hp || null, kompetensi: r.kompetensi || null },
                  catatan: '' };
              });
              valid = hasil.filter((h) => h.st === 'OK').map((h) => h.row);
              const dup = hasil.filter((h) => h.st.startsWith('Duplikat')).length;
              const err = hasil.length - valid.length - dup;
              $('#impHasil', m).innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
                  <span class="badge b-green">${valid.length} data valid</span><span class="badge b-amber">${dup} duplikat</span><span class="badge b-red">${err} galat</span></div>
                <div class="import-preview"><table class="tbl"><thead><tr><th>#</th><th>Nama</th><th>NIP</th><th>Sekolah</th><th>Validasi</th></tr></thead><tbody>
                ${hasil.slice(0, 200).map((h, i) => `<tr><td>${i + 1}</td><td>${esc(h.row.nama || '')}</td><td class="tabnum">${esc(h.row.nip || h.row.nuptk || '')}</td><td>${esc(h.row.sekolah || '—')}${h.catatan ? `<div class="body-sm" style="color:var(--b-amber-tx)">${h.catatan}</div>` : ''}</td>
                  <td><span class="badge ${h.st === 'OK' ? 'b-green' : h.st.startsWith('Duplikat') ? 'b-amber' : 'b-red'}">${esc(h.st)}</span></td></tr>`).join('')}</tbody></table></div>`;
              const go = $('#impGo', m); go.disabled = !valid.length; go.innerHTML = `<i class="bi bi-cloud-upload"></i> Impor ${valid.length} data valid`;
            } catch (err) { $('#impHasil', m).innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i><div>${esc(err.message)}</div></div>`; }
          };
          $('#impGo', m).onclick = async () => {
            const go = $('#impGo', m); go.disabled = true;
            try { const n = await Data.imporAnggota(valid); close(); toast(`${n} anggota berhasil diimpor.`, 'success'); t.muat(true); }
            catch (err) { toast(err.message, 'error'); go.disabled = false; }
          };
        }
      });
    }
  }

  const KOLOM_EKSPOR = [
    { label: 'Nama', key: 'nama' }, { label: 'NIP', key: 'nip' }, { label: 'NUPTK', key: 'nuptk' }, { label: 'Email', key: 'email' },
    { label: 'Sekolah', key: 'sekolah' }, { label: 'Kepegawaian', key: 'status_kepegawaian' }, { label: 'No. WA', key: 'no_hp' },
    { label: 'Kompetensi', key: 'kompetensi' }, { label: 'Status', val: (a) => a.status_aktif ? 'Aktif' : 'Tidak aktif' },
    { label: 'Tampil Publik', val: (a) => a.tampil_publik ? 'Ya' : 'Tidak' }, { label: 'Tanggal Gabung', key: 'tanggal_gabung' }
  ];

  async function detailAnggota(id) {
    const dr = UI.drawer({ judul: 'Detail Anggota', isi: '<div class="skel skel-block"></div><div class="skel skel-block" style="margin-top:16px"></div>' });
    try {
      const d = await Data.detailAnggota(id);
      const a = d.anggota;
      const bulanIni = new Date().getMonth() + 1;
      const lihatIuran = adalah('ketua', 'bendahara') && Array.isArray(d.iuran);
      const st = (m) => { const x = (d.iuran || []).find((i) => i.bulan === m); return x ? x.status : (m <= bulanIni ? 'belum' : 'nanti'); };
      $('.drawer-body', dr.el).innerHTML = `
        <div style="text-align:center">${avatar(a.nama, a.foto_url, 'lg ring')}<h3 style="margin-top:14px;font-size:19px">${esc(a.nama)}</h3>
          <p class="muted body-sm">${esc(a.sekolah || '-')}</p>
          <div style="display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap">${kepegBadge(a.status_kepegawaian)}
            ${a.status_aktif ? '<span class="badge b-green">Aktif</span>' : '<span class="badge b-slate">Tidak aktif</span>'}
            ${(d.jabatan || []).map((j) => `<span class="badge b-solid-navy">${esc(j.jabatan)}</span>`).join('')}</div></div>
        <hr style="border:0;border-top:1px solid var(--border);margin:20px 0">
        <dl class="kv"><dt>NIP</dt><dd class="tabnum">${esc(a.nip || '—')}</dd><dt>NUPTK</dt><dd class="tabnum">${esc(a.nuptk || '—')}</dd>
          <dt>Email</dt><dd>${esc(a.email || '—')}</dd><dt>No. WhatsApp</dt><dd>${esc(a.no_hp || '—')}</dd>
          <dt>Kompetensi</dt><dd>${esc(a.kompetensi || '—')}</dd><dt>Bergabung</dt><dd>${fmt.tgl(a.tanggal_gabung)}</dd>
          <dt>Website publik</dt><dd>${a.tampil_publik ? 'Ditampilkan' : 'Disembunyikan'}</dd></dl>
        ${lihatIuran ? `<h4 style="margin:24px 0 10px;font-size:15px">Iuran ${new Date().getFullYear()}</h4>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${BLN.map((b, i) => { const s = st(i + 1);
            const c = { lunas: 'b-green', menunggu: 'b-amber', belum: 'b-red', nanti: 'b-slate' }[s];
            return `<div class="${c}" style="border-radius:8px;padding:6px 2px;text-align:center" title="${b}: ${s}"><div class="label-sm">${b}</div></div>`; }).join('')}</div>
          <p class="body-sm muted" style="margin-top:6px">Lunas ${(d.iuran || []).filter((i) => i.status === 'lunas').length} dari ${bulanIni} bulan berjalan</p>` : ''}
        <h4 style="margin:24px 0 10px;font-size:15px">Kegiatan Terakhir</h4>
        ${(d.kegiatan || []).length ? (d.kegiatan || []).map((k) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span>${esc(k.kegiatan ? k.kegiatan.judul : '-')}<br><small class="muted">${fmt.tglPendek(k.kegiatan && k.kegiatan.tanggal)}</small></span>
            ${k.hadir === 'hadir' ? '<span class="badge b-green">Hadir</span>' : k.hadir === 'izin' ? '<span class="badge b-amber">Izin</span>' : k.hadir === 'alpa' ? '<span class="badge b-red">Alpa</span>' : '<span class="badge b-slate">Terdaftar</span>'}</div>`).join('')
          : '<p class="muted body-sm">Belum mengikuti kegiatan.</p>'}`;
    } catch (e) { $('.drawer-body', dr.el).innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div>`; }
  }

  // ==================================================================
  // STRUKTUR PENGURUS
  // ==================================================================
  const JABATAN = ['Ketua', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Admin IT & Publikasi', 'Koordinator Bidang Kurikulum', 'Koordinator Bidang Lomba', 'Anggota Pengurus'];

  async function halPengurus() {
    const el = await shell('pengurus', 'Struktur Pengurus', 'Susunan pengurus per periode');
    const kelola = adalah('sekretaris');
    el.innerHTML = `<div class="page-head"><div><h1>Struktur Pengurus & Hierarki Organisasi</h1><p>Urutan di sini menentukan tampilan bagan di website publik.</p></div>
        <div class="acts"><select class="select" id="pPer" style="width:auto" aria-label="Periode"></select>
        ${kelola ? '<button class="btn btn-primary" id="pBaru"><i class="bi bi-plus-lg"></i> Tambah Jabatan</button>' : ''}</div></div>
      <div class="dash-grid"><section class="card span-7" style="padding:0;overflow:hidden"><div class="card-title" style="padding:20px 24px 0"><h3>Daftar Jabatan</h3><span class="badge b-slate" id="pJml"></span></div><div id="pList"><div class="skel skel-block" style="margin:24px"></div></div></section>
        <section class="card span-5"><div class="card-title"><h3>Pratinjau Bagan</h3><a class="btn btn-ghost btn-sm" href="#/profil#struktur" title="Lihat di website"><i class="bi bi-box-arrow-up-right"></i> Website</a></div><div id="pBagan"></div></section></div>`;

    let semua = [];
    let periode = null;
    const muat = async () => {
      try {
        semua = adalah('anggota')
          ? (await Data.pengurusPublik()).map((p) => ({ id: p.id, jabatan: p.jabatan, urutan: p.urutan, periode_mulai: p.periode_mulai, periode_selesai: p.periode_selesai, sk_nomor: p.sk_nomor, anggota: { nama: p.nama, sekolah: p.sekolah, foto_url: p.foto_url } }))
          : await Data.pengurusDaftar();
        const per = [...new Set(semua.map((p) => `${p.periode_mulai}–${p.periode_selesai}`))].sort().reverse();
        const th = new Date().getFullYear();
        if (!periode) periode = per.find((x) => { const [a, b] = x.split('–').map(Number); return th >= a && th <= b; }) || per[0] || `${th}–${th + 3}`;
        $('#pPer').innerHTML = (per.length ? per : [periode]).map((p) => `<option ${p === periode ? 'selected' : ''}>${p}</option>`).join('');
        render();
      } catch (e) { $('#pList').innerHTML = `<div class="alert error" style="margin:24px"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div>`; }
    };
    const daftarPeriode = () => semua.filter((p) => `${p.periode_mulai}–${p.periode_selesai}` === periode).sort((a, b) => a.urutan - b.urutan);

    function render() {
      const list = daftarPeriode();
      $('#pJml').textContent = list.length + ' jabatan';
      $('#pList').innerHTML = list.length ? list.map((p, i) => `<div style="display:flex;gap:12px;align-items:center;padding:14px 24px;border-top:1px solid var(--border)">
          ${kelola ? `<div style="display:flex;flex-direction:column;gap:2px"><button class="btn btn-ghost btn-icon" style="width:30px;min-height:24px" data-naik="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Naikkan urutan"><i class="bi bi-chevron-up"></i></button>
            <button class="btn btn-ghost btn-icon" style="width:30px;min-height:24px" data-turun="${i}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Turunkan urutan"><i class="bi bi-chevron-down"></i></button></div>` : `<span class="rank-no">${i + 1}</span>`}
          ${avatar(p.anggota && p.anggota.nama, p.anggota && p.anggota.foto_url)}
          <div style="flex:1;min-width:0"><span class="badge ${i === 0 ? 'b-solid-navy' : 'b-navy'}">${esc(p.jabatan)}</span>
            <div style="font-weight:700;margin-top:4px">${esc(p.anggota ? p.anggota.nama : '(anggota dihapus)')}</div>
            <div class="body-sm muted">${esc(p.anggota ? p.anggota.sekolah || '' : '')}${p.sk_nomor ? ' · SK ' + esc(p.sk_nomor) : ''}</div></div>
          ${kelola ? `<div class="actions" style="display:flex;gap:4px"><button class="btn btn-ghost btn-icon" data-ubah="${esc(p.id)}" aria-label="Ubah"><i class="bi bi-pencil-square"></i></button>
            <button class="btn btn-ghost btn-icon" data-hapus="${esc(p.id)}" aria-label="Hapus"><i class="bi bi-trash3"></i></button></div>` : ''}</div>`).join('')
        : `<div style="border-top:1px solid var(--border)">${emptyState('Belum ada pengurus pada periode ini', kelola ? 'Tambahkan jabatan pertama — mulai dari Ketua.' : 'Struktur belum diisi Sekretaris.', 'bi-diagram-3')}</div>`;

      // Bagan mini
      const node = (p, top) => `<div class="node ${top ? 'top' : ''}"><small>${esc(p.jabatan)}</small><b>${esc(p.anggota ? p.anggota.nama.split(',')[0] : '-')}</b></div>`;
      const [a, ...r] = list;
      const wakil = r.filter((p) => /wakil/i.test(p.jabatan));
      const sisa = r.filter((p) => !/wakil/i.test(p.jabatan));
      $('#pBagan').innerHTML = a ? `<div class="org-mini"><div class="row">${node(a, true)}</div>${wakil.length ? `<i class="bi bi-arrow-down muted"></i><div class="row">${wakil.map((p) => node(p)).join('')}</div>` : ''}
          ${sisa.length ? `<i class="bi bi-arrow-down muted"></i><div class="row">${sisa.map((p) => node(p)).join('')}</div>` : ''}</div>` : '<p class="muted body-sm">Bagan muncul setelah jabatan ditambahkan.</p>';

      if (!kelola) return;
      const tukar = async (i, j) => {
        const l = daftarPeriode();
        const ui = l.map((p, k) => ({ id: p.id, urutan: (k === i ? j : k === j ? i : k) + 1 }));
        ui.forEach((u) => { semua.find((p) => p.id === u.id).urutan = u.urutan; });
        render(); // optimistik
        try { await Data.aturUrutan(ui); } catch (e) { toast(e.message, 'error'); muat(); }
      };
      $$('[data-naik]').forEach((b) => b.onclick = () => tukar(+b.dataset.naik, +b.dataset.naik - 1));
      $$('[data-turun]').forEach((b) => b.onclick = () => tukar(+b.dataset.turun, +b.dataset.turun + 1));
      $$('[data-ubah]').forEach((b) => b.onclick = () => form(semua.find((p) => p.id === b.dataset.ubah)));
      $$('[data-hapus]').forEach((b) => b.onclick = async () => {
        const p = semua.find((x) => x.id === b.dataset.hapus);
        const r2 = await konfirmasi({ judul: 'Hapus jabatan?', bahaya: true, ok: 'Hapus', pesan: `Jabatan <b>${esc(p.jabatan)}</b> (${esc(p.anggota ? p.anggota.nama : '')}) akan dihapus dari struktur. Data anggotanya tetap ada.` });
        if (!r2.ok) return;
        try { await Data.hapusPengurus(p.id); toast('Jabatan dihapus.', 'success'); muat(); } catch (e) { toast(e.message, 'error'); }
      });
    }

    async function form(p) {
      const agt = await Data.anggotaPilihan();
      const [pm, ps] = (periode || '').split('–');
      modal({
        judul: p ? 'Ubah Jabatan' : 'Tambah Jabatan Pengurus',
        isi: `<form id="fP" novalidate>
          <div class="field"><label for="p1">Anggota <span class="req">*</span></label><select class="select" id="p1" name="anggota_id"><option value="">Pilih anggota…</option>
            ${agt.map((a) => `<option value="${esc(a.id)}" ${p && p.anggota_id === a.id ? 'selected' : ''}>${esc(a.nama)} — ${esc(a.sekolah || '')}</option>`).join('')}</select><div class="err"></div></div>
          <div class="field"><label for="p2">Jabatan <span class="req">*</span></label><input class="input" id="p2" name="jabatan" list="dlJab" value="${esc(p ? p.jabatan : '')}" placeholder="Pilih atau ketik jabatan"><datalist id="dlJab">${JABATAN.map((j) => `<option>${j}</option>`).join('')}</datalist><div class="err"></div></div>
          <div class="grid-2"><div class="field"><label for="p3">Periode Mulai <span class="req">*</span></label><input class="input tabnum" id="p3" name="periode_mulai" type="number" value="${esc(p ? p.periode_mulai : pm)}"><div class="err"></div></div>
            <div class="field"><label for="p4">Periode Selesai <span class="req">*</span></label><input class="input tabnum" id="p4" name="periode_selesai" type="number" value="${esc(p ? p.periode_selesai : ps)}"><div class="err"></div></div></div>
          <div class="grid-2"><div class="field"><label for="p5">Urutan Tampil</label><input class="input tabnum" id="p5" name="urutan" type="number" min="1" value="${esc(p ? p.urutan : daftarPeriode().length + 1)}"></div>
            <div class="field"><label for="p6">Nomor SK</label><input class="input" id="p6" name="sk_nomor" value="${esc(p ? p.sk_nomor || '' : '')}"></div></div></form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fPs"><i class="bi bi-save"></i> Simpan</button>',
        onOpen: (m, close) => {
          $('#fPs', m).onclick = async () => {
            const f = $('#fP', m);
            const ok = validasi(f, { anggota_id: (v) => !v ? 'Pilih anggota.' : '', jabatan: (v) => !v ? 'Isi jabatan.' : '',
              periode_mulai: (v) => !(+v > 2000) ? 'Tahun tidak valid.' : '', periode_selesai: (v) => !(+v >= +f.periode_mulai.value) ? 'Harus ≥ tahun mulai.' : '' });
            if (!ok) return;
            try {
              await Data.simpanPengurus({ id: p && p.id, anggota_id: f.anggota_id.value, jabatan: f.jabatan.value.trim(), periode_mulai: f.periode_mulai.value, periode_selesai: f.periode_selesai.value, urutan: f.urutan.value, sk_nomor: f.sk_nomor.value.trim() });
              periode = `${f.periode_mulai.value}–${f.periode_selesai.value}`;
              close(); toast('Struktur pengurus disimpan.', 'success'); muat();
            } catch (e) { toast(e.message, 'error'); }
          };
        }
      });
    }

    $('#pPer').onchange = (e) => { periode = e.target.value; render(); };
    if (kelola) $('#pBaru').onclick = () => form(null);
    muat();
  }

  // ==================================================================
  // PENDAFTARAN & AKTIVASI
  // ==================================================================
  const ST_DAFTAR = { menunggu: ['b-amber', 'Menunggu Persetujuan'], disetujui: ['b-navy', 'Belum Diaktifkan'], aktif: ['b-green', 'Akun Aktif'], ditolak: ['b-red', 'Ditolak'] };
  const badgeDaftar = (s) => `<span class="badge ${ST_DAFTAR[s][0]}">${s === 'menunggu' ? '<span class="dot pulse"></span>' : ''}${ST_DAFTAR[s][1]}</span>`;

  async function halPendaftaran() {
    const el = await shell('pendaftaran', 'Pendaftaran Anggota', 'Persetujuan anggota baru');
    const pemutus = adalah('admin_it', 'ketua', 'sekretaris');
    const admin = adalah('admin_it');
    const st = { tab: 'menunggu', cari: '', halaman: 1, per: 10, urut: 'dibuat_pada', naik: false };
    el.innerHTML = `<div class="page-head"><div><h1>Persetujuan Anggota Baru</h1>
        <p>Alur: pendaftar mengisi formulir → <b>Admin IT, Ketua, atau Sekretaris</b> menyetujui → akun langsung aktif dan <b>username & kata sandi dikirim otomatis ke email</b> pendaftar.</p></div></div>
      <div class="chip-tabs" id="dTabs" role="tablist"></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0"><div class="search"><i class="bi bi-search"></i><input class="input" id="dCari" placeholder="Cari nama, NIP, email, sekolah…" aria-label="Cari pendaftar"></div></div></div>
      <div id="dTabel"></div>`;
    let data = [];
    const TABS = [['menunggu', 'Menunggu Persetujuan'], ['disetujui', 'Belum Diaktifkan'], ['aktif', 'Disetujui & Aktif'], ['ditolak', 'Ditolak'], ['', 'Semua']];
    const renderTabs = () => {
      $('#dTabs').innerHTML = TABS.filter(([k]) => k !== 'disetujui' || data.some((d) => d.status === 'disetujui')).map(([k, l]) => { const n = k ? data.filter((d) => d.status === k).length : data.length;
        return `<button role="tab" aria-selected="${st.tab === k}" class="${st.tab === k ? 'active' : ''}" data-tab="${k}">${l} <span class="n">${n}</span></button>`; }).join('');
      $$('#dTabs [data-tab]').forEach((b) => b.onclick = () => { st.tab = b.dataset.tab; renderTabs(); t.muat(true); });
    };
    const lihatBtn = (d) => `<button class="btn btn-ghost btn-icon" data-tinjau="${esc(d.id)}" aria-label="Lihat detail" title="Lihat detail"><i class="bi bi-eye"></i></button>`;
    const t = UI.tabel({
      el: $('#dTabel'), state: st,
      kosong: { judul: 'Tidak ada pendaftaran', pesan: 'Pendaftaran baru dari website akan muncul di sini.', ikon: 'bi-person-plus' },
      kolom: [
        { key: 'nama', label: 'Pendaftar', sort: true, render: (d) => `<div style="display:flex;gap:10px;align-items:center">${avatar(d.nama, d.foto_url)}<div><b>${esc(d.nama)}</b><div class="body-sm muted">${esc(d.no_hp || 'Tanpa No. HP')}</div></div></div>` },
        { key: 'nip', label: 'NIP / NUPTK', cls: 'tabnum' },
        { key: 'email', label: 'Email', sort: true },
        { key: 'sekolah', label: 'Sekolah', sort: true },
        { key: 'dibuat_pada', label: 'Tanggal Daftar', sort: true, render: (d) => `${fmt.tglPendek(d.dibuat_pada)}<div class="body-sm muted">${fmt.relatif(d.dibuat_pada)}</div>` },
        { key: 'status', label: 'Status', render: (d) => badgeDaftar(d.status) }
      ],
      aksi: (d) => {
        if (!pemutus) return lihatBtn(d);
        if (d.status === 'menunggu') return `<button class="btn btn-primary btn-sm" data-tinjau="${esc(d.id)}"><i class="bi bi-search"></i> Tinjau</button>`;
        if (d.status === 'disetujui') return `<button class="btn btn-sm btn-teal-solid" data-aktif="${esc(d.id)}"><i class="bi bi-person-check"></i> Aktifkan & Kirim Akun</button>`;
        if (d.status === 'aktif') return `${lihatBtn(d)}<button class="btn btn-ghost btn-icon" data-ulang="${esc(d.id)}" aria-label="Kirim ulang username & kata sandi" title="Kirim ulang username & kata sandi"><i class="bi bi-envelope-arrow-up"></i></button>`;
        return lihatBtn(d);
      },
      muat: async (s) => {
        if (!data.length || s._segar) { data = await Data.pendaftaran(); s._segar = false; renderTabs(); }
        const r = UI.saringLokal(data, s, { cari: ['nama', 'nip', 'email', 'sekolah'], filter: { tab: (x, v) => x.status === v } });
        return { rows: r.rows, total: r.total };
      },
      onRender: (rows) => {
        $$('[data-tinjau]').forEach((b) => b.onclick = () => tinjau(rows.find((r) => r.id === b.dataset.tinjau)));
        $$('[data-aktif]').forEach((b) => b.onclick = () => aktivasi(rows.find((r) => r.id === b.dataset.aktif)));
        $$('[data-ulang]').forEach((b) => b.onclick = () => kirimUlang(rows.find((r) => r.id === b.dataset.ulang)));
      }
    });
    $('#dCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
    const segarkan = () => { st._segar = true; t.muat(); muatBadge(); };

    function tinjau(d) {
      const bisa = pemutus && d.status === 'menunggu';
      modal({
        judul: bisa ? 'Persetujuan Anggota Baru' : 'Detail Pendaftaran', wide: true,
        isi: `<div style="display:flex;gap:20px;flex-wrap:wrap">
            <div style="flex:none">${d.foto_url ? `<img src="${esc(d.foto_url)}" alt="Foto ${esc(d.nama)}" style="width:150px;height:150px;object-fit:cover;border-radius:16px;border:1px solid var(--border)" referrerpolicy="no-referrer">` : `<div class="avatar lg" style="width:150px;height:150px;border-radius:16px;font-size:40px">${esc(fmt.inisial(d.nama))}</div>`}</div>
            <div style="flex:1;min-width:240px">${badgeDaftar(d.status)}<h3 style="font-size:20px;margin:10px 0 14px">${esc(d.nama)}</h3>
              <dl class="kv"><dt>NIP / NUPTK</dt><dd class="tabnum">${esc(d.nip)}</dd><dt>Email</dt><dd>${esc(d.email)}</dd><dt>Sekolah</dt><dd>${esc(d.sekolah)}</dd>
                <dt>No. WhatsApp</dt><dd>${esc(d.no_hp || '—')}</dd><dt>Tanggal daftar</dt><dd>${fmt.tgl(d.dibuat_pada)}</dd>
                ${d.catatan ? `<dt>Catatan keputusan</dt><dd>${esc(d.catatan)}<br><small class="muted">${fmt.tgl(d.diputus_pada)}</small></dd>` : ''}</dl></div></div>
          ${bisa ? `<div class="field" style="margin:24px 0 0"><label for="dCat">Catatan keputusan <span class="req">*</span></label>
            <textarea class="textarea" id="dCat" style="min-height:90px" placeholder="Contoh: Data sesuai SK tugas, NIP terverifikasi."></textarea><div class="err"><i class="bi bi-exclamation-circle"></i>Minimal 5 karakter.</div>
            <span class="help">Catatan tersimpan di riwayat. Jika ditolak, catatan dikirim ke email pendaftar.</span></div>
            <div class="alert info" style="margin-top:14px"><i class="bi bi-envelope-check"></i><div>Jika <b>disetujui</b>: akun langsung aktif sebagai <b>Anggota</b>, lalu <b>username & kata sandi</b> dikirim otomatis ke <b>${esc(d.email)}</b>.</div></div>` : ''}`,
        foot: bisa ? `<button class="btn btn-danger-outline" data-k="0"><i class="bi bi-x-circle"></i> Tolak</button><button class="btn btn-success" data-k="1"><i class="bi bi-check2-circle"></i> Setujui & Kirim Akun</button>` : '<button class="btn btn-ghost" data-close>Tutup</button>',
        onOpen: (m, close) => {
          $$('[data-k]', m).forEach((b) => b.onclick = async () => {
            const setuju = b.dataset.k === '1';
            const cat = $('#dCat', m).value.trim();
            if (cat.length < 5) { $('#dCat', m).closest('.field').classList.add('invalid'); $('#dCat', m).focus(); return; }
            if (!setuju) { const k = await konfirmasi({ judul: 'Tolak pendaftaran?', bahaya: true, ok: 'Ya, tolak', pesan: `Pendaftaran <b>${esc(d.nama)}</b> akan ditolak dan pendaftar diberi tahu lewat email.` }); if (!k.ok) return; }
            $$('[data-k]', m).forEach((x) => { x.disabled = true; });
            b.innerHTML = '<span class="spin"></span> Memproses…';
            try {
              await Data.putuskanPendaftaran(d.id, setuju, cat);
              close(); segarkan();
              if (setuju) kirimAkun(d); else toast('Pendaftaran ditolak. Pendaftar diberi tahu lewat email.', 'success');
            } catch (e) { toast(e.message, 'error'); $$('[data-k]', m).forEach((x) => { x.disabled = false; }); b.innerHTML = setuju ? '<i class="bi bi-check2-circle"></i> Setujui & Kirim Akun' : '<i class="bi bi-x-circle"></i> Tolak'; }
          });
        }
      });
    }

    // Pendaftaran lama yang sudah disetujui tetapi belum diaktifkan
    function aktivasi(d) {
      modal({
        judul: 'Aktifkan Akun & Kirim Username',
        isi: `<div style="display:flex;gap:14px;align-items:center;padding:14px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border)">${avatar(d.nama, d.foto_url)}
            <div><b>${esc(d.nama)}</b><div class="body-sm muted">${esc(d.email)} · ${esc(d.sekolah)}</div></div></div>
          ${admin ? `<div class="field" style="margin-top:18px"><label for="aRole">Peran Akses</label><select class="select" id="aRole">${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}" ${k === 'anggota' ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <span class="help">Peran pengurus hanya diberikan sesuai SK kepengurusan.</span></div>` : '<p class="help" style="margin-top:14px">Akun dibuat dengan peran <b>Anggota</b>.</p>'}
          <div class="alert info"><i class="bi bi-envelope-check"></i><div>Username & kata sandi dikirim ke <b>${esc(d.email)}</b>.</div></div>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="aGo"><i class="bi bi-person-check"></i> Aktifkan & Kirim</button>',
        onOpen: (m, close) => {
          $('#aGo', m).onclick = async () => {
            $('#aGo', m).disabled = true;
            try { await Data.aktivasiAkun(d.id, admin ? $('#aRole', m).value : 'anggota'); close(); segarkan(); kirimAkun(d); }
            catch (e) { toast(e.message, 'error'); $('#aGo', m).disabled = false; }
          };
        }
      });
    }

    async function kirimUlang(d) {
      const k = await konfirmasi({ judul: 'Kirim ulang username & kata sandi?', ok: 'Ya, kirim ulang',
        pesan: `Kata sandi baru dibuat untuk <b>${esc(d.nama)}</b> lalu dikirim ke <b>${esc(d.email)}</b>. Kata sandi lama langsung tidak berlaku.` });
      if (k.ok) kirimAkun(d, true);
    }

    // Buat kata sandi + kirim ke email anggota (lewat Google Apps Script), lalu tampilkan hasilnya
    async function kirimAkun(d, ulang) {
      const tunggu = modal({ judul: ulang ? 'Mengirim Ulang Akun' : 'Anggota Disetujui',
        isi: `<div style="text-align:center;padding:18px 0"><span class="spin" style="width:28px;height:28px"></span><p style="margin-top:14px">Membuat kata sandi & mengirim email ke <b>${esc(d.email)}</b>…</p></div>`, foot: '' });
      let r = null, galat = '';
      try { r = await Data.kirimAkun(d.id); } catch (e) { galat = e.message; }
      if (tunggu && tunggu.close) tunggu.close(); else $$('.modal [data-close]').forEach((x) => x.click());
      if (!r) {
        modal({ judul: 'Akun Aktif, Email Belum Terkirim',
          isi: `<div class="alert warning"><i class="bi bi-exclamation-triangle"></i><div>${ulang ? '' : `<b>${esc(d.nama)}</b> sudah disetujui dan akunnya aktif. `}Namun username & kata sandi <b>gagal dibuat/dikirim</b>.<br><small>${esc(galat)}</small></div></div>
            <p class="help" style="margin-top:12px">Periksa koneksi internet & pengaturan Google Apps Script, lalu tekan <b>Coba Lagi</b>. Tombol <i class="bi bi-envelope-arrow-up"></i> di tab <b>Disetujui & Aktif</b> juga bisa dipakai kapan saja.</p>`,
          foot: '<button class="btn btn-ghost" data-close>Tutup</button><button class="btn btn-primary" id="kaUlang"><i class="bi bi-arrow-repeat"></i> Coba Lagi</button>',
          onOpen: (m, close) => { $('#kaUlang', m).onclick = () => { close(); kirimAkun(d, ulang); }; } });
        return;
      }
      const info = r.data || {};
      const alamat = location.origin + location.pathname;
      const teks = `Akun KKG PJOK Tegal Timur\n${alamat}#/masuk\nPilih: Username & Sandi\nUsername: ${info.username}\nKata sandi: ${info.sandi}\n(Segera ganti kata sandi di Profil Saya)`;
      const wa = String(d.no_hp || '').replace(/\D/g, '').replace(/^0/, '62');
      modal({ judul: info.terkirim ? 'Username & Kata Sandi Terkirim' : 'Akun Aktif — Email Gagal Terkirim',
        isi: `<div class="alert ${info.terkirim ? 'success' : 'warning'}" style="margin-bottom:14px"><i class="bi ${info.terkirim ? 'bi-envelope-check' : 'bi-exclamation-triangle'}"></i>
            <div>${info.terkirim ? `${ulang ? 'Kata sandi baru' : `<b>${esc(d.nama)}</b> disetujui. Username & kata sandi`} sudah dikirim ke <b>${esc(d.email)}</b>.` : `Email gagal dikirim (${esc(info.galat || r.message)}). Berikan data di bawah secara pribadi, misalnya lewat WhatsApp.`}</div></div>
          <dl class="kv" style="margin:12px 0"><dt>Username</dt><dd><b>${esc(info.username)}</b></dd></dl>
          <div class="label-sm muted" style="margin-bottom:6px">Kata sandi</div><div class="sandi-box">${esc(info.sandi)}</div>
          <p class="help" style="margin-top:10px">Kata sandi ini hanya tampil sekali dan tidak disimpan di database. Cadangan bila anggota tidak menerima email (cek juga folder Spam).</p>`,
        foot: `<button class="btn btn-outline" id="kaSalin"><i class="bi bi-clipboard"></i> Salin</button>${wa.length >= 10 ? `<a class="btn btn-outline" id="kaWa" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent(teks)}"><i class="bi bi-whatsapp"></i> WhatsApp</a>` : ''}<button class="btn btn-primary" data-close>Selesai</button>`,
        onOpen: (m) => { $('#kaSalin', m).onclick = async () => {
          try { await navigator.clipboard.writeText(teks); toast('Informasi login disalin.', 'success'); } catch (e) { toast('Salin manual dari kotak di atas.', 'info'); } }; } });
    }
  }

  // ==================================================================
  // PERSETUJUAN
  // ==================================================================
  const JENIS = {
    perubahan_data: ['Perubahan Data', 'bi-pencil-square', 'b-navy'], usulan_kegiatan: ['Usulan Kegiatan', 'bi-lightbulb', 'b-teal'],
    peserta_lomba: ['Peserta Lomba', 'bi-person-badge', 'b-amber'], prestasi: ['Prestasi', 'bi-trophy', 'b-gold'], bukti_bayar: ['Bukti Bayar', 'bi-receipt', 'b-green']
  };
  const PEMUTUS_LABEL = { perubahan_data: 'Ketua / Sekretaris', usulan_kegiatan: 'Ketua / Wakil Ketua', peserta_lomba: 'Ketua / Sekretaris', prestasi: 'Ketua / Sekretaris', bukti_bayar: 'Bendahara' };
  const jenisBadge = (j) => `<span class="badge ${(JENIS[j] || [])[2] || 'b-slate'}"><i class="bi ${(JENIS[j] || [])[1] || 'bi-dot'}"></i>${(JENIS[j] || [j])[0]}</span>`;
  const LABEL_FIELD = { nama: 'Nama & gelar', nip: 'NIP', sekolah: 'Sekolah induk', judul: 'Judul kegiatan', tanggal: 'Tanggal', lokasi: 'Lokasi', deskripsi: 'Deskripsi',
    kategori: 'Kategori', nama_siswa: 'Nama siswa', kelas: 'Kelas', lomba: 'Lomba', cabang: 'Cabang', peringkat: 'Peringkat', bulan: 'Bulan', nominal: 'Nominal', tahun: 'Tahun' };
  const nilaiField = (k, v) => k === 'peringkat' ? ((PERINGKAT[v] || {}).label || v) : k === 'bulan' ? [].concat(v).map((b) => BULAN[b - 1]).join(', ')
    : k === 'nominal' ? fmt.rp(v) : k === 'tanggal' ? fmt.tgl(v) : v;

  async function halPersetujuan(q) {
    if (q && q.id) return tinjauPengajuan(q.id);
    const el = await shell('persetujuan', 'Persetujuan', 'Pengajuan yang menunggu keputusan');
    const st = { jenis: '', status: 'menunggu', cari: '', halaman: 1, per: 10, urut: 'dibuat_pada', naik: false };
    el.innerHTML = `<div class="page-head"><div><h1>Manajemen Persetujuan & Pengajuan Masuk</h1><p>Setiap keputusan wajib disertai catatan dan tersimpan permanen di riwayat audit.</p></div>
        <div class="acts"><button class="btn btn-outline" id="pmSegar"><i class="bi bi-arrow-clockwise"></i> Muat ulang</button></div></div>
      <div id="pmDaftar"></div>
      <div class="chip-tabs" id="pmTabs" role="tablist"></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0">
        <div class="search"><i class="bi bi-search"></i><input class="input" id="pmCari" placeholder="Cari kode, nama pengaju, ringkasan…" aria-label="Cari pengajuan"></div>
        <select class="select" id="pmStatus" aria-label="Status"><option value="menunggu">Menunggu</option><option value="disetujui">Disetujui</option><option value="ditolak">Ditolak</option><option value="">Semua status</option></select></div></div>
      <div id="pmTabel"></div>`;
    let data = [];
    if (adalah('ketua', 'sekretaris')) {
      Data.dashboard().then((d) => { const n = (d.pengajuan_menunggu || {}).pendaftaran_anggota || 0;
        if (n) $('#pmDaftar').innerHTML = `<a class="alert warning" href="#/app/pendaftaran" style="margin-bottom:16px;text-decoration:none"><i class="bi bi-person-plus"></i><div><b>${n} pendaftaran anggota baru</b> menunggu verifikasi Anda. <u>Buka halaman Pendaftaran →</u></div></a>`; }).catch(() => {});
    }
    const renderTabs = () => {
      const mng = data.filter((d) => d.status === 'menunggu');
      const ada = Object.keys(JENIS).filter((j) => data.some((d) => d.jenis === j));
      $('#pmTabs').innerHTML = [['', 'Semua', mng.length]].concat(ada.map((j) => [j, JENIS[j][0], mng.filter((d) => d.jenis === j).length]))
        .map(([k, l, n]) => `<button role="tab" aria-selected="${st.jenis === k}" class="${st.jenis === k ? 'active' : ''}" data-j="${k}">${l} <span class="n">${n}</span></button>`).join('');
      $$('#pmTabs [data-j]').forEach((b) => b.onclick = () => { st.jenis = b.dataset.j; renderTabs(); t.muat(true); });
    };
    const t = UI.tabel({
      el: $('#pmTabel'), state: st,
      kosong: { judul: 'Tidak ada pengajuan', pesan: 'Semua pengajuan sudah diputus. Kerja bagus!', ikon: 'bi-check2-all' },
      kolom: [
        { key: 'jenis', label: 'Jenis', render: (p) => `${jenisBadge(p.jenis)}<div class="body-sm muted tabnum" style="margin-top:4px">${esc(p.kode || '')}</div>` },
        { key: 'pengaju_nama', label: 'Pengaju', sort: true, render: (p) => `<b>${esc(p.pengaju_nama)}</b><div class="body-sm muted">${esc(p.pengaju_sekolah || p.pengaju_email || '')}</div>` },
        { key: 'ringkasan', label: 'Ringkasan', render: (p) => `${esc(p.ringkasan || '-')}${p.lampiran_url ? '<div class="body-sm" style="color:var(--teal-text)"><i class="bi bi-paperclip"></i> Ada lampiran</div>' : ''}` },
        { key: 'dibuat_pada', label: 'Diajukan', sort: true, render: (p) => `${fmt.tglPendek(p.dibuat_pada)}<div class="body-sm muted">${fmt.relatif(p.dibuat_pada)}</div>` },
        { key: 'status', label: 'Status', render: (p) => UI.badgeStatus(p.status) }
      ],
      aksi: (p) => `<a class="btn btn-sm ${p.bisa_putus && p.status === 'menunggu' ? 'btn-primary' : 'btn-outline'}" href="#/app/persetujuan?id=${esc(p.id)}">${p.bisa_putus && p.status === 'menunggu' ? '<i class="bi bi-search"></i> Tinjau' : 'Lihat'}</a>`,
      muat: async (s) => {
        if (!data.length || s._segar) { data = await Data.pengajuanDaftar(false); s._segar = false; renderTabs(); }
        const r = UI.saringLokal(data, s, { cari: ['kode', 'pengaju_nama', 'ringkasan', 'pengaju_sekolah'], filter: { jenis: (x, v) => x.jenis === v, status: (x, v) => x.status === v } });
        return { rows: r.rows, total: r.total };
      }
    });
    $('#pmCari').oninput = debounce((e) => { st.cari = e.target.value; t.muat(true); }, 250);
    $('#pmStatus').onchange = (e) => { st.status = e.target.value; t.muat(true); };
    $('#pmSegar').onclick = () => { st._segar = true; t.muat(); muatBadge(); };
  }

  async function tinjauPengajuan(id) {
    const el = await shell('persetujuan', 'Tinjau Pengajuan', 'Keputusan & riwayat audit');
    el.innerHTML = '<div class="skel skel-block" style="height:420px"></div>';
    let p;
    try { p = await Data.pengajuanDetail(id); }
    catch (e) { el.innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div><p style="margin-top:16px"><a href="#/app/persetujuan">← Kembali ke daftar</a></p>`; return; }
    const u = p.pengaju || {};
    const d = p.data_usulan || {};
    let rincian;
    if (p.jenis === 'perubahan_data') {
      const lama = p.data_lama || {};
      const keys = ['nama', 'nip', 'sekolah'].filter((k) => k in d || k in lama);
      rincian = `<table class="compare"><thead><tr><th>Atribut</th><th>Data Saat Ini</th><th>Usulan Baru</th></tr></thead><tbody>
        ${keys.map((k) => { const ubah = d[k] && d[k] !== lama[k];
          return `<tr class="${ubah ? 'changed' : ''}"><td class="muted">${LABEL_FIELD[k]}</td><td class="${ubah ? 'old' : ''}">${esc(lama[k] || '—')}</td><td class="new">${ubah ? esc(d[k]) + ' <span class="badge b-amber" style="margin-left:6px">Berubah</span>' : '<span class="muted">tidak berubah</span>'}</td></tr>`; }).join('')}</tbody></table>`;
    } else {
      const ent = Object.entries(d).filter(([k, v]) => !['alasan', 'iuran_ids'].includes(k) && v !== null && v !== undefined);
      rincian = ent.length ? `<dl class="kv">${ent.map(([k, v]) => `<dt>${esc(LABEL_FIELD[k] || k)}</dt><dd>${esc(nilaiField(k, v))}</dd>`).join('')}</dl>` : '<p class="muted">Tidak ada rincian.</p>';
    }
    const riwayat = [{ keputusan: 'diajukan', catatan: 'Pengajuan dikirim oleh ' + (u.nama || 'pengaju'), waktu: p.dibuat_pada }].concat(p.riwayat || []);

    el.innerHTML = `<a href="#/app/persetujuan" class="btn btn-ghost btn-sm" style="margin-bottom:12px"><i class="bi bi-arrow-left"></i> Daftar persetujuan</a>
      <div class="review">
        <div style="display:flex;flex-direction:column;gap:20px">
          <section class="card"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${avatar(u.nama, u.foto_url, 'lg')}
            <div style="flex:1;min-width:200px"><h2 style="font-size:20px">${esc(u.nama || '-')}</h2><div class="body-sm muted">${u.nip ? 'NIP ' + esc(u.nip) + ' · ' : ''}${esc(u.sekolah || u.email || '')}</div></div>
            <div style="text-align:right">${jenisBadge(p.jenis)}<div class="body-sm muted tabnum" style="margin-top:6px">${esc(p.kode || '')}</div></div></div></section>
          <section class="card"><div class="card-title"><h3>${p.jenis === 'perubahan_data' ? 'Komparasi Data' : 'Rincian Pengajuan'}</h3></div>
            <p style="font-weight:600;margin-bottom:14px">${esc(p.ringkasan || '')}</p>${rincian}
            ${d.alasan ? `<div style="margin-top:18px;padding:14px 16px;border-left:4px solid var(--teal);background:var(--surface-2);border-radius:0 12px 12px 0"><div class="label-sm muted">Alasan pemohon</div><p style="margin-top:6px;font-style:italic">“${esc(d.alasan)}”</p></div>` : ''}</section>
          <section class="card"><div class="card-title"><h3>Dokumen Pendukung</h3></div>
            ${p.lampiran_url ? `<div style="display:flex;gap:14px;align-items:center;padding:14px;border:1px solid var(--border);border-radius:12px"><span class="icon-tile red"><i class="bi bi-file-earmark-richtext"></i></span>
              <div style="flex:1"><b>Lampiran pengajuan</b><div class="body-sm muted">Dibuka aman melalui aplikasi</div></div><button class="btn btn-outline btn-sm" id="tLamp"><i class="bi bi-eye"></i> Lihat berkas</button></div>`
              : '<p class="muted body-sm">Pemohon tidak melampirkan dokumen.</p>'}</section>
        </div>
        <aside class="sticky" style="display:flex;flex-direction:column;gap:20px">
          <section class="card"><div class="card-title"><h3>Status</h3>${UI.badgeStatus(p.status)}</div>
            <dl class="kv"><dt>Kode</dt><dd class="tabnum">${esc(p.kode || '-')}</dd><dt>Diajukan</dt><dd>${fmt.tgl(p.dibuat_pada)}</dd><dt>Pemutus</dt><dd>${PEMUTUS_LABEL[p.jenis] || '-'}</dd></dl></section>
          <section class="card"><div class="card-title"><h3>Riwayat Jejak Audit</h3></div><div class="tl-v">
            ${riwayat.map((r) => `<div class="it"><span class="pt ${r.keputusan === 'ditolak' ? 'red' : r.keputusan === 'diajukan' ? 'amber' : ''}"></span>
              <div><b style="font-size:14px">${r.keputusan === 'diajukan' ? 'Diajukan' : r.keputusan === 'disetujui' ? 'Disetujui' : 'Ditolak'}${r.pemutus ? ' oleh ' + esc(r.pemutus) : ''}</b>
              <div class="body-sm">${esc(r.catatan || '')}</div><small class="muted">${fmt.tgl(r.waktu)} · ${fmt.relatif(r.waktu)}</small></div></div>`).join('')}</div></section>
          ${p.bisa_putus ? `<section class="card" style="border-top:3px solid var(--teal)"><div class="card-title"><h3>Keputusan Anda</h3></div>
            <div class="field"><label for="tCat">Catatan keputusan resmi <span class="req">*</span></label>
              <textarea class="textarea" id="tCat" placeholder="Tuliskan alasan keputusan. Catatan dikirim ke pemohon & tersimpan di log audit."></textarea>
              <div class="err"><i class="bi bi-exclamation-circle"></i>Minimal 5 karakter.</div></div>
            <div style="display:grid;gap:10px"><button class="btn btn-success btn-block" data-k="1"><i class="bi bi-check2-circle"></i> Setujui Pengajuan</button>
              <button class="btn btn-danger-outline btn-block" data-k="0"><i class="bi bi-x-circle"></i> Tolak Pengajuan</button></div></section>`
            : p.status === 'menunggu' ? `<div class="alert info"><i class="bi bi-hourglass-split"></i><div>Menunggu keputusan ${PEMUTUS_LABEL[p.jenis]}.</div></div>` : ''}
        </aside></div>`;

    if ($('#tLamp')) $('#tLamp').onclick = () => UI.lihatBerkas(p.lampiran_url, 'lampiran-' + (p.kode || 'pengajuan'));
    $$('[data-k]').forEach((b) => b.onclick = async () => {
      const setuju = b.dataset.k === '1';
      const cat = $('#tCat').value.trim();
      if (cat.length < 5) { $('#tCat').closest('.field').classList.add('invalid'); $('#tCat').focus(); return; }
      const k = await konfirmasi({ judul: setuju ? 'Setujui pengajuan?' : 'Tolak pengajuan?', bahaya: !setuju, ok: setuju ? 'Ya, setujui' : 'Ya, tolak',
        pesan: setuju && p.jenis === 'perubahan_data' ? 'Data anggota akan langsung diperbarui sesuai usulan.' : `Pengajuan <b>${esc(p.kode)}</b> akan ${setuju ? 'disetujui' : 'ditolak'} dan pemohon diberi tahu.` });
      if (!k.ok) return;
      $$('[data-k]').forEach((x) => { x.disabled = true; });
      try { await Data.putuskanPengajuan(p.id, setuju, cat); toast(`Pengajuan ${p.kode} ${setuju ? 'disetujui' : 'ditolak'}.`, 'success'); muatBadge(); tinjauPengajuan(id); }
      catch (e) { toast(e.message, 'error'); $$('[data-k]').forEach((x) => { x.disabled = false; }); }
    });
  }

  // ==================================================================
  // PROFIL SAYA
  // ==================================================================
  // Kartu ganti kata sandi (semua pengguna; untuk akun Google ini menambah cara masuk dengan email & sandi)
  function kartuSandi(wadah) {
    const p = Auth.profil;
    const username = /@akun\.kkgpjok\.id$/i.test(p.email);
    const kartu = document.createElement('section');
    kartu.className = 'card'; kartu.style.cssText = 'max-width:640px;margin-top:20px';
    kartu.innerHTML = `<div class="card-title"><h3><i class="bi bi-key" style="color:var(--teal-text)"></i> Ganti Kata Sandi</h3></div>
      <p class="body-sm muted" style="margin-bottom:14px">${username ? 'Anda masuk dengan username <b>' + esc(p.email.split('@')[0]) + '</b>. Ganti kata sandi pemberian Admin IT dengan sandi pribadi.'
        : 'Akun Anda memakai Google. Mengisi kata sandi di sini menambah cara masuk dengan <b>email & kata sandi</b> (' + esc(p.email) + ').'}</p>
      <form id="ksForm" novalidate><div class="grid-2">
        <div class="field"><label for="ks1">Kata sandi baru</label><input class="input" id="ks1" name="baru" type="password" autocomplete="new-password"><div class="err"></div></div>
        <div class="field"><label for="ks2">Ulangi kata sandi baru</label><input class="input" id="ks2" name="ulang" type="password" autocomplete="new-password"><div class="err"></div></div></div>
        <label class="check" style="margin-bottom:12px"><input type="checkbox" id="ksLihat"> <span>Tampilkan kata sandi</span></label>
        <div><button class="btn btn-primary" id="ksGo" type="submit"><i class="bi bi-save"></i> Simpan Kata Sandi</button></div>
        <p class="help" style="margin-top:10px">Minimal 8 karakter, memuat huruf dan angka. Jangan memakai tanggal lahir atau NIP.</p></form>`;
    wadah.appendChild(kartu);
    $('#ksLihat', kartu).onchange = (e) => { $$('#ksForm input[type=password], #ksForm input[data-pw]', kartu).forEach((i) => { i.dataset.pw = 1; i.type = e.target.checked ? 'text' : 'password'; }); };
    $('#ksForm', kartu).onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const ok = validasi(f, { baru: (v) => (v.length < 8 || !/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) ? 'Minimal 8 karakter, memuat huruf dan angka.' : '',
        ulang: (v) => v !== f.baru.value ? 'Kata sandi tidak sama.' : '' });
      if (!ok) return;
      const b = $('#ksGo', kartu); b.disabled = true;
      try { await Auth.gantiSandi(f.baru.value); f.reset(); toast('Kata sandi berhasil diganti. Gunakan sandi baru saat masuk berikutnya.', 'success', 5000); }
      catch (er) { toast(er.message, 'error'); } finally { b.disabled = false; }
    };
  }

  async function halProfil() {
    const el = await shell('profil', 'Profil Saya', 'Data pribadi & riwayat pengajuan');
    const p = Auth.profil;
    const a = p.anggota;
    if (!a || !p.anggota_id) {
      el.innerHTML = `<div class="page-head"><div><h1>Profil Saya</h1></div></div><div class="card" style="max-width:640px">
        <div style="display:flex;gap:16px;align-items:center">${avatar(p.nama, null, 'lg')}<div><h2 style="font-size:20px">${esc(p.nama)}</h2><p class="muted">${esc(p.email)}</p><span class="role-pill" style="margin-top:6px">${ROLE_LABEL[p.role]}</span></div></div>
        <div class="alert info" style="margin-top:20px"><i class="bi bi-link-45deg"></i><div>Akun ini belum ditautkan ke data anggota. Admin IT dapat menautkannya di menu <b>Akun Pengguna</b>.</div></div></div>`;
      kartuSandi(el);
      return;
    }
    el.innerHTML = `<div class="page-head"><div><h1>Profil Saya</h1><p>Foto & nomor WhatsApp dapat diubah langsung. Perubahan nama, NIP, atau sekolah diajukan untuk disetujui pengurus.</p></div></div>
      <div class="dash-grid">
        <section class="card span-4" style="text-align:center"><div class="profile-banner"></div>
          <div style="margin-top:-44px;position:relative;display:inline-block">${avatar(a.nama, a.foto_url, 'lg ring')}
            <button class="btn btn-primary btn-icon" id="prFotoBtn" style="position:absolute;right:-6px;bottom:-6px;width:32px;min-height:32px;border-radius:50%" aria-label="Ganti foto"><i class="bi bi-camera"></i></button></div>
          <input type="file" id="prFoto" accept="image/jpeg,image/png" class="sr-only">
          <h2 style="font-size:20px;margin-top:12px">${esc(a.nama)}</h2><p class="muted body-sm">${esc(a.sekolah || '')}</p>
          <div style="margin-top:8px"><span class="role-pill">${ROLE_LABEL[p.role]}</span></div>
          <dl class="kv" style="text-align:left;margin-top:20px;grid-template-columns:110px 1fr"><dt>Email</dt><dd>${esc(p.email)}</dd><dt>Kepegawaian</dt><dd>${esc(a.status_kepegawaian || '-')}</dd>
            <dt>Bergabung</dt><dd>${fmt.tgl(a.tanggal_gabung)}</dd><dt>Website</dt><dd>${a.tampil_publik ? 'Ditampilkan' : 'Disembunyikan'}</dd></dl></section>
        <div class="span-8" style="display:flex;flex-direction:column;gap:20px">
          <section class="card"><div class="card-title"><h3>Kontak</h3><span class="badge b-teal">Dapat diubah langsung</span></div>
            <form id="prKontak" novalidate style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
              <div class="field" style="flex:1;min-width:220px;margin:0"><label for="prHp">No. WhatsApp</label><input class="input" id="prHp" name="no_hp" inputmode="tel" value="${esc(a.no_hp || '')}" placeholder="0812-3456-7890"><div class="err"></div></div>
              <button class="btn btn-primary" id="prHpSimpan"><i class="bi bi-save"></i> Simpan</button></form>
            <p class="help" style="margin-top:8px">Dipakai untuk pengingat & koordinasi. Tidak pernah ditampilkan di website publik.</p></section>
          <section class="card"><div class="card-title"><h3><i class="bi bi-lock" style="color:var(--muted)"></i> Data Terkunci</h3>
            <button class="btn btn-outline btn-sm" id="prAjukan"><i class="bi bi-pencil-square"></i> Ajukan Perubahan</button></div>
            <div class="grid-2">${[['Nama & gelar', a.nama], ['NIP', a.nip || '—'], ['Sekolah induk', a.sekolah || '—'], ['NUPTK', a.nuptk || '—']].map(([l, v]) =>
              `<div class="field"><span class="label">${l}</span><div class="input locked tabnum" style="display:flex;align-items:center">${esc(v)}</div></div>`).join('')}</div></section>
          <section class="card"><div class="card-title"><h3>Riwayat Pengajuan Saya</h3></div><div id="prRiwayat"><div class="skel skel-block"></div></div></section>
        </div></div>`;

    $('#prFotoBtn').onclick = () => $('#prFoto').click();
    $('#prFoto').onchange = async (e) => {
      try {
        const g = await kompresGambar(e.target.files[0], 600, 0.85);
        toast('Mengunggah foto…', 'info', 1500);
        const up = await Data.upload('foto_profil', { base64: g.base64, mime: g.mime, nama: 'profil.jpg', dataUrl: g.dataUrl });
        await Data.updateProfilSaya({ foto_url: up.url });
        toast('Foto profil diperbarui.', 'success'); halProfil();
      } catch (err) { toast(err.message, 'error'); }
    };
    $('#prKontak').onsubmit = async (e) => {
      e.preventDefault();
      if (!validasi(e.target, { no_hp: (v) => v && !/^[0-9+\-\s]{9,16}$/.test(v) ? 'Nomor tidak valid.' : '' })) return;
      try { await Data.updateProfilSaya({ no_hp: e.target.no_hp.value.trim() || null }); toast('Nomor WhatsApp disimpan.', 'success'); } catch (err) { toast(err.message, 'error'); }
    };
    $('#prAjukan').onclick = () => formAjukan(a);
    kartuSandi(el);

    const riwayat = async () => {
      try {
        const rows = await Data.pengajuanDaftar(true);
        $('#prRiwayat').innerHTML = rows.length ? `<div class="table-wrap"><table class="tbl stack"><thead><tr><th>Kode</th><th>Jenis</th><th>Ringkasan</th><th>Tanggal</th><th>Status</th><th>Catatan Pengurus</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td data-label="Kode" class="tabnum">${esc(r.kode || '-')}</td><td data-label="Jenis">${jenisBadge(r.jenis)}</td><td data-label="Ringkasan">${esc(r.ringkasan || '')}</td>
            <td data-label="Tanggal">${fmt.tglPendek(r.dibuat_pada)}</td><td data-label="Status">${UI.badgeStatus(r.status)}</td>
            <td data-label="Catatan">${r.keputusan_terakhir ? `${esc(r.keputusan_terakhir.catatan)}<div class="body-sm muted">${esc(r.keputusan_terakhir.pemutus || '')}</div>` : '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table></div>`
          : emptyState('Belum ada pengajuan', 'Pengajuan perubahan data, lomba, atau prestasi akan tercatat di sini.', 'bi-inbox');
      } catch (e) { $('#prRiwayat').innerHTML = `<div class="alert error"><i class="bi bi-x-circle"></i><div>${esc(e.message)}</div></div>`; }
    };
    riwayat();

    async function formAjukan(a) {
      let lamp = null;
      modal({
        judul: 'Ajukan Perubahan Data', wide: true,
        isi: `<div class="alert info" style="margin-bottom:18px"><i class="bi bi-info-circle"></i><div>Isi hanya kolom yang ingin diubah. Pengajuan ditinjau Ketua atau Sekretaris; data baru berlaku setelah disetujui.</div></div>
          <form id="fJ" novalidate>
            <div class="field"><label for="j1">Nama & gelar baru</label><input class="input" id="j1" name="nama" placeholder="${esc(a.nama)}"><div class="err"></div></div>
            <div class="grid-2"><div class="field"><label for="j2">NIP baru</label><input class="input tabnum" id="j2" name="nip" inputmode="numeric" placeholder="${esc(a.nip || '')}"><div class="err"></div></div>
              <div class="field"><label for="j3">Sekolah induk baru</label>${UI.kolomSekolah({ id: 'j3', placeholder: a.sekolah ? 'Saat ini: ' + a.sekolah : 'Ketik nama sekolah baru' })}<div class="err"></div><span class="help">Kosongkan bila tidak berubah.</span></div></div>
            <div class="field"><label for="j4">Alasan perubahan <span class="req">*</span></label><textarea class="textarea" id="j4" name="alasan" style="min-height:90px" placeholder="Contoh: Lulus S2 (M.Pd) pada Agustus 2026, ijazah terlampir."></textarea><div class="err"></div></div>
            <div class="field"><span class="label">Dokumen pendukung <span class="muted">(ijazah / SK mutasi — JPG, PNG, atau PDF)</span></span>
              <label class="dropzone" for="j5"><span class="preview" id="j5p"><i class="bi bi-paperclip"></i></span><span id="j5n"><b>Pilih berkas</b><br><span class="help">Gambar dikompres otomatis · PDF maks 5 MB</span></span></label>
              <input type="file" id="j5" accept="image/jpeg,image/png,application/pdf" class="sr-only"></div>
          </form>`,
        foot: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="fJs"><i class="bi bi-send"></i> Kirim Pengajuan</button>',
        onOpen: (m, close) => {
          const f = $('#fJ', m);
          UI.pasangSaranSekolah(f.sekolah);
          f.nip.oninput = () => { f.nip.value = f.nip.value.replace(/\D/g, ''); };
          $('#j5', m).onchange = async (e) => {
            try { lamp = await siapkanBerkas(e.target.files[0]);
              $('#j5p', m).innerHTML = lamp.mime === 'application/pdf' ? '<i class="bi bi-filetype-pdf" style="color:var(--danger)"></i>' : `<img src="${lamp.dataUrl}" alt="">`;
              $('#j5n', m).innerHTML = `<b>${esc(lamp.nama)}</b><br><span class="help">Siap diunggah</span>`; }
            catch (err) { lamp = null; toast(err.message, 'error'); }
          };
          $('#fJs', m).onclick = async () => {
            const nama = f.nama.value.trim(), nip = f.nip.value.trim(), skl = UI.rapikanSekolah(f.sekolah.value);
            const ok = validasi(f, {
              nama: (v) => v && v.length < 3 ? 'Nama terlalu pendek.' : (!v && !nip && !skl ? 'Isi minimal satu data yang ingin diubah.' : ''),
              nip: (v) => v && !/^\d{8,20}$/.test(v) ? 'NIP berupa angka 8–20 digit.' : '',
              sekolah: (v) => UI.cekSekolah(v, false),
              alasan: (v) => v.length < 10 ? 'Jelaskan alasan (min. 10 karakter).' : ''
            });
            if (!ok) return;
            const usul = {};
            if (nama && nama !== a.nama) usul.nama = nama;
            if (nip && nip !== a.nip) usul.nip = nip;
            if (skl && skl !== a.sekolah) usul.sekolah = skl;
            if (!Object.keys(usul).length) { toast('Data usulan sama dengan data saat ini.', 'warning'); return; }
            const btn = $('#fJs', m); btn.disabled = true;
            try {
              const lampiran_url = lamp ? (await Data.upload('lampiran', { base64: lamp.base64, mime: lamp.mime, nama: lamp.nama, dataUrl: lamp.dataUrl })).url : null;
              const ringkasan = 'Perubahan ' + Object.keys(usul).map((k) => LABEL_FIELD[k].toLowerCase()).join(', ');
              const r = await Data.ajukan({ jenis: 'perubahan_data', ref_tabel: 'anggota', ref_id: Auth.profil.anggota_id, ringkasan, data_usulan: Object.assign(usul, { alasan: f.alasan.value.trim() }), lampiran_url });
              close(); toast(`Pengajuan ${r.kode || ''} terkirim. Anda akan diberi tahu setelah diputus.`, 'success'); riwayat();
            } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
          };
        }
      });
    }
  }

  Object.assign(window.AppPages, { anggota: halAnggota, pengurus: halPengurus, pendaftaran: halPendaftaran, persetujuan: halPersetujuan, profil: halProfil });
})();
