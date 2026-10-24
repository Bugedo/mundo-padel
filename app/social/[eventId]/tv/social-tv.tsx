'use client';

import SocialBoard from '@/components/social/SocialBoard';
import { useCallback, useEffect, useState } from 'react';

type Board = { event: { title: string }; attendees: Array<{ attendee_id: string; name: string; gender: string | null; level: number | null; left_at: string | null }>; round: { number: number; status: 'live'; ends_at: string | null; social_matches: Array<{ court: number; team_a: string[]; team_b: string[] }> } | null; next_round: { number: number; status: 'preview'; ends_at: string | null; social_matches: Array<{ court: number; team_a: string[]; team_b: string[] }> } | null };

export default function SocialTv({ eventId }: { eventId: string }) {
  const [board, setBoard] = useState<Board | null>(null); const [error, setError] = useState('');
  const load = useCallback(async () => { const response = await fetch(`/api/social/events/${eventId}/board`, { cache: 'no-store' }); const data = await response.json(); if (response.ok) setBoard(data); else setError(data.error || 'No se pudo cargar la pantalla.'); }, [eventId]);
  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 5000); return () => window.clearInterval(interval); }, [load]);
  if (error) return <main className="p-10 text-2xl text-error-light">{error}</main>;
  if (!board) return <main className="p-10 text-2xl text-neutral-muted">Cargando…</main>;
  return <main className="min-h-screen bg-background p-8"><header className="mb-8 flex items-end justify-between"><div><p className="font-bold uppercase tracking-[0.3em] text-accent">Mundo Pádel</p><h1 className="text-5xl font-extrabold">{board.event.title}</h1></div><p className="text-xl text-neutral-muted">Actualización automática</p></header><SocialBoard attendees={board.attendees} round={board.round || board.next_round} large /></main>;
}
