'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

function isSafeNext(next: string | null): next is string {
  return Boolean(next && /^\/(?![\/\\])/.test(next));
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
        opacity=".75"
      />
      <path
        fill="currentColor"
        d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"
        opacity=".55"
      />
      <path
        fill="currentColor"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z"
        opacity=".9"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get('error') === 'auth'
      ? 'No pudimos completar el inicio de sesión con Google. Intentá nuevamente.'
      : '',
  );

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');

    const requestedNext = searchParams.get('next');
    const next = isSafeNext(requestedNext) ? requestedNext : '/';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setErrorMessage(`No pudimos iniciar sesión con Google: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-muted bg-surface p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-primary">Ingresar</h1>
        <p className="mb-6 text-center text-sm text-neutral">
          Continuá con tu cuenta de Google para reservar o gestionar Mundo Pádel.
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-error bg-error/10 p-3 text-center text-sm text-error-light"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded bg-accent py-3 font-semibold text-dark transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleMark />
          {loading ? 'Redirigiendo a Google…' : 'Continuar con Google'}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-neutral">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
