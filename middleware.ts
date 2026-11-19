import { next } from '@vercel/functions';

const ACCESS_COOKIE = '__Host-gl_at';
const REFRESH_COOKIE = '__Host-gl_rt';
const PRIMARY_ADMIN_EMAIL = 'gridlinedigitallumine@gmail.com';
const COOKIE_CLEAR = 'Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0';

function readCookie(request: Request, name: string): string {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return ''; }
  }
  return '';
}

function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function redirectToLogin(request: Request, clearCookies = false): Response {
  const url = new URL('/login.html', request.url);
  url.searchParams.set('next', '/admin');
  const headers = new Headers({
    Location: url.toString(),
    'Cache-Control': 'no-store',
  });
  if (clearCookies) {
    headers.append('Set-Cookie', `${ACCESS_COOKIE}=; ${COOKIE_CLEAR}`);
    headers.append('Set-Cookie', `${REFRESH_COOKIE}=; ${COOKIE_CLEAR}`);
  }
  return new Response(null, { status: 303, headers });
}

function denyScript(clearCookies = false): Response {
  const response = new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  if (clearCookies) {
    response.headers.append('Set-Cookie', `${ACCESS_COOKIE}=; ${COOKIE_CLEAR}`);
    response.headers.append('Set-Cookie', `${REFRESH_COOKIE}=; ${COOKIE_CLEAR}`);
  }
  return response;
}

async function getUser(accessToken: string, baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(7000),
    cache: 'no-store',
  });
  if (!response.ok) return { response, user: null };
  return { response, user: await response.json() };
}

async function refreshSession(refreshToken: string, baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal: AbortSignal.timeout(7000),
    cache: 'no-store',
  });
  return { response, session: response.ok ? await response.json() : null };
}

function isAllowedAdmin(user: any): boolean {
  if (!user?.email || !user.email_confirmed_at) return false;
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(/[;,]/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  allowed.push(PRIMARY_ADMIN_EMAIL);
  return allowed.includes(String(user.email).toLowerCase());
}

export default async function middleware(request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname.toLowerCase();
  if (!['/admin', '/admin.html', '/admin.js'].includes(pathname)) return next();

  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY || '';
  if (!baseUrl || !apiKey) {
    if (pathname === '/admin.js') return denyScript();
    return redirectToLogin(request);
  }

  let accessToken = readCookie(request, ACCESS_COOKIE);
  let refreshToken = readCookie(request, REFRESH_COOKIE);
  let refreshed: { access_token: string; refresh_token: string; expires_in?: number } | null = null;

  try {
    let checked = accessToken ? await getUser(accessToken, baseUrl, apiKey) : { response: null, user: null };
    if (checked.response && checked.response.status >= 500) {
      return new Response('Authentication service is temporarily unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!checked.user && refreshToken) {
      const renewed = await refreshSession(refreshToken, baseUrl, apiKey);
      if (renewed.response.status >= 500) {
        return new Response('Authentication service is temporarily unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
      }
      if (renewed.session?.access_token && renewed.session?.refresh_token) {
        refreshed = renewed.session;
        accessToken = renewed.session.access_token;
        refreshToken = renewed.session.refresh_token;
        checked = await getUser(accessToken, baseUrl, apiKey);
        if (checked.response.status >= 500) {
          return new Response('Authentication service is temporarily unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
        }
      }
    }

    if (isAllowedAdmin(checked.user)) {
      const response = next();
      response.headers.set('Cache-Control', 'private, no-store, max-age=0');
      if (refreshed) {
        const maxAge = Math.min(Math.max(Number(refreshed.expires_in) || 3600, 60), 3600);
        response.headers.append('Set-Cookie', setCookie(ACCESS_COOKIE, accessToken, maxAge));
        response.headers.append('Set-Cookie', setCookie(REFRESH_COOKIE, refreshToken, 60 * 60 * 24 * 30));
      }
      return response;
    }

    return pathname === '/admin.js' ? denyScript(true) : redirectToLogin(request, true);
  } catch {
    return new Response('Authentication service is temporarily unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/admin', '/admin.html', '/admin.js'],
};
