'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminTurnero from './AdminTurnero';
import { getBuenosAiresDate, formatDateForAPI } from '@/lib/timezoneUtils';

interface Booking {
  id: string;
  user_id: string;
  court: number | null;
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
  user?: {
    full_name: string;
  };
}

export default function BookingsAdminPage() {
  const [selectedDate, setSelectedDate] = useState(getBuenosAiresDate());
  const [, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const dateString = formatDateForAPI(selectedDate);

    const res = await fetch(`/api/bookings?date=${dateString}`, { cache: 'no-store' });
    const data = await res.json();

    if (res.ok) {
      setBookings(data as Booking[]);
    } else {
      console.error('Error fetching bookings:', data.error);
    }

    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchBookings();
  }, [selectedDate, fetchBookings]);

  const updateBooking = async (id: string, field: keyof Booking, value: boolean) => {
    const dateString = formatDateForAPI(selectedDate);
    const res = await fetch(`/api/bookings?date=${dateString}`, {
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

  if (loading) return <div>Cargando reservas...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reservas</h1>

      <AdminTurnero
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onBookingUpdate={updateBooking}
      />
    </div>
  );
}
