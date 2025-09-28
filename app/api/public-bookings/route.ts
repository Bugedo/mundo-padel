import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { getDayOfWeekBuenosAires } from '@/lib/timezoneUtils'; // Not used

interface RecurringBooking {
  id: string;
  user_id: string;
  court: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  first_date: string;
  last_date: string | null;
  recurrence_interval_days: number;
  active: boolean;
  user?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Get regular bookings for the specific date
    const { data: regularBookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*, user:profiles!bookings_user_id_fkey(full_name)')
      .eq('date', date)
      .neq('cancelled', true)
      .order('start_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get recurring bookings that could potentially be active on this date
    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*, user:profiles!recurring_bookings_user_id_fkey(full_name)')
      .eq('active', true)
      .lte('first_date', date)
      .or(`last_date.is.null,last_date.gte.${date}`);

    if (recurringError) {
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    // Filter recurring bookings that should be active on this specific date
    const applicableRecurringBookings: RecurringBooking[] = [];

    if (recurringBookings && recurringBookings.length > 0) {
      for (const recurring of recurringBookings) {
        // Check if this date should have a recurring booking
        const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
          'should_have_recurring_booking',
          {
            p_recurring_id: recurring.id,
            p_check_date: date,
          },
        );

        if (!checkError && shouldBeActive) {
          applicableRecurringBookings.push(recurring);
        }
      }
    }

    // Convert recurring bookings to regular booking format for the specific date
    const recurringBookingsForDate = applicableRecurringBookings.map((recurring) => ({
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
  } catch (error: unknown) {
    console.error('Error in GET public-bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
