/**
 * KONFIGURASI APLIKASI KKG PJOK TEGAL TIMUR (produksi)
 *
 * Publishable key AMAN diletakkan di sini (data dilindungi RLS Supabase).
 * JANGAN pernah menaruh Secret key (sb_secret_…) / service_role di file ini —
 * kunci itu hanya boleh ada di Script Properties Google Apps Script.
 *
 * Tampilan contoh tanpa database tersedia di demo.html.
 */
window.APP_CONFIG = {
  SUPABASE_URL: 'https://sbfyhbxzpmpuhirckwsw.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_2hA7KocBkSeuUybM7igo2Q_At-evQe-',
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzDIiFimEp5kiX3Sy9tBDqPFZhBXgB3Nk3p1fCr95dhjuDnp8dHMzgi4TI5OBTFxXNOYw/exec',

  APP_NAME: 'KKG PJOK Tegal Timur',
  SESSION_IDLE_MINUTES: 30       // logout otomatis bila tidak aktif (PRD §5.10)
};
