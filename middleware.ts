import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!['/admin', '/admin.html', '/admin.js'].includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('sb-access-token')?.value;
  if (supabaseUrl && supabaseAnonKey && token) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user && user.app_metadata?.role === 'admin') {
      return NextResponse.next();
    }
  }

  const login = new URL('/login.html', request.url);
  if (pathname !== '/admin.js') login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin', '/admin.html', '/admin.js'],
};
