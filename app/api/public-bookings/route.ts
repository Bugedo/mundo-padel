import { NextResponse } from 'next/server';
import {
  assignCourt,
  checkRateLimit,
  findOverlappingBookings,
  formatPhoneDisplay,
  normalizeArgentinePhone,
  supabaseAdmin,
} from '@/lib/bookingUtils';
import { formatDateDisplay } from '@/lib/timezoneUtils';

interface RecurringBooking {
  id: string;
  user_id: string;
  court: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  first_date: string;
  last_date: string | null;
  recurrence_interval_days: number;
  active: boolean;
  user?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const { data: regularBookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*, user:profiles!bookings_user_id_fkey(full_name)')
      .eq('date', date)
      .neq('cancelled', true)
      .order('start_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: recurringBookings, error: recurringError } = await supabaseAdmin
      .from('recurring_bookings')
      .select('*, user:profiles!recurring_bookings_user_id_fkey(full_name)')
      .eq('active', true)
      .lte('first_date', date)
      .is('last_date', null);

    if (recurringError) {
      return NextResponse.json({ error: recurringError.message }, { status: 500 });
    }

    const applicableRecurringBookings: RecurringBooking[] = [];

    if (recurringBookings && recurringBookings.length > 0) {
      for (const recurring of recurringBookings) {
        const { data: shouldBeActive, error: checkError } = await supabaseAdmin.rpc(
          'should_have_recurring_booking',
          {
            p_recurring_id: recurring.id,
            p_check_date: date,
          },
        );

        if (!checkError && shouldBeActive) {
          applicableRecurringBookings.push(recurring);
        }
      }
    }

    const recurringBookingsForDate = applicableRecurringBookings.map((recurring) => ({
      id: `recurring-${recurring.id}`,
      user_id: recurring.user_id,
      court: recurring.court,
      date: date,
      start_time: recurring.start_time,
      end_time: recurring.end_time,
      duration_minutes: recurring.duration_minutes,
      confirmed: true,
      present: false,
      cancelled: false,
      is_recurring: true,
      recurring_booking_id: recurring.id,
      user: recurring.user,
    }));

    const allBookings = [...(regularBookings || []), ...recurringBookingsForDate];

    return NextResponse.json(allBookings);
  } catch (error: unknown) {
    console.error('Error in GET public-bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Guest booking request: creates pending booking and returns data for WhatsApp. */
export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!checkRateLimit(`guest-booking:${ip}`)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Esperá un momento e intentá de nuevo.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { guest_name, guest_phone, date, start_time, end_time, duration_minutes } = body;

    if (!guest_name?.trim() || !guest_phone || !date || !start_time || !end_time || !duration_minutes) {
      return NextResponse.json(
        { error: 'Faltan datos: nombre, celular, fecha y horario' },
        { status: 400 },
      );
    }

    if (![60, 90, 120].includes(Number(duration_minutes))) {
      return NextResponse.json({ error: 'Duración inválida' }, { status: 400 });
    }

    if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
      return NextResponse.json({ error: 'Formato de horario inválido' }, { status: 400 });
    }

    const phone = normalizeArgentinePhone(String(guest_phone));
    if (!phone) {
      return NextResponse.json({ error: 'Celular inválido' }, { status: 400 });
    }

    const name = String(guest_name).trim().slice(0, 120);

    const { error: overlapError, overlapping } = await findOverlappingBookings(
      date,
      start_time,
      end_time,
    );

    if (overlapError) {
      return NextResponse.json({ error: overlapError.message }, { status: 500 });
    }

    const { court, error: courtError } = assignCourt(overlapping);
    if (courtError || !court) {
      return NextResponse.json({ error: courtError || 'No hay canchas disponibles' }, { status: 409 });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: null,
        guest_name: name,
        guest_phone: formatPhoneDisplay(phone),
        court,
        date,
        start_time,
        end_time,
        duration_minutes: Number(duration_minutes),
        confirmed: false,
        present: false,
        cancelled: false,
        expires_at: null,
        created_by: null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '543517703596';
    const message = [
      'Hola! Quiero reservar una cancha:',
      `Nombre: ${name}`,
      `Celular: ${formatPhoneDisplay(phone)}`,
      `Fecha: ${formatDateDisplay(date)}`,
      `Horario: ${start_time} - ${end_time} (${duration_minutes} min)`,
    ].join('\n');

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      ...data,
      whatsapp_url: whatsappUrl,
      whatsapp_message: message,
    });
  } catch (error: unknown) {
    console.error('Error in POST public-bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
