'use client';

import { useUser } from '@/context/UserContext';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();

  if (loading) {
    return <div className="p-8 bg-background text-neutral">Cargando...</div>;
  }

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/');
  }

  const navItems = [
    { name: 'Reservas', href: '/admin/bookings' },
    { name: 'Reservas Recurrentes', href: '/admin/recurring-bookings' },
    { name: 'Usuarios', href: '/admin/users' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-surface border-r border-muted flex flex-col">
        <div className="p-4 text-2xl font-bold border-b border-muted text-neutral">Admin Panel</div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-primary text-light'
                  : 'text-neutral hover:bg-accent hover:text-light'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 bg-background text-neutral p-6">{children}</main>
    </div>
  );
}
