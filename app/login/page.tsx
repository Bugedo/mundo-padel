'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import GoogleSignIn from '@/components/GoogleSignIn';

function LoginForm() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get('error') === 'auth'
      ? 'No pudimos completar el inicio de sesión con Google. Intentá nuevamente.'
      : '',
  );

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

        <GoogleSignIn next={searchParams.get('next') ?? undefined} onError={setErrorMessage} />
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
