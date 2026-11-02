/* =====================================================================
   MODE DEMO — aktif otomatis bila SUPABASE_URL di config.js kosong.
   Mengganti Auth & Data dengan data contoh di memori browser, sehingga
   seluruh tampilan bisa dicoba tanpa Supabase/GAS. Tidak ada data yang
   dikirim ke server mana pun.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.KKG || !window.KKG.DEMO) return;
  document.documentElement.classList.add('is-demo');
  const { Auth, Data } = window.KKG;
  const th = new Date().getFullYear();
  const hari = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const tunda = (v, ms = 220) => new Promise((r) => setTimeout(() => r(typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))), ms));

  const db = {
    org: {
      id: 1, nama: 'KKG PJOK Kecamatan Tegal Timur', singkatan: 'KKG PJOK Tegal Timur', logo_url: null,
      alamat: 'Sekretariat SD Negeri Kejambon 2, Jl. Kyai Mukhlas No. 12, Tegal Timur, Kota Tegal',
      email: 'kkgpjok.tegaltimur@gmail.com', telepon: '+62 812-0000-0000',
      visi: 'Mewujudkan pendidik PJOK yang adaptif, profesional, dan berintegritas guna membentuk generasi pelajar Tegal Timur yang tangguh, bugar, dan berkarakter juara.',
      misi: ['Meningkatkan kompetensi pedagogik dan asesmen kurikulum PJOK', 'Menstandarkan dan menjaga akuntabilitas kejuaraan siswa',
        'Mendigitalisasi modul ajar dan bank soal olahraga', 'Membangun kemitraan lintas sektor kesehatan dan KONI', 'Menjaga solidaritas dan kesejahteraan sosial anggota'],
      tentang: 'KKG PJOK Kecamatan Tegal Timur adalah wadah kolaborasi guru Pendidikan Jasmani, Olahraga, dan Kesehatan jenjang SD untuk pengembangan pembelajaran, asesmen kebugaran, dan pembinaan atlet usia dini.',
      nomor_sk: '421.2/084/KKG-PJOK/2025', instansi_pembina: 'Dinas Pendidikan dan Kebudayaan Kota Tegal',
      nominal_iuran: 20000, tahun_anggaran: th, format_nomor_surat: '{NO}/KKG-PJOK/TT/{ROMAWI}/{TAHUN}', periode_pengurus: '2025–2028',
      ketua_id: 'a1', sekretaris_id: 'a3', bendahara_id: 'a4'
    },
    sekolah: ['SD Negeri Slerok 1', 'SD Negeri Slerok 2', 'SD Negeri Kejambon 1', 'SD Negeri Kejambon 2', 'SD Negeri Mintaragen 1',
      'SD Negeri Mintaragen 3', 'SD Negeri Panggung 1', 'SD Negeri Panggung 2', 'SD Negeri Mangkukusuman 1', 'SD Negeri Mangkukusuman 2',
      'SD Muhammadiyah 1 Tegal', 'SD Al-Irsyad Tegal', 'SD Ihsaniyah 1 Tegal'].map((n) => ({ nama: n, status: /Negeri/.test(n) ? 'Negeri' : 'Swasta' })),
    anggota: [
      ['a1', 'Budi Santoso, S.Pd.Jas', 'SD Negeri Slerok 2'], ['a2', 'Hendra Setiawan, S.Pd', 'SD Negeri Kejambon 1'],
      ['a3', 'Siti Rahmawati, S.Pd', 'SD Negeri Panggung 1'], ['a4', 'Dedi Kurniawan, M.Pd', 'SD Negeri Kejambon 2'],
      ['a5', 'Agus Priyono, S.Pd', 'SD Negeri Mintaragen 1'], ['a6', 'Tri Wahyuni, S.Pd', 'SD Negeri Mintaragen 1'],
      ['a7', 'Nur Hidayat, S.Pd', 'SD Negeri Slerok 1'], ['a8', 'Rina Astuti, M.Pd', 'SD Negeri Mangkukusuman 1']
    ].map(([id, nama, sekolah]) => ({ id, nama, sekolah, nip: '19' + String(8e15 + Math.floor(Math.random() * 1e15)).slice(0, 16) })),
    pengguna: [
      { id: 'u1', email: 'admin.kkg@gmail.com', nama: 'Fajar Prasetyo', role: 'admin_it', status_aktif: true, terakhir_login: hari(0), anggota: null },
      { id: 'u2', email: 'budi.santoso@gmail.com', nama: 'Budi Santoso, S.Pd.Jas', role: 'ketua', status_aktif: true, terakhir_login: hari(-1), anggota_id: 'a1', anggota: { sekolah: 'SD Negeri Slerok 2' } },
      { id: 'u3', email: 'hendra.setiawan@gmail.com', nama: 'Hendra Setiawan, S.Pd', role: 'wakil_ketua', status_aktif: true, terakhir_login: hari(-2), anggota_id: 'a2', anggota: { sekolah: 'SD Negeri Kejambon 1' } },
      { id: 'u4', email: 'siti.rahma@gmail.com', nama: 'Siti Rahmawati, S.Pd', role: 'sekretaris', status_aktif: true, terakhir_login: hari(0), anggota_id: 'a3', anggota: { sekolah: 'SD Negeri Panggung 1' } },
      { id: 'u5', email: 'dedi.kurniawan@gmail.com', nama: 'Dedi Kurniawan, M.Pd', role: 'bendahara', status_aktif: true, terakhir_login: hari(-1), anggota_id: 'a4', anggota: { sekolah: 'SD Negeri Kejambon 2' } },
      { id: 'u6', email: 'agus.priyono@gmail.com', nama: 'Agus Priyono, S.Pd', role: 'anggota', status_aktif: true, terakhir_login: hari(-6), anggota_id: 'a5', anggota: { sekolah: 'SD Negeri Mintaragen 1' } },
      { id: 'u7', email: 'tri.wahyuni@gmail.com', nama: 'Tri Wahyuni, S.Pd', role: 'anggota', status_aktif: true, terakhir_login: null, anggota_id: 'a6', anggota: { sekolah: 'SD Negeri Mintaragen 1' } },
      { id: 'u8', email: 'bambang.irawan@gmail.com', nama: 'Bambang Irawan, S.Pd', role: 'anggota', status_aktif: false, terakhir_login: hari(-40), anggota: { sekolah: 'SD Negeri Panggung 2' } }
    ],
    kegiatan: [
      { id: 'k1', judul: 'Workshop Asesmen Kebugaran Jasmani Fase B', kategori: 'Workshop', tanggal: hari(6), jam_mulai: '08:00', jam_selesai: '12:30', lokasi: 'SD Negeri Kejambon 2' },
      { id: 'k2', judul: 'Bimtek Senam SKJ 2022 & Standarisasi Wasit Atletik', kategori: 'Pelatihan', tanggal: hari(17), jam_mulai: '07:30', jam_selesai: '11:00', lokasi: 'GOR Wisanggeni Tegal' },
      { id: 'k3', judul: 'Rakor Pembentukan Panitia O2SN Tingkat Kecamatan', kategori: 'Koordinasi', tanggal: hari(30), jam_mulai: '13:00', jam_selesai: '15:00', lokasi: 'SD Negeri Slerok 2' }
    ],
    berita: [
      { id: 'b1', judul: 'Optimalisasi Asesmen Kebugaran Jasmani Siswa SD Menggunakan Aplikasi Digital', kategori: 'Kurikulum', ringkasan: 'Guru PJOK Tegal Timur dibekali teknik pencatatan kebugaran siswa secara digital agar hasil asesmen lebih akurat.', tanggal_terbit: hari(-5) },
      { id: 'b2', judul: 'Kontingen Tegal Timur Raih Juara Umum Cabor Atletik POPDA Kota Tegal', kategori: 'Prestasi', ringkasan: 'Perolehan lima medali emas dari nomor lari sprint dan tolak peluru mengukuhkan dominasi SD binaan Tegal Timur.', tanggal_terbit: hari(-12) },
      { id: 'b3', judul: 'Pelantikan Pengurus KKG PJOK Periode 2025–2028 dan Rapat Anggaran Tahunan', kategori: 'Organisasi', ringkasan: 'Pengurus baru resmi dilantik dan menyepakati program kerja serta rencana anggaran tahun berjalan.', tanggal_terbit: hari(-25) }
    ],
    prestasi: [
      { peringkat: 'juara_1', nama_siswa: 'Ahmad Fauzan R.', sekolah: 'SD Negeri Mintaragen 3', cabang: 'Atletik Kids — Lari 60 m Putra', lomba: 'O2SN Kota Tegal', jenis_lomba: 'O2SN', tahun: th },
      { peringkat: 'juara_2', nama_siswa: 'Siti Nurhaliza', sekolah: 'SD Negeri Panggung 1', cabang: 'Bulutangkis Tunggal Putri', lomba: 'POPDA Kota Tegal', jenis_lomba: 'POPDA', tahun: th },
      { peringkat: 'juara_3', nama_siswa: 'Bima Arya Pratama', sekolah: 'SD Al-Irsyad Tegal', cabang: 'Renang Gaya Bebas 50 m Putra', lomba: 'O2SN Kota Tegal', jenis_lomba: 'O2SN', tahun: th },
      { peringkat: 'harapan_1', nama_siswa: 'Tim Senam Pramuka', sekolah: 'SD Negeri Mangkukusuman 2', cabang: 'Senam Kesegaran Jasmani', lomba: 'Pekan Seni & Olahraga', jenis_lomba: 'Pekan Seni', tahun: th }
    ],
    medali: { juara_1: 14, juara_2: 9, juara_3: 11, harapan_1: 6, harapan_2: 4, harapan_3: 2 },
    topSekolah: [['SD Negeri Kejambon 2', 52], ['SD Negeri Panggung 1', 44], ['SD Negeri Slerok 1', 38], ['SD Ihsaniyah 1 Tegal', 30], ['SD Negeri Mintaragen 1', 20]],
    lomba: [
      { id: 'l1', nama: 'Seleksi Atletik & Renang SD', jenis: 'O2SN', cabang: 'Atletik, Renang', tanggal: hari(20), batas_daftar: hari(12), lokasi: 'Stadion Yos Sudarso', status: 'pendaftaran_dibuka' },
      { id: 'l2', nama: 'Kejuaraan Bola Voli Mini Putri', jenis: 'POPDA', cabang: 'Bola Voli Mini', tanggal: hari(48), batas_daftar: hari(35), lokasi: 'GOR Wisanggeni', status: 'pendaftaran_dibuka' },
      { id: 'l3', nama: 'Festival Egrang & Gobak Sodor', jenis: 'Pekan Seni', cabang: 'Olahraga Tradisional', tanggal: hari(70), batas_daftar: hari(55), lokasi: 'Alun-alun Tegal', status: 'pendaftaran_dibuka' }
    ],
    notif: [
      { id: 'n1', judul: 'Pendaftaran anggota baru', isi: 'Rizky Ananda, S.Pd mengajukan pendaftaran anggota.', tautan: '#/app/pendaftaran', dibaca: false, dibuat_pada: new Date(Date.now() - 36e5).toISOString() },
      { id: 'n2', judul: 'Bukti transfer masuk', isi: 'Ahmad Fauzi mengunggah bukti iuran Oktober.', tautan: '#/app/iuran', dibaca: false, dibuat_pada: new Date(Date.now() - 5 * 36e5).toISOString() },
      { id: 'n3', judul: 'Workshop Kurikulum dijadwalkan', isi: 'Agenda baru ditambahkan oleh Wakil Ketua.', tautan: '#/app/kegiatan', dibaca: true, dibuat_pada: new Date(Date.now() - 50 * 36e5).toISOString() }
    ]
  };

  // ---------------- Auth demo ----------------
  Auth.loginGoogle = async () => { throw new Error('Mode demo: pilih peran di bawah untuk mencoba.'); };
  Auth.init = async () => {
    try {
      const r = localStorage.getItem('kkg_demo_role');
      if (r) Auth.masukDemo(r, false);
    } catch (e) { /* abaikan */ }
    return Auth.profil;
  };
  Auth.masukDemo = (role, simpan = true) => {
    const u = db.pengguna.find((p) => p.role === role) || db.pengguna[0];
    Auth.profil = { id: u.id, email: u.email, nama: u.nama, role: u.role, anggota_id: u.anggota_id || null,
      anggota: u.anggota ? { sekolah: u.anggota.sekolah, nip: '198204152008011008' } : null,
      notif_belum_dibaca: db.notif.filter((n) => !n.dibaca).length };
    if (simpan) { try { localStorage.setItem('kkg_demo_role', role); } catch (e) { /* abaikan */ } }
    return Auth.profil;
  };
  Auth.logout = async () => { Auth.profil = null; try { localStorage.removeItem('kkg_demo_role'); } catch (e) { /* abaikan */ } };
  Auth.refreshProfil = async () => Auth.profil;

  // ---------------- Data demo ----------------
  Object.assign(Data, {
    org: () => tunda(db.org, 120),
    statPublik: () => tunda({ anggota_aktif: 124, sekolah: 42, program_kerja: 18, prestasi: 36 }),
    sekolah: () => tunda(db.sekolah, 60),
    kegiatanMendatang: (n = 3) => tunda(db.kegiatan.slice(0, n)),
    beritaTerbaru: (n = 3) => tunda(db.berita.slice(0, n)),
    prestasiTerbaru: (n = 4) => tunda(db.prestasi.slice(0, n)),
    prestasiSemua: () => tunda(Object.entries(db.medali).flatMap(([p, c]) => Array.from({ length: c }, (_, i) => ({ peringkat: p, sekolah: db.topSekolah[i % 5][0], tahun: th })))),
    lombaAktif: (n = 3) => tunda(db.lomba.slice(0, n)),
    pengurusPublik: () => tunda([
      { jabatan: 'Ketua', urutan: 1, nama: 'Budi Santoso, S.Pd.Jas', sekolah: 'SD Negeri Slerok 2' },
      { jabatan: 'Wakil Ketua', urutan: 2, nama: 'Hendra Setiawan, S.Pd', sekolah: 'SD Negeri Kejambon 1' },
      { jabatan: 'Sekretaris', urutan: 3, nama: 'Siti Rahmawati, S.Pd', sekolah: 'SD Negeri Panggung 1' },
      { jabatan: 'Bendahara', urutan: 4, nama: 'Dedi Kurniawan, M.Pd', sekolah: 'SD Negeri Kejambon 2' },
      { jabatan: 'Admin IT & Publikasi', urutan: 5, nama: 'Agus Setiawan, S.Pd', sekolah: 'SD Negeri Mintaragen 1' }
    ]),
    daftar: async (p) => {
      if (db._daftar && db._daftar.includes(p.email.toLowerCase())) throw new Error('Email ini sudah terdaftar dan sedang diproses.');
      (db._daftar = db._daftar || []).push(p.email.toLowerCase());
      return tunda(null, 600);
    },
    uploadPendaftaran: async (b) => tunda({ url: b.dataUrl || null }, 400),
    upload: async (_k, b) => tunda({ url: b.dataUrl || null }, 400),

    dashboard: async () => tunda(dashDemo(Auth.profil && Auth.profil.role), 350),
    clearDashCache: () => {},
    updateOrg: async (patch) => { Object.assign(db.org, patch); return tunda(db.org); },
    anggotaPilihan: () => tunda(db.anggota),

    pengguna: async ({ cari = '', role = '', status = '', halaman = 1, per = 10, urut = 'nama', naik = true } = {}) => {
      let rows = db.pengguna.filter((p) =>
        (!cari || (p.nama + ' ' + p.email).toLowerCase().includes(cari.toLowerCase())) &&
        (!role || p.role === role) && (!status || p.status_aktif === (status === 'aktif')));
      rows.sort((a, b) => String(a[urut] ?? '').localeCompare(String(b[urut] ?? '')) * (naik ? 1 : -1));
      return tunda({ rows: rows.slice((halaman - 1) * per, halaman * per), total: rows.length });
    },
    simpanPengguna: async (row) => {
      const dup = db.pengguna.find((p) => p.email === row.email.toLowerCase() && p.id !== row.id);
      if (dup) throw new Error('Data sudah ada (duplikat).');
      if (row.id) Object.assign(db.pengguna.find((p) => p.id === row.id), row, { email: row.email.toLowerCase() });
      else db.pengguna.push(Object.assign({ id: 'u' + Date.now(), terakhir_login: null, anggota: null }, row, { email: row.email.toLowerCase() }));
      return tunda(null);
    },
    setStatusPengguna: async (id, aktif) => { db.pengguna.find((p) => p.id === id).status_aktif = aktif; return tunda(null); },

    notifikasi: () => tunda(db.notif, 120),
    tandaiDibaca: async (id) => { db.notif.forEach((n) => { if (!id || n.id === id) n.dibaca = true; }); if (Auth.profil) Auth.profil.notif_belum_dibaca = db.notif.filter((n) => !n.dibaca).length; return tunda(null, 50); },
    bukaBerkas: async (url) => ({ url })
  });


  // =================================================================
  // BATCH 2 — data contoh organisasi & persetujuan
  // =================================================================
  const SKL = db.sekolah.map((x) => x.nama);
  const tambahan = ['Rahmat Hidayat, S.Pd', 'Siti Maryam, S.Pd.SD', 'Bambang Triyono, S.Pd', 'Ahmad Fauzi, S.Pd', 'Dewi Lestari, S.Pd',
    'Joko Susilo, S.Pd.Jas', 'Lina Marlina, S.Pd', 'Eko Prasetyo, S.Or', 'Wulan Sari, S.Pd', 'Yusuf Maulana, S.Pd', 'Indah Permata, S.Pd',
    'Arif Rahman, S.Or', 'Nanik Sulistyowati, S.Pd', 'Teguh Wibowo, S.Pd', 'Fitri Handayani, S.Pd', 'Heru Santosa, M.Pd'];
  const KOMP = ['Atletik & Senam', 'Bulutangkis & Renang', 'Sepak Bola & Futsal', 'Pencak Silat', 'Bola Voli & Kebugaran', 'Tenis Meja & Catur', 'Renang & Akuatik'];
  const KEPEG = ['PNS', 'PNS', 'PNS', 'PPPK', 'Honorer'];
  db.anggota = db.anggota.concat(tambahan.map((nama, i) => ({ id: 'b' + (i + 1), nama, sekolah: SKL[(i * 5 + 3) % SKL.length] })))
    .map((a, i) => Object.assign(a, {
      nip: i % 7 === 6 ? null : String(198000000000000000n + BigInt(i) * 10101010101n + 2008011000n).slice(0, 18),
      nuptk: String(4000000000000000 + i * 1234567).slice(0, 16),
      email: a.email || a.nama.toLowerCase().replace(/,.*$/, '').replace(/[^a-z]+/g, '.') + '@gmail.com',
      status_kepegawaian: KEPEG[i % KEPEG.length], no_hp: i % 4 === 3 ? null : '0812' + String(30000000 + i * 7919).slice(0, 8),
      kompetensi: KOMP[i % KOMP.length], foto_url: null, tampil_publik: i % 3 !== 2, status_aktif: i !== 13 && i !== 20,
      tanggal_gabung: hari(-30 * (i + 1))
    }));
  db.pengurus = [['a1', 'Ketua', 1], ['a2', 'Wakil Ketua', 2], ['a3', 'Sekretaris', 3], ['a4', 'Bendahara', 4], ['a5', 'Admin IT & Publikasi', 5]]
    .map(([aid, jabatan, urutan], i) => ({ id: 'p' + (i + 1), anggota_id: aid, jabatan, urutan, periode_mulai: 2025, periode_selesai: 2028, sk_nomor: '421.2/084/KKG-PJOK/2025' }));
  db.pendaftaran = [
    { id: 'd1', nama: 'Rizky Ananda, S.Pd', nip: '199605142022121002', email: 'rizky.ananda@gmail.com', sekolah: 'SD Negeri Slerok 1', no_hp: '0821-4421-9930', status: 'menunggu', dibuat_pada: new Date(Date.now() - 3 * 36e5).toISOString() },
    { id: 'd2', nama: 'Dewi Anggraeni, S.Pd', nip: '199203102020122005', email: 'dewi.anggraeni@gmail.com', sekolah: 'SD Negeri Kejambon 2', no_hp: null, status: 'menunggu', dibuat_pada: new Date(Date.now() - 26 * 36e5).toISOString() },
    { id: 'd3', nama: 'Fajar Nugroho, S.Or', nip: '199811052023211004', email: 'fajar.nugroho@gmail.com', sekolah: 'SD Negeri Mintaragen 3', no_hp: '0857-1100-2299', status: 'disetujui', catatan: 'Data lengkap, SK tugas valid.', diputus_pada: hari(-1), dibuat_pada: hari(-4) },
    { id: 'd4', nama: 'Sri Wahyuni, S.Pd', nip: '198707232010012011', email: 'sri.w@gmail.com', sekolah: 'SD Negeri Panggung 2', no_hp: '0813-9090-1212', status: 'aktif', catatan: 'Disetujui.', diputus_pada: hari(-10), dibuat_pada: hari(-12) },
    { id: 'd5', nama: 'Andi Saputra', nip: '200101012024011001', email: 'andi.s@gmail.com', sekolah: 'SD Negeri Slerok 2', no_hp: null, status: 'ditolak', catatan: 'Bukan guru PJOK di wilayah Tegal Timur.', diputus_pada: hari(-6), dibuat_pada: hari(-7) }
  ];
  const svgDoc = (judul) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#fff"/><rect x="40" y="40" width="520" height="70" fill="#173D72"/><text x="60" y="85" font-family="Arial" font-size="24" fill="#fff">${judul}</text>${Array.from({ length: 14 }, (_, i) => `<rect x="60" y="${150 + i * 34}" width="${300 + (i * 37) % 180}" height="12" rx="6" fill="#D6E0EC"/>`).join('')}<text x="380" y="740" font-family="Arial" font-size="16" fill="#5B6B82">Tanda tangan &amp; stempel</text></svg>`);
  db.pengajuan = [
    { id: 'q1', kode: 'REQ-2026-0089', jenis: 'perubahan_data', ref_id: 'a5', pengaju_id: 'u6', ringkasan: 'Pembaruan gelar akademik & mutasi sekolah', status: 'menunggu', dibuat_pada: new Date(Date.now() - 5 * 36e5).toISOString(),
      data_usulan: { nama: 'Agus Priyono, M.Pd', sekolah: 'SD Negeri Kejambon 2', alasan: 'Saya telah lulus Magister Pendidikan dan mendapat SK mutasi ke SD Negeri Kejambon 2 per 1 Oktober.' }, lampiran_url: svgDoc('SK Mutasi Disdikbud') },
    { id: 'q2', kode: 'REQ-2026-0090', jenis: 'usulan_kegiatan', pengaju_id: 'u7', ringkasan: 'Klinik Pembelajaran Atletik Aman untuk Siswa SD', status: 'menunggu', dibuat_pada: new Date(Date.now() - 20 * 36e5).toISOString(),
      data_usulan: { judul: 'Klinik Pembelajaran Atletik Aman', tanggal: hari(21), lokasi: 'Lapangan SD Negeri Mintaragen 1', deskripsi: 'Pelatihan teknik lari, lompat, dan lempar yang aman bagi siswa kelas rendah.' } },
    { id: 'q3', kode: 'REQ-2026-0091', jenis: 'peserta_lomba', pengaju_id: 'u6', ringkasan: '3 atlet sprint 60 m & lompat jauh — O2SN', status: 'menunggu', dibuat_pada: hari(-1),
      data_usulan: { lomba: 'O2SN Kota Tegal', cabang: 'Atletik', nama_siswa: 'Ahmad Fauzan R., Bima Arya, Citra Lestari', kelas: '5–6' } },
    { id: 'q4', kode: 'REQ-2026-0092', jenis: 'prestasi', pengaju_id: 'u7', ringkasan: 'Juara 1 Pencak Silat Tunggal Putri', status: 'menunggu', dibuat_pada: hari(-2),
      data_usulan: { nama_siswa: 'Nadia Putri', kelas: '5', lomba: 'POPDA Kota Tegal', cabang: 'Pencak Silat', peringkat: 'juara_1' }, lampiran_url: svgDoc('Sertifikat Juara 1') },
    { id: 'q5', kode: 'REQ-2026-0093', jenis: 'bukti_bayar', pengaju_id: 'u6', ringkasan: 'Iuran Oktober 2026 (transfer)', status: 'menunggu', dibuat_pada: hari(-1),
      data_usulan: { bulan: [10], nominal: 20000 }, lampiran_url: svgDoc('Bukti Transfer BRI') },
    { id: 'q6', kode: 'REQ-2026-0071', jenis: 'perubahan_data', ref_id: 'a6', pengaju_id: 'u7', ringkasan: 'Koreksi NIP', status: 'ditolak', dibuat_pada: hari(-15),
      data_usulan: { nip: '199105182019032016', alasan: 'Salah ketik NIP.' },
      riwayat: [{ keputusan: 'ditolak', catatan: 'Mohon lampirkan SK CPNS sebagai bukti NIP yang benar.', pemutus: 'Siti Rahmawati, S.Pd', waktu: hari(-14) }] }
  ];
  const PEMUTUS = { perubahan_data: ['ketua', 'sekretaris'], usulan_kegiatan: ['ketua', 'wakil_ketua'], peserta_lomba: ['ketua', 'sekretaris'], prestasi: ['ketua', 'sekretaris'], bukti_bayar: ['bendahara'] };
  const bolehPutus = (j) => !!Auth.profil && (PEMUTUS[j] || []).includes(Auth.profil.role);
  const perlu = (...peran) => { if (!Auth.profil || !peran.includes(Auth.profil.role)) throw new Error('Anda tidak memiliki izin untuk tindakan ini.'); };
  const agtById = (id) => db.anggota.find((a) => a.id === id);
  const usrById = (id) => db.pengguna.find((u) => u.id === id) || {};
  const formatPengajuan = (p) => {
    const u = usrById(p.pengaju_id); const a = agtById(u.anggota_id) || {};
    const r = p.riwayat || [];
    return Object.assign({}, p, { bisa_putus: bolehPutus(p.jenis), pengaju_nama: u.nama, pengaju_email: u.email, pengaju_nip: a.nip, pengaju_sekolah: a.sekolah,
      keputusan_terakhir: r.length ? r[r.length - 1] : null });
  };
  const masukDemoAsli = Auth.masukDemo;
  Auth.masukDemo = (role, simpan) => {
    const p = masukDemoAsli(role, simpan);
    const a = agtById(p.anggota_id);
    if (a) p.anggota = Object.assign({}, a);
    return p;
  };
  if (Auth.profil) Auth.masukDemo(Auth.profil.role, false);

  Object.assign(Data, {
    anggotaPilihan: () => tunda(db.anggota.filter((a) => a.status_aktif).sort((x, y) => x.nama.localeCompare(y.nama))),
    async anggota(st = {}) {
      perlu('admin_it', 'ketua', 'wakil_ketua', 'sekretaris', 'bendahara');
      const s = Object.assign({ halaman: 1, per: 10, urut: 'nama', naik: true }, st);
      const r = window.UI.saringLokal(db.anggota, s, { cari: ['nama', 'nip', 'nuptk', 'sekolah'], filter: {
        sekolah: (x, v) => x.sekolah === v, status: (x, v) => x.status_aktif === (v === 'aktif'),
        publik: (x, v) => x.tampil_publik === (v === 'ya'), kepeg: (x, v) => x.status_kepegawaian === v } });
      return tunda(s.semua ? { rows: r.semua, total: r.total } : { rows: r.rows, total: r.total });
    },
    async simpanAnggota(row) {
      perlu('sekretaris');
      if (row.nip && db.anggota.some((a) => a.nip === row.nip && a.id !== row.id)) throw new Error('Data sudah ada (duplikat): NIP sudah terdaftar.');
      if (row.id) Object.assign(agtById(row.id), row); else db.anggota.push(Object.assign({ id: 'n' + Date.now(), tanggal_gabung: hari(0) }, row));
      return tunda(row);
    },
    async hapusAnggota(id) { perlu('sekretaris'); db.anggota = db.anggota.filter((a) => a.id !== id); return tunda(null); },
    async setPublik(ids, v) { perlu('sekretaris'); [].concat(ids).forEach((i) => { agtById(i).tampil_publik = v; }); return tunda(null, 250); },
    async imporAnggota(rows) {
      perlu('sekretaris', 'admin_it');
      rows.forEach((r, i) => db.anggota.push(Object.assign({ id: 'imp' + Date.now() + i, status_aktif: true, tampil_publik: false, tanggal_gabung: hari(0) }, r)));
      return tunda(rows.length, 600);
    },
    async detailAnggota(id) {
      const a = agtById(id);
      const bln = new Date().getMonth() + 1;
      return tunda({ anggota: a, iuran: Array.from({ length: bln }, (_, i) => ({ bulan: i + 1, status: (i + a.nama.length) % 5 === 0 ? 'menunggu' : 'lunas' })).filter((_, i) => i < bln - (a.nama.length % 3)),
        kegiatan: db.kegiatan.slice(0, 3).map((k, i) => ({ hadir: i === 2 ? null : 'hadir', kegiatan: { judul: k.judul, tanggal: k.tanggal } })),
        jabatan: db.pengurus.filter((p) => p.anggota_id === id) });
    },
    pengurusDaftar: () => tunda(db.pengurus.map((p) => Object.assign({}, p, { anggota: agtById(p.anggota_id) })).sort((a, b) => a.urutan - b.urutan)),
    async simpanPengurus(row) {
      perlu('sekretaris');
      const d = Object.assign({}, row, { periode_mulai: Number(row.periode_mulai), periode_selesai: Number(row.periode_selesai), urutan: Number(row.urutan || 10) });
      if (row.id) Object.assign(db.pengurus.find((p) => p.id === row.id), d); else db.pengurus.push(Object.assign({ id: 'p' + Date.now() }, d));
      return tunda(null);
    },
    async hapusPengurus(id) { perlu('sekretaris'); db.pengurus = db.pengurus.filter((p) => p.id !== id); return tunda(null); },
    async aturUrutan(list) { perlu('sekretaris'); list.forEach((x) => { db.pengurus.find((p) => p.id === x.id).urutan = x.urutan; }); return tunda(null, 200); },

    async pendaftaran() { perlu('admin_it', 'ketua', 'wakil_ketua', 'sekretaris'); return tunda(db.pendaftaran); },
    async putuskanPendaftaran(id, setuju, catatan) {
      perlu('ketua', 'sekretaris');
      if (String(catatan || '').trim().length < 5) throw new Error('Catatan keputusan wajib diisi (min. 5 karakter).');
      const d = db.pendaftaran.find((x) => x.id === id);
      if (!d || d.status !== 'menunggu') throw new Error('Pendaftaran tidak ditemukan atau sudah diputus.');
      Object.assign(d, { status: setuju ? 'disetujui' : 'ditolak', catatan, diputus_pada: new Date().toISOString() });
      return tunda({ ok: true, status: d.status }, 400);
    },
    async aktivasiAkun(id, role) {
      perlu('admin_it');
      const d = db.pendaftaran.find((x) => x.id === id);
      if (!d || d.status !== 'disetujui') throw new Error('Pendaftaran belum disetujui Ketua/Sekretaris.');
      const aid = 'n' + Date.now();
      db.anggota.push({ id: aid, nama: d.nama, nip: d.nip, email: d.email, sekolah: d.sekolah, no_hp: d.no_hp, status_kepegawaian: 'PNS', status_aktif: true, tampil_publik: false, tanggal_gabung: hari(0) });
      db.pengguna.push({ id: 'u' + Date.now(), email: d.email, nama: d.nama, role, status_aktif: true, terakhir_login: null, anggota_id: aid, anggota: { sekolah: d.sekolah } });
      d.status = 'aktif';
      return tunda({ ok: true }, 500);
    },

    async pengajuanDaftar(milik = false) {
      const p = Auth.profil;
      return tunda(db.pengajuan.filter((x) => milik ? x.pengaju_id === p.id : (x.pengaju_id === p.id || bolehPutus(x.jenis) || p.role === 'ketua')).map(formatPengajuan));
    },
    async pengajuanDetail(id) {
      const x = db.pengajuan.find((q) => q.id === id);
      const p = Auth.profil;
      if (!x || !(x.pengaju_id === p.id || bolehPutus(x.jenis) || p.role === 'ketua')) throw new Error('Pengajuan tidak ditemukan atau tidak berwenang.');
      const u = usrById(x.pengaju_id); const a = agtById(u.anggota_id) || {};
      const lama = x.jenis === 'perubahan_data' ? agtById(x.ref_id) : null;
      return tunda(Object.assign({}, x, { bisa_putus: bolehPutus(x.jenis) && x.status === 'menunggu',
        pengaju: { nama: u.nama, email: u.email, role: u.role, nip: a.nip, sekolah: a.sekolah, foto_url: a.foto_url, no_hp: a.no_hp },
        data_lama: lama ? { nama: lama.nama, nip: lama.nip, sekolah: lama.sekolah } : null, riwayat: x.riwayat || [] }));
    },
    async putuskanPengajuan(id, setuju, catatan) {
      const x = db.pengajuan.find((q) => q.id === id);
      if (!x) throw new Error('Pengajuan tidak ditemukan.');
      if (x.status !== 'menunggu') throw new Error('Pengajuan sudah diputus.');
      if (!bolehPutus(x.jenis)) throw new Error('Anda tidak berwenang memutus pengajuan ini.');
      if (String(catatan || '').trim().length < 5) throw new Error('Catatan keputusan wajib diisi (min. 5 karakter).');
      x.status = setuju ? 'disetujui' : 'ditolak';
      (x.riwayat = x.riwayat || []).push({ keputusan: x.status, catatan, pemutus: Auth.profil.nama, waktu: new Date().toISOString() });
      if (setuju && x.jenis === 'perubahan_data') { const a = agtById(x.ref_id); ['nama', 'nip', 'sekolah'].forEach((k) => { if (x.data_usulan[k]) a[k] = x.data_usulan[k]; }); }
      return tunda({ ok: true, status: x.status }, 450);
    },
    async ajukan(d) {
      const p = Auth.profil;
      if (d.jenis === 'perubahan_data') {
        if (d.ref_id !== p.anggota_id) throw new Error('Perubahan data hanya dapat diajukan untuk data Anda sendiri.');
        if (db.pengajuan.some((x) => x.jenis === 'perubahan_data' && x.ref_id === d.ref_id && x.status === 'menunggu')) throw new Error('Masih ada pengajuan perubahan data yang menunggu keputusan.');
      }
      const kode = 'REQ-' + new Date().getFullYear() + '-' + String(100 + db.pengajuan.length).padStart(4, '0');
      db.pengajuan.unshift(Object.assign({ id: 'q' + Date.now(), kode, pengaju_id: p.id, status: 'menunggu', dibuat_pada: new Date().toISOString() }, d));
      return tunda({ kode }, 500);
    },
    async updateProfilSaya(patch) {
      const a = agtById(Auth.profil.anggota_id);
      if (!a) throw new Error('Akun Anda belum ditautkan ke data anggota.');
      Object.assign(a, patch); Auth.profil.anggota = Object.assign({}, a);
      return tunda(a);
    }
  });


  // =================================================================
  // BATCH 3 — data contoh program, kegiatan, persuratan & arsip
  // =================================================================
  const TH = new Date().getFullYear();
  db.program = [
    ['Pelatihan Senam SKJ 2022 & Perwasitan Atletik', 'Hendra Setiawan, S.Pd', '60 Guru PJOK', -200, -120, 100],
    ['Digitalisasi Modul & Bank Soal PJOK Fase A–C', 'Siti Rahmawati, S.Pd', '100 Modul', -150, 60, 60],
    ['Pelaksanaan Seleksi O2SN Tingkat Kecamatan', 'Budi Santoso, S.Pd.Jas', '12 SD peserta', -60, 30, 40],
    ['Workshop Asesmen Kebugaran Jasmani', 'Hendra Setiawan, S.Pd', '42 SD', -20, 90, 15],
    ['Family Gathering & Senam Akbar Anggota', 'Dedi Kurniawan, M.Pd', '1 kegiatan', 40, 70, 0]
  ].map(([judul, pj, target, m, s2, pr], i) => ({ id: 'pk' + (i + 1), kode: `PRG-${TH}-${String(i + 1).padStart(2, '0')}`, judul, penanggung_jawab: pj, target,
    tanggal_mulai: hari(m), tanggal_selesai: hari(s2), progres_persen: pr, status: pr >= 100 ? 'selesai' : pr > 0 ? 'berjalan' : 'belum_mulai', tahun: TH,
    deskripsi: 'Program kerja KKG PJOK Tegal Timur tahun ' + TH + '.' }));
  db.kegiatan = db.kegiatan.map((k, i) => Object.assign(k, { kode: `ACT-${TH}-${String(i + 21).padStart(3, '0')}`, program_id: ['pk4', 'pk1', 'pk3'][i], tampil_publik: true, status: 'akan_datang', kuota: 60, deskripsi: 'Kegiatan resmi KKG PJOK Tegal Timur.' }))
    .concat([
      { id: 'k4', kode: `ACT-${TH}-018`, judul: 'Workshop Kurikulum Merdeka PJOK Fase B', kategori: 'Workshop', tanggal: hari(-14), jam_mulai: '08:00', jam_selesai: '13:00', lokasi: 'SD Negeri Mintaragen 1', program_id: 'pk2', tampil_publik: true, status: 'akan_datang', kuota: 50 },
      { id: 'k5', kode: `ACT-${TH}-015`, judul: 'Rakor Rutin Bulanan Gugus', kategori: 'Koordinasi', tanggal: hari(-40), jam_mulai: '13:00', jam_selesai: '15:00', lokasi: 'SD Negeri Kejambon 2', program_id: null, tampil_publik: false, status: 'akan_datang', kuota: null },
      { id: 'k6', kode: `ACT-${TH}-012`, judul: 'Pelatihan Wasit & Juri O2SN', kategori: 'Pelatihan', tanggal: hari(-75), jam_mulai: '07:30', jam_selesai: '12:00', lokasi: 'GOR Wisanggeni Tegal', program_id: 'pk1', tampil_publik: true, status: 'akan_datang', kuota: 40 },
      { id: 'k7', kode: `ACT-${TH}-009`, judul: 'Seminar Gizi & Kebugaran Anak', kategori: 'Seminar', tanggal: hari(-20), jam_mulai: '09:00', jam_selesai: '11:00', lokasi: 'Aula Korwil Tegal Timur', program_id: null, tampil_publik: true, status: 'dibatalkan', kuota: 80 }
    ]);
  db.peserta = [];
  ['k4', 'k5', 'k6'].forEach((kid, j) => db.anggota.slice(0, 16 - j * 3).forEach((a, i) => db.peserta.push({ id: 'kp' + kid + i, kegiatan_id: kid, anggota_id: a.id,
    hadir: (i + j) % 9 === 4 ? 'izin' : (i + j) % 11 === 7 ? 'alpa' : 'hadir', waktu_hadir: hari(-1), catatan: (i + j) % 9 === 4 ? 'Dinas luar' : null })));
  db.anggota.slice(0, 9).forEach((a, i) => { if (i !== 4) db.peserta.push({ id: 'kpk1' + i, kegiatan_id: 'k1', anggota_id: a.id, hadir: null }); });
  db.suratMasuk = [
    ['421.2/1084/Disdikbud/2026', 'Disdikbud Kota Tegal', 'Undangan Rakor Persiapan O2SN SD 2026', -2, 'Disposisi: Ketua'],
    ['005/KKG-PJOK-TT/II/2026', 'Korwilcam Dikbud Tegal Timur', 'Permohonan izin tempat pelatihan wasit senam', -6, 'Selesai'],
    ['426/089/KONI-TGL/2026', 'KONI Kota Tegal', 'Sosialisasi tes kebugaran atlet pelajar usia dini', -12, 'Selesai'],
    ['02/IGORNAS-JTG/X/2026', 'IGORNAS Jawa Tengah', 'Imbauan partisipasi workshop Senam SKJ 2022', -18, 'Menunggu Arahan']
  ].map(([nomor_surat, pengirim, perihal, d, disposisi], i) => ({ id: 'sm' + (i + 1), nomor_agenda: `AGD-${TH}/${String(42 - i).padStart(3, '0')}`, nomor_surat, tanggal_surat: hari(d - 2), tanggal: hari(d), pengirim, perihal, disposisi,
    file_url: i % 2 === 0 ? svgDoc('Surat ' + pengirim.split(' ')[0]) : null }));
  db.suratKeluar = [
    ['Kepala SD se-Kecamatan Tegal Timur', 'Undangan Workshop Asesmen Kebugaran Jasmani', -3, 'terkirim'],
    ['Disdikbud Kota Tegal', 'Laporan pelaksanaan Pelatihan Wasit & Juri O2SN', -9, 'terkirim'],
    ['Ketua Gugus se-Tegal Timur', 'Pemberitahuan jadwal Rakor Bulanan', 0, 'draf']
  ].map(([tujuan, perihal, d, status], i) => ({ id: 'sk' + (i + 1), nomor_urut: 28 - i, nomor_surat: `${String(28 - i).padStart(3, '0')}/KKG-PJOK/TT/${['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][new Date().getMonth()]}/${TH}`, tanggal: hari(d), tujuan, perihal, status,
    file_url: status === 'terkirim' ? svgDoc('Surat Keluar KKG') : null }));
  db.notulen = [
    { id: 'nt1', judul: 'Rakor Awal Tahun & Finalisasi Kalender Kerja', kegiatan_id: 'k5', tanggal: hari(-40), pemimpin: 'Budi Santoso, S.Pd.Jas', notulis: 'Siti Rahmawati, S.Pd', status: 'terbit',
      isi: '1. Iuran kas anggota disepakati Rp20.000 per bulan per guru.\n2. Seleksi O2SN tingkat kecamatan dijadwalkan minggu ke-4 bulan depan.\n3. Penyusunan modul P5 bertema kearifan lokal olahraga pesisir Tegal.\n4. Kehadiran: 38 dari 42 guru.', file_url: svgDoc('Berita Acara Rakor') },
    { id: 'nt2', judul: 'Musyawarah Penyusunan Juknis O2SN', kegiatan_id: 'k6', tanggal: hari(-75), pemimpin: 'Hendra Setiawan, S.Pd', notulis: 'Siti Rahmawati, S.Pd', status: 'draf',
      isi: 'Disepakati bahwa seleksi cabang atletik nomor lari 60 meter dan tolak peluru diselenggarakan di Lapangan Koramil Tegal Timur. Seluruh juri wajib membawa lisensi wasit yang masih aktif.' }
  ];
  db.dokumen = [
    ['DOC-SK-2025-01', 'SK Penetapan Pengurus KKG PJOK 2025–2028', 'SK', 'Disdikbud Kota Tegal', 'publik', 4300],
    ['DOC-ADART-REV3', 'AD/ART KKG PJOK Tegal Timur Hasil Musker', 'AD-ART', 'Musyawarah Kerja 2024', 'anggota', 1800],
    ['DOC-LPJ-2025-02', 'LPJ Keuangan & Pelaksanaan O2SN SD 2025', 'LPJ', 'Panitia O2SN Tegal Timur', 'internal', 8600],
    ['DOC-JUKNIS-2025', 'Panduan & Capaian Pembelajaran PJOK Merdeka', 'Juknis', 'Tim Pengembang Kurikulum', 'publik', 6100],
    ['DOC-LAP-2025', 'Laporan Tahunan KKG 2025', 'Laporan', 'Sekretariat KKG', 'internal', 2400]
  ].map(([kode, judul, kategori, penerbit, akses, ukuran_kb], i) => ({ id: 'dk' + (i + 1), kode, judul, kategori, penerbit, akses, ukuran_kb, file_url: svgDoc(judul.slice(0, 22)), dibuat_pada: hari(-30 * (i + 1)) }));
  const statusEfektif = (k) => k.status === 'dibatalkan' ? 'dibatalkan' : k.tanggal > hari(0) ? 'akan_datang' : k.tanggal === hari(0) ? 'berlangsung' : 'selesai';
  const romawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const nomorBerikut = (tgl) => { const d = new Date(tgl); const n = Math.max(0, ...db.suratKeluar.filter((x) => new Date(x.tanggal).getFullYear() === d.getFullYear()).map((x) => x.nomor_urut || 0)) + 1;
    return { n, nomor: db.org.format_nomor_surat.replace('{NO}', String(n).padStart(3, '0')).replace('{ROMAWI}', romawi[d.getMonth()]).replace('{TAHUN}', d.getFullYear()) }; };
  const SURAT = ['ketua', 'wakil_ketua', 'sekretaris'];

  Object.assign(Data, {
    kegiatanMendatang: (n = 3) => tunda(db.kegiatan.filter((k) => k.tampil_publik && k.status !== 'dibatalkan' && k.tanggal >= hari(0)).sort((a, b) => a.tanggal.localeCompare(b.tanggal)).slice(0, n)),
    programDaftar: (tahun) => tunda(db.program.filter((p) => p.tahun === Number(tahun)).sort((a, b) => a.kode.localeCompare(b.kode))),
    async simpanProgram(row) {
      perlu('wakil_ketua', 'ketua');
      const pr = Number(row.progres_persen || 0);
      const st = pr >= 100 ? 'selesai' : pr > 0 && (row.status || 'belum_mulai') === 'belum_mulai' ? 'berjalan' : (row.status === 'selesai' ? 'berjalan' : row.status || 'belum_mulai');
      const d = Object.assign({}, row, { progres_persen: pr, status: st, tahun: Number(row.tahun) });
      if (row.id) Object.assign(db.program.find((p) => p.id === row.id), d);
      else db.program.push(Object.assign(d, { id: 'pk' + Date.now(), kode: `PRG-${d.tahun}-${String(db.program.filter((p) => p.tahun === d.tahun).length + 1).padStart(2, '0')}` }));
      return tunda(null);
    },
    async hapusProgram(id) { perlu('wakil_ketua', 'ketua'); db.program = db.program.filter((p) => p.id !== id); return tunda(null); },

    async kegiatanDaftar(tahun) {
      const internal = !!Auth.profil; const aid = Auth.profil && Auth.profil.anggota_id;
      return tunda(db.kegiatan.filter((k) => (k.tampil_publik || internal) && (!tahun || new Date(k.tanggal).getFullYear() === Number(tahun))).map((k) => {
        const ps = db.peserta.filter((p) => p.kegiatan_id === k.id); const saya = ps.find((p) => p.anggota_id === aid);
        return Object.assign({}, k, { status_efektif: statusEfektif(k), program_judul: (db.program.find((p) => p.id === k.program_id) || {}).judul || null,
          jumlah_peserta: ps.length, jumlah_hadir: ps.filter((p) => p.hadir === 'hadir').length, saya_terdaftar: !!saya, saya_hadir: saya ? saya.hadir : null });
      }).sort((a, b) => b.tanggal.localeCompare(a.tanggal)));
    },
    kegiatanPilihan: () => tunda(db.kegiatan.map((k) => ({ id: k.id, judul: k.judul, tanggal: k.tanggal })).sort((a, b) => b.tanggal.localeCompare(a.tanggal))),
    async simpanKegiatan(row) {
      perlu('wakil_ketua', 'ketua');
      if (row.id) Object.assign(db.kegiatan.find((k) => k.id === row.id), row);
      else db.kegiatan.push(Object.assign({}, row, { id: 'k' + Date.now(), status: row.status || 'akan_datang', kode: `ACT-${new Date(row.tanggal).getFullYear()}-${String(30 + db.kegiatan.length).padStart(3, '0')}` }));
      return tunda(null);
    },
    async hapusKegiatan(id) { perlu('wakil_ketua', 'ketua'); db.kegiatan = db.kegiatan.filter((k) => k.id !== id); db.peserta = db.peserta.filter((p) => p.kegiatan_id !== id); return tunda(null); },
    async pesertaKegiatan(id) {
      perlu('ketua', 'wakil_ketua', 'sekretaris', 'bendahara');
      return tunda(db.peserta.filter((p) => p.kegiatan_id === id).map((p) => Object.assign({}, p, { anggota: agtById(p.anggota_id) })));
    },
    async simpanPresensi(id, data) {
      perlu('wakil_ketua', 'ketua');
      data.forEach((e) => {
        let p = db.peserta.find((x) => x.kegiatan_id === id && x.anggota_id === e.anggota_id);
        if (!p) { p = { id: 'kp' + Date.now() + e.anggota_id, kegiatan_id: id, anggota_id: e.anggota_id }; db.peserta.push(p); }
        p.hadir = e.hadir || null; p.catatan = e.catatan || null; p.waktu_hadir = e.hadir === 'hadir' ? (p.waktu_hadir || new Date().toISOString()) : null;
      });
      const ps = db.peserta.filter((p) => p.kegiatan_id === id);
      return tunda({ ok: true, hadir: ps.filter((p) => p.hadir === 'hadir').length, izin: ps.filter((p) => p.hadir === 'izin').length, alpa: ps.filter((p) => p.hadir === 'alpa').length }, 450);
    },
    async ikutKegiatan(id) {
      const aid = Auth.profil.anggota_id;
      if (!aid) throw new Error('Akun Anda belum ditautkan ke data anggota.');
      if (db.peserta.some((p) => p.kegiatan_id === id && p.anggota_id === aid)) throw new Error('Data sudah ada (duplikat).');
      db.peserta.push({ id: 'kp' + Date.now(), kegiatan_id: id, anggota_id: aid, hadir: null }); return tunda(null);
    },
    async batalIkut(id) { const aid = Auth.profil.anggota_id; db.peserta = db.peserta.filter((p) => !(p.kegiatan_id === id && p.anggota_id === aid && !p.hadir)); return tunda(null); },

    async surat(jenis) { perlu(...SURAT); return tunda(jenis === 'keluar' ? db.suratKeluar : db.suratMasuk); },
    async simpanSurat(jenis, row) {
      perlu('sekretaris');
      const list = jenis === 'keluar' ? db.suratKeluar : db.suratMasuk;
      if (row.id) { Object.assign(list.find((x) => x.id === row.id), row); return tunda(null); }
      const baru = Object.assign({}, row, { id: 's' + Date.now() });
      if (jenis === 'keluar') { const nb = nomorBerikut(row.tanggal); baru.nomor_urut = nb.n; baru.nomor_surat = nb.nomor; }
      else baru.nomor_agenda = `AGD-${new Date(row.tanggal).getFullYear()}/${String(43 + db.suratMasuk.length - 4).padStart(3, '0')}`;
      list.unshift(baru); return tunda(baru);
    },
    async hapusSurat(jenis, id) { perlu('sekretaris'); if (jenis === 'keluar') db.suratKeluar = db.suratKeluar.filter((x) => x.id !== id); else db.suratMasuk = db.suratMasuk.filter((x) => x.id !== id); return tunda(null); },
    nomorSuratBerikutnya: (tgl) => tunda(nomorBerikut(tgl).nomor, 150),
    async notulen() { perlu(...SURAT); return tunda(db.notulen.map((n) => Object.assign({}, n, { kegiatan: n.kegiatan_id ? db.kegiatan.find((k) => k.id === n.kegiatan_id) : null }))); },
    async simpanNotulen(row) {
      perlu('sekretaris');
      if (row.id) Object.assign(db.notulen.find((n) => n.id === row.id), row); else db.notulen.unshift(Object.assign({}, row, { id: 'nt' + Date.now() }));
      return tunda(null);
    },
    async hapusNotulen(id) { perlu('sekretaris'); db.notulen = db.notulen.filter((n) => n.id !== id); return tunda(null); },
    async dokumen() {
      const r = Auth.profil.role;
      return tunda(db.dokumen.filter((d) => d.akses === 'publik' || d.akses === 'anggota' || ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara'].includes(r)));
    },
    async simpanDokumen(row) {
      perlu('sekretaris');
      if (row.id) Object.assign(db.dokumen.find((d) => d.id === row.id), row); else db.dokumen.unshift(Object.assign({}, row, { id: 'dk' + Date.now(), dibuat_pada: new Date().toISOString() }));
      return tunda(null);
    },
    async hapusDokumen(id) { perlu('sekretaris'); db.dokumen = db.dokumen.filter((d) => d.id !== id); return tunda(null); }
  });

  // =================================================================
  // BATCH 4 — data contoh kas & iuran
  // =================================================================
  (function () {
    const NM = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const blnKini = new Date().getMonth() + 1;
    const tgl = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, 28)).padStart(2, '0')}`;
    // Sebagian besar anggota bergabung sebelum tahun ini, dua orang bergabung tahun ini
    db.anggota.forEach((a, i) => { a.tanggal_gabung = i === 22 ? tgl(TH, Math.max(blnKini - 2, 1), 5) : i === 23 ? tgl(TH, blnKini, 1) : tgl(TH - 2, 7, 1); });
    db.iuran = []; db.kas = [];
    const nb = {};
    const noBukti = (j, t) => { const pre = `${j === 'masuk' ? 'BKM' : 'BKK'}-${String(t).slice(0, 4)}-`; nb[pre] = (nb[pre] || 0) + 1; return pre + String(nb[pre]).padStart(4, '0'); };
    const tambahKasIuran = (i) => {
      const a = db.anggota.find((x) => x.id === i.anggota_id);
      db.kas.push({ id: 'kx' + i.id, no_bukti: `IUR-${i.tahun}${String(i.bulan).padStart(2, '0')}-${i.id.slice(-4)}`, tanggal: String(i.tanggal_bayar).slice(0, 10), jenis: 'masuk',
        kategori: 'Iuran Anggota', uraian: `Iuran ${i.metode === 'transfer' ? 'transfer ' : ''}${a ? a.nama : ''} bulan ${i.bulan}/${i.tahun}`, nominal: i.nominal, ref_iuran_id: i.id, bukti_url: i.bukti_url || null, dibuat_pada: i.tanggal_bayar });
    };
    db.anggota.filter((a) => a.status_aktif).forEach((a, ai) => {
      for (const y of [TH - 1, TH]) for (let m = 1; m <= (y < TH ? 12 : blnKini); m++) {
        if (tgl(y, m, 28) < a.tanggal_gabung) continue;
        const telat = y === TH && ((ai % 6 === 1 && m >= blnKini - 2) || (ai % 9 === 4 && m >= blnKini - 4) || (ai % 5 === 2 && m === blnKini) || (ai === 7 && m > 3));
        if (telat || (y === TH && m === blnKini && ai % 3 === 0)) continue;
        const id = `i${a.id}-${y}-${m}`;
        const transfer = (ai + m) % 4 === 0;
        const row = { id, anggota_id: a.id, tahun: y, bulan: m, nominal: 20000, status: 'lunas', metode: transfer ? 'transfer' : 'tunai',
          bukti_url: transfer ? svgDoc('Bukti Transfer') : null, catatan: null, tanggal_bayar: tgl(y, m, 5 + (ai % 20)) + 'T09:00:00Z' };
        db.iuran.push(row); tambahKasIuran(row);
      }
    });
    // Bukti transfer menunggu verifikasi (terhubung ke pengajuan contoh)
    const menunggu = [['a5', [blnKini]], ['a6', [blnKini - 1, blnKini].filter((x) => x >= 1)]];
    menunggu.forEach(([aid, bl], k) => {
      const ids = bl.map((m) => { db.iuran = db.iuran.filter((x) => !(x.anggota_id === aid && x.tahun === TH && x.bulan === m)); db.kas = db.kas.filter((x) => x.ref_iuran_id !== `i${aid}-${TH}-${m}`);
        const id = `w${aid}-${m}`; db.iuran.push({ id, anggota_id: aid, tahun: TH, bulan: m, nominal: 20000, status: 'menunggu', metode: 'transfer', bukti_url: svgDoc('Bukti Transfer BRI'), catatan: k === 1 ? 'Transfer sekaligus 2 bulan' : null, tanggal_bayar: null }); return id; });
      const u = db.pengguna.find((x) => x.anggota_id === aid);
      const data = { tahun: TH, bulan: bl, nominal: 20000 * bl.length, iuran_ids: ids, alasan: k === 1 ? 'Transfer sekaligus 2 bulan' : undefined };
      const ada = db.pengajuan.find((q) => q.jenis === 'bukti_bayar' && q.pengaju_id === (u && u.id) && q.status === 'menunggu');
      const ringkasan = `Iuran ${bl.map((m) => NM[m - 1]).join(', ')} ${TH} (transfer)`;
      if (ada) Object.assign(ada, { ringkasan, data_usulan: data, ref_id: ids[0] });
      else if (u) db.pengajuan.unshift({ id: 'qb' + k, kode: 'REQ-' + TH + '-' + String(95 + k).padStart(4, '0'), jenis: 'bukti_bayar', pengaju_id: u.id, ringkasan, status: 'menunggu',
        dibuat_pada: new Date(Date.now() - (k + 1) * 5 * 36e5).toISOString(), data_usulan: data, ref_id: ids[0], lampiran_url: svgDoc('Bukti Transfer BRI') });
    });
    // Pemasukan & pengeluaran lain
    const lain = [
      [TH - 1, 12, 20, 'keluar', 'Konsumsi', 'Konsumsi Rakor Akhir Tahun', 650000],
      [TH, 1, 10, 'masuk', 'Donasi', 'Donasi alumni untuk O2SN', 1500000], [TH, 1, 18, 'keluar', 'Konsumsi', 'Konsumsi Rakor Awal Tahun', 450000],
      [TH, 2, 8, 'keluar', 'ATK', 'ATK & penggandaan modul ajar', 275000], [TH, 3, 14, 'keluar', 'Kegiatan', 'Sewa GOR seleksi O2SN', 800000],
      [TH, 3, 20, 'masuk', 'Sponsor', 'Sponsor koperasi guru Tegal Timur', 2000000], [TH, 4, 22, 'keluar', 'Hadiah', 'Trofi & medali seleksi O2SN', 1250000],
      [TH, 5, 6, 'keluar', 'Transport', 'Transport kontingen O2SN kota', 900000], [TH, 6, 17, 'keluar', 'Sosial', 'Santunan duka anggota', 500000],
      [TH, 7, 9, 'keluar', 'Kegiatan', 'Narasumber workshop kurikulum', 1000000], [TH, 8, 15, 'keluar', 'Konsumsi', 'Konsumsi workshop kurikulum', 720000],
      [TH, 8, 17, 'keluar', 'Sosial', 'Partisipasi lomba HUT RI', 350000], [TH, 9, 12, 'masuk', 'Donasi', 'Hibah Korwil kegiatan PJOK', 1000000],
      [TH, 9, 23, 'keluar', 'Konsumsi', 'Konsumsi Rakor Gugus', 300000], [TH, 10, 19, 'keluar', 'Kegiatan', 'Sertifikat & bahan workshop', 425000],
      [TH, 10, 28, 'keluar', 'ATK', 'Cetak banner & spanduk', 180000], [TH, blnKini, 2, 'keluar', 'Konsumsi', 'Konsumsi rapat pengurus', 150000]
    ];
    lain.filter(([y, m]) => y < TH || m <= blnKini).forEach(([y, m, d, jenis, kategori, uraian, nominal], i) => {
      const t = tgl(y, m, d);
      db.kas.push({ id: 'km' + i, no_bukti: noBukti(jenis, t), tanggal: t, jenis, kategori, uraian, nominal, ref_iuran_id: null, bukti_url: jenis === 'keluar' ? svgDoc('Nota ' + kategori) : null, dibuat_pada: t + 'T10:00:00Z' });
    });
    // Saldo awal sebelum tahun lalu
    db.kas.push({ id: 'k0', no_bukti: `BKM-${TH - 2}-0001`, tanggal: tgl(TH - 2, 12, 31), jenis: 'masuk', kategori: 'Saldo Awal', uraian: 'Saldo kas pengurus periode lalu', nominal: 3250000, ref_iuran_id: null, dibuat_pada: tgl(TH - 2, 12, 31) + 'T10:00:00Z' });
    db.antrean = { menunggu: 0, terkirim: 37, gagal: 1 };

    const tahunDari = (t) => Number(String(t).slice(0, 4));
    const urutKas = (a, b) => a.tanggal.localeCompare(b.tanggal) || String(a.dibuat_pada).localeCompare(String(b.dibuat_pada));
    const tunggakanDemo = () => {
      const th = db.org.tahun_anggaran, batas = th < TH ? 12 : th > TH ? 0 : blnKini;
      return db.anggota.filter((a) => a.status_aktif).map((a) => {
        const bl = [];
        for (let m = 1; m <= batas; m++) if (tgl(th, m, 28) >= a.tanggal_gabung && !db.iuran.some((i) => i.anggota_id === a.id && i.tahun === th && i.bulan === m && i.status === 'lunas')) bl.push(m);
        return { anggota_id: a.id, nama: a.nama, sekolah: a.sekolah, no_hp: a.no_hp, email: a.email, tahun: th, bulan_tertunggak: bl, jumlah_bulan: bl.length, total_tunggakan: bl.length * db.org.nominal_iuran };
      }).filter((r) => r.jumlah_bulan).sort((a, b) => b.jumlah_bulan - a.jumlah_bulan || a.nama.localeCompare(b.nama));
    };
    db.tunggakanDemo = tunggakanDemo;
    const putuskanAsli = Data.putuskanPengajuan;

    Object.assign(Data, {
      async ringkasanKeuangan(tahun) {
        perlu('ketua', 'wakil_ketua', 'bendahara');
        const th = Number(tahun || db.org.tahun_anggaran);
        const batas = th < TH ? 12 : th > TH ? 0 : blnKini;
        const sum = (f) => db.kas.filter(f).reduce((s, k) => s + k.nominal, 0);
        const awal = sum((k) => tahunDari(k.tanggal) < th && k.jenis === 'masuk') - sum((k) => tahunDari(k.tanggal) < th && k.jenis === 'keluar');
        const masuk = sum((k) => tahunDari(k.tanggal) === th && k.jenis === 'masuk'), keluar = sum((k) => tahunDari(k.tanggal) === th && k.jenis === 'keluar');
        const perKat = {};
        db.kas.filter((k) => tahunDari(k.tanggal) === th).forEach((k) => { const key = k.jenis + '|' + k.kategori; perKat[key] = perKat[key] || { jenis: k.jenis, kategori: k.kategori, total: 0, jumlah: 0 }; perKat[key].total += k.nominal; perKat[key].jumlah++; });
        let menunggakOrang = 0, menunggakBulan = 0;
        db.anggota.filter((a) => a.status_aktif).forEach((a) => { let n = 0; for (let m = 1; m <= batas; m++) if (tgl(th, m, 28) >= a.tanggal_gabung && !db.iuran.some((i) => i.anggota_id === a.id && i.tahun === th && i.bulan === m && i.status === 'lunas')) n++; if (n) { menunggakOrang++; menunggakBulan += n; } });
        const iu = db.iuran.filter((i) => i.tahun === th);
        return tunda({ tahun: th, nominal_iuran: db.org.nominal_iuran, anggota_aktif: db.anggota.filter((a) => a.status_aktif).length, bulan_berjalan: batas,
          saldo_awal: awal, pemasukan: masuk, pengeluaran: keluar, saldo_akhir: awal + masuk - keluar,
          saldo_kini: sum((k) => k.jenis === 'masuk') - sum((k) => k.jenis === 'keluar'),
          per_bulan: Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1,
            masuk: sum((k) => tahunDari(k.tanggal) === th && Number(k.tanggal.slice(5, 7)) === i + 1 && k.jenis === 'masuk'),
            keluar: sum((k) => tahunDari(k.tanggal) === th && Number(k.tanggal.slice(5, 7)) === i + 1 && k.jenis === 'keluar'),
            lunas: iu.filter((x) => x.bulan === i + 1 && x.status === 'lunas').length, menunggu: iu.filter((x) => x.bulan === i + 1 && x.status === 'menunggu').length })),
          per_kategori: Object.values(perKat).sort((a, b) => a.jenis.localeCompare(b.jenis) || b.total - a.total),
          iuran: { lunas: iu.filter((x) => x.status === 'lunas').length, terkumpul: iu.filter((x) => x.status === 'lunas').reduce((s, x) => s + x.nominal, 0),
            menunggu: iu.filter((x) => x.status === 'menunggu').length, menunggak: menunggakOrang, bulan_tertunggak: menunggakBulan } }, 300);
      },
      async kasDaftar(tahun) { perlu('ketua', 'bendahara'); return tunda(db.kas.filter((k) => tahunDari(k.tanggal) === Number(tahun)).sort(urutKas), 300); },
      async simpanKas(row) {
        perlu('bendahara');
        if (!(Number(row.nominal) > 0)) throw new Error('Nominal harus lebih dari 0.');
        const d = { tanggal: row.tanggal, jenis: row.jenis, kategori: row.kategori || 'Lainnya', uraian: row.uraian, nominal: Number(row.nominal), bukti_url: row.bukti_url || null };
        if (row.id) {
          const k = db.kas.find((x) => x.id === row.id);
          if (k.ref_iuran_id) throw new Error('Transaksi ini berasal dari pembayaran iuran. Koreksi lewat menu Iuran Anggota (batalkan lunas).');
          Object.assign(k, d); return tunda(k);
        }
        const baru = Object.assign({}, d, { id: 'km' + Date.now(), no_bukti: noBukti(d.jenis, d.tanggal), ref_iuran_id: null, dibuat_pada: new Date().toISOString() });
        db.kas.push(baru); return tunda(baru, 350);
      },
      async hapusKas(id) {
        perlu('bendahara');
        const k = db.kas.find((x) => x.id === id);
        if (k && k.ref_iuran_id) throw new Error('Transaksi ini berasal dari pembayaran iuran. Koreksi lewat menu Iuran Anggota (batalkan lunas).');
        db.kas = db.kas.filter((x) => x.id !== id); return tunda(null);
      },
      async iuranRekap(tahun) {
        perlu('ketua', 'bendahara');
        return tunda({ anggota: db.anggota.filter((a) => a.status_aktif).sort((a, b) => a.nama.localeCompare(b.nama)).map((a) => ({ id: a.id, nama: a.nama, sekolah: a.sekolah, no_hp: a.no_hp, email: a.email, foto_url: a.foto_url, tanggal_gabung: a.tanggal_gabung })),
          iuran: db.iuran.filter((i) => i.tahun === Number(tahun)) }, 350);
      },
      async tandaiLunas(aid, tahun, bulan) {
        perlu('bendahara');
        const ada = db.iuran.find((i) => i.anggota_id === aid && i.tahun === tahun && i.bulan === bulan);
        if (ada && ada.status === 'lunas') throw new Error('Iuran bulan tersebut sudah lunas.');
        const row = Object.assign(ada || { id: 'i' + Date.now() + Math.random().toString(36).slice(2, 6), anggota_id: aid, tahun, bulan, nominal: db.org.nominal_iuran },
          { status: 'lunas', metode: 'tunai', tanggal_bayar: new Date().toISOString() });
        if (!ada) db.iuran.push(row);
        row.tanggal_bayar = hari(0) + 'T' + new Date().toISOString().slice(11);
        tambahKasIuran(row);
        return tunda({ ok: true, iuran: row }, 160);
      },
      async batalkanLunas(id) {
        perlu('bendahara');
        if (!db.iuran.some((i) => i.id === id)) throw new Error('Data iuran tidak ditemukan.');
        db.kas = db.kas.filter((k) => k.ref_iuran_id !== id); db.iuran = db.iuran.filter((i) => i.id !== id);
        return tunda({ ok: true }, 160);
      },
      async iuranSaya(tahun) { return tunda(db.iuran.filter((i) => i.anggota_id === Auth.profil.anggota_id && i.tahun === Number(tahun))); },
      async ajukanBuktiIuran(tahun, bulan, bukti_url) {
        const aid = Auth.profil.anggota_id;
        if (!aid) throw new Error('Akun Anda belum ditautkan ke data anggota.');
        const bl = [...new Set(bulan)].sort((a, b) => a - b);
        if (!bl.length) throw new Error('Pilih minimal satu bulan.');
        if (!bukti_url) throw new Error('Unggah bukti transfer terlebih dahulu.');
        bl.forEach((m) => { const x = db.iuran.find((i) => i.anggota_id === aid && i.tahun === tahun && i.bulan === m); if (x && x.status !== 'ditolak') throw new Error(`Iuran ${NM[m - 1]} ${tahun} sudah lunas atau sedang diverifikasi.`); });
        const catatan = arguments[3] || null;
        const ids = bl.map((m) => { db.iuran = db.iuran.filter((i) => !(i.anggota_id === aid && i.tahun === tahun && i.bulan === m));
          const id = 'w' + Date.now() + m; db.iuran.push({ id, anggota_id: aid, tahun, bulan: m, nominal: db.org.nominal_iuran, status: 'menunggu', metode: 'transfer', bukti_url, catatan, tanggal_bayar: null }); return id; });
        const kode = 'REQ-' + TH + '-' + String(100 + db.pengajuan.length).padStart(4, '0');
        db.pengajuan.unshift({ id: 'q' + Date.now(), kode, jenis: 'bukti_bayar', pengaju_id: Auth.profil.id, status: 'menunggu', dibuat_pada: new Date().toISOString(), ref_id: ids[0],
          ringkasan: `Iuran ${bl.map((m) => NM[m - 1]).join(', ')} ${tahun} (transfer)`, data_usulan: { tahun, bulan: bl, nominal: bl.length * db.org.nominal_iuran, iuran_ids: ids, alasan: catatan || undefined }, lampiran_url: bukti_url });
        return tunda({ ok: true, kode, jumlah_bulan: bl.length }, 500);
      },
      async tunggakan() { perlu('ketua', 'bendahara'); return tunda(tunggakanDemo(), 300); },
      async kirimPengingat(ids) {
        perlu('bendahara');
        const rows = tunggakanDemo().filter((r) => ids.includes(r.anggota_id) && r.email);
        if (!rows.length) throw new Error('Anggota terpilih tidak memiliki email atau tidak menunggak.');
        db.antrean.menunggu += rows.length;
        return tunda({ success: true, message: `${rows.length} email masuk antrean (mode demo, tidak benar-benar dikirim). Sisa kuota hari ini: ${100 - db.antrean.terkirim % 100}.`, data: { diantre: rows.length } }, 600);
      },
      async statusAntrean() { perlu('bendahara', 'ketua', 'admin_it'); return tunda(Object.assign({ kuota_tersisa: 63 }, db.antrean)); },
      async prosesAntreanKini() { perlu('bendahara', 'admin_it'); db.antrean.terkirim += db.antrean.menunggu; const n = db.antrean.menunggu; db.antrean.menunggu = 0; return tunda({ terkirim: n }, 700); },
      async putuskanPengajuan(id, setuju, catatan) {
        const x = db.pengajuan.find((q) => q.id === id);
        const r = await putuskanAsli(id, setuju, catatan);
        if (x && x.jenis === 'bukti_bayar') {
          ((x.data_usulan || {}).iuran_ids || [x.ref_id]).forEach((iid) => {
            const i = db.iuran.find((y) => y.id === iid);
            if (!i || i.status !== 'menunggu') return;
            Object.assign(i, { status: setuju ? 'lunas' : 'ditolak', catatan, tanggal_bayar: setuju ? new Date().toISOString() : null });
            if (setuju) tambahKasIuran(i);
          });
        }
        return r;
      }
    });
  })();


  function dashDemo(role) {
    const per12 = (f) => Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, ...f(i) }));
    const bulanIni = new Date().getMonth() + 1;
    const out = { role, tahun: th, pengajuan_menunggu: {} };
    if (role !== 'anggota') out.anggota = { aktif: 86, nonaktif: 6, baru_bulan_ini: 4, negeri: 72, swasta: 14 };
    if (['ketua', 'wakil_ketua', 'sekretaris'].includes(role)) {
      out.per_sekolah = [['SD Negeri Slerok 1', 9], ['SD Negeri Kejambon 2', 8], ['SD Negeri Panggung 1', 8], ['SD Negeri Mintaragen 1', 7], ['SD Negeri Mangkukusuman 1', 6], ['SD Al-Irsyad Tegal', 5], ['SD Negeri Slerok 2', 5], ['SD Ihsaniyah 1 Tegal', 4]].map(([label, jumlah]) => ({ label, jumlah }));
      out.pertumbuhan = per12((i) => ({ jumlah: 64 + Math.round(i * 1.9 + (i > 7 ? 2 : 0)) }));
      out.kegiatan = ['Workshop Kurikulum', 'Bimtek Wasit', 'Rakor O2SN', 'Pelatihan Senam', 'Seminar Gizi', 'Lokakarya Modul'].map((judul, i) => ({ judul, tanggal: `${th}-${String(i * 2 + 1).padStart(2, '0')}-10`, peserta: 50 + (i % 3) * 8, hadir: 40 + (i % 4) * 4 }));
    }
    if (['ketua', 'bendahara'].includes(role)) {
      const masuk = [1.72, 1.9, 1.64, 1.8, 2.1, 1.95, 1.7, 2.2, 1.85, 2.4, 1.6, 0].map((v) => Math.round(v * 1e6));
      const keluar = [0.6, 1.25, 0.4, 0.9, 1.6, 0.75, 0.5, 1.9, 0.8, 0.95, 0.55, 0].map((v) => Math.round(v * 1e6));
      out.keuangan = {
        saldo: 14850000, masuk_bulan_ini: masuk[bulanIni - 1] || 2400000, keluar_bulan_ini: keluar[bulanIni - 1] || 950000,
        kas_bulanan: per12((i) => ({ masuk: i < bulanIni ? masuk[i] : 0, keluar: i < bulanIni ? keluar[i] : 0 })),
        iuran_persen: per12((i) => ({ persen: i < bulanIni ? [92, 95, 88, 90, 97, 93, 79.1, 96.5, 93, 88.4, 76, 0][i] : 0 })),
        lunas_bulan_ini: 76, menunggak: 10, total_tunggakan: 1450000, bukti_menunggu: 5
      };
      if (db.tunggakanDemo) { const tg = db.tunggakanDemo(); out.keuangan.menunggak = tg.length; out.keuangan.total_tunggakan = tg.reduce((x, r) => x + r.total_tunggakan, 0);
        out.keuangan.bukti_menunggu = db.iuran.filter((i) => i.status === 'menunggu').length; }
      out.pengajuan_menunggu.bukti_bayar = 5;
    }
    if (role === 'wakil_ketua') out.keuangan_ringkas = { saldo: 14850000, iuran_persen_bulan_ini: 88.4 };
    if (role === 'anggota') {
      out.iuran_saya = { lunas: Array.from({ length: Math.max(bulanIni - 1, 0) }, (_, i) => i + 1), menunggu: [bulanIni], nominal: 20000 };
      out.kehadiran_saya = { terdaftar: 9, hadir: 8 };
      out.pengajuan_menunggu = { perubahan_data: 1 };
    }
    if (['ketua', 'wakil_ketua', 'sekretaris', 'bendahara'].includes(role)) {
      out.program = [['Modul Ajar PJOK Terpadu', 85, 'berjalan'], ['Seleksi Kontingen O2SN', 60, 'berjalan'], ['Digitalisasi Bank Soal PJOK', 40, 'berjalan'], ['Rakor Kerja Awal Tahun', 100, 'selesai'], ['Family Gathering & Senam Akbar', 25, 'berjalan']].map(([judul, progres, status]) => ({ judul, progres, status }));
    }
    if (['ketua', 'wakil_ketua', 'sekretaris', 'anggota'].includes(role)) {
      out.medali = db.medali;
      out.top_sekolah = db.topSekolah.map(([sekolah, poin]) => ({ sekolah, poin, medali: Math.round(poin / 4) }));
    }
    if (role === 'ketua') out.pengajuan_menunggu = { pendaftaran_anggota: 2, perubahan_data: 1, peserta_lomba: 3, prestasi: 1, usulan_kegiatan: 1 };
    if (role === 'sekretaris') out.pengajuan_menunggu = { pendaftaran_anggota: 2, perubahan_data: 1, peserta_lomba: 3, prestasi: 1 };
    if (role === 'wakil_ketua') out.pengajuan_menunggu = { usulan_kegiatan: 1 };
    if (role === 'admin_it') out.pengajuan_menunggu = { aktivasi_akun: 2 };
    if (['ketua', 'wakil_ketua', 'sekretaris', 'admin_it'].includes(role)) {
      out.aktivitas = [
        ['Dedi Kurniawan, M.Pd', 'UPDATE', 'iuran', 0.2], ['Siti Rahmawati, S.Pd', 'INSERT', 'surat_masuk', 1], ['Budi Santoso, S.Pd.Jas', 'APPROVE', 'pengajuan', 3],
        ['Hendra Setiawan, S.Pd', 'INSERT', 'kegiatan', 20], ['Fajar Prasetyo', 'UPDATE', 'pengaturan_organisasi', 26], ['Siti Rahmawati, S.Pd', 'INSERT', 'berita', 48]
      ].map(([nama_aktor, aksi, tabel, jam]) => ({ nama_aktor, aksi, tabel, waktu: new Date(Date.now() - jam * 36e5).toISOString() }));
    }
    // hitung ulang pengajuan menunggu dari data demo (ikut berubah setelah keputusan)
    const pm = {};
    db.pengajuan.filter((x) => x.status === 'menunggu' && (role === 'anggota' ? x.pengaju_id === (Auth.profil || {}).id : (PEMUTUS[x.jenis] || []).includes(role)))
      .forEach((x) => { pm[x.jenis] = (pm[x.jenis] || 0) + 1; });
    if (['ketua', 'sekretaris'].includes(role)) pm.pendaftaran_anggota = db.pendaftaran.filter((x) => x.status === 'menunggu').length;
    if (role === 'admin_it') pm.aktivasi_akun = db.pendaftaran.filter((x) => x.status === 'disetujui').length;
    out.pengajuan_menunggu = pm;
    return out;
  }
})();
