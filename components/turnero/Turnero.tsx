'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  getBuenosAiresDate,
  formatDateOnly,
  getAvailableDatesBuenosAires,
  isTodayBuenosAires,
} from '@/lib/timezoneUtils';

const supabase = createClient();

const LS_GUEST_NAME = 'mp_guest_name';
const LS_GUEST_PHONE = 'mp_guest_phone';

interface Booking {
  id: string;
  user_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  court: number;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confirmed: boolean;
  present: boolean;
  cancelled: boolean;
  is_recurring?: boolean;
  recurring_booking_id?: string;
}

interface PendingBooking {
  id: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  court: number;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confirmed: boolean;
  whatsapp_url?: string;
}

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

function loadGuestFromStorage() {
  if (typeof window === 'undefined') return { name: '', phone: '' };
  try {
    return {
      name: localStorage.getItem(LS_GUEST_NAME) || '',
      phone: localStorage.getItem(LS_GUEST_PHONE) || '',
    };
  } catch {
    return { name: '', phone: '' };
  }
}

function saveGuestToStorage(name: string, phone: string) {
  try {
    localStorage.setItem(LS_GUEST_NAME, name);
    localStorage.setItem(LS_GUEST_PHONE, phone);
  } catch {
    // ignore quota / private mode
  }
}

