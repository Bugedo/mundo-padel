import { NextResponse } from 'next/server';

/** Deprecated: guest bookings no longer use per-user lists. */
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
