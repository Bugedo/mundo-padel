'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { LogIn, User, Calendar } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

export default function Header() {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  if (loading) {
    return (
      <header className="bg-surface shadow-md border-b border-muted">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-xl font-bold text-neutral">Cargando...</span>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-surface shadow-md border-b border-muted">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-neutral">
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1 text-primary hover:text-accent transition"
              >
                <User size={24} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background border border-muted rounded shadow z-10">
                  <div className="px-4 py-2 border-b border-muted text-neutral text-sm">
                    {user.email}
                  </div>
                  <div className="px-4 py-2">
                    <Link
                      href={`/${user.id}/reservas`}
                      className="flex items-center gap-2 text-neutral hover:text-primary transition mb-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Calendar size={16} />
                      Ver mis reservas
                    </Link>
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
