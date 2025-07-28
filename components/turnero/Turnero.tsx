'use client';

import { useState, useRef, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';

// Manual slots from 08:00 to 00:00
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
  const [bookings, setBookings] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);

  const slots = showEarly ? allSlots : allSlots.filter((slot) => slot.start >= '16:30');
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Fetch all courts
  const fetchCourts = async () => {
    const { data, error } = await supabase.from('courts').select('id, name');
    if (!error && data) setCourts(data);
  };

  // Fetch bookings with duration
  const fetchBookings = async () => {
    const dateString = formatDate(selectedDate);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, user_id, court_id, date, start_time, end_time, duration_minutes')
      .eq('date', dateString);

    if (!error && data) setBookings(data);
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [selectedDate]);

  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);

    const minDate = new Date(baseDate.current);
    const maxDate = new Date(baseDate.current);
    maxDate.setDate(baseDate.current.getDate() + 6);

    if (newDate >= minDate && newDate <= maxDate) {
      setSelectedDate(newDate);
      setSelectedSlot(null);
    }
  };

  const createBooking = async () => {
    if (!user || loading || !selectedSlot) return;

    const dateString = formatDate(selectedDate);

    const [h, m] = selectedSlot.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;

    const start_time = selectedSlot;
    const end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const occupied = bookings.filter((b) => b.start_time === start_time).map((b) => b.court_id);

    const availableCourt = courts.find((c) => !occupied.includes(c.id));

    if (!availableCourt) {
      alert('All courts are occupied in this slot');
      return;
    }

    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      created_by: user.id,
      court_id: availableCourt.id,
      date: dateString,
      start_time,
      end_time,
      duration_minutes: duration,
    });

    if (!error) {
      fetchBookings();
      setSelectedSlot(null);
      alert('Booking created successfully');
    } else {
      console.error('Insert error:', error);
    }
  };

  // Fully occupied if all courts have this slot booked
  const isFullyReserved = (time: string) => {
    const count = bookings.filter((b) => {
      const start = b.start_time;
      const dur = b.duration_minutes || 90;
      const [h, m] = start.split(':').map(Number);
      const bookingStart = h * 60 + m;
      const bookingEnd = bookingStart + dur;

      const [th, tm] = time.split(':').map(Number);
      const checkMinutes = th * 60 + tm;

      return checkMinutes >= bookingStart && checkMinutes < bookingEnd;
    }).length;

    return courts.length > 0 && count >= courts.length;
  };

  const isHighlighted = (time: string) => {
    const ref = selectedSlot || hoverSlot;
    if (!ref) return false;

    const [h, m] = time.split(':').map(Number);
    const [rh, rm] = ref.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const refMinutes = rh * 60 + rm;

    return slotMinutes >= refMinutes && slotMinutes < refMinutes + duration;
  };

  return (
    <section className="p-6 bg-background text-white min-h-[70vh]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeDate(-1)}
            className="bg-muted px-3 py-1 rounded hover:bg-muted/70"
          >
            ← Previous day
          </button>
          <span className="font-semibold">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <button
            onClick={() => changeDate(1)}
            className="bg-muted px-3 py-1 rounded hover:bg-muted/70"
          >
            Next day →
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
            <div className="absolute mt-2 bg-muted rounded shadow-lg flex flex-col">
              {[60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDuration(d as 60 | 90 | 120);
                    setShowDurations(false);
                    setSelectedSlot(null);
                  }}
                  className={`px-4 py-2 hover:bg-muted/70 ${
                    d === duration ? 'bg-accent text-background' : 'text-primary'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowEarly(!showEarly)}
          className="bg-muted px-3 py-1 rounded hover:bg-muted/70"
        >
          {showEarly ? 'Hide early' : 'Show early'}
        </button>
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-1 gap-2 max-w-[800px] w-full">
          {slots.map(({ start, end }) => {
            const [h, m] = start.split(':').map(Number);
            const startMinutes = h * 60 + m;

            const outsideLimit = startMinutes > 24 * 60 - duration;
            const fullyReserved = isFullyReserved(start);
            const highlighted = isHighlighted(start);

            return (
              <div
                key={start}
                className={`h-12 rounded-sm flex items-center justify-center font-medium transition-colors cursor-pointer ${
                  fullyReserved
                    ? 'bg-red-500 text-white'
                    : highlighted
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-black'
                }`}
                onMouseEnter={() => !fullyReserved && !outsideLimit && setHoverSlot(start)}
                onMouseLeave={() => setHoverSlot(null)}
                onClick={() => !fullyReserved && !outsideLimit && setSelectedSlot(start)}
              >
                {start} - {end}
              </div>
            );
          })}
        </div>
      </div>

      {selectedSlot && user && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={createBooking}
            className="bg-green-600 px-6 py-2 rounded text-white hover:bg-green-700"
          >
            Confirm booking
          </button>
        </div>
      )}
    </section>
  );
}
