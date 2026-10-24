import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isEventStatus, isGenderPolicy, positiveInteger } from '@/lib/social';
import { requestBody, requireSocialAdmin, socialError } from '@/lib/socialApi';

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id } = await params;
    const db = createAdminClient();
    const [{ data: event, error: eventError }, { data: attendees, error: attendeeError }, { data: rounds, error: roundError }] = await Promise.all([
      db.from('social_events').select('*').eq('id', id).single(),
      db.from('social_attendees').select('*, profile:profiles(full_name, gender, social_level, social_level_suggested)').eq('event_id', id).order('joined_at'),
      db.from('social_rounds').select('*, social_matches(*)').eq('event_id', id).order('number'),
    ]);
    const error = eventError || attendeeError || roundError;
    if (error) return NextResponse.json({ error: error.message }, { status: eventError?.code === 'PGRST116' ? 404 : 500 });
    return NextResponse.json({ event, attendees: attendees || [], rounds: rounds || [] });
  } catch (error) { return socialError(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id } = await params;
    const body = await requestBody(request);
    const updates: Record<string, unknown> = {};
    if (body?.title !== undefined) { const title = String(body.title).trim(); if (!title) return NextResponse.json({ error: 'El título es obligatorio.' }, { status: 400 }); updates.title = title; }
    if (body?.starts_at !== undefined) { const date = new Date(String(body.starts_at)); if (Number.isNaN(date.valueOf())) return NextResponse.json({ error: 'Fecha inválida.' }, { status: 400 }); updates.starts_at = date.toISOString(); }
    if (body?.courts !== undefined) { const value = positiveInteger(body.courts, 1, 10); if (!value) return NextResponse.json({ error: 'Cantidad de canchas inválida.' }, { status: 400 }); updates.courts = value; }
    if (body?.round_minutes !== undefined) { const value = positiveInteger(body.round_minutes, 5, 120); if (!value) return NextResponse.json({ error: 'Duración inválida.' }, { status: 400 }); updates.round_minutes = value; }
    if (body?.gender_policy !== undefined) { if (!isGenderPolicy(body.gender_policy)) return NextResponse.json({ error: 'Política inválida.' }, { status: 400 }); updates.gender_policy = body.gender_policy; }
    if (body?.status !== undefined) { if (!isEventStatus(body.status)) return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 }); updates.status = body.status; }
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'No hay cambios válidos.' }, { status: 400 });
    const { data, error } = await createAdminClient().from('social_events').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) { return socialError(error); }
}

export async function DELETE(_: Request, { params }: Context) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id } = await params;
    const { error } = await createAdminClient().from('social_events').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) { return socialError(error); }
}
