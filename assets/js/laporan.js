/* =====================================================================
   BATCH 6 — Pusat Laporan (14 laporan resmi PRD §7.4) & Log Aktivitas
   - Filter periode: bulanan, triwulan, semester, tahunan, rentang tanggal
   - Pratinjau → PDF berkop (diarsipkan ke Drive/Laporan + laporan_arsip),
     cetak langsung, atau Excel (.xlsx; cadangan .csv)
   - Hak akses diperiksa di frontend (daftar ini), RLS/RPC, dan GAS
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, BULAN, BLN, PERINGKAT, ROLE_LABEL, toast, modal, debounce, emptyState } = window.K;
  const { Auth, Data, DEMO } = window.KKG;
  const { shell } = window.AppKit;
  const UI = window.UI;
  const TH = () => new Date().getFullYear();
  const pad = (n) => String(n).padStart(2, '0');
  const hariIni = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const akhirBulan = (y, m) => `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;
  const rp = (n) => fmt.rp(Number(n || 0));
  const dalam = (t, p) => !!t && String(t).slice(0, 10) >= p.mulai && String(t).slice(0, 10) <= p.selesai;
  const tahunRentang = (p) => { const a = Number(p.mulai.slice(0, 4)), b = Number(p.selesai.slice(0, 4)); return Array.from({ length: b - a + 1 }, (_, i) => a + i); };
  const HADIR = { hadir: 'Hadir', izin: 'Izin', alpa: 'Alpa' };

  // ------------------------------------------------------------------
  // Definisi 14 laporan
  //   periode: 'rentang' (semua pilihan), 'tahun' (hanya tahun), 'tidak' (per tanggal cetak)
  //   muat(p, opsi) → { kolom, rows, ringkasan, total, landscape }
  // ------------------------------------------------------------------
  const LAP = [
    { id: 'anggota', judul: 'Laporan Data Anggota', ikon: 'bi-people', peran: ['ketua', 'wakil_ketua', 'sekretaris', 'admin_it'], periode: 'tidak', ttd: ['ketua', 'sekretaris'],
      opsi: [{ k: 'status', l: 'Status', v: [['aktif', 'Anggota aktif'], ['nonaktif', 'Nonaktif'], ['', 'Semua']] }],
      async muat(p, o) {
        const rows = (await Data.anggota({ semua: true, status: o.status, per: 5000 })).rows;
        const n = (k) => rows.filter((a) => a.status_kepegawaian === k).length;
        return { landscape: true, rows, ringkasan: [['Jumlah anggota', rows.length], ['PNS', n('PNS')], ['PPPK', n('PPPK')], ['Honorer', n('Honorer')]],
          kolom: [{ label: 'Nama', key: 'nama' }, { label: 'NIP', key: 'nip' }, { label: 'NUPTK', key: 'nuptk' }, { label: 'Sekolah', key: 'sekolah' }, { label: 'Kepegawaian', key: 'status_kepegawaian' },
            { label: 'Kompetensi', key: 'kompetensi' }, { label: 'No. HP', key: 'no_hp' }, { label: 'Status', val: (a) => a.status_aktif ? 'Aktif' : 'Nonaktif' }] };
      } },
    { id: 'pengurus', judul: 'Struktur Pengurus', ikon: 'bi-diagram-3', peran: ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara'], periode: 'tidak', ttd: ['ketua', 'sekretaris'],
      async muat() {
        const rows = await Data.pengurusDaftar();
        return { rows, ringkasan: [['Jumlah pengurus', rows.length]],
          kolom: [{ label: 'Jabatan', key: 'jabatan' }, { label: 'Nama', val: (x) => (x.anggota || {}).nama }, { label: 'Sekolah', val: (x) => (x.anggota || {}).sekolah },
            { label: 'Periode', val: (x) => `${x.periode_mulai}–${x.periode_selesai}` }, { label: 'Nomor SK', key: 'sk_nomor' }] };
      } },
    { id: 'program', judul: 'Program Kerja & Progres', ikon: 'bi-clipboard-data', peran: ['ketua', 'wakil_ketua', 'sekretaris'], periode: 'tahun', ttd: ['ketua', 'sekretaris'],
      async muat(p) {
        const rows = await Data.programDaftar(p.tahun);
        const rata = rows.length ? Math.round(rows.reduce((a, x) => a + x.progres_persen, 0) / rows.length) : 0;
        return { rows, landscape: true, ringkasan: [['Jumlah program', rows.length], ['Rata-rata progres', rata + '%'], ['Selesai', rows.filter((x) => x.status === 'selesai').length], ['Berjalan', rows.filter((x) => x.status === 'berjalan').length]],
          kolom: [{ label: 'Kode', key: 'kode' }, { label: 'Program', key: 'judul' }, { label: 'Penanggung Jawab', key: 'penanggung_jawab' }, { label: 'Target', key: 'target' },
            { label: 'Periode', val: (x) => (x.tanggal_mulai ? fmt.tglPendek(x.tanggal_mulai) : '-') + ' s.d. ' + (x.tanggal_selesai ? fmt.tglPendek(x.tanggal_selesai) : '-') },
            { label: 'Progres', num: true, val: (x) => x.progres_persen + '%' }, { label: 'Status', val: (x) => ({ belum_mulai: 'Belum mulai', berjalan: 'Berjalan', selesai: 'Selesai' })[x.status] }] };
      } },
    { id: 'kegiatan', judul: 'Rekap Kegiatan', ikon: 'bi-calendar2-check', peran: ['ketua', 'wakil_ketua', 'sekretaris'], periode: 'rentang', ttd: ['ketua', 'sekretaris'],
      async muat(p) {
        const rows = (await Promise.all(tahunRentang(p).map((y) => Data.kegiatanDaftar(y)))).flat().filter((k) => dalam(k.tanggal, p)).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        const tp = rows.reduce((a, k) => a + k.jumlah_peserta, 0), th = rows.reduce((a, k) => a + k.jumlah_hadir, 0);
        return { rows, landscape: true, ringkasan: [['Jumlah kegiatan', rows.length], ['Selesai', rows.filter((k) => k.status_efektif === 'selesai').length], ['Peserta terdaftar', tp], ['Rata-rata kehadiran', tp ? Math.round(th / tp * 100) + '%' : '-']],
          kolom: [{ label: 'Kode', key: 'kode' }, { label: 'Tanggal', val: (k) => fmt.tglPendek(k.tanggal) }, { label: 'Kegiatan', key: 'judul' }, { label: 'Kategori', key: 'kategori' }, { label: 'Lokasi', key: 'lokasi' },
            { label: 'Peserta', num: true, key: 'jumlah_peserta' }, { label: 'Hadir', num: true, key: 'jumlah_hadir' }, { label: '% Hadir', num: true, val: (k) => k.jumlah_peserta ? Math.round(k.jumlah_hadir / k.jumlah_peserta * 100) + '%' : '-' },
            { label: 'Status', val: (k) => ({ akan_datang: 'Akan datang', berlangsung: 'Berlangsung', selesai: 'Selesai', dibatalkan: 'Dibatalkan' })[k.status_efektif] }] };
      } },
    { id: 'kehadiran', judul: 'Daftar Kehadiran Kegiatan', ikon: 'bi-person-check', peran: ['ketua', 'wakil_ketua', 'sekretaris'], periode: 'rentang', ttd: ['ketua', 'sekretaris'],
      async muat(p) {
        const rows = await Data.rekapKehadiran(p.mulai, p.selesai);
        const n = (h) => rows.filter((r) => r.hadir === h).length;
        return { rows, landscape: true, ringkasan: [['Baris kehadiran', rows.length], ['Hadir', n('hadir')], ['Izin', n('izin')], ['Alpa', n('alpa')]],
          kolom: [{ label: 'Tanggal', val: (r) => fmt.tglPendek(r.tanggal) }, { label: 'Kegiatan', key: 'judul' }, { label: 'Nama', key: 'nama' }, { label: 'NIP', key: 'nip' }, { label: 'Sekolah', key: 'sekolah' },
            { label: 'Kehadiran', val: (r) => HADIR[r.hadir] || 'Belum diisi' }, { label: 'Catatan', key: 'catatan' }] };
      } },
    { id: 'kas', judul: 'Laporan Kas & Transaksi Keuangan', ikon: 'bi-cash-stack', peran: ['ketua', 'bendahara'], periode: 'rentang', ttd: ['ketua', 'bendahara'],
      opsi: [{ k: 'gabung', l: 'Iuran anggota', v: [['ya', 'Digabung per bulan'], ['', 'Rinci per pembayaran']] }],
      async muat(p, o) {
        const ys = tahunRentang(p);
        const [ring, ...per] = await Promise.all([Data.ringkasanKeuangan(ys[0])].concat(ys.map((y) => Data.kasDaftar(y))));
        const semua = per.flat();
        // saldo awal = saldo 1 Jan tahun pertama + transaksi sebelum tanggal mulai di tahun itu
        let saldo = Number(ring.saldo_awal) + semua.filter((k) => k.tanggal < p.mulai).reduce((a, k) => a + (k.jenis === 'masuk' ? 1 : -1) * Number(k.nominal), 0);
        const awal = saldo;
        let rows = semua.filter((k) => dalam(k.tanggal, p));
        if (o.gabung) {
          const agg = {};
          rows = rows.filter((k) => { if (!k.ref_iuran_id) return true; const key = k.tanggal.slice(0, 7);
            const g = agg[key] = agg[key] || { tanggal: k.tanggal, no_bukti: 'IUR-' + key.replace('-', ''), jenis: 'masuk', kategori: 'Iuran Anggota', nominal: 0, n: 0 };
            g.nominal += Number(k.nominal); g.n++; if (k.tanggal > g.tanggal) g.tanggal = k.tanggal; return false; });
          Object.entries(agg).forEach(([key, g]) => { g.uraian = `Rekap iuran anggota ${BULAN[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)} (${g.n} pembayaran)`; rows.push(g); });
        }
        rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || String(a.dibuat_pada || 'z').localeCompare(String(b.dibuat_pada || 'z')));
        rows.forEach((r) => { saldo += (r.jenis === 'masuk' ? 1 : -1) * Number(r.nominal); r._saldo = saldo; });
        const masuk = rows.filter((r) => r.jenis === 'masuk').reduce((a, r) => a + Number(r.nominal), 0), keluar = rows.filter((r) => r.jenis === 'keluar').reduce((a, r) => a + Number(r.nominal), 0);
        return { rows, landscape: true, ringkasan: [['Saldo awal', rp(awal)], ['Pemasukan', rp(masuk)], ['Pengeluaran', rp(keluar)], ['Saldo akhir', rp(awal + masuk - keluar)]],
          total: { Uraian: 'JUMLAH', Masuk: rp(masuk), Keluar: rp(keluar), Saldo: rp(awal + masuk - keluar) },
          kolom: [{ label: 'Tanggal', val: (r) => fmt.tglPendek(r.tanggal) }, { label: 'No. Bukti', key: 'no_bukti' }, { label: 'Uraian', key: 'uraian' }, { label: 'Kategori', key: 'kategori' },
            { label: 'Masuk', num: true, val: (r) => r.jenis === 'masuk' ? rp(r.nominal) : '', x: (r) => r.jenis === 'masuk' ? Number(r.nominal) : '' },
            { label: 'Keluar', num: true, val: (r) => r.jenis === 'keluar' ? rp(r.nominal) : '', x: (r) => r.jenis === 'keluar' ? Number(r.nominal) : '' },
            { label: 'Saldo', num: true, val: (r) => rp(r._saldo), x: (r) => r._saldo }] };
      } },
    { id: 'iuran', judul: 'Rekap Pembayaran Iuran Anggota', ikon: 'bi-wallet2', peran: ['ketua', 'bendahara'], periode: 'tahun', ttd: ['ketua', 'bendahara'],
      async muat(p) {
        const [d, ring] = await Promise.all([Data.iuranRekap(p.tahun), Data.ringkasanKeuangan(p.tahun)]);
        const P = {}; d.iuran.forEach((i) => { P[i.anggota_id + '-' + i.bulan] = i; });
        const batas = p.tahun < TH() ? 12 : p.tahun > TH() ? 0 : new Date().getMonth() + 1;
        const sel = (a, b) => { const i = P[a.id + '-' + b]; if (i && i.status === 'lunas') return i.metode === 'transfer' ? '✓TF' : '✓'; if (i && i.status === 'menunggu') return '…';
          if (`${p.tahun}-${pad(b)}-28` < a.tanggal_gabung) return ''; return b <= batas ? '✗' : ''; };
        const lunas = (a) => d.iuran.filter((i) => i.anggota_id === a.id && i.status === 'lunas').length;
        return { rows: d.anggota, landscape: true, catatan: '✓ lunas tunai · ✓TF lunas transfer · … menunggu verifikasi · ✗ belum bayar',
          ringkasan: [['Iuran / bulan', rp(ring.nominal_iuran)], ['Terkumpul', rp(ring.iuran.terkumpul)], ['Pembayaran lunas', ring.iuran.lunas], ['Anggota menunggak', ring.iuran.menunggak]],
          kolom: [{ label: 'Nama', key: 'nama' }, { label: 'Sekolah', key: 'sekolah' }].concat(BLN.map((b, i) => ({ label: b, lebar: '30px', val: (a) => sel(a, i + 1) })))
            .concat([{ label: 'Lunas', num: true, val: lunas }, { label: 'Jumlah', num: true, val: (a) => rp(lunas(a) * ring.nominal_iuran), x: (a) => lunas(a) * ring.nominal_iuran }]) };
      } },
    { id: 'tunggakan', judul: 'Daftar Tunggakan Iuran Anggota', ikon: 'bi-exclamation-diamond', peran: ['ketua', 'bendahara'], periode: 'tidak', ttd: ['ketua', 'bendahara'],
      async muat() {
        const [rows, org] = await Promise.all([Data.tunggakan(), Data.org()]);
        const tot = rows.reduce((a, r) => a + Number(r.total_tunggakan), 0);
        return { rows, subTambah: 'Tahun anggaran ' + org.tahun_anggaran, ringkasan: [['Anggota menunggak', rows.length], ['Bulan tertunggak', rows.reduce((a, r) => a + r.jumlah_bulan, 0)], ['Total tunggakan', rp(tot)]],
          total: { Nama: 'JUMLAH', Total: rp(tot) },
          kolom: [{ label: 'Nama', key: 'nama' }, { label: 'Sekolah', key: 'sekolah' }, { label: 'Bulan Tertunggak', val: (r) => r.bulan_tertunggak.map((b) => BLN[b - 1]).join(', ') },
            { label: 'Jml Bulan', num: true, key: 'jumlah_bulan' }, { label: 'Total', num: true, val: (r) => rp(r.total_tunggakan), x: (r) => Number(r.total_tunggakan) }, { label: 'No. HP', key: 'no_hp' }] };
      } },
    { id: 'peserta', judul: 'Daftar Peserta Lomba', ikon: 'bi-person-badge', peran: ['ketua', 'wakil_ketua', 'sekretaris'], periode: 'rentang', ttd: ['ketua', 'sekretaris'],
      opsi: [{ k: 'status', l: 'Status pendaftaran', v: [['disetujui', 'Disetujui'], ['', 'Semua']] }],
      async muat(p, o) {
        const rows = (await Data.pesertaDaftar()).filter((x) => x.lomba && dalam(x.lomba.tanggal, p) && (!o.status || x.status === o.status))
          .sort((a, b) => String(a.lomba.tanggal).localeCompare(String(b.lomba.tanggal)) || a.nama_siswa.localeCompare(b.nama_siswa));
        const hasil = (x) => { const h = (x.prestasi || []).find((y) => y.status === 'disetujui'); return h ? (PERINGKAT[h.peringkat] || {}).label : ''; };
        return { rows, landscape: true, ringkasan: [['Jumlah peserta', rows.length], ['Lomba', new Set(rows.map((x) => x.lomba_id)).size], ['Sekolah', new Set(rows.map((x) => x.sekolah)).size], ['Meraih juara', rows.filter(hasil).length]],
          kolom: [{ label: 'Lomba', val: (x) => x.lomba.nama }, { label: 'Tanggal', val: (x) => x.lomba.tanggal ? fmt.tglPendek(x.lomba.tanggal) : '' }, { label: 'Nama Siswa', key: 'nama_siswa' }, { label: 'Kelas', key: 'kelas' },
            { label: 'Sekolah', key: 'sekolah' }, { label: 'Cabang', key: 'cabang' }, { label: 'Guru Pendamping', val: (x) => (x.anggota || {}).nama }, { label: 'Status', key: 'status' }, { label: 'Hasil', val: hasil }] };
      } },
    { id: 'prestasi', judul: 'Rekap Prestasi Siswa', ikon: 'bi-trophy', peran: ['ketua', 'wakil_ketua', 'sekretaris'], periode: 'rentang', ttd: ['ketua', 'sekretaris'],
      async muat(p) {
        const urut = Object.keys(PERINGKAT);
        const rows = (await Data.prestasiDaftar()).filter((x) => x.status === 'disetujui' && dalam(((x.lomba_peserta || {}).lomba || {}).tanggal || x.dibuat_pada, p))
          .sort((a, b) => urut.indexOf(a.peringkat) - urut.indexOf(b.peringkat));
        const n = (k) => rows.filter((x) => x.peringkat === k).length;
        const lp = (x) => x.lomba_peserta || {};
        return { rows, landscape: true, ringkasan: [['Juara 1 (emas)', n('juara_1')], ['Juara 2 (perak)', n('juara_2')], ['Juara 3 (perunggu)', n('juara_3')], ['Harapan', n('harapan_1') + n('harapan_2') + n('harapan_3')]],
          kolom: [{ label: 'Peringkat', val: (x) => (PERINGKAT[x.peringkat] || {}).label }, { label: 'Nama Siswa', val: (x) => lp(x).nama_siswa }, { label: 'Kelas', val: (x) => lp(x).kelas }, { label: 'Sekolah', val: (x) => lp(x).sekolah },
            { label: 'Lomba', val: (x) => (lp(x).lomba || {}).nama }, { label: 'Cabang', val: (x) => lp(x).cabang }, { label: 'Tingkat', val: (x) => (lp(x).lomba || {}).tingkat },
            { label: 'Tanggal', val: (x) => (lp(x).lomba || {}).tanggal ? fmt.tglPendek(lp(x).lomba.tanggal) : '' }, { label: 'Guru', val: (x) => (lp(x).anggota || {}).nama }] };
      } },
    { id: 'surat', judul: 'Laporan Surat Masuk & Keluar', ikon: 'bi-envelope-paper', peran: ['ketua', 'sekretaris'], periode: 'rentang', ttd: ['ketua', 'sekretaris'],
      opsi: [{ k: 'jenis', l: 'Jenis surat', v: [['', 'Masuk & keluar'], ['masuk', 'Surat masuk'], ['keluar', 'Surat keluar']] }],
      async muat(p, o) {
        const [m, k] = await Promise.all([o.jenis === 'keluar' ? [] : Data.surat('masuk'), o.jenis === 'masuk' ? [] : Data.surat('keluar')]);
        const rows = m.filter((s) => dalam(s.tanggal, p)).map((s) => Object.assign({ _j: 'Masuk', _no: s.nomor_agenda, _pihak: s.pengirim, _ket: s.disposisi }, s))
          .concat(k.filter((s) => dalam(s.tanggal, p)).map((s) => Object.assign({ _j: 'Keluar', _no: s.nomor_urut, _pihak: s.tujuan, _ket: s.status === 'terkirim' ? 'Terkirim' : 'Draf' }, s)))
          .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        return { rows, landscape: true, ringkasan: [['Surat masuk', rows.filter((s) => s._j === 'Masuk').length], ['Surat keluar', rows.filter((s) => s._j === 'Keluar').length]],
          kolom: [{ label: 'Jenis', key: '_j' }, { label: 'No. Agenda/Urut', key: '_no' }, { label: 'Nomor Surat', key: 'nomor_surat' }, { label: 'Tanggal', val: (s) => fmt.tglPendek(s.tanggal) },
            { label: 'Pengirim/Tujuan', key: '_pihak' }, { label: 'Perihal', key: 'perihal' }, { label: 'Disposisi/Status', key: '_ket' }] };
      } },
    { id: 'dokumentasi', judul: 'Laporan Dokumentasi Kegiatan', ikon: 'bi-images', peran: ['ketua', 'wakil_ketua', 'sekretaris'], periode: 'rentang', ttd: ['ketua', 'sekretaris'],
      async muat(p) {
        const rows = (await Data.albumDaftar()).filter((a) => dalam(a.tanggal, p)).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        const n = (a) => ((a.dokumentasi_foto || [])[0] || {}).count || 0;
        return { rows, ringkasan: [['Jumlah album', rows.length], ['Jumlah foto', rows.reduce((s, a) => s + n(a), 0)]],
          kolom: [{ label: 'Tanggal', val: (a) => fmt.tglPendek(a.tanggal) }, { label: 'Album', key: 'judul' }, { label: 'Kategori', key: 'kategori' }, { label: 'Kegiatan Terkait', val: (a) => (a.kegiatan || {}).judul || '-' }, { label: 'Jumlah Foto', num: true, val: n }] };
      } },
    { id: 'akun', judul: 'Laporan Akun Pengguna', ikon: 'bi-person-gear', peran: ['ketua', 'admin_it'], periode: 'tidak', ttd: ['ketua'],
      async muat() {
        const rows = (await Data.pengguna({ per: 5000, urut: 'nama' })).rows;
        return { rows, ringkasan: [['Jumlah akun', rows.length], ['Aktif', rows.filter((u) => u.status_aktif).length], ['Nonaktif', rows.filter((u) => !u.status_aktif).length]],
          kolom: [{ label: 'Nama', key: 'nama' }, { label: 'Email', key: 'email' }, { label: 'Peran', val: (u) => ROLE_LABEL[u.role] || u.role }, { label: 'Sekolah', val: (u) => (u.anggota || {}).sekolah || '-' },
            { label: 'Status', val: (u) => u.status_aktif ? 'Aktif' : 'Nonaktif' }, { label: 'Login Terakhir', val: (u) => u.terakhir_login ? fmt.tglPendek(u.terakhir_login) : 'Belum pernah' }] };
      } },
    { id: 'log', judul: 'Log Aktivitas Sistem', ikon: 'bi-clock-history', peran: ['ketua', 'admin_it'], periode: 'rentang', ttd: ['ketua'],
      async muat(p) {
        const rows = (await Data.logAktivitas({ dari: p.mulai, sampai: p.selesai, semua: true })).rows;
        const n = (a) => rows.filter((r) => r.aksi === a).length;
        return { rows, landscape: true, ringkasan: [['Jumlah aktivitas', rows.length], ['Tambah/ubah/hapus', n('INSERT') + n('UPDATE') + n('DELETE')], ['Keputusan', n('APPROVE') + n('REJECT')], ['Ekspor laporan', n('EXPORT')]],
          catatan: rows.length >= 5000 ? 'Dibatasi 5.000 baris terbaru — persempit periode untuk data lengkap.' : '',
          kolom: [{ label: 'Waktu', val: (r) => fmt.tglPendek(r.waktu) + ' ' + fmt.jam(new Date(r.waktu).toTimeString().slice(0, 5)) }, { label: 'Aktor', key: 'nama_aktor' }, { label: 'Aksi', key: 'aksi' },
            { label: 'Tabel', key: 'tabel' }, { label: 'Keterangan', val: ringkasLog }] };
      } }
  ];

  function ringkasLog(r) {
    const b = r.data_baru || {}, l = r.data_lama || {};
    if (r.aksi === 'EXPORT') return `${b.judul || r.ref_id} (${b.periode || '-'}, ${String(b.format || '').toUpperCase()})`;
    if (r.aksi === 'APPROVE' || r.aksi === 'REJECT') return b.catatan || '';
    if (r.aksi === 'UPDATE') return Object.keys(b).filter((k) => JSON.stringify(b[k]) !== JSON.stringify(l[k])).slice(0, 4).join(', ') + ' diubah';
    const d = r.aksi === 'DELETE' ? l : b;
    return String(d.nama || d.judul || d.uraian || d.perihal || d.nomor_surat || r.ref_id || '').slice(0, 80);
  }

  // ------------------------------------------------------------------
  // Periode (PRD: bulanan, triwulan, semester, tahunan, rentang khusus)
  // ------------------------------------------------------------------
  function hitungPeriode(f) {
    const y = Number(f.tahun);
    if (f.tipe === 'bulan') { const m = Number(f.bulan); return { mulai: `${y}-${pad(m)}-01`, selesai: akhirBulan(y, m), label: `${BULAN[m - 1]} ${y}`, tahun: y }; }
    if (f.tipe === 'triwulan') { const q = Number(f.triwulan), a = (q - 1) * 3 + 1; return { mulai: `${y}-${pad(a)}-01`, selesai: akhirBulan(y, a + 2), label: `Triwulan ${['I', 'II', 'III', 'IV'][q - 1]} ${y}`, tahun: y }; }
    if (f.tipe === 'semester') { const s = Number(f.semester); return { mulai: `${y}-${s === 1 ? '01' : '07'}-01`, selesai: s === 1 ? `${y}-06-30` : `${y}-12-31`, label: `Semester ${s} ${y}`, tahun: y }; }
    if (f.tipe === 'rentang') return { mulai: f.dari, selesai: f.sampai, label: `${fmt.tgl(f.dari)} s.d. ${fmt.tgl(f.sampai)}`, tahun: Number(String(f.dari).slice(0, 4)) };
    return { mulai: `${y}-01-01`, selesai: `${y}-12-31`, label: `Tahun ${y}`, tahun: y };
  }

  // ------------------------------------------------------------------
  // Excel: .xlsx via SheetJS (dimuat saat diperlukan); cadangan CSV
  // ------------------------------------------------------------------
  let xlsxJanji = null;
  function muatXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxJanji) xlsxJanji = new Promise((ok, gagal) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = () => (window.XLSX ? ok(window.XLSX) : gagal(new Error('Pustaka Excel gagal dimuat.')));
      s.onerror = () => { xlsxJanji = null; gagal(new Error('Pustaka Excel gagal dimuat.')); };
      document.head.appendChild(s);
      setTimeout(() => gagal(new Error('Waktu muat pustaka Excel habis.')), 8000);
    });
    return xlsxJanji;
  }
  async function unduhExcel(def, hasil, per, org) {
    const nama = `${def.judul} - ${per.label}`.replace(/[^\w\- ]+/g, '_');
    const kol = hasil.kolom;
    const nilai = (k, r) => (k.x ? k.x(r) : k.val ? k.val(r) : r[k.key]) ?? '';
    try {
      const X = await muatXlsx();
      const aoa = [[(org.nama || '').toUpperCase()], [def.judul.toUpperCase()], ['Periode: ' + per.label + (hasil.subTambah ? ' · ' + hasil.subTambah : '')], ['Dicetak: ' + fmt.tgl(new Date())], [],
        ['No'].concat(kol.map((k) => k.label))].concat(hasil.rows.map((r, i) => [i + 1].concat(kol.map((k) => nilai(k, r)))));
      if (hasil.total) aoa.push([''].concat(kol.map((k) => hasil.total[k.label] ?? '')));
      if (hasil.ringkasan && hasil.ringkasan.length) { aoa.push([]); hasil.ringkasan.forEach(([k, v]) => aoa.push([k, v])); }
      const ws = X.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 5 }].concat(kol.map((k) => ({ wch: Math.min(48, Math.max(k.label.length + 2, ...hasil.rows.slice(0, 200).map((r) => String(nilai(k, r)).length + 2))) })));
      ws['!merges'] = [0, 1, 2, 3].map((r) => ({ s: { r, c: 0 }, e: { r, c: kol.length } }));
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, def.id.slice(0, 28));
      X.writeFile(wb, nama + '.xlsx');
      toast(`${hasil.rows.length} baris diekspor ke ${nama}.xlsx`, 'success');
    } catch (e) {
      UI.eksporCSV(nama, [{ label: 'No', val: (r) => hasil.rows.indexOf(r) + 1 }].concat(kol.map((k) => ({ label: k.label, val: (r) => nilai(k, r) }))), hasil.rows);
      toast('Excel (.xlsx) tidak tersedia, diunduh sebagai .csv yang bisa dibuka di Excel.', 'info', 4500);
    }
    Data.catatEkspor(def.id, def.judul, per.label, 'xlsx');
  }
  function unduhBase64(base64, mime, nama) {
    const bin = atob(base64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: mime })); a.download = nama;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ==================================================================
  // PUSAT LAPORAN
  // ==================================================================
  async function halLaporan(q) {
    const el = await shell('laporan', 'Pusat Laporan', 'Laporan resmi PDF & Excel');
    const daftar = LAP.filter((l) => l.peran.includes(Auth.profil.role));
    const pilihAwal = daftar.find((l) => l.id === (q && q.jenis)) || daftar[0];
    const bln = new Date().getMonth() + 1;
    const f = { tipe: 'bulan', bulan: bln, triwulan: Math.ceil(bln / 3), semester: bln <= 6 ? 1 : 2, tahun: TH(), dari: `${TH()}-${pad(bln)}-01`, sampai: hariIni(), opsi: {} };
    let def = pilihAwal, tab = 'buat';
    el.innerHTML = `<div class="page-head"><div><h1>Pusat Laporan</h1><p>${daftar.length} laporan resmi sesuai hak akses Anda. PDF berkop otomatis diarsipkan di Google Drive.</p></div></div>
      <div class="chip-tabs" role="tablist"><button role="tab" class="active" data-tab="buat"><i class="bi bi-file-earmark-plus"></i> Buat Laporan</button><button role="tab" data-tab="arsip"><i class="bi bi-archive"></i> Arsip Laporan</button></div>
      <div id="lapIsi"></div>`;
    $$('[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; $$('[data-tab]').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); }); render(); });
    const render = () => (tab === 'buat' ? buat() : arsip());

    function buat() {
      $('#lapIsi').innerHTML = `<div class="lap-grid"><div class="lap-list" role="listbox" aria-label="Jenis laporan">${daftar.map((l, i) => `<button role="option" aria-selected="${l === def}" class="lap-item ${l === def ? 'active' : ''}" data-l="${l.id}">
            <span class="icon-tile ${l === def ? '' : 'navy'}"><i class="bi ${l.ikon}"></i></span><span><small>Laporan ${LAP.indexOf(l) + 1}</small><b>${esc(l.judul)}</b></span></button>`).join('')}</div>
        <section class="card lap-panel" id="lapPanel"></section></div>`;
      $$('[data-l]').forEach((b) => b.onclick = () => { def = daftar.find((l) => l.id === b.dataset.l); f.opsi = {}; buat(); });
      panel();
    }
    function panel() {
      const tahunOpsi = [TH() + 1, TH(), TH() - 1, TH() - 2, TH() - 3].map((y) => `<option ${y === Number(f.tahun) ? 'selected' : ''}>${y}</option>`).join('');
      (def.opsi || []).forEach((o) => { if (!(o.k in f.opsi)) f.opsi[o.k] = o.v[0][0]; });
      $('#lapPanel').innerHTML = `<div class="field lap-pilih-hp"><label for="pJenis">Jenis laporan</label><select class="select" id="pJenis">${daftar.map((l) => `<option value="${l.id}" ${l === def ? 'selected' : ''}>${LAP.indexOf(l) + 1}. ${esc(l.judul)}</option>`).join('')}</select></div>
        <div class="card-title"><h3><i class="bi ${def.ikon}" style="color:var(--teal-text)"></i> ${esc(def.judul)}</h3></div>
        <p class="body-sm muted" style="margin-bottom:18px">Penanda tangan: ${def.ttd.map((t) => ({ ketua: 'Ketua', sekretaris: 'Sekretaris', bendahara: 'Bendahara' })[t]).join(' & ')} · Hak akses: ${def.peran.map((r) => ROLE_LABEL[r]).join(', ')}</p>
        ${def.periode === 'tidak' ? '<div class="alert info" style="margin-bottom:16px"><i class="bi bi-calendar-check"></i><div>Laporan ini berisi data <b>per tanggal cetak</b>, tanpa filter periode.</div></div>'
          : def.periode === 'tahun' ? `<div class="field"><label for="pTh">Tahun</label><select class="select" id="pTh">${tahunOpsi}</select></div>`
          : `<div class="field"><span class="label">Jenis periode</span><div class="segmented periode-seg" role="tablist">${[['bulan', 'Bulanan'], ['triwulan', 'Triwulan'], ['semester', 'Semester'], ['tahun', 'Tahunan'], ['rentang', 'Rentang']].map(([k, l]) => `<button type="button" class="${f.tipe === k ? 'active' : ''}" data-tipe="${k}">${l}</button>`).join('')}</div></div>
          <div class="grid-2">${f.tipe === 'rentang' ? `<div class="field"><label for="pDari">Dari tanggal</label><input class="input" type="date" id="pDari" value="${f.dari}"></div><div class="field"><label for="pSampai">Sampai tanggal</label><input class="input" type="date" id="pSampai" value="${f.sampai}"><div class="err">Tanggal akhir harus setelah tanggal awal.</div></div>`
            : `${f.tipe === 'bulan' ? `<div class="field"><label for="pBln">Bulan</label><select class="select" id="pBln">${BULAN.map((b, i) => `<option value="${i + 1}" ${i + 1 === Number(f.bulan) ? 'selected' : ''}>${b}</option>`).join('')}</select></div>` : ''}
              ${f.tipe === 'triwulan' ? `<div class="field"><label for="pTw">Triwulan</label><select class="select" id="pTw">${[1, 2, 3, 4].map((t) => `<option value="${t}" ${t === Number(f.triwulan) ? 'selected' : ''}>Triwulan ${['I (Jan–Mar)', 'II (Apr–Jun)', 'III (Jul–Sep)', 'IV (Okt–Des)'][t - 1]}</option>`).join('')}</select></div>` : ''}
              ${f.tipe === 'semester' ? `<div class="field"><label for="pSm">Semester</label><select class="select" id="pSm"><option value="1" ${Number(f.semester) === 1 ? 'selected' : ''}>Semester 1 (Jan–Jun)</option><option value="2" ${Number(f.semester) === 2 ? 'selected' : ''}>Semester 2 (Jul–Des)</option></select></div>` : ''}
              <div class="field"><label for="pTh">Tahun</label><select class="select" id="pTh">${tahunOpsi}</select></div>`}</div>`}
        ${(def.opsi || []).map((o) => `<div class="field"><label for="o_${o.k}">${o.l}</label><select class="select" id="o_${o.k}" data-opsi="${o.k}">${o.v.map(([v, l]) => `<option value="${v}" ${f.opsi[o.k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}
        <div class="lap-periode" id="pLabel"></div>
        <div class="lap-acts"><button class="btn btn-primary" id="pLihat"><i class="bi bi-eye"></i> Pratinjau Laporan</button><button class="btn btn-outline" id="pXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button></div>
        <p class="help" style="margin-top:12px"><i class="bi bi-info-circle"></i> PDF dibuat di server dan otomatis tersimpan di Drive folder <b>Laporan/${TH()}</b> serta tercatat di Arsip Laporan.</p>`;
      const per = () => def.periode === 'tidak' ? { mulai: '1900-01-01', selesai: '2999-12-31', label: 'Per ' + fmt.tgl(new Date()), tahun: TH() } : def.periode === 'tahun' ? hitungPeriode({ tipe: 'tahun', tahun: f.tahun }) : hitungPeriode(f);
      const label = () => { $('#pLabel').innerHTML = `<i class="bi bi-calendar-range"></i> Periode laporan: <b>${esc(per().label)}</b>`; };
      label();
      $$('[data-tipe]').forEach((b) => b.onclick = () => { f.tipe = b.dataset.tipe; panel(); });
      $('#pJenis').onchange = (e) => { def = daftar.find((l) => l.id === e.target.value); f.opsi = {}; buat(); };
      const ikat = (id, k) => { if ($(id)) $(id).onchange = (e) => { f[k] = e.target.value; label(); }; };
      ikat('#pTh', 'tahun'); ikat('#pBln', 'bulan'); ikat('#pTw', 'triwulan'); ikat('#pSm', 'semester'); ikat('#pDari', 'dari'); ikat('#pSampai', 'sampai');
      $$('[data-opsi]').forEach((s) => s.onchange = () => { f.opsi[s.dataset.opsi] = s.value; });
      const siap = async (btn) => {
        if (def.periode === 'rentang' && f.tipe === 'rentang' && (!f.dari || !f.sampai || f.sampai < f.dari)) { $('#pSampai').closest('.field').classList.add('invalid'); return null; }
        const p = per(); const isi = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyiapkan…';
        try { const [hasil, org] = await Promise.all([def.muat(p, f.opsi), Data.org()]); return { p, hasil, org }; }
        catch (e) { toast(e.message, 'error'); return null; } finally { btn.disabled = false; btn.innerHTML = isi; }
      };
      $('#pLihat').onclick = async (e) => { const r = await siap(e.currentTarget); if (r) pratinjau(def, r.hasil, r.p); };
      $('#pXls').onclick = async (e) => { const r = await siap(e.currentTarget); if (r) unduhExcel(def, r.hasil, r.p, r.org); };
    }

    async function pratinjau(d, hasil, p) {
      const opt = { judul: d.judul, sub: 'Periode: ' + p.label + (hasil.subTambah ? ' · ' + hasil.subTambah : ''), body: UI.tabelData(hasil.kolom, hasil.rows, hasil.total) + (hasil.catatan ? `<p style="font-size:8.5pt;color:#555;margin-top:6px">${esc(hasil.catatan)}</p>` : ''),
        ttd: await UI.penandatangan(d.ttd), landscape: !!hasil.landscape, meta: `Jumlah data: ${hasil.rows.length}`, ringkasan: (hasil.ringkasan || []).map(([k, v]) => [k, String(v)]) };
      const html = await UI.htmlDokumen(opt);
      const org = await Data.org();
      modal({
        judul: 'Pratinjau — ' + d.judul, wide: true,
        isi: `<div class="lap-prev-info"><span><i class="bi bi-calendar-range"></i> ${esc(p.label)}</span><span><i class="bi bi-list-ol"></i> ${hasil.rows.length} baris</span><span><i class="bi bi-file-earmark"></i> A4 ${hasil.landscape ? 'mendatar' : 'tegak'}</span></div>
          ${hasil.rows.length ? '' : '<div class="alert warning" style="margin-bottom:12px"><i class="bi bi-exclamation-triangle"></i><div>Tidak ada data pada periode ini. Laporan tetap bisa dibuat sebagai bukti nihil.</div></div>'}
          <div class="lap-prev ${hasil.landscape ? 'land' : ''}"><iframe title="Pratinjau laporan" id="lapFrame"></iframe></div>`,
        foot: `<button class="btn btn-ghost" data-close>Tutup</button><button class="btn btn-outline" id="vXls"><i class="bi bi-file-earmark-spreadsheet"></i> Excel</button>
          <button class="btn btn-outline" id="vCetak"><i class="bi bi-printer"></i> Cetak</button><button class="btn btn-primary" id="vPdf"><i class="bi bi-file-earmark-pdf"></i> Unduh PDF & Arsipkan</button>`,
        onOpen: (m) => {
          const fr = $('#lapFrame', m); fr.srcdoc = html;
          $('#vCetak', m).onclick = () => { UI.cetakHtml(html); Data.catatEkspor(d.id, d.judul, p.label, 'cetak'); };
          $('#vXls', m).onclick = () => unduhExcel(d, hasil, p, org);
          $('#vPdf', m).onclick = async (e) => {
            const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spinner"></span> Membuat PDF…';
            try {
              const r = await Data.simpanLaporanPdf({ jenis: d.id, judul: d.judul, periode: p.label, html });
              if (r.base64) { unduhBase64(r.base64, r.mime || 'application/pdf', r.nama || d.judul + '.pdf'); toast('PDF diunduh & diarsipkan di Google Drive.', 'success'); }
              else { toast('Mode demo: PDF tidak dibuat di server. Laporan tercatat di arsip; gunakan Cetak → Simpan sebagai PDF.', 'info', 6000); }
            } catch (er) { toast(er.message, 'error'); }
            finally { b.disabled = false; b.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Unduh PDF & Arsipkan'; }
          };
        }
      });
    }

    async function arsip() {
      $('#lapIsi').innerHTML = '<div id="arTabel"></div>';
      const st = { cari: '', halaman: 1, per: 15, urut: null, naik: true };
      let data = null;
      const nama = (j) => (LAP.find((l) => l.id === j) || {}).judul || j;
      UI.tabel({ el: $('#arTabel'), state: st, kosong: { judul: 'Arsip masih kosong', pesan: 'PDF yang diunduh dari Pusat Laporan otomatis tercatat di sini.', ikon: 'bi-archive' },
        kolom: [{ key: 'judul', label: 'Laporan', render: (a) => `<b>${esc(a.judul || nama(a.jenis))}</b><div class="body-sm muted">${esc(a.periode)}</div>` },
          { key: 'jenis', label: 'Jenis', render: (a) => `<span class="badge b-navy">${esc(nama(a.jenis))}</span>` },
          { key: 'dibuat_pada', label: 'Dibuat', render: (a) => `<span style="white-space:nowrap">${fmt.tglPendek(a.dibuat_pada)}</span><div class="body-sm muted">${fmt.relatif(a.dibuat_pada)}</div>` },
          { key: 'ukuran_kb', label: 'Ukuran', cls: 'num', render: (a) => a.ukuran_kb ? (a.ukuran_kb >= 1024 ? (a.ukuran_kb / 1024).toFixed(1) + ' MB' : a.ukuran_kb + ' KB') : '-' }],
        aksi: (a) => `<button class="btn btn-sm btn-outline" data-buka="${esc(a.id)}"><i class="bi bi-file-earmark-pdf"></i> Buka</button>`,
        muat: async (s) => { if (!data) data = await Data.laporanArsip(); return UI.saringLokal(data, s, { cari: ['judul', 'periode', 'jenis'] }); },
        onRender: () => $$('[data-buka]').forEach((b) => b.onclick = () => { const a = data.find((x) => x.id === b.dataset.buka); UI.lihatBerkas(a.file_url, (a.judul || 'laporan') + ' - ' + a.periode); }) });
    }
    render();
  }

  // ==================================================================
  // LOG AKTIVITAS
  // ==================================================================
  const AKSI = { INSERT: ['b-teal', 'Tambah'], UPDATE: ['b-navy', 'Ubah'], DELETE: ['b-red', 'Hapus'], APPROVE: ['b-green', 'Setujui'], REJECT: ['b-amber', 'Tolak'], EXPORT: ['b-slate', 'Ekspor'], LOGIN: ['b-slate', 'Masuk'] };
  const TABEL = ['anggota', 'pengguna', 'pengurus', 'pendaftaran_anggota', 'pengajuan', 'program_kerja', 'kegiatan', 'kegiatan_peserta', 'surat_masuk', 'surat_keluar', 'notulen', 'dokumen',
    'kas_transaksi', 'iuran', 'lomba', 'lomba_peserta', 'prestasi', 'berita', 'dokumentasi_album', 'pengaturan_organisasi', 'laporan'];
  const badgeAksi = (a) => `<span class="badge ${(AKSI[a] || ['b-slate'])[0]}">${esc((AKSI[a] || [0, a])[1])}</span>`;

  async function halLog() {
    const el = await shell('log', 'Log Aktivitas', 'Jejak audit perubahan data');
    const d30 = new Date(Date.now() - 29 * 864e5); const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const st = { dari: iso(d30), sampai: hariIni(), aksi: '', tabel: '', cari: '', halaman: 1, per: 20 };
    el.innerHTML = `<div class="page-head"><div><h1>Log Aktivitas Sistem</h1><p>Setiap tambah, ubah, hapus, keputusan, dan ekspor laporan tercatat otomatis oleh database dan tidak dapat diubah.</p></div>
        <div class="acts"><a class="btn btn-outline" href="#/app/laporan?jenis=log"><i class="bi bi-printer"></i> Cetak Laporan Log</a></div></div>
      <div class="card" style="padding:16px;margin-bottom:16px"><div class="toolbar" style="margin:0;flex-wrap:wrap">
        <div class="search"><i class="bi bi-search"></i><input class="input" id="gCari" placeholder="Cari nama pengguna…" aria-label="Cari aktor"></div>
        <input class="input" type="date" id="gDari" value="${st.dari}" aria-label="Dari tanggal" style="width:auto"><input class="input" type="date" id="gSampai" value="${st.sampai}" aria-label="Sampai tanggal" style="width:auto">
        <select class="select" id="gAksi" aria-label="Aksi"><option value="">Semua aksi</option>${Object.entries(AKSI).map(([k, v]) => `<option value="${k}">${v[1]}</option>`).join('')}</select>
        <select class="select" id="gTabel" aria-label="Tabel"><option value="">Semua data</option>${TABEL.map((t) => `<option value="${t}">${t.replace(/_/g, ' ')}</option>`).join('')}</select></div></div>
      <div id="gTabelLog"></div>`;
    const t = UI.tabel({ el: $('#gTabelLog'), state: st, kosong: { judul: 'Tidak ada aktivitas', pesan: 'Ubah rentang tanggal atau saringan.', ikon: 'bi-clock-history' },
      kolom: [{ key: 'waktu', label: 'Waktu', render: (r) => `<span style="white-space:nowrap">${fmt.tglPendek(r.waktu)}</span><div class="body-sm muted tabnum">${new Date(r.waktu).toTimeString().slice(0, 5)} · ${fmt.relatif(r.waktu)}</div>` },
        { key: 'nama_aktor', label: 'Pengguna', render: (r) => `<b>${esc(r.nama_aktor || 'Sistem')}</b>` },
        { key: 'aksi', label: 'Aksi', render: (r) => badgeAksi(r.aksi) },
        { key: 'tabel', label: 'Data', render: (r) => `<span class="tabnum">${esc(String(r.tabel || '').replace(/_/g, ' '))}</span>` },
        { key: 'ket', label: 'Keterangan', render: (r) => `<span class="body-sm">${esc(ringkasLog(r))}</span>` }],
      aksi: (r) => `<button class="btn btn-ghost btn-icon" data-detail="${esc(r.id)}" aria-label="Detail aktivitas"><i class="bi bi-chevron-right"></i></button>`,
      muat: (s) => Data.logAktivitas(s),
      onRender: (rows) => $$('[data-detail]').forEach((b) => b.onclick = () => detail(rows.find((r) => String(r.id) === b.dataset.detail))) });
    const segar = () => t.muat(true);
    $('#gCari').oninput = debounce((e) => { st.cari = e.target.value; segar(); }, 300);
    $('#gDari').onchange = (e) => { st.dari = e.target.value; segar(); };
    $('#gSampai').onchange = (e) => { st.sampai = e.target.value; segar(); };
    $('#gAksi').onchange = (e) => { st.aksi = e.target.value; segar(); };
    $('#gTabel').onchange = (e) => { st.tabel = e.target.value; segar(); };

    function detail(r) {
      const lama = r.data_lama || {}, baru = r.data_baru || {};
      const kunci = [...new Set(Object.keys(lama).concat(Object.keys(baru)))].filter((k) => !['dibuat_pada', 'diubah_pada'].includes(k));
      const tampil = (v) => v === null || v === undefined ? '<span class="muted">—</span>' : esc(typeof v === 'object' ? JSON.stringify(v) : String(v));
      UI.drawer({ judul: 'Detail Aktivitas',
        isi: `<dl class="kv" style="margin-bottom:18px"><dt>Waktu</dt><dd>${fmt.tgl(r.waktu)} ${new Date(r.waktu).toTimeString().slice(0, 8)}</dd><dt>Pengguna</dt><dd>${esc(r.nama_aktor || 'Sistem')}</dd>
            <dt>Aksi</dt><dd>${badgeAksi(r.aksi)}</dd><dt>Data</dt><dd>${esc(r.tabel || '-')}</dd><dt>ID data</dt><dd class="tabnum" style="word-break:break-all">${esc(r.ref_id || '-')}</dd></dl>
          ${kunci.length ? `<table class="compare"><thead><tr><th>Kolom</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>${kunci.map((k) => { const ubah = JSON.stringify(lama[k]) !== JSON.stringify(baru[k]) && r.aksi === 'UPDATE';
            return `<tr class="${ubah ? 'changed' : ''}"><td class="muted">${esc(k)}</td><td class="${ubah ? 'old' : ''}">${tampil(lama[k])}</td><td class="${ubah ? 'new' : ''}">${tampil(baru[k])}</td></tr>`; }).join('')}</tbody></table>`
            : '<p class="muted">Tidak ada rincian data.</p>'}` });
    }
  }

  Object.assign(window.AppPages, { laporan: halLaporan, log: halLog });
})();
