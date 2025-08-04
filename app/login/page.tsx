'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { LogIn, User, Mail, Phone, UserCheck, Key } from 'lucide-react';

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
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

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
        setMessage(`❌ ${error.message}`);
      } else {
        setShowVerificationModal(true);
        setMessage('');
      }
    } else {
      // LOGIN user
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(`❌ ${error.message}`);
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
    setVerificationCode('');
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setMessage('❌ Por favor ingresa el código de verificación');
      return;
    }

    setVerifying(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup',
      });

      if (error) {
        setMessage(`❌ ${error.message}`);
      } else {
        setMessage('✅ ¡Cuenta verificada exitosamente!');
        setTimeout(() => {
          handleCloseVerificationModal();
          router.push('/');
        }, 2000);
      }
    } catch (err) {
      setMessage('❌ Error al verificar el código');
    } finally {
      setVerifying(false);
    }
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
              <p className="text-neutral mb-4">
                Te hemos enviado un código de verificación a <strong>{email}</strong>
              </p>
              <p className="text-sm text-neutral mb-6">
                Por favor revisa tu bandeja de entrada e ingresa el código de 6 dígitos que
                recibiste.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-neutral">
                  Código de verificación
                </label>
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-muted" />
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="flex-1 border border-muted rounded px-3 py-2 bg-surface text-neutral text-center text-lg tracking-widest"
                    style={{ letterSpacing: '0.5em' }}
                  />
                </div>
              </div>

              {message && <p className="text-center text-sm text-neutral mb-4">{message}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleVerifyCode}
                  disabled={verifying || !verificationCode.trim()}
                  className="flex-1 bg-success text-light px-4 py-2 rounded hover:bg-success/80 disabled:opacity-50"
                >
                  {verifying ? 'Verificando...' : 'Verificar'}
                </button>
                <button
                  onClick={handleCloseVerificationModal}
                  className="bg-accent text-neutral px-4 py-2 rounded hover:bg-accent-hover"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
