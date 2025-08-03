import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';

// Create admin client with service role key for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    // Validate that only admin users can access this endpoint
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Get all recurring bookings with user information
    const { data, error } = await supabaseAdmin
      .from('recurring_bookings')
      .select(
        `
        *,
        user:profiles!recurring_bookings_user_id_fkey(full_name, email)
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Recurring bookings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching recurring bookings' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    // Validate that only admin users can create recurring bookings
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      user_id,
      court,
      day_of_week,
      start_time,
      end_time,
      duration_minutes,
      start_date,
      end_date,
    } = body;

    // Validate required fields
    if (
      !user_id ||
      court === undefined ||
      day_of_week === undefined ||
      !start_time ||
      !end_time ||
      !duration_minutes
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: user_id, court, day_of_week, start_time, end_time, duration_minutes',
        },
        { status: 400 },
      );
    }

    // Validate day_of_week (0-6, where 0 is Sunday)
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json({ error: 'day_of_week must be between 0 and 6' }, { status: 400 });
    }

    // Validate court (1-3)
    if (court < 1 || court > 3) {
      return NextResponse.json({ error: 'court must be between 1 and 3' }, { status: 400 });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create the recurring booking
    const { data, error: insertError } = await supabaseAdmin
      .from('recurring_bookings')
      .insert({
        user_id,
        court,
        day_of_week,
        start_time,
        end_time,
        duration_minutes,
        start_date: start_date || null,
        end_date: end_date || null,
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Recurring bookings POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating recurring booking' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing required fields: id, updates' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('recurring_bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Recurring bookings PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating recurring booking' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    // Validate that only admin users can delete recurring bookings
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id in request body' }, { status: 400 });
    }

    // Delete the recurring booking
    const { error: deleteError } = await supabaseAdmin
      .from('recurring_bookings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Recurring booking deleted successfully' });
  } catch (error) {
    console.error('Recurring bookings DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting recurring booking' },
      { status: 500 },
    );
  }
}
