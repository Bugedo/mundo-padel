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

      const { data: regularBookings, error } = await query.order('date', { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Get recurring bookings for this user
      const { data: recurringBookings, error: recurringError } = await supabaseAdmin
        .from('recurring_bookings')
        .select(
          `
          *,
          user:profiles!recurring_bookings_user_id_fkey(full_name, email)
        `,
        )
        .eq('user_id', userId)
        .eq('active', true);

      if (recurringError) {
        console.error('Error fetching recurring bookings:', recurringError);
      }

      // Convert recurring bookings to regular booking format for display
      const recurringBookingsFormatted =
        recurringBookings?.map((recurring) => ({
          id: `recurring-${recurring.id}`,
          user_id: recurring.user_id,
          date: null, // No specific date for recurring
          start_time: recurring.start_time,
          end_time: recurring.end_time,
          duration_minutes: recurring.duration_minutes,
          court: recurring.court,
          confirmed: true,
          present: false,
          cancelled: false,
          is_recurring: true,
          recurring_booking_id: recurring.id,
          day_of_week: recurring.day_of_week,
          active: recurring.active,
          start_date: recurring.start_date,
          end_date: recurring.end_date,
          user: recurring.user,
        })) || [];

      // Combine regular and recurring bookings
      const allBookings = [...(regularBookings || []), ...recurringBookingsFormatted];

      return NextResponse.json(allBookings);
    } else {
      // Get all users or only admins based on query parameter
      const { searchParams } = new URL(req.url);
      const showAll = searchParams.get('showAll') === 'true';

      let query = supabaseAdmin.from('profiles').select('*');

      if (!showAll) {
        // By default, only show admins
        query = query.eq('role', 'admin');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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
      .select('id, full_name, email, phone, role')
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
