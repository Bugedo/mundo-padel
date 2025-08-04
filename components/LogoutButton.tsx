'use client';

import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';

export default function LogoutButton({ onLogout }: { onLogout?: () => void }) {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      // Close the menu (optional callback)
      if (onLogout) onLogout();

      // Redirect to home page
      router.push('/');
    }
  };

  return (
    <button
      onClick={handleLogout}
              className="w-full bg-error text-light px-4 py-2 rounded hover:bg-error/80 text-left"
    >
      Logout
    </button>
  );
}
