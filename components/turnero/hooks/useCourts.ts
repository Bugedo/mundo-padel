'use client';

import { useState, useCallback } from 'react';
import supabase from '@/lib/supabaseClient';

export interface Court {
  id: string;
  name: string;
}

export function useCourts() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCourts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('courts').select('id, name');
    if (!error && data) setCourts(data as Court[]);
    setLoading(false);
  }, []);

  return { courts, loading, fetchCourts };
}
