'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { 
  DollarSign, 
  ArrowLeft, 
  TrendingUp, 
  CreditCard, 
  Receipt, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function TechnicianEarningsPage() {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const fetchEarnings = async (targetPage = 1) => {
    try {
      setLoading(true);
      const res = await apiClient(`/technicians/me/earnings?page=${targetPage}&limit=10`);
      if (res.success && res.data) {
        setEarningsData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings(page);
  }, [page]);

  const summary = earningsData?.summary || { totalEarnings: 0, totalFeesDeducted: 0, paidJobsCount: 0 };
  const payouts = earningsData?.payouts || [];
  const pagination = earningsData?.pagination || { total: 0, page: 1, pages: 1 };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/technician/dashboard"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Earnings & Settlement Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent breakdown of gross booking revenue, platform fee deductions, and net payouts.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Net Total Earnings</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            ${summary.totalEarnings.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400">Available & credited balance</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Fees Deducted</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${summary.totalFeesDeducted.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400">Fixed $1.50 per verified ticket</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Paid Service Jobs</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">
            {summary.paidJobsCount}
          </div>
          <p className="text-[11px] text-slate-400">Successfully settled tickets</p>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-900">Payout History & Transferred Settlements</h2>
          <span className="text-xs font-bold text-slate-400">{pagination.total} records</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Loading payouts...
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p>No payouts recorded yet. Complete and verify bookings to receive automated payouts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4 text-right">Platform Fee</th>
                  <th className="py-3 px-4 text-right">Net Payout</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((p) => {
                  const gross = (p.amount || 0) + (p.feeDeducted || 0);
                  const ticketNum = p.booking?.ticketNumber || `#${p.booking?._id?.toString().slice(-6) || 'JOB'}`;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(p.paidAt || p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {ticketNum}
                      </td>
                      <td className="py-3 px-4 capitalize font-semibold text-slate-700">
                        {p.booking?.category || 'Service'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-600">
                        ${gross.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600">
                        -${(p.feeDeducted || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700">
                        ${(p.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border text-slate-700 disabled:opacity-40 flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-slate-500 font-bold">
              Page {page} of {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              className="px-3 py-1.5 rounded-lg border text-slate-700 disabled:opacity-40 flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
