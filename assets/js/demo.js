/* =====================================================================
   MODE DEMO — aktif otomatis bila SUPABASE_URL di config.js kosong.
   Mengganti Auth & Data dengan data contoh di memori browser, sehingga
   seluruh tampilan bisa dicoba tanpa Supabase/GAS. Tidak ada data yang
   dikirim ke server mana pun.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.KKG || !window.KKG.DEMO) return;
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
    return out;
  }
})();
