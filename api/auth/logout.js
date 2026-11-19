const ACCESS_COOKIE = '__Host-gl_at';
const REFRESH_COOKIE = '__Host-gl_rt';

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator >= 0 && part.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return ''; }
    }
  }
  return '';
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return !!origin && !!host && origin === `${proto}://${host}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  if (!sameOrigin(req)) {
    res.status(403).end();
    return;
  }

  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY || '';
  const accessToken = getCookie(req, ACCESS_COOKIE);
  if (baseUrl && apiKey && accessToken) {
    try {
      await fetch(`${baseUrl}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
    } catch {}
  }

  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`,
    `${REFRESH_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`,
  ]);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).end(JSON.stringify({ ok: true }));
};
