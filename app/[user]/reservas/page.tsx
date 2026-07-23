'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy "mis reservas" — guests no longer have accounts. */
export default function UserBookingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-neutral">
      Redirigiendo…
    </div>
  );
}
