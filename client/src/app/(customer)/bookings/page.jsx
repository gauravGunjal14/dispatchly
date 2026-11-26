'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/format';
import { Button, StatusPill } from '@/components/ui';
import { 
  Clock, 
  MapPin, 
  Plus, 
  ArrowRight, 
  AlertCircle,
  FileText
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
      setError('');
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

  const filterTabs = [
    { id: 'ALL', label: 'All requests' },
    { id: 'searching', label: 'Matching' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 text-ink">
      {/* Header with single primary Amber button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-ink">
            My service requests
          </h1>
          <p className="text-sm text-ink/70">
            Track active dispatches, view technician ETA, or review past invoices.
          </p>
        </div>

        <Link href="/book">
          <Button variant="primary" size="md" leftIcon={Plus}>
            New request
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-control bg-status-danger-tint border border-status-danger/30 text-status-danger-text text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-status-danger" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs in Sentence Case */}
      <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-control text-xs sm:text-sm font-semibold transition whitespace-nowrap border ${
                isActive
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink/70 border-line hover:text-ink hover:bg-concrete'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bookings List Cards */}
      {loading ? (
        <div className="p-12 text-center text-ink/60 bg-white rounded-panel border border-line text-sm">
          Loading your service requests...
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center bg-concrete/40 rounded-panel border border-line space-y-3">
          <FileText className="w-8 h-8 text-ink/40 mx-auto" strokeWidth={1.5} />
          <h3 className="font-headline font-bold text-base text-ink">
            No service requests found
          </h3>
          <p className="text-sm text-ink/60 max-w-sm mx-auto">
            {filter === 'ALL'
              ? 'You have not submitted any service requests yet.'
              : `There are currently no requests with "${filterTabs.find((t) => t.id === filter)?.label.toLowerCase()}" status.`}
          </p>
          <div className="pt-2">
            <Link href="/book">
              <Button variant="outline" size="sm">
                Book a service
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isDelivery = booking.category?.toLowerCase() === 'delivery';
            const price = booking.pricing?.finalAmount || booking.pricing?.baseAmount || booking.pricing?.estimatedAmount || 0;

            return (
              <div
                key={booking._id}
                className="bg-white rounded-panel border border-line p-5 sm:p-6 space-y-4 hover:border-ink/60 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">
                        {booking.ticketNumber || `#${booking._id.slice(-6)}`}
                      </span>
                      <span className="text-xs text-ink/50">&bull;</span>
                      <span className="text-xs text-ink/70">
                        {formatDate(booking.createdAt)}
                      </span>
                    </div>
                    <h3 className="font-headline font-bold text-base sm:text-lg text-ink">
                      {booking.service?.name || 'On-demand service'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <span className="text-sm sm:text-base font-bold text-ink tabular-nums">
                      {formatMoney(price)}
                    </span>
                    <StatusPill status={booking.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm text-ink/80">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-ink/50 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">
                      {isDelivery ? booking.pickupLocation?.address || booking.location?.address : booking.location?.address}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-ink/50 flex-shrink-0" strokeWidth={1.75} />
                    <span>
                      {booking.eta ? `Expected arrival: ~${booking.eta} minutes` : 'Arrival deadline: standard window'}
                    </span>
                  </div>
                </div>

                {booking.assignedTechnician && (
                  <div className="p-3 rounded-control bg-concrete/50 border border-line/60 flex items-center justify-between text-xs">
                    <span className="text-ink/70">Assigned technician:</span>
                    <span className="font-bold text-ink">{booking.assignedTechnician.name}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Link href={`/bookings/${booking._id}`}>
                    <Button variant="secondary" size="sm" rightIcon={ArrowRight}>
                      View details
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
