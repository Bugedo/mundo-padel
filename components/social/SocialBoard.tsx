'use client';

import SocialTimer from '@/components/social/SocialTimer';

type BoardAttendee = { attendee_id: string; name: string; gender: string | null; level: number | null; left_at: string | null };
type BoardMatch = { court: number; team_a: string[]; team_b: string[] };
type BoardRound = { number: number; status: 'preview' | 'live' | 'done'; ends_at: string | null; social_matches: BoardMatch[] };

export function playerNames(ids: string[], people: BoardAttendee[]) {
  return ids.map((id) => {
    const player = people.find((person) => person.attendee_id === id);
    return `${player?.name || 'Jugador/a'} ${player?.level ?? '—'}`;
  }).join(' + ');
}

function teamTotal(ids: string[], people: BoardAttendee[]) {
  return ids.reduce((total, id) => total + (people.find((person) => person.attendee_id === id)?.level ?? 0), 0);
}

export default function SocialBoard({ attendees, round, showBench = true, large = false }: { attendees: BoardAttendee[]; round: BoardRound | null; showBench?: boolean; large?: boolean }) {
  const active = attendees.filter((attendee) => !attendee.left_at);
  const playing = new Set(round?.social_matches.flatMap((match) => [...match.team_a, ...match.team_b]) || []);
  const bench = active.filter((attendee) => !playing.has(attendee.attendee_id));
  if (!round) return <div className="rounded-2xl border border-muted bg-surface p-6 text-neutral-muted">Todavía no hay una ronda armada.</div>;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={large ? 'text-4xl font-extrabold' : 'text-2xl font-bold'}>{round.status === 'live' ? `Ronda ${round.number} en juego` : `Próxima ronda ${round.number}`}</h2>
        {round.status === 'live' && <SocialTimer endsAt={round.ends_at} large={large} />}
      </div>
      <div className={`grid gap-4 ${large ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
        {round.social_matches.map((match) => (
          <article key={match.court} className="rounded-2xl border border-accent-muted bg-surface-light p-5 shadow-lg">
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-accent">Cancha {match.court}</p>
            <div className="rounded-xl bg-muted p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-muted">Pareja A</p>
              <p className={large ? 'text-2xl font-bold' : 'text-lg font-bold'}>{playerNames(match.team_a, attendees)} <span className="whitespace-nowrap text-accent">= {teamTotal(match.team_a, attendees)}</span></p>
            </div>
            <p className="my-3 text-center text-sm font-bold text-neutral-muted">vs</p>
            <div className="rounded-xl bg-muted p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-muted">Pareja B</p>
              <p className={large ? 'text-2xl font-bold' : 'text-lg font-bold'}>{playerNames(match.team_b, attendees)} <span className="whitespace-nowrap text-accent">= {teamTotal(match.team_b, attendees)}</span></p>
            </div>
          </article>
        ))}
      </div>
      {showBench && bench.length > 0 && <div className="rounded-2xl bg-muted p-4"><span className="mr-2 font-bold text-accent">Banco:</span>{bench.map((person) => person.name).join(' · ')}</div>}
    </section>
  );
}
