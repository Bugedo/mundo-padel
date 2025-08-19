'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';

interface Booking {
  id: string;
  court: number;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  confirmed: boolean;
  present: boolean;
  cancelled: boolean;
  expires_at?: string;
}

interface RecurringBooking {
  id: string;
  court: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  active: boolean;
}

export default function UserBookingsPage({ params }: { params: Promise<{ user: string }> }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState('');

  // Unwrap params using React.use()
  const { user: userId } = use(params);

  // Redirect if not logged in or if trying to access another user's bookings
  useEffect(() => {
    if (!loading && (!user || user.id !== userId)) {
      router.push('/login');
    }
  }, [user, loading, userId, router]);

  const fetchUserBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      setError('');
      
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`/api/user-bookings?userId=${user.id}`);

      if (!response.ok) {
        throw new Error('Error al cargar las reservas');
      }

      const data = await response.json();
      
      // Ensure we have arrays even if the API returns null/undefined
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setRecurringBookings(Array.isArray(data.recurringBookings) ? data.recurringBookings : []);
    } catch (error: unknown) {
      console.error('Error fetching bookings:', error);
      setError('Error al cargar las reservas');
      // Set empty arrays to prevent undefined errors
      setBookings([]);
      setRecurringBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && user.id === userId) {
      fetchUserBookings();
    }
  }, [user, userId, fetchUserBookings]);

  const getStatusIcon = (booking: Booking) => {
    if (booking.cancelled) {
      return <XCircle size={16} className="text-error" />;
    }
    if (booking.confirmed) {
      return <CheckCircle size={16} className="text-neutral" />;
    }
    if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
      return <XCircle size={16} className="text-error" />;
    }
    return <AlertCircle size={16} className="text-neutral" />;
  };

  const getStatusText = (booking: Booking) => {
    if (booking.cancelled) {
      return 'Cancelada';
    }
    if (booking.confirmed) {
      return 'Confirmada';
    }
    if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
      return 'Expirada';
    }
    return 'Pendiente';
  };

  const getStatusColor = (booking: Booking) => {
    if (booking.cancelled) {
      return 'text-error';
    }
    if (booking.confirmed) {
      return 'text-neutral';
    }
    if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
      return 'text-error';
    }
    return 'text-neutral';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getDayName = (dayNumber: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayNumber];
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Hora no disponible';
    try {
      return timeString.substring(0, 5); // Remove seconds, keep only HH:MM
    } catch {
      return 'Hora inválida';
    }
  };

  const isExpired = (booking: Booking) => {
    if (!booking.expires_at) return false;
    try {
      return new Date(booking.expires_at) < new Date();
    } catch {
      return false;
    }
  };

  if (loading || loadingBookings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RotateCcw size={32} className="animate-spin mx-auto text-primary mb-4" />
          <p className="text-neutral">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  if (!user || user.id !== userId) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-neutral mb-8 flex items-center gap-3">
            <Calendar size={32} className="text-neutral" />
            Mis Reservas
          </h1>

          {error && (
            <div className="bg-error/10 border border-error rounded-lg p-4 mb-6">
              <p className="text-error">{error}</p>
            </div>
          )}

          {/* Regular Bookings */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral mb-4">Reservas Individuales</h2>

            {!bookings || bookings.length === 0 ? (
              <div className="bg-surface border border-muted rounded-lg p-8 text-center">
                <Calendar size={48} className="mx-auto text-neutral mb-4" />
                <p className="text-neutral text-lg">No tienes reservas individuales</p>
                <p className="text-neutral mt-2">Haz una reserva desde el turnero principal</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(bookings || []).map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-surface border border-muted rounded-lg p-6 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(booking)}
                        <span className={`font-medium ${getStatusColor(booking)}`}>
                          {getStatusText(booking)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-neutral" />
                        <span className="text-neutral">{formatDate(booking.date || '')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-neutral" />
                        <span className="text-neutral">
                          {formatTime(booking.start_time || '')} - {formatTime(booking.end_time || '')}
                        </span>
                      </div>
                    </div>

                    {booking.expires_at && !booking.confirmed && !isExpired(booking) && (
                      <div className="bg-warning/10 border border-warning rounded p-3">
                        <p className="text-warning text-sm">
                          ⏰ Esta reserva expira el{' '}
                          {(() => {
                            try {
                              return new Date(booking.expires_at).toLocaleString('es-ES');
                            } catch {
                              return 'fecha no disponible';
                            }
                          })()}
                        </p>
                      </div>
                    )}

                    {isExpired(booking) && (
                      <div className="bg-error/10 border border-error rounded p-3">
                        <p className="text-error text-sm">
                          ❌ Esta reserva ha expirado y ya no es válida
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recurring Bookings */}
          <div>
            <h2 className="text-2xl font-semibold text-neutral mb-4">Reservas Recurrentes</h2>

            {!recurringBookings || recurringBookings.length === 0 ? (
              <div className="bg-surface border border-muted rounded-lg p-8 text-center">
                <RotateCcw size={48} className="mx-auto text-neutral mb-4" />
                <p className="text-neutral text-lg">No tienes reservas recurrentes</p>
                <p className="text-neutral mt-2">Las reservas recurrentes aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(recurringBookings || []).map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-surface border border-muted rounded-lg p-6 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <RotateCcw size={16} className="text-neutral" />
                        <span className="font-medium text-neutral">Activa</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-neutral" />
                        <span className="text-neutral">{getDayName(booking.day_of_week || 0)}s</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-neutral" />
                        <span className="text-neutral">
                          {formatTime(booking.start_time || '')} - {formatTime(booking.end_time || '')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
