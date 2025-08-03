'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { LogIn, User, Mail, Phone, UserCheck } from 'lucide-react';

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
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">
          {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
        </h1>

        {isRegister && (
          <div>
            <label className="block mb-1 flex items-center gap-2">
              <User size={16} />
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Juan Pérez"
            />
          </div>
        )}

        <div>
          <label className="block mb-1 flex items-center gap-2">
            <Mail size={16} />
            Email *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="juan@ejemplo.com"
          />
        </div>

        {isRegister && (
          <div>
            <label className="block mb-1 flex items-center gap-2">
              <Phone size={16} />
              Teléfono *
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="border rounded px-2 py-2 text-sm"
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
                className="flex-1 border rounded px-3 py-2"
                placeholder="351 1234-5678"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block mb-1">Contraseña *</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder={isRegister ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
          />
          {isRegister && (
            <p className="text-xs text-gray-500 mt-1">
              La contraseña debe tener al menos 6 caracteres
            </p>
          )}
        </div>

        {message && <p className="text-center text-sm text-gray-600">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? isRegister
              ? 'Registrando...'
              : 'Iniciando sesión...'
            : isRegister
              ? 'Registrarse'
              : 'Iniciar Sesión'}
        </button>

        <p className="text-center text-sm">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage('');
              setFullName('');
              setPhone('');
            }}
            className="text-blue-600 hover:underline"
          >
            {isRegister ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </p>
      </form>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="text-center">
              <UserCheck size={48} className="mx-auto text-green-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">¡Cuenta creada exitosamente!</h2>
              <p className="text-gray-600 mb-4">
                Te hemos enviado un email de verificación a <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Por favor revisa tu bandeja de entrada y haz clic en el enlace de verificación para
                activar tu cuenta.
              </p>
              <button
                onClick={handleCloseVerificationModal}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
