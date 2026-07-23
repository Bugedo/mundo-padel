import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';
import { addDaysToDateOnly, getTodayBuenosAires } from '@/lib/timezoneUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST() {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 Starting cleanup of recurring bookings...');

    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('is_recurring', true);

    if (deleteError) {
      console.error('Error deleting recurring bookings:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('✅ Deleted all existing recurring booking instances');

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
        message: 'No active recurring bookings found',
        cleaned: 0,
        regenerated: 0,
      });
    }

    console.log(`📅 Found ${recurringBookings.length} active recurring bookings`);

    const todayString = getTodayBuenosAires();
    const endDateString = addDaysToDateOnly(todayString, 15);

    let totalRegenerated = 0;
    const errors: string[] = [];

    let dateString = todayString;
    while (dateString <= endDateString) {
      console.log(`📅 Processing date: ${dateString}`);

      const bookingsToCreate: Array<{
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
      }> = [];

      for (const recurring of recurringBookings) {
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

      if (bookingsToCreate.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('bookings')
          .insert(bookingsToCreate);

        if (insertError) {
          console.error(`❌ Error creating bookings for ${dateString}:`, insertError);
          errors.push(`Error creating bookings for ${dateString}: ${insertError.message}`);
        } else {
          totalRegenerated += bookingsToCreate.length;
          console.log(`✅ Created ${bookingsToCreate.length} bookings for ${dateString}`);
        }
      }

      dateString = addDaysToDateOnly(dateString, 1);
    }

    console.log(`🎉 Cleanup and regeneration completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Bookings regenerated: ${totalRegenerated}`);
    console.log(`   - Recurring bookings processed: ${recurringBookings.length}`);
    console.log(`   - Errors encountered: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: 'Recurring bookings cleaned and regenerated successfully',
      cleaned: 'all',
      regenerated: totalRegenerated,
      recurringBookings: recurringBookings.length,
      errors: errors,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in clean-recurring:', error);
    return NextResponse.json(
      { error: 'Internal server error while cleaning recurring bookings' },
      { status: 500 },
    );
  }
}
