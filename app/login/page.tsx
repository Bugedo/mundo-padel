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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

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
        const { error } = await supabase.auth.signUp({
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!email.trim()) {
      setMessage('❌ Por favor ingresa tu email');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        if (error.message.includes('429') || error.message.includes('Too many requests')) {
          setMessage(
            '❌ Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente.',
          );
        } else {
          setMessage(`❌ ${error.message}`);
        }
      } else {
        setShowResetModal(true);
        setMessage('');
      }
    } catch (resetError) {
      console.error('Password reset exception:', resetError);
      setMessage('❌ Error inesperado. Por favor intenta nuevamente.');
    }

    setLoading(false);
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setIsForgotPassword(false);
    setEmail('');
    setMessage('');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <form
        onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit}
        className="bg-surface-light shadow-xl rounded-xl p-8 w-full max-w-md space-y-6 border border-muted"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-dark font-bold text-2xl">MP</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral mb-2">
            {isForgotPassword
              ? 'Recuperar Contraseña'
              : isRegister
                ? 'Registrarse'
                : 'Iniciar Sesión'}
          </h1>
          <p className="text-neutral-muted">
            {isForgotPassword
              ? 'Te enviaremos un enlace para restablecer tu contraseña'
              : isRegister
                ? 'Crea tu cuenta en Mundo Padel'
                : 'Accede a tu cuenta'}
          </p>
        </div>

        {isRegister && !isForgotPassword && (
          <div>
            <label className="flex items-center gap-2 mb-2 text-neutral font-medium">
              <User size={16} className="text-accent" />
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-muted rounded-lg px-4 py-3 bg-surface text-neutral placeholder-neutral-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              placeholder="Juan Pérez"
            />
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 mb-2 text-neutral font-medium">
            <Mail size={16} className="text-accent" />
            Email *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-muted rounded-lg px-4 py-3 bg-surface text-neutral placeholder-neutral-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            placeholder="juan@ejemplo.com"
          />
        </div>

        {isRegister && !isForgotPassword && (
          <div>
            <label className="flex items-center gap-2 mb-2 text-neutral font-medium">
              <Phone size={16} className="text-accent" />
              Teléfono *
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="border border-muted rounded-lg px-3 py-3 text-sm bg-surface text-neutral focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
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
                className="flex-1 border border-muted rounded-lg px-4 py-3 bg-surface text-neutral placeholder-neutral-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                placeholder="351 1234-5678"
              />
            </div>
          </div>
        )}

        {!isForgotPassword && (
          <div>
            <label className="block mb-2 text-neutral font-medium">Contraseña *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-muted rounded-lg px-4 py-3 bg-surface text-neutral placeholder-neutral-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              placeholder={isRegister ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
            />
            {isRegister && (
              <p className="text-xs text-neutral-muted mt-2">
                La contraseña debe tener al menos 6 caracteres
              </p>
            )}
          </div>
        )}

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
          disabled={loading}
          className="w-full bg-accent text-dark font-semibold px-6 py-3 rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
        >
          {loading
            ? isForgotPassword
              ? 'Enviando...'
              : isRegister
                ? 'Registrando...'
                : 'Iniciando sesión...'
            : isForgotPassword
              ? 'Enviar Enlace'
              : isRegister
                ? 'Registrarse'
                : 'Iniciar Sesión'}
        </button>

        <div className="text-center space-y-3">
          {!isForgotPassword && (
            <p className="text-sm text-neutral-muted">
              {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setMessage('');
                  setFullName('');
                  setPhone('');
                }}
                className="text-accent hover:text-accent-hover font-medium transition-colors"
              >
                {isRegister ? 'Iniciar Sesión' : 'Registrarse'}
              </button>
            </p>
          )}

          {!isRegister && !isForgotPassword && (
            <p className="text-sm text-neutral-muted">
              ¿Olvidaste tu contraseña?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setMessage('');
                }}
                className="text-accent hover:text-accent-hover font-medium transition-colors"
              >
                Recuperar contraseña
              </button>
            </p>
          )}

          {isForgotPassword && (
            <p className="text-sm text-neutral-muted">
              ¿Recordaste tu contraseña?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setMessage('');
                }}
                className="text-accent hover:text-accent-hover font-medium transition-colors"
              >
                Volver al login
              </button>
            </p>
          )}
        </div>
      </form>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-dark bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-light rounded-xl p-8 max-w-md w-full border border-muted shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCheck size={32} className="text-light" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-neutral">¡Cuenta creada exitosamente!</h2>

              <div className="bg-accent/10 border border-accent rounded-lg p-4 mb-6">
                <p className="text-neutral mb-2 font-medium">
                  📧 <strong>Verificación por email enviada</strong>
                </p>
                <p className="text-sm text-neutral-muted">
                  Hemos enviado un email de verificación a:
                </p>
                <p className="text-sm font-medium text-accent mt-1">{email}</p>
              </div>

              <div className="text-left bg-surface border border-muted rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-neutral mb-3">
                  📋 Pasos para verificar tu cuenta:
                </h3>
                <ol className="text-sm text-neutral space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="bg-accent text-dark rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Revisa tu bandeja de entrada (y carpeta de spam)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-accent text-dark rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Haz clic en el enlace de verificación del email</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-accent text-dark rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Serás redirigido automáticamente al sitio</span>
                  </li>
                </ol>
              </div>

              <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-6">
                <p className="text-sm text-warning font-medium">
                  ⏰ <strong>Importante:</strong> El enlace de verificación expira en 24 horas
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseVerificationModal}
                  className="flex-1 bg-accent text-dark font-semibold px-4 py-3 rounded-lg hover:bg-accent-hover transition-all"
                >
                  Entendido
                </button>
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    setIsRegister(false);
                    setMessage('');
                  }}
                  className="bg-muted text-neutral px-4 py-3 rounded-lg hover:bg-muted-light transition-all"
                >
                  Ir al Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-dark bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-light rounded-xl p-8 max-w-md w-full border border-muted shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail size={32} className="text-light" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-neutral">¡Enlace enviado!</h2>

              <div className="bg-accent/10 border border-accent rounded-lg p-4 mb-6">
                <p className="text-neutral mb-2 font-medium">
                  📧 <strong>Enlace de recuperación enviado</strong>
                </p>
                <p className="text-sm text-neutral-muted">
                  Hemos enviado un enlace para restablecer tu contraseña a:
                </p>
                <p className="text-sm font-medium text-accent mt-1">{email}</p>
              </div>

              <div className="text-left bg-surface border border-muted rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-neutral mb-3">
                  📋 Pasos para restablecer tu contraseña:
                </h3>
                <ol className="text-sm text-neutral space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="bg-accent text-dark rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Revisa tu bandeja de entrada (y carpeta de spam)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-accent text-dark rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Haz clic en el enlace de recuperación del email</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-accent text-dark rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Ingresa tu nueva contraseña</span>
                  </li>
                </ol>
              </div>

              <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-6">
                <p className="text-sm text-warning font-medium">
                  ⏰ <strong>Importante:</strong> El enlace de recuperación expira en 1 hora
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseResetModal}
                  className="flex-1 bg-accent text-dark font-semibold px-4 py-3 rounded-lg hover:bg-accent-hover transition-all"
                >
                  Entendido
                </button>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setIsForgotPassword(false);
                    setMessage('');
                  }}
                  className="bg-muted text-neutral px-4 py-3 rounded-lg hover:bg-muted-light transition-all"
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
