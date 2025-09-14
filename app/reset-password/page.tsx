'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import supabase from '@/lib/supabaseClient';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Set the session with the tokens from the URL
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error setting session:', error);
            setMessage(
              '❌ Enlace inválido o expirado. Por favor solicita un nuevo enlace de recuperación.',
            );
          } else {
            setIsValidSession(true);
          }
        });
    } else {
      setMessage('❌ Enlace inválido. Por favor solicita un nuevo enlace de recuperación.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validate passwords
    if (password.length < 6) {
      setMessage('❌ La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('❌ Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Password update error:', error);
        setMessage(`❌ ${error.message}`);
      } else {
        setMessage('✅ Contraseña actualizada exitosamente. Redirigiendo al login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (updateError) {
      console.error('Password update exception:', updateError);
      setMessage('❌ Error inesperado. Por favor intenta nuevamente.');
    }

    setLoading(false);
  };

  if (!isValidSession && !message.includes('❌')) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-neutral">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-light shadow-xl rounded-xl p-8 w-full max-w-md space-y-6 border border-muted"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-dark" />
          </div>
          <h1 className="text-3xl font-bold text-neutral mb-2">Nueva Contraseña</h1>
          <p className="text-neutral-muted">
            Ingresa tu nueva contraseña para completar el proceso
          </p>
        </div>

        {/* Password field */}
        <div>
          <label className="block mb-2 text-neutral font-medium">Nueva Contraseña *</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-muted rounded-lg px-4 py-3 pr-12 bg-surface text-neutral placeholder-neutral-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-muted hover:text-neutral transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className="text-xs text-neutral-muted mt-2">
            La contraseña debe tener al menos 6 caracteres
          </p>
        </div>

        {/* Confirm Password field */}
        <div>
          <label className="block mb-2 text-neutral font-medium">Confirmar Contraseña *</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-muted rounded-lg px-4 py-3 pr-12 bg-surface text-neutral placeholder-neutral-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              placeholder="Repite tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-muted hover:text-neutral transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes('❌')
                ? 'bg-error-light text-error border border-error'
                : 'bg-success-light text-success border border-success'
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isValidSession}
          className="w-full bg-accent text-dark font-semibold px-6 py-3 rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
        >
          {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
        </button>

        <div className="text-center">
          <p className="text-sm text-neutral-muted">
            ¿Recordaste tu contraseña?{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-accent hover:text-accent-hover font-medium transition-colors"
            >
              Volver al login
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-neutral">Cargando...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
