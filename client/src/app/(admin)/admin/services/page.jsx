'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { 
  Wrench, 
  Plus, 
  Edit2, 
  Power, 
  Clock, 
  DollarSign, 
  Tag, 
  ShieldCheck, 
  Truck, 
  Flame,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function AdminServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    category: 'plumbing',
    name: '',
    code: '',
    description: '',
    pricingType: 'fixed',
    basePrice: 85,
    minPrice: 85,
    maxPrice: 150,
    estimatedDurationMin: 60,
    requiredSkillsText: '',
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/admin/services');
      if (res.success && res.data) {
        setServices(res.data.services || []);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to fetch services', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setFormData({
      category: 'plumbing',
      name: '',
      code: '',
      description: '',
      pricingType: 'fixed',
      basePrice: 95,
      minPrice: 95,
      maxPrice: 180,
      estimatedDurationMin: 60,
      requiredSkillsText: 'pipe_repair, leak_detection',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (s) => {
    setEditingService(s);
    setFormData({
      category: s.category,
      name: s.name,
      code: s.code,
      description: s.description,
      pricingType: s.pricingType,
      basePrice: s.basePrice || 0,
      minPrice: s.minPrice || 0,
      maxPrice: s.maxPrice || 0,
      estimatedDurationMin: s.estimatedDurationMin || 60,
      requiredSkillsText: (s.requirements?.requiredSkills || []).join(', '),
    });
    setIsModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      const requiredSkills = formData.requiredSkillsText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

      const payload = {
        category: formData.category,
        name: formData.name,
        code: formData.code.toUpperCase(),
        description: formData.description,
        pricingType: formData.pricingType,
        basePrice: Number(formData.basePrice),
        minPrice: Number(formData.minPrice),
        maxPrice: Number(formData.maxPrice),
        estimatedDurationMin: Number(formData.estimatedDurationMin),
        requirements: {
          requiredSkills,
        },
      };

      if (editingService) {
        const res = await apiClient(`/admin/services/${editingService._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (res.success) {
          setMessage({ text: 'Service updated successfully!', type: 'success' });
          setIsModalOpen(false);
          fetchServices();
        }
      } else {
        const res = await apiClient('/admin/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res.success) {
          setMessage({ text: 'New service created successfully!', type: 'success' });
          setIsModalOpen(false);
          fetchServices();
        }
      }
    } catch (err) {
      setMessage({ text: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const res = await apiClient(`/admin/services/${id}`, { method: 'DELETE' });
      if (res.success) {
        setMessage({ text: res.message, type: 'success' });
        fetchServices();
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to toggle status', type: 'error' });
    }
  };

  const filteredServices = services.filter(
    (s) => categoryFilter === 'ALL' || s.category === categoryFilter.toLowerCase()
  );

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Service Catalogue Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
              Admin Console
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure offered service verticals, base rates, required qualifications, and duration
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
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

      {/* Category Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        {['ALL', 'Plumbing', 'HVAC', 'Delivery'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              categoryFilter === cat
                ? 'bg-purple-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading catalogue...</div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No services found in this category.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Pricing Model</th>
                  <th className="py-3 px-4">Base Rate</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-center">Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="font-mono text-xs text-slate-400">{s.code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 capitalize">
                      {s.pricingType}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {s.pricingType === 'fixed' && `$${s.basePrice?.toFixed(2)}`}
                      {s.pricingType === 'range' && `$${s.minPrice} - $${s.maxPrice}`}
                      {s.pricingType === 'quotation' && 'Quotation'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {s.estimatedDurationMin} mins
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(s._id)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition ${
                          s.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="Edit service"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">
              {editingService ? 'Edit Catalogue Service' : 'Add New Service'}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="plumbing">Plumbing</option>
                    <option value="hvac">HVAC</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unique Code
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingService}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="PLUMB_DRAIN_UNCLOG"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Emergency Pipe Leak Repair"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pricing Type
                  </label>
                  <select
                    value={formData.pricingType}
                    onChange={(e) => setFormData({ ...formData, pricingType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="range">Range</option>
                    <option value="quotation">Quotation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Base Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Est. Duration (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={formData.estimatedDurationMin}
                    onChange={(e) => setFormData({ ...formData, estimatedDurationMin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Required Skills (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.requiredSkillsText}
                  onChange={(e) => setFormData({ ...formData, requiredSkillsText: e.target.value })}
                  placeholder="pipe_repair, copper_soldering"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow"
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
