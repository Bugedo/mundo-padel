'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';

interface User {
  id: string;
  email: string;
  role: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getUser = async () => {
    // Get the current user session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Fetch user profile including role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUser(profile as User);
      }
    } else {
      setUser(null); // Clear user if logged out
    }

    setLoading(false);
  };

  useEffect(() => {
    getUser();

    // Listen for login/logout events
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      getUser(); // Refresh user data on session change
    });

    // Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>;
};

// Hook to use user context
export const useUser = () => useContext(UserContext);
