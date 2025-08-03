import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';

// Create admin client with service role key for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const filter = searchParams.get('filter'); // 'active' or 'past'

    if (userId) {
      // Get bookings for specific user
      let query = supabaseAdmin
        .from('bookings')
        .select(
          `
          *,
          user:profiles!bookings_user_id_fkey(full_name, email)
        `,
        )
        .eq('user_id', userId);

      // Apply filter based on date
      const today = new Date().toISOString().split('T')[0];

      if (filter === 'active') {
        // Show future bookings and today's bookings
        query = query.gte('date', today);
      } else if (filter === 'past') {
        // Show past bookings
        query = query.lt('date', today);
      }
      // If no filter, show all bookings

      const { data, error } = await query.order('date', { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // Get all users
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching users' },
      { status: 500 },
    );
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
    const safeUpdates = Object.keys(updates).reduce((acc, key) => {
      if (allowedFields.includes(key)) {
        acc[key] = updates[key];
      }
      return acc;
    }, {} as any);

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(safeUpdates)
      .eq('id', id)
      .select('id, full_name, email, role, updated_at')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Error updating profile: ' + updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}

// DELETE
export async function DELETE(req: Request) {
  try {
    // Add admin validation
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id in request body.' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin.from('profiles').delete().eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Error deleting profile: ' + deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Profile deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}
