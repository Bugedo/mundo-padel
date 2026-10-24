import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { isGender, positiveInteger } from '@/lib/social';
import { requestBody, socialError } from '@/lib/socialApi';

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Falta el código de check-in.' }, { status: 400 });
    const db = createAdminClient();
    const { data: event, error } = await db.from('social_events').select('id, title, starts_at, status').eq('checkin_token', token).single();
    if (error || !event || event.status !== 'open') return NextResponse.json({ error: 'El evento no está disponible para check-in.' }, { status: 404 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ event, user: null });
    const { data: profile } = await supabase.from('profiles').select('id, full_name, gender, social_level, social_level_suggested').eq('id', user.id).maybeSingle();
    return NextResponse.json({ event, user: { id: user.id }, profile });
  } catch (error) { return socialError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await requestBody(request);
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!token) return NextResponse.json({ error: 'Falta el código de check-in.' }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 });
    if (body?.gender !== undefined || body?.suggested_level !== undefined) {
      const level = positiveInteger(body?.suggested_level, 1, 10);
      if (!isGender(body?.gender) || !level) return NextResponse.json({ error: 'Completá género y nivel sugerido.' }, { status: 400 });
      const { error } = await supabase.rpc('update_own_social_profile', { p_gender: body.gender, p_suggested_level: level });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data: eventId, error } = await supabase.rpc('social_checkin', { p_token: token });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ event_id: eventId });
  } catch (error) { return socialError(error); }
}
