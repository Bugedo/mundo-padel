import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';
import { getBuenosAiresDate, getDayOfWeekBuenosAires } from '@/lib/timezoneUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    // Validate admin access
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { weeks = 8 } = body; // Default to 8 weeks (2 months)

    console.log(`Seeding recurring bookings for ${weeks} weeks...`);

    // Get all active recurring bookings
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

    const today = getBuenosAiresDate();
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

      // Generate bookings for the next X weeks
      for (let week = 0; week < weeks; week++) {
        for (let day = 0; day < 7; day++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + week * 7 + day);
          const checkDateString = checkDate.toISOString().split('T')[0];
          const checkDayOfWeek = getDayOfWeekBuenosAires(checkDate);

          // Only create bookings for the correct day of week
          if (checkDayOfWeek !== recurring.day_of_week) {
            continue;
          }

          // Check if booking already exists
          const { data: existingBooking } = await supabaseAdmin
            .from('bookings')
            .select('id')
            .eq('date', checkDateString)
            .eq('recurring_booking_id', recurring.id)
            .single();

          if (existingBooking) {
            continue; // Skip if already exists
          }

          // Check if date is within recurring booking date range
          if (recurring.start_date && checkDate < new Date(recurring.start_date)) {
            continue; // Skip if before start date
          }

          if (recurring.end_date && checkDate > new Date(recurring.end_date)) {
            continue; // Skip if after end date
          }

          // Create the booking
          const { error: insertError } = await supabaseAdmin.from('bookings').insert({
            user_id: recurring.user_id,
            court: recurring.court,
            date: checkDateString,
            start_time: recurring.start_time,
            end_time: recurring.end_time,
            duration_minutes: recurring.duration_minutes,
            confirmed: true, // Recurring bookings are always confirmed
            present: false,
            cancelled: false,
            recurring_booking_id: recurring.id,
            created_by: recurring.user_id, // Add the required created_by field
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
