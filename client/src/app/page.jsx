'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Wrench, 
  Flame, 
  Truck, 
  Zap, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  UserCheck,
  Radio
} from 'lucide-react';

export default function HomePage() {
  const { user, login } = useAuth();
  const router = useRouter();

  const handleQuickDemoLogin = async (role, email, pass) => {
    try {
      await login(email, pass);
      if (role === 'admin') router.push('/admin/dashboard');
      else if (role === 'technician') router.push('/technician/dashboard');
      else router.push('/dashboard');
    } catch {
      // If user not seeded yet, navigate to register
      router.push(`/login?email=${encodeURIComponent(email)}&role=${role}`);
    }
  };

  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          <span>Real-Time Geospatial Dispatch Engine</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Last-Mile Dynamic <span className="text-blue-600">Technician Dispatcher</span>
        </h1>
        <p className="text-lg text-slate-600">
          Intelligent, on-demand matchmaking connecting verified independent technicians with customers for Plumbing, HVAC, and Urgent Delivery with SLA-backed guarantees.
        </p>
      </div>

      {/* Role Launchpad Quick Access Cards */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl font-bold">Interactive Role Launchpad</h2>
          <p className="text-slate-300 text-sm mt-1">
            Experience the three distinct marketplace workflows or test with dedicated roles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Portal Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:bg-white/15 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-xl font-bold">Customer Portal</h3>
              <p className="text-sm text-slate-300">
                Browse services, pick service location on an interactive map, get instant quotes, and live-track technicians with ETA.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow"
              >
                <span>Enter as Customer</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Technician Portal Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:bg-white/15 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-xl font-bold">Technician Dashboard</h3>
              <p className="text-sm text-slate-300">
                Manage spare-parts stock, toggle availability, receive sequential job offers with 60s countdown, and stream GPS updates.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
              <Link
                href="/technician/dashboard"
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow"
              >
                <span>Enter as Technician</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Admin / Dispatcher Console Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:bg-white/15 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-xl font-bold">Admin Dispatcher Console</h3>
              <p className="text-sm text-slate-300">
                Live dispatch map, candidate ranking breakdowns, manual override, SLA breach warnings, and technician verification.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
              <Link
                href="/admin/dashboard"
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition shadow"
              >
                <span>Enter as Admin</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Service Pillars */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Supported Field Services</h2>
          <p className="text-slate-500 text-sm">Automated qualification & inventory matching tailored per vertical</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-blue-400 transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Plumbing Solutions</h3>
            <p className="text-sm text-slate-600">
              Pipe repair, emergency leak isolation, valve replacements. Requires verified pipe fittings and tools in stock.
            </p>
            <div className="text-xs text-blue-600 font-semibold bg-blue-50 inline-block px-2.5 py-1 rounded-md">
              SLA Standard: 120 mins
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-orange-400 transition">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">HVAC Diagnostics & Repair</h3>
            <p className="text-sm text-slate-600">
              Air conditioner cooling issues, furnace maintenance, thermostat replacements, and specialized HVAC certifications.
            </p>
            <div className="text-xs text-orange-600 font-semibold bg-orange-50 inline-block px-2.5 py-1 rounded-md">
              SLA Standard: 180 mins
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-emerald-400 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Urgent Delivery</h3>
            <p className="text-sm text-slate-600">
              Critical part transit, package delivery, emergency courier. Verified vehicle types (Van, Motorcycle, Pickup) and load limits.
            </p>
            <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 inline-block px-2.5 py-1 rounded-md">
              SLA Standard: 45 mins
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
