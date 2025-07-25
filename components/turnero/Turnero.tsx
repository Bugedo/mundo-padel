'use client';

import { useState, useRef } from 'react';

// Helper to generate 30-min time slots with labels
const generateSlots = (startHour: number, startMinute: number, endHour: number) => {
  const slots: { start: string; end: string }[] = [];
  let h = startHour;
  let m = startMinute;

  while (h < endHour || (h === endHour && m === 0)) {
    const startLabel = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    let nextH = h;
    let nextM = m + 30;
    if (nextM >= 60) {
      nextH += 1;
      nextM = 0;
    }
    const endLabel = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
    slots.push({ start: startLabel, end: endLabel });
    h = nextH;
    m = nextM;
  }

  return slots;
};

// Mock bookings
const mockBookings = [
  { court_id: 0, date: '2025-07-25', start_time: '16:30', duration: 90 },
  { court_id: 1, date: '2025-07-25', start_time: '17:00', duration: 120 },
  { court_id: 2, date: '2025-07-25', start_time: '18:00', duration: 90 },
  { court_id: 1, date: '2025-07-25', start_time: '19:00', duration: 60 },
];

export default function Turnero() {
  const baseDate = useRef(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [showDurations, setShowDurations] = useState(false);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const slots = generateSlots(16, 30, 24); // Start 16:30 to 00:00

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

  // Check if all 3 courts are reserved for this slot
  const isFullyReserved = (time: string) => {
    const currentDate = formatDate(selectedDate);
    const [h, m] = time.split(':').map(Number);
    const slotMinutes = h * 60 + m;

    let occupiedCourts = 0;

    mockBookings.forEach((b) => {
      if (b.date !== currentDate) return;
      const [bh, bm] = b.start_time.split(':').map(Number);
      const startMinutes = bh * 60 + bm;
      if (slotMinutes >= startMinutes && slotMinutes < startMinutes + b.duration) {
        occupiedCourts++;
      }
    });

    return occupiedCourts >= 3;
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
      </div>

      {/* Single timeline centered */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 gap-2 max-w-[800px] w-full">
          {slots.map(({ start, end }) => {
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
                onMouseEnter={() => !fullyReserved && setHoverSlot(start)}
                onMouseLeave={() => setHoverSlot(null)}
                onClick={() => !fullyReserved && setSelectedSlot(start)}
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
          No disponible (todas ocupadas)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-300 rounded-sm" />
          Disponible
        </div>
      </div>
    </section>
  );
}
