'use client';

import { useState, useRef } from 'react';

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
  const baseDate = useRef(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [showDurations, setShowDurations] = useState(false);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showEarly, setShowEarly] = useState(false);

  // Filter slots based on "showEarly"
  const slots = showEarly ? allSlots : allSlots.filter((slot) => slot.start >= '16:30');

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

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

  // Latest allowed start time based on duration
  const maxStartMinutes = 24 * 60 - duration;

  // Reservation check placeholder (always false until DB)
  const isFullyReserved = (_time: string) => {
    return false; // Will connect to DB later
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
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        {/* Date selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeDate(-1)}
            className="bg-muted px-3 py-1 rounded hover:bg-muted/70"
          >
            ← Día anterior
          </button>
          <span className="font-semibold">
            {selectedDate.toLocaleDateString('es-AR', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <button
            onClick={() => changeDate(1)}
            className="bg-muted px-3 py-1 rounded hover:bg-muted/70"
          >
            Día siguiente →
          </button>
        </div>

        {/* Duration dropdown */}
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

        {/* Early hours toggle */}
        <button
          onClick={() => setShowEarly(!showEarly)}
          className="bg-muted px-3 py-1 rounded hover:bg-muted/70"
        >
          {showEarly ? 'Ocultar temprano' : 'Ver temprano'}
        </button>
      </div>

      {/* Single timeline centered */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 gap-2 max-w-[800px] w-full">
          {slots.map(({ start, end }) => {
            const [h, m] = start.split(':').map(Number);
            const startMinutes = h * 60 + m;

            const outsideLimit = startMinutes > maxStartMinutes;
            const fullyReserved = isFullyReserved(start);
            const highlighted = isHighlighted(start);

            return (
              <div
                key={start}
                className={`h-12 rounded-sm flex items-center justify-center font-medium transition-colors ${
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

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-sm text-primary justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-sm" />
          Seleccionado / Hover
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-sm" />
          Ocupado (todas las canchas)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-300 rounded-sm" />
          Disponible
        </div>
      </div>
    </section>
  );
}
