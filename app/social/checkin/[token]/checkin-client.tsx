'use client';

import GoogleSignIn from '@/components/GoogleSignIn';
import { formatSocialDateTime } from '@/lib/social';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Checkin = { event: { title: string; starts_at: string }; user: { id: string } | null; profile: { full_name: string | null; gender: string | null; social_level: number | null; social_level_suggested: number | null } | null };

export default function CheckinClient({ token }: { token: string }) {
  const router = useRouter(); const [data, setData] = useState<Checkin | null>(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { const response = await fetch(`/api/social/checkin?token=${encodeURIComponent(token)}`, { cache: 'no-store' }); const body = await response.json(); if (response.ok) setData(body); else setError(body.error || 'No se encontró el evento.'); }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function submit(form: FormData) { setSaving(true); setError(''); const gender = form.get('gender'); const payload: Record<string, unknown> = { token }; if (typeof gender === 'string') { payload.gender = gender; payload.suggested_level = Number(form.get('suggested_level')); } const response = await fetch('/api/social/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const body = await response.json(); setSaving(false); if (!response.ok) return setError(body.error || 'No se pudo registrar tu llegada.'); router.replace(`/social/${body.event_id}`); router.refresh(); }
  if (error) return <main className="mx-auto max-w-lg p-8"><p className="rounded-xl bg-error/20 p-4 text-error-light">{error}</p></main>;
  if (!data) return <main className="mx-auto max-w-lg p-8 text-neutral-muted">Cargando check-in…</main>;
  const needsProfile = !data.profile?.gender || !data.profile.social_level_suggested;
  return <main className="mx-auto max-w-lg p-8"><div className="rounded-2xl bg-surface p-6 shadow-xl"><p className="text-sm font-bold uppercase tracking-widest text-accent">Social Mundo Pádel</p><h1 className="mt-2 text-3xl font-extrabold">{data.event.title}</h1><p className="mb-6 text-neutral-muted">{formatSocialDateTime(data.event.starts_at)}</p>{!data.user ? <><p className="mb-5">Iniciá sesión con Google para hacer check-in.</p><GoogleSignIn next={`/social/checkin/${token}`} onError={setError} /></> : needsProfile ? <form action={submit} className="grid gap-4"><p>Antes de ingresar, contanos un poco para armar partidos equilibrados.</p><label>Género<select name="gender" className="mt-1 w-full rounded-lg bg-background p-3"><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">Otro / prefiero no decir</option></select></label><label>Nivel sugerido (1 a 10)<input name="suggested_level" className="mt-1 w-full rounded-lg bg-background p-3" type="number" min="1" max="10" defaultValue="5" required /></label><button disabled={saving} className="rounded-lg bg-accent px-4 py-3 font-bold text-dark disabled:opacity-50">{saving ? 'Ingresando…' : 'Hacer check-in'}</button></form> : <form action={submit}><button disabled={saving} className="w-full rounded-lg bg-accent px-4 py-3 font-bold text-dark disabled:opacity-50">{saving ? 'Ingresando…' : 'Confirmar check-in'}</button></form>}</div></main>;
}
