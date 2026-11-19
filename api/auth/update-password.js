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

function isAllowedAdmin(user) {
  if (!user?.email || !user.email_confirmed_at) return false;
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(/[;,]/)
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  allowed.push('gridlinedigitallumine@gmail.com');
  return allowed.includes(String(user.email).toLowerCase());
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return json(res, 403, { error: 'Request not allowed.' });

  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY || '';
  if (!baseUrl || !apiKey) return json(res, 503, { error: 'Password reset is not configured yet.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.slice(0, 8192) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!accessToken || password.length < 12 || password.length > 128) {
    return json(res, 400, { error: 'Use a new password with at least 12 characters.' });
  }

  try {
    const checked = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    if (!checked.ok) return json(res, 400, { error: 'That recovery link is expired or invalid. Request a new one.' });
    const user = await checked.json();
    if (!isAllowedAdmin(user)) return json(res, 403, { error: 'This account does not have administrator access.' });

    const updated = await fetch(`${baseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    if (!updated.ok) return json(res, 400, { error: 'Could not update the password. Request a new recovery link and try again.' });
    return json(res, 200, { ok: true });
  } catch {
    return json(res, 503, { error: 'Password reset is temporarily unavailable.' });
  }
};
