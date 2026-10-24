'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

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
      const { data: initialProfile } = await supabase
        .from('profiles')
        .select('id, email, role, full_name')
        .eq('id', user.id)
        .single();

      let profile = initialProfile;

      // The database trigger creates profiles. Its write can briefly lag behind
      // the first OAuth session, so retry once before treating it as absent.
      if (!profile) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: retriedProfile } = await supabase
          .from('profiles')
          .select('id, email, role, full_name')
          .eq('id', user.id)
          .single();
        profile = retriedProfile;
      }

      if (profile) {
        setUser(profile as User);
      } else {
        setUser(null);
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
