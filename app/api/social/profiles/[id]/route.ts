import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isGender, positiveInteger } from '@/lib/social';
import { requestBody, requireSocialAdmin, socialError } from '@/lib/socialApi';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id } = await params;
    const body = await requestBody(request);
    const updates: Record<string, unknown> = {};
    if (body?.social_level !== undefined) { const level = positiveInteger(body.social_level, 1, 10); if (!level) return NextResponse.json({ error: 'Nivel inválido.' }, { status: 400 }); updates.social_level = level; }
    if (body?.gender !== undefined) { if (!isGender(body.gender)) return NextResponse.json({ error: 'Género inválido.' }, { status: 400 }); updates.gender = body.gender; }
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'No hay cambios válidos.' }, { status: 400 });
    const { data, error } = await createAdminClient().from('profiles').update(updates).eq('id', id).select('id, full_name, gender, social_level').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) { return socialError(error); }
}
