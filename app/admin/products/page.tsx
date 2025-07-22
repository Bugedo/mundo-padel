'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<File | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch('/api/products', { cache: 'no-store' });
    const data = await res.json();

    if (res.ok) {
      setProducts(data);
      setFilteredProducts(data);
    } else {
      setError(data.error || 'Failed to load products');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategory('');
    setImage(null);
    setSelectedProduct(null);
    setFormMode('create');
    setFormVisible(false);
  };

  const openFormForCreate = () => {
    resetForm();
    setFormMode('create');
    setFormVisible(true);
  };

  const openFormForEdit = (product: Product) => {
    setFormMode('edit');
    setSelectedProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(product.price.toString());
    setCategory(product.category);
    setImage(null); // Optional new image
    setFormVisible(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', category);
    if (image) formData.append('image', image);

    const url = formMode === 'create' ? '/api/products' : `/api/products/${selectedProduct?.id}`;
    const method = formMode === 'create' ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      alert(formMode === 'create' ? '✅ Product created!' : '✅ Product updated!');
      resetForm();
      fetchProducts();
    } else {
      alert(data.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      alert('🗑 Product deleted');
      fetchProducts();
    } else {
      alert(data.error || 'Failed to delete product');
    }
  };

  const handleSearchAndFilter = () => {
    const filtered = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory ? product.category === filterCategory : true;

      return matchesSearch && matchesCategory;
    });

    setFilteredProducts(filtered);
  };

  useEffect(() => {
    handleSearchAndFilter();
  }, [searchTerm, filterCategory, products]);

  if (loading) return <div>Loading products...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const uniqueCategories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Products</h1>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by ID, name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/3"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/4"
        >
          <option value="">All Categories</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          onClick={openFormForCreate}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Create Product
        </button>
      </div>

      {/* Inline Form */}
      {formVisible && (
        <div className="border rounded p-4 bg-gray-50 shadow space-y-4">
          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold">
              {formMode === 'create' ? 'Create Product' : 'Edit Product'}
            </h2>
            <div>
              <label className="block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
            </div>
            <div>
              <label className="block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border p-2 w-full rounded"
              />
            </div>
            <div>
              <label className="block">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
            </div>
            <div>
              <label className="block">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
            </div>
            <div>
              <label className="block">
                Image {formMode === 'edit' && '(leave empty to keep current)'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="border p-2 w-full rounded"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                {formMode === 'create' ? 'Create' : 'Update'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="border rounded p-4 shadow bg-white flex flex-col">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-cover rounded mb-2"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-500">
                No image
              </div>
            )}

            <h3 className="text-lg font-bold">{product.name}</h3>
            <p className="text-gray-700 mb-1">${product.price.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mb-2">{product.category}</p>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => openFormForEdit(product)}
                className="bg-yellow-500 text-white px-2 py-1 rounded w-full"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="bg-red-600 text-white px-2 py-1 rounded w-full"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
