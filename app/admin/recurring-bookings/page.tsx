'use client';

import { useState, useEffect } from 'react';
import { formatTimeForDisplay } from '@/lib/timeFormatUtils';
import { getDayOfWeekBuenosAires, getDayNameBuenosAires, formatDateDisplay } from '@/lib/timezoneUtils';

interface ClientOption {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

interface RecurringBooking {
  id: string;
  user_id: string | null;
  client_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  court: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  active: boolean;
  first_date: string;
  last_date?: string;
  recurrence_interval_days: number;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    phone?: string | null;
  } | null;
  client?: {
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
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

function bookingDisplayName(booking: RecurringBooking) {
  return booking.guest_name || booking.client?.full_name || booking.user?.full_name || 'Sin cliente';
}

function bookingDisplayContact(booking: RecurringBooking) {
  return (
    booking.guest_phone ||
    booking.client?.phone ||
    booking.client?.email ||
    booking.user?.email ||
    ''
  );
}

export default function RecurringBookingsPage() {
  const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating new recurring booking
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [searchingClients, setSearchingClients] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<60 | 90 | 120>(90);
  const [selectedCourt, setSelectedCourt] = useState<1 | 2 | 3>(1);
  const [firstDate, setFirstDate] = useState<string>('');
  const [lastDate, setLastDate] = useState<string>('');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(7);
  const [showEarlySlots, setShowEarlySlots] = useState(false);

  // Edit form state
  const [editingBooking, setEditingBooking] = useState<RecurringBooking | null>(null);
  const [editForm, setEditForm] = useState({
    client_id: '' as string,
    court: 1 as 1 | 2 | 3,
    start_time: '',
    end_time: '',
    duration_minutes: 90 as 60 | 90 | 120,
    first_date: '',
    last_date: '',
    recurrence_interval_days: 7,
    active: true,
  });
  const [editClientSearchTerm, setEditClientSearchTerm] = useState('');
  const [editClientSuggestions, setEditClientSuggestions] = useState<ClientOption[]>([]);
  const [editSelectedClient, setEditSelectedClient] = useState<ClientOption | null>(null);
  const [editSearchingClients, setEditSearchingClients] = useState(false);
  const [showEditEarlySlots, setShowEditEarlySlots] = useState(false);

  const slots = showEarlySlots ? allSlots : defaultSlots;

  useEffect(() => {
    fetchRecurringBookings();
  }, []);

  // Create form: predictive client search (2+ chars)
  useEffect(() => {
    if (clientSearchTerm.trim().length < 2 || selectedClient) {
      setClientSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      setSearchingClients(true);
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(clientSearchTerm.trim())}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setClientSuggestions(data);
        } else {
          setClientSuggestions([]);
        }
      } catch {
        setClientSuggestions([]);
      } finally {
        setSearchingClients(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [clientSearchTerm, selectedClient]);

  // Edit form: predictive client search (2+ chars)
  useEffect(() => {
    if (editClientSearchTerm.trim().length < 2 || editSelectedClient) {
      setEditClientSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      setEditSearchingClients(true);
      try {
        const res = await fetch(
          `/api/clients?q=${encodeURIComponent(editClientSearchTerm.trim())}`,
          { cache: 'no-store' },
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setEditClientSuggestions(data);
        } else {
          setEditClientSuggestions([]);
        }
      } catch {
        setEditClientSuggestions([]);
      } finally {
        setEditSearchingClients(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [editClientSearchTerm, editSelectedClient]);

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
    } catch (err: unknown) {
      console.error('Error fetching recurring bookings:', err);
      setError('Error de red al cargar reservas recurrentes');
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedClient(null);
    setClientSearchTerm('');
    setClientSuggestions([]);
    setSelectedTime('');
    setSelectedCourt(1);
    setSelectedDuration(90);
    setFirstDate('');
    setLastDate('');
    setRecurrenceInterval(7);
  };

  const createRecurringBooking = async () => {
    if (!selectedClient || !selectedTime || !firstDate) {
      alert('Por favor selecciona un cliente, horario y fecha de inicio');
      return;
    }

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
          client_id: selectedClient.id,
          court: selectedCourt,
          start_time: selectedTime,
          end_time,
          duration_minutes: selectedDuration,
          first_date: firstDate,
          last_date: lastDate || null,
          recurrence_interval_days: recurrenceInterval,
        }),
      });

      if (res.ok) {
        alert('Reserva recurrente creada exitosamente');
        await fetchRecurringBookings();
        setShowCreateForm(false);
        resetCreateForm();
      } else {
        const data = await res.json();
        alert(`Error al crear reserva recurrente: ${data.error}`);
      }
    } catch (err: unknown) {
      console.error('Error creating recurring booking:', err);
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
    } catch (err: unknown) {
      console.error('Error updating recurring booking:', err);
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
    } catch (err: unknown) {
      console.error('Error deleting recurring booking:', err);
    }
  };

  const startEditBooking = (booking: RecurringBooking) => {
    setEditingBooking(booking);
    setEditForm({
      client_id: booking.client_id || '',
      court: booking.court as 1 | 2 | 3,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_minutes: booking.duration_minutes as 60 | 90 | 120,
      first_date: booking.first_date || '',
      last_date: booking.last_date || '',
      recurrence_interval_days: booking.recurrence_interval_days,
      active: booking.active,
    });

    if (booking.client_id && (booking.client || booking.guest_name)) {
      const clientInfo: ClientOption = {
        id: booking.client_id,
        full_name: booking.client?.full_name || booking.guest_name || 'Cliente',
        phone: booking.client?.phone || booking.guest_phone || null,
        email: booking.client?.email || null,
      };
      setEditSelectedClient(clientInfo);
      setEditClientSearchTerm(clientInfo.full_name);
    } else if (booking.guest_name) {
      setEditSelectedClient(null);
      setEditClientSearchTerm('');
    } else {
      setEditSelectedClient(null);
      setEditClientSearchTerm('');
    }

    setShowEditEarlySlots(booking.start_time < '16:30');
    setEditClientSuggestions([]);
  };

  const cancelEdit = () => {
    setEditingBooking(null);
    setEditForm({
      client_id: '',
      court: 1,
      start_time: '',
      end_time: '',
      duration_minutes: 90,
      first_date: '',
      last_date: '',
      recurrence_interval_days: 7,
      active: true,
    });
    setEditClientSearchTerm('');
    setEditSelectedClient(null);
    setEditClientSuggestions([]);
    setShowEditEarlySlots(false);
  };

  const saveEdit = async () => {
    if (!editingBooking) return;
    if (!editSelectedClient && !editForm.client_id) {
      alert('Por favor selecciona un cliente');
      return;
    }

    const [h, m] = editForm.start_time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + editForm.duration_minutes;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    const calculatedEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const clientId = editSelectedClient?.id || editForm.client_id;

    try {
      const res = await fetch('/api/recurring-bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBooking.id,
          updates: {
            client_id: clientId,
            court: editForm.court,
            start_time: editForm.start_time,
            end_time: calculatedEndTime,
            duration_minutes: editForm.duration_minutes,
            first_date: editForm.first_date || null,
            last_date: editForm.last_date || null,
            recurrence_interval_days: editForm.recurrence_interval_days,
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
    } catch (err: unknown) {
      console.error('Error updating recurring booking:', err);
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

      <div className="mb-6">
        <button
          onClick={() => {
            if (showCreateForm) resetCreateForm();
            setShowCreateForm(!showCreateForm);
          }}
          className="bg-success text-light px-4 py-2 rounded hover:bg-success-light transition-colors"
        >
          {showCreateForm ? 'Cancelar' : 'Crear Reserva Recurrente'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-surface p-6 rounded border border-muted mb-6">
          <h3 className="text-lg font-semibold mb-4 text-neutral">Crear Reserva Recurrente</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral">Cliente</label>
              {selectedClient ? (
                <div className="flex items-center justify-between gap-2 border border-accent rounded px-3 py-2 bg-accent/10 text-neutral">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{selectedClient.full_name}</p>
                    <p className="text-xs opacity-80 truncate">
                      {selectedClient.phone || 'Sin teléfono'}
                      {selectedClient.email ? ` · ${selectedClient.email}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearchTerm('');
                    }}
                    className="text-xs shrink-0 underline"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Buscar nombre, email o teléfono (2+ caracteres)…"
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                    autoComplete="off"
                  />
                  {clientSearchTerm.trim().length >= 2 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-muted rounded bg-surface">
                      {searchingClients && (
                        <div className="px-3 py-2 text-sm text-neutral-muted">Buscando…</div>
                      )}
                      {!searchingClients && clientSuggestions.length === 0 && (
                        <div className="px-3 py-2 text-sm text-neutral-muted">
                          Sin resultados. Creá el cliente en Clientes.
                        </div>
                      )}
                      {clientSuggestions.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => {
                            setSelectedClient(client);
                            setClientSearchTerm(client.full_name);
                            setClientSuggestions([]);
                          }}
                          className="px-3 py-2 text-neutral hover:bg-accent hover:text-dark cursor-pointer border-b border-muted last:border-b-0"
                        >
                          <div className="font-medium">{client.full_name}</div>
                          <div className="text-xs opacity-80">
                            {client.phone || 'Sin teléfono'}
                            {client.email ? ` · ${client.email}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral">Fecha de inicio</label>
              <input
                type="date"
                value={firstDate}
                onChange={(e) => setFirstDate(e.target.value)}
                className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
              />
              {firstDate && (
                <p className="text-sm text-neutral mt-1">
                  Día de la semana:{' '}
                  {getDayNameBuenosAires(getDayOfWeekBuenosAires(firstDate))}
                </p>
              )}
            </div>

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
                  <option key={slot.start} value={slot.start + ':00'}>
                    {formatTimeForDisplay(slot.start + ':00')}
                  </option>
                ))}
              </select>
            </div>

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
                value={lastDate}
                onChange={(e) => setLastDate(e.target.value)}
                className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
              />
              <p className="text-xs text-neutral-muted mt-1">
                Deja vacío para que la reserva sea permanente (para siempre)
              </p>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={createRecurringBooking}
                disabled={!selectedClient || !selectedTime || !firstDate}
                className="bg-success text-light px-4 py-2 rounded hover:bg-success-light disabled:bg-muted disabled:text-neutral-muted transition-colors"
              >
                Crear Reserva Recurrente
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface rounded border border-muted overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-medium text-neutral">Cliente</th>
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
                      {bookingDisplayName(booking)}
                    </div>
                    {bookingDisplayContact(booking) && (
                      <div className="text-xs text-neutral-muted">
                        {bookingDisplayContact(booking)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent">
                      {getDayNameBuenosAires(getDayOfWeekBuenosAires(booking.first_date))}
                    </span>
                    <div className="text-xs text-neutral-muted">
                      {formatDateDisplay(booking.first_date)} (cada {booking.recurrence_interval_days}{' '}
                      días)
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-neutral text-sm">
                  {formatTimeForDisplay(booking.start_time)}
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

      {editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface p-6 rounded-lg border border-muted max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-neutral">Editar Reserva Recurrente</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">Cliente</label>
                {editSelectedClient ? (
                  <div className="flex items-center justify-between gap-2 border border-accent rounded px-3 py-2 bg-accent/10 text-neutral">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{editSelectedClient.full_name}</p>
                      <p className="text-xs opacity-80 truncate">
                        {editSelectedClient.phone || 'Sin teléfono'}
                        {editSelectedClient.email ? ` · ${editSelectedClient.email}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm({ ...editForm, client_id: '' });
                        setEditSelectedClient(null);
                        setEditClientSearchTerm('');
                      }}
                      className="text-xs shrink-0 underline"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Buscar nombre, email o teléfono (2+ caracteres)…"
                      value={editClientSearchTerm}
                      onChange={(e) => setEditClientSearchTerm(e.target.value)}
                      className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                      autoComplete="off"
                    />
                    {editClientSearchTerm.trim().length >= 2 && (
                      <div className="mt-2 max-h-40 overflow-y-auto border border-muted rounded bg-surface">
                        {editSearchingClients && (
                          <div className="px-3 py-2 text-sm text-neutral-muted">Buscando…</div>
                        )}
                        {!editSearchingClients && editClientSuggestions.length === 0 && (
                          <div className="px-3 py-2 text-sm text-neutral-muted">
                            Sin resultados. Creá el cliente en Clientes.
                          </div>
                        )}
                        {editClientSuggestions.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => {
                              setEditForm({ ...editForm, client_id: client.id });
                              setEditSelectedClient(client);
                              setEditClientSearchTerm(client.full_name);
                              setEditClientSuggestions([]);
                            }}
                            className="px-3 py-2 text-neutral hover:bg-accent hover:text-dark cursor-pointer border-b border-muted last:border-b-0"
                          >
                            <div className="font-medium">{client.full_name}</div>
                            <div className="text-xs opacity-80">
                              {client.phone || 'Sin teléfono'}
                              {client.email ? ` · ${client.email}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={editForm.first_date}
                  onChange={(e) => setEditForm({ ...editForm, first_date: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                />
                {editForm.first_date && (
                  <p className="text-sm text-neutral mt-1">
                    Día de la semana:{' '}
                    {getDayNameBuenosAires(getDayOfWeekBuenosAires(editForm.first_date))}
                  </p>
                )}
              </div>

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
                    <option key={slot.start} value={slot.start + ':00'}>
                      {formatTimeForDisplay(slot.start + ':00')}
                    </option>
                  ))}
                </select>
              </div>

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

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">
                  Fecha de fin (opcional)
                </label>
                <input
                  type="date"
                  value={editForm.last_date}
                  onChange={(e) => setEditForm({ ...editForm, last_date: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                />
                <p className="text-xs text-neutral-muted mt-1">
                  Deja vacío para que la reserva sea permanente (para siempre)
                </p>
              </div>

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

            <div className="flex gap-2 pt-4">
              <button
                onClick={cancelEdit}
                className="flex-1 bg-muted text-neutral px-4 py-2 rounded hover:bg-muted-light transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={(!editSelectedClient && !editForm.client_id) || !editForm.start_time}
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
