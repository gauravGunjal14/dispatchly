'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/format';
import { Button, StatusPill, Panel } from '@/components/ui';
import { 
  Wrench, 
  Snowflake, 
  Truck, 
  Plus, 
  Clock, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [activeBookings, setActiveBookings] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const res = await apiClient('/bookings');
        if (res.success && res.data?.bookings) {
          const all = res.data.bookings;
          const active = all.filter((b) => 
            ['searching', 'offered', 'assigned', 'en_route', 'arrived', 'in_progress'].includes(b.status)
          );
          const past = all.filter((b) => 
            ['completed', 'cancelled', 'disputed'].includes(b.status)
          );
          setActiveBookings(active);
          setRecentBookings(past.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load dashboard bookings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 text-ink">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-ink">
            Welcome back, {user?.name || 'Customer'}
          </h1>
          <p className="text-sm text-ink/70">
            Book an on-demand technician or track your active service requests.
          </p>
        </div>
        <Link href="/book">
          <Button variant="primary" size="md" leftIcon={Plus}>
            Book a service
          </Button>
        </Link>
      </div>

      {/* Active Requests (if any) */}
      {activeBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-lg text-ink">
              Active service requests
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-control bg-status-info-tint text-status-info border border-status-info/20">
              {activeBookings.length} in progress
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map((b) => (
              <div
                key={b._id}
                className="bg-white rounded-panel border border-line p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-semibold text-ink/60">
                      {b.ticketNumber || 'Ticket in progress'}
                    </span>
                    <h3 className="text-base font-bold text-ink truncate">
                      {b.service?.name || 'Service request'}
                    </h3>
                  </div>
                  <StatusPill status={b.status} />
                </div>

                <div className="space-y-2 text-xs text-ink/80">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-ink/60 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">
                      {b.location?.address || 'Site location'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-ink/60 flex-shrink-0" strokeWidth={1.75} />
                    <span>
                      {b.eta ? `Expected arrival in about ${b.eta} minutes` : 'Matching technician to your arrival deadline'}
                    </span>
                  </div>
                  {b.assignedTechnician && (
                    <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                      <span className="text-ink/70">Assigned technician:</span>
                      <span className="font-bold text-ink">{b.assignedTechnician.name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-line">
                  <Link href={`/bookings/${b._id}`}>
                    <Button variant="secondary" size="sm" fullWidth>
                      Track dispatch
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Grid ("What do you need help with?") */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-headline font-bold text-xl text-ink">
            What do you need help with?
          </h2>
          <p className="text-sm text-ink/70">
            Choose a service to request an on-site technician or urgent delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plumbing */}
          <Link
            href="/book?category=Plumbing"
            className="group bg-white rounded-panel border border-line p-6 space-y-4 hover:border-ink hover:bg-concrete/30 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <Wrench className="w-6 h-6 text-ink" strokeWidth={1.75} />
              <div className="space-y-1">
                <h3 className="font-headline font-bold text-lg text-ink">
                  Plumbing
                </h3>
                <p className="text-sm text-ink/70 leading-relaxed">
                  Pipe leaks, faucet repairs, main valve replacements, and drain clearing with parts in the van.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-line">
              <span className="text-sm font-semibold text-ink group-hover:underline">
                Book plumbing
              </span>
            </div>
          </Link>

          {/* AC & HVAC */}
          <Link
            href="/book?category=HVAC"
            className="group bg-white rounded-panel border border-line p-6 space-y-4 hover:border-ink hover:bg-concrete/30 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <Snowflake className="w-6 h-6 text-ink" strokeWidth={1.75} />
              <div className="space-y-1">
                <h3 className="font-headline font-bold text-lg text-ink">
                  AC and HVAC
                </h3>
                <p className="text-sm text-ink/70 leading-relaxed">
                  Cooling diagnostics, refrigerant recharges, capacitor replacements, and thermostat tune-ups.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-line">
              <span className="text-sm font-semibold text-ink group-hover:underline">
                Book AC and HVAC
              </span>
            </div>
          </Link>

          {/* Urgent Delivery */}
          <Link
            href="/book?category=Urgent Delivery"
            className="group bg-white rounded-panel border border-line p-6 space-y-4 hover:border-ink hover:bg-concrete/30 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <Truck className="w-6 h-6 text-ink" strokeWidth={1.75} />
              <div className="space-y-1">
                <h3 className="font-headline font-bold text-lg text-ink">
                  Urgent delivery
                </h3>
                <p className="text-sm text-ink/70 leading-relaxed">
                  Rapid point-to-point courier and hardware delivery with capacity matching and live tracking.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-line">
              <span className="text-sm font-semibold text-ink group-hover:underline">
                Book urgent delivery
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-lg text-ink">
            Past service requests
          </h2>
          <Link href="/bookings" className="text-xs font-semibold text-ink hover:underline">
            View all requests
          </Link>
        </div>

        {recentBookings.length > 0 ? (
          <div className="overflow-x-auto rounded-panel border border-line bg-white">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-line bg-concrete/50 text-xs font-semibold text-ink/70">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs sm:text-sm">
                {recentBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-concrete/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-ink">
                      {b.ticketNumber || b._id.substring(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-medium text-ink">
                      {b.service?.name || 'General service'}
                    </td>
                    <td className="py-3 px-4 text-ink/70">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-ink">
                      {formatMoney(b.pricing?.finalAmount || b.pricing?.estimatedAmount || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/bookings/${b._id}`}
                        className="font-semibold text-ink hover:underline text-xs"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 rounded-panel border border-line bg-concrete/30 text-center space-y-2">
            <p className="text-sm text-ink/70">
              You have no past service requests yet.
            </p>
            <p className="text-xs text-ink/50">
              When you book a service, your receipts, technician notes, and invoices will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
