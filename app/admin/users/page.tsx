'use client';

import React from 'react';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
}

interface Booking {
  id: string;
  date: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  court: number;
  confirmed: boolean;
  present: boolean;
  cancelled: boolean;
  is_recurring: boolean;
  day_of_week?: number;
  active?: boolean;
  start_date?: string;
  end_date?: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<{ [userId: string]: Booking[] }>({});
  const [bookingFilter, setBookingFilter] = useState<'active' | 'past'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Edit user states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const fetchUsers = async (showAll = false) => {
    setLoading(true);
    const url = showAll ? '/api/users?showAll=true' : '/api/users';
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      setUsers(data);
      setFilteredUsers(data);
      setError(null);
    } else {
      setError(data.error || 'Failed to load users');
    }

    setLoading(false);
  };

  const fetchUserBookings = async (userId: string, filter: 'active' | 'past') => {
    try {
      const res = await fetch(`/api/users?userId=${userId}&filter=${filter}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (res.ok) {
        setUserBookings((prev) => ({
          ...prev,
          [userId]: data,
        }));
      } else {
        console.error('Error fetching user bookings:', data.error);
      }
    } catch (err) {
      console.error('Error fetching user bookings:', err);
    }
  };

  useEffect(() => {
    fetchUsers(showAllUsers);
  }, [showAllUsers]);

  const handleToggleBookings = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      // Fetch bookings if not already loaded
      if (!userBookings[userId]) {
        await fetchUserBookings(userId, bookingFilter);
      }
    }
  };

  const handleBookingFilterChange = async (userId: string, filter: 'active' | 'past') => {
    setBookingFilter(filter);
    await fetchUserBookings(userId, filter);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        alert('Usuario eliminado');
        fetchUsers(showAllUsers);
      } else {
        const data = await res.json();
        alert(`Error al eliminar usuario: ${data.error}`);
      }
    } catch (err) {
      alert('Error de red al eliminar usuario');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email,
      phone: user.phone || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUserId) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUserId,
          updates: {
            full_name: editForm.full_name,
            email: editForm.email,
            phone: editForm.phone,
          },
        }),
      });

      if (res.ok) {
        alert('Usuario actualizado exitosamente');
        setEditingUserId(null);
        setEditForm({ full_name: '', email: '', phone: '' });
        fetchUsers(showAllUsers);
      } else {
        const data = await res.json();
        alert(`Error al actualizar usuario: ${data.error}`);
      }
    } catch (err) {
      alert('Error de red al actualizar usuario');
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({ full_name: '', email: '', phone: '' });
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);

    // If there's a search term, fetch all users to search through them
    if (term.trim() && !showAllUsers) {
      setShowAllUsers(true);
      await fetchUsers(true);
    } else if (!term.trim() && showAllUsers) {
      // If search is cleared and we were showing all users, go back to admins only
      setShowAllUsers(false);
      await fetchUsers(false);
    }

    // Filter the current users based on search term
    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(term.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(term.toLowerCase())),
    );
    setFilteredUsers(filtered);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDayOfWeek = (dayNumber: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayNumber] || '';
  };

  const formatBookingDate = (booking: Booking) => {
    if (booking.is_recurring) {
      return `Todos los ${getDayOfWeek(booking.day_of_week || 0)}`;
    }
    return formatDate(booking.date || '');
  };

  const getBookingStatus = (booking: Booking) => {
    if (booking.is_recurring) {
      return booking.active ? 'Activa' : 'Pausada';
    }
    if (booking.cancelled) return 'Cancelada';
    if (booking.present) return 'Presente';
    if (booking.confirmed) return 'Confirmada';
    return 'Pendiente';
  };

  const getStatusColor = (booking: Booking) => {
    if (booking.is_recurring) {
      return booking.active ? 'text-green-600' : 'text-gray-600';
    }
    if (booking.cancelled) return 'text-red-600';
    if (booking.present) return 'text-green-600';
    if (booking.confirmed) return 'text-blue-600';
    return 'text-orange-600';
  };

  if (loading) return <div>Cargando usuarios...</div>;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button
          onClick={() => fetchUsers(showAllUsers)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Usuarios</h1>

      {/* Search and status */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Buscar usuarios por nombre o email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full max-w-md"
          />
          <div className="text-sm text-gray-600">
            {showAllUsers ? 'Mostrando todos los usuarios' : 'Mostrando solo administradores'}
          </div>
        </div>
        {!searchTerm && (
          <div className="text-sm text-blue-600">
            💡 Usa el buscador para acceder a todos los usuarios del sistema
          </div>
        )}
      </div>

      {/* Users list */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <div key={user.id} className="border rounded p-4">
            {editingUserId === user.id ? (
              // Edit form
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-600">Editando Usuario</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre Completo</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="border rounded px-3 py-2 w-full"
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="border rounded px-3 py-2 w-full"
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Teléfono</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="border rounded px-3 py-2 w-full"
                      placeholder="+54 9 11 1234-5678"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Normal user display
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{user.full_name || 'Sin nombre'}</h3>
                  <p className="text-gray-600">{user.email}</p>
                  {user.phone && <p className="text-gray-600">Tel: {user.phone}</p>}
                  <p className="text-sm text-gray-500">
                    Rol: {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </p>
                  <p className="text-sm text-gray-500">Registrado: {formatDate(user.created_at)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleBookings(user.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    {expandedUserId === user.id ? 'Ocultar' : 'Ver'} Reservas
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            {/* Expanded bookings section */}
            {expandedUserId === user.id && editingUserId !== user.id && (
              <div className="mt-4 border-t pt-4">
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => handleBookingFilterChange(user.id, 'active')}
                    className={`px-3 py-1 rounded ${
                      bookingFilter === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Reservas Activas
                  </button>
                  <button
                    onClick={() => handleBookingFilterChange(user.id, 'past')}
                    className={`px-3 py-1 rounded ${
                      bookingFilter === 'past'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Reservas Pasadas
                  </button>
                </div>

                <div className="space-y-2">
                  {userBookings[user.id]?.map((booking) => (
                    <div key={booking.id} className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{formatBookingDate(booking)}</p>
                          <p className="text-sm text-gray-600">
                            {booking.start_time} - {booking.end_time} ({booking.duration_minutes}{' '}
                            min)
                          </p>
                          <p className="text-sm text-gray-600">Cancha: {booking.court}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(booking)}`}>
                          {getBookingStatus(booking)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {userBookings[user.id]?.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No hay reservas {bookingFilter === 'active' ? 'activas' : 'pasadas'} para este
                      usuario.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm
                ? 'No se encontraron usuarios que coincidan con la búsqueda.'
                : 'No hay usuarios registrados.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
