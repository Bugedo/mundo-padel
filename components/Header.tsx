'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { LogIn, User, Calendar } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Mostrar header después de 100px de scroll o cuando se hace scroll hacia arriba
      if (currentScrollY > 100 || currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
      <AnimatePresence>
        {isVisible && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm shadow-md border-b border-muted"
          >
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
              <span className="text-xl font-bold text-neutral">Cargando...</span>
            </div>
          </motion.header>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm shadow-md border-b border-muted"
        >
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/photos/logo.PNG"
                alt="Mundo Pádel"
                width={180}
                height={180}
                className="w-12 h-auto"
              />
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
        </motion.header>
      )}
    </AnimatePresence>
  );
}