export default function Turnero() {
  const [step, setStep] = useState<'slots' | 'guest'>('slots');
  const [selectedDate, setSelectedDate] = useState(getBuenosAiresDate());
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showEarly, setShowEarly] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsCache, setBookingsCache] = useState<{ [date: string]: Booking[] }>({});
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const slots = showEarly ? allSlots : allSlots.filter((slot) => slot.start >= '16:30');

  useEffect(() => {
    const saved = loadGuestFromStorage();
    if (saved.name) setGuestName(saved.name);
    if (saved.phone) setGuestPhone(saved.phone);
  }, []);

  const redSlotsByDate = useMemo(() => {
    const redSlots: { [date: string]: Set<string> } = {};

    Object.keys(bookingsCache).forEach((dateString) => {
      const bookingsForDate = bookingsCache[dateString];
      const redSlotsForDate = new Set<string>();

      allSlots.forEach((slot) => {
        const [th, tm] = slot.start.split(':').map(Number);
        const checkMinutes = th * 60 + tm;

        const overlappingBookings = bookingsForDate.filter((b) => {
          const [bh, bm] = b.start_time.split(':').map(Number);
          const bStart = bh * 60 + bm;
          const bEnd = bStart + (b.duration_minutes || 90);
          const active = !b.cancelled;
          return active && checkMinutes >= bStart && checkMinutes < bEnd;
        });

        const occupiedCourts = new Set(
          overlappingBookings.map((b) => b.court).filter((court) => court !== null),
        );

        if (occupiedCourts.size >= 3) {
          redSlotsForDate.add(slot.start);
        }
      });

      redSlots[dateString] = redSlotsForDate;
    });

    return redSlots;
  }, [bookingsCache]);

  const getAvailableDates = (): Date[] => getAvailableDatesBuenosAires();

  const formatDayName = (date: Date) => date.toLocaleDateString('es-AR', { weekday: 'short' });

  const formatDayNumber = (date: Date) => date.getDate();

  const formatMonth = (date: Date) => date.toLocaleDateString('es-AR', { month: 'short' });

  const formatDateLabel = (date: Date) =>
    date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  const isToday = (date: Date) => isTodayBuenosAires(date);

  const isSelected = useCallback(
    (date: Date) => date.toDateString() === selectedDate.toDateString(),
    [selectedDate],
  );

  const handleDateChange = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      setStep('slots');
      const dateString = formatDateOnly(date);
      if (bookingsCache[dateString]) {
        setBookings(bookingsCache[dateString]);
      }
    },
    [bookingsCache],
  );

  const fetchRecurringBookings = useCallback(async () => {
    const dateString = formatDateOnly(selectedDate);

    const { data: recurringBookings, error } = await supabase
      .from('recurring_bookings')
      .select('*')
      .eq('active', true)
      .lte('first_date', dateString)
      .is('last_date', null);

    if (!error && recurringBookings) {
      const applicableRecurringBookings: RecurringBooking[] = [];

      for (const recurring of recurringBookings) {
        const { data: shouldBeActive, error: checkError } = await supabase.rpc(
          'should_have_recurring_booking',
          {
            p_recurring_id: recurring.id,
            p_check_date: dateString,
          },
        );

        if (!checkError && shouldBeActive) {
          applicableRecurringBookings.push(recurring);
        }
      }

      const recurringBookingsForDate = applicableRecurringBookings.map((recurring) => ({
        id: `recurring-${recurring.id}`,
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
      }));

      setBookings((prevBookings) => {
        const regularBookings = prevBookings.filter((b) => !b.is_recurring);
        return [...regularBookings, ...recurringBookingsForDate];
      });
    }
  }, [selectedDate]);

  useEffect(() => {
    const loadInitialData = async () => {
      const availableDates = getAvailableDatesBuenosAires();
      const newCache: { [date: string]: Booking[] } = {};

      try {
        const promises = availableDates.map(async (date) => {
          const dateString = formatDateOnly(date);
          const response = await fetch(`/api/public-bookings?date=${dateString}`, {
            cache: 'no-store',
          });

          if (response.ok) {
            const data = await response.json();
            newCache[dateString] = data;
          } else {
            console.error(`Error fetching bookings for ${dateString}:`, response.status);
            newCache[dateString] = [];
          }
        });

        await Promise.all(promises);
        setBookingsCache(newCache);

        const selectedDateString = formatDateOnly(selectedDate);
        setBookings(newCache[selectedDateString] || []);
      } catch (error) {
        console.error('Error loading initial bookings:', error);
      }
    };

    loadInitialData();
  }, [selectedDate]);

  useEffect(() => {
    fetchRecurringBookings();
  }, [selectedDate, fetchRecurringBookings]);

  const isFullyReserved = useCallback(
    (time: string) => {
      const dateString = formatDateOnly(selectedDate);
      return redSlotsByDate[dateString]?.has(time) || false;
    },
    [selectedDate, redSlotsByDate],
  );

  const canFitDuration = useCallback(
    (start_time: string, dur: number) => {
      const [h, m] = start_time.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + dur;
      const dateString = formatDateOnly(selectedDate);

      for (let minute = startMinutes; minute < endMinutes; minute += 30) {
        const timeString = `${Math.floor(minute / 60)
          .toString()
          .padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`;

        if (redSlotsByDate[dateString]?.has(timeString)) {
          return false;
        }
      }

      return true;
    },
    [selectedDate, redSlotsByDate],
  );

  const isHighlighted = useCallback(
    (time: string) => {
      const ref = selectedSlot || hoverSlot;
      if (!ref) return false;
      if (!canFitDuration(ref, duration)) return false;

      const [h, m] = time.split(':').map(Number);
      const [rh, rm] = ref.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      const refMinutes = rh * 60 + rm;

      return slotMinutes >= refMinutes && slotMinutes < refMinutes + duration;
    },
    [selectedSlot, hoverSlot, canFitDuration, duration],
  );

  const endTimeForSelection = () => {
    if (!selectedSlot) return '';
    const [h, m] = selectedSlot.split(':').map(Number);
    const endMinutes = h * 60 + m + duration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const createBooking = async () => {
    if (!selectedSlot || submitting) return;
    setFormError('');

    if (!guestName.trim()) {
      setFormError('Ingresá tu nombre');
      return;
    }
    if (!guestPhone.trim()) {
      setFormError('Ingresá tu celular');
      return;
    }

    if (!canFitDuration(selectedSlot, duration)) {
      setFormError('No hay espacio suficiente para esta duración');
      return;
    }

    const dateString = formatDateOnly(selectedDate);
    const start_time = selectedSlot;
    const end_time = endTimeForSelection();
    const name = guestName.trim();
    const phone = guestPhone.trim();

    setSubmitting(true);
    try {
      const response = await fetch('/api/public-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: name,
          guest_phone: phone,
          date: dateString,
          start_time,
          end_time,
          duration_minutes: duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || 'No se pudo crear la solicitud');
        return;
      }

      saveGuestToStorage(name, phone);
      setPendingBooking(data);

      const updatedBookings = [...bookings, data];
      setBookings(updatedBookings);
      setBookingsCache((prev) => ({ ...prev, [dateString]: updatedBookings }));
      setSelectedSlot(null);
      setStep('slots');

      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      setFormError('Error de conexión. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'guest' && selectedSlot) {
    return (
      <section
        id="turnero"
        className="rounded-[28px] border border-muted bg-surface p-4 text-neutral shadow-2xl sm:p-[22px]"
      >
        <div className="mx-auto max-w-md space-y-6">
          <button
            type="button"
            onClick={() => {
              setStep('slots');
              setFormError('');
            }}
            className="text-sm font-semibold underline underline-offset-4 hover:text-accent"
          >
            ← Volver al turnero
          </button>

          <div className="text-center space-y-1">
            <h2 className="text-4xl font-extrabold text-accent">Tus datos</h2>
            <p className="text-sm text-neutral-muted">
              {formatDateLabel(selectedDate)} · {selectedSlot} – {endTimeForSelection()} ({duration}{' '}
              min)
            </p>
          </div>

          <div className="space-y-4 rounded-[18px] border border-muted bg-surface-light p-5 text-neutral">
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="guest-name">
                Nombre
              </label>
              <input
                id="guest-name"
                type="text"
                name="name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-[10px] border border-muted bg-background px-3 py-3 text-base text-neutral placeholder:text-neutral-muted"
                placeholder="Tu nombre"
                autoComplete="name"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="guest-phone">
                Celular
              </label>
              <div className="flex gap-2">
                <span className="flex items-center rounded-[10px] border border-muted bg-muted px-3 text-sm">
                  +54
                </span>
                <input
                  id="guest-phone"
                  type="tel"
                  name="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="flex-1 rounded-[10px] border border-muted bg-background px-3 py-3 text-base text-neutral placeholder:text-neutral-muted"
                  placeholder="351 123 4567"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>
            </div>
            {formError && (
              <p className="text-center text-sm font-semibold text-red-700">{formError}</p>
            )}
            <button
              onClick={createBooking}
              disabled={submitting}
              className="w-full rounded-full bg-accent px-8 py-3 text-lg font-extrabold text-dark transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? 'Enviando…' : 'Solicitar por WhatsApp'}
            </button>
          </div>

          {pendingBooking && <BookingPending booking={pendingBooking} />}
        </div>
      </section>
    );
  }

  return (
    <section
      id="turnero"
      aria-label="Turnos disponibles"
      className="rounded-[28px] border border-muted bg-surface p-4 text-neutral shadow-2xl sm:p-[22px]"
    >
      <h2 className="sr-only">Elegí un turno</h2>
      <div className="mb-[18px]">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Día">
            {getAvailableDates().map((date) => (
              <button
                key={formatDateOnly(date)}
                onClick={() => handleDateChange(date)}
                aria-pressed={isSelected(date)}
                className={`flex h-[68px] min-w-[60px] shrink-0 flex-col items-center justify-center rounded-[14px] border-2 px-3 text-sm font-semibold transition-colors ${
                  isSelected(date)
                    ? 'border-accent bg-accent text-dark'
                    : isToday(date)
                      ? 'border-neutral-muted bg-surface-light text-neutral hover:border-accent hover:bg-accent hover:text-dark'
                      : 'border-muted bg-surface-light text-neutral hover:border-accent hover:bg-accent hover:text-dark'
                }`}
              >
                <span className="text-xs">{isToday(date) ? 'Hoy' : formatDayName(date)}</span>
                <span className="text-[22px] font-extrabold leading-6">
                  {formatDayNumber(date)}
                </span>
                <span className="text-xs">{formatMonth(date)}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Duración</span>
              <div className="flex overflow-hidden rounded-full border border-muted">
                {[60, 90, 120].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDuration(d as 60 | 90 | 120);
                      setSelectedSlot(null);
                      setStep('slots');
                    }}
                    className={`px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
                      d === duration
                        ? 'bg-accent text-dark'
                        : 'bg-surface-light text-neutral hover:bg-accent hover:text-dark'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowEarly(!showEarly)}
              className="rounded-full border border-neutral-muted px-3 py-2 text-sm font-semibold hover:border-accent hover:bg-accent hover:text-dark"
            >
              {showEarly ? 'Ocultar matutinos' : 'Horarios matutinos'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[6px]">
        {slots.map(({ start, end }) => {
          const [h, m] = start.split(':').map(Number);
          const startMinutes = h * 60 + m;
          const outsideLimit = startMinutes > 24 * 60 - duration;
          const fullyReserved = isFullyReserved(start);
          const canFit = canFitDuration(start, duration);
          const highlighted = isHighlighted(start);

          return (
            <button
              type="button"
              key={start}
              disabled={fullyReserved || outsideLimit || !canFit}
              aria-pressed={selectedSlot === start}
              className={`flex h-[42px] items-center justify-center rounded-[10px] border-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                fullyReserved
                  ? 'border-muted bg-muted text-neutral-muted'
                  : highlighted
                    ? 'border-accent bg-accent text-dark'
                    : selectedSlot === start
                      ? 'border-accent bg-accent text-dark'
                      : outsideLimit || !canFit
                        ? 'border-muted bg-muted text-neutral-muted'
                        : 'border-neutral-muted bg-transparent text-neutral hover:border-accent hover:bg-accent hover:text-dark'
              }`}
              onMouseEnter={() => {
                if (!fullyReserved && !outsideLimit && canFit) setHoverSlot(start);
              }}
              onMouseLeave={() => setHoverSlot(null)}
              onClick={() => {
                if (!fullyReserved && !outsideLimit && canFit) {
                  setSelectedSlot(start);
                  setPendingBooking(null);
                }
              }}
            >
              {fullyReserved ? 'Ocupado' : `${start} – ${end}`}
            </button>
          );
        })}
      </div>

      {pendingBooking && step === 'slots' && !selectedSlot && (
        <BookingPending booking={pendingBooking} />
      )}

      {selectedSlot && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-muted pt-4">
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">
              {selectedSlot} – {endTimeForSelection()}
            </p>
            <p className="truncate text-xs opacity-80">
              {formatDateLabel(selectedDate)} · {duration} min
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setStep('guest');
            }}
            className="shrink-0 rounded-full bg-accent px-5 py-3 font-extrabold text-dark transition-colors hover:bg-accent-hover"
          >
            Continuar
          </button>
        </div>
      )}
    </section>
  );
}

function BookingPending({ booking }: { booking: PendingBooking }) {
  return (
    <div className="mx-auto mt-6 max-w-[800px] rounded-[18px] border border-muted bg-surface-light p-4 text-center text-neutral">
      <p className="mb-2 font-semibold">Tu solicitud quedó pendiente de confirmación.</p>
      <p className="text-sm mb-3">
        Recepción la verá en el turnero. Si no se abrió WhatsApp, usá el botón de abajo.
      </p>
      {booking.whatsapp_url && (
        <a
          href={booking.whatsapp_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-full bg-accent px-4 py-2 font-semibold text-dark hover:bg-accent-hover"
        >
          Abrir WhatsApp
        </a>
      )}
    </div>
  );
}
