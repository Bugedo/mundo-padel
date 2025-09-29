const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powjqebwwkxoukdijpyy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE',
);

async function testAutoPropagation() {
  console.log('🧪 Testing Auto-Propagation System...\n');

  try {
    // 1. Check current recurring bookings
    console.log('1. 📋 Checking existing recurring bookings...');
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
      // Test with the first recurring booking
      const testRecurring = recurringBookings[0];
      console.log(`\n2. 🧪 Testing auto-propagation with recurring booking: ${testRecurring.id}`);
      console.log(`   First Date: ${testRecurring.first_date}`);
      console.log(`   Interval: ${testRecurring.recurrence_interval_days} days`);

      // Check existing bookings for this recurring booking
      const { data: existingBookings, error: existingError } = await supabaseAdmin
        .from('bookings')
        .select('date, start_time, end_time')
        .eq('recurring_booking_id', testRecurring.id)
        .gte('date', testRecurring.first_date)
        .order('date', { ascending: true });

      if (existingError) {
        console.error('❌ Error fetching existing bookings:', existingError);
        return;
      }

      console.log(
        `📊 Found ${existingBookings?.length || 0} existing bookings for this recurring booking`,
      );

      if (existingBookings && existingBookings.length > 0) {
        console.log('📅 Existing bookings:');
        existingBookings.forEach((booking, index) => {
          console.log(
            `   ${index + 1}. ${booking.date} at ${booking.start_time}-${booking.end_time}`,
          );
        });
      }

      // 3. Test the should_have_recurring_booking function for upcoming dates
      console.log('\n3. 🧮 Testing should_have_recurring_booking function...');

      const testDates = [];
      const startDate = new Date(testRecurring.first_date);

      // Test next 21 days (3 weeks)
      for (let i = 1; i <= 21; i++) {
        const testDate = new Date(startDate);
        testDate.setDate(startDate.getDate() + i);
        testDates.push(testDate.toISOString().split('T')[0]);
      }

      let applicableDates = [];
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
        } else if (shouldBeActive) {
          applicableDates.push(testDate);
        }
      }

      console.log(`✅ Found ${applicableDates.length} applicable dates in the next 21 days:`);
      applicableDates.forEach((date, index) => {
        const hasBooking = existingBookings?.some((b) => b.date === date);
        const status = hasBooking ? '✅ HAS BOOKING' : '❌ MISSING BOOKING';
        console.log(`   ${index + 1}. ${date} - ${status}`);
      });

      // 4. Check gaps
      console.log('\n4. 🔍 Checking for gaps...');
      const missingDates = applicableDates.filter(
        (date) => !existingBookings?.some((b) => b.date === date),
      );

      if (missingDates.length === 0) {
        console.log('✅ No gaps found! All applicable dates have bookings.');
      } else {
        console.log(`❌ Found ${missingDates.length} missing bookings:`);
        missingDates.forEach((date, index) => {
          console.log(`   ${index + 1}. ${date}`);
        });
        console.log(
          '\n💡 These dates would be created by auto-propagation when creating a new recurring booking.',
        );
      }

      // 5. Show expected behavior
      console.log('\n5. 📋 Expected Auto-Propagation Behavior:');
      console.log('   When creating a new recurring booking:');
      console.log('   - Creates the first booking instance on first_date');
      console.log('   - Automatically propagates for the next 15 days');
      console.log('   - Only creates bookings on applicable dates (based on recurrence interval)');
      console.log('   - Skips dates that already have bookings');
      console.log('   - Uses batch insert for efficiency');
    } else {
      console.log('ℹ️ No recurring bookings found to test with.');
      console.log('💡 Create a recurring booking first to test auto-propagation.');
    }

    console.log('\n✅ Auto-propagation system test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAutoPropagation();
