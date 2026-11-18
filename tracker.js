(() => {
  'use strict';
  const C = window.GL_TRACKING || {};
  const ID = { meta: /^\d{10,20}$/, tiktok: /^[A-Z0-9]{10,30}$/, google: /^(G|AW|GT)-[A-Z0-9]{4,20}$/, label: /^[A-Za-z0-9_-]{6,40}$/ };
  const ok = k => !!(C[k] && C[k].enabled === true && ID[k].test(String(C[k].id || '')));
  const use = { meta: ok('meta'), tiktok: ok('tiktok'), google: ok('google') };
  if (!use.meta && !use.tiktok && !use.google) return;

  const KEY = 'gl_consent';
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const set = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const load = src => { const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); };
  let started = false;

  const startMeta = id => {
    if (window.fbq) return;
    const n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    load('https://connect.facebook.net/en_US/fbevents.js');
    n('init', id); n('track', 'PageView');
  };
  const startTikTok = id => {
    (function (w, d, t) {
      w.TiktokAnalyticsObject = t; const q = w[t] = w[t] || [];
      q.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      q.setAndDefer = (o, m) => { o[m] = function () { o.push([m].concat(Array.prototype.slice.call(arguments, 0))); }; };
      q.methods.forEach(m => q.setAndDefer(q, m));
      q.instance = n => { const e = q._i[n] || []; q.methods.forEach(m => q.setAndDefer(e, m)); return e; };
      q.load = (e, o) => {
        const r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        q._i = q._i || {}; q._i[e] = []; q._i[e]._u = r; q._t = q._t || {}; q._t[e] = +new Date; q._o = q._o || {}; q._o[e] = o || {};
        load(r + '?sdkid=' + encodeURIComponent(e) + '&lib=' + t);
      };
      q.load(id); q.page();
    })(window, document, 'ttq');
  };
  const startGoogle = id => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', id);
    load('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id));
  };
  const start = () => {
    if (started) return; started = true;
    if (use.meta) startMeta(C.meta.id);
    if (use.tiktok) startTikTok(C.tiktok.id);
    if (use.google) startGoogle(C.google.id);
  };

  // Events: 'lead' = enquiry sent, 'contact' = WhatsApp link clicked.
  const send = evt => {
    if (!started) return;
    if (use.meta && window.fbq) fbq('track', { lead: 'Lead', contact: 'Contact' }[evt]);
    if (use.tiktok && window.ttq) ttq.track({ lead: 'SubmitForm', contact: 'Contact' }[evt]);
    if (use.google && window.gtag) {
      gtag('event', { lead: 'generate_lead', contact: 'contact' }[evt]);
      const l = C.google.conversionLabel;
      if (evt === 'lead' && /^AW-/.test(C.google.id) && ID.label.test(l || '')) gtag('event', 'conversion', { send_to: C.google.id + '/' + l });
    }
  };
  document.addEventListener('gl:lead', () => send('lead'));
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="https://wa.me/"]'); if (a) send('contact'); });

  // Consent banner.
  const names = [use.meta && 'Meta', use.tiktok && 'TikTok', use.google && 'Google'].filter(Boolean).join(', ');
  const banner = () => {
    if (document.getElementById('glConsent')) return;
    if (!document.getElementById('glConsentCss')) {
      const st = document.createElement('style'); st.id = 'glConsentCss';
      st.textContent = '.glc{position:fixed;left:16px;bottom:16px;right:16px;max-width:560px;z-index:60;background:#082032;color:#fff;padding:18px 20px;border-radius:4px;box-shadow:0 20px 60px #0004;font:500 12px/1.6 Montserrat,Arial,sans-serif}.glc p{margin:0 0 14px}.glc div{display:flex;gap:10px;flex-wrap:wrap}.glc button{font:inherit;font-weight:700;padding:11px 16px;border-radius:4px;cursor:pointer;border:1px solid #BCC3C9;background:transparent;color:#fff}.glc button.y{background:#FE4C29;border-color:#FE4C29}.glc button:focus-visible{outline:3px solid #fff;outline-offset:2px}';
      document.head.appendChild(st);
    }
    const box = document.createElement('div'); box.id = 'glConsent'; box.className = 'glc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Cookie choices');
    const p = document.createElement('p'); p.textContent = 'We use cookies from ' + names + ' to measure how our ads perform. Choose whether to allow them.';
    const row = document.createElement('div');
    const yes = document.createElement('button'); yes.className = 'y'; yes.type = 'button'; yes.textContent = 'Allow cookies';
    const no = document.createElement('button'); no.type = 'button'; no.textContent = 'Decline';
    yes.addEventListener('click', () => { set('granted'); box.remove(); start(); });
    no.addEventListener('click', () => { const was = started; set('denied'); box.remove(); if (was) location.reload(); });
    row.append(yes, no); box.append(p, row); document.body.appendChild(box); yes.focus({ preventScroll: true });
  };

  const choice = C.consentRequired === false ? 'granted' : (navigator.globalPrivacyControl === true ? 'denied' : get());
  if (choice === 'granted') start(); else if (!choice) banner();

  if (C.consentRequired !== false) {
    const fb = document.querySelector('.footer-bottom');
    if (fb) { const a = document.createElement('a'); a.href = '#'; a.textContent = 'Cookie settings'; a.style.textDecoration = 'underline'; a.addEventListener('click', e => { e.preventDefault(); banner(); }); fb.appendChild(a); }
  }
})();
