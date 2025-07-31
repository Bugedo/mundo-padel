'use client';

import { useEffect, useState, useRef } from 'react';

interface Booking {
  id: string;
  user_id: string;
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confirmed: boolean;
  present: boolean;
  cancelled: boolean;
  user?: {
    full_name: string;
  };
}

export default function BookingsAdminPage() {
  const baseDate = useRef(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const fetchBookings = async () => {
    setLoading(true);
    const dateString = formatDate(selectedDate);

    const res = await fetch(`/api/bookings?date=${dateString}`, { cache: 'no-store' });
    const data = await res.json();

    if (res.ok) {
      setBookings(data as Booking[]);
    } else {
      console.error('Error fetching bookings:', data.error);
    }

    setLoading(false);
  };

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
    }
  };

  const updateBooking = async (id: string, field: keyof Booking, value: boolean) => {
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, value }),
    });

    if (res.ok) {
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
    } else {
      alert('Error updating booking');
    }
  };

  const filteredBookings = bookings.filter((b) =>
    b.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) return <div>Loading bookings...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bookings</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by user name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/3"
        />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => changeDate(-1)} className="bg-muted px-3 py-1 rounded">
          ← Previous day
        </button>
        <span className="font-semibold">
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        <button onClick={() => changeDate(1)} className="bg-muted px-3 py-1 rounded">
          Next day →
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">User</th>
            <th className="p-2">Court</th>
            <th className="p-2">Time</th>
            <th className="p-2">Duration</th>
            <th className="p-2">Confirmed</th>
            <th className="p-2">Present</th>
            <th className="p-2">Cancelled</th>
          </tr>
        </thead>
        <tbody>
          {filteredBookings.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-2">{b.user?.full_name || '—'}</td>
              <td className="p-2">{b.court_id}</td>
              <td className="p-2">
                {b.start_time} - {b.end_time}
              </td>
              <td className="p-2">{b.duration_minutes} min</td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={b.confirmed}
                  onChange={(e) => updateBooking(b.id, 'confirmed', e.target.checked)}
                />
              </td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={b.present}
                  onChange={(e) => updateBooking(b.id, 'present', e.target.checked)}
                />
              </td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={b.cancelled}
                  onChange={(e) => updateBooking(b.id, 'cancelled', e.target.checked)}
                />
              </td>
            </tr>
          ))}
          {filteredBookings.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center text-gray-500">
                No bookings for this date or filter
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
