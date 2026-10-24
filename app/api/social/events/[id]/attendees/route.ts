import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isGender, positiveInteger } from '@/lib/social';
import { requestBody, requireSocialAdmin, socialError } from '@/lib/socialApi';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id: eventId } = await params;
    const body = await requestBody(request);
    const db = createAdminClient();
    const { data: event, error: eventError } = await db.from('social_events').select('id').eq('id', eventId).single();
    if (eventError || !event) return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    const { data: latestRound } = await db.from('social_rounds').select('number').eq('event_id', eventId).in('status', ['live', 'done']).order('number', { ascending: false }).limit(1).maybeSingle();
    const joined_at_round = latestRound?.number || 0;
    const profileId = typeof body?.profile_id === 'string' ? body.profile_id : null;
    let insert: Record<string, unknown> = { event_id: eventId, profile_id: profileId, joined_at_round };
    if (!profileId) {
      const guestName = String(body?.guest_name || '').trim();
      const guestLevel = positiveInteger(body?.guest_level, 1, 10);
      if (!guestName || !guestLevel || !isGender(body?.guest_gender)) return NextResponse.json({ error: 'Datos del invitado inválidos.' }, { status: 400 });
      insert = { event_id: eventId, guest_name: guestName, guest_gender: body?.guest_gender, guest_level: guestLevel, joined_at_round };
    }
    const { data, error } = await db.from('social_attendees').insert(insert).select('*, profile:profiles(full_name, gender, social_level, social_level_suggested)').single();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'La persona ya está anotada.' : error.message }, { status: error.code === '23505' ? 409 : 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return socialError(error); }
}
