import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';
// import { getBuenosAiresDate, getDayOfWeekBuenosAires, formatDateForAPI } from '@/lib/timezoneUtils'; // Not used

interface BookingToCreate {
  user_id: string;
  court: number;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confirmed: boolean;
  present: boolean;
  cancelled: boolean;
  is_recurring: boolean;
  recurring_booking_id: string;
  created_by: string;
}

// Helper function to get day name (currently not used)
// function getDayName(dayNumber: number): string {
//   const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
//   return days[dayNumber] || '';
// }

// Create admin client with service role key for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Helper function to propagate recurring booking for specific dates
async function propagateRecurringBooking(
  recurringBookingId: string,
  startDate: string,
  daysAhead: number = 15,
) {
  try {
    console.log(
      `🔄 Auto-propagating recurring booking ${recurringBookingId} for ${daysAhead} days from ${startDate}`,
    );

    // Get the recurring booking details
    const { data: recurring, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('id', recurringBookingId)
      .single();

    if (recurringError || !recurring) {
      console.error('Error fetching recurring booking for propagation:', recurringError);
      return { success: false, error: recurringError };
    }

    // Calculate date range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + daysAhead);

    // Get existing bookings for this recurring booking in the date range
    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('date')
      .eq('recurring_booking_id', recurringBookingId)
      .gte('date', startDate)
      .lte('date', endDateObj.toISOString().split('T')[0]);

    if (existingError) {
      console.error('Error fetching existing bookings for propagation:', existingError);
      return { success: false, error: existingError };
    }

    const existingDates = new Set(existingBookings?.map((b) => b.date) || []);
    const bookingsToCreate: BookingToCreate[] = [];

    // Generate bookings for each applicable date
    // Include the first_date in the check as well
    const currentDate = new Date(startDateObj);

    while (currentDate <= endDateObj) {
      const dateString = currentDate.toISOString().split('T')[0];

      // Skip if booking already exists for this date
      if (existingDates.has(dateString)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check if this date should have a recurring booking
      const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
        'should_have_recurring_booking',
        {
          p_recurring_id: recurringBookingId,
          p_check_date: dateString,
        },
      );

      if (checkError) {
        console.error(`Error checking recurring booking for ${dateString}:`, checkError);
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      if (shouldBeActive) {
        bookingsToCreate.push({
          user_id: recurring.user_id,
          court: recurring.court,
          date: dateString,
          start_time: recurring.start_time,
          end_time: recurring.end_time,
          duration_minutes: recurring.duration_minutes,
          confirmed: true,
          present: false,
          cancelled: false,
          is_recurring: true,
          recurring_booking_id: recurringBookingId,
          created_by: recurring.user_id,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Batch insert all bookings
    if (bookingsToCreate.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('bookings').insert(bookingsToCreate);

      if (insertError) {
        console.error('Error creating propagated bookings:', insertError);
        return { success: false, error: insertError };
      }

      console.log(
        `✅ Auto-propagated ${bookingsToCreate.length} bookings for recurring ${recurringBookingId}`,
      );
      return { success: true, bookingsCreated: bookingsToCreate.length };
    } else {
      console.log(`ℹ️ No new bookings needed for recurring ${recurringBookingId} (all covered)`);
      return { success: true, bookingsCreated: 0 };
    }
  } catch (error) {
    console.error('Error in auto-propagation:', error);
    return { success: false, error };
  }
}

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
      start_time,
      end_time,
      duration_minutes,
      first_date,
      last_date,
      recurrence_interval_days = 7,
    } = body;
    if (
      !user_id ||
      court === undefined ||
      !start_time ||
      !end_time ||
      !duration_minutes ||
      !first_date
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: user_id, court, start_time, end_time, duration_minutes, first_date',
        },
        { status: 400 },
      );
    }
    if (recurrence_interval_days < 1) {
      return NextResponse.json(
        { error: 'recurrence_interval_days must be at least 1' },
        { status: 400 },
      );
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
    // Only check if there's another recurring booking with overlapping time slots on the same court
    const { data: existingRecurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('court', court)
      .eq('active', true)
      .or(`start_time.lt.${end_time},end_time.gt.${start_time}`);

    if (recurringError) {
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    if (existingRecurringBookings && existingRecurringBookings.length > 0) {
      return NextResponse.json(
        {
          error: `Time slot conflicts with existing recurring booking: ${existingRecurringBookings[0].start_time} - ${existingRecurringBookings[0].end_time}`,
        },
        { status: 409 },
      );
    }

    // Check for conflicts with regular bookings only on the first_date
    // Since regular bookings can only be made 6 days in advance, we only need to check the first_date
    const { data: firstDateBookings, error: firstDateError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('date', first_date)
      .eq('court', court)
      .neq('cancelled', true)
      .or(`start_time.lt.${end_time},end_time.gt.${start_time}`);

    if (firstDateError) {
      return NextResponse.json({ error: firstDateError.message }, { status: 500 });
    }

    if (firstDateBookings && firstDateBookings.length > 0) {
      return NextResponse.json(
        {
          error: `Time slot conflicts with existing booking on ${first_date} at ${firstDateBookings[0].start_time}-${firstDateBookings[0].end_time}`,
        },
        { status: 409 },
      );
    }

    // Create the recurring booking
    const { data, error: insertError } = await supabaseAdmin
      .from('recurring_bookings')
      .insert({
        user_id,
        court,
        start_time,
        end_time,
        duration_minutes,
        first_date,
        last_date: last_date || null,
        recurrence_interval_days,
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Create the first instance of the recurring booking
    console.log(`Creating first recurring booking instance for ${first_date} at ${start_time}`);

    try {
      const { data: bookingData, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .insert({
          user_id,
          court,
          date: first_date,
          start_time,
          end_time,
          duration_minutes,
          confirmed: true, // Recurring bookings are always confirmed
          present: false,
          cancelled: false,
          is_recurring: true,
          created_by: user_id,
          recurring_booking_id: data.id,
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating first recurring booking instance:', bookingError);
        return NextResponse.json(
          { error: `Failed to create initial booking: ${bookingError.message}` },
          { status: 500 },
        );
      } else {
        console.log(`✅ Created first recurring booking instance:`, bookingData);
      }
    } catch (error) {
      console.error('Error in creating first recurring booking instance:', error);
      return NextResponse.json(
        { error: `Failed to create initial booking: ${error.message}` },
        { status: 500 },
      );
    }

    // Auto-propagate recurring booking for the next 15 days
    try {
      console.log(`🚀 Starting auto-propagation for new recurring booking ${data.id}`);
      const propagationResult = await propagateRecurringBooking(data.id, first_date, 15);

      if (propagationResult.success) {
        console.log(
          `✅ Auto-propagation completed: ${propagationResult.bookingsCreated} bookings created`,
        );
      } else {
        console.error('❌ Auto-propagation failed:', propagationResult.error);
        // Don't fail the entire operation, just log the error
      }
    } catch (error) {
      console.error('Error in auto-propagation:', error);
      // Don't fail the entire operation, just log the error
    }

    return NextResponse.json({
      ...data,
      auto_propagated: true,
      propagation_result: 'Propagation initiated for next 15 days',
    });
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

    // First, delete all bookings that reference this recurring booking
    const { error: deleteBookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('recurring_booking_id', id);

    if (deleteBookingsError) {
      console.error('Error deleting related bookings:', deleteBookingsError);
      return NextResponse.json({ error: deleteBookingsError.message }, { status: 500 });
    }

    // Then delete the recurring booking
    const { error: deleteRecurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .delete()
      .eq('id', id);

    if (deleteRecurringError) {
      console.error('Error deleting recurring booking:', deleteRecurringError);
      return NextResponse.json({ error: deleteRecurringError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Recurring booking and related bookings deleted successfully',
    });
  } catch (error) {
    console.error('Recurring bookings DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting recurring booking' },
      { status: 500 },
    );
  }
}
