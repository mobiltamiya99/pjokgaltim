/* =====================================================================
   CORE — utilitas, UI (toast, modal, konfirmasi), tema, router SPA
   ===================================================================== */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Escape HTML untuk semua data dinamis (cegah XSS)
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const fmt = {
    rp: (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID'),
    rpSingkat: (n) => {
      n = Number(n || 0);
      if (Math.abs(n) >= 1e9) return 'Rp ' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M';
      if (Math.abs(n) >= 1e6) return 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jt';
      if (Math.abs(n) >= 1e3) return 'Rp ' + (n / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' rb';
      return 'Rp ' + n;
    },
    num: (n) => Number(n || 0).toLocaleString('id-ID'),
    tgl: (d) => { if (!d) return '-'; const x = new Date(d); return x.getDate() + ' ' + BULAN[x.getMonth()] + ' ' + x.getFullYear(); },
    tglPendek: (d) => { if (!d) return '-'; const x = new Date(d); return x.getDate() + ' ' + BLN[x.getMonth()] + ' ' + x.getFullYear(); },
    jam: (t) => (t ? String(t).slice(0, 5) : ''),
    relatif: (d) => {
      const s = (Date.now() - new Date(d).getTime()) / 1000;
      if (s < 60) return 'baru saja';
      if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
      if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
      if (s < 86400 * 7) return Math.floor(s / 86400) + ' hari lalu';
      return fmt.tglPendek(d);
    },
    inisial: (nama) => String(nama || '?').replace(/,.*$/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  };

  const ROLE_LABEL = {
    admin_it: 'Admin IT', ketua: 'Ketua KKG', wakil_ketua: 'Wakil Ketua',
    sekretaris: 'Sekretaris', bendahara: 'Bendahara', anggota: 'Anggota'
  };
  const PERINGKAT = {
    juara_1: { label: 'Juara 1', cls: 'b-gold', icon: 'bi-trophy-fill' },
    juara_2: { label: 'Juara 2', cls: 'b-silver', icon: 'bi-award-fill' },
    juara_3: { label: 'Juara 3', cls: 'b-bronze', icon: 'bi-award-fill' },
    harapan_1: { label: 'Harapan 1', cls: 'b-teal', icon: 'bi-star-fill' },
    harapan_2: { label: 'Harapan 2', cls: 'b-teal', icon: 'bi-star-fill' },
    harapan_3: { label: 'Harapan 3', cls: 'b-teal', icon: 'bi-star-fill' }
  };

  function avatar(nama, url, cls = '') {
    return url
      ? `<span class="avatar ${cls}"><img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`
      : `<span class="avatar ${cls}" aria-hidden="true">${esc(fmt.inisial(nama))}</span>`;
  }

  // ---------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------
  function toast(pesan, tipe = 'info', durasi = 3800) {
    let box = $('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const ikon = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[tipe] || 'bi-info-circle-fill';
    const el = document.createElement('div');
    el.className = `toast ${tipe}`;
    el.setAttribute('role', tipe === 'error' ? 'alert' : 'status');
    el.innerHTML = `<i class="bi ${ikon}"></i><div>${esc(pesan)}</div>`;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, durasi);
  }

  // ---------------------------------------------------------------
  // Modal & konfirmasi
  // ---------------------------------------------------------------
  function modal({ judul, isi, foot = '', wide = false, onOpen }) {
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(judul)}">
        <div class="modal-head"><h3>${esc(judul)}</h3>
          <button class="btn btn-ghost btn-icon" data-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div>
        <div class="modal-body">${isi}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>`;
    const prevFocus = document.activeElement;
    const close = () => { bd.remove(); document.removeEventListener('keydown', onKey); prevFocus && prevFocus.focus && prevFocus.focus(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    bd.addEventListener('click', (e) => { if (e.target === bd || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bd);
    const first = bd.querySelector('input, select, textarea, button:not([data-close])');
    first && first.focus();
    onOpen && onOpen(bd, close);
    return { el: bd, close };
  }

  function konfirmasi({ judul = 'Konfirmasi', pesan, ok = 'Ya, lanjutkan', bahaya = false, catatan = false, minCatatan = 0 }) {
    return new Promise((resolve) => {
      const m = modal({
        judul,
        isi: `<div style="display:flex;gap:16px;align-items:flex-start">
                <span class="icon-tile ${bahaya ? 'red' : 'amber'}"><i class="bi ${bahaya ? 'bi-exclamation-octagon' : 'bi-question-circle'}"></i></span>
                <div style="flex:1"><p>${pesan}</p>
                ${catatan ? `<div class="field" style="margin:16px 0 0"><label for="cf-note">Catatan ${minCatatan ? '<span class="req">*</span>' : ''}</label>
                  <textarea id="cf-note" class="textarea" style="min-height:90px" placeholder="Tuliskan alasan / catatan…"></textarea>
                  <div class="err"><i class="bi bi-exclamation-circle"></i>Minimal ${minCatatan} karakter.</div></div>` : ''}
                </div></div>`,
        foot: `<button class="btn btn-ghost" data-close>Batal</button>
               <button class="btn ${bahaya ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button>`,
        onOpen: (el, close) => {
          el.querySelector('[data-ok]').addEventListener('click', () => {
            const note = catatan ? el.querySelector('#cf-note').value.trim() : '';
            if (catatan && note.length < minCatatan) { el.querySelector('.field').classList.add('invalid'); return; }
            close(); resolve({ ok: true, catatan: note });
          });
          el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) resolve({ ok: false }); });
        }
      });
      return m;
    });
  }

  // ---------------------------------------------------------------
  // Tema (light/dark, ikut preferensi perangkat secara default)
  // ---------------------------------------------------------------
  const Theme = {
    get() {
      try { const t = localStorage.getItem('kkg_theme'); if (t) return t; } catch (e) { /* abaikan */ }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    apply(t) {
      document.documentElement.setAttribute('data-theme', t);
      $$('[data-theme-icon]').forEach((i) => { i.className = 'bi ' + (t === 'dark' ? 'bi-sun' : 'bi-moon-stars'); });
      document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
    },
    toggle() {
      const t = Theme.get() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('kkg_theme', t); } catch (e) { /* abaikan */ }
      Theme.apply(t);
    }
  };

  // ---------------------------------------------------------------
  // Router hash (#/...) — navigasi instan tanpa reload (SPA)
  // ---------------------------------------------------------------
  const Router = {
    routes: [],
    add(pattern, handler) { Router.routes.push({ pattern, handler }); },
    path() { return (location.hash.replace(/^#/, '') || '/').split(/[?#]/)[0] || '/'; },
    query() { const q = location.hash.split('?')[1] || ''; return Object.fromEntries(new URLSearchParams(q)); },
    go(path) { if (location.hash !== '#' + path) location.hash = path; else Router.resolve(); },
    async resolve() {
      const p = Router.path();
      for (const r of Router.routes) {
        const m = typeof r.pattern === 'string' ? (p === r.pattern ? [] : null) : p.match(r.pattern);
        if (m) { await r.handler(m.slice ? m.slice(1) : [], Router.query()); return; }
      }
      Router.go('/');
    },
    start() { window.addEventListener('hashchange', Router.resolve); return Router.resolve(); }
  };

  // ---------------------------------------------------------------
  // Validasi form ringan
  // ---------------------------------------------------------------
  function validasi(form, aturan) {
    let ok = true;
    Object.entries(aturan).forEach(([nama, cek]) => {
      const inp = form.elements[nama];
      if (!inp) return;
      const f = inp.closest('.field');
      const pesan = cek(inp.type === 'checkbox' ? inp.checked : (inp.type === 'file' ? inp.files : inp.value.trim()));
      if (f) {
        f.classList.toggle('invalid', !!pesan);
        const e = f.querySelector('.err');
        if (e && pesan) e.innerHTML = `<i class="bi bi-exclamation-circle"></i>${esc(pesan)}`;
      }
      if (pesan) { if (ok) inp.focus(); ok = false; }
    });
    return ok;
  }

  // Kompres gambar di browser sebelum diunggah (PRD §5.8, §6)
  function kompresGambar(file, maxSisi = 1280, kualitas = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error('Berkas bukan gambar.'));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const skala = Math.min(1, maxSisi / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * skala); c.height = Math.round(img.height * skala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const dataUrl = c.toDataURL('image/jpeg', kualitas);
        resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg', nama: file.name.replace(/\.[^.]+$/, '') + '.jpg', dataUrl,
                  ukuran: Math.round(dataUrl.length * 0.75) });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat dibaca.')); };
      img.src = url;
    });
  }

  function debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  function skeletonCards(n = 3, h = 120) {
    return Array.from({ length: n }, () => `<div class="card"><div class="skel skel-line" style="width:40%"></div><div class="skel" style="height:${h}px;margin-top:12px"></div></div>`).join('');
  }

  function emptyState(judul, pesan, ikon = 'bi-inbox', cta = '') {
    return `<div class="empty"><div class="ill"><i class="bi ${ikon}"></i></div><h4>${esc(judul)}</h4><p>${esc(pesan)}</p>${cta ? `<div style="margin-top:16px">${cta}</div>` : ''}</div>`;
  }

  window.K = { $, $$, esc, fmt, BULAN, BLN, ROLE_LABEL, PERINGKAT, avatar, toast, modal, konfirmasi, Theme, Router, validasi, kompresGambar, debounce, skeletonCards, emptyState };
})();
