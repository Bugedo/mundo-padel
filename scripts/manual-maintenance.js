const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powjqebwwkxoukdijpyy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE',
);

async function manualMaintenance() {
  console.log('🔧 Running Manual Maintenance...\n');

  try {
    // Get current date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Calculate 15 days ahead
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 15);
    const endDateString = endDate.toISOString().split('T')[0];

    console.log(`📅 Ensuring bookings from ${todayString} to ${endDateString} (15 days)`);

    // Get all active recurring bookings
    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true);

    if (recurringError) {
      console.error('❌ Error fetching recurring bookings:', recurringError);
      return;
    }

    if (!recurringBookings || recurringBookings.length === 0) {
      console.log('ℹ️ No active recurring bookings found');
      return;
    }

    console.log(`📋 Found ${recurringBookings.length} active recurring bookings`);

    // Get ALL existing recurring bookings for the entire range
    const { data: allExistingBookings, error: allExistingError } = await supabaseAdmin
      .from('bookings')
      .select('date, recurring_booking_id')
      .eq('is_recurring', true)
      .gte('date', todayString)
      .lte('date', endDateString);

    if (allExistingError) {
      console.error('❌ Error fetching existing bookings:', allExistingError);
      return;
    }

    // Create a map for quick lookup: date -> Set of recurring_booking_ids
    const existingBookingsMap = new Map();
    allExistingBookings?.forEach((booking) => {
      if (!existingBookingsMap.has(booking.date)) {
        existingBookingsMap.set(booking.date, new Set());
      }
      if (booking.recurring_booking_id) {
        existingBookingsMap.get(booking.date).add(booking.recurring_booking_id);
      }
    });

    console.log(`📊 Found existing bookings for ${existingBookingsMap.size} dates in the range`);

    let totalBookingsCreated = 0;
    let daysProcessed = 0;
    const errors = [];

    // Process each day in the range
    const currentDate = new Date(today);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const existingForDate = existingBookingsMap.get(dateString) || new Set();
      daysProcessed++;

      console.log(`\n📅 Processing date: ${dateString} (${existingForDate.size} existing)`);

      const bookingsToCreate = [];

      // Process each recurring booking
      for (const recurring of recurringBookings) {
        // Skip if booking already exists for this date
        if (existingForDate.has(recurring.id)) {
          console.log(`⏭️ Skipping ${recurring.id} - already exists`);
          continue;
        }

        // Check if this date should have a recurring booking
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
          console.log(`⏭️ Skipping ${recurring.id} - not applicable for ${dateString}`);
          continue;
        }

        // Prepare booking for batch insert
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

        console.log(`➕ Queued booking for ${recurring.id} at ${recurring.start_time}`);
      }

      // Batch insert all bookings for this date
      if (bookingsToCreate.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('bookings')
          .insert(bookingsToCreate);

        if (insertError) {
          console.error(`❌ Error creating bookings for ${dateString}:`, insertError);
          errors.push(`Error creating bookings for ${dateString}: ${insertError.message}`);
        } else {
          totalBookingsCreated += bookingsToCreate.length;
          console.log(`✅ Created ${bookingsToCreate.length} bookings for ${dateString}`);
        }
      } else {
        console.log(`✅ No bookings needed for ${dateString} - all covered`);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`\n🎉 Manual maintenance completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Days processed: ${daysProcessed}`);
    console.log(`   - Bookings created: ${totalBookingsCreated}`);
    console.log(`   - Recurring bookings: ${recurringBookings.length}`);
    console.log(`   - Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error) => console.log(`   - ${error}`));
    }

    // Verify the result
    console.log('\n🔍 Verifying results...');
    const { data: finalBookings, error: finalError } = await supabaseAdmin
      .from('bookings')
      .select('date, recurring_booking_id')
      .eq('is_recurring', true)
      .gte('date', todayString)
      .lte('date', endDateString);

    if (!finalError && finalBookings) {
      const finalBookingsByDate = finalBookings.reduce((acc, booking) => {
        acc[booking.date] = (acc[booking.date] || 0) + 1;
        return acc;
      }, {});

      const expectedPerDay = recurringBookings.length;
      let gaps = 0;

      Object.keys(finalBookingsByDate).forEach((date) => {
        if (finalBookingsByDate[date] < expectedPerDay) {
          gaps++;
        }
      });

      console.log(`✅ Final verification:`);
      console.log(`   - Total bookings in range: ${finalBookings.length}`);
      console.log(`   - Days with gaps: ${gaps}`);
      console.log(`   - Coverage: ${gaps === 0 ? '100%' : 'Partial'}`);
    }
  } catch (error) {
    console.error('❌ Maintenance failed:', error);
  }
}

manualMaintenance();
