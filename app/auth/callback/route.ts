import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function isSafeNext(next: string | null): next is string {
  return Boolean(next && /^\/(?![\/\\])/.test(next));
}

function authErrorRedirect(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', 'auth');
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const requestedNext = request.nextUrl.searchParams.get('next');
  const next = isSafeNext(requestedNext) ? requestedNext : '/';

  if (!code) {
    return authErrorRedirect(request);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return authErrorRedirect(request);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
