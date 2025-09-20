import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBuenosAiresDate } from '@/lib/timezoneUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Helper function to process completed bookings (mark as present)
async function processCompletedBookings() {
  const now = getBuenosAiresDate();
  const today = now.toISOString().split('T')[0];

  // Get all bookings that should have been completed today
  // (bookings that ended before current time and are not cancelled or already marked as present)
  const { data: completedBookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('date', today)
    .eq('cancelled', false)
    .eq('present', false); // Only bookings not already marked as present

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

      // Mark the booking as present (completed)
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ present: true })
        .eq('id', booking.id);

      if (updateError) {
        console.error(`Error marking booking ${booking.id} as present:`, updateError);
        errors.push(`Error marking booking ${booking.id} as present: ${updateError.message}`);
      } else {
        processedCount++;
        console.log(`✅ Marked booking ${booking.id} as completed`);
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

    console.log(
      `Marked ${result.processed} bookings as completed with ${result.errors.length} errors`,
    );

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Successfully marked ${result.processed} bookings as completed`,
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
      message: `Successfully marked ${result.processed} bookings as completed`,
    });
  } catch (error) {
    console.error('Error in manual auto-process:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing bookings' },
      { status: 500 },
    );
  }
}
