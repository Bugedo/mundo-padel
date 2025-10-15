'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminTurnero from './AdminTurnero';
import { getBuenosAiresDate, formatDateForAPIWithoutConversion } from '@/lib/timezoneUtils';

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
  absent?: boolean;
  expires_at?: string;
  is_recurring?: boolean;
  recurring_booking_id?: string;
  comment?: string;
  user?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

export default function BookingsAdminPage() {
  const [selectedDate, setSelectedDate] = useState(getBuenosAiresDate());
  const [bookingsCache, setBookingsCache] = useState<{ [date: string]: Booking[] }>({});
  const [loading, setLoading] = useState(true);
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());

  // Función para obtener reservas de una fecha específica (con cache)
  const getBookingsForDate = useCallback(
    (date: Date): Booking[] => {
      const dateString = formatDateForAPIWithoutConversion(date);
      return bookingsCache[dateString] || [];
    },
    [bookingsCache],
  );

  // Función para precargar reservas de múltiples fechas
  const preloadBookings = useCallback(
    async (dates: Date[]) => {
      const datesToLoad = dates.filter((date) => {
        const dateString = formatDateForAPIWithoutConversion(date);
        return !bookingsCache[dateString] && !loadingDates.has(dateString);
      });

      if (datesToLoad.length === 0) return;

      // Marcar fechas como cargando
      setLoadingDates((prev) => {
        const newSet = new Set(prev);
        datesToLoad.forEach((date) => newSet.add(formatDateForAPIWithoutConversion(date)));
        return newSet;
      });

      try {
        // Cargar fechas en lotes pequeños para evitar sobrecarga
        const batchSize = 2;
        for (let i = 0; i < datesToLoad.length; i += batchSize) {
          const batch = datesToLoad.slice(i, i + batchSize);

          const promises = batch.map(async (date) => {
            const dateString = formatDateForAPIWithoutConversion(date);
            const res = await fetch(`/api/bookings?date=${dateString}`, {
              cache: 'no-store',
              // Agregar timeout para evitar requests colgados
              signal: AbortSignal.timeout(8000),
            });
            const data = await res.json();
            return { dateString, bookings: res.ok ? (data as Booking[]) : [] };
          });

          const results = await Promise.all(promises);

          // Actualizar cache incrementalmente para evitar parpadeo
          setBookingsCache((prev) => {
            const newCache = { ...prev };
            results.forEach(({ dateString, bookings }) => {
              newCache[dateString] = bookings;
            });
            return newCache;
          });

          // Pequeña pausa entre lotes para no sobrecargar el servidor
          if (i + batchSize < datesToLoad.length) {
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
        }
      } catch (error) {
        console.error('Error preloading bookings:', error);
      } finally {
        // Remover fechas de la lista de cargando
        setLoadingDates((prev) => {
          const newSet = new Set(prev);
          datesToLoad.forEach((date) => newSet.delete(formatDateForAPIWithoutConversion(date)));
          return newSet;
        });
      }
    },
    [bookingsCache, loadingDates],
  );

  // Función para recargar reservas de una fecha específica
  const reloadBookingsForDate = useCallback(async (date: Date) => {
    const dateString = formatDateForAPIWithoutConversion(date);

    setLoadingDates((prev) => new Set(prev).add(dateString));

    try {
      const res = await fetch(`/api/bookings?date=${dateString}`, { cache: 'no-store' });
      const data = await res.json();

      if (res.ok) {
        setBookingsCache((prev) => ({
          ...prev,
          [dateString]: data as Booking[],
        }));
      }
    } catch (error) {
      console.error('Error reloading bookings:', error);
    } finally {
      setLoadingDates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(dateString);
        return newSet;
      });
    }
  }, []);

  // Función para obtener reservas de la fecha seleccionada (mantener compatibilidad)
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const dateString = formatDateForAPIWithoutConversion(selectedDate);

    // Si ya tenemos las reservas en cache, usarlas
    if (bookingsCache[dateString]) {
      setLoading(false);
      return;
    }

    // Si no están en cache, cargarlas
    await reloadBookingsForDate(selectedDate);
    setLoading(false);
  }, [selectedDate, bookingsCache, reloadBookingsForDate]);

  // Precargar solo los próximos 3 días al montar el componente (menos agresivo)
  useEffect(() => {
    const today = getBuenosAiresDate();
    const initialDates: Date[] = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      initialDates.push(date);
    }

    // Precargar con delay para no bloquear el render inicial
    const timer = setTimeout(() => {
      preloadBookings(initialDates);
    }, 500);

    return () => clearTimeout(timer);
  }, [preloadBookings]);

  // Cargar reservas cuando cambie la fecha seleccionada
  useEffect(() => {
    fetchBookings();
  }, [selectedDate, fetchBookings]);

  const updateBooking = async (id: string, field: keyof Booking, value: boolean) => {
    const dateString = formatDateForAPIWithoutConversion(selectedDate);
    console.log('Updating booking:', { id, field, value, dateString });

    const res = await fetch(`/api/bookings?date=${dateString}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, value }),
    });

    if (res.ok) {
      console.log('Booking updated successfully, refreshing cache...');
      // Recargar las reservas para asegurar que el cache esté actualizado
      await reloadBookingsForDate(selectedDate);
    } else {
      const errorData = await res.json();
      alert(`Error updating booking: ${errorData.error}`);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Cargando reservas...</span>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reservas</h1>
      </div>

      <AdminTurnero
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onBookingUpdate={updateBooking}
        loadingDates={loadingDates}
        getBookingsForDate={getBookingsForDate}
        reloadBookingsForDate={reloadBookingsForDate}
        preloadBookings={preloadBookings}
      />
    </div>
  );
}
