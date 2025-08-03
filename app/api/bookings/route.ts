import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  // Add admin validation
  const { isAdmin, error: authError } = await validateAdminUser();

  if (!isAdmin) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  // Get regular bookings
  const query = supabaseAdmin
    .from('bookings')
    .select('*, user:profiles!bookings_user_id_fkey(full_name)')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (date) query.eq('date', date);

  const { data: regularBookings, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If we have a specific date, also get recurring bookings for that day
  if (date) {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0-6 (Sunday-Saturday)

    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*, user:profiles!recurring_bookings_user_id_fkey(full_name)')
      .eq('day_of_week', dayOfWeek)
      .eq('active', true);

    if (!recurringError && recurringBookings) {
      // Convert recurring bookings to regular booking format for the specific date
      const recurringBookingsForDate = recurringBookings.map((recurring) => ({
        id: `recurring-${recurring.id}`,
        user_id: recurring.user_id,
        court: recurring.court,
        date: date,
        start_time: recurring.start_time,
        end_time: recurring.end_time,
        duration_minutes: recurring.duration_minutes,
        confirmed: true,
        present: false,
        cancelled: false,
        is_recurring: true,
        recurring_booking_id: recurring.id,
        user: recurring.user,
      }));

      // Combine regular and recurring bookings
      const allBookings = [...(regularBookings || []), ...recurringBookingsForDate];
      return NextResponse.json(allBookings);
    }
  }

  return NextResponse.json(regularBookings);
}

export async function POST(req: Request) {
  try {
    // Add admin validation
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_id, date, start_time, end_time, duration_minutes, court, confirmed } = body;

    // Validate required fields
    if (!user_id || !date || !start_time || !end_time || !duration_minutes || !court) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Check for conflicts with regular bookings
    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('date', date)
      .eq('court', court)
      .neq('cancelled', true);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    // Check for time conflicts with regular bookings
    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);
    const newStartMinutes = startH * 60 + startM;
    const newEndMinutes = endH * 60 + endM;

    for (const booking of existingBookings || []) {
      const [bookingStartH, bookingStartM] = booking.start_time.split(':').map(Number);
      const [bookingEndH, bookingEndM] = booking.end_time.split(':').map(Number);
      const bookingStartMinutes = bookingStartH * 60 + bookingStartM;
      const bookingEndMinutes = bookingEndH * 60 + bookingEndM;

      // Check for overlap
      if (
        (newStartMinutes < bookingEndMinutes && newEndMinutes > bookingStartMinutes) ||
        (bookingStartMinutes < newEndMinutes && bookingEndMinutes > newStartMinutes)
      ) {
        return NextResponse.json({ 
          error: `Time slot conflicts with existing booking: ${booking.start_time} - ${booking.end_time}` 
        }, { status: 409 });
      }
    }

    // Check for conflicts with recurring bookings
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('court', court)
      .eq('active', true);

    if (recurringError) {
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    // Check for time conflicts with recurring bookings
    for (const recurring of recurringBookings || []) {
      const [recurringStartH, recurringStartM] = recurring.start_time.split(':').map(Number);
      const [recurringEndH, recurringEndM] = recurring.end_time.split(':').map(Number);
      const recurringStartMinutes = recurringStartH * 60 + recurringStartM;
      const recurringEndMinutes = recurringEndH * 60 + recurringEndM;

      // Check for overlap
      if (
        (newStartMinutes < recurringEndMinutes && newEndMinutes > recurringStartMinutes) ||
        (recurringStartMinutes < newEndMinutes && recurringEndMinutes > newStartMinutes)
      ) {
        return NextResponse.json({ 
          error: `Time slot conflicts with recurring booking: ${recurring.start_time} - ${recurring.end_time} (${getDayName(dayOfWeek)})` 
        }, { status: 409 });
      }
    }

    // Create the booking
    const { data, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id,
        created_by: user_id, // For admin-created bookings, use the same user_id
        court,
        date,
        start_time,
        end_time,
        duration_minutes,
        confirmed: confirmed || false,
        present: false,
        cancelled: false,
        expires_at: confirmed ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    // Add admin validation
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, field, value } = body;

    // Validate allowed fields for updates
    const allowedFields = ['confirmed', 'present', 'cancelled'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: 'Invalid field for update' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ [field]: value })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}

// Helper function to get day name
function getDayName(dayNumber: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayNumber] || '';
}
