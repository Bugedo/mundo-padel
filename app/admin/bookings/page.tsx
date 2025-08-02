'use client';

import { useEffect, useState, useRef } from 'react';

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
  user?: {
    full_name: string;
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

const defaultSlots = allSlots.filter(slot => slot.start >= '16:30');

export default function BookingsAdminPage() {
  const baseDate = useRef(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{ [id: string]: number }>({});
  
  // Formulario de creación manual
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<60 | 90 | 120>(90);
  const [showEarlySlots, setShowEarlySlots] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

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

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { cache: 'no-store' });
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      setUsers(data);
      setFilteredUsers(data);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchUsers();
  }, [selectedDate]);

  // Timer que actualiza cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
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

  // Filtrar usuarios por búsqueda
  useEffect(() => {
    const filtered = users.filter(user => 
      user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [userSearchTerm, users]);

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

  const createManualBooking = async () => {
    if (!selectedUser || !selectedTime) {
      alert('Please select a user and time');
      return;
    }

    const dateString = formatDate(selectedDate);
    const [h, m] = selectedTime.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + selectedDuration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;

    const end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // Verificar disponibilidad
    const conflictingBookings = bookings.filter(b => {
      const active = b.confirmed || (b.expires_at && new Date(b.expires_at) > new Date());
      if (!active) return false;

      const [bh, bm] = b.start_time.split(':').map(Number);
      const bStart = bh * 60 + bm;
      const [eh, em] = b.end_time.split(':').map(Number);
      const bEnd = eh * 60 + em;

      return startMinutes < bEnd && endMinutes > bStart;
    });

    if (conflictingBookings.length >= 3) {
      alert('All courts are occupied in this time slot');
      return;
    }

    const takenCourts = conflictingBookings.map(b => b.court);
    const availableCourt = [1, 2, 3].find(c => !takenCourts.includes(c));

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: selectedUser,
        date: dateString,
        start_time: selectedTime,
        end_time,
        duration_minutes: selectedDuration,
        court: availableCourt,
        confirmed: true, // Crear directamente confirmada
      }),
    });

    if (res.ok) {
      alert('Booking created successfully');
      setShowCreateForm(false);
      setSelectedUser('');
      setSelectedTime('');
      fetchBookings();
    } else {
      const data = await res.json();
      alert(`Error creating booking: ${data.error}`);
    }
  };

  // Filtrar reservas por estado
  const pendingBookings = bookings.filter(b => !b.confirmed && !b.cancelled);
  const confirmedBookings = bookings.filter(b => b.confirmed && !b.present && !b.cancelled);
  const finishedBookings = bookings.filter(b => b.confirmed && b.present);
  const cancelledBookings = bookings.filter(b => b.cancelled);

  const slots = showEarlySlots ? allSlots : defaultSlots;

  if (loading) return <div>Loading bookings...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reservas</h1>

      {/* Navegación de fechas */}
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

      {/* Botón crear reserva */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {showCreateForm ? '−' : '+'} Crear Reserva
        </button>
      </div>

      {/* Formulario de creación manual */}
      {showCreateForm && (
        <div className="bg-gray-50 p-4 rounded border mb-6">
          <h3 className="text-lg font-semibold mb-4">Crear Reserva Manual</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buscador de usuarios */}
            <div>
              <label className="block text-sm font-medium mb-2">Usuario</label>
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
              {userSearchTerm && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user.id);
                        setUserSearchTerm(user.full_name || user.email);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      {user.full_name} ({user.email})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Horarios */}
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
                {slots.map(slot => (
                  <option key={slot.start} value={slot.start}>
                    {slot.start} - {slot.end}
                  </option>
                ))}
              </select>
            </div>

            {/* Duración */}
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

            {/* Botón crear */}
            <div className="flex items-end">
              <button
                onClick={createManualBooking}
                disabled={!selectedUser || !selectedTime}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Crear Reserva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sección: PENDIENTES */}
      {pendingBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-orange-600">Pendientes</h2>
          <table className="w-full border border-gray-300 rounded">
            <thead className="bg-orange-50">
              <tr>
                <th className="p-2 text-left">Usuario</th>
                <th className="p-2 text-left">Pista</th>
                <th className="p-2 text-left">Horario</th>
                <th className="p-2 text-left">Duración</th>
                <th className="p-2 text-left">Timer</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingBookings.map((b) => {
                const remaining = timeLeft[b.id] || 0;
                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;

                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-2">{b.user?.full_name || '—'}</td>
                    <td className="p-2">{b.court || '—'}</td>
                    <td className="p-2">
                      {b.start_time} - {b.end_time}
                    </td>
                    <td className="p-2">{b.duration_minutes} min</td>
                    <td className="p-2">
                      {remaining > 0 ? (
                        <span className={remaining < 60 ? 'text-red-600 font-bold' : ''}>
                          {minutes}:{seconds.toString().padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-red-600 font-bold">Expirada</span>
                      )}
                    </td>
                    <td className="p-2 flex gap-2">
                      <button
                        onClick={() => updateBooking(b.id, 'confirmed', true)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => updateBooking(b.id, 'cancelled', true)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sección: CONFIRMADAS */}
      {confirmedBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Confirmadas</h2>
          <table className="w-full border border-gray-300 rounded">
            <thead className="bg-blue-50">
              <tr>
                <th className="p-2 text-left">Usuario</th>
                <th className="p-2 text-left">Pista</th>
                <th className="p-2 text-left">Horario</th>
                <th className="p-2 text-left">Duración</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {confirmedBookings.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-2">{b.user?.full_name || '—'}</td>
                  <td className="p-2">{b.court || '—'}</td>
                  <td className="p-2">
                    {b.start_time} - {b.end_time}
                  </td>
                  <td className="p-2">{b.duration_minutes} min</td>
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => updateBooking(b.id, 'present', true)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Presente
                    </button>
                    <button
                      onClick={() => {
                        updateBooking(b.id, 'cancelled', true);
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Ausente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sección: FINALIZADAS */}
      {finishedBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-green-600">Finalizadas</h2>
          <table className="w-full border border-gray-300 rounded">
            <thead className="bg-green-50">
              <tr>
                <th className="p-2 text-left">Usuario</th>
                <th className="p-2 text-left">Pista</th>
                <th className="p-2 text-left">Horario</th>
                <th className="p-2 text-left">Duración</th>
                <th className="p-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {finishedBookings.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-2">{b.user?.full_name || '—'}</td>
                  <td className="p-2">{b.court || '—'}</td>
                  <td className="p-2">
                    {b.start_time} - {b.end_time}
                  </td>
                  <td className="p-2">{b.duration_minutes} min</td>
                  <td className="p-2">
                    <span className="text-green-600 font-semibold">Presente</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sección: CANCELADAS */}
      {cancelledBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Canceladas</h2>
          <table className="w-full border border-gray-300 rounded">
            <thead className="bg-red-50">
              <tr>
                <th className="p-2 text-left">Usuario</th>
                <th className="p-2 text-left">Pista</th>
                <th className="p-2 text-left">Horario</th>
                <th className="p-2 text-left">Duración</th>
                <th className="p-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cancelledBookings.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-2">{b.user?.full_name || '—'}</td>
                  <td className="p-2">{b.court || '—'}</td>
                  <td className="p-2">
                    {b.start_time} - {b.end_time}
                  </td>
                  <td className="p-2">{b.duration_minutes} min</td>
                  <td className="p-2">
                    <span className="text-red-600 font-semibold">Cancelada</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mensaje si no hay reservas */}
      {bookings.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No hay reservas para esta fecha
        </div>
      )}
    </div>
  );
}
