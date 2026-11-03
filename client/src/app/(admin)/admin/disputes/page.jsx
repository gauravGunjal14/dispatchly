'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  User,
  Wrench,
  DollarSign,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolution, setResolution] = useState('proceed');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await apiClient(`/admin/disputes?status=${statusFilter}`);
      if (res.success && res.data) {
        setDisputes(res.data.disputes || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter]);

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedDispute) return;
    try {
      setResolving(true);
      await apiClient(`/admin/disputes/${selectedDispute._id}/resolve`, {
        method: 'PUT',
        body: { resolution, adminNotes },
      });
      setSelectedDispute(null);
      setAdminNotes('');
      await fetchDisputes();
    } catch (err) {
      alert(err.message || 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/admin/dispatch"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dispatch Console
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <span>Dispute & Mediation Resolution Console</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer complaints, inspect evidence, release payment holds, or issue full refunds.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm text-xs">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'open'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Open Disputes
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === ''
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Loading disputes...
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <p>No disputes found in this view. All service tickets in good standing!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {disputes.map((d) => {
              const b = d.booking || {};
              const isOpen = d.status === 'open';
              return (
                <div key={d._id} className="p-5 hover:bg-slate-50/50 transition space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black text-slate-900">
                        {b.ticketNumber || `#${b._id?.toString().slice(-6) || 'JOB'}`}
                      </span>
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {b.category || 'Service'}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isOpen
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Filed: {new Date(d.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-rose-700">Customer Complaint:</span>
                      <p className="text-slate-800 font-medium">{d.reason}</p>
                      <div className="text-[11px] text-slate-500 pt-1">
                        Raised by: <span className="font-semibold text-slate-700">{d.raisedBy?.name}</span> ({d.raisedBy?.email})
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Service Info:</span>
                      <div className="text-slate-800 font-semibold">{b.description}</div>
                      <div className="text-[11px] text-slate-500">
                        Assigned Tech: <span className="font-semibold text-slate-700">{b.assignedTechnician?.user?.name || 'Assigned'}</span>
                      </div>
                      {d.resolution && d.resolution !== 'none' && (
                        <div className="text-[11px] text-emerald-700 font-bold pt-1">
                          Resolution: {d.resolution.toUpperCase()} &bull; Notes: {d.adminNotes || 'None'}
                        </div>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setSelectedDispute(d)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1"
                      >
                        <span>Mediate & Resolve Dispute</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-slate-900">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="text-lg font-bold">Resolve Dispute #{selectedDispute._id.slice(-6)}</h3>
            </div>
            <p className="text-xs text-slate-500">
              Select an authoritative resolution. Releasing hold will mark the job verified and permit technician payout.
              Refunding will debit the gateway transaction and return funds to customer.
            </p>

            <form onSubmit={handleResolve} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Resolution Decision:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('proceed')}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      resolution === 'proceed'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Release Hold (Proceed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('refund')}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      resolution === 'refund'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Issue Refund to Customer
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Administrative Mediation Notes:</label>
                <textarea
                  required
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="State justification for resolution decision..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving || !adminNotes.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow disabled:opacity-50"
                >
                  {resolving ? 'Applying Decision...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
