'use client';

import { Booking } from './hooks/useBookings';
import { Court } from './hooks/useCourts';

interface Props {
  start: string;
  end: string;
  bookings: Booking[];
  courts: Court[];
  duration: number;
  hoverSlot: string | null;
  setHoverSlotAction: (v: string | null) => void;
  selectedSlot: string | null;
  setSelectedSlotAction: (v: string | null) => void;
}

export default function SlotItem({
  start,
  end,
  bookings,
  courts,
  duration,
  hoverSlot,
  setHoverSlotAction,
  selectedSlot,
  setSelectedSlotAction,
}: Props) {
  const isFullyReserved = (time: string) => {
    const [th, tm] = time.split(':').map(Number);
    const checkMinutes = th * 60 + tm;

    const count = bookings.filter((b) => {
      const [bh, bm] = b.start_time.split(':').map(Number);
      const bStart = bh * 60 + bm;
      const bEnd = bStart + (b.duration_minutes || 90);
      return checkMinutes >= bStart && checkMinutes < bEnd;
    }).length;

    return courts.length > 0 && count >= courts.length;
  };

  const canFitDuration = (start_time: string, dur: number) => {
    const [h, m] = start_time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + dur;

    for (let minute = startMinutes; minute < endMinutes; minute += 30) {
      const count = bookings.filter((b) => {
        const [bh, bm] = b.start_time.split(':').map(Number);
        const bStart = bh * 60 + bm;
        const bEnd = bStart + (b.duration_minutes || 90);
        return minute >= bStart && minute < bEnd;
      }).length;

      if (courts.length > 0 && count >= courts.length) {
        return false;
      }
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

  const fullyReserved = isFullyReserved(start);
  const canFit = canFitDuration(start, duration);
  const highlighted = isHighlighted(start);

  return (
    <div
      className={`h-12 rounded-sm flex items-center justify-center font-medium transition-colors cursor-pointer ${
        fullyReserved
          ? 'bg-red-500 text-white'
          : highlighted
            ? 'bg-green-500 text-white'
            : 'bg-white text-black'
      }`}
      onMouseEnter={() => {
        if (!fullyReserved && canFit) setHoverSlotAction(start);
      }}
      onMouseLeave={() => setHoverSlotAction(null)}
      onClick={() => {
        if (!fullyReserved && canFit) setSelectedSlotAction(start);
      }}
    >
      {start} - {end}
    </div>
  );
}
