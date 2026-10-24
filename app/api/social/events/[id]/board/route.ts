import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { socialError } from '@/lib/socialApi';

/** Deliberately public: this projection never includes email, phone or profile ids. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createAdminClient();
    const [{ data: event, error: eventError }, { data: board, error: boardError }, { data: rounds, error: roundsError }] = await Promise.all([
      db.from('social_events').select('id, title, starts_at, courts, round_minutes, status').eq('id', id).in('status', ['open', 'closed']).single(),
      db.from('social_board').select('*').eq('event_id', id).order('name'),
      db.from('social_rounds').select('id, number, status, started_at, ends_at, social_matches(court, team_a, team_b, locked)').eq('event_id', id).in('status', ['live', 'preview']).order('number', { ascending: false }),
    ]);
    const error = eventError || boardError || roundsError;
    if (error || !event) return NextResponse.json({ error: error?.message || 'Evento no encontrado.' }, { status: 404 });
    return NextResponse.json({
      event,
      attendees: board || [],
      round: (rounds || []).find((round) => round.status === 'live') || null,
      next_round: (rounds || []).find((round) => round.status === 'preview') || null,
    });
  } catch (error) { return socialError(error); }
}
