function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return !!origin && !!host && origin === `${proto}://${host}`;
}

function isAllowedEmail(email) {
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(/[;,]/)
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  allowed.push('gridlinedigitallumine@gmail.com');
  return allowed.includes(email.toLowerCase());
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return json(res, 403, { error: 'Request not allowed.' });

  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY || '';
  if (!baseUrl || !apiKey) return json(res, 503, { error: 'Password recovery is not configured yet.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { error: 'Enter the email address for your administrator account.' });
  }
  if (!isAllowedEmail(email)) {
    return json(res, 200, { ok: true, message: 'If that administrator account exists, a recovery email will be sent.' });
  }

  try {
    const site = `${(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()}://${(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()}`;
    const redirectTo = new URL('/login.html?recovery=1', site).toString();
    const result = await fetch(`${baseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    if (!result.ok && result.status >= 500) return json(res, 503, { error: 'Password recovery is temporarily unavailable.' });
    // Always use the same response so this endpoint does not reveal which emails have accounts.
    return json(res, 200, { ok: true, message: 'If that administrator account exists, a recovery email will be sent.' });
  } catch {
    return json(res, 503, { error: 'Password recovery is temporarily unavailable.' });
  }
};
