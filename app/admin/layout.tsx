'use client';

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-neutral text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-neutral text-lg">Redirigiendo...</div>
      </div>
    );
  }

  const navItems = [
    { name: 'Reservas', href: '/admin/bookings' },
    { name: 'Reservas Recurrentes', href: '/admin/recurring-bookings' },
    { name: 'Usuarios', href: '/admin/users' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-light border-r border-muted flex flex-col shadow-lg mt-8">
        {/* Header */}
        <div className="p-6 border-b border-muted">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-dark font-bold text-sm">MP</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral">Admin Panel</h1>
              <p className="text-sm text-neutral-muted">Mundo Padel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                pathname.startsWith(item.href)
                  ? 'bg-accent text-dark shadow-md'
                  : 'text-neutral hover:bg-muted-light hover:text-light'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-muted">
          <div className="text-sm text-neutral-muted">
            <p>Usuario: {user.email}</p>
            <p className="text-xs mt-1">Panel de Administración</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-background">
        <div className="p-6 pt-8">{children}</div>
      </main>
    </div>
  );
}
