'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Wrench, Flame, Truck, PlusCircle, Clock, CheckCircle } from 'lucide-react';

export default function CustomerDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Welcome back, {user?.name || 'Customer'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Request an on-demand technician or track your active service dispatches
          </p>
        </div>
        <Link
          href="/book"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Service Request</span>
        </Link>
      </div>

      {/* Services Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Select a Service Vertical</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/book?category=Plumbing"
            className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition space-y-3"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center transition">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 text-lg transition">Plumbing</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Leak detection, pipe repairs, faucet installation, and drain unclogging with guaranteed parts.
            </p>
            <div className="text-xs font-semibold text-blue-600 flex items-center space-x-1 pt-2">
              <span>Book Plumbing &rarr;</span>
            </div>
          </Link>

          <Link
            href="/book?category=HVAC"
            className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-orange-500 hover:shadow-md transition space-y-3"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 group-hover:bg-orange-600 group-hover:text-white text-orange-600 flex items-center justify-center transition">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-orange-600 text-lg transition">HVAC</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              AC unit cooling diagnostics, heater troubleshooting, compressor & thermostat repairs.
            </p>
            <div className="text-xs font-semibold text-orange-600 flex items-center space-x-1 pt-2">
              <span>Book HVAC &rarr;</span>
            </div>
          </Link>

          <Link
            href="/book?category=Urgent Delivery"
            className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition space-y-3"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center transition">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 text-lg transition">Urgent Delivery</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Fast courier dispatch with vehicle capacity matching (motorcycle, van, pickup) and instant ETA.
            </p>
            <div className="text-xs font-semibold text-emerald-600 flex items-center space-x-1 pt-2">
              <span>Book Delivery &rarr;</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
