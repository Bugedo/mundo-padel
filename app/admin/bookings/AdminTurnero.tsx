'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getBuenosAiresDate,
  formatDateForAPI,
  isBookingExpiredBuenosAires,
} from '@/lib/timezoneUtils';

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

interface AdminTurneroProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onBookingUpdate: (id: string, field: keyof Booking, value: boolean) => Promise<void>;
  loadingDates: Set<string>;
  getBookingsForDate: (date: Date) => Booking[];
  reloadBookingsForDate: (date: Date) => Promise<void>;
  preloadBookings: (dates: Date[]) => Promise<void>;
}

// Helper functions for week navigation
const getWeekDates = (weekOffset: number = 0): Date[] => {
  const today = getBuenosAiresDate();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + weekOffset * 7);

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    weekDates.push(day);
  }

  return weekDates;
};

const formatDayName = (date: Date): string => {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[date.getDay()];
};

const formatDayNumber = (date: Date): string => {
  return date.getDate().toString().padStart(2, '0');
};

const isSameDate = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

const isToday = (date: Date): boolean => {
  const today = getBuenosAiresDate();
  return isSameDate(date, today);
};

const allSlots = [
  { start: '08:00', end: '08:30' },
  { start: '08:30', end: '09:00' },
  { start: '09:00', end: '09:30' },
  { start: '09:30', end: '10:00' },
  { start: '10:00', end: '10:30' },
  { start: '10:30', end: '11:00' },
  { start: '11:00', end: '11:30' },
  { start: '11:30', end: '12:00' },
  { start: '12:00', end: '12:30' },
  { start: '12:30', end: '13:00' },
  { start: '13:00', end: '13:30' },
  { start: '13:30', end: '14:00' },
  { start: '14:00', end: '14:30' },
  { start: '14:30', end: '15:00' },
  { start: '15:00', end: '15:30' },
  { start: '15:30', end: '16:00' },
  { start: '16:00', end: '16:30' },
  { start: '16:30', end: '17:00' },
  { start: '17:00', end: '17:30' },
  { start: '17:30', end: '18:00' },
  { start: '18:00', end: '18:30' },
  { start: '18:30', end: '19:00' },
  { start: '19:00', end: '19:30' },
  { start: '19:30', end: '20:00' },
  { start: '20:00', end: '20:30' },
  { start: '20:30', end: '21:00' },
  { start: '21:00', end: '21:30' },
  { start: '21:30', end: '22:00' },
  { start: '22:00', end: '22:30' },
  { start: '22:30', end: '23:00' },
  { start: '23:00', end: '23:30' },
  { start: '23:30', end: '00:00' },
];

