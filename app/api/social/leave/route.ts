import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requestBody, socialError } from '@/lib/socialApi';

export async function POST(request: Request) {
  try {
    const body = await requestBody(request);
    const eventId = typeof body?.event_id === 'string' ? body.event_id : '';
    if (!eventId) return NextResponse.json({ error: 'Falta el evento.' }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 });
    const { error } = await supabase.rpc('social_leave', { p_event_id: eventId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) { return socialError(error); }
}
