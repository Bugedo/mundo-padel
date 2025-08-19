'use client';

import supabase from '@/lib/supabaseClient';

export default function LogoutButton({ onLogout }: { onLogout?: () => void }) {

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (!error) {
        // Close the menu (optional callback)
        if (onLogout) onLogout();

        // Force redirect to home page
        window.location.href = '/';
      } else {
        console.error('Logout error:', error);
      }
    } catch (error) {
      console.error('Logout exception:', error);
      // Force redirect even if there's an error
      window.location.href = '/';
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
