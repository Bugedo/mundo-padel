'use client';

import { useState, useCallback } from 'react';
import supabase from '@/lib/supabaseClient';

export interface Booking {
  id: string;
  user_id: string;
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, user_id, court_id, date, start_time, end_time, duration_minutes')
      .eq('date', date);

    if (!error && data) setBookings(data as Booking[]);
    setLoading(false);
  }, []);

  return { bookings, loading, fetchBookings };
}
