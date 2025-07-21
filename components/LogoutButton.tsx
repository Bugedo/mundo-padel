'use client';

import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (!error) {
      // Redirect to login page after logout
      router.push('/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
    >
      Logout
    </button>
  );
}
