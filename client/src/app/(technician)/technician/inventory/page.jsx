'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Wrench,
  Search,
  Filter
} from 'lucide-react';

export default function TechnicianInventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Plumbing',
    partCode: '',
    quantity: 10,
    reservedQuantity: 0,
    unit: 'pcs',
    unitCost: 15,
    lowStockThreshold: 5,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, invRes] = await Promise.all([
        apiClient('/technicians/me/profile'),
        apiClient('/technicians/me/inventory'),
      ]);

      if (profileRes.success) setProfile(profileRes.data?.profile);
      if (invRes.success) setItems(invRes.data?.items || []);
    } catch (err) {
      setMessage({ text: err.message || 'Failed to fetch inventory', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: profile?.serviceCategories?.includes('hvac') ? 'HVAC' : 'Plumbing',
      partCode: '',
      quantity: 10,
      reservedQuantity: 0,
      unit: 'pcs',
      unitCost: 15,
      lowStockThreshold: 5,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      partCode: item.partCode,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity || 0,
      unit: item.unit || 'pcs',
      unitCost: item.unitCost || 0,
      lowStockThreshold: item.lowStockThreshold || 5,
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      if (editingItem) {
        // Update
        const res = await apiClient(`/technicians/me/inventory/${editingItem._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formData.name,
            category: formData.category,
            quantity: Number(formData.quantity),
            unit: formData.unit,
            unitCost: Number(formData.unitCost),
            lowStockThreshold: Number(formData.lowStockThreshold),
          }),
        });

        if (res.success) {
          setMessage({ text: 'Inventory item updated successfully!', type: 'success' });
          setIsModalOpen(false);
          fetchData();
        }
      } else {
        // Create
        const res = await apiClient('/technicians/me/inventory', {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            quantity: Number(formData.quantity),
            reservedQuantity: Number(formData.reservedQuantity),
            unitCost: Number(formData.unitCost),
            lowStockThreshold: Number(formData.lowStockThreshold),
          }),
        });

        if (res.success) {
          setMessage({ text: 'Item added to inventory!', type: 'success' });
          setIsModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      setMessage({ text: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to remove this item from your inventory?')) return;
    try {
      const res = await apiClient(`/technicians/me/inventory/${id}`, { method: 'DELETE' });
      if (res.success) {
        setMessage({ text: 'Item removed from inventory', type: 'success' });
        fetchData();
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to delete item', type: 'error' });
    }
  };

  const isDeliveryOnly =
    profile?.serviceCategories?.length === 1 && profile?.serviceCategories[0] === 'delivery';

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.partCode.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCat === 'ALL' || item.category === filterCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Spare-Parts & Equipment Inventory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
              {items.length} Tracked Items
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dispatch eligibility requires sufficient unreserved stock for job category requirements
          </p>
        </div>

        {!isDeliveryOnly && (
          <button
            onClick={openAddModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Item</span>
          </button>
        )}
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Delivery Partners Equipment Card */}
      {isDeliveryOnly ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Urgent Delivery Fleet Equipment</h2>
          <p className="text-sm text-slate-600 max-w-xl">
            As an Urgent Delivery partner, your dispatch eligibility is evaluated by vehicle type and payload capacity rather than spare-parts stock.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-400 font-bold uppercase">Registered Vehicle</div>
              <div className="text-lg font-black text-slate-800 capitalize mt-1">{profile?.vehicleType || 'None'}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-400 font-bold uppercase">Payload Capacity</div>
              <div className="text-lg font-black text-emerald-600 mt-1">{profile?.packageCapacityKg || 0} kg</div>
            </div>
          </div>
          <Link
            href="/technician/profile"
            className="inline-block text-xs font-semibold text-blue-600 hover:underline pt-2"
          >
            Update vehicle details in profile &rarr;
          </Link>
        </div>
      ) : (
        <>
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search part code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-10 text-center text-slate-500 space-y-3">
                <Package className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <p className="text-sm font-medium">No inventory items found matching your filters.</p>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Add Your First Part
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Part / Equipment</th>
                      <th className="py-3 px-4">Part Code</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Total Stock</th>
                      <th className="py-3 px-4 text-center">Reserved</th>
                      <th className="py-3 px-4 text-center">Available</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const availableQty = item.quantity - (item.reservedQuantity || 0);
                      const isLowStock = availableQty <= item.lowStockThreshold;

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {item.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {item.partCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-center text-amber-600 font-semibold">
                            {item.reservedQuantity || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-emerald-600">
                            {availableQty}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                            ${item.unitCost?.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isLowStock ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Low Stock</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>In Stock</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                              title="Edit item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="Delete item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">
              {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Item / Part Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Copper Pipe Fitting 1/2-inch"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Part Code
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={formData.partCode}
                    onChange={(e) => setFormData({ ...formData, partCode: e.target.value })}
                    placeholder="PIPE_COPPER_12"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 uppercase disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Urgent Delivery">Urgent Delivery</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
                >
                  {editingItem ? 'Update Stock' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
