'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { 
  Clock, 
  MapPin, 
  Search, 
  Filter, 
  Zap, 
  Eye, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  X
} from 'lucide-react';

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter.toLowerCase());
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter.toLowerCase());

      const res = await apiClient(`/admin/bookings?${params.toString()}`);
      if (res.success && res.data) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, categoryFilter, priorityFilter]);

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Global Bookings & Dispatches</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
              Admin Monitor
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time oversight of customer service requests, SLA deadlines, and technician matchmaking
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center space-x-1.5">
          <span className="font-bold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="searching">Searching</option>
            <option value="offered">Offered</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="font-bold text-slate-600">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="Plumbing">Plumbing</option>
            <option value="HVAC">HVAC</option>
            <option value="Delivery">Delivery</option>
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="font-bold text-slate-600">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700"
          >
            <option value="ALL">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No bookings match the selected criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4">Estimated Rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {b.ticketNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {b.customer?.name}
                      <div className="text-[10px] text-slate-400">{b.customer?.phone || b.contactPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {b.service?.name || b.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold capitalize">
                        {b.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold capitalize bg-slate-100 text-slate-800">
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {b.priority === 'urgent' ? (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 text-[10px]">
                          URGENT
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Normal</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ${b.pricing?.baseAmount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 transition border border-purple-200"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Booking Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedBooking.ticketNumber}</h3>
                <span className="text-xs text-slate-400 capitalize">{selectedBooking.category} Booking</span>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block">Customer Details</span>
                <span className="font-bold text-slate-800 text-sm">{selectedBooking.customer?.name}</span>
                <div className="text-slate-600">{selectedBooking.customer?.email} &bull; {selectedBooking.contactPhone}</div>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase block">Destination Location</span>
                <span className="font-bold text-slate-800">{selectedBooking.location?.address}</span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase block">Customer Job Description</span>
                <p className="p-3 bg-slate-50 rounded-xl border mt-0.5 text-slate-700">{selectedBooking.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Guaranteed Arrival SLA</span>
                  <span className="font-bold text-blue-700 text-sm">
                    {selectedBooking.sla?.arrivalDeadline ? new Date(selectedBooking.sla.arrivalDeadline).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border">
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Estimated Price</span>
                  <span className="font-black text-slate-900 text-sm">
                    ${selectedBooking.pricing?.baseAmount?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
