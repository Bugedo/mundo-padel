'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import supabase from '@/lib/supabaseClient';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const safeNext = () => {
    const next = searchParams.get('next') || '/admin/bookings';
    return next.startsWith('/admin') ? next : '/admin/bookings';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('429') || error.message.includes('Too many requests')) {
        setMessage('❌ Demasiados intentos. Esperá unos minutos e intentá de nuevo.');
      } else if (error.message.includes('Invalid login credentials')) {
        setMessage('❌ Email o contraseña incorrectos.');
      } else {
        setMessage(`❌ ${error.message}`);
      }
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setMessage('❌ No se pudo iniciar sesión.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setMessage('❌ Acceso solo para administradores.');
      setLoading(false);
      return;
    }

    router.push(safeNext());
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!email) {
      setMessage('❌ Ingresá tu email');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setShowResetModal(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-surface border border-muted rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary text-center mb-2">Admin</h1>
        <p className="text-neutral text-sm text-center mb-6">
          Acceso exclusivo para recepción / administración
        </p>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded border border-muted bg-background text-white"
                  required
                />
              </div>
            </div>
            {message && <p className="text-sm text-center">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-dark py-2 rounded font-semibold hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setMessage('');
              }}
              className="w-full text-sm text-neutral hover:text-primary"
            >
              Volver al login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded border border-muted bg-background text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-neutral mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded border border-muted bg-background text-white"
                required
              />
            </div>
            {message && <p className="text-sm text-center">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-dark py-2 rounded font-semibold hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(true);
                setMessage('');
              }}
              className="w-full text-sm text-neutral hover:text-primary"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-surface border border-muted rounded-lg p-6 max-w-sm w-full text-center">
            <p className="text-neutral mb-4">
              Si el email existe, te enviamos un enlace para restablecer la contraseña.
            </p>
            <button
              onClick={() => {
                setShowResetModal(false);
                setIsForgotPassword(false);
              }}
              className="bg-accent text-dark px-4 py-2 rounded font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-neutral">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
