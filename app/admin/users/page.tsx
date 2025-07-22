'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
}

interface Order {
  id: string;
  total_price: number;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      image_url: string;
    };
  }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, Order[]>>({});
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchOrders = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}/orders`, { cache: 'no-store' });
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      setOrders((prev) => ({ ...prev, [userId]: data }));
    } else {
      alert(data.error || 'Failed to load orders');
    }
  };

  const handleToggleOrders = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      if (!orders[userId]) fetchOrders(userId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      alert('🗑 User deleted');
      fetchUsers();
    } else {
      const data = await res.json();
      alert(`❌ Error: ${data.error}`);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = users.filter((user) => user.email.toLowerCase().includes(term.toLowerCase()));
    setFilteredUsers(filtered);
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/3"
        />
      </div>

      <table className="w-full border border-gray-300 rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Full Name</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Role</th>
            <th className="p-2 text-left">Created At</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <>
              <tr key={user.id} className="border-t">
                <td className="p-2">{user.full_name || '—'}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">{user.role}</td>
                <td className="p-2">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="p-2 flex gap-2">
                  <button
                    onClick={() => handleToggleOrders(user.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    {expandedUserId === user.id ? 'Hide Orders' : 'View Orders'}
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
              {/* Expanded orders row */}
              {expandedUserId === user.id && (
                <tr>
                  <td colSpan={5} className="p-4 bg-gray-50">
                    {orders[user.id] ? (
                      orders[user.id].length === 0 ? (
                        <p className="text-gray-500">No orders found for this user.</p>
                      ) : (
                        <div className="space-y-3">
                          {orders[user.id].map((order) => (
                            <div key={order.id} className="border rounded p-3 shadow-sm">
                              <h3 className="font-semibold">Order ID: {order.id}</h3>
                              <p>Status: {order.status}</p>
                              <p>Total: ${order.total_price.toFixed(2)}</p>
                              <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                              <div className="mt-2">
                                <h4 className="font-medium">Items:</h4>
                                <ul className="list-disc pl-5">
                                  {order.order_items.map((item) => (
                                    <li key={item.id}>
                                      {item.product.name} x{item.quantity} - $
                                      {item.price.toFixed(2)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <p>Loading orders...</p>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
