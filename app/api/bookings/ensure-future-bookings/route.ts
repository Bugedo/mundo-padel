import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';
import { formatDateForAPI, getBuenosAiresDate } from '@/lib/timezoneUtils';

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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Manual endpoint to ensure future bookings are always populated
// This can be called manually to fill any gaps
export async function POST(req: NextRequest) {
  try {
    // Validate admin user
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Manual maintenance: Ensuring future recurring bookings...');

    // Get current Buenos Aires date
    const today = getBuenosAiresDate();
    const todayString = formatDateForAPI(today);

    // Parse optional parameters
    const { searchParams } = new URL(req.url);
    const daysAhead = parseInt(searchParams.get('days') || '15');

    console.log(`📅 Ensuring bookings for next ${daysAhead} days from ${todayString}`);

    // Calculate date range
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);
    const endDateString = formatDateForAPI(endDate);

    // Get all active recurring bookings
    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true);

    if (recurringError) {
      console.error('❌ Error fetching recurring bookings:', recurringError);
      return NextResponse.json({ error: 'Failed to fetch recurring bookings' }, { status: 500 });
    }

    if (!recurringBookings || recurringBookings.length === 0) {
      return NextResponse.json({
        message: 'No active recurring bookings found',
        bookingsCreated: 0,
        daysProcessed: daysAhead,
      });
    }

    console.log(`📋 Found ${recurringBookings.length} active recurring bookings`);

    // Get ALL existing recurring bookings for the entire range
    const { data: allExistingBookings, error: allExistingError } = await supabaseAdmin
      .from('bookings')
      .select('date, recurring_booking_id')
      .eq('is_recurring', true)
      .gte('date', todayString)
      .lte('date', endDateString);

    if (allExistingError) {
      console.error('❌ Error fetching existing bookings:', allExistingError);
      return NextResponse.json({ error: 'Failed to fetch existing bookings' }, { status: 500 });
    }

    // Create a map for quick lookup: date -> Set of recurring_booking_ids
    const existingBookingsMap = new Map<string, Set<string>>();
    allExistingBookings?.forEach((booking) => {
      if (!existingBookingsMap.has(booking.date)) {
        existingBookingsMap.set(booking.date, new Set());
      }
      if (booking.recurring_booking_id) {
        existingBookingsMap.get(booking.date)!.add(booking.recurring_booking_id);
      }
    });

    console.log(`📊 Found existing bookings for ${existingBookingsMap.size} dates in the range`);

    let totalBookingsCreated = 0;
    let daysProcessed = 0;
    const errors: string[] = [];

    // Process each day in the range
    const currentDate = new Date(today);
    while (currentDate <= endDate) {
      const dateString = formatDateForAPI(currentDate);
      const existingForDate = existingBookingsMap.get(dateString) || new Set();
      daysProcessed++;

      console.log(`📅 Processing date: ${dateString} (${existingForDate.size} existing)`);

      const bookingsToCreate: BookingToCreate[] = [];

      // Process each recurring booking
      for (const recurring of recurringBookings) {
        // Skip if booking already exists for this date
        if (existingForDate.has(recurring.id)) {
          continue;
        }

        // Check if this date should have a recurring booking
        const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
          'should_have_recurring_booking',
          {
            p_recurring_id: recurring.id,
            p_check_date: dateString,
          },
        );

        if (checkError) {
          console.error(`❌ Error checking recurring booking ${recurring.id}:`, checkError);
          errors.push(`Error checking recurring booking ${recurring.id}: ${checkError.message}`);
          continue;
        }

        if (!shouldBeActive) {
          continue;
        }

        // Prepare booking for batch insert
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
          recurring_booking_id: recurring.id,
          created_by: recurring.user_id,
        });
      }

      // Batch insert all bookings for this date
      if (bookingsToCreate.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('bookings')
          .insert(bookingsToCreate);

        if (insertError) {
          console.error(`❌ Error creating bookings for ${dateString}:`, insertError);
          errors.push(`Error creating bookings for ${dateString}: ${insertError.message}`);
        } else {
          totalBookingsCreated += bookingsToCreate.length;
          console.log(`✅ Created ${bookingsToCreate.length} bookings for ${dateString}`);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`\n🎉 Maintenance completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Days processed: ${daysProcessed}`);
    console.log(`   - Bookings created: ${totalBookingsCreated}`);
    console.log(`   - Recurring bookings: ${recurringBookings.length}`);
    console.log(`   - Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: 'Future bookings maintenance completed',
      bookingsCreated: totalBookingsCreated,
      daysProcessed: daysProcessed,
      recurringBookings: recurringBookings.length,
      errors: errors,
      dateRange: {
        start: todayString,
        end: endDateString,
      },
    });
  } catch (error) {
    console.error('❌ Error in maintenance:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during maintenance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check the status of future bookings
export async function GET(req: NextRequest) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const daysAhead = parseInt(searchParams.get('days') || '15');

    const today = getBuenosAiresDate();
    const todayString = formatDateForAPI(today);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);
    const endDateString = formatDateForAPI(endDate);

    // Get active recurring bookings count
    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('id')
      .eq('active', true);

    if (recurringError) {
      return NextResponse.json({ error: 'Failed to fetch recurring bookings' }, { status: 500 });
    }

    const activeRecurringCount = recurringBookings?.length || 0;

    // Get existing bookings for the range
    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('date, recurring_booking_id')
      .eq('is_recurring', true)
      .gte('date', todayString)
      .lte('date', endDateString);

    if (existingError) {
      return NextResponse.json({ error: 'Failed to fetch existing bookings' }, { status: 500 });
    }

    // Count bookings by date
    const bookingsByDate =
      existingBookings?.reduce(
        (acc, booking) => {
          acc[booking.date] = (acc[booking.date] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    // Calculate expected vs actual
    const expectedBookingsPerDay = activeRecurringCount;
    const totalExpectedBookings = expectedBookingsPerDay * daysAhead;
    const totalActualBookings = existingBookings?.length || 0;

    return NextResponse.json({
      success: true,
      dateRange: {
        start: todayString,
        end: endDateString,
        days: daysAhead,
      },
      recurringBookings: {
        active: activeRecurringCount,
        expectedPerDay: expectedBookingsPerDay,
      },
      bookings: {
        total: totalActualBookings,
        expected: totalExpectedBookings,
        coverage:
          totalExpectedBookings > 0
            ? ((totalActualBookings / totalExpectedBookings) * 100).toFixed(1) + '%'
            : '0%',
        byDate: bookingsByDate,
      },
      gaps: Object.keys(bookingsByDate).filter(
        (date) => (bookingsByDate[date] || 0) < expectedBookingsPerDay,
      ),
    });
  } catch (error) {
    console.error('Error checking future bookings status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
