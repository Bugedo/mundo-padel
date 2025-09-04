'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';

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

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
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

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Edit user states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
  });

  // Create user states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
  });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchUsers = useCallback(async (showAll = false) => {
    setLoading(true);
    const url = showAll ? '/api/users?showAll=true' : '/api/users';
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      setUsers(data);
      setError(null);
    } else {
      setError(data.error || 'Failed to load users');
    }

    setLoading(false);
  }, []);

  // Memoized filtered users to avoid recalculation on every render
  const memoizedFilteredUsers = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return users;
    }

    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (user.full_name &&
          user.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())),
    );
  }, [users, debouncedSearchTerm]);

  // Update filtered users when memoized result changes
  useEffect(() => {
    setFilteredUsers(memoizedFilteredUsers);
  }, [memoizedFilteredUsers]);

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
    fetchUsers(true);
  }, [fetchUsers]);

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
    const user = users.find((u) => u.id === id);
    const userName = user?.full_name || user?.email || 'este usuario';

    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar a ${userName}?\n\n⚠️ Esta acción eliminará:\n• Todas las reservas del usuario\n• Todas las reservas recurrentes\n• El perfil del usuario\n• La cuenta de autenticación\n\nEsta acción NO se puede deshacer.`,
      )
    )
      return;

    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Usuario eliminado exitosamente: ${data.message}`);
        fetchUsers(true);
      } else {
        const data = await res.json();
        alert(`Error al eliminar usuario: ${data.error}`);
      }
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      alert('Error de red al eliminar usuario');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
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
            role: editForm.role,
          },
        }),
      });

      if (res.ok) {
        const responseData = await res.json();
        alert(`Usuario actualizado exitosamente: ${responseData.message}`);
        setEditingUserId(null);
        setEditForm({ full_name: '', email: '', phone: '', role: '' });
        fetchUsers(true);
      } else {
        const data = await res.json();
        alert(`Error al actualizar usuario: ${data.error}`);
      }
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      alert('Error de red al actualizar usuario');
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({ full_name: '', email: '', phone: '', role: '' });
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.full_name || !createForm.password) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          full_name: createForm.full_name,
          phone: createForm.phone,
          password: createForm.password,
          role: createForm.role,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Usuario creado exitosamente: ${data.message}`);
        setShowCreateModal(false);
        setCreateForm({
          full_name: '',
          email: '',
          phone: '',
          password: '',
          role: 'user',
        });
        // Refresh the users list to show the new user
        fetchUsers(true);
      } else {
        alert(`Error al crear usuario: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error de red al crear usuario');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setCreateForm({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      role: 'user',
    });
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // No need to fetch users again, just update the search term
    // The debounced search will handle the filtering automatically
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
      return booking.active ? 'text-success' : 'text-muted';
    }
    if (booking.cancelled) return 'text-error';
    if (booking.present) return 'text-success';
    if (booking.confirmed) return 'text-primary';
    return 'text-muted';
  };

  if (loading) return <div>Cargando usuarios...</div>;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error mb-4">Error: {error}</p>
        <button
          onClick={() => fetchUsers(true)}
          className="bg-success text-light px-4 py-2 rounded hover:bg-success-light transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Usuarios</h1>

      {/* Search and Create User */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Buscar usuarios por nombre o email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="border border-muted rounded px-3 py-2 w-80 bg-surface text-neutral"
          />
          <div className="text-sm text-neutral-muted">
            {debouncedSearchTerm.trim() && <span>Buscando: &quot;{debouncedSearchTerm}&quot;</span>}
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-accent text-dark px-4 py-2 rounded hover:bg-accent-hover transition-colors"
        >
          Crear Usuario
        </button>
      </div>

      {/* Users list */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <div key={user.id} className="border border-muted rounded p-4 bg-surface">
            {editingUserId === user.id ? (
              // Edit form
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Editando Usuario</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-neutral">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-neutral">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-neutral">Teléfono</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                      placeholder="+54 9 11 1234-5678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-neutral">Rol</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="bg-success text-light px-4 py-2 rounded hover:bg-success-light transition-colors"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-muted text-neutral px-4 py-2 rounded hover:bg-muted-light transition-colors"
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
                  <h3 className="text-lg font-semibold text-neutral">
                    {user.full_name || 'Sin nombre'}
                  </h3>
                  <p className="text-neutral">{user.email}</p>
                  {user.phone && <p className="text-neutral">Tel: {user.phone}</p>}
                  <p className="text-sm text-neutral">
                    Rol: {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </p>
                  <p className="text-sm text-neutral">Registrado: {formatDate(user.created_at)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="bg-accent text-dark px-3 py-1 rounded hover:bg-accent-hover transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleBookings(user.id)}
                    className="bg-primary text-light px-3 py-1 rounded hover:bg-primary-hover transition-colors"
                  >
                    {expandedUserId === user.id ? 'Ocultar' : 'Ver'} Reservas
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-error text-light px-3 py-1 rounded hover:bg-error-light transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            {/* Expanded bookings section */}
            {expandedUserId === user.id && editingUserId !== user.id && (
              <div className="mt-4 border-t border-muted pt-4">
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => handleBookingFilterChange(user.id, 'active')}
                    className={`px-3 py-1 rounded ${
                      bookingFilter === 'active'
                        ? 'bg-primary text-light'
                        : 'bg-surface text-neutral border border-muted'
                    }`}
                  >
                    Reservas Activas
                  </button>
                  <button
                    onClick={() => handleBookingFilterChange(user.id, 'past')}
                    className={`px-3 py-1 rounded ${
                      bookingFilter === 'past'
                        ? 'bg-primary text-light'
                        : 'bg-surface text-neutral border border-muted'
                    }`}
                  >
                    Reservas Pasadas
                  </button>
                </div>

                <div className="space-y-2">
                  {userBookings[user.id]?.map((booking) => (
                    <div key={booking.id} className="bg-surface p-3 rounded border border-muted">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-neutral">{formatBookingDate(booking)}</p>
                          <p className="text-sm text-neutral">
                            {booking.start_time} - {booking.end_time} ({booking.duration_minutes}{' '}
                            min)
                          </p>
                          <p className="text-sm text-neutral">Cancha: {booking.court}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(booking)}`}>
                          {getBookingStatus(booking)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {userBookings[user.id]?.length === 0 && (
                    <p className="text-neutral text-center py-4">
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
            <p className="text-neutral">
              {searchTerm
                ? 'No se encontraron usuarios que coincidan con la búsqueda.'
                : 'No hay usuarios registrados.'}
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface border border-muted rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-neutral">Crear Nuevo Usuario</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">Teléfono</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                  placeholder="+54 9 11 1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">Contraseña *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                  placeholder="Contraseña temporal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral">Rol</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="border border-muted rounded px-3 py-2 w-full bg-surface text-neutral"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateUser}
                disabled={createLoading}
                className="bg-success text-light px-4 py-2 rounded hover:bg-success-light transition-colors disabled:opacity-50"
              >
                {createLoading ? 'Creando...' : 'Crear Usuario'}
              </button>
              <button
                onClick={handleCancelCreate}
                disabled={createLoading}
                className="bg-muted text-neutral px-4 py-2 rounded hover:bg-muted-light transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
