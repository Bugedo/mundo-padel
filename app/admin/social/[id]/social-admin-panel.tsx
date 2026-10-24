'use client';

import SocialQr from '@/components/social/SocialQr';
import SocialTimer from '@/components/social/SocialTimer';
import { attendeeGender, attendeeLevel, attendeeName, type SocialAttendee } from '@/lib/social';
import { createClient } from '@/utils/supabase/client';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Match = { id?: string; court: number; team_a: string[]; team_b: string[]; locked: boolean };
type Round = { id: string; number: number; status: 'preview' | 'live' | 'done'; ends_at: string | null; social_matches: Match[] };
type Event = { id: string; title: string; starts_at: string; courts: number; round_minutes: number; gender_policy: string; status: string; checkin_token: string };
type Dashboard = { event: Event; attendees: SocialAttendee[]; rounds: Round[] };
const input = 'rounded border border-muted bg-background px-2 py-1 text-sm';

export default function SocialAdminPanel({ eventId }: { eventId: string }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [selected, setSelected] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/social/events/${eventId}`, { cache: 'no-store' }); const body = await response.json();
    if (response.ok) setData(body); else setError(body.error || 'No se pudo cargar el evento.');
  }, [eventId]);
  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 5000); const channel = createClient().channel(`social-admin-${eventId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'social_attendees', filter: `event_id=eq.${eventId}` }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'social_rounds', filter: `event_id=eq.${eventId}` }, () => void load()).subscribe(); return () => { window.clearInterval(interval); void createClient().removeChannel(channel); }; }, [eventId, load]);
  const preview = data?.rounds.find((round) => round.status === 'preview') || null;
  const live = data?.rounds.find((round) => round.status === 'live') || null;
  const present = data?.attendees.filter((attendee) => !attendee.left_at) || [];
  const labels = useMemo(() => new Map((data?.attendees || []).map((attendee) => [attendee.id, attendeeName(attendee)])), [data]);
  const checkinUrl = typeof window === 'undefined' ? `/social/checkin/${data?.event.checkin_token || ''}` : `${window.location.origin}/social/checkin/${data?.event.checkin_token || ''}`;
  async function call(url: string, method = 'POST', body?: unknown) { setError(''); setNotice(''); const response = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); const json = await response.json(); if (!response.ok) { setError(json.error || 'La operación no se pudo completar.'); return null; } return json; }
  async function generate() { const response = await call(`/api/social/events/${eventId}/rounds/generate`); if (response) { setNotice(response.warnings?.join(' ') || 'Vista previa actualizada.'); await load(); } }
  async function start() { if (preview && await call(`/api/social/rounds/${preview.id}/start`)) { setNotice('Ronda iniciada.'); await load(); } }
  async function updateAttendee(id: string, body: unknown) { if (await call(`/api/social/events/${eventId}/attendees/${id}`, 'PATCH', body)) await load(); }
  async function saveMatches(matches: Match[]) { if (!preview) return; if (await call(`/api/social/rounds/${preview.id}`, 'PATCH', { matches: matches.map((match) => ({ court: match.court, teamA: match.team_a, teamB: match.team_b, locked: match.locked })) })) { setSelected(null); await load(); } }
  function selectPlayer(id: string) {
    if (!preview) return; if (!selected) return setSelected(id); if (selected === id) return setSelected(null);
    const matches = preview.social_matches.map((match) => ({ ...match, team_a: [...match.team_a], team_b: [...match.team_b] }));
    const find = (playerId: string) => { for (const match of matches) for (const team of [match.team_a, match.team_b]) { const index = team.indexOf(playerId); if (index >= 0) return { team, index }; } return null; };
    const first = find(selected); const second = find(id);
    if (first && second) [first.team[first.index], second.team[second.index]] = [second.team[second.index], first.team[first.index]];
    else if (first) first.team[first.index] = id;
    else if (second) second.team[second.index] = selected;
    else return setSelected(null);
    void saveMatches(matches);
  }
  async function addGuest(form: FormData) { const payload = Object.fromEntries(form); if (await call(`/api/social/events/${eventId}/attendees`, 'POST', payload)) { setNotice('Invitado agregado.'); await load(); } }
  if (!data) return <p className="text-neutral-muted">Cargando social…</p>;
  const playing = new Set(preview?.social_matches.flatMap((match) => [...match.team_a, ...match.team_b]) || []);
  const bench = present.filter((attendee) => !playing.has(attendee.id));
  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-extrabold">{data.event.title}</h1><p className="text-neutral-muted">{new Date(data.event.starts_at).toLocaleString('es-AR')} · {data.event.status}</p>{live && <div className="mt-2">Ronda {live.number} en curso: <SocialTimer endsAt={live.ends_at} /></div>}</div><a className="rounded-lg border border-accent px-3 py-2 text-accent" href={`/social/${eventId}/tv`} target="_blank">Abrir TV</a></header>
    {error && <p className="rounded-lg bg-error/20 p-3 text-error-light">{error}</p>}{notice && <p className="rounded-lg bg-success/20 p-3 text-success-light">{notice}</p>}
    <section className="grid gap-6 rounded-2xl bg-surface p-5 lg:grid-cols-[380px_1fr]"><div><h2 className="mb-3 text-xl font-bold">Check-in</h2><SocialQr value={checkinUrl} /><a className="mt-3 block break-all text-sm text-accent underline" href={checkinUrl}>{checkinUrl}</a></div><form action={async (form) => { await addGuest(form); }} className="grid content-start gap-3"><h2 className="text-xl font-bold">Agregar invitado</h2><input className={input} name="guest_name" required placeholder="Nombre" /><select className={input} name="guest_gender" defaultValue="M"><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">Otro / prefiero no decir</option></select><input className={input} name="guest_level" required type="number" min="1" max="10" defaultValue="5" /><button className="rounded-lg bg-accent px-3 py-2 font-bold text-dark">Agregar al pool</button></form></section>
    <section className="rounded-2xl bg-surface p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-bold">Pool en vivo ({present.length})</h2><button className="rounded-lg bg-accent px-3 py-2 font-bold text-dark" onClick={() => void generate()}> {preview ? 'Regenerar ronda' : 'Armar ronda'} </button></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{data.attendees.map((attendee) => <article key={attendee.id} className={`flex items-center gap-2 rounded-lg p-3 ${attendee.left_at ? 'bg-muted opacity-60' : 'bg-surface-light'}`}><div className="min-w-0 flex-1"><p className="truncate font-bold">{attendeeName(attendee)}</p><p className="text-xs text-neutral-muted">{attendee.profile_id ? 'Cuenta Google' : 'Invitado'}</p></div><select aria-label="Género" className={input} value={attendeeGender(attendee) || 'M'} onChange={(event) => void updateAttendee(attendee.id, { gender: event.target.value })}><option value="M">M</option><option value="F">F</option><option value="X">X</option></select><select aria-label="Nivel" className={input} value={attendeeLevel(attendee) || 5} onChange={(event) => void updateAttendee(attendee.id, { level: Number(event.target.value) })}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select><button className="text-sm text-accent underline" onClick={() => void updateAttendee(attendee.id, { present: Boolean(attendee.left_at) })}>{attendee.left_at ? 'Reingresar' : 'Sacar'}</button></article>)}</div></section>
    <section className="rounded-2xl bg-surface p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">{preview ? `Vista previa · ronda ${preview.number}` : 'Próxima ronda'}</h2><p className="text-neutral-muted">Tocá dos jugadores para intercambiarlos, incluso con el banco.</p></div>{preview && <button className="rounded-lg bg-accent px-4 py-2 font-bold text-dark" onClick={() => void start()}>Iniciar ronda</button>}</div>{preview ? <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{preview.social_matches.map((match) => <article key={match.court} className="rounded-xl border border-muted bg-surface-light p-4"><div className="mb-3 flex items-center justify-between"><b className="text-accent">Cancha {match.court}</b><label className="text-sm"><input checked={match.locked} type="checkbox" onChange={() => void saveMatches(preview.social_matches.map((candidate) => candidate.court === match.court ? { ...candidate, locked: !candidate.locked } : candidate))} /> Fijar</label></div>{[...match.team_a, ...match.team_b].map((id, index) => <button key={id} onClick={() => selectPlayer(id)} className={`mb-2 block w-full rounded p-2 text-left ${selected === id ? 'bg-accent text-dark' : 'bg-muted hover:bg-muted-light'}`}>{labels.get(id)} {index === 1 ? <span className="float-right text-xs">vs</span> : ''}</button>)}</article>)}</div><div className="mt-4 rounded-xl bg-muted p-3"><b className="mr-2 text-accent">Banco:</b>{bench.length ? bench.map((attendee) => <button key={attendee.id} onClick={() => selectPlayer(attendee.id)} className={`mr-2 rounded px-2 py-1 ${selected === attendee.id ? 'bg-accent text-dark' : 'bg-surface-light'}`}>{attendeeName(attendee)}</button>) : 'Sin banco'}</div></> : <p className="text-neutral-muted">Armá una ronda cuando haya al menos cuatro personas presentes.</p>}</section>
  </div>;
}
