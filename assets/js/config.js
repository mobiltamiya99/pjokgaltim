/**
 * KONFIGURASI APLIKASI — isi 3 nilai ini setelah setup Supabase & GAS.
 * Jika SUPABASE_URL masih kosong, aplikasi berjalan dalam MODE DEMO
 * (data contoh di browser, tanpa login Google) agar tampilan bisa dicoba.
 *
 * Anon key AMAN diletakkan di sini (dilindungi RLS). JANGAN pernah
 * menaruh service_role key di frontend.
 */
window.APP_CONFIG = {
  SUPABASE_URL: '',              // 'https://sbfyhbxzpmpuhirckwsw.supabase.co'
  SUPABASE_ANON_KEY: '',         // 'sb_publishable_2hA7KocBkSeuUybM7igo2Q_At-evQe-'
  GAS_URL: '',                   // 'https://script.google.com/macros/s/AKfycbzDIiFimEp5kiX3Sy9tBDqPFZhBXgB3Nk3p1fCr95dhjuDnp8dHMzgi4TI5OBTFxXNOYw/exec'

  APP_NAME: 'KKG PJOK Tegal Timur',
  SESSION_IDLE_MINUTES: 30       // logout otomatis bila tidak aktif (PRD §5.10)
};
