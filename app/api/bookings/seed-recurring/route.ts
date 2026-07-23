import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';
import {
  addDaysToDateOnly,
  getDayOfWeekBuenosAires,
  getTodayBuenosAires,
} from '@/lib/timezoneUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { weeks = 8 } = body;

    console.log(`Seeding recurring bookings for ${weeks} weeks...`);

    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true);

    if (recurringError) {
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    if (!recurringBookings || recurringBookings.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No active recurring bookings found',
      });
    }

    const todayString = getTodayBuenosAires();
    let totalCreated = 0;
    const results: Array<{
      recurringId: string;
      user: string;
      dayOfWeek: number;
      time: string;
      created: number;
      errors: string[];
    }> = [];

    for (const recurring of recurringBookings) {
      const recurringResults = {
        recurringId: recurring.id,
        user: recurring.user_id,
        dayOfWeek: recurring.day_of_week,
        time: `${recurring.start_time}-${recurring.end_time}`,
        created: 0,
        errors: [] as string[],
      };

      const totalDays = weeks * 7;
      for (let offset = 0; offset < totalDays; offset++) {
        const checkDateString = addDaysToDateOnly(todayString, offset);
        const checkDayOfWeek = getDayOfWeekBuenosAires(checkDateString);

        if (
          recurring.day_of_week !== undefined &&
          recurring.day_of_week !== null &&
          checkDayOfWeek !== recurring.day_of_week
        ) {
          continue;
        }

        // Prefer SQL recurrence check when day_of_week column is absent
        if (recurring.day_of_week === undefined || recurring.day_of_week === null) {
          const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
            'should_have_recurring_booking',
            {
              p_recurring_id: recurring.id,
              p_check_date: checkDateString,
            },
          );
          if (checkError || !shouldBeActive) {
            continue;
          }
        }

        const { data: existingBooking } = await supabaseAdmin
          .from('bookings')
          .select('id')
          .eq('date', checkDateString)
          .eq('recurring_booking_id', recurring.id)
          .single();

        if (existingBooking) {
          continue;
        }

        const startBound = recurring.start_date || recurring.first_date;
        const endBound = recurring.end_date || recurring.last_date;
        if (startBound && checkDateString < String(startBound).slice(0, 10)) {
          continue;
        }
        if (endBound && checkDateString > String(endBound).slice(0, 10)) {
          continue;
        }

        const { error: insertError } = await supabaseAdmin.from('bookings').insert({
          user_id: recurring.user_id,
          court: recurring.court,
          date: checkDateString,
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

        if (insertError) {
          recurringResults.errors.push(`${checkDateString}: ${insertError.message}`);
          console.error(`Error creating booking for ${checkDateString}:`, insertError);
        } else {
          recurringResults.created++;
          totalCreated++;
          console.log(`Created booking for ${checkDateString} at ${recurring.start_time}`);
        }
      }

      results.push(recurringResults);
    }

    return NextResponse.json({
      success: true,
      totalCreated,
      weeks,
      recurringBookings: recurringBookings.length,
      results,
      message: `Successfully created ${totalCreated} recurring booking instances for ${recurringBookings.length} recurring bookings over ${weeks} weeks`,
    });
  } catch (error) {
    console.error('Error in seed-recurring:', error);
    return NextResponse.json(
      { error: 'Internal server error while seeding recurring bookings' },
      { status: 500 },
    );
  }
}
