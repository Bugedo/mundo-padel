'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';

interface Booking {
  id: string;
  user_id: string;
  court: number;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confirmed: boolean;
  present: boolean;
  cancelled: boolean;
  expires_at?: string;
  is_recurring?: boolean;
  recurring_booking_id?: string;
}

interface PendingBooking {
  id: string;
  user_id: string;
  court: number;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confirmed: boolean;
  expires_at: string;
}

const allSlots = [
  { start: '08:00', end: '08:30' },
  { start: '08:30', end: '09:00' },
  { start: '09:00', end: '09:30' },
  { start: '09:30', end: '10:00' },
  { start: '10:00', end: '10:30' },
  { start: '10:30', end: '11:00' },
  { start: '11:00', end: '11:30' },
  { start: '11:30', end: '12:00' },
  { start: '12:00', end: '12:30' },
  { start: '12:30', end: '13:00' },
  { start: '13:00', end: '13:30' },
  { start: '13:30', end: '14:00' },
  { start: '14:00', end: '14:30' },
  { start: '14:30', end: '15:00' },
  { start: '15:00', end: '15:30' },
  { start: '15:30', end: '16:00' },
  { start: '16:00', end: '16:30' },
  { start: '16:30', end: '17:00' },
  { start: '17:00', end: '17:30' },
  { start: '17:30', end: '18:00' },
  { start: '18:00', end: '18:30' },
  { start: '18:30', end: '19:00' },
  { start: '19:00', end: '19:30' },
  { start: '19:30', end: '20:00' },
  { start: '20:00', end: '20:30' },
  { start: '20:30', end: '21:00' },
  { start: '21:00', end: '21:30' },
  { start: '21:30', end: '22:00' },
  { start: '22:00', end: '22:30' },
  { start: '22:30', end: '23:00' },
  { start: '23:00', end: '23:30' },
  { start: '23:30', end: '00:00' },
];

