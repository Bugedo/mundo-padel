'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isRegister) {
      // REGISTER user
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(`❌ ${error.message}`);
      } else {
        router.push('/'); // Redirect to home
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
        router.push('/'); // Redirect to home
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">{isRegister ? 'Register' : 'Login'}</h1>

        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {message && <p className="text-center text-sm text-gray-600">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading
            ? isRegister
              ? 'Registering...'
              : 'Logging in...'
            : isRegister
              ? 'Register'
              : 'Login'}
        </button>

        <p className="text-center text-sm">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-600 hover:underline"
          >
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </form>
    </div>
  );
}
