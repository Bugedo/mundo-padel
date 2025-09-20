import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';
import { getDayOfWeekBuenosAires, isBookingExpiredBuenosAires } from '@/lib/timezoneUtils';

interface Booking {
  id: string;
  user_id: string;
  court: number | null;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confirmed: boolean;
  present: boolean;
  cancelled: boolean;
  absent?: boolean;
  expires_at?: string;
  is_recurring?: boolean;
  recurring_booking_id?: string;
  comment?: string;
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
  // Add admin validation
  const { isAdmin, error: authError } = await validateAdminUser();

  if (!isAdmin) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  try {
    // First, ensure all recurring bookings are generated for this date
    await generateRecurringBookingsForDate(date);

    // Then get all bookings for this date (including generated recurring ones)
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*, user:profiles!bookings_user_id_fkey(full_name, email, phone)')
      .eq('date', date)
      .order('start_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(bookings || []);
  } catch (error) {
    console.error('Error in GET bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to clean up duplicate bookings for the same recurring_booking_id
async function cleanupDuplicateBookings(date: string) {
  try {
    console.log(`Cleaning up duplicate bookings for ${date}`);

    // Get all bookings for this date that have recurring_booking_id
    const { data: allBookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('date', date)
      .not('recurring_booking_id', 'is', null);

    if (error) {
      console.error('Error fetching bookings for cleanup:', error);
      return;
    }

    if (!allBookings || allBookings.length === 0) {
      return;
    }

    // Group by recurring_booking_id
    const grouped = allBookings.reduce(
      (acc, booking) => {
        const key = booking.recurring_booking_id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(booking);
        return acc;
      },
      {} as Record<string, Booking[]>,
    );

    // For each group, keep only one active booking (or the first cancelled one if all are cancelled)
    for (const [recurringId, bookings] of Object.entries(grouped)) {
      const bookingList = bookings as Booking[];
      if (bookingList.length <= 1) continue; // No duplicates

      console.log(`Found ${bookingList.length} duplicate bookings for recurring ${recurringId}`);

      // Sort: active bookings first, then cancelled ones
      const sortedBookings = bookingList.sort((a, b) => {
        if (a.cancelled === b.cancelled) return 0;
        return a.cancelled ? 1 : -1; // Active first
      });

      // Keep the first booking, delete the rest
      const toKeep = sortedBookings[0];
      const toDelete = sortedBookings.slice(1);

      console.log(`Keeping booking ${toKeep.id}, deleting ${toDelete.length} duplicates`);

      // Delete duplicates
      const idsToDelete = toDelete.map((b) => b.id);
      const { error: deleteError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error deleting duplicate bookings:', deleteError);
      } else {
        console.log(`Successfully deleted ${idsToDelete.length} duplicate bookings`);
      }
    }
  } catch (error) {
    console.error('Error in cleanupDuplicateBookings:', error);
  }
}

// Helper function to generate recurring bookings for a specific date
async function generateRecurringBookingsForDate(date: string) {
  // First, clean up any duplicate bookings
  await cleanupDuplicateBookings(date);
  const dateObj = new Date(date);
  const dayOfWeek = getDayOfWeekBuenosAires(dateObj); // 0-6 (Sunday-Saturday)
  const nativeDayOfWeek = dateObj.getDay(); // Native JavaScript day of week

  console.log(`Generating recurring bookings for ${date}`);
  console.log(
    `  - Native day of week: ${nativeDayOfWeek} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][nativeDayOfWeek]})`,
  );
  console.log(
    `  - Buenos Aires day of week: ${dayOfWeek} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]})`,
  );

  // Get all active recurring bookings for this day of week
  const { data: recurringBookings, error: recurringError } = await supabaseAdmin
    .from('recurring_bookings')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .eq('active', true);

  if (recurringError) {
    console.error('Error fetching recurring bookings:', recurringError);
    return;
  }

  console.log(`Found ${recurringBookings?.length || 0} recurring bookings for day ${dayOfWeek}`);

  if (!recurringBookings || recurringBookings.length === 0) {
    return;
  }

  // For each recurring booking, check if it should be active on this date
  for (const recurring of recurringBookings) {
    console.log(`Processing recurring booking ${recurring.id} for user ${recurring.user_id}`);

    // Check if there's already a booking for this recurring booking on this date
    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('id, cancelled')
      .eq('date', date)
      .eq('recurring_booking_id', recurring.id);

    console.log(`Checking existing bookings for recurring ${recurring.id} on ${date}:`, {
      count: existingBookings?.length || 0,
      bookings: existingBookings,
      error: existingError,
    });

    // Check if there's at least one booking for this recurring booking (active or cancelled)
    const anyBooking = existingBookings && existingBookings.length > 0;

    if (anyBooking) {
      const activeBooking = existingBookings?.find((booking) => !booking.cancelled);
      if (activeBooking) {
        console.log(
          `Active booking already exists for recurring ${recurring.id} on ${date} - skipping regeneration`,
        );
      } else {
        console.log(
          `Cancelled booking exists for recurring ${recurring.id} on ${date} - skipping regeneration (manual cancellation)`,
        );
      }
      continue;
    }

    const shouldBeActive = shouldRecurringBookingBeActive(recurring, date);
    console.log(`Should be active: ${shouldBeActive} for recurring ${recurring.id}`);

    // If no booking exists and the recurring booking should be active on this date
    if (shouldBeActive) {
      console.log(`Creating booking for recurring ${recurring.id} on ${date}`);
      // Create the booking
      const { error: insertError } = await supabaseAdmin
        .from('bookings')
        .insert({
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
          created_by: recurring.user_id, // Add the required created_by field
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating booking for recurring ${recurring.id}:`, insertError);
      } else {
        console.log(`Successfully created booking for recurring ${recurring.id} on ${date}`);
      }
    }
  }
}

// Helper function to check if a recurring booking should be active on a specific date
function shouldRecurringBookingBeActive(
  recurring: { start_date?: string; end_date?: string },
  date: string,
): boolean {
  const dateObj = new Date(date);
  const startDate = recurring.start_date ? new Date(recurring.start_date) : null;
  const endDate = recurring.end_date ? new Date(recurring.end_date) : null;

  // If start_date is set, check if the date is after or equal to start_date
  if (startDate && dateObj < startDate) {
    return false;
  }

  // If end_date is set, check if the date is before or equal to end_date
  if (endDate && dateObj > endDate) {
    return false;
  }

  return true;
}

// Helper function to generate the next recurring booking when a booking is completed
async function generateNextRecurringBooking(
  completedBooking: Record<string, string | number | boolean>,
) {
  try {
    // Only generate recurring bookings for bookings that have a recurring_booking_id
    if (!completedBooking.recurring_booking_id) {
      return;
    }

    const currentDate = new Date(completedBooking.date as string);

    // Get the recurring booking template
    const { data: recurringBooking, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('id', completedBooking.recurring_booking_id)
      .eq('active', true)
      .single();

    if (recurringError || !recurringBooking) {
      console.log('Recurring booking not found or inactive:', recurringError);
      return;
    }

    // Calculate next booking date (2 weeks later)
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 14);
    const nextDateString = nextDate.toISOString().split('T')[0];

    // Check if there's already a booking for this recurring booking on the next date
    const { data: existingBooking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('date', nextDateString)
      .eq('recurring_booking_id', recurringBooking.id)
      .single();

    if (existingBooking) {
      // If booking already exists, try 14 days further in the future
      const futureDate = new Date(nextDate);
      futureDate.setDate(nextDate.getDate() + 14);
      const futureDateString = futureDate.toISOString().split('T')[0];

      // Check if there's already a booking for this recurring booking on the future date
      const { data: futureExistingBooking } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('date', futureDateString)
        .eq('recurring_booking_id', recurringBooking.id)
        .single();

      if (futureExistingBooking) {
        console.log(
          'Both 2-week and 4-week slots are occupied for recurring booking:',
          recurringBooking.id,
        );
        return;
      }

      // Create booking 4 weeks in the future
      await createRecurringBookingInstance(recurringBooking, futureDateString);
    } else {
      // Create booking 2 weeks in the future
      await createRecurringBookingInstance(recurringBooking, nextDateString);
    }
  } catch (error) {
    console.error('Error generating next recurring booking:', error);
  }
}

// Helper function to create a recurring booking instance
async function createRecurringBookingInstance(
  recurringBooking: Record<string, string | number | boolean>,
  date: string,
) {
  try {
    const { error: insertError } = await supabaseAdmin.from('bookings').insert({
      user_id: recurringBooking.user_id,
      court: recurringBooking.court,
      date: date,
      start_time: recurringBooking.start_time,
      end_time: recurringBooking.end_time,
      duration_minutes: recurringBooking.duration_minutes,
      confirmed: true, // Recurring bookings are always confirmed
      present: false,
      cancelled: false,
      recurring_booking_id: recurringBooking.id,
    });

    if (insertError) {
      console.error('Error creating recurring booking instance:', insertError);
    } else {
      console.log(`Created recurring booking for ${date} at ${recurringBooking.start_time}`);
    }
  } catch (error) {
    console.error('Error in createRecurringBookingInstance:', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, date, start_time, end_time, duration_minutes, confirmed, court } = body;

    // Validate required fields
    if (!user_id || !date || !start_time || !end_time || !duration_minutes) {
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

    // For non-admin users, only allow creating bookings for themselves
    const { isAdmin } = await validateAdminUser();
    if (!isAdmin) {
      // Get the current user from the request headers or session
      // For now, we'll allow the booking creation but add validation later
      // This is a temporary solution - in production you'd want proper user session validation
    }

    // Calculate time range for conflict checking
    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);
    const newStartMinutes = startH * 60 + startM;
    const newEndMinutes = endH * 60 + endM;

    // Get all bookings for this date and time range
    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('date', date)
      .neq('cancelled', true);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    // Get active bookings that overlap with the requested time slot
    const overlappingBookings = (existingBookings || []).filter((booking) => {
      const [bh, bm] = booking.start_time.split(':').map(Number);
      const [eh, em] = booking.end_time.split(':').map(Number);
      const bookingStartMinutes = bh * 60 + bm;
      const bookingEndMinutes = eh * 60 + em;

      const active =
        booking.confirmed ||
        (booking.expires_at && !isBookingExpiredBuenosAires(booking.expires_at));

      if (!active) return false;

      // Check if the new booking overlaps with this existing booking
      return (
        (newStartMinutes < bookingEndMinutes && newEndMinutes > bookingStartMinutes) ||
        (bookingStartMinutes < newEndMinutes && bookingEndMinutes > newStartMinutes)
      );
    });

    // Determine court assignment
    let selectedCourt = court;
    if (!selectedCourt) {
      // Auto-assign to first available court
      const occupiedCourts = new Set(
        overlappingBookings.map((b) => b.court).filter((court) => court !== null),
      );

      // Find first available court
      for (let i = 1; i <= 3; i++) {
        if (!occupiedCourts.has(i)) {
          selectedCourt = i;
          break;
        }
      }

      if (!selectedCourt) {
        return NextResponse.json({ error: 'No available courts' }, { status: 409 });
      }
    } else {
      // If court is specified (admin booking), validate it's available
      const courtOccupied = overlappingBookings.some((booking) => booking.court === selectedCourt);
      if (courtOccupied) {
        return NextResponse.json(
          { error: `Court ${selectedCourt} is already occupied in this time slot` },
          { status: 409 },
        );
      }
    }

    // Create the booking
    const bookingData = {
      user_id,
      court: selectedCourt,
      date,
      start_time,
      end_time,
      duration_minutes,
      confirmed: confirmed !== undefined ? confirmed : false,
      present: false,
      cancelled: false,
      expires_at: null, // No timer - bookings stay pending until admin accepts
      created_by: user_id, // Add the required created_by field
    };

    const { data, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error in POST bookings:', error);
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
    const { id, field, value, updates } = body;

    if (updates) {
      // This is an edit update (from the edit modal or comment update)
      const { start_time, end_time, duration_minutes, court } = updates;

      // Validate the updates
      if (start_time && !/^\d{2}:\d{2}$/.test(start_time)) {
        return NextResponse.json({ error: 'Invalid start_time format' }, { status: 400 });
      }

      if (end_time && !/^\d{2}:\d{2}$/.test(end_time)) {
        return NextResponse.json({ error: 'Invalid end_time format' }, { status: 400 });
      }

      if (duration_minutes && ![60, 90, 120].includes(duration_minutes)) {
        return NextResponse.json({ error: 'Invalid duration_minutes' }, { status: 400 });
      }

      if (court && ![1, 2, 3].includes(court)) {
        return NextResponse.json({ error: 'Invalid court number' }, { status: 400 });
      }

      // Get the current booking to check for conflicts
      const { data: currentBooking, error: currentError } = await supabaseAdmin
        .from('bookings')
        .select('date, court, start_time, duration_minutes')
        .eq('id', id)
        .single();

      if (currentError || !currentBooking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      // If updating time/court, check for conflicts
      if (start_time || court) {
        const { data: existingBookings, error: existingError } = await supabaseAdmin
          .from('bookings')
          .select('*')
          .eq('date', currentBooking.date)
          .neq('id', id)
          .neq('cancelled', true);

        if (existingError) {
          return NextResponse.json({ error: existingError.message }, { status: 500 });
        }

        // Check for conflicts
        const targetCourt = court || currentBooking.court;
        const targetStartTime = start_time || currentBooking.start_time;
        const targetDuration = duration_minutes || currentBooking.duration_minutes;

        const conflicts = (existingBookings || []).filter((booking) => {
          if (booking.court !== targetCourt) return false;

          const [h, m] = targetStartTime.split(':').map(Number);
          const newStartMinutes = h * 60 + m;
          const newEndMinutes = newStartMinutes + targetDuration;

          const [bh, bm] = booking.start_time.split(':').map(Number);
          const bStart = bh * 60 + bm;
          const bEnd = bStart + (booking.duration_minutes || 90);

          return (
            (newStartMinutes >= bStart && newStartMinutes < bEnd) ||
            (newEndMinutes > bStart && newEndMinutes <= bEnd) ||
            (newStartMinutes <= bStart && newEndMinutes >= bEnd)
          );
        });

        if (conflicts.length > 0) {
          return NextResponse.json(
            { error: `Court ${targetCourt} is already occupied in this time slot` },
            { status: 409 },
          );
        }
      }

      // Update the booking
      const { data, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // This is a status update (confirmed, present, cancelled, absent)
      const allowedFields = ['confirmed', 'present', 'cancelled', 'absent'];
      if (!allowedFields.includes(field)) {
        return NextResponse.json({ error: 'Invalid field for update' }, { status: 400 });
      }

      // Handle absent field by setting cancelled to true
      const actualField = field === 'absent' ? 'cancelled' : field;
      const actualValue = field === 'absent' ? true : value;

      // Update the booking
      const { data, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ [actualField]: actualValue })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // If marking as present (booking completed), generate next recurring booking
      if (field === 'present' && actualValue === true) {
        await generateNextRecurringBooking(data);
      }

      return NextResponse.json(data);
    }
  } catch (error: unknown) {
    console.error('Error in PATCH bookings:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}