export default function Turnero() {
  const { user, loading } = useUser();
  const baseDate = useRef(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [showDurations, setShowDurations] = useState(false);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showEarly, setShowEarly] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);

  const slots = showEarly ? allSlots : allSlots.filter((slot) => slot.start >= '16:30');
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const fetchBookings = useCallback(async () => {
    const dateString = formatDate(selectedDate);

    // Use public endpoint to get bookings for the date
    const response = await fetch(`/api/public-bookings?date=${dateString}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      setBookings(data);
    } else {
      console.error('Error fetching bookings:', response.status);
    }
  }, [selectedDate]);

  // Fetch recurring bookings for the selected date
  const fetchRecurringBookings = useCallback(async () => {
    const dateString = formatDate(selectedDate);
    const selectedDateObj = new Date(selectedDate);
    const dayOfWeek = selectedDateObj.getDay(); // 0-6 (Sunday-Saturday)

    const { data, error } = await supabase
      .from('recurring_bookings')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('active', true);

    if (!error && data) {
      // Convert recurring bookings to regular bookings for the selected date
      const recurringBookingsForDate = data.map((recurring) => ({
        id: `recurring-${recurring.id}`,
        user_id: recurring.user_id,
        court: recurring.court,
        date: dateString,
        start_time: recurring.start_time,
        end_time: recurring.end_time,
        duration_minutes: recurring.duration_minutes,
        confirmed: true, // Recurring bookings are always confirmed
        present: false,
        expires_at: undefined,
        cancelled: false,
        is_recurring: true, // Flag to identify recurring bookings
      }));

      // Add recurring bookings to existing bookings
      setBookings((prevBookings) => {
        const regularBookings = prevBookings.filter((b) => !b.is_recurring);
        return [...regularBookings, ...recurringBookingsForDate];
      });
    }
  }, [selectedDate]);

  useEffect(() => {
    const loadBookings = async () => {
      await fetchBookings();
      await fetchRecurringBookings();
    };

    loadBookings();
  }, [selectedDate, fetchBookings, fetchRecurringBookings]);

  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);

    const minDate = new Date(baseDate.current);
    const maxDate = new Date(baseDate.current);
    maxDate.setDate(baseDate.current.getDate() + 6);

    if (newDate >= minDate && newDate <= maxDate) {
      setSelectedDate(newDate);
      setSelectedSlot(null);
      setPendingBooking(null);
    }
  };

  const isFullyReserved = (time: string) => {
    const [th, tm] = time.split(':').map(Number);
    const checkMinutes = th * 60 + tm;

    // Get all active bookings that overlap with this time
    const overlappingBookings = bookings.filter((b) => {
      const [bh, bm] = b.start_time.split(':').map(Number);
      const bStart = bh * 60 + bm;
      const bEnd = bStart + (b.duration_minutes || 90);
      const active =
        (b.confirmed || (b.expires_at && new Date(b.expires_at) > new Date())) && !b.cancelled;
      return active && checkMinutes >= bStart && checkMinutes < bEnd;
    });

    // Count unique courts that are occupied
    const occupiedCourts = new Set(
      overlappingBookings.map((b) => b.court).filter((court) => court !== null),
    );

    return occupiedCourts.size >= 3;
  };

  const canFitDuration = (start_time: string, dur: number) => {
    const [h, m] = start_time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + dur;

    for (let minute = startMinutes; minute < endMinutes; minute += 30) {
      // Get all active bookings that overlap with this minute
      const overlappingBookings = bookings.filter((b) => {
        const [bh, bm] = b.start_time.split(':').map(Number);
        const bStart = bh * 60 + bm;
        const bEnd = bStart + (b.duration_minutes || 90);
        const active =
          (b.confirmed || (b.expires_at && new Date(b.expires_at) > new Date())) && !b.cancelled;
        return active && minute >= bStart && minute < bEnd;
      });

      // Count unique courts that are occupied
      const occupiedCourts = new Set(
        overlappingBookings.map((b) => b.court).filter((court) => court !== null),
      );

      if (occupiedCourts.size >= 3) return false;
    }

    return true;
  };

  const isHighlighted = (time: string) => {
    const ref = selectedSlot || hoverSlot;
    if (!ref) return false;
    if (!canFitDuration(ref, duration)) return false;

    const [h, m] = time.split(':').map(Number);
    const [rh, rm] = ref.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const refMinutes = rh * 60 + rm;

    return slotMinutes >= refMinutes && slotMinutes < refMinutes + duration;
  };

  // This version checks overlapping ranges for court assignment
  const createBooking = async () => {
    if (!user || loading || !selectedSlot) return;
    if (!canFitDuration(selectedSlot, duration)) {
      alert('Not enough space for this duration in the selected slot');
      return;
    }

    const dateString = formatDate(selectedDate);

    const [h, m] = selectedSlot.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;

    const start_time = selectedSlot;
    const end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // Use the API endpoint to create booking with automatic court assignment
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        date: dateString,
        start_time,
        end_time,
        duration_minutes: duration,
        confirmed: false,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setPendingBooking(data);
      fetchBookings();
      setSelectedSlot(null);
    } else {
      const errorData = await response.json();
      console.error('Booking creation error:', errorData);
      alert(`Error creating booking: ${errorData.error}`);
    }
  };

  return (
    <section className="p-6 bg-background text-white min-h-[70vh]">
      {/* Date navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeDate(-1)}
            className="bg-accent px-3 py-1 rounded hover:bg-accent-hover text-neutral"
          >
            ← Día anterior
          </button>
          <span className="font-semibold">
            {selectedDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <button
            onClick={() => changeDate(1)}
            className="bg-accent px-3 py-1 rounded hover:bg-accent-hover text-neutral"
          >
            Día siguiente →
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDurations(!showDurations)}
            className="bg-accent text-background px-4 py-2 rounded"
          >
            {duration} min
          </button>
          {showDurations && (
            <div className="absolute mt-2 bg-surface rounded shadow-lg flex flex-col border border-muted">
              {[60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDuration(d as 60 | 90 | 120);
                    setShowDurations(false);
                    setSelectedSlot(null);
                  }}
                  className={`px-4 py-2 hover:bg-accent ${d === duration ? 'bg-primary text-light' : 'text-neutral'}`}
                >
                  {d} min
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowEarly(!showEarly)}
          className="bg-accent px-3 py-1 rounded hover:bg-accent-hover text-neutral"
        >
          {showEarly ? 'Ocultar temprano' : 'Mostrar temprano'}
        </button>
      </div>

      {/* Slots grid */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 gap-2 max-w-[800px] w-full">
          {slots.map(({ start, end }) => {
            const [h, m] = start.split(':').map(Number);
            const startMinutes = h * 60 + m;
            const outsideLimit = startMinutes > 24 * 60 - duration;
            const fullyReserved = isFullyReserved(start);
            const canFit = canFitDuration(start, duration);
            const highlighted = isHighlighted(start);

            return (
              <div
                key={start}
                className={`h-12 rounded-sm flex items-center justify-center font-medium transition-colors cursor-pointer border-2 ${
                  fullyReserved
                    ? 'bg-red-500 text-white border-red-600'
                    : highlighted
                      ? 'bg-green-500 text-white border-green-600'
                      : selectedSlot === start
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-white text-black border-gray-300'
                }`}
                onMouseEnter={() => {
                  if (!fullyReserved && !outsideLimit && canFit) setHoverSlot(start);
                }}
                onMouseLeave={() => setHoverSlot(null)}
                onClick={() => {
                  if (!fullyReserved && !outsideLimit && canFit) setSelectedSlot(start);
                }}
              >
                {start} - {end}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected slot info and confirm button */}
      {selectedSlot && user && !loading && (
        <div className="mt-6 mb-6 space-y-4">
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium">
              Horario seleccionado: <span className="font-bold">{selectedSlot}</span>
            </p>
            <p className="text-blue-600 text-sm">
              Duración: {duration} minutos
            </p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={createBooking}
              className="bg-green-600 px-8 py-3 rounded-lg text-white hover:bg-green-700 font-semibold text-lg shadow-lg transition-colors w-full max-w-xs"
            >
              ✅ Confirmar reserva
            </button>
          </div>
        </div>
      )}

      {/* Debug info for mobile */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-800 rounded">
          Debug: selectedSlot={selectedSlot ? 'true' : 'false'}, user={user ? 'true' : 'false'}, loading={loading ? 'true' : 'false'}
        </div>
      )}

      {/* Pending booking timer */}
      {pendingBooking && (
        <BookingPending booking={pendingBooking} onExpire={() => setPendingBooking(null)} />
      )}
    </section>
  );
}

function BookingPending({ booking, onExpire }: { booking: PendingBooking; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const expires = new Date(booking.expires_at).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking.expires_at, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="mt-4 bg-yellow-100 p-4 rounded text-black text-center">
      <p className="mb-2">Para confirmar tu reserva, contáctanos para pagar el depósito.</p>
      <p className="font-bold">
        Tiempo restante: {minutes}:{seconds.toString().padStart(2, '0')}
      </p>
    </div>
  );
}
