'use client';

import { useState, useEffect } from 'react';

interface RecurringBooking {
  id: string;
  user_id: string;
  court: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

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

const defaultSlots = allSlots.filter((slot) => slot.start >= '16:30');

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export default function RecurringBookingsPage() {
  const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating new recurring booking
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedUserInfo, setSelectedUserInfo] = useState<User | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<60 | 90 | 120>(90);
  const [selectedCourt, setSelectedCourt] = useState<1 | 2 | 3>(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showEarlySlots, setShowEarlySlots] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const slots = showEarlySlots ? allSlots : defaultSlots;

  // Fetch recurring bookings and users on component mount
  useEffect(() => {
    fetchRecurringBookings();
    fetchUsers();
  }, []);

  // Filter users by search term
  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()),
    );
    setFilteredUsers(filtered);
  }, [userSearchTerm, users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchRecurringBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/recurring-bookings', { cache: 'no-store' });
      const data = await res.json();

      if (res.ok) {
        setRecurringBookings(data);
      } else {
        setError(data.error || 'Error al cargar reservas recurrentes');
      }
    } catch (err) {
      setError('Error de red al cargar reservas recurrentes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { cache: 'no-store' });
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      setUsers(data);
      setFilteredUsers(data);
    }
  };

  const createRecurringBooking = async () => {
    if (!selectedUser || !selectedTime || !startDate) {
      alert('Por favor selecciona un usuario, horario y fecha de inicio');
      return;
    }

    // Calculate day of week from selected date
    const selectedDayOfWeek = new Date(startDate).getDay();

    const [h, m] = selectedTime.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + selectedDuration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;

    const end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // Check for conflicts with existing recurring bookings
    const conflictingRecurring = recurringBookings.filter(
      (booking) =>
        booking.day_of_week === selectedDayOfWeek &&
        booking.court === selectedCourt &&
        booking.active &&
        ((booking.start_time <= selectedTime && booking.end_time > selectedTime) ||
          (booking.start_time < end_time && booking.end_time >= end_time) ||
          (selectedTime <= booking.start_time && end_time >= booking.end_time)),
    );

    if (conflictingRecurring.length > 0) {
      alert(
        'Ya existe una reserva para este día, horario y cancha. Por favor selecciona otro horario o cancha.',
      );
      return;
    }

    // Check for conflicts with regular bookings on the start date
    try {
      const res = await fetch(`/api/bookings?date=${startDate}`, { cache: 'no-store' });
      const regularBookings = await res.json();

      if (res.ok) {
        const conflictingRegular = regularBookings.filter(
          (booking: any) =>
            booking.court === selectedCourt &&
            !booking.cancelled &&
            (booking.confirmed ||
              (booking.expires_at && new Date(booking.expires_at) > new Date())) &&
            ((booking.start_time <= selectedTime && booking.end_time > selectedTime) ||
              (booking.start_time < end_time && booking.end_time >= end_time) ||
              (selectedTime <= booking.start_time && end_time >= booking.end_time)),
        );

        if (conflictingRegular.length > 0) {
          alert(
            'Ya existe una reserva regular para este día, horario y cancha. Por favor selecciona otro horario o cancha.',
          );
          return;
        }
      }
    } catch (err) {
      console.error('Error checking regular bookings:', err);
    }

    try {
      const res = await fetch('/api/recurring-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser,
          court: selectedCourt,
          day_of_week: selectedDayOfWeek,
          start_time: selectedTime,
          end_time,
          duration_minutes: selectedDuration,
          start_date: startDate,
          end_date: endDate || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Reserva recurrente creada exitosamente');
        // Reset form to default values
        setShowCreateForm(false);
        setSelectedUser('');
        setSelectedUserInfo(null);
        setSelectedTime('');
        setStartDate('');
        setEndDate('');
        setUserSearchTerm('');
        setSelectedDuration(90);
        setSelectedCourt(1);
        setShowEarlySlots(false);
        setShowUserDropdown(false);
        fetchRecurringBookings();
      } else {
        alert(`Error al crear reserva recurrente: ${data.error}`);
      }
    } catch (err) {
      alert('Error de red al crear reserva recurrente');
    }
  };

  const updateRecurringBooking = async (id: string, field: keyof RecurringBooking, value: any) => {
    try {
      const res = await fetch('/api/recurring-bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates: { [field]: value } }),
      });

      if (res.ok) {
        setRecurringBookings((prev) =>
          prev.map((booking) => (booking.id === id ? { ...booking, [field]: value } : booking)),
        );
      } else {
        const data = await res.json();
        alert(`Error al actualizar reserva recurrente: ${data.error}`);
      }
    } catch (err) {
      alert('Error de red al actualizar reserva recurrente');
    }
  };

  const deleteRecurringBooking = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta reserva recurrente?')) return;

    try {
      const res = await fetch('/api/recurring-bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        alert('Reserva recurrente eliminada exitosamente');
        fetchRecurringBookings();
      } else {
        const data = await res.json();
        alert(`Error al eliminar reserva recurrente: ${data.error}`);
      }
    } catch (err) {
      alert('Error de red al eliminar reserva recurrente');
    }
  };

  if (loading) return <div>Cargando reservas recurrentes...</div>;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchRecurringBookings();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reservas Recurrentes</h1>

      {/* Create button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-success text-light px-4 py-2 rounded hover:bg-success/80"
        >
          {showCreateForm ? 'Cancelar' : 'Crear Reserva Recurrente'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-surface p-6 rounded border border-muted mb-6">
          <h3 className="text-lg font-semibold mb-4 text-neutral">Crear Reserva Recurrente</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User selection */}
            <div className="user-dropdown-container">
              <label className="block text-sm font-medium mb-2 text-neutral">Usuario</label>
              {selectedUserInfo ? (
                <div className="border border-muted rounded px-3 py-2 bg-surface">
                  <p className="font-medium text-neutral">{selectedUserInfo.full_name}</p>
                  <p className="text-sm text-muted">{selectedUserInfo.email}</p>
                  <button
                    onClick={() => {
                      setSelectedUser('');
                      setSelectedUserInfo(null);
                      setUserSearchTerm('');
                    }}
                    className="text-sm text-error hover:underline mt-1"
                  >
                    Cambiar usuario
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                  />
                  {showUserDropdown && userSearchTerm && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-muted rounded bg-surface">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user.id);
                            setSelectedUserInfo(user);
                            setUserSearchTerm(user.full_name || user.email);
                            setShowUserDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-accent cursor-pointer border-b border-muted last:border-b-0 text-neutral"
                        >
                          {user.full_name} ({user.email})
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Date range */}
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral">Fecha de inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
              />
              {startDate && (
                <p className="text-sm text-muted mt-1">
                  Día de la semana: {daysOfWeek[new Date(startDate).getDay()]?.label}
                </p>
              )}
            </div>

            {/* Time selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral">Horario</label>
              <div className="mb-2">
                <button
                  onClick={() => setShowEarlySlots(!showEarlySlots)}
                  className="text-sm text-primary hover:underline"
                >
                  {showEarlySlots ? 'Ocultar horarios tempranos' : 'Mostrar horarios tempranos'}
                </button>
              </div>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
              >
                <option value="">Seleccionar horario</option>
                {slots.map((slot) => (
                  <option key={slot.start} value={slot.start}>
                    {slot.start} - {slot.end}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral">Duración</label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value) as 60 | 90 | 120)}
                className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
              >
                <option value={60}>60 minutos</option>
                <option value={90}>90 minutos</option>
                <option value={120}>120 minutos</option>
              </select>
            </div>

            {/* Court */}
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral">Cancha</label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(Number(e.target.value) as 1 | 2 | 3)}
                className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
              >
                <option value={1}>Cancha 1</option>
                <option value={2}>Cancha 2</option>
                <option value={3}>Cancha 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral">
                Fecha de fin (opcional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
              />
            </div>

            {/* Create button */}
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={createRecurringBooking}
                disabled={!selectedUser || !selectedTime || !startDate}
                className="bg-success text-light px-4 py-2 rounded hover:bg-success/80 disabled:bg-muted"
              >
                Crear Reserva Recurrente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring bookings list */}
      <div className="space-y-4">
        {recurringBookings.map((booking) => (
          <div key={booking.id} className="border border-muted rounded p-4 bg-surface">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral">
                  {booking.user?.full_name || 'Usuario no encontrado'}
                </h3>
                <p className="text-muted">{booking.user?.email}</p>
                <p className="text-sm text-muted">
                  {daysOfWeek.find((d) => d.value === booking.day_of_week)?.label} -{' '}
                  {booking.start_time} - {booking.end_time}
                </p>
                <p className="text-sm text-muted">
                  Cancha {booking.court} - {booking.duration_minutes} minutos
                </p>
                {booking.start_date && (
                  <p className="text-sm text-muted">
                    Desde: {new Date(booking.start_date).toLocaleDateString('es-ES')}
                    {booking.end_date &&
                      ` - Hasta: ${new Date(booking.end_date).toLocaleDateString('es-ES')}`}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateRecurringBooking(booking.id, 'active', !booking.active)}
                  className={`px-3 py-1 rounded ${
                    booking.active
                      ? 'bg-success text-light hover:bg-success/80'
                      : 'bg-muted text-neutral hover:bg-accent'
                  }`}
                >
                  {booking.active ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  onClick={() => deleteRecurringBooking(booking.id)}
                  className="bg-error text-light px-3 py-1 rounded hover:bg-error/80"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}

        {recurringBookings.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted">No hay reservas recurrentes configuradas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
