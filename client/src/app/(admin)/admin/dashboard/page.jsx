'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  ShieldCheck,
  MapPin,
  AlertTriangle,
  Users,
  BarChart3,
  Settings,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Layers,
  ArrowRight,
  UserCheck,
  Wrench,
  Activity,
  Zap
} from 'lucide-react';

export default function AdminDashboardExecutive() {
  const { user } = useAuth();

  // Filters
  const [dateRangePreset, setDateRangePreset] = useState('30d');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Data states
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [timeseriesData, setTimeseriesData] = useState(null);
  const [operationsPanel, setOperationsPanel] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Compute ISO dates based on preset
  const getDateRange = (preset) => {
    const to = new Date();
    let from;
    if (preset === 'today') {
      from = new Date();
      from.setHours(0, 0, 0, 0);
    } else if (preset === '7d') {
      from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === '90d') {
      from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    } else {
      // 30d default
      from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const { from, to } = getDateRange(dateRangePreset);
      const params = new URLSearchParams({
        from,
        to,
        category: categoryFilter,
      });

      const [kpiRes, tsRes, opsRes] = await Promise.all([
        apiClient(`/admin/kpis?${params.toString()}`),
        apiClient(`/admin/kpis/timeseries?${params.toString()}`),
        apiClient('/admin/operations/panel'),
      ]);

      if (kpiRes.success) setKpiData(kpiRes.data);
      if (tsRes.success) setTimeseriesData(tsRes.data);
      if (opsRes.success) setOperationsPanel(opsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load executive KPI metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRangePreset, categoryFilter]);

  // Real-time live updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:room', 'admin:dispatch');

    const handleDispatchUpdate = () => {
      // Refresh operations panel metrics seamlessly
      apiClient('/admin/operations/panel').then((res) => {
        if (res?.success) setOperationsPanel(res.data);
      });
    };

    socket.on('admin:dispatch:update', handleDispatchUpdate);
    socket.on('booking:status', handleDispatchUpdate);
    socket.on('sla:alert', handleDispatchUpdate);

    return () => {
      socket.off('admin:dispatch:update', handleDispatchUpdate);
      socket.off('booking:status', handleDispatchUpdate);
      socket.off('sla:alert', handleDispatchUpdate);
    };
  }, []);

  const handleDownloadCsv = async (reportType) => {
    try {
      setExporting(true);
      const { from, to } = getDateRange(dateRangePreset);
      const token = localStorage.getItem('dispatchly_access_token');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/reports/${reportType}?from=${from}&to=${to}&category=${categoryFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Report export failed');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `dispatchly_${reportType}_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const cur = kpiData?.current || {};
  const prev = kpiData?.previous || {};
  const trends = kpiData?.trends || {};

  const renderTrendBadge = (trendVal, invert = false) => {
    if (trendVal === undefined || trendVal === null) return null;
    const isPositive = trendVal > 0;
    const isGood = invert ? !isPositive : isPositive;
    return (
      <span
        className={`inline-flex items-center space-x-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md ${
          isGood ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
        <span>{trendVal > 0 ? `+${trendVal}%` : `${trendVal}%`}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dispatch Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
              PRD Real-Time KPIs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated operations metrics, SLA feasibility, revenue collection, and autonomous fleet health
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 text-xs font-bold">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDateRangePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateRangePreset === p.id
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="plumbing">Plumbing</option>
            <option value="hvac">HVAC</option>
            <option value="delivery">Delivery</option>
          </select>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-20 hidden group-hover:block">
              <button
                onClick={() => handleDownloadCsv('bookings')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 text-slate-700"
              >
                Bookings Report
              </button>
              <button
                onClick={() => handleDownloadCsv('payments')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 text-slate-700"
              >
                Payments & Fees
              </button>
              <button
                onClick={() => handleDownloadCsv('sla')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 text-slate-700"
              >
                SLA Compliance
              </button>
              <button
                onClick={() => handleDownloadCsv('technicians')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 text-slate-700"
              >
                Technician Performance
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* 2. Primary KPI Cards Grid (8 Core PRD Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dispatch Success Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Dispatch Success Rate
            </span>
            {renderTrendBadge(trends.dispatchSuccessRate)}
          </div>
          <div className="text-3xl font-black text-slate-900">
            {cur.dispatchSuccessRate || 0}%
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>{cur.assignedCount || 0} assigned</span>
            <span>Target: &gt; 90%</span>
          </div>
        </div>

        {/* Card 2: SLA Compliance Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              SLA Compliance Rate
            </span>
            {renderTrendBadge(trends.slaComplianceRate)}
          </div>
          <div className="text-3xl font-black text-blue-600">
            {cur.slaComplianceRate || 100}%
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>On-time completions</span>
            <span>Target: &gt; 95%</span>
          </div>
        </div>

        {/* Card 3: Average Arrival Time */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avg Technician Arrival
            </span>
            {renderTrendBadge(trends.avgArrivalMinutes, true)}
          </div>
          <div className="text-3xl font-black text-slate-900">
            {cur.avgArrivalMinutes || 0} <span className="text-base text-slate-400 font-semibold">min</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>Assigned &rarr; Arrived</span>
            <span>Prev: {prev.avgArrivalMinutes || 0} min</span>
          </div>
        </div>

        {/* Card 4: Platform Fee Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Platform Fee Revenue
            </span>
            {renderTrendBadge(trends.platformRevenue)}
          </div>
          <div className="text-3xl font-black text-purple-600">
            ${(cur.platformRevenue || 0).toFixed(2)}
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>{cur.platformFeeCount || 0} tickets @ $1.50</span>
            <span>Gross: ${(cur.grossVolume || 0).toFixed(0)}</span>
          </div>
        </div>

        {/* Card 5: Technician Acceptance Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tech Acceptance Rate
            </span>
            {renderTrendBadge(trends.technicianAcceptanceRate)}
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {cur.technicianAcceptanceRate || 0}%
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>{cur.acceptedOffers || 0} / {cur.totalOffers || 0} offers</span>
            <span>Prev: {prev.technicianAcceptanceRate || 0}%</span>
          </div>
        </div>

        {/* Card 6: Reassignment Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Reassignment Rate
            </span>
            {renderTrendBadge(trends.reassignmentRate, true)}
          </div>
          <div className="text-3xl font-black text-amber-600">
            {cur.reassignmentRate || 0}%
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>Multi-attempt dispatches</span>
            <span>Target: &lt; 15%</span>
          </div>
        </div>

        {/* Card 7: Job Completion Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Job Completion Rate
            </span>
            {renderTrendBadge(trends.jobCompletionRate)}
          </div>
          <div className="text-3xl font-black text-slate-900">
            {cur.jobCompletionRate || 0}%
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>{cur.completedCount || 0} finished jobs</span>
            <span>Total: {cur.confirmedCount || 0}</span>
          </div>
        </div>

        {/* Card 8: Customer Satisfaction */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Customer Satisfaction
            </span>
            {renderTrendBadge(trends.customerSatisfaction)}
          </div>
          <div className="text-3xl font-black text-yellow-500">
            ★ {cur.customerSatisfaction || 5.0}
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>From {cur.reviewCount || 0} reviews</span>
            <span>Scale: 1.0 - 5.0</span>
          </div>
        </div>
      </div>

      {/* 3. Live Operations Control Panel (Real-Time State Gateway) */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-base font-black tracking-wide">Live Fleet Operations Room</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Socket.IO Active
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Listening on <code className="text-emerald-400">admin:dispatch</code>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Confirmed</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {operationsPanel?.activeByState?.confirmed || 0}
            </span>
            <span className="text-[10px] text-slate-400">Awaiting Offer</span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">
              {operationsPanel?.activeByState?.assigned || 0}
            </span>
            <span className="text-[10px] text-slate-400">Accepted & Prep</span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">En Route</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {operationsPanel?.activeByState?.en_route || 0}
            </span>
            <span className="text-[10px] text-slate-400">Live GPS Tracking</span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Arrived</span>
            <span className="text-2xl font-black text-purple-400 mt-1 block">
              {operationsPanel?.activeByState?.arrived || 0}
            </span>
            <span className="text-[10px] text-slate-400">On-Site Inspection</span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">In Progress</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {operationsPanel?.activeByState?.in_progress || 0}
            </span>
            <span className="text-[10px] text-slate-400">Work Underway</span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-red-400 block">Manual / Queue</span>
            <span className="text-2xl font-black text-red-400 mt-1 block">
              {operationsPanel?.queues?.exhaustedManual || 0}
            </span>
            <Link
              href="/admin/dispatch"
              className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline inline-flex items-center space-x-0.5"
            >
              <span>Dispatch Engine</span>
              <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Action Queues Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <Link
            href="/admin/technicians"
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition flex justify-between items-center border border-slate-700"
          >
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Pending Verifications</span>
            </div>
            <span className="font-bold bg-purple-900 text-purple-200 px-2 py-0.5 rounded-full">
              {operationsPanel?.queues?.pendingVerifications || 0}
            </span>
          </Link>

          <Link
            href="/admin/disputes"
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition flex justify-between items-center border border-slate-700"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Open Disputes</span>
            </div>
            <span className="font-bold bg-amber-900 text-amber-200 px-2 py-0.5 rounded-full">
              {operationsPanel?.queues?.openDisputes || 0}
            </span>
          </Link>

          <Link
            href="/admin/bookings"
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition flex justify-between items-center border border-slate-700"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-red-400" />
              <span>SLA At-Risk / Breached</span>
            </div>
            <span className="font-bold bg-red-900 text-red-200 px-2 py-0.5 rounded-full">
              {(operationsPanel?.queues?.atRiskSla || 0) + (operationsPanel?.queues?.breachedSla || 0)}
            </span>
          </Link>

          <Link
            href="/admin/dispatch"
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition flex justify-between items-center border border-slate-700"
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Reassignment Approvals</span>
            </div>
            <span className="font-bold bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full">
              {operationsPanel?.queues?.pendingReassignments || 0}
            </span>
          </Link>
        </div>
      </div>

      {/* 4. Interactive Trend Visualizations (Clean Native SVG Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Daily Bookings & Completions */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Daily Booking Volume & Completions</span>
              </h3>
              <p className="text-xs text-slate-400">Total requests created vs completed</p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                <span>Bookings</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Completed</span>
              </span>
            </div>
          </div>

          {/* SVG Trend Bars */}
          <div className="h-60 flex items-end space-x-2 pt-6 border-b border-slate-100 overflow-x-auto pb-2">
            {(timeseriesData?.series || []).length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No time-series data for current filter window.
              </div>
            ) : (
              timeseriesData.series.map((day) => {
                const maxVal = Math.max(
                  ...timeseriesData.series.map((d) => Math.max(d.bookings, d.completed, 5))
                );
                const bHeight = Math.max(6, (day.bookings / maxVal) * 180);
                const cHeight = Math.max(6, (day.completed / maxVal) * 180);

                return (
                  <div key={day.date} className="flex-1 min-w-[20px] flex flex-col items-center group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1 pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30 shadow-lg">
                      {day.date}: {day.bookings} Bookings, {day.completed} Done
                    </div>

                    <div className="flex space-x-1 items-end h-[180px]">
                      <div
                        style={{ height: `${bHeight}px` }}
                        className="w-2.5 sm:w-3.5 bg-purple-500 rounded-t-sm transition group-hover:bg-purple-600"
                      />
                      <div
                        style={{ height: `${cHeight}px` }}
                        className="w-2.5 sm:w-3.5 bg-emerald-500 rounded-t-sm transition group-hover:bg-emerald-600"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-2 truncate w-8 text-center">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 2: Category Mix Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Service Vertical Mix</span>
            </h3>
            <p className="text-xs text-slate-400">Share of jobs by operational category</p>
          </div>

          <div className="space-y-3 pt-4">
            {(timeseriesData?.categoryBreakdown || [
              { category: 'plumbing', count: 12 },
              { category: 'hvac', count: 8 },
              { category: 'delivery', count: 6 },
            ]).map((cat) => {
              const total = (timeseriesData?.categoryBreakdown || []).reduce(
                (sum, c) => sum + c.count,
                0
              ) || 26;
              const pct = Math.round((cat.count / Math.max(1, total)) * 100);

              const color =
                cat.category === 'plumbing'
                  ? 'bg-blue-600'
                  : cat.category === 'hvac'
                  ? 'bg-purple-600'
                  : 'bg-emerald-600';

              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="capitalize text-slate-700">{cat.category}</span>
                    <span className="text-slate-500">
                      {cat.count} jobs ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1 mt-6">
            <span className="font-bold text-slate-800 block">SLA Target Benchmarks:</span>
            <div>Plumbing: 10 min urgent / 30 min normal</div>
            <div>HVAC: 15 min urgent / 45 min normal</div>
            <div>Delivery: 5 min urgent / 15 min normal</div>
          </div>
        </div>
      </div>

      {/* 5. Technician Performance Leaderboard */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Technician Performance & Fleet Leaderboard</span>
            </h3>
            <p className="text-xs text-slate-400">
              Per-technician acceptance rates, SLA arrival compliance, ratings, and platform payouts
            </p>
          </div>

          <button
            onClick={() => handleDownloadCsv('technicians')}
            className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Fleet Data</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Acceptance Rate</th>
                <th className="py-3 px-4 text-center">On-Time Arrival</th>
                <th className="py-3 px-4 text-center">Rating</th>
                <th className="py-3 px-4 text-center">Completed Jobs</th>
                <th className="py-3 px-4 text-right">Net Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(kpiData?.technicians || []).length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No active technician dispatches in this filter period.
                  </td>
                </tr>
              ) : (
                kpiData.technicians.map((t) => (
                  <tr key={t.technicianId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.email}</div>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-slate-700">
                      {t.category}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span
                        className={
                          t.acceptanceRate >= 80 ? 'text-emerald-600' : 'text-amber-600'
                        }
                      >
                        {t.acceptanceRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span
                        className={
                          t.onTimeRate >= 90 ? 'text-blue-600' : 'text-amber-600'
                        }
                      >
                        {t.onTimeRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-yellow-500 font-bold">
                      ★ {t.rating}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {t.completedJobs}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ${t.earnings?.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
