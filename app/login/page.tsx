'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, UserCheck } from 'lucide-react';
import supabase from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+54');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isRegister) {
      // Validate registration fields
      if (!fullName.trim()) {
        setMessage('❌ El nombre completo es obligatorio');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setMessage('❌ La contraseña debe tener al menos 6 caracteres');
        setLoading(false);
        return;
      }

      const fullPhone = `${countryCode}${phone}`;

      // REGISTER user
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: fullPhone,
            },
          },
        });

        if (error) {
          console.error('Signup error:', error);
          // Handle specific error types
          if (error.message.includes('429') || error.message.includes('Too many requests')) {
            setMessage(
              '❌ Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente.',
            );
          } else if (error.message.includes('Email not confirmed')) {
            setMessage('❌ Por favor verifica tu email antes de continuar.');
          } else if (
            error.message.includes('500') ||
            error.message.includes('Internal server error')
          ) {
            setMessage('❌ Error del servidor. Por favor intenta nuevamente en unos minutos.');
          } else {
            setMessage(`❌ ${error.message}`);
          }
        } else {
          console.log('Signup successful:', data);
          setShowVerificationModal(true);
          setMessage('');
        }
      } catch (signupError) {
        console.error('Signup exception:', signupError);
        setMessage('❌ Error inesperado durante el registro. Por favor intenta nuevamente.');
      }
    } else {
      // LOGIN user
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error types
        if (error.message.includes('429') || error.message.includes('Too many requests')) {
          setMessage(
            '❌ Demasiados intentos de login. Por favor espera unos minutos antes de intentar nuevamente.',
          );
        } else if (error.message.includes('Invalid login credentials')) {
          setMessage('❌ Email o contraseña incorrectos.');
        } else {
          setMessage(`❌ ${error.message}`);
        }
      } else {
        router.push('/'); // Redirect after login
      }
    }

    setLoading(false);
  };

  const handlePhoneFocus = () => {
    if (!phone) {
      setPhone('351'); // Default to Córdoba area code
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
  };

  const handleCloseVerificationModal = () => {
    setShowVerificationModal(false);
    setIsRegister(false);
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setMessage('');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <form
        onSubmit={handleSubmit}
        className="bg-surface shadow rounded p-6 w-full max-w-sm space-y-4 border border-muted"
      >
        <h1 className="text-2xl font-bold text-center text-neutral">
          {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
        </h1>

        {isRegister && (
          <div>
            <label className="block mb-1 flex items-center gap-2 text-neutral">
              <User size={16} />
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-muted rounded px-3 py-2 bg-surface text-neutral"
              placeholder="Juan Pérez"
            />
          </div>
        )}

        <div>
          <label className="block mb-1 flex items-center gap-2 text-neutral">
            <Mail size={16} />
            Email *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-muted rounded px-3 py-2 bg-surface text-neutral"
            placeholder="juan@ejemplo.com"
          />
        </div>

        {isRegister && (
          <div>
            <label className="block mb-1 flex items-center gap-2 text-neutral">
              <Phone size={16} />
              Teléfono *
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="border border-muted rounded px-2 py-2 text-sm bg-surface text-neutral"
              >
                <option value="+54">🇦🇷 +54</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+52">🇲🇽 +52</option>
                <option value="+57">🇨🇴 +57</option>
                <option value="+58">🇻🇪 +58</option>
                <option value="+51">🇵🇪 +51</option>
                <option value="+56">🇨🇱 +56</option>
              </select>
              <input
                type="tel"
                required
                value={phone}
                onChange={handlePhoneChange}
                onFocus={handlePhoneFocus}
                className="flex-1 border border-muted rounded px-3 py-2 bg-surface text-neutral"
                placeholder="351 1234-5678"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block mb-1 text-neutral">Contraseña *</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-muted rounded px-3 py-2 bg-surface text-neutral"
            placeholder={isRegister ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
          />
          {isRegister && (
            <p className="text-xs text-neutral mt-1">
              La contraseña debe tener al menos 6 caracteres
            </p>
          )}
        </div>

        {message && <p className="text-center text-sm text-neutral">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-success text-light px-4 py-2 rounded hover:bg-success/80 disabled:opacity-50"
        >
          {loading
            ? isRegister
              ? 'Registrando...'
              : 'Iniciando sesión...'
            : isRegister
              ? 'Registrarse'
              : 'Iniciar Sesión'}
        </button>

        <p className="text-center text-sm text-neutral">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage('');
              setFullName('');
              setPhone('');
            }}
            className="text-primary hover:underline"
          >
            {isRegister ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </p>
      </form>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md mx-4 border border-muted">
            <div className="text-center">
              <UserCheck size={48} className="mx-auto text-success mb-4" />
              <h2 className="text-xl font-bold mb-2 text-neutral">¡Cuenta creada exitosamente!</h2>

              <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-4">
                <p className="text-neutral mb-2">
                  📧 <strong>Verificación por email enviada</strong>
                </p>
                <p className="text-sm text-neutral">Hemos enviado un email de verificación a:</p>
                <p className="text-sm font-medium text-primary mt-1">{email}</p>
              </div>

              <div className="text-left bg-surface border border-muted rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-neutral mb-2">
                  📋 Pasos para verificar tu cuenta:
                </h3>
                <ol className="text-sm text-neutral space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-light rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Revisa tu bandeja de entrada (y carpeta de spam)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-light rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Haz clic en el enlace de verificación del email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-light rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Serás redirigido automáticamente al sitio</span>
                  </li>
                </ol>
              </div>

              <div className="bg-warning/10 border border-warning rounded-lg p-3 mb-4">
                <p className="text-sm text-warning">
                  ⏰ <strong>Importante:</strong> El enlace de verificación expira en 24 horas
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseVerificationModal}
                  className="flex-1 bg-primary text-light px-4 py-2 rounded hover:bg-primary/80"
                >
                  Entendido
                </button>
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    setIsRegister(false);
                    setMessage('');
                  }}
                  className="bg-accent text-neutral px-4 py-2 rounded hover:bg-accent-hover"
                >
                  Ir al Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
