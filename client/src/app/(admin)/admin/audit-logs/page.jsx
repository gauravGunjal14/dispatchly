'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  User, 
  FileText,
  RefreshCw
} from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (entityFilter) params.append('entity', entityFilter);
      if (actionSearch.trim()) params.append('action', actionSearch.trim());

      const res = await apiClient(`/admin/audit-logs?${params.toString()}`);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setPagination(res.data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.error('Audit log fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Immutable Audit Trail</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
              Read-Only Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident record of all administrative overrides, verification decisions, status mutations, and settings changes.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['', 'TechnicianProfile', 'Booking', 'User', 'PlatformSettings', 'Dispute'].map((ent) => (
            <button
              key={ent}
              onClick={() => {
                setEntityFilter(ent);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                entityFilter === ent
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ent === '' ? 'All Entities' : ent}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search action keyword..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 w-56"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading audit trail entries...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No audit log records found matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isExpanded = expandedId === log._id;
                  return (
                    <React.Fragment key={log._id}>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {log.performedBy?.name || 'System Actor'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {log.performedBy?.email || log.role}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-purple-700">
                          {log.targetEntity}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {log.entityId ? String(log.entityId).slice(-8) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => toggleExpand(log._id)}
                            className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-800 font-semibold text-xs"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan="6" className="p-4">
                            <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-xs overflow-x-auto">
                              <pre>{JSON.stringify(log.details || {}, null, 2)}</pre>
                            </div>
                            {log.ipAddress && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                Client IP: {log.ipAddress}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.pages} ({pagination.total} audit logs)
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
