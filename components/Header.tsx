'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { LogIn, User } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

export default function Header() {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [user]);

  if (loading) {
    return (
      <header className="bg-background shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-xl font-bold text-accent">Cargando...</span>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-background shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-accent">
          Mundo Pádel
        </Link>

        {/* Right side: login or user */}
        <nav className="flex gap-4 items-center">
          {!user ? (
            <Link
              href="/login"
              className="flex items-center gap-2 bg-accent text-background px-3 py-1.5 rounded hover:bg-accent-hover transition"
            >
              <LogIn size={18} />
              Iniciar sesión
            </Link>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1 text-primary hover:text-accent transition"
              >
                <User size={24} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background border border-muted rounded shadow z-10">
                  <div className="px-4 py-2 border-b border-muted text-white text-sm">
                    {user.email}
                  </div>
                  <div className="px-4 py-2">
                    <LogoutButton onLogout={() => setMenuOpen(false)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
