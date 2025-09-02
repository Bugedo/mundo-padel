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

    // Create user in Supabase Auth with email confirmation disabled

    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: userData.full_name,
        phone: userData.phone || '',
        role: userData.role || 'user',
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

    // The database trigger will automatically create the profile
    // We just need to wait a moment for it to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Fetch the newly created profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authUser.user.id)
      .single();

    if (profileError) {
      // The user was created in auth, but profile creation might have failed
      // We'll return success anyway since the trigger should handle it
      return NextResponse.json({
        id: authUser.user.id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone || '',
        role: userData.role || 'user',
        message:
          'User created successfully in auth. Profile will be created automatically by database trigger.',
      });
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

// PATCH - Enhanced to update both auth and profiles
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

    // First, update the profile in the database
    const { data: profile, error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update(safeUpdates)
      .eq('id', id)
      .select('id, full_name, email, phone, role')
      .single();

    if (profileUpdateError) {
      return NextResponse.json(
        { error: 'Error updating profile: ' + profileUpdateError.message },
        { status: 500 },
      );
    }

    // Then, update the user metadata in Supabase Auth if relevant fields changed
    if (safeUpdates.full_name || safeUpdates.phone) {
      const userMetadata: any = {};

      if (safeUpdates.full_name) {
        userMetadata.full_name = safeUpdates.full_name;
      }

      if (safeUpdates.phone) {
        userMetadata.phone = safeUpdates.phone;
      }

      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: userMetadata,
      });

      if (authUpdateError) {
        console.error('Error updating auth user metadata:', authUpdateError);
        // Don't fail the request, just log the error
        // The profile was updated successfully
      }
    }

    // If email is being updated, we need to update it in auth as well
    if (safeUpdates.email) {
      const { error: emailUpdateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email: safeUpdates.email,
      });

      if (emailUpdateError) {
        console.error('Error updating auth user email:', emailUpdateError);
        return NextResponse.json(
          { error: 'Error updating email in authentication system: ' + emailUpdateError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ...profile,
      message: 'User updated successfully in both profile and authentication system',
    });
  } catch (error: unknown) {
    console.error('Error in PATCH users:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}

// DELETE - Enhanced to delete from both auth and profiles
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
      console.error('Error deleting user bookings:', bookingsError);
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    // Delete user's recurring bookings
    const { error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .delete()
      .eq('user_id', userId);

    if (recurringError) {
      console.error('Error deleting user recurring bookings:', recurringError);
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    // Delete user profile
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);

    if (profileError) {
      console.error('Error deleting user profile:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Finally, delete the user from Supabase Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting user from auth:', authDeleteError);
      return NextResponse.json(
        {
          error:
            'User profile deleted but error deleting from authentication system: ' +
            authDeleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User completely deleted from all systems',
    });
  } catch (error: unknown) {
    console.error('Error in DELETE users:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}
