'use client';

import { useUser } from '@/context/UserContext';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default function AdminPage() {
  const { user, loading } = useUser();

  if (loading) {
    // Show loading state while user data is fetched
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    // User is not logged in → redirect to login
    redirect('/login');
  }

  if (user.role !== 'admin') {
    // User is not admin → redirect to home
    redirect('/');
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p>Welcome, Admin!</p>
      <div className="mt-4">
        <LogoutButton />
      </div>
    </div>
  );
}
