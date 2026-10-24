'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type Event = { id: string; title: string; starts_at: string; courts: number; round_minutes: number; gender_policy: string; status: 'draft' | 'open' | 'closed' };
const input = 'w-full rounded-lg border border-muted bg-background px-3 py-2 text-neutral';

export default function AdminSocialPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch('/api/social/events', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setEvents(data); else setError(data.error || 'No se pudieron cargar los eventos.');
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreating(true); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/social/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json(); setCreating(false);
    if (!response.ok) return setError(data.error || 'No se pudo crear el evento.');
    event.currentTarget.reset(); await load();
  }
  async function status(id: string, next: Event['status']) {
    const response = await fetch(`/api/social/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
    if (!response.ok) { const data = await response.json(); return setError(data.error || 'No se pudo actualizar.'); }
    await load();
  }
  return <div className="mx-auto max-w-6xl space-y-8">
    <div><h1 className="text-3xl font-extrabold text-light">Social de los viernes</h1><p className="text-neutral-muted">Creá el evento y administrá la noche en vivo.</p></div>
    <form onSubmit={create} className="grid gap-3 rounded-2xl bg-surface p-5 md:grid-cols-3">
      <input className={input} required name="title" placeholder="Social viernes" />
      <input className={input} required name="starts_at" type="datetime-local" />
      <label className="text-sm">Canchas<input className={input} required name="courts" type="number" min="1" max="10" defaultValue="3" /></label>
      <label className="text-sm">Minutos por ronda<input className={input} required name="round_minutes" type="number" min="5" max="120" defaultValue="15" /></label>
      <label className="text-sm">Política de género<select className={input} name="gender_policy" defaultValue="preferir_mixto"><option value="libre">Libre</option><option value="preferir_mixto">Preferir mixto</option><option value="separado">Separado</option></select></label>
      <button disabled={creating} className="self-end rounded-lg bg-accent px-4 py-2 font-bold text-dark disabled:opacity-50">{creating ? 'Creando…' : 'Crear evento'}</button>
    </form>
    {error && <p className="rounded-lg bg-error/20 p-3 text-error-light">{error}</p>}
    <div className="grid gap-4">
      {events.map((event) => <article key={event.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-muted bg-surface p-5"><div><h2 className="text-xl font-bold">{event.title}</h2><p className="text-neutral-muted">{new Date(event.starts_at).toLocaleString('es-AR')} · {event.courts} canchas · {event.round_minutes} min · <span className="text-accent">{event.status}</span></p></div><div className="flex gap-2"><Link className="rounded-lg bg-accent px-3 py-2 font-bold text-dark" href={`/admin/social/${event.id}`}>Abrir</Link>{event.status !== 'open' && <button onClick={() => void status(event.id, 'open')} className="rounded-lg border border-accent px-3 py-2 text-accent">Abrir check-in</button>}{event.status === 'open' && <button onClick={() => void status(event.id, 'closed')} className="rounded-lg border border-muted px-3 py-2">Cerrar</button>}</div></article>)}
      {!events.length && <p className="text-neutral-muted">Todavía no hay eventos.</p>}
    </div>
  </div>;
}
