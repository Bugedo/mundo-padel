import { NextResponse } from 'next/server';
import { generateRound, type Match } from '@/lib/socialMatchmaking';
import { attendeeName, socialRoundToHistory, toPoolPlayer } from '@/lib/social';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSocialAdmin, socialError } from '@/lib/socialApi';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSocialAdmin();
  if ('response' in admin) return admin.response;
  try {
    const { id: eventId } = await params;
    const db = createAdminClient();
    const [{ data: event, error: eventError }, { data: attendees, error: attendeeError }, { data: completed, error: roundsError }, { data: preview, error: previewError }] = await Promise.all([
      db.from('social_events').select('courts, gender_policy').eq('id', eventId).single(),
      db.from('social_attendees').select('*, profile:profiles(full_name, gender, social_level, social_level_suggested)').eq('event_id', eventId).is('left_at', null),
      db.from('social_rounds').select('number, social_matches(court, team_a, team_b)').eq('event_id', eventId).in('status', ['live', 'done']).order('number'),
      db.from('social_rounds').select('id, social_matches(court, team_a, team_b, locked)').eq('event_id', eventId).eq('status', 'preview').maybeSingle(),
    ]);
    const error = eventError || attendeeError || roundsError || previewError;
    if (error || !event) return NextResponse.json({ error: error?.message || 'Evento no encontrado.' }, { status: eventError ? 404 : 500 });
    const players = (attendees || []).map(toPoolPlayer);
    const incomplete = players.some((player) => !player);
    if (incomplete) {
      const missing = (attendees || []).filter((attendee, index) => !players[index]).map(attendeeName).join(', ');
      return NextResponse.json({ error: `Falta género o nivel: ${missing}.` }, { status: 400 });
    }
    const lockedMatches: Match[] = ((preview?.social_matches || []) as Array<{ court: number; team_a: string[]; team_b: string[]; locked: boolean }>)
      .filter((match) => match.locked)
      .map((match) => ({ court: match.court, teamA: [match.team_a[0], match.team_a[1]], teamB: [match.team_b[0], match.team_b[1]] }));
    const seed = Math.floor(Math.random() * 2_147_483_647);
    const result = generateRound({ players: players.filter((player): player is NonNullable<typeof player> => player !== null), history: socialRoundToHistory(completed || []), courts: event.courts, policy: event.gender_policy, seed, lockedMatches });
    const nextNumber = Math.max(0, ...(completed || []).map((round) => round.number)) + 1;
    if (preview) {
      const { error: deleteError } = await db.from('social_rounds').delete().eq('id', preview.id);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    const { data: round, error: roundError } = await db.from('social_rounds').insert({ event_id: eventId, number: nextNumber, seed, status: 'preview' }).select().single();
    if (roundError || !round) return NextResponse.json({ error: roundError?.message || 'No se pudo crear la ronda.' }, { status: 500 });
    if (result.matches.length) {
      const locks = new Set(lockedMatches.map((match) => match.court));
      const { error: matchError } = await db.from('social_matches').insert(result.matches.map((match) => ({ round_id: round.id, court: match.court, team_a: match.teamA, team_b: match.teamB, locked: locks.has(match.court) })));
      if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });
    }
    return NextResponse.json({ round: { ...round, social_matches: result.matches }, bench: result.bench, score: result.score, warnings: result.warnings });
  } catch (error) { return socialError(error); }
}
