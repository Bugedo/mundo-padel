const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powjqebwwkxoukdijpyy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE',
);

async function test15DaysSystem() {
  console.log('🧪 Testing 15 Days Ahead System...\n');

  try {
    // 1. Check current status
    console.log('1. 📊 Checking current system status...');

    const today = new Date();
    const next15Days = new Date();
    next15Days.setDate(today.getDate() + 15);

    const todayString = today.toISOString().split('T')[0];
    const endDateString = next15Days.toISOString().split('T')[0];

    // Get active recurring bookings
    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true);

    if (recurringError) {
      console.error('❌ Error:', recurringError);
      return;
    }

    console.log(`✅ Found ${recurringBookings?.length || 0} active recurring bookings`);

    // Get existing bookings for next 15 days
    const { data: existingBookings, error: existingError } = await supabaseAdmin
      .from('bookings')
      .select('date, recurring_booking_id')
      .eq('is_recurring', true)
      .gte('date', todayString)
      .lte('date', endDateString);

    if (existingError) {
      console.error('❌ Error:', existingError);
      return;
    }

    console.log(
      `✅ Found ${existingBookings?.length || 0} existing recurring bookings in next 15 days`,
    );

    // 2. Analyze coverage
    console.log('\n2. 📈 Analyzing coverage...');

    const activeRecurringCount = recurringBookings?.length || 0;
    const expectedBookingsPerDay = activeRecurringCount;
    const totalExpectedBookings = expectedBookingsPerDay * 15;
    const totalActualBookings = existingBookings?.length || 0;

    const coverage =
      totalExpectedBookings > 0
        ? ((totalActualBookings / totalExpectedBookings) * 100).toFixed(1)
        : 0;

    console.log(`📊 Coverage Analysis:`);
    console.log(`   - Expected bookings per day: ${expectedBookingsPerDay}`);
    console.log(`   - Total expected (15 days): ${totalExpectedBookings}`);
    console.log(`   - Total actual: ${totalActualBookings}`);
    console.log(`   - Coverage: ${coverage}%`);

    // 3. Check for gaps
    console.log('\n3. 🔍 Checking for gaps...');

    const bookingsByDate =
      existingBookings?.reduce((acc, booking) => {
        acc[booking.date] = (acc[booking.date] || 0) + 1;
        return acc;
      }, {}) || {};

    const gaps = [];
    const currentDate = new Date(today);
    for (let i = 0; i < 15; i++) {
      const dateString = currentDate.toISOString().split('T')[0];
      const bookingsForDate = bookingsByDate[dateString] || 0;

      if (bookingsForDate < expectedBookingsPerDay) {
        gaps.push({
          date: dateString,
          expected: expectedBookingsPerDay,
          actual: bookingsForDate,
          missing: expectedBookingsPerDay - bookingsForDate,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (gaps.length === 0) {
      console.log('✅ No gaps found! All 15 days are properly covered.');
    } else {
      console.log(`❌ Found ${gaps.length} days with gaps:`);
      gaps.forEach((gap) => {
        console.log(
          `   ${gap.date}: ${gap.actual}/${gap.expected} bookings (missing ${gap.missing})`,
        );
      });
    }

    // 4. Test the should_have_recurring_booking function for a few dates
    console.log('\n4. 🧮 Testing should_have_recurring_booking function...');

    if (recurringBookings && recurringBookings.length > 0) {
      const testRecurring = recurringBookings[0];
      const testDates = [
        todayString,
        new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
        new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 days
      ];

      for (const testDate of testDates) {
        const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
          'should_have_recurring_booking',
          {
            p_recurring_id: testRecurring.id,
            p_check_date: testDate,
          },
        );

        if (checkError) {
          console.error(`❌ Error testing function for ${testDate}:`, checkError);
        } else {
          console.log(
            `✅ ${testDate}: ${shouldBeActive ? 'Should have booking' : 'No booking needed'}`,
          );
        }
      }
    }

    // 5. Show system configuration
    console.log('\n5. ⚙️ System Configuration:');
    console.log('   - Cron Job: Mondays at 00:00 Buenos Aires (3:00 AM UTC)');
    console.log('   - Endpoint: /api/bookings/weekly-propagation');
    console.log('   - Strategy: Always ensure 15 days ahead');
    console.log('   - Manual maintenance: /api/bookings/ensure-future-bookings');
    console.log('   - Duplicate prevention: Built-in verification');

    console.log('\n✅ 15 Days Ahead System test completed!');

    if (gaps.length > 0) {
      console.log('\n💡 Recommendation: Run manual maintenance to fill gaps');
      console.log('   POST /api/bookings/ensure-future-bookings');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test15DaysSystem();
