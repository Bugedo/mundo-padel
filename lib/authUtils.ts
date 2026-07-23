import { createClient } from '@/utils/supabase/server';

export async function validateAdminUser() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isAdmin: false, error: 'Not authenticated' };
    }

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