export default function AdminTurnero({
  selectedDate,
  onDateChange,
  onBookingUpdate,
  loadingDates,
  getBookingsForDate,
  reloadBookingsForDate,
  preloadBookings,
}: AdminTurneroProps) {
  const [showEarly, setShowEarly] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ [id: string]: number }>({});
  // Initialize currentWeekOffset to 0 (current week: today + 6 days ahead)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Obtener reservas de la fecha seleccionada desde el cache
  const bookings = getBookingsForDate(selectedDate);
  const loading = loadingDates.has(formatDateForAPI(selectedDate));

  // Precargar reservas de la semana cuando cambie el offset (con delay para evitar sobrecarga)
  useEffect(() => {
    const weekDates = getWeekDates(currentWeekOffset);
    
    // Precargar con delay para evitar múltiples llamadas rápidas
    const timer = setTimeout(() => {
      preloadBookings(weekDates);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentWeekOffset, preloadBookings]);

  // Booking creation state
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [hoverSlot, setHoverSlot] = useState<{ court: number; time: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<
    { id: string; full_name: string; email: string }[]
  >([]);

  // Comment editing state
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentValue, setCommentValue] = useState('');

  const slots = showEarly ? allSlots : allSlots.filter((slot) => slot.start >= '16:30');

  // Ya no necesitamos fetchBookings - usamos el cache

  // Fetch users for booking creation
  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users', { cache: 'no-store' });
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      setUsers(data);
      setFilteredUsers(data);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users by search term
  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()),
    );
    setFilteredUsers(filtered);
  }, [userSearchTerm, users]);

  // Timer que actualiza cada segundo para reservas pendientes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = getBuenosAiresDate().getTime();
      const updated: { [id: string]: number } = {};

      bookings.forEach((b) => {
        if (b.expires_at && !b.confirmed) {
          const diff = Math.max(0, Math.floor((new Date(b.expires_at).getTime() - now) / 1000));
          updated[b.id] = diff;
        }
      });

      setTimeLeft(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, [bookings]);

  const changeWeek = (offset: number) => {
    const newOffset = currentWeekOffset + offset;
    setCurrentWeekOffset(newOffset);
    // No cambiamos la fecha seleccionada, solo la vista de la semana
  };

  const selectDate = (date: Date) => {
    onDateChange(date);
  };

  const getBookingForSlot = (court: number, time: string) => {
    return bookings.find((b) => {
      if (b.court !== court || b.cancelled) return false;

      const [h, m] = time.split(':').map(Number);
      const slotMinutes = h * 60 + m;

      const [bh, bm] = b.start_time.split(':').map(Number);
      const bStart = bh * 60 + bm;
      const bEnd = bStart + (b.duration_minutes || 90);

      return slotMinutes >= bStart && slotMinutes < bEnd;
    });
  };

  const getBookingStatus = (booking: Booking) => {
    if (booking.is_recurring) return 'Recurrente';
    if (booking.cancelled) return 'Anulada';
    if (booking.present) return 'Confirmada';
    if (booking.confirmed) return 'Aceptada';
    return 'Pendiente';
  };

  const getStatusColor = (booking: Booking) => {
    if (booking.is_recurring) return 'bg-yellow-500';
    if (booking.cancelled) return 'bg-orange-500';
    if (booking.present) return 'bg-green-500';
    if (booking.confirmed) return 'bg-gray-500';
    return 'bg-orange-500'; // Pendiente
  };

  const getStatusTextColor = (booking: Booking) => {
    if (booking.is_recurring) return 'text-dark';
    if (booking.cancelled) return 'text-dark';
    if (booking.present) return 'text-dark';
    if (booking.confirmed) return 'text-dark';
    return 'text-dark'; // Pendiente
  };

  const handleBookingAction = async (
    booking: Booking,
    action:
      | 'accept'
      | 'confirm'
      | 'cancel'
      | 'present'
      | 'unpresent'
      | 'absent'
      | 'restore'
      | 'delete',
  ) => {
    let field: keyof Booking;
    let value: boolean;

    switch (action) {
      case 'accept':
        field = 'confirmed';
        value = true;
        break;
      case 'confirm':
        field = 'present';
        value = true;
        break;
      case 'cancel':
        field = 'cancelled';
        value = true;
        break;
      case 'present':
        field = 'present';
        value = true;
        break;
      case 'unpresent':
        field = 'present';
        value = false;
        break;
      case 'absent':
        field = 'cancelled';
        value = true;
        break;
      case 'restore':
        field = 'cancelled';
        value = false;
        break;
      case 'delete':
        // For delete, we'll need to implement a DELETE endpoint
        if (confirm('¿Estás seguro de que quieres eliminar esta reserva?')) {
          alert('Función de eliminación no implementada aún');
        }
        return;
    }

    // Update the server (the cache will be updated by the parent component)
    await onBookingUpdate(booking.id, field, value);
  };

  const handleEditBooking = (booking: Booking) => {
    // For now, just show an alert. In the future, this could open an edit modal
    alert(
      `Editar reserva de ${booking.user?.full_name || 'usuario'} - ${booking.start_time} a ${booking.end_time}`,
    );
  };

  const handleCommentEdit = (booking: Booking) => {
    setEditingComment(booking.id);
    setCommentValue(booking.comment || '');
  };

  const handleCommentSave = async (booking: Booking) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: booking.id,
          updates: {
            comment: commentValue,
          },
        }),
      });

      if (response.ok) {
        // Recargar las reservas para actualizar el cache
        await reloadBookingsForDate(selectedDate);
        setEditingComment(null);
        setCommentValue('');
      } else {
        const errorData = await response.json();
        alert(`Error al actualizar el comentario: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Error al actualizar el comentario');
    }
  };

  const handleCommentCancel = () => {
    setEditingComment(null);
    setCommentValue('');
  };

  // Check if a slot can fit the selected duration for a specific court
  const canFitDuration = (start_time: string, dur: number, court: number) => {
    const [h, m] = start_time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + dur;

    // Check if the time would go past midnight
    if (endMinutes > 24 * 60) return false;

    for (let minute = startMinutes; minute < endMinutes; minute += 30) {
      // Get all active bookings that overlap with this minute
      const overlappingBookings = bookings.filter((b) => {
        const [bh, bm] = b.start_time.split(':').map(Number);
        const bStart = bh * 60 + bm;
        const bEnd = bStart + (b.duration_minutes || 90);
        const active =
          (b.confirmed || (b.expires_at && !isBookingExpiredBuenosAires(b.expires_at))) &&
          !b.cancelled;
        return active && minute >= bStart && minute < bEnd;
      });

      // Check if this specific court is occupied during this time
      const courtOccupied = overlappingBookings.some((b) => b.court === court);
      if (courtOccupied) return false;

      // Count unique courts that are occupied
      const occupiedCourts = new Set(
        overlappingBookings.map((b) => b.court).filter((court) => court !== null),
      );

      if (occupiedCourts.size >= 3) return false;
    }

    return true;
  };

  // Check if a slot is highlighted (part of selected booking) for a specific court
  const isHighlighted = (time: string, court: number) => {
    const ref = selectedSlot || (hoverSlot?.court === court ? hoverSlot.time : null);
    if (!ref) return false;
    if (!canFitDuration(ref, duration, court)) return false;

    const [h, m] = time.split(':').map(Number);
    const [rh, rm] = ref.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const refMinutes = rh * 60 + rm;

    return slotMinutes >= refMinutes && slotMinutes < refMinutes + duration;
  };

  // Create booking
  const createBooking = async () => {
    if (!selectedSlot || !selectedUser) return;
    // Note: We don't need to check canFitDuration here since we already validated when selecting the slot

    const dateString = formatDateForAPI(selectedDate);

    const [h, m] = selectedSlot.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;

    const start_time = selectedSlot;
    const end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // Use the selected court
    const courtToUse = selectedCourt || 1; // Fallback to court 1 if somehow not set

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: selectedUser,
        date: dateString,
        start_time,
        end_time,
        duration_minutes: duration,
        court: courtToUse, // Specify the court for admin bookings
        confirmed: true, // Admin creates confirmed bookings
      }),
    });

    if (response.ok) {
      // Recargar las reservas de la fecha actual para actualizar el cache
      await reloadBookingsForDate(selectedDate);

      alert('Reserva creada exitosamente');
      setShowCreateForm(false);
      setSelectedUser('');
      setUserSearchTerm('');
      setSelectedSlot(null);
      setSelectedCourt(null);
    } else {
      const errorData = await response.json();
      alert(`Error al crear la reserva: ${errorData.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-neutral">Cargando reservas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        {/* Week Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeWeek(-1)}
            className="bg-accent px-3 py-1 rounded hover:bg-accent-hover text-dark"
          >
            ← Semana anterior
          </button>

          {/* Week Days Selector */}
          <div className="flex gap-1">
            {getWeekDates(currentWeekOffset).map((date, index) => {
              const dateString = formatDateForAPI(date);
              const isLoading = loadingDates.has(dateString);
              
              return (
                <button
                  key={index}
                  onClick={() => selectDate(date)}
                  disabled={isLoading}
                  className={`
                    flex flex-col items-center p-2 rounded transition-colors min-w-[50px] relative
                    ${
                      isSameDate(date, selectedDate)
                        ? 'bg-accent text-dark font-semibold'
                        : isToday(date)
                          ? 'bg-accent/20 text-accent border-2 border-accent'
                          : 'bg-surface text-neutral hover:bg-accent/10'
                    }
                    ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                >
                  {isLoading && (
                    <div className="absolute top-1 right-1 w-2 h-2">
                      <div className="animate-spin rounded-full h-2 w-2 border-b border-blue-600"></div>
                    </div>
                  )}
                  <span className="text-xs font-medium">{formatDayName(date)}</span>
                  <span className="text-sm">{formatDayNumber(date)}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => changeWeek(1)}
            className="bg-accent px-3 py-1 rounded hover:bg-accent-hover text-dark"
          >
            Semana siguiente →
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Duration selector */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-neutral">Duración</span>
            <div className="flex border border-muted rounded-lg overflow-hidden">
              {[60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDuration(d as 60 | 90 | 120);
                    setSelectedSlot(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    d === duration
                      ? 'bg-accent text-dark'
                      : 'bg-surface text-neutral hover:bg-muted-light'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowEarly(!showEarly)}
            className="bg-accent px-3 py-1 rounded hover:bg-accent-hover text-dark"
          >
            {showEarly ? 'Ocultar Matutinos' : 'Horario Matutinos'}
          </button>
        </div>
      </div>

      {/* Courts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((court) => (
          <div key={court} className="space-y-4">
            <h3 className="text-xl font-bold text-center text-neutral bg-surface p-3 rounded border border-muted">
              Cancha {court}
            </h3>

            <div className="relative">
              {/* Render all slots first */}
              {slots.map(({ start, end }) => {
                const booking = getBookingForSlot(court, start);
                const isStartOfBooking = booking && booking.start_time === start;
                const highlighted = isHighlighted(start, court);
                const canFit = canFitDuration(start, duration, court);
                const outsideLimit = start > '23:30' && duration > 30; // Check if slot is too late for duration

                if (booking && isStartOfBooking) {
                  // This slot has a booking, render it as before
                  return null; // Will be handled by the overlay
                } else if (booking) {
                  // This slot is part of a booking but not the start
                  return (
                    <div
                      key={`slot-${court}-${start}`}
                      className="h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-400 text-sm mb-2"
                    >
                      {start} - {end}
                    </div>
                  );
                } else {
                  // Empty slot - can be selected
                  return (
                    <div
                      key={`slot-${court}-${start}`}
                      className={`h-16 border rounded flex items-center justify-center text-sm mb-2 cursor-pointer transition-colors ${
                        highlighted
                          ? 'bg-green-500 text-white border-green-600'
                          : selectedSlot === start
                            ? 'bg-blue-500 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                      onMouseEnter={() => {
                        if (canFit && !outsideLimit) setHoverSlot({ court, time: start });
                      }}
                      onMouseLeave={() => setHoverSlot(null)}
                      onClick={() => {
                        if (canFit && !outsideLimit) {
                          setSelectedSlot(start);
                          setSelectedCourt(court);
                          setShowCreateForm(true);
                        }
                      }}
                    >
                      {start} - {end}
                    </div>
                  );
                }
              })}

              {/* Render bookings as overlays */}
              {bookings
                .filter((b) => b.court === court && !b.cancelled)
                .map((booking) => {
                  const [bh, bm] = booking.start_time.split(':').map(Number);
                  const bookingStartMinutes = bh * 60 + bm;

                  // Find the slot index for this booking
                  const slotIndex = slots.findIndex(({ start }) => {
                    const [sh, sm] = start.split(':').map(Number);
                    const slotStartMinutes = sh * 60 + sm;
                    return slotStartMinutes === bookingStartMinutes;
                  });

                  if (slotIndex === -1) return null;

                  const durationInSlots = Math.ceil(booking.duration_minutes / 30);
                  const topPosition = slotIndex * 72; // 64px height + 8px margin
                  const height = durationInSlots * 64 + (durationInSlots - 1) * 8;

                  const remaining = timeLeft[booking.id] || 0;
                  const minutes = Math.floor(remaining / 60);
                  const seconds = remaining % 60;

                  return (
                    <div
                      key={`booking-${court}-${booking.id}`}
                      className={`absolute ${getStatusColor(booking)} ${getStatusTextColor(booking)} p-3 rounded border-2 border-current/20 flex flex-col justify-between overflow-hidden`}
                      style={{
                        top: `${topPosition}px`,
                        height: `${height}px`,
                        width: '100%',
                        zIndex: 10,
                      }}
                    >
                      {/* Timer positioned at top-right */}
                      {!booking.confirmed && booking.expires_at && (
                        <div className="absolute top-2 right-2 text-xs font-bold">
                          {remaining > 0 ? (
                            <span className={remaining < 60 ? 'text-red-200' : ''}>
                              ⏰ {minutes}:{seconds.toString().padStart(2, '0')}
                            </span>
                          ) : (
                            <span className="text-red-200">⏰ Expirada</span>
                          )}
                        </div>
                      )}

                      <div className="space-y-1 pr-8">
                        <div className="font-bold text-sm truncate">
                          {booking.user?.full_name || 'Usuario desconocido'}
                          {booking.user?.phone && (
                            <span className="font-normal opacity-90"> ({booking.user.phone})</span>
                          )}
                        </div>
                        <div className="text-xs opacity-90">
                          {booking.start_time} - {booking.end_time} ({booking.duration_minutes} min)
                        </div>
                        <div className="text-xs font-medium">{getBookingStatus(booking)}</div>
                      </div>

                      {/* Comment input */}
                      <div className="mt-2">
                        {editingComment === booking.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={commentValue}
                              onChange={(e) => setCommentValue(e.target.value)}
                              placeholder="Comentarios"
                              className="w-full text-xs bg-surface border border-muted rounded px-2 py-1 text-neutral placeholder-neutral-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleCommentSave(booking)}
                                className="bg-success hover:bg-success-light text-light px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleCommentCancel}
                                className="bg-muted hover:bg-muted-light text-neutral px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleCommentEdit(booking)}
                            className="cursor-pointer"
                          >
                            {booking.comment ? (
                              <div className="text-xs opacity-75 italic whitespace-pre-wrap">
                                {booking.comment}
                              </div>
                            ) : (
                              <div className="text-xs opacity-50 italic">Comentarios</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {!booking.confirmed && !booking.cancelled && (
                          <>
                            <button
                              onClick={() => handleBookingAction(booking, 'accept')}
                              className="bg-success hover:bg-success-light text-light px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleBookingAction(booking, 'cancel')}
                              className="bg-error hover:bg-error-light text-light px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {booking.confirmed && !booking.present && (
                          <>
                            <button
                              onClick={() => handleBookingAction(booking, 'confirm')}
                              className="bg-success hover:bg-success-light text-light px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Confirmada
                            </button>
                            <button
                              onClick={() => handleBookingAction(booking, 'absent')}
                              className="bg-warning hover:bg-warning-light text-light px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Cancelada
                            </button>
                          </>
                        )}
                        {booking.confirmed && booking.present && (
                          <>
                            <button
                              onClick={() => handleBookingAction(booking, 'unpresent')}
                              className="bg-success hover:bg-success-light text-light px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Confirmada
                            </button>
                            <button
                              onClick={() => handleBookingAction(booking, 'absent')}
                              className="bg-warning hover:bg-warning-light text-light px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Cancelada
                            </button>
                          </>
                        )}
                        {!booking.is_recurring && (
                          <button
                            onClick={() => handleEditBooking(booking)}
                            className="bg-accent hover:bg-accent-hover text-dark px-2 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Editar
                          </button>
                        )}
                        {booking.is_recurring && (
                          <span className="text-xs opacity-75">
                            Editar desde reservas recurrentes
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-surface p-4 rounded border border-muted">
        <h4 className="font-semibold text-neutral mb-2">Leyenda:</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-neutral">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span className="text-neutral">Aceptada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-neutral">Confirmada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-neutral">Cancelada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-neutral">Recurrente</span>
          </div>
        </div>
      </div>

      {/* Cancelled/Anuladas Bookings Section */}
      {bookings.filter((b) => b.cancelled).length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-neutral">Reservas Anuladas</h3>
          <div className="bg-surface p-4 rounded border border-muted">
            <div className="space-y-3">
              {bookings
                .filter((b) => b.cancelled)
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-warning/10 border border-warning rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-neutral">
                        {booking.user?.full_name || 'Usuario desconocido'}
                      </div>
                      <div className="text-sm text-neutral-muted">
                        Cancha {booking.court} • {booking.start_time} - {booking.end_time} (
                        {booking.duration_minutes} min)
                      </div>
                      {booking.user?.phone && (
                        <div className="text-sm text-neutral-muted">{booking.user.phone}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBookingAction(booking, 'restore')}
                        className="bg-success hover:bg-success-light text-light px-3 py-1.5 rounded text-sm font-medium transition-colors"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={() => handleBookingAction(booking, 'delete')}
                        className="bg-error hover:bg-error-light text-light px-3 py-1.5 rounded text-sm font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Create booking form */}
      {showCreateForm && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface p-6 rounded-lg border border-muted max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-neutral">Crear Reserva</h3>

            <div className="space-y-4">
              {/* Selected slot info */}
              <div className="bg-accent/10 border border-accent p-3 rounded text-neutral">
                <p className="font-medium">Horario seleccionado: {selectedSlot}</p>
                <p className="text-sm">Duración: {duration} minutos</p>
              </div>

              {/* User selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">Usuario</label>
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                />
                {userSearchTerm && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-muted rounded bg-surface">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user.id);
                          setUserSearchTerm(user.full_name || user.email);
                        }}
                        className="px-3 py-2 hover:bg-accent cursor-pointer border-b border-muted last:border-b-0 text-neutral"
                      >
                        {user.full_name} ({user.email})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedSlot(null);
                    setSelectedCourt(null);
                    setSelectedUser('');
                    setUserSearchTerm('');
                  }}
                  className="flex-1 bg-muted text-neutral px-4 py-2 rounded hover:bg-muted-light transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createBooking}
                  disabled={!selectedUser}
                  className="flex-1 bg-accent text-dark px-4 py-2 rounded hover:bg-accent-hover disabled:bg-muted disabled:text-neutral-muted transition-colors"
                >
                  Crear Reserva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
