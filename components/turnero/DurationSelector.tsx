'use client';

import { useState } from 'react';

interface Props {
  duration: 60 | 90 | 120;
  onChangeAction: (d: 60 | 90 | 120) => void;
}

export default function DurationSelector({ duration, onChangeAction }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-accent text-background px-4 py-2 rounded"
      >
        {duration} min
      </button>
      {open && (
        <div className="absolute mt-2 bg-muted rounded shadow-lg flex flex-col">
          {[60, 90, 120].map((d) => (
            <button
              key={d}
              onClick={() => {
                onChangeAction(d as 60 | 90 | 120);
                setOpen(false);
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
  );
}
