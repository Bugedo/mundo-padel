'use client';

import { useEffect, useState } from 'react';

function remaining(endsAt: string | null | undefined) {
  if (!endsAt) return null;
  return Math.max(0, new Date(endsAt).valueOf() - Date.now());
}

export default function SocialTimer({ endsAt, large = false }: { endsAt?: string | null; large?: boolean }) {
  const [milliseconds, setMilliseconds] = useState(() => remaining(endsAt));
  useEffect(() => {
    setMilliseconds(remaining(endsAt));
    const interval = window.setInterval(() => setMilliseconds(remaining(endsAt)), 1000);
    return () => window.clearInterval(interval);
  }, [endsAt]);
  if (milliseconds === null) return null;
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  return <span className={`font-bold tabular-nums text-accent ${large ? 'text-5xl md:text-7xl' : 'text-2xl'}`}>{minutes}:{String(seconds).padStart(2, '0')}</span>;
}
