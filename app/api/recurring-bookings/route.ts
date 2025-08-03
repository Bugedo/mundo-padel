import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';

// Helper function to get day name
function getDayName(dayNumber: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayNumber] || '';
}

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
    if (!user_id || court === undefined || day_of_week === undefined || !start_time || !end_time || !duration_minutes) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, court, day_of_week, start_time, end_time, duration_minutes' },
        { status: 400 },
      );
    }
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json({ error: 'day_of_week must be between 0 and 6' }, { status: 400 });
    }
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

    // Check for conflicts with existing recurring bookings
    const { data: existingRecurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('day_of_week', day_of_week)
      .eq('court', court)
      .eq('active', true);

    if (recurringError) {
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    // Check for time conflicts with existing recurring bookings
    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);
    const newStartMinutes = startH * 60 + startM;
    const newEndMinutes = endH * 60 + endM;

    for (const existing of existingRecurringBookings || []) {
      const [existingStartH, existingStartM] = existing.start_time.split(':').map(Number);
      const [existingEndH, existingEndM] = existing.end_time.split(':').map(Number);
      const existingStartMinutes = existingStartH * 60 + existingStartM;
      const existingEndMinutes = existingEndH * 60 + existingEndM;

      // Check for overlap
      if (
        (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) ||
        (existingStartMinutes < newEndMinutes && existingEndMinutes > newStartMinutes)
      ) {
        return NextResponse.json({ 
          error: `Time slot conflicts with existing recurring booking: ${existing.start_time} - ${existing.end_time} (${getDayName(day_of_week)})` 
        }, { status: 409 });
      }
    }

    // Check for conflicts with regular bookings in the next 6 weeks
    const today = new Date();
    const conflicts: Array<{ date: string; time: string; user: string }> = [];

    for (let i = 0; i <= 42; i++) { // Check next 6 weeks
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const checkDateString = checkDate.toISOString().split('T')[0];
      const checkDayOfWeek = checkDate.getDay();

      if (checkDayOfWeek === day_of_week) {
        // Check if there are regular bookings on this date that conflict
        const { data: regularBookings, error: regularError } = await supabaseAdmin
          .from('bookings')
          .select('*')
          .eq('date', checkDateString)
          .eq('court', court)
          .neq('cancelled', true);

        if (regularError) {
          return NextResponse.json({ error: regularError.message }, { status: 500 });
        }

        for (const booking of regularBookings || []) {
          const [bookingStartH, bookingStartM] = booking.start_time.split(':').map(Number);
          const [bookingEndH, bookingEndM] = booking.end_time.split(':').map(Number);
          const bookingStartMinutes = bookingStartH * 60 + bookingStartM;
          const bookingEndMinutes = bookingEndH * 60 + bookingEndM;

          // Check for overlap
          if (
            (newStartMinutes < bookingEndMinutes && newEndMinutes > bookingStartMinutes) ||
            (bookingStartMinutes < newEndMinutes && bookingEndMinutes > newStartMinutes)
          ) {
            conflicts.push({
              date: checkDateString,
              time: `${booking.start_time} - ${booking.end_time}`,
              user: booking.user_id
            });
          }
        }
      }
    }

    if (conflicts.length > 0) {
      const conflictDetails = conflicts.slice(0, 3).map(c => `${c.date} (${c.time})`).join(', ');
      return NextResponse.json({ 
        error: `Recurring booking conflicts with existing bookings: ${conflictDetails}${conflicts.length > 3 ? ' and more...' : ''}` 
      }, { status: 409 });
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
