import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cronAuth';
import { getTodayBuenosAires, getCurrentTimeBuenosAires } from '@/lib/timezoneUtils';
import { createAdminClient } from '@/utils/supabase/admin';

const supabaseAdmin = createAdminClient();

// Helper function to process completed bookings (mark as present)
async function processCompletedBookings() {
  const today = getTodayBuenosAires();
  const nowTime = getCurrentTimeBuenosAires(); // HH:MM

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
      // Compare wall-clock times as HH:MM strings (BA local)
      const endTime = String(booking.end_time).slice(0, 5);
      if (nowTime < endTime) {
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
    const authError = requireCronAuth(req);
    if (authError) return authError;

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
