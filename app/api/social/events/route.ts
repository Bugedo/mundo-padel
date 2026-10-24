import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isGenderPolicy, positiveInteger } from '@/lib/social';
import { requestBody, requireSocialAdmin, socialError } from '@/lib/socialApi';

export async function GET() {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { data, error } = await createAdminClient().from('social_events').select('*').order('starts_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error) { return socialError(error); }
}

export async function POST(request: Request) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const body = await requestBody(request);
    const title = String(body?.title || '').trim();
    const startsAt = typeof body?.starts_at === 'string' ? new Date(body.starts_at) : null;
    const courts = positiveInteger(body?.courts ?? 3, 1, 10);
    const minutes = positiveInteger(body?.round_minutes ?? 15, 5, 120);
    if (!title || !startsAt || Number.isNaN(startsAt.valueOf()) || !courts || !minutes || !isGenderPolicy(body?.gender_policy ?? 'preferir_mixto')) {
      return NextResponse.json({ error: 'Datos del evento inválidos.' }, { status: 400 });
    }
    const { data, error } = await createAdminClient().from('social_events').insert({
      title, starts_at: startsAt.toISOString(), courts, round_minutes: minutes, gender_policy: body?.gender_policy ?? 'preferir_mixto',
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return socialError(error); }
}
