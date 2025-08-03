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
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<60 | 90 | 120>(90);
  const [selectedCourt, setSelectedCourt] = useState<1 | 2 | 3>(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showEarlySlots, setShowEarlySlots] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

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
        setSelectedTime('');
        setStartDate('');
        setEndDate('');
        setUserSearchTerm('');
        setSelectedDuration(90);
        setSelectedCourt(1);
        setShowEarlySlots(false);
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
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reservas Recurrentes</h1>

      {/* Create Recurring Booking Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {showCreateForm ? '−' : '+'} Crear Reserva Recurrente
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-gray-50 p-6 rounded border mb-6">
          <h3 className="text-lg font-semibold mb-4">Crear Reserva Recurrente</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Usuario</label>
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
              {userSearchTerm && !selectedUser && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user.id);
                        setUserSearchTerm(`${user.full_name || 'Sin nombre'} (${user.email})`);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      {user.full_name || 'Sin nombre'} ({user.email})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                required
              />
              {startDate && (
                <p className="text-sm text-gray-600 mt-1">
                  Día de la semana: {daysOfWeek[new Date(startDate).getDay()]?.label}
                </p>
              )}
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-sm font-medium mb-2">Horario</label>
              <div className="mb-2">
                <button
                  onClick={() => setShowEarlySlots(!showEarlySlots)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showEarlySlots ? 'Ocultar horarios tempranos' : 'Mostrar horarios tempranos'}
                </button>
              </div>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="border rounded px-3 py-2 w-full"
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
              <label className="block text-sm font-medium mb-2">Duración</label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value) as 60 | 90 | 120)}
                className="border rounded px-3 py-2 w-full"
              >
                <option value={60}>60 minutos</option>
                <option value={90}>90 minutos</option>
                <option value={120}>120 minutos</option>
              </select>
            </div>

            {/* Court */}
            <div>
              <label className="block text-sm font-medium mb-2">Cancha</label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(Number(e.target.value) as 1 | 2 | 3)}
                className="border rounded px-3 py-2 w-full"
              >
                <option value={1}>Cancha 1</option>
                <option value={2}>Cancha 2</option>
                <option value={3}>Cancha 3</option>
              </select>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Fin (Opcional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>

            {/* Create Button */}
            <div className="flex items-end">
              <button
                onClick={createRecurringBooking}
                disabled={!selectedUser || !selectedTime}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Crear Reserva Recurrente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Bookings List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Reservas Recurrentes Activas</h2>

        {recurringBookings.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No se encontraron reservas recurrentes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Usuario</th>
                  <th className="p-2 text-left">Día</th>
                  <th className="p-2 text-left">Horario</th>
                  <th className="p-2 text-left">Duración</th>
                  <th className="p-2 text-left">Cancha</th>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recurringBookings.map((booking) => (
                  <tr key={booking.id} className="border-t">
                    <td className="p-2">{booking.user?.full_name || '—'}</td>
                    <td className="p-2">
                      {daysOfWeek.find((d) => d.value === booking.day_of_week)?.label}
                    </td>
                    <td className="p-2">
                      {booking.start_time} - {booking.end_time}
                    </td>
                    <td className="p-2">{booking.duration_minutes} min</td>
                    <td className="p-2">Cancha {booking.court}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${booking.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {booking.active ? 'Activo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="p-2 flex gap-2">
                      <button
                        onClick={() =>
                          updateRecurringBooking(booking.id, 'active', !booking.active)
                        }
                        className={`px-3 py-1 rounded text-white text-sm ${
                          booking.active
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {booking.active ? 'Pausar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => deleteRecurringBooking(booking.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
