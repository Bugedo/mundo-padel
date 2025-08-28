'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
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

  const fetchUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Try to fetch profile
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, role, full_name')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist → create it
      if (!profile && !error) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email ?? '', // fallback
          role: 'user', // default role
          full_name: user.user_metadata?.full_name || null,
        });

        if (!insertError) {
          profile = {
            id: user.id,
            email: user.email ?? '',
            role: 'user',
            full_name: user.user_metadata?.full_name || null,
          };
        }
      }

      if (profile) {
        setUser(profile as User);
      }
    } else {
      setUser(null); // Clear user if logged out
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUserProfile();

    // Listen for login/logout events
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserProfile();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
