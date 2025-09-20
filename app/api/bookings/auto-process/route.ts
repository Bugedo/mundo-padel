import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBuenosAiresDate } from '@/lib/timezoneUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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
      created_by: recurringBooking.user_id, // Add the required created_by field
    });

    if (insertError) {
      console.error('Error creating recurring booking instance:', insertError);
      return { success: false, error: insertError.message };
    } else {
      console.log(`Created recurring booking for ${date} at ${recurringBooking.start_time}`);
      return { success: true };
    }
  } catch (error) {
    console.error('Error in createRecurringBookingInstance:', error);
    return { success: false, error: 'Unknown error' };
  }
}

// Helper function to process completed bookings and generate next recurring bookings
async function processCompletedBookings() {
  const now = getBuenosAiresDate();
  const today = now.toISOString().split('T')[0];

  // Get all bookings that should have been completed today
  // (bookings that ended before current time and are not cancelled)
  const { data: completedBookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('date', today)
    .eq('cancelled', false)
    .not('recurring_booking_id', 'is', null); // Only recurring bookings

  if (bookingsError) {
    console.error('Error fetching completed bookings:', bookingsError);
    return { processed: 0, errors: [bookingsError.message] };
  }

  if (!completedBookings || completedBookings.length === 0) {
    return { processed: 0, errors: [] };
  }

  let processedCount = 0;
  const errors: string[] = [];

  for (const booking of completedBookings) {
    try {
      // Check if the booking time has passed
      const [endHour, endMinute] = booking.end_time.split(':').map(Number);
      const bookingEndTime = new Date(now);
      bookingEndTime.setHours(endHour, endMinute, 0, 0);

      // Only process if the booking end time has passed
      if (now < bookingEndTime) {
        continue;
      }

      // Get the recurring booking template
      const { data: recurringBooking, error: recurringError } = await supabaseAdmin
        .from('recurring_bookings')
        .select('*')
        .eq('id', booking.recurring_booking_id)
        .eq('active', true)
        .single();

      if (recurringError || !recurringBooking) {
        console.log('Recurring booking not found or inactive:', recurringError);
        continue;
      }

      // Calculate next booking date (15 days later)
      const nextDate = new Date(booking.date);
      nextDate.setDate(nextDate.getDate() + 15);
      const nextDateString = nextDate.toISOString().split('T')[0];

      // Check if there's already a booking for this recurring booking on the next date
      const { data: existingBooking } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('date', nextDateString)
        .eq('recurring_booking_id', recurringBooking.id)
        .single();

      if (existingBooking) {
        console.log(`Booking already exists for ${nextDateString}, skipping`);
        continue;
      }

      // Create the next recurring booking
      const result = await createRecurringBookingInstance(recurringBooking, nextDateString);

      if (result.success) {
        processedCount++;

        // Mark the current booking as present (completed)
        await supabaseAdmin.from('bookings').update({ present: true }).eq('id', booking.id);

        console.log(
          `Processed booking ${booking.id} and created next booking for ${nextDateString}`,
        );
      } else {
        errors.push(`Failed to create booking for ${nextDateString}: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing booking:', booking.id, error);
      errors.push(`Error processing booking ${booking.id}: ${error}`);
    }
  }

  return { processed: processedCount, errors };
}

export async function POST(req: Request) {
  try {
    // This endpoint can be called by a cron job or external service
    // For security, we can add a secret key check
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'default-secret';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting automatic processing of completed bookings...');
    const result = await processCompletedBookings();

    console.log(`Processed ${result.processed} bookings with ${result.errors.length} errors`);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Successfully processed ${result.processed} recurring bookings`,
    });
  } catch (error) {
    console.error('Error in auto-process bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing bookings' },
      { status: 500 },
    );
  }
}

// Also allow GET for testing purposes
export async function GET() {
  try {
    console.log('Manual trigger of automatic processing...');
    const result = await processCompletedBookings();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Successfully processed ${result.processed} recurring bookings`,
    });
  } catch (error) {
    console.error('Error in manual auto-process:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing bookings' },
      { status: 500 },
    );
  }
}
