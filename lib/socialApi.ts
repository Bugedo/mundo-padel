import { NextResponse } from 'next/server';
import { validateAdminUser } from '@/lib/authUtils';

export async function requireSocialAdmin() {
  const auth = await validateAdminUser();
  if (!auth.isAdmin) {
    return { response: NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 }) };
  }
  return { user: auth.user };
}

export function socialError(error: unknown, fallback = 'Error interno') {
  console.error('Social API error:', error);
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function requestBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
