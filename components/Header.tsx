'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import LogoutButton from '@/components/LogoutButton';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const links = [
  { href: '#turnero', label: 'Reservar' },
  { href: '#social', label: 'Social de los viernes' },
  { href: '#info', label: 'Cómo llegar' },
];

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        fill="currentColor"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
        opacity=".75"
      />
      <path
        fill="currentColor"
        d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"
        opacity=".55"
      />
      <path
        fill="currentColor"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z"
        opacity=".9"
      />
    </svg>
  );
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authError, setAuthError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
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

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setAuthError('');

    const next = `${window.location.pathname}${window.location.search}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setAuthError(`No pudimos iniciar sesión con Google: ${error.message}`);
      setOauthLoading(false);
    }
  };

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
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={oauthLoading}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-[18px] py-[11px] text-[15px] font-semibold text-dark transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleMark />
      {oauthLoading ? 'Redirigiendo…' : 'Entrar con Google'}
    </button>
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
