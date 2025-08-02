import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function validateAdminUser() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Ignore setAll in server components
          },
        },
      },
    );

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isAdmin: false, error: 'Not authenticated' };
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false, error: 'Profile not found' };
    }

    if (profile.role !== 'admin') {
      return { isAdmin: false, error: 'Not admin' };
    }

    return { isAdmin: true, user };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { isAdmin: false, error: 'Server error' };
  }
}
