'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  User, 
  MapPin, 
  Truck, 
  Wrench,
  Eye,
  Check,
  X
} from 'lucide-react';

export default function AdminTechniciansPage() {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending'); // default to pending queue
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Review Modal State
  const [selectedTech, setSelectedTech] = useState(null);
  const [techDetails, setTechDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'ALL') queryParams.append('category', categoryFilter.toLowerCase());
      if (search) queryParams.append('search', search);

      const res = await apiClient(`/admin/technicians?${queryParams.toString()}`);
      if (res.success && res.data) {
        setTechnicians(res.data.technicians || []);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to fetch technicians', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [statusFilter, categoryFilter]);

  const handleOpenReview = async (tech) => {
    setSelectedTech(tech);
    setRejectionReason('');
    setDetailsLoading(true);
    try {
      const res = await apiClient(`/admin/technicians/${tech._id}`);
      if (res.success) {
        setTechDetails(res.data);
      }
    } catch (err) {
      alert('Failed to load technician details: ' + err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleVerifyAction = async (action) => {
    if (action === 'rejected' && !rejectionReason.trim()) {
      alert('Please specify a rejection reason for the technician.');
      return;
    }

    setActionSubmitting(true);
    try {
      const res = await apiClient(`/admin/technicians/${selectedTech._id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({
          action,
          rejectionReason: action === 'rejected' ? rejectionReason : undefined,
        }),
      });

      if (res.success) {
        setMessage({
          text: `Technician ${selectedTech.user?.name} has been ${action}!`,
          type: 'success',
        });
        setSelectedTech(null);
        setTechDetails(null);
        fetchTechnicians();
      }
    } catch (err) {
      alert('Verification action failed: ' + err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDownloadDoc = async (docId, fileName) => {
    try {
      const token = localStorage.getItem('dispatchly_access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/technicians/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download document');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Technician Verification & Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
              Admin Console
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Review applicant qualifications, verify ID and licensing documents, and approve for dispatch eligibility
          </p>
        </div>
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

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'pending', label: 'Pending Approval' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'ALL', label: 'All Technicians' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="plumbing">Plumbing</option>
            <option value="hvac">HVAC</option>
            <option value="delivery">Delivery</option>
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchTechnicians();
            }}
            className="relative"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name/email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 w-48"
            />
          </form>
        </div>
      </div>

      {/* Technicians List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading technician records...</div>
        ) : technicians.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <User className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">No technicians found in this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Categories</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Coverage Radius</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Available</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technicians.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{t.user?.name}</div>
                      <div className="text-xs text-slate-400">{t.user?.email} &bull; {t.user?.phone || 'No phone'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {t.serviceCategories?.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {t.experienceYears} years
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {t.serviceArea?.radiusKm || 25} km
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          t.verificationStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.verificationStatus === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`w-2.5 h-2.5 rounded-full inline-block ${
                          t.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={t.isAvailable ? 'Online' : 'Offline'}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenReview(t)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition border border-purple-200"
                      >
                        Review Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Verification Modal */}
      {selectedTech && (() => {
        const currentTech = techDetails?.profile || selectedTech;
        const docs = techDetails?.documents || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Technician Verification Review
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Applicant: <span className="font-bold text-slate-800">{currentTech.user?.name || selectedTech.user?.name || 'Technician Applicant'}</span> ({currentTech.user?.email || selectedTech.user?.email || 'Registered Account'})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTech(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailsLoading ? (
                <div className="py-8 text-center text-slate-500 text-sm">Loading complete dossier...</div>
              ) : (
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                  {/* Status overview */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block">Experience</span>
                      <span className="font-bold text-slate-800 text-sm">{currentTech.experienceYears ?? selectedTech.experienceYears ?? 1} Years</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Coverage Area</span>
                      <span className="font-bold text-slate-800 text-sm">{currentTech.serviceArea?.radiusKm || selectedTech.serviceArea?.radiusKm || 25} km radius</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Vehicle Payload</span>
                      <span className="font-bold text-slate-800 text-sm capitalize">
                        {currentTech.vehicleType || selectedTech.vehicleType || 'none'} ({currentTech.packageCapacityKg || selectedTech.packageCapacityKg || 0} kg)
                      </span>
                    </div>
                  </div>

                  {/* Skills & Qualifications */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Skills & Qualifications
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentTech.skills || selectedTech.skills || []).length > 0 ? (
                        (currentTech.skills || selectedTech.skills).map((s) => (
                          <span key={s} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No specific skills tags entered</span>
                      )}
                    </div>
                    {(currentTech.qualifications || selectedTech.qualifications || []).length > 0 && (
                      <div className="text-xs text-slate-600 pt-1">
                        <span className="font-semibold">Certifications:</span> {(currentTech.qualifications || selectedTech.qualifications).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Uploaded Documents */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Uploaded Verification Documents ({docs.length})
                    </h4>
                    {docs.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                        No verification documents uploaded yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {docs.map((d) => (
                          <div
                            key={d._id}
                            className="p-3 rounded-xl border border-slate-200 flex items-center justify-between bg-white text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-purple-600" />
                              <div>
                                <span className="font-semibold text-slate-800 block">{d.originalName}</span>
                                <span className="text-slate-400 capitalize">{d.docType?.replace('_', ' ')}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadDoc(d._id, d.originalName)}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center space-x-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Download / Inspect</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rejection reason input */}
                  <div className="space-y-1 pt-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Rejection Feedback (Required only if rejecting)
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Master plumber license image is expired; please re-upload current year renewal."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTech(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Close
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={actionSubmitting}
                    onClick={() => handleVerifyAction('rejected')}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Application</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionSubmitting}
                    onClick={() => handleVerifyAction('approved')}
                    className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Technician</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
