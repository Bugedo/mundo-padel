const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powjqebwwkxoukdijpyy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE',
);

async function testFirstDatePropagation() {
  console.log('🧪 Testing First Date Propagation...\n');

  try {
    // 1. Get the most recent recurring booking
    console.log('1. 📋 Checking most recent recurring booking...');
    const { data: recentRecurring, error: recentError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentError) {
      console.error('❌ Error:', recentError);
      return;
    }

    if (!recentRecurring || recentRecurring.length === 0) {
      console.log('ℹ️ No recent recurring bookings found');
      return;
    }

    const recurring = recentRecurring[0];
    console.log(`✅ Found most recent recurring booking: ${recurring.id}`);
    console.log(`   First Date: ${recurring.first_date}`);
    console.log(`   Interval: ${recurring.recurrence_interval_days} days`);
    console.log(`   Time: ${recurring.start_time} - ${recurring.end_time}`);

    // 2. Check bookings for this recurring booking
    console.log('\n2. 📅 Checking existing bookings for this recurring booking...');
    const { data: existingBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('date, start_time, end_time, created_at')
      .eq('recurring_booking_id', recurring.id)
      .order('date', { ascending: true });

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return;
    }

    console.log(`📊 Found ${existingBookings?.length || 0} existing bookings:`);
    
    if (existingBookings && existingBookings.length > 0) {
      existingBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.date} at ${booking.start_time}-${booking.end_time}`);
      });
    }

    // 3. Check if first_date has a booking
    console.log('\n3. 🔍 Checking if first_date has a booking...');
    const firstDateBooking = existingBookings?.find(b => b.date === recurring.first_date);
    
    if (firstDateBooking) {
      console.log(`✅ First date (${recurring.first_date}) has a booking`);
    } else {
      console.log(`❌ First date (${recurring.first_date}) is MISSING a booking`);
    }

    // 4. Check expected dates for the next 15 days
    console.log('\n4. 📊 Checking expected dates for next 15 days...');
    
    const startDate = new Date(recurring.first_date);
    const expectedDates = [];
    
    for (let i = 0; i <= 15; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      // Check if this date should have a booking using the database function
      const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
        'should_have_recurring_booking',
        {
          p_recurring_id: recurring.id,
          p_check_date: dateString,
        },
      );

      if (!checkError && shouldBeActive) {
        expectedDates.push(dateString);
      }
    }

    console.log(`📅 Expected dates in next 15 days: ${expectedDates.length}`);
    expectedDates.forEach((date, index) => {
      const hasBooking = existingBookings?.some(b => b.date === date);
      const status = hasBooking ? '✅ HAS BOOKING' : '❌ MISSING BOOKING';
      console.log(`   ${index + 1}. ${date} - ${status}`);
    });

    // 5. Check for gaps
    console.log('\n5. 🔍 Checking for gaps...');
    const missingDates = expectedDates.filter(
      date => !existingBookings?.some(b => b.date === date)
    );

    if (missingDates.length === 0) {
      console.log('✅ No gaps found! All expected dates have bookings.');
    } else {
      console.log(`❌ Found ${missingDates.length} missing bookings:`);
      missingDates.forEach((date, index) => {
        console.log(`   ${index + 1}. ${date}`);
      });
    }

    // 6. Show propagation analysis
    console.log('\n6. 📊 Propagation Analysis:');
    console.log('   Expected behavior when creating recurring booking:');
    console.log('   - Create booking on first_date immediately');
    console.log('   - Auto-propagate for next 15 days');
    console.log('   - Only create bookings on applicable dates (based on interval)');
    console.log('   - Skip dates that already have bookings');

    console.log('\n✅ First date propagation test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFirstDatePropagation();
