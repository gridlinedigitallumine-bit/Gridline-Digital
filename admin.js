(() => {
  'use strict';
  const ID = { meta: /^\d{10,20}$/, tiktok: /^[A-Z0-9]{10,30}$/, google: /^(G|AW|GT)-[A-Z0-9]{4,20}$/, label: /^[A-Za-z0-9_-]{6,40}$/ };
  const KEYS = ['meta', 'tiktok', 'google'];
  const defaults = () => ({ version: 1, consentRequired: true, meta: { enabled: false, id: '' }, tiktok: { enabled: false, id: '' }, google: { enabled: false, id: '', conversionLabel: '' } });
  const str = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, '').slice(0, n) : '');
  const sanitize = raw => {
    const d = defaults(); if (!raw || typeof raw !== 'object') return d;
    d.consentRequired = raw.consentRequired !== false;
    KEYS.forEach(k => { const r = raw[k] || {}; d[k].enabled = r.enabled === true; d[k].id = str(r.id, 40).toUpperCase(); });
    d.google.conversionLabel = str((raw.google || {}).conversionLabel, 40);
    return d;
  };
  const STORE = 'gl_admin_draft';
  let cfg; try { cfg = sanitize(JSON.parse(localStorage.getItem(STORE))); } catch (e) { cfg = defaults(); }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (e) {} };
  const valid = k => ID[k].test(cfg[k].id);
  const live = () => {
    const o = JSON.parse(JSON.stringify(cfg));
    KEYS.forEach(k => { o[k].enabled = cfg[k].enabled && valid(k); });
    if (!/^AW-/.test(o.google.id) || !ID.label.test(o.google.conversionLabel)) o.google.conversionLabel = '';
    return o;
  };
  const $ = id => document.getElementById(id);
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'class') e.className = v; else e.setAttribute(k, v); });
    kids.flat().forEach(c => e.append(c)); return e;
  };

  const PLAT = [
    { k: 'meta', name: 'Meta (Facebook and Instagram)', field: 'Pixel ID', ph: '1234567890123456', hint: 'In Meta Events Manager, open your data source and copy the Pixel ID. It is 15 to 16 digits.' },
    { k: 'tiktok', name: 'TikTok', field: 'Pixel ID', ph: 'C1ABCDEF2GHIJKLMNO', hint: 'In TikTok Events Manager, open Web events and copy the Pixel ID.' },
    { k: 'google', name: 'Google (Ads and Analytics)', field: 'Tag ID', ph: 'AW-123456789 or G-ABCD123456', hint: 'Use the Google Ads tag (starts with AW-) or the Google Analytics ID (starts with G-).' }
  ];
  const chips = {}, errs = {}, inputs = {}, toggles = {};
  PLAT.forEach(p => {
    chips[p.k] = h('span', { class: 'chip' }, 'Not connected');
    errs[p.k] = h('p', { class: 'hint', role: 'status' });
    toggles[p.k] = h('input', { type: 'checkbox', id: p.k + 'On' });
    inputs[p.k] = h('input', { type: 'text', id: p.k + 'Id', placeholder: p.ph, autocomplete: 'off', spellcheck: 'false', maxlength: '40' });
    const kids = [
      h('div', { class: 'head' }, h('h2', {}, p.name), chips[p.k]),
      h('label', { class: 'check', for: p.k + 'On' }, toggles[p.k], 'Active on the website'),
      h('label', { for: p.k + 'Id' }, p.field), inputs[p.k], h('p', { class: 'hint' }, p.hint), errs[p.k]
    ];
    if (p.k === 'google') {
      inputs.label = h('input', { type: 'text', id: 'glabel', placeholder: 'AbC-D_efG-h12345 (optional)', autocomplete: 'off', spellcheck: 'false', maxlength: '40' });
      kids.push(h('label', { for: 'glabel' }, 'Conversion label'), inputs.label, h('p', { class: 'hint' }, 'Optional. Counts each enquiry as a Google Ads conversion. Needs an AW- tag.'));
    }
    $('cards').append(h('article', { class: 'card' }, kids));
    toggles[p.k].addEventListener('change', () => { cfg[p.k].enabled = toggles[p.k].checked; refresh(); });
    inputs[p.k].addEventListener('input', () => { cfg[p.k].id = str(inputs[p.k].value, 40).toUpperCase(); refresh(); });
  });
  inputs.label.addEventListener('input', () => { cfg.google.conversionLabel = str(inputs.label.value, 40); refresh(); });
  $('consent').addEventListener('change', () => { cfg.consentRequired = $('consent').checked; refresh(); });

  const sync = () => {
    KEYS.forEach(k => { toggles[k].checked = cfg[k].enabled; inputs[k].value = cfg[k].id; });
    inputs.label.value = cfg.google.conversionLabel; $('consent').checked = cfg.consentRequired;
  };
  const refresh = () => {
    let n = 0;
    KEYS.forEach(k => {
      const on = cfg[k].enabled, good = valid(k);
      let text = 'Not connected', cls = 'chip', msg = '';
      if (on && good) { text = 'Ready to publish'; cls = 'chip ready'; n++; }
      else if (on) { text = 'Check the ID'; cls = 'chip warn'; msg = 'This ID does not match the expected format, so it will not be published.'; }
      chips[k].textContent = text; chips[k].className = cls; errs[k].textContent = msg;
    });
    $('sConn').textContent = n + ' of 3'; $('sConsent').textContent = cfg.consentRequired ? 'On' : 'Off';
    $('out').textContent = 'window.GL_TRACKING = ' + JSON.stringify(live(), null, 2) + ';\n';
    save();
  };

  const note = t => { $('msg').textContent = t; };
  $('dl').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([$('out').textContent], { type: 'text/javascript' }));
    const a = h('a', { href: url, download: 'tracking-config.js' }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); note('Downloaded. Upload it to your site and deploy.');
  });
  $('cp').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('out').textContent); note('Copied.'); } catch (e) { note('Copy failed. Select the code and copy it manually.'); }
  });
  $('imp').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f || f.size > 20000) { note('Choose your tracking-config.js file (under 20 KB).'); return; }
    const r = new FileReader();
    r.onload = () => {
      try { const m = String(r.result).match(/GL_TRACKING\s*=\s*(\{[\s\S]*\})\s*;?\s*$/); cfg = sanitize(JSON.parse(m ? m[1] : r.result)); sync(); refresh(); note('Imported.'); }
      catch (err) { note('That file could not be read.'); }
    };
    r.readAsText(f); e.target.value = '';
  });

  const SEC = [
    ['Hide API keys', 'done', 'No keys in the site. Pixel IDs are public by design.'],
    ['Check env variables', 'na', 'No backend yet.'],
    ['Protect admin routes', 'host', 'Netlify role rules are in _redirects. Enable Netlify Identity, invite the admin, and assign the admin role before deploying.'],
    ['Add proper authentication', 'host', 'Netlify Identity login is wired in. The site must have Identity enabled and an invited admin role assigned before deployment.'],
    ['Check user access', 'na', 'No user accounts yet.'],
    ['Sanitize forms', 'done', 'Enquiry form validates, cleans and limits every field.'],
    ['Protect against XSS', 'done', 'Strict content security policy; no unsafe HTML in the site or this dashboard.'],
    ['Add rate limiting', 'host', 'Browser limit is in place. Add real limits at your host or Cloudflare.'],
    ['Secure API endpoints', 'na', 'No API yet.'],
    ['Check CORS settings', 'na', 'No API; outside connections are limited to ad platforms.'],
    ['Add security headers', 'done', 'Included in _headers.'],
    ['Turn off debug mode', 'done', 'No debug code.'],
    ['Update dependencies', 'done', 'No packages. Only the ad scripts you switch on are loaded.'],
    ['Remove unused packages', 'done', 'None installed.'],
    ['Check for exposed files', 'host', 'Upload only the files listed with this build.'],
    ['Secure your database', 'na', 'No database yet.'],
    ['Hash passwords properly', 'na', 'No passwords stored.'],
    ['Check git for leaked secrets', 'done', 'No secrets in these files. Keep it that way.'],
    ['Run a full security audit', 'host', 'Code reviewed. After deploying, scan the live site with securityheaders.com.'],
    ['Make no mistakes', 'host', 'Turn on two-factor login for hosting, domain and ad accounts.']
  ];
  const L = { done: 'Done in code', host: 'You do on hosting', na: 'Not needed yet' };
  SEC.forEach((r, i) => $('secRows').append(h('tr', {}, h('td', {}, (i + 1) + '. ' + r[0]), h('td', {}, h('span', { class: 'chip ' + r[1] }, L[r[1]])), h('td', {}, r[2]))));

  const VIEWS = ['overview', 'pixels', 'events', 'security'];
  const show = () => {
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
    VIEWS.forEach(n => { $(n).hidden = n !== v; });
    document.querySelectorAll('nav a').forEach(a => { if (a.getAttribute('href') === '#' + v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  };
  window.addEventListener('hashchange', show); show(); sync(); refresh();
})();
