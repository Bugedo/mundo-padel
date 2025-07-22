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
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/');
  }

  const navItems = [
    { name: 'Orders', href: '/admin/orders' },
    { name: 'Products', href: '/admin/products' },
    { name: 'Users', href: '/admin/users' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 text-2xl font-bold border-b border-gray-700">Admin Panel</div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded ${
                pathname.startsWith(item.href) ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-100 p-6">{children}</main>
    </div>
  );
}
