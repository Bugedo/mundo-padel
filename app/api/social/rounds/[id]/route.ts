import { NextResponse } from 'next/server';
import { validateDistinctMatches } from '@/lib/social';
import { createAdminClient } from '@/utils/supabase/admin';
import { requestBody, requireSocialAdmin, socialError } from '@/lib/socialApi';

type SubmittedMatch = { court: number; teamA: string[]; teamB: string[]; locked?: boolean };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id } = await params;
    const body = await requestBody(request);
    const matches = Array.isArray(body?.matches) ? body.matches as SubmittedMatch[] : null;
    if (!matches || matches.some((match) => !Array.isArray(match.teamA) || !Array.isArray(match.teamB) || match.teamA.length !== 2 || match.teamB.length !== 2)) return NextResponse.json({ error: 'Formato de partidos inválido.' }, { status: 400 });
    const normalized = matches.map((match) => ({ court: Number(match.court), teamA: match.teamA, teamB: match.teamB }));
    const duplicateError = validateDistinctMatches(normalized);
    if (duplicateError) return NextResponse.json({ error: duplicateError }, { status: 400 });
    const db = createAdminClient();
    const { data: round, error: roundError } = await db.from('social_rounds').select('id, event_id, status').eq('id', id).single();
    if (roundError || !round) return NextResponse.json({ error: 'Ronda no encontrada.' }, { status: 404 });
    if (round.status !== 'preview') return NextResponse.json({ error: 'Solo se puede editar una ronda en vista previa.' }, { status: 409 });
    const allIds = normalized.flatMap((match) => [...match.teamA, ...match.teamB]);
    const { data: attendees, error: attendeesError } = await db.from('social_attendees').select('id').eq('event_id', round.event_id).is('left_at', null).in('id', allIds);
    if (attendeesError) return NextResponse.json({ error: attendeesError.message }, { status: 500 });
    if ((attendees || []).length !== allIds.length) return NextResponse.json({ error: 'Hay jugadores ausentes o ajenos al evento.' }, { status: 400 });
    const { error: deleteError } = await db.from('social_matches').delete().eq('round_id', id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    if (matches.length) {
      const { error: insertError } = await db.from('social_matches').insert(matches.map((match) => ({ round_id: id, court: Number(match.court), team_a: match.teamA, team_b: match.teamB, locked: Boolean(match.locked) })));
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data, error } = await db.from('social_matches').select('*').eq('round_id', id).order('court');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error) { return socialError(error); }
}
