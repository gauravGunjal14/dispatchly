'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { 
  Clock, 
  MapPin, 
  PlusCircle, 
  ArrowRight, 
  Wrench, 
  Flame, 
  Truck, 
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const url = filter !== 'ALL' ? `/bookings?status=${filter}` : '/bookings';
      const res = await apiClient(url);
      if (res.success && res.data) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'searching':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 animate-pulse border border-blue-300">
            Searching Techs
          </span>
        );
      case 'offered':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Offer Pending
          </span>
        );
      case 'assigned':
      case 'en_route':
      case 'arrived':
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 capitalize">
            {status.replace('_', ' ')}
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Service Requests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track active dispatches, view technician ETA, or review service history
          </p>
        </div>

        <Link
          href="/book"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Request</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'ALL', label: 'All Requests' },
          { id: 'searching', label: 'Matching' },
          { id: 'assigned', label: 'Assigned' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filter === tab.id
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading your service tickets...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Clock className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">No requests found in this category.</p>
            <Link
              href="/book"
              className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              Book a Service Now
            </Link>
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking._id}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {booking.ticketNumber}
                  </span>
                  {getStatusBadge(booking.status)}
                  {booking.priority === 'urgent' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-amber-600" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

                <div className="font-bold text-slate-900 text-base">
                  {booking.service?.name || booking.category}
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{booking.location?.address || 'Service location provided'}</span>
                  </span>
                  <span>&bull;</span>
                  <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                <div className="text-base font-black text-slate-900">
                  {booking.pricing?.quotationRequired ? (
                    <span className="text-xs text-blue-600 font-bold">Quote Required</span>
                  ) : (
                    `$${booking.pricing?.baseAmount?.toFixed(2) || '0.00'}`
                  )}
                </div>

                <Link
                  href={`/bookings/${booking._id}`}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition border border-blue-200"
                >
                  <span>Track Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
