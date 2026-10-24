'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import GoogleSignIn from '@/components/GoogleSignIn';
import LogoutButton from '@/components/LogoutButton';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const links = [
  { href: '#turnero', label: 'Reservar' },
  { href: '#social', label: 'Social de los viernes' },
  { href: '#info', label: 'Cómo llegar' },
];

function getLoginDestination() {
  if (typeof window === 'undefined') {
    return '/';
  }

  const requestedNext = new URLSearchParams(window.location.search).get('next');
  if (window.location.pathname === '/login' && requestedNext) {
    return requestedNext;
  }

  return `${window.location.pathname}${window.location.search}`;
}

function UserIdentity({ user }: { user: SupabaseUser }) {
  const fullName =
    typeof user.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name
      : (user.email ?? 'Mi cuenta');
  const avatarUrl =
    typeof user.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : undefined;

  return (
    <div className="flex min-w-0 items-center gap-2">
      {avatarUrl ? (
        // Google avatar hosts are user-provided and cannot be safely constrained in next.config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-9 w-9 rounded-full border border-muted object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-light text-sm font-bold text-accent"
          aria-hidden="true"
        >
          {fullName.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="max-w-32 truncate text-sm font-semibold text-neutral">{fullName}</span>
    </div>
  );
}

export default function Header() {
  const { user: profile } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authError, setAuthError] = useState('');
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAuthUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const authActions = authUser ? (
    <>
      <UserIdentity user={authUser} />
      {profile?.role === 'admin' && (
        <Link
          href="/admin"
          onClick={closeMenu}
          className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-dark"
        >
          Panel
        </Link>
      )}
      <LogoutButton
        onLogout={closeMenu}
        className="rounded-full border border-muted px-4 py-2 text-sm font-semibold text-neutral hover:border-error hover:text-error-light"
      />
    </>
  ) : (
    <GoogleSignIn
      next={getLoginDestination()}
      oneTap={pathname === '/'}
      size="medium"
      type="standard"
      onError={setAuthError}
    />
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-muted bg-background/95 text-neutral backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-[1180px] items-center gap-5 px-5">
        <Link href="/" aria-label="Mundo Pádel, inicio" className="shrink-0">
          <Image
            src="/photos/logo.PNG"
            alt="Mundo Pádel"
            width={52}
            height={52}
            priority
            className="h-[52px] w-[52px] rounded-full object-cover"
          />
        </Link>

        <nav
          aria-label="Principal"
          className="hidden items-center gap-6 pl-2 text-[15px] font-semibold md:flex"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">{authActions}</div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-muted hover:border-accent md:hidden"
        >
          <span className="sr-only">{menuOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {authError && (
        <p
          role="alert"
          className="border-t border-error bg-error/10 px-5 py-2 text-center text-sm text-error-light"
        >
          {authError}
        </p>
      )}

      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Principal"
          className="border-t border-muted bg-background px-5 pb-5 md:hidden"
        >
          <div className="mx-auto grid max-w-[1180px] gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-2 font-semibold hover:bg-surface-light hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-3">{authActions}</div>
          </div>
        </nav>
      )}
    </header>
  );
}
