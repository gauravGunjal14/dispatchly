'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from './NotificationBell';
import { Button } from '@/components/ui';
import { Menu, X, LogOut, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, role, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardHref = () => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'technician') return '/technician/dashboard';
    return '/dashboard';
  };

  const getRoleBadgeLabel = () => {
    if (role === 'admin') return 'Dispatcher / Admin';
    if (role === 'technician') return 'Technician';
    return 'Customer';
  };

  return (
    <nav className="bg-white border-b border-line sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo: Wordmark + Geometric Amber Square with Ink Pin */}
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="flex items-center space-x-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded-control"
            >
              <div className="w-8 h-8 rounded-control bg-amber flex items-center justify-center border border-ink/10 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-ink relative">
                  <div className="absolute -right-1 -top-1 w-1.5 h-1.5 rounded-full bg-ink" />
                </div>
              </div>
              <span className="font-headline font-bold text-xl tracking-tight text-ink">
                Dispatchly
              </span>
            </Link>

            {/* Public navigation links on landing page */}
            {pathname === '/' && (
              <div className="hidden md:flex items-center space-x-6 text-sm font-medium text-ink/80">
                <a href="#services" className="hover:text-ink transition-colors">
                  Services
                </a>
                <a href="#how-it-works" className="hover:text-ink transition-colors">
                  How it works
                </a>
                <a href="#for-technicians" className="hover:text-ink transition-colors">
                  For technicians
                </a>
              </div>
            )}

            {/* Authenticated Customer navigation links */}
            {isAuthenticated && role === 'customer' && pathname !== '/' && (
              <div className="hidden md:flex items-center space-x-2 text-sm font-medium">
                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-control transition-colors ${
                    pathname === '/dashboard' ? 'bg-concrete text-ink font-semibold' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/book"
                  className={`px-3 py-1.5 rounded-control transition-colors ${
                    pathname === '/book' ? 'bg-concrete text-ink font-semibold' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  Book a service
                </Link>
                <Link
                  href="/bookings"
                  className={`px-3 py-1.5 rounded-control transition-colors ${
                    pathname === '/bookings' ? 'bg-concrete text-ink font-semibold' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  My bookings
                </Link>
              </div>
            )}

            {/* Authenticated Technician navigation links */}
            {isAuthenticated && role === 'technician' && pathname !== '/' && (
              <div className="hidden md:flex items-center space-x-2 text-sm font-medium">
                <Link
                  href="/technician/dashboard"
                  className={`px-3 py-1.5 rounded-control transition-colors ${
                    pathname === '/technician/dashboard' ? 'bg-concrete text-ink font-semibold' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  Offers & jobs
                </Link>
                <Link
                  href="/technician/inventory"
                  className={`px-3 py-1.5 rounded-control transition-colors ${
                    pathname === '/technician/inventory' ? 'bg-concrete text-ink font-semibold' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  Parts inventory
                </Link>
                <Link
                  href="/technician/earnings"
                  className={`px-3 py-1.5 rounded-control transition-colors ${
                    pathname === '/technician/earnings' ? 'bg-concrete text-ink font-semibold' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  Earnings
                </Link>
                <Link
                  href="/technician/profile"
                  className={`px-3 py-1.5 rounded-control transition-colors ${
                    pathname === '/technician/profile' ? 'bg-concrete text-ink font-semibold' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  Profile
                </Link>
              </div>
            )}

            {/* Authenticated Admin link to console */}
            {isAuthenticated && role === 'admin' && pathname !== '/' && (
              <div className="hidden md:flex items-center space-x-2 text-sm font-medium">
                <Link
                  href="/admin/dashboard"
                  className="px-3 py-1.5 rounded-control bg-concrete text-ink font-semibold"
                >
                  Admin console
                </Link>
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <NotificationBell />

                <div className="text-right">
                  <div className="text-xs font-semibold text-ink leading-tight">{user?.name}</div>
                  <div className="text-[11px] text-ink/60">{getRoleBadgeLabel()}</div>
                </div>

                <Link href={getDashboardHref()}>
                  <Button variant="outline" size="sm">
                    Dashboard
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-control border border-line text-ink/70 hover:text-ink hover:bg-concrete transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-ink/80 hover:text-ink px-3 py-2 transition-colors"
                >
                  Log in
                </Link>
                <Link href="/book">
                  <Button variant="secondary" size="md">
                    Book a technician
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex md:hidden items-center space-x-2">
            {isAuthenticated && <NotificationBell />}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-control border border-line text-ink hover:bg-concrete transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <Menu className="w-5 h-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-line bg-white px-4 pt-3 pb-6 space-y-3">
          {pathname === '/' ? (
            <div className="flex flex-col space-y-2 text-sm font-medium text-ink">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-control hover:bg-concrete"
              >
                Services
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-control hover:bg-concrete"
              >
                How it works
              </a>
              <a
                href="#for-technicians"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-control hover:bg-concrete"
              >
                For technicians
              </a>
              <a
                href="#why-matching"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-control hover:bg-concrete"
              >
                Why matching matters
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-control hover:bg-concrete"
              >
                FAQ
              </a>
            </div>
          ) : (
            <div className="flex flex-col space-y-1 text-sm font-medium text-ink">
              {role === 'customer' && (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-control hover:bg-concrete"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/book"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-control hover:bg-concrete"
                  >
                    Book a service
                  </Link>
                  <Link
                    href="/bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-control hover:bg-concrete"
                  >
                    My bookings
                  </Link>
                </>
              )}
              {role === 'technician' && (
                <>
                  <Link
                    href="/technician/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-control hover:bg-concrete"
                  >
                    Dashboard & offers
                  </Link>
                  <Link
                    href="/technician/inventory"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-control hover:bg-concrete"
                  >
                    Parts inventory
                  </Link>
                  <Link
                    href="/technician/earnings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-control hover:bg-concrete"
                  >
                    Earnings
                  </Link>
                  <Link
                    href="/technician/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-control hover:bg-concrete"
                  >
                    Profile & docs
                  </Link>
                </>
              )}
              {role === 'admin' && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-control hover:bg-concrete"
                >
                  Admin dashboard
                </Link>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-line space-y-2">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="text-xs text-ink/70 px-3">
                  Signed in as <span className="font-semibold text-ink">{user?.name}</span> ({getRoleBadgeLabel()})
                </div>
                <Link
                  href={getDashboardHref()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full"
                >
                  <Button variant="secondary" size="md" fullWidth>
                    Go to dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  leftIcon={LogOut}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/book" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                  <Button variant="secondary" size="md" fullWidth>
                    Book a technician
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                  <Button variant="outline" size="md" fullWidth>
                    Log in
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
