const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powjqebwwkxoukdijpyy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE',
);

async function testWeeklyPropagation() {
  console.log('🧪 Testing Weekly Propagation System...\n');

  try {
    // 1. Check current recurring bookings
    console.log('1. 📋 Checking active recurring bookings...');
    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true);

    if (recurringError) {
      console.error('❌ Error:', recurringError);
      return;
    }

    console.log(`✅ Found ${recurringBookings?.length || 0} active recurring bookings`);

    if (recurringBookings && recurringBookings.length > 0) {
      console.log('📊 Sample recurring booking:');
      const sample = recurringBookings[0];
      console.log(`   ID: ${sample.id}`);
      console.log(`   User: ${sample.user_id}`);
      console.log(`   Court: ${sample.court}`);
      console.log(`   First Date: ${sample.first_date}`);
      console.log(`   Last Date: ${sample.last_date || 'Permanent'}`);
      console.log(`   Interval: ${sample.recurrence_interval_days} days`);
      console.log(`   Time: ${sample.start_time} - ${sample.end_time}`);
    }

    // 2. Check existing bookings for next 7 days
    console.log('\n2. 📅 Checking existing bookings for next 7 days...');

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('date, recurring_booking_id, is_recurring')
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', nextWeek.toISOString().split('T')[0])
      .eq('is_recurring', true);

    if (existingError) {
      console.error('❌ Error:', existingError);
      return;
    }

    console.log(
      `✅ Found ${existingBookings?.length || 0} existing recurring bookings in next 7 days`,
    );

    if (existingBookings && existingBookings.length > 0) {
      const bookingsByDate = existingBookings.reduce((acc, booking) => {
        acc[booking.date] = (acc[booking.date] || 0) + 1;
        return acc;
      }, {});

      console.log('📊 Bookings by date:');
      Object.entries(bookingsByDate).forEach(([date, count]) => {
        console.log(`   ${date}: ${count} bookings`);
      });
    }

    // 3. Test the should_have_recurring_booking function
    console.log('\n3. 🧮 Testing should_have_recurring_booking function...');

    if (recurringBookings && recurringBookings.length > 0) {
      const testRecurring = recurringBookings[0];
      const testDate = '2025-01-30'; // A future date

      const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
        'should_have_recurring_booking',
        {
          p_recurring_id: testRecurring.id,
          p_check_date: testDate,
        },
      );

      if (checkError) {
        console.error('❌ Error testing function:', checkError);
      } else {
        console.log(
          `✅ Function test result for ${testDate}: ${shouldBeActive ? 'Should have booking' : 'No booking needed'}`,
        );
      }
    }

    // 4. Check cron job configuration
    console.log('\n4. ⏰ Cron job configuration:');
    console.log('   Schedule: 0 3 * * 1 (Mondays at 3:00 AM UTC)');
    console.log('   Buenos Aires time: Mondays at 00:00 (midnight)');
    console.log('   Endpoint: /api/bookings/weekly-propagation');
    console.log('   Population: 15 days ahead');

    console.log('\n✅ Weekly propagation system test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWeeklyPropagation();
