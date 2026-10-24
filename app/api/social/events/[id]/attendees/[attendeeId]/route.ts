import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isGender, positiveInteger } from '@/lib/social';
import { requestBody, requireSocialAdmin, socialError } from '@/lib/socialApi';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; attendeeId: string }> }) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id: eventId, attendeeId } = await params;
    const body = await requestBody(request);
    const db = createAdminClient();
    const { data: attendee, error: attendeeError } = await db.from('social_attendees').select('*').eq('id', attendeeId).eq('event_id', eventId).single();
    if (attendeeError || !attendee) return NextResponse.json({ error: 'Asistente no encontrado.' }, { status: 404 });
    const updates: Record<string, unknown> = {};
    if (body?.present !== undefined) updates.left_at = body.present ? null : new Date().toISOString();
    if (attendee.profile_id) {
      const profileUpdates: Record<string, unknown> = {};
      if (body?.gender !== undefined) { if (!isGender(body.gender)) return NextResponse.json({ error: 'Género inválido.' }, { status: 400 }); profileUpdates.gender = body.gender; }
      if (body?.level !== undefined) { const level = positiveInteger(body.level, 1, 10); if (!level) return NextResponse.json({ error: 'Nivel inválido.' }, { status: 400 }); profileUpdates.social_level = level; }
      if (Object.keys(profileUpdates).length) {
        const { error } = await db.from('profiles').update(profileUpdates).eq('id', attendee.profile_id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      if (body?.gender !== undefined) { if (!isGender(body.gender)) return NextResponse.json({ error: 'Género inválido.' }, { status: 400 }); updates.guest_gender = body.gender; }
      if (body?.level !== undefined) { const level = positiveInteger(body.level, 1, 10); if (!level) return NextResponse.json({ error: 'Nivel inválido.' }, { status: 400 }); updates.guest_level = level; }
      if (body?.guest_name !== undefined) { const name = String(body.guest_name).trim(); if (!name) return NextResponse.json({ error: 'Nombre inválido.' }, { status: 400 }); updates.guest_name = name; }
    }
    if (!Object.keys(updates).length && body?.gender === undefined && body?.level === undefined) return NextResponse.json({ error: 'No hay cambios válidos.' }, { status: 400 });
    if (Object.keys(updates).length) {
      const { error } = await db.from('social_attendees').update(updates).eq('id', attendeeId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data, error } = await db.from('social_attendees').select('*, profile:profiles(full_name, gender, social_level, social_level_suggested)').eq('id', attendeeId).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) { return socialError(error); }
}
