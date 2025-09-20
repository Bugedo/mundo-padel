import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBuenosAiresDate } from '@/lib/timezoneUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST() {
  try {
    // Verificar que es lunes (0 = domingo, 1 = lunes)
    const now = getBuenosAiresDate();
    const dayOfWeek = now.getDay();

    if (dayOfWeek !== 1) {
      return NextResponse.json({
        message: 'Weekly propagation only runs on Mondays',
        currentDay: dayOfWeek,
        skipped: true,
      });
    }

    console.log('🚀 Starting weekly recurring bookings propagation...');

    // Obtener todas las reservas recurrentes activas
    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*')
      .eq('active', true);

    if (recurringError) {
      console.error('Error fetching recurring bookings:', recurringError);
      return NextResponse.json({ error: 'Failed to fetch recurring bookings' }, { status: 500 });
    }

    if (!recurringBookings || recurringBookings.length === 0) {
      return NextResponse.json({
        message: 'No active recurring bookings found',
        propagated: 0,
      });
    }

    console.log(`📅 Found ${recurringBookings.length} active recurring bookings`);

    let totalPropagated = 0;
    const errors: string[] = [];

    // Procesar cada reserva recurrente
    for (const recurring of recurringBookings) {
      try {
        console.log(`Processing recurring booking ${recurring.id} for user ${recurring.user_id}`);

        // Calcular las fechas para las próximas 2 semanas (14 días)
        const startDate = new Date(now);
        startDate.setDate(now.getDate() + 7); // Empezar desde la próxima semana

        for (let week = 0; week < 2; week++) {
          const targetDate = new Date(startDate);
          targetDate.setDate(startDate.getDate() + week * 7 + recurring.day_of_week);

          const dateString = targetDate.toISOString().split('T')[0];

          // Verificar si ya existe una reserva para esta fecha y recurring_booking_id
          const { data: existingBookings, error: existingError } = await supabaseAdmin
            .from('bookings')
            .select('id, cancelled')
            .eq('date', dateString)
            .eq('recurring_booking_id', recurring.id);

          if (existingError) {
            console.error(`Error checking existing bookings for ${dateString}:`, existingError);
            errors.push(
              `Error checking existing bookings for ${dateString}: ${existingError.message}`,
            );
            continue;
          }

          // Si ya existe una reserva (activa o cancelada), no crear duplicado
          if (existingBookings && existingBookings.length > 0) {
            const existingBooking = existingBookings[0];
            console.log(
              `Booking already exists for ${dateString} (${existingBooking.cancelled ? 'cancelled' : 'active'}) - skipping`,
            );
            continue;
          }

          // Verificar que la fecha esté dentro del rango de la reserva recurrente
          const recurringStartDate = new Date(recurring.start_date);
          const recurringEndDate = recurring.end_date ? new Date(recurring.end_date) : null;

          if (
            targetDate < recurringStartDate ||
            (recurringEndDate && targetDate > recurringEndDate)
          ) {
            console.log(`Date ${dateString} is outside recurring booking date range - skipping`);
            continue;
          }

          // Crear la nueva reserva
          const { error: insertError } = await supabaseAdmin.from('bookings').insert({
            user_id: recurring.user_id,
            court: recurring.court,
            date: dateString,
            start_time: recurring.start_time,
            end_time: recurring.end_time,
            duration_minutes: recurring.duration_minutes,
            confirmed: true,
            present: false,
            cancelled: false,
            recurring_booking_id: recurring.id,
            created_by: recurring.user_id,
          });

          if (insertError) {
            console.error(`Error creating booking for ${dateString}:`, insertError);
            errors.push(`Error creating booking for ${dateString}: ${insertError.message}`);
          } else {
            totalPropagated++;
            console.log(`✅ Created booking for ${dateString} at ${recurring.start_time}`);
          }
        }
      } catch (error) {
        console.error(`Error processing recurring booking ${recurring.id}:`, error);
        errors.push(`Error processing recurring booking ${recurring.id}: ${error}`);
      }
    }

    console.log(`🎉 Weekly propagation completed! Created ${totalPropagated} new bookings`);

    return NextResponse.json({
      success: true,
      message: 'Weekly propagation completed successfully',
      propagated: totalPropagated,
      recurringBookings: recurringBookings.length,
      errors: errors,
      executedAt: now.toISOString(),
      timezone: 'Buenos Aires (UTC-3)',
    });
  } catch (error) {
    console.error('Error in weekly propagation:', error);
    return NextResponse.json(
      { error: 'Internal server error during weekly propagation' },
      { status: 500 },
    );
  }
}

// Endpoint GET para testing manual
export async function GET() {
  try {
    console.log('Manual trigger of weekly propagation...');

    // Llamar directamente a la lógica POST sin parámetros
    return await POST();
  } catch (error) {
    console.error('Error in manual weekly propagation:', error);
    return NextResponse.json(
      { error: 'Internal server error during manual weekly propagation' },
      { status: 500 },
    );
  }
}
