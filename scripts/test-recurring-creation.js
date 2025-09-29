const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powjqebwwkxoukdijpyy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE',
);

async function testRecurringCreation() {
  console.log('🧪 Testing Recurring Booking Creation...\n');

  try {
    // 1. Get a test user from auth.users
    console.log('1. 👤 Getting a test user...');
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError || !authUsers || authUsers.users.length === 0) {
      console.error('❌ No users found:', usersError);
      return;
    }

    const testUser = authUsers.users[0];
    console.log(`✅ Using test user: ${testUser.email} (${testUser.id})`);

    // 2. Create a test recurring booking for tomorrow at 20:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 8);
    const nextWeekString = nextWeek.toISOString().split('T')[0];

    console.log(`\n2. 📅 Creating recurring booking for ${tomorrowString} to ${nextWeekString}...`);
    
    const recurringBookingData = {
      user_id: testUser.id,
      court: 1, // Use court number instead of string
      start_time: '20:00:00',
      end_time: '21:30:00',
      duration_minutes: 90,
      first_date: tomorrowString,
      last_date: nextWeekString,
      recurrence_interval_days: 7,
    };

    console.log('📋 Recurring booking data:', recurringBookingData);

    // 3. Check if there are any conflicts first
    console.log('\n3. 🔍 Checking for conflicts...');
    
    // Check for conflicts with existing recurring bookings
    const { data: existingRecurring, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true);

    if (recurringError) {
      console.error('❌ Error checking existing recurring bookings:', recurringError);
      return;
    }

    console.log(`📊 Found ${existingRecurring?.length || 0} existing recurring bookings`);

    // Check for conflicts with regular bookings on first_date
    const { data: existingBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('date', tomorrowString)
      .eq('start_time', '20:00:00');

    if (bookingsError) {
      console.error('❌ Error checking existing bookings:', bookingsError);
      return;
    }

    if (existingBookings && existingBookings.length > 0) {
      console.log(`⚠️ Found ${existingBookings.length} existing bookings on ${tomorrowString} at 20:00`);
      console.log('   This would cause a conflict!');
      return;
    } else {
      console.log(`✅ No conflicts found on ${tomorrowString} at 20:00`);
    }

    // 4. Create the recurring booking
    console.log('\n4. 🚀 Creating recurring booking...');
    
    const { data: newRecurring, error: createError } = await supabaseAdmin
      .from('recurring_bookings')
      .insert({
        user_id: recurringBookingData.user_id,
        court: recurringBookingData.court,
        start_time: recurringBookingData.start_time,
        end_time: recurringBookingData.end_time,
        duration_minutes: recurringBookingData.duration_minutes,
        first_date: recurringBookingData.first_date,
        last_date: recurringBookingData.last_date,
        recurrence_interval_days: recurringBookingData.recurrence_interval_days,
        active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating recurring booking:', createError);
      return;
    }

    console.log(`✅ Created recurring booking: ${newRecurring.id}`);

    // 5. Create the first booking instance
    console.log('\n5. 📅 Creating first booking instance...');
    
    const { data: firstBooking, error: firstBookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: recurringBookingData.user_id,
        court: recurringBookingData.court,
        date: recurringBookingData.first_date,
        start_time: recurringBookingData.start_time,
        end_time: recurringBookingData.end_time,
        duration_minutes: recurringBookingData.duration_minutes,
        confirmed: true,
        present: false,
        cancelled: false,
        is_recurring: true,
        created_by: recurringBookingData.user_id,
        recurring_booking_id: newRecurring.id,
      })
      .select()
      .single();

    if (firstBookingError) {
      console.error('❌ Error creating first booking instance:', firstBookingError);
      return;
    }

    console.log(`✅ Created first booking instance: ${firstBooking.id}`);

    // 6. Test the propagation function
    console.log('\n6. 🔄 Testing propagation...');
    
    // Simulate the propagation logic
    const startDate = new Date(recurringBookingData.first_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 15);
    
    const bookingsToCreate = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Check if this date should have a recurring booking
      const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
        'should_have_recurring_booking',
        {
          p_recurring_id: newRecurring.id,
          p_check_date: dateString,
        },
      );

      if (!checkError && shouldBeActive) {
        // Check if booking already exists
        const { data: existingBooking, error: checkBookingError } = await supabaseAdmin
          .from('bookings')
          .select('id')
          .eq('date', dateString)
          .eq('start_time', recurringBookingData.start_time)
          .eq('recurring_booking_id', newRecurring.id)
          .single();

        if (checkBookingError && checkBookingError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error(`Error checking booking for ${dateString}:`, checkBookingError);
          continue;
        }

        if (!existingBooking) {
          bookingsToCreate.push({
            user_id: recurringBookingData.user_id,
            court: recurringBookingData.court,
            date: dateString,
            start_time: recurringBookingData.start_time,
            end_time: recurringBookingData.end_time,
            duration_minutes: recurringBookingData.duration_minutes,
            confirmed: true,
            present: false,
            cancelled: false,
            is_recurring: true,
            created_by: recurringBookingData.user_id,
            recurring_booking_id: newRecurring.id,
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`📊 Found ${bookingsToCreate.length} bookings to create`);

    if (bookingsToCreate.length > 0) {
      console.log('📅 Dates to create bookings:');
      bookingsToCreate.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.date} at ${booking.start_time}`);
      });

      // Create the bookings
      const { data: createdBookings, error: createBookingsError } = await supabaseAdmin
        .from('bookings')
        .insert(bookingsToCreate)
        .select();

      if (createBookingsError) {
        console.error('❌ Error creating propagated bookings:', createBookingsError);
      } else {
        console.log(`✅ Created ${createdBookings?.length || 0} propagated bookings`);
      }
    }

    // 7. Final verification
    console.log('\n7. ✅ Final verification...');
    
    const { data: allBookings, error: finalError } = await supabaseAdmin
      .from('bookings')
      .select('date, start_time, end_time, created_at')
      .eq('recurring_booking_id', newRecurring.id)
      .order('date', { ascending: true });

    if (finalError) {
      console.error('❌ Error in final verification:', finalError);
      return;
    }

    console.log(`📊 Total bookings created: ${allBookings?.length || 0}`);
    if (allBookings && allBookings.length > 0) {
      allBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.date} at ${booking.start_time}-${booking.end_time}`);
      });
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRecurringCreation();
