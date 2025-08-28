import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';

// Create admin client with service role key for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get('showAll') === 'true';

    // Build the query
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // If showAll is false, only show admins
    if (!showAll) {
      query = query.eq('role', 'admin');
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error in GET users:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userData = body as {
      email: string;
      full_name: string;
      phone?: string;
      password: string;
      role: string;
    };

    if (!userData.email || !userData.full_name || !userData.password) {
      return NextResponse.json(
        {
          error: 'Email, full_name, and password are required',
        },
        { status: 400 },
      );
    }

    if (userData.password.length < 6) {
      return NextResponse.json(
        {
          error: 'Password must be at least 6 characters long',
        },
        { status: 400 },
      );
    }

    // Check if user already exists in profiles table
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', userData.email)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking existing profile:', profileCheckError);
      return NextResponse.json(
        {
          error: 'Error checking existing user',
        },
        { status: 500 },
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          error: 'A user with this email already exists',
        },
        { status: 400 },
      );
    }

    // Clean up any orphaned profiles with the same email (in case of previous failed creation)
    const { error: cleanupError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('email', userData.email);

    if (cleanupError) {
      console.error('Error cleaning up orphaned profiles:', cleanupError);
      // Continue anyway, as this might not be critical
    }

    // Create user in Supabase Auth with email confirmation disabled
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: userData.full_name,
        phone: userData.phone || '',
      },
    });

    if (createAuthError) {
      console.error('Error creating auth user:', createAuthError);
      return NextResponse.json(
        {
          error: `Error creating user: ${createAuthError.message}`,
        },
        { status: 500 },
      );
    }

    if (!authUser.user) {
      return NextResponse.json(
        {
          error: 'Failed to create user',
        },
        { status: 500 },
      );
    }

    // Double-check that the user ID is not already in profiles table
    const { data: existingProfileWithId, error: idCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('id', authUser.user.id)
      .maybeSingle();

    if (idCheckError) {
      console.error('Error checking existing profile with ID:', idCheckError);
      // Clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        {
          error: 'Error checking user ID. Please try again.',
        },
        { status: 500 },
      );
    }

    if (existingProfileWithId) {
      console.error(
        'User ID already exists in profiles table:',
        authUser.user.id,
        'with email:',
        existingProfileWithId.email,
      );

      // If the existing profile has the same email, we can update it instead of creating a new one
      if (existingProfileWithId.email === userData.email) {
        console.log('Updating existing profile with new data');
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            full_name: userData.full_name,
            phone: userData.phone || '',
            role: userData.role || 'user',
          })
          .eq('id', authUser.user.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating existing profile:', updateError);
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          return NextResponse.json(
            {
              error: 'Error updating existing user profile.',
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          ...updatedProfile,
          message: 'User updated successfully and can login immediately',
        });
      } else {
        // Clean up the auth user if there's a real conflict
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        return NextResponse.json(
          {
            error: 'User ID conflict. Please try again.',
          },
          { status: 500 },
        );
      }
    }

    // Create profile in profiles table with upsert strategy
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authUser.user.id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone || '',
          role: userData.role || 'user',
        },
        {
          onConflict: 'id',
          ignoreDuplicates: false,
        },
      )
      .select()
      .single();

    if (profileError) {
      console.error('Error creating/updating profile:', profileError);

      // Try to clean up the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.log('Auth user cleaned up after profile creation failure');
      } catch (cleanupError) {
        console.error('Error cleaning up auth user:', cleanupError);
      }

      return NextResponse.json(
        {
          error: `Error creating user profile: ${profileError.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ...profile,
      message: 'User created successfully and can login immediately',
    });
  } catch (error: unknown) {
    console.error('Error in POST users:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}

// PATCH
export async function PATCH(req: Request) {
  try {
    // Add admin validation
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { id, updates } = await req.json();

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'Missing id or updates in request body.' },
        { status: 400 },
      );
    }

    // Validate allowed fields for updates
    const allowedFields = ['full_name', 'email', 'phone', 'role'];
    const safeUpdates = Object.keys(updates).reduce(
      (acc, key) => {
        if (allowedFields.includes(key)) {
          acc[key] = updates[key as keyof typeof updates];
        }
        return acc;
      },
      {} as Partial<{
        full_name: string;
        email: string;
        phone: string;
        role: string;
      }>,
    );

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(safeUpdates)
      .eq('id', id)
      .select('id, full_name, email, phone, role')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Error updating profile: ' + updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error in PATCH users:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id: userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete user's bookings first
    const { error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('user_id', userId);

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    // Delete user's recurring bookings
    const { error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .delete()
      .eq('user_id', userId);

    if (recurringError) {
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    // Delete user profile
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in DELETE users:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}
