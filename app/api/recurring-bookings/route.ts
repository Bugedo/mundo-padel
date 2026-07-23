import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';
import { addDaysToDateOnly } from '@/lib/timezoneUtils';

interface BookingToCreate {
  user_id: string | null;
  client_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
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
  created_by: string | null;
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

    const endDate = addDaysToDateOnly(startDate, daysAhead);

    // Get existing bookings for this recurring booking in the date range
    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('date')
      .eq('recurring_booking_id', recurringBookingId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (existingError) {
      console.error('Error fetching existing bookings for propagation:', existingError);
      return { success: false, error: existingError };
    }

    const existingDates = new Set(existingBookings?.map((b) => b.date) || []);
    const bookingsToCreate: BookingToCreate[] = [];

    // Generate bookings for each applicable date (calendar strings, no UTC)
    let dateString = startDate;

    while (dateString <= endDate) {
      // Skip if booking already exists for this date
      if (!existingDates.has(dateString)) {
        const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
          'should_have_recurring_booking',
          {
            p_recurring_id: recurringBookingId,
            p_check_date: dateString,
          },
        );

        if (checkError) {
          console.error(`Error checking recurring booking for ${dateString}:`, checkError);
        } else if (shouldBeActive) {
          bookingsToCreate.push({
            user_id: recurring.user_id || null,
            client_id: recurring.client_id || null,
            guest_name: recurring.guest_name || null,
            guest_phone: recurring.guest_phone || null,
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
            created_by: recurring.user_id || null,
          });
        }
      }

      dateString = addDaysToDateOnly(dateString, 1);
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

    // Get all recurring bookings with profile + client info
    const { data, error } = await supabaseAdmin
      .from('recurring_bookings')
      .select(
        `
        *,
        user:profiles!recurring_bookings_user_id_fkey(full_name, email, phone),
        client:clients!recurring_bookings_client_id_fkey(full_name, email, phone)
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
    const { isAdmin, error: authError, user: adminUser } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const {
      user_id,
      client_id,
      court,
      start_time,
      end_time,
      duration_minutes,
      first_date,
      recurrence_interval_days = 7,
    } = body;

    if (
      (!user_id && !client_id) ||
      court === undefined ||
      !start_time ||
      !end_time ||
      !duration_minutes ||
      !first_date
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: client_id (or user_id), court, start_time, end_time, duration_minutes, first_date',
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

    const resolvedUserId: string | null = user_id || null;
    let resolvedClientId: string | null = client_id || null;
    let guestName: string | null = null;
    let guestPhone: string | null = null;

    if (client_id) {
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', client_id)
        .single();
      if (clientError || !client) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }
      resolvedClientId = client.id;
      guestName = client.full_name;
      guestPhone = client.phone || 'sin-telefono';
    } else if (user_id) {
      const { data: user, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone')
        .eq('id', user_id)
        .single();
      if (userError || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      guestName = user.full_name;
      guestPhone = user.phone;
    }

    const { data: existingRecurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('court', court)
      .eq('active', true)
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

    if (recurringError) {
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    const conflictingRecurringBookings: Array<{
      id: string;
      start_time: string;
      end_time: string;
    }> = [];
    if (existingRecurringBookings && existingRecurringBookings.length > 0) {
      for (const recurring of existingRecurringBookings) {
        const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
          'should_have_recurring_booking',
          {
            p_recurring_id: recurring.id,
            p_check_date: first_date,
          },
        );

        if (!checkError && shouldBeActive) {
          conflictingRecurringBookings.push(recurring);
        }
      }
    }

    if (conflictingRecurringBookings.length > 0) {
      return NextResponse.json(
        {
          error: `Time slot conflicts with existing recurring booking: ${conflictingRecurringBookings[0].start_time} - ${conflictingRecurringBookings[0].end_time}`,
        },
        { status: 409 },
      );
    }

    const { data: firstDateBookings, error: firstDateError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('date', first_date)
      .eq('court', court)
      .neq('cancelled', true)
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

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

    const { data, error: insertError } = await supabaseAdmin
      .from('recurring_bookings')
      .insert({
        user_id: resolvedUserId,
        client_id: resolvedClientId,
        guest_name: guestName,
        guest_phone: guestPhone,
        court,
        start_time,
        end_time,
        duration_minutes,
        first_date,
        last_date: null,
        recurrence_interval_days,
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    try {
      const { error: bookingError } = await supabaseAdmin.from('bookings').insert({
        user_id: resolvedUserId,
        client_id: resolvedClientId,
        guest_name: guestName,
        guest_phone: guestPhone,
        court,
        date: first_date,
        start_time,
        end_time,
        duration_minutes,
        confirmed: true,
        present: false,
        cancelled: false,
        is_recurring: true,
        created_by: adminUser?.id || resolvedUserId,
        recurring_booking_id: data.id,
      });

      if (bookingError) {
        return NextResponse.json(
          { error: `Failed to create initial booking: ${bookingError.message}` },
          { status: 500 },
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: `Failed to create initial booking: ${msg}` }, { status: 500 });
    }

    try {
      await propagateRecurringBooking(data.id, first_date, 15);
    } catch (error) {
      console.error('Error in auto-propagation:', error);
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

    const safeUpdates = { ...updates };

    if (safeUpdates.client_id) {
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', safeUpdates.client_id)
        .single();

      if (clientError || !client) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }

      safeUpdates.guest_name = client.full_name;
      safeUpdates.guest_phone = client.phone || 'sin-telefono';
      safeUpdates.user_id = null;
    }

    const { data, error } = await supabaseAdmin
      .from('recurring_bookings')
      .update(safeUpdates)
      .eq('id', id)
      .select(
        `
        *,
        user:profiles!recurring_bookings_user_id_fkey(full_name, email, phone),
        client:clients!recurring_bookings_client_id_fkey(full_name, email, phone)
      `,
      )
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
