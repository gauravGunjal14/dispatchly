'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { 
  DollarSign, 
  RotateCcw, 
  Search, 
  Filter, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Receipt,
  Download
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [refundLoading, setRefundLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await apiClient(`/admin/payments/ledger?${params.toString()}`);
      if (res.success && res.data) {
        setPayments(res.data.payments || []);
        setSummary(res.data.summary || {});
        setPagination(res.data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to load payments ledger', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [page, statusFilter]);

  const handleRefund = async (payment) => {
    if (!payment.booking?._id) return;
    const reason = prompt(`Refund reason for ticket ${payment.booking.ticketNumber || payment.booking._id}:`, 'Customer satisfaction / disputed service');
    if (reason === null) return;

    setRefundLoading(true);
    try {
      const res = await apiClient(`/admin/bookings/${payment.booking._id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      if (res.success) {
        setMessage({ text: `Payment of $${payment.amount} refunded successfully.`, type: 'success' });
        await fetchLedger();
      }
    } catch (err) {
      alert(`Refund failed: ${err.message}`);
    } finally {
      setRefundLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem('dispatchly_access_token');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/reports/payments`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `payments_ledger_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message || 'Failed to export CSV');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Payments & Fees Ledger</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Financial Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time ledger of customer charges, platform ticket fees, technician payouts, and refund states.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Ledger CSV</span>
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

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Volume</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ${(summary.totalVolume || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Total customer job charges</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Fees Collected</div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            ${(summary.platformFeesCollected || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">$1.50 per completed ticket</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settled Payments</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {summary.capturedCount || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Captured & authorized</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Refunds Issued</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {summary.refundedCount || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Cancelled / disputed</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-2 overflow-x-auto">
        {['ALL', 'captured', 'authorized', 'pending', 'refunded'].map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition whitespace-nowrap ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st === 'ALL' ? 'All Transactions' : st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading payments ledger...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No payment transactions recorded in this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {p.booking?.ticketNumber || p.booking?._id?.slice(-8) || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.customer?.name}</div>
                      <div className="text-[11px] text-slate-400">{p.customer?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {p.technician?.user?.name || 'Technician'}
                      </div>
                      <div className="text-[11px] text-slate-400">{p.technician?.user?.email}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      ${p.amount?.toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          p.status === 'captured'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'refunded'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'captured' ? (
                        <button
                          onClick={() => handleRefund(p)}
                          disabled={refundLoading}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition border border-red-200"
                        >
                          Refund Ticket
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.pages} ({pagination.total} records)
            </span>
            <div className="space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
