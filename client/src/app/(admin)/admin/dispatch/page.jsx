'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  Compass,
  Radio,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  UserCheck,
  MapPin,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  X,
  Sliders,
  RefreshCw,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export default function AdminDispatchMonitorPage() {
  const [activeTab, setActiveTab] = useState('monitor'); // 'monitor' | 'reassignments'
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    searching: 0,
    offered: 0,
    assigned: 0,
    inTransit: 0,
    failed: 0,
    pendingReassignments: 0,
  });
  const [reassignments, setReassignments] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [loadingDiagnostic, setLoadingDiagnostic] = useState(false);
  const [overrideModalBooking, setOverrideModalBooking] = useState(null);
  const [approvedTechnicians, setApprovedTechnicians] = useState([]);
  const [selectedTechForOverride, setSelectedTechForOverride] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [monitorRes, reassignRes, techRes] = await Promise.all([
        apiClient('/admin/dispatch/monitor'),
        apiClient('/admin/reassignments?status=pending'),
        apiClient('/admin/technicians?status=approved'),
      ]);

      if (monitorRes.success) {
        setBookings(monitorRes.data.bookings || []);
        if (monitorRes.data.stats) setStats(monitorRes.data.stats);
      }
      if (reassignRes.success) {
        setReassignments(reassignRes.data.requests || []);
      }
      if (techRes.success) {
        setApprovedTechnicians(techRes.data.technicians || []);
      }
    } catch (err) {
      console.error('Failed to load dispatch monitor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (socket) {
      socket.emit('join:admin');

      const handleUpdate = () => {
        fetchData();
      };

      socket.on('dispatch:update', handleUpdate);
      socket.on('dispatch:assigned', handleUpdate);
      socket.on('dispatch:offer_created', handleUpdate);
      socket.on('dispatch:reassignment_requested', handleUpdate);

      return () => {
        socket.off('dispatch:update', handleUpdate);
        socket.off('dispatch:assigned', handleUpdate);
        socket.off('dispatch:offer_created', handleUpdate);
        socket.off('dispatch:reassignment_requested', handleUpdate);
      };
    }
  }, []);

  const openDiagnostic = async (bookingId) => {
    setSelectedBookingId(bookingId);
    setLoadingDiagnostic(true);
    try {
      const res = await apiClient(`/admin/dispatch/${bookingId}`);
      if (res.success) {
        setDiagnosticData(res.data);
      }
    } catch (err) {
      console.error('Failed to load booking dispatch diagnostic:', err);
    } finally {
      setLoadingDiagnostic(false);
    }
  };

  const handleManualOverride = async () => {
    if (!overrideModalBooking || !selectedTechForOverride) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await apiClient(`/admin/dispatch/${overrideModalBooking._id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          technicianId: selectedTechForOverride,
          adminNote: overrideNote,
        }),
      });
      if (res.success) {
        setOverrideModalBooking(null);
        setSelectedTechForOverride('');
        setOverrideNote('');
        fetchData();
        if (selectedBookingId === overrideModalBooking._id) {
          openDiagnostic(overrideModalBooking._id);
        }
      }
    } catch (err) {
      setActionError(err.message || 'Failed to override assignment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryDispatch = async (bookingId, clearExclusions = false) => {
    setActionLoading(true);
    try {
      await apiClient(`/admin/dispatch/${bookingId}/retry`, {
        method: 'POST',
        body: JSON.stringify({ clearExclusions }),
      });
      fetchData();
      if (selectedBookingId === bookingId) {
        openDiagnostic(bookingId);
      }
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecideReassignment = async (requestId, decision) => {
    setActionLoading(true);
    try {
      await apiClient(`/admin/reassignments/${requestId}/decide`, {
        method: 'PUT',
        body: JSON.stringify({
          decision,
          decisionNote: `Dispatcher ${decision} reassignment request`,
        }),
      });
      fetchData();
    } catch (err) {
      alert(`Decision error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterCategory !== 'all' && b.category !== filterCategory) return false;
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Intelligent Dispatch Engine</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Real-time multi-criteria scoring, candidate ranking, SLA deadlines & sequential job offers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchData()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('monitor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'monitor' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Dispatches
            </button>
            <button
              onClick={() => setActiveTab('reassignments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'reassignments' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Reassignments</span>
              {stats.pendingReassignments > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-extrabold">
                  {stats.pendingReassignments}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Active</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalActive}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tickets in engine</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Searching</span>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.searching}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Candidate filtering</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">Offered</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{stats.offered}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Countdown pending</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Assigned</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.assigned}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Accepted & locked</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">In Transit</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats.inTransit}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">En route / Arrived</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">Exhausted / Need Help</div>
          <div className="text-2xl font-black text-red-600 mt-1">{stats.failed}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Manual intervention</div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'monitor' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Filters:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">All Categories</option>
                <option value="plumbing">Plumbing</option>
                <option value="hvac">HVAC</option>
                <option value="delivery">Urgent Delivery</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="searching">Searching</option>
                <option value="offered">Offered</option>
                <option value="assigned">Assigned</option>
                <option value="en_route">En Route</option>
                <option value="in_progress">In Progress</option>
                <option value="failed">Failed / Exhausted</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-800">{filteredBookings.length}</span> active tickets
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading live dispatch data...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No active dispatches matching filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Vertical</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Dispatch Status</th>
                    <th className="py-3 px-4">Target / Assigned Tech</th>
                    <th className="py-3 px-4">SLA Deadline</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => {
                    const isUrgent = b.priority === 'urgent';
                    const isSearching = b.status === 'searching';
                    const isOffered = b.status === 'offered';
                    const isAssigned = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(b.status);
                    const isFailed = b.status === 'failed';

                    return (
                      <tr key={b._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {b.ticketNumber || b._id.slice(-6)}
                        </td>
                        <td className="py-3.5 px-4 capitalize font-semibold">{b.category}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isUrgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{b.customer?.name || 'Customer'}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {b.location?.address || 'San Francisco'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5">
                            {isSearching && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-1" />
                                Searching (Attempt #{b.dispatch?.attempts || 0})
                              </span>
                            )}
                            {isOffered && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Offered (Attempt #{b.dispatch?.attempts || 1})
                              </span>
                            )}
                            {isAssigned && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 capitalize">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {b.status.replace('_', ' ')}
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Exhausted ({b.dispatch?.attempts} attempts)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {b.assignedTechnician ? (
                            <div>
                              <div className="font-semibold text-slate-900">{b.assignedTechnician?.user?.name || 'Technician Assigned'}</div>
                              <div className="text-[11px] text-slate-400">
                                {b.dispatch?.state === 'manual' ? '(Manual Override)' : 'Reliability 95%'}
                              </div>
                            </div>
                          ) : b.dispatch?.currentOffer?.technician ? (
                            <div>
                              <div className="font-semibold text-blue-700">
                                Offered to: {b.dispatch.currentOffer.technician.user?.name || 'Candidate'}
                              </div>
                              <div className="text-[11px] text-blue-500">
                                Score: {b.dispatch.currentOffer.totalScore} &bull; ETA: {b.dispatch.currentOffer.etaMinutes} min
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Evaluating pool...</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {b.sla?.arrivalDeadline ? (
                            <span
                              className={
                                new Date(b.sla.arrivalDeadline) < new Date() ? 'text-red-600 font-bold' : 'text-slate-600'
                              }
                            >
                              {new Date(b.sla.arrivalDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openDiagnostic(b._id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-purple-100 hover:text-purple-700 transition flex items-center space-x-1"
                              title="Inspect Candidate Ranking Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>

                            <button
                              onClick={() => setOverrideModalBooking(b)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-amber-100 hover:text-amber-800 transition"
                              title="Manual Assignment Override"
                            >
                              Override
                            </button>

                            {isFailed && (
                              <button
                                onClick={() => handleRetryDispatch(b._id, true)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition flex items-center space-x-1"
                                title="Reset Exclusions & Retry Engine"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Retry</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reassignments Queue Tab */}
      {activeTab === 'reassignments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Pending Technician Reassignment Requests</h2>
            <span className="text-xs text-slate-500">
              When travel or service has already started, technician cancellations require dispatcher sign-off.
            </span>
          </div>

          {reassignments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No pending reassignment requests.</div>
          ) : (
            <div className="space-y-3">
              {reassignments.map((req) => (
                <div
                  key={req._id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{req.technician?.user?.name || 'Technician'}</span>
                      <span className="text-xs text-slate-500 font-mono">
                        Ticket: {req.booking?.ticketNumber || req.booking?._id}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900">
                      <span className="font-semibold">Reason:</span> {req.reason}
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Requested {new Date(req.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleDecideReassignment(req._id, 'approved')}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                    >
                      Approve & Re-dispatch
                    </button>
                    <button
                      onClick={() => handleDecideReassignment(req._id, 'denied')}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                    >
                      Deny Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidate Breakdown & Diagnostic Drawer / Modal */}
      {selectedBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Dispatch Diagnostic & Candidate Ranking</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ticket #{diagnosticData?.booking?.ticketNumber} &bull; Category: {diagnosticData?.booking?.category} &bull; Priority: {diagnosticData?.booking?.priority}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedBookingId(null);
                  setDiagnosticData(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDiagnostic ? (
              <div className="p-12 text-center text-slate-400">Running diagnostic analysis...</div>
            ) : !diagnosticData ? (
              <div className="p-8 text-center text-red-500">Failed to load diagnostic details.</div>
            ) : (
              <div className="space-y-6">
                {/* Weights Bar */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 mb-2">Active Configurable Scoring Weights:</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    {Object.entries(diagnosticData.settings?.weights || {}).map(([key, wt]) => (
                      <div key={key} className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400">{key}</div>
                        <div className="text-sm font-black text-purple-700">{wt}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ranked Eligible Candidates */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Eligible Ranked Candidates ({diagnosticData.rankedEligibleCandidates?.length || 0})</span>
                  </h4>

                  {diagnosticData.rankedEligibleCandidates?.length === 0 ? (
                    <div className="p-4 bg-amber-50 rounded-xl text-amber-800 text-xs">
                      No eligible candidates currently satisfy all hard rules for this booking.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {diagnosticData.rankedEligibleCandidates?.map((cand) => (
                        <div
                          key={cand.technician._id}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-300 transition space-y-3"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center">
                                #{cand.rank}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 text-sm">{cand.technician.name}</span>
                                <span className="text-xs text-slate-500 ml-2">
                                  {cand.distanceKm} km away &bull; ETA {cand.etaMinutes} min
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-lg font-black text-purple-700">{cand.totalScore}</span>
                              <span className="text-xs text-slate-400"> / 100</span>
                            </div>
                          </div>

                          {/* Score breakdown mini-bars */}
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-[10px]">
                            {cand.scoreBreakdown &&
                              Object.entries(cand.scoreBreakdown).map(([factor, val]) => (
                                <div key={factor}>
                                  <div className="flex justify-between text-slate-500 capitalize">
                                    <span>{factor}</span>
                                    <span className="font-bold">{val}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                                    <div
                                      className="bg-purple-600 h-full rounded-full"
                                      style={{ width: `${val}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rejected Candidates & Hard Rule Disqualifications */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Disqualified Candidates ({diagnosticData.rejectedCandidates?.length || 0})</span>
                  </h4>

                  {diagnosticData.rejectedCandidates?.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-xs">
                      No technicians disqualified by hard rules.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                      {diagnosticData.rejectedCandidates?.map((rej, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-center bg-white hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-800">{rej.technician?.name || 'Technician'}</span>
                            <span className="text-slate-400 text-[11px] ml-2">({rej.technician?.email})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-100 text-red-800 font-bold">
                              {rej.code}
                            </span>
                            <span className="text-red-600 text-xs">{rej.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dispatch Timeline History */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-2">Sequential Offer Audit History</h4>
                  <div className="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs">
                    {diagnosticData.dispatchHistory?.length === 0 ? (
                      <div className="text-slate-400 text-xs">No dispatch history events yet.</div>
                    ) : (
                      diagnosticData.dispatchHistory.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200/50 last:border-0">
                          <div>
                            <span className="font-bold uppercase text-purple-700 text-[11px] mr-2">
                              {item.event}
                            </span>
                            {item.meta?.reason && (
                              <span className="text-slate-600 italic">({item.meta.reason})</span>
                            )}
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(item.at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Override Assignment Modal */}
      {overrideModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Manual Assignment Override</h3>
              <button
                onClick={() => setOverrideModalBooking(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Assign Ticket <span className="font-bold text-slate-800">{overrideModalBooking.ticketNumber}</span> directly to an approved technician, bypassing the automated sequential offer queue. An audit log entry will be permanently recorded.
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Approved Technician:
                </label>
                <select
                  value={selectedTechForOverride}
                  onChange={(e) => setSelectedTechForOverride(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">-- Choose Technician --</option>
                  {approvedTechnicians.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.user?.name || 'Technician'} ({t.serviceCategories?.join(', ')}) &bull; Rating: {t.rating?.toFixed(1)} ★
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dispatcher Note / Reason for Override:
                </label>
                <textarea
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="e.g. Customer requested specific technician, emergency on-call override, etc."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setOverrideModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleManualOverride}
                disabled={!selectedTechForOverride || actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? 'Assigning...' : 'Confirm Manual Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
