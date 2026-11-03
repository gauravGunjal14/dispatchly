'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from './NotificationBell';
import { 
  Wrench, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  User as UserIcon, 
  LogOut, 
  Package, 
  Sliders, 
  Layers
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, role, logout } = useAuth();
  const pathname = usePathname();

  const getRoleBadge = (userRole) => {
    switch (userRole) {
      case 'technician':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Technician</span>;
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">Dispatcher / Admin</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">Customer</span>;
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Dispatch<span className="text-blue-600">ly</span>
              </span>
            </Link>

            {/* Navigation Links based on role */}
            <div className="hidden md:flex ml-8 space-x-2">
              {role === 'customer' && (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Services & Request
                  </Link>
                  <Link
                    href="/bookings"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/bookings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    My Bookings
                  </Link>
                </>
              )}

              {role === 'technician' && (
                <>
                  <Link
                    href="/technician/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/technician/dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dashboard & Offers
                  </Link>
                  <Link
                    href="/technician/inventory"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/technician/inventory' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Parts Inventory
                  </Link>
                  <Link
                    href="/technician/earnings"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/technician/earnings' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Earnings
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/dashboard' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Console
                  </Link>
                  <Link
                    href="/admin/dispatch"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/dispatch' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dispatch Engine
                  </Link>
                  <Link
                    href="/admin/disputes"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/disputes' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Disputes
                  </Link>
                  <Link
                    href="/admin/bookings"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/bookings' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bookings
                  </Link>
                  <Link
                    href="/admin/technicians"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/technicians' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Technicians
                  </Link>
                  <Link
                    href="/admin/services"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/services' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Services
                  </Link>
                  <Link
                    href="/admin/users"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/users' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/payments"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/payments' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Payments
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/audit-logs' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Audit
                  </Link>
                  <Link
                    href="/admin/settings"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      pathname === '/admin/settings' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Settings
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* User profile / Auth buttons */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <NotificationBell />

                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</div>
                  <div className="mt-0.5">{getRoleBadge(role)}</div>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
