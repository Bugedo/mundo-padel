'use client';

import SlotItem from './SlotItem';
import { Booking } from './hooks/useBookings';
import { Court } from './hooks/useCourts';

interface Props {
  slots: { start: string; end: string }[];
  bookings: Booking[];
  courts: Court[];
  duration: 60 | 90 | 120;
  hoverSlot: string | null;
  setHoverSlotAction: (v: string | null) => void;
  selectedSlot: string | null;
  setSelectedSlotAction: (v: string | null) => void;
}

export default function SlotGrid({
  slots,
  bookings,
  courts,
  duration,
  hoverSlot,
  setHoverSlotAction,
  selectedSlot,
  setSelectedSlotAction,
}: Props) {
  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-1 gap-2 max-w-[800px] w-full">
        {slots.map(({ start, end }) => (
          <SlotItem
            key={start}
            start={start}
            end={end}
            bookings={bookings}
            courts={courts}
            duration={duration}
            hoverSlot={hoverSlot}
            setHoverSlotAction={setHoverSlotAction}
            selectedSlot={selectedSlot}
            setSelectedSlotAction={setSelectedSlotAction}
          />
        ))}
      </div>
    </div>
  );
}
