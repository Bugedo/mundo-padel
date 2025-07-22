'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { LogIn, User } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

export default function Header() {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu when user changes (login/logout)
  useEffect(() => {
    setMenuOpen(false);
  }, [user]);

  if (loading) {
    // Optionally show a skeleton or spinner
    return (
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-xl font-bold">Loading...</span>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-gray-800">
          MyStore
        </Link>

        {/* Navigation */}
        <nav className="flex gap-4 items-center">
          <Link href="/" className="text-gray-700 hover:text-black">
            Home
          </Link>
          <Link href="/about" className="text-gray-700 hover:text-black">
            About
          </Link>
          <Link href="/contact" className="text-gray-700 hover:text-black">
            Contact
          </Link>

          {/* Right side: login or user */}
          {!user ? (
            <Link
              href="/login"
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              <LogIn size={18} />
              Login
            </Link>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1 text-gray-700 hover:text-black"
              >
                <User size={24} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-10">
                  <div className="px-4 py-2 border-b text-gray-800">{user.email}</div>
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
