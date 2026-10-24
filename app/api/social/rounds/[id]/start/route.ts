import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSocialAdmin, socialError } from '@/lib/socialApi';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id } = await params;
    const db = createAdminClient();
    const { data: round, error: roundError } = await db.from('social_rounds').select('id, event_id, status').eq('id', id).single();
    if (roundError || !round) return NextResponse.json({ error: 'Ronda no encontrada.' }, { status: 404 });
    if (round.status !== 'preview') return NextResponse.json({ error: 'La ronda ya no está en vista previa.' }, { status: 409 });
    const { data: event, error: eventError } = await db.from('social_events').select('round_minutes').eq('id', round.event_id).single();
    if (eventError || !event) return NextResponse.json({ error: eventError?.message || 'Evento no encontrado.' }, { status: 500 });
    const now = new Date();
    const endsAt = new Date(now.valueOf() + Number(event.round_minutes || 15) * 60_000).toISOString();
    const { error: doneError } = await db.from('social_rounds').update({ status: 'done' }).eq('event_id', round.event_id).eq('status', 'live');
    if (doneError) return NextResponse.json({ error: doneError.message }, { status: 500 });
    const { data, error } = await db.from('social_rounds').update({ status: 'live', started_at: now.toISOString(), ends_at: endsAt }).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) { return socialError(error); }
}
