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

  // Edit form state
  const [editingBooking, setEditingBooking] = useState<RecurringBooking | null>(null);
  const [editForm, setEditForm] = useState({
    user_id: '',
    court: 1 as 1 | 2 | 3,
    day_of_week: 0,
    start_time: '',
    end_time: '',
    duration_minutes: 90 as 60 | 90 | 120,
    start_date: '',
    end_date: '',
    active: true,
  });
  const [editUserSearchTerm, setEditUserSearchTerm] = useState('');
  const [editFilteredUsers, setEditFilteredUsers] = useState<User[]>([]);
  const [showEditUserDropdown, setShowEditUserDropdown] = useState(false);
  const [editSelectedUserInfo, setEditSelectedUserInfo] = useState<User | null>(null);
  const [showEditEarlySlots, setShowEditEarlySlots] = useState(false);

  const slots = showEarlySlots ? allSlots : defaultSlots;

  // Fetch recurring bookings and users on component mount
  useEffect(() => {
    fetchRecurringBookings();
    fetchUsers();
  }, []);

  // Filter users by search term
  useEffect(() => {
    console.log('Filtering users:', {
      totalUsers: users.length,
      searchTerm: userSearchTerm,
      searchTermLength: userSearchTerm.length,
    });

    if (!userSearchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter((user) => {
      const nameMatch = user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase());
      const emailMatch = user.email.toLowerCase().includes(userSearchTerm.toLowerCase());

      if (nameMatch || emailMatch) {
        console.log('User matches search:', {
          id: user.id,
          name: user.full_name,
          email: user.email,
          nameMatch,
          emailMatch,
        });
      }

      return nameMatch || emailMatch;
    });

    console.log('Filtered users result:', filtered.length, 'users found');
    setFilteredUsers(filtered);
  }, [userSearchTerm, users]);

  // Filter users for edit form
  useEffect(() => {
    if (!editUserSearchTerm.trim()) {
      setEditFilteredUsers(users);
      return;
    }

    const filtered = users.filter((user) => {
      const nameMatch = user.full_name?.toLowerCase().includes(editUserSearchTerm.toLowerCase());
      const emailMatch = user.email.toLowerCase().includes(editUserSearchTerm.toLowerCase());
      return nameMatch || emailMatch;
    });

    setEditFilteredUsers(filtered);
  }, [editUserSearchTerm, users]);

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
    } catch (error: unknown) {
      console.error('Error fetching recurring bookings:', error);
      setError('Error de red al cargar reservas recurrentes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users with showAll=true...');
      const res = await fetch('/api/users?showAll=true', { cache: 'no-store' });
      const data = await res.json();

      console.log('API Response:', {
        status: res.status,
        ok: res.ok,
        data: data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
      });

      if (res.ok && Array.isArray(data)) {
        console.log('Users fetched successfully:', data.length, 'users');
        console.log('First few users:', data.slice(0, 3));
        setUsers(data);
        setFilteredUsers(data);
      } else {
        console.error('Error fetching users:', data.error);
        setError('Error al cargar usuarios: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Network error fetching users:', error);
      setError('Error de red al cargar usuarios');
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
          (booking: {
            court: number;
            cancelled: boolean;
            confirmed: boolean;
            expires_at?: string;
            start_time: string;
            end_time: string;
          }) =>
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
    } catch (error: unknown) {
      console.error('Error checking regular bookings:', error);
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
          end_date: endDate || null, // null means forever
        }),
      });

      if (res.ok) {
        alert('Reserva recurrente creada exitosamente');
        await fetchRecurringBookings();
        setShowCreateForm(false);
        setSelectedUser('');
        setSelectedTime('');
        setSelectedCourt(1);
        setSelectedDuration(90);
        setStartDate('');
        setEndDate('');
      } else {
        const data = await res.json();
        alert(`Error al crear reserva recurrente: ${data.error}`);
      }
    } catch (error: unknown) {
      console.error('Error creating recurring booking:', error);
      alert('Error de red al crear reserva recurrente');
    }
  };

  const updateRecurringBooking = async (
    id: string,
    field: keyof RecurringBooking,
    value: string | number | boolean,
  ) => {
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
    } catch (error: unknown) {
      console.error('Error updating recurring booking:', error);
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
        await fetchRecurringBookings();
      } else {
        const data = await res.json();
        alert(`Error al eliminar reserva recurrente: ${data.error}`);
      }
    } catch (error: unknown) {
      console.error('Error deleting recurring booking:', error);
    }
  };

  const startEditBooking = (booking: RecurringBooking) => {
    setEditingBooking(booking);
    setEditForm({
      user_id: booking.user_id,
      court: booking.court as 1 | 2 | 3,
      day_of_week: booking.day_of_week,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_minutes: booking.duration_minutes as 60 | 90 | 120,
      start_date: booking.start_date || '',
      end_date: booking.end_date || '',
      active: booking.active,
    });

    // Set the user info for the edit form
    const user = users.find((u) => u.id === booking.user_id);
    if (user) {
      setEditSelectedUserInfo(user);
      setEditUserSearchTerm(user.full_name || user.email);
    }

    setShowEditEarlySlots(booking.start_time < '16:30');
  };

  const cancelEdit = () => {
    setEditingBooking(null);
    setEditForm({
      user_id: '',
      court: 1,
      day_of_week: 0,
      start_time: '',
      end_time: '',
      duration_minutes: 90,
      start_date: '',
      end_date: '',
      active: true,
    });
    setEditUserSearchTerm('');
    setEditSelectedUserInfo(null);
    setShowEditUserDropdown(false);
    setShowEditEarlySlots(false);
  };

  const saveEdit = async () => {
    if (!editingBooking) return;

    // Calculate end_time from start_time and duration
    const [h, m] = editForm.start_time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + editForm.duration_minutes;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    const calculatedEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    try {
      const res = await fetch('/api/recurring-bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBooking.id,
          updates: {
            user_id: editForm.user_id,
            court: editForm.court,
            day_of_week: editForm.day_of_week,
            start_time: editForm.start_time,
            end_time: calculatedEndTime,
            duration_minutes: editForm.duration_minutes,
            start_date: editForm.start_date || null,
            end_date: editForm.end_date || null,
            active: editForm.active,
          },
        }),
      });

      if (res.ok) {
        alert('Reserva recurrente actualizada exitosamente');
        await fetchRecurringBookings();
        cancelEdit();
      } else {
        const data = await res.json();
        alert(`Error al actualizar reserva recurrente: ${data.error}`);
      }
    } catch (error: unknown) {
      console.error('Error updating recurring booking:', error);
      alert('Error de red al actualizar reserva recurrente');
    }
  };

  if (loading) return <div>Cargando reservas recurrentes...</div>;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error mb-4">Error: {error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchRecurringBookings();
          }}
          className="bg-accent text-dark px-4 py-2 rounded hover:bg-accent-hover transition-colors"
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
          className="bg-success text-light px-4 py-2 rounded hover:bg-success-light transition-colors"
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
                  <p className="text-sm text-neutral">{selectedUserInfo.email}</p>
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
                      {filteredUsers.length === 0 ? (
                        <div className="px-3 py-2 text-neutral-muted">
                          No se encontraron usuarios. Total cargados: {users.length}
                        </div>
                      ) : (
                        <>
                          <div className="px-3 py-2 text-xs text-neutral-muted border-b border-muted">
                            {filteredUsers.length} usuarios encontrados
                          </div>
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
                              {user.full_name || 'Sin nombre'} ({user.email})
                            </div>
                          ))}
                        </>
                      )}
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
                <p className="text-sm text-neutral mt-1">
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
              <p className="text-xs text-neutral-muted mt-1">
                Deja vacío para que la reserva sea permanente (para siempre)
              </p>
            </div>

            {/* Create button */}
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={createRecurringBooking}
                disabled={!selectedUser || !selectedTime || !startDate}
                className="bg-success text-light px-4 py-2 rounded hover:bg-success-light disabled:bg-muted disabled:text-neutral-muted transition-colors"
              >
                Crear Reserva Recurrente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring bookings table */}
      <div className="bg-surface rounded border border-muted overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-medium text-neutral">Usuario</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-neutral">Día</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-neutral">Horario</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-neutral">Cancha</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-neutral">Duración</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-neutral">Estado</th>
              <th className="px-3 py-3 text-center text-sm font-medium text-neutral">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted">
            {recurringBookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-3">
                  <div>
                    <div className="font-medium text-neutral text-sm">
                      {booking.user?.full_name || 'Usuario no encontrado'}
                    </div>
                    <div className="text-xs text-neutral-muted">{booking.user?.email}</div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent">
                    {daysOfWeek.find((d) => d.value === booking.day_of_week)?.label}
                  </span>
                </td>
                <td className="px-3 py-3 text-neutral text-sm">
                  {booking.start_time} - {booking.end_time}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                    {booking.court}
                  </span>
                </td>
                <td className="px-3 py-3 text-neutral text-sm">{booking.duration_minutes} min</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      booking.active ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                    }`}
                  >
                    {booking.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-center">
                    <div className="relative group">
                      <button className="p-1.5 text-neutral hover:text-accent transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>
                      <div className="absolute right-0 mt-2 w-44 bg-surface border border-muted rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => startEditBooking(booking)}
                            className="w-full text-left px-3 py-2 text-sm text-neutral hover:bg-accent/10 transition-colors"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() =>
                              updateRecurringBooking(booking.id, 'active', !booking.active)
                            }
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              booking.active
                                ? 'text-warning hover:bg-warning/10'
                                : 'text-success hover:bg-success/10'
                            }`}
                          >
                            {booking.active ? '⏸️ Desactivar' : '▶️ Activar'}
                          </button>
                          <button
                            onClick={() => deleteRecurringBooking(booking.id)}
                            className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {recurringBookings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-neutral-muted mb-2">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-neutral text-lg font-medium">
              No hay reservas recurrentes configuradas
            </p>
            <p className="text-neutral-muted text-sm mt-1">
              Crea tu primera reserva recurrente usando el botón de arriba
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface p-6 rounded-lg border border-muted max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-neutral">Editar Reserva Recurrente</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* User selection */}
              <div className="user-dropdown-container">
                <label className="block text-sm font-medium mb-2 text-neutral">Usuario</label>
                {editSelectedUserInfo ? (
                  <div className="border border-muted rounded px-3 py-2 bg-surface">
                    <p className="font-medium text-neutral">{editSelectedUserInfo.full_name}</p>
                    <p className="text-sm text-neutral">{editSelectedUserInfo.email}</p>
                    <button
                      onClick={() => {
                        setEditForm({ ...editForm, user_id: '' });
                        setEditSelectedUserInfo(null);
                        setEditUserSearchTerm('');
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
                      value={editUserSearchTerm}
                      onChange={(e) => {
                        setEditUserSearchTerm(e.target.value);
                        setShowEditUserDropdown(true);
                      }}
                      onFocus={() => setShowEditUserDropdown(true)}
                      className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                    />
                    {showEditUserDropdown && editUserSearchTerm && (
                      <div className="mt-2 max-h-40 overflow-y-auto border border-muted rounded bg-surface">
                        {editFilteredUsers.length === 0 ? (
                          <div className="px-3 py-2 text-neutral-muted">
                            No se encontraron usuarios. Total cargados: {users.length}
                          </div>
                        ) : (
                          <>
                            <div className="px-3 py-2 text-xs text-neutral-muted border-b border-muted">
                              {editFilteredUsers.length} usuarios encontrados
                            </div>
                            {editFilteredUsers.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => {
                                  setEditForm({ ...editForm, user_id: user.id });
                                  setEditSelectedUserInfo(user);
                                  setEditUserSearchTerm(user.full_name || user.email);
                                  setShowEditUserDropdown(false);
                                }}
                                className="px-3 py-2 hover:bg-accent cursor-pointer border-b border-muted last:border-b-0 text-neutral"
                              >
                                {user.full_name || 'Sin nombre'} ({user.email})
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Day of week */}
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">
                  Día de la semana
                </label>
                <select
                  value={editForm.day_of_week}
                  onChange={(e) =>
                    setEditForm({ ...editForm, day_of_week: Number(e.target.value) })
                  }
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                >
                  {daysOfWeek.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">Horario</label>
                <div className="mb-2">
                  <button
                    onClick={() => setShowEditEarlySlots(!showEditEarlySlots)}
                    className="text-sm text-primary hover:underline"
                  >
                    {showEditEarlySlots
                      ? 'Ocultar horarios tempranos'
                      : 'Mostrar horarios tempranos'}
                  </button>
                </div>
                <select
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                >
                  <option value="">Seleccionar horario</option>
                  {(showEditEarlySlots ? allSlots : defaultSlots).map((slot) => (
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
                  value={editForm.duration_minutes}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      duration_minutes: Number(e.target.value) as 60 | 90 | 120,
                    })
                  }
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
                  value={editForm.court}
                  onChange={(e) =>
                    setEditForm({ ...editForm, court: Number(e.target.value) as 1 | 2 | 3 })
                  }
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                >
                  <option value={1}>Cancha 1</option>
                  <option value={2}>Cancha 2</option>
                  <option value={3}>Cancha 3</option>
                </select>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                />
              </div>

              {/* End date */}
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">
                  Fecha de fin (opcional)
                </label>
                <input
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                />
                <p className="text-xs text-neutral-muted mt-1">
                  Deja vacío para que la reserva sea permanente (para siempre)
                </p>
              </div>

              {/* Active status */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-neutral">Reserva activa</span>
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={cancelEdit}
                className="flex-1 bg-muted text-neutral px-4 py-2 rounded hover:bg-muted-light transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={!editForm.user_id || !editForm.start_time}
                className="flex-1 bg-success text-light px-4 py-2 rounded hover:bg-success-light disabled:bg-muted disabled:text-neutral-muted transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
