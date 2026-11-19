const ACCESS_COOKIE = '__Host-gl_at';
const REFRESH_COOKIE = '__Host-gl_rt';
const PRIMARY_ADMIN_EMAIL = 'gridlinedigitallumine@gmail.com';

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

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function isAllowedAdmin(user) {
  if (!user?.email || !user.email_confirmed_at) return false;
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(/[;,]/)
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  allowed.push(PRIMARY_ADMIN_EMAIL);
  return allowed.includes(String(user.email).toLowerCase());
}

async function authUser(baseUrl, apiKey, accessToken) {
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(7000),
    cache: 'no-store',
  });
  return { response, user: response.ok ? await response.json() : null };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return json(res, 403, { error: 'Request not allowed.' });

  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY || '';
  if (!baseUrl || !apiKey) return json(res, 503, { error: 'Sign-in is not configured yet.' });

  let body = req.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > 8192) return json(res, 413, { error: 'Request is too large.' });
    try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'Enter a valid email and password.' }); }
  }
  const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 254) : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 1024) {
    return json(res, 400, { error: 'Enter a valid email and password.' });
  }

  try {
    const login = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    if (!login.ok) return json(res, 401, { error: 'Sign-in failed. Check your details or use password recovery.' });
    const session = await login.json();
    if (!session.access_token || !session.refresh_token) return json(res, 401, { error: 'Sign-in failed. Check your details or use password recovery.' });

    const { response, user } = await authUser(baseUrl, apiKey, session.access_token);
    if (!response.ok) {
      if (response.status >= 500) return json(res, 503, { error: 'Authentication service is temporarily unavailable.' });
      return json(res, 401, { error: 'Sign-in failed. Check your details or use password recovery.' });
    }
    if (!isAllowedAdmin(user)) return json(res, 403, { error: 'This account does not have administrator access.' });

    const accessAge = Math.min(Math.max(Number(session.expires_in) || 3600, 60), 3600);
    res.setHeader('Set-Cookie', [
      cookie(ACCESS_COOKIE, session.access_token, accessAge),
      cookie(REFRESH_COOKIE, session.refresh_token, 60 * 60 * 24 * 30),
    ]);
    return json(res, 200, { ok: true });
  } catch {
    return json(res, 503, { error: 'Authentication service is temporarily unavailable. Please try again.' });
  }
};
