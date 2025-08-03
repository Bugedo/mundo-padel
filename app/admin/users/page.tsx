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
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  court: number;
  confirmed: boolean;
  present: boolean;
  cancelled: boolean;
  is_recurring: boolean;
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

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/users', { cache: 'no-store' });
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
        cache: 'no-store' 
      });
      const data = await res.json();

      if (res.ok) {
        setUserBookings(prev => ({
          ...prev,
          [userId]: data
        }));
      } else {
        console.error('Error fetching user bookings:', data.error);
      }
    } catch (err) {
      console.error('Error fetching user bookings:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      alert('Usuario eliminado');
      fetchUsers();
    } else {
      const data = await res.json();
      alert(`Error: ${data.error}`);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = users.filter((user) => 
      user.email.toLowerCase().includes(term.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(term.toLowerCase()))
    );
    setFilteredUsers(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getBookingStatus = (booking: Booking) => {
    if (booking.cancelled) return 'Cancelada';
    if (booking.present) return 'Presente';
    if (booking.confirmed) return 'Confirmada';
    return 'Pendiente';
  };

  const getStatusColor = (booking: Booking) => {
    if (booking.cancelled) return 'text-red-600';
    if (booking.present) return 'text-green-600';
    if (booking.confirmed) return 'text-blue-600';
    return 'text-orange-600';
  };

  if (loading) return <div>Cargando usuarios...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Usuarios</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/3"
        />
      </div>

      <table className="w-full border border-gray-300 rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Nombre Completo</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Teléfono</th>
            <th className="p-2 text-left">Rol</th>
            <th className="p-2 text-left">Fecha de Registro</th>
            <th className="p-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <React.Fragment key={user.id}>
              <tr className="border-t">
                <td className="p-2">{user.full_name || '—'}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">{user.phone || '—'}</td>
                <td className="p-2">{user.role}</td>
                <td className="p-2">{new Date(user.created_at).toLocaleDateString('es-ES')}</td>
                <td className="p-2 flex gap-2">
                  <button
                    onClick={() => handleToggleBookings(user.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    {expandedUserId === user.id ? 'Ocultar Reservas' : 'Ver Reservas'}
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
              {expandedUserId === user.id && (
                <tr>
                  <td colSpan={6} className="p-4 bg-gray-50">
                    <div className="space-y-4">
                      {/* Filter buttons */}
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => handleBookingFilterChange(user.id, 'active')}
                          className={`px-3 py-1 rounded text-sm ${
                            bookingFilter === 'active'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Reservas Activas
                        </button>
                        <button
                          onClick={() => handleBookingFilterChange(user.id, 'past')}
                          className={`px-3 py-1 rounded text-sm ${
                            bookingFilter === 'past'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Reservas Pasadas
                        </button>
                      </div>

                      {/* Bookings list */}
                      {userBookings[user.id] ? (
                        userBookings[user.id].length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full border border-gray-200 rounded">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="p-2 text-left text-sm">Fecha</th>
                                  <th className="p-2 text-left text-sm">Horario</th>
                                  <th className="p-2 text-left text-sm">Cancha</th>
                                  <th className="p-2 text-left text-sm">Duración</th>
                                  <th className="p-2 text-left text-sm">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userBookings[user.id].map((booking) => (
                                  <tr key={booking.id} className="border-t">
                                    <td className="p-2 text-sm">{formatDate(booking.date)}</td>
                                    <td className="p-2 text-sm">
                                      {booking.start_time} - {booking.end_time}
                                    </td>
                                    <td className="p-2 text-sm">Cancha {booking.court}</td>
                                    <td className="p-2 text-sm">{booking.duration_minutes} min</td>
                                    <td className="p-2 text-sm">
                                      <span className={`font-medium ${getStatusColor(booking)}`}>
                                        {getBookingStatus(booking)}
                                      </span>
                                      {booking.is_recurring && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                          R
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-4">
                            No hay reservas {bookingFilter === 'active' ? 'activas' : 'pasadas'} para este usuario
                          </div>
                        )
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          Cargando reservas...
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
