import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  addDaysToDateOnly,
  getDayOfWeekBuenosAires,
  getTodayBuenosAires,
} from '@/lib/timezoneUtils';

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

export async function POST() {
  try {
    const todayString = getTodayBuenosAires();
    const dayOfWeek = getDayOfWeekBuenosAires(todayString);

    if (dayOfWeek !== 1) {
      return NextResponse.json({
        message: 'Weekly propagation only runs on Mondays',
        currentDay: dayOfWeek,
        skipped: true,
      });
    }

    console.log('🚀 Starting weekly recurring bookings propagation...');
    console.log('🎯 Goal: Ensure 15 days of recurring bookings are always available');

    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true);

    if (recurringError) {
      console.error('Error fetching recurring bookings:', recurringError);
      return NextResponse.json({ error: 'Failed to fetch recurring bookings' }, { status: 500 });
    }

    if (!recurringBookings || recurringBookings.length === 0) {
      return NextResponse.json({
        message: 'No active recurring bookings found',
        propagated: 0,
      });
    }

    console.log(`📅 Found ${recurringBookings.length} active recurring bookings`);

    let totalPropagated = 0;
    const errors: string[] = [];

    const startDateString = todayString;
    const endDateString = addDaysToDateOnly(todayString, 15);

    console.log(`📅 Ensuring population range: ${startDateString} to ${endDateString}`);

    const { data: allExistingBookings, error: allExistingError } = await supabaseAdmin
      .from('bookings')
      .select('date, recurring_booking_id')
      .eq('is_recurring', true)
      .gte('date', startDateString)
      .lte('date', endDateString);

    if (allExistingError) {
      console.error('❌ Error fetching existing bookings:', allExistingError);
      return NextResponse.json({ error: 'Failed to fetch existing bookings' }, { status: 500 });
    }

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

    let dateString = startDateString;
    while (dateString <= endDateString) {
      const existingForDate = existingBookingsMap.get(dateString) || new Set();

      console.log(`\n📅 Processing date: ${dateString}`);
      console.log(`📊 Found ${existingForDate.size} existing recurring bookings for ${dateString}`);

      const bookingsToCreate: BookingToCreate[] = [];

      for (const recurring of recurringBookings) {
        if (existingForDate.has(recurring.id)) {
          console.log(`⏭️ Skipping ${recurring.id} - already exists for ${dateString}`);
          continue;
        }

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
          console.log(`⏭️ Skipping ${recurring.id} - not applicable for ${dateString}`);
          continue;
        }

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

        console.log(`➕ Queued booking for ${recurring.id} on ${dateString}`);
      }

      if (bookingsToCreate.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('bookings')
          .insert(bookingsToCreate);

        if (insertError) {
          console.error(`❌ Error creating bookings for ${dateString}:`, insertError);
          errors.push(`Error creating bookings for ${dateString}: ${insertError.message}`);
        } else {
          totalPropagated += bookingsToCreate.length;
          console.log(`✅ Created ${bookingsToCreate.length} bookings for ${dateString}`);
        }
      } else {
        console.log(`✅ No bookings needed for ${dateString} - all covered`);
      }

      dateString = addDaysToDateOnly(dateString, 1);
    }

    console.log(`\n🎉 Weekly propagation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Date range: ${startDateString} to ${endDateString} (15 days)`);
    console.log(`   - Bookings created: ${totalPropagated}`);
    console.log(`   - Recurring bookings processed: ${recurringBookings.length}`);
    console.log(`   - Errors encountered: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: 'Weekly propagation completed successfully',
      propagated: totalPropagated,
      recurringBookings: recurringBookings.length,
      errors: errors,
      executedAt: new Date().toISOString(),
      timezone: 'America/Argentina/Buenos_Aires',
      dateRange: {
        start: startDateString,
        end: endDateString,
      },
    });
  } catch (error) {
    console.error('Error in weekly propagation:', error);
    return NextResponse.json(
      { error: 'Internal server error during weekly propagation' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    console.log('Manual trigger of weekly propagation...');
    return await POST();
  } catch (error) {
    console.error('Error in manual weekly propagation:', error);
    return NextResponse.json(
      { error: 'Internal server error during manual weekly propagation' },
      { status: 500 },
    );
  }
}
