'use client';

import { useCallback, useEffect, useState } from 'react';

interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: '', phone: '', email: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', email: '' });

  const fetchClients = useCallback(async (q?: string) => {
    setLoading(true);
    const url = q && q.length >= 2 ? `/api/clients?q=${encodeURIComponent(q)}` : '/api/clients';
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (res.ok && Array.isArray(data)) {
      setClients(data);
      setError(null);
    } else {
      setError(data.error || 'Error al cargar clientes');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchClients(searchTerm.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm, fetchClients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });
    const data = await res.json();
    setCreateLoading(false);
    if (!res.ok) {
      alert(data.error || 'No se pudo crear');
      return;
    }
    setShowCreate(false);
    setCreateForm({ full_name: '', phone: '', email: '' });
    fetchClients(searchTerm.trim());
  };

  const startEdit = (c: Client) => {
    setEditingId(c.id);
    setEditForm({
      full_name: c.full_name || '',
      phone: c.phone || '',
      email: c.email || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const res = await fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, updates: editForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'No se pudo guardar');
      return;
    }
    setEditingId(null);
    fetchClients(searchTerm.trim());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'No se pudo eliminar');
      return;
    }
    fetchClients(searchTerm.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Clientes</h1>
          <p className="text-sm text-neutral-muted">
            Fichas de clientes para vincular reservas y recurrentes
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-accent text-dark px-4 py-2 rounded font-medium hover:bg-accent-hover"
        >
          + Nuevo cliente
        </button>
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre, email o teléfono (mín. 2 caracteres)…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full max-w-lg border border-muted rounded px-3 py-2 bg-surface text-neutral"
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {loading ? (
        <p className="text-neutral">Cargando…</p>
      ) : clients.length === 0 ? (
        <p className="text-neutral-muted">No hay clientes{searchTerm ? ' para esa búsqueda' : ''}.</p>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-surface border border-muted rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
            >
              {editingId === c.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full border border-muted rounded px-2 py-1 bg-background text-neutral"
                    placeholder="Nombre"
                  />
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-muted rounded px-2 py-1 bg-background text-neutral"
                    placeholder="Teléfono"
                  />
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-muted rounded px-2 py-1 bg-background text-neutral"
                    placeholder="Email"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="bg-accent text-dark px-3 py-1 rounded text-sm"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-muted text-neutral px-3 py-1 rounded text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-semibold text-neutral">{c.full_name}</p>
                    <p className="text-sm text-neutral-muted">
                      {c.phone || 'Sin teléfono'}
                      {c.email ? ` · ${c.email}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-sm px-3 py-1 rounded border border-muted text-neutral hover:bg-muted"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-sm px-3 py-1 rounded border border-error/40 text-error hover:bg-error/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <form
            onSubmit={handleCreate}
            className="bg-surface border border-muted rounded-lg p-6 w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-semibold text-neutral">Nuevo cliente</h2>
            <input
              required
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              placeholder="Nombre *"
              className="w-full border border-muted rounded px-3 py-2 bg-background text-neutral"
            />
            <input
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              placeholder="Teléfono"
              className="w-full border border-muted rounded px-3 py-2 bg-background text-neutral"
            />
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="Email"
              className="w-full border border-muted rounded px-3 py-2 bg-background text-neutral"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-muted text-neutral py-2 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="flex-1 bg-accent text-dark py-2 rounded font-medium disabled:opacity-60"
              >
                {createLoading ? 'Guardando…' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
