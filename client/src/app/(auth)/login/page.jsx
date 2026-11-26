'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { 
  AlertCircle, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Wrench, 
  Clock 
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'technician') router.push('/technician/dashboard');
      else router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Incorrect email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] py-8 sm:py-12 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl bg-white rounded-panel border border-line overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Ink Brand Panel */}
        <div className="md:col-span-5 bg-ink text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-control bg-amber flex items-center justify-center border border-ink/10 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-ink relative">
                  <div className="absolute -right-1 -top-1 w-1.5 h-1.5 rounded-full bg-ink" />
                </div>
              </div>
              <span className="font-headline font-bold text-xl tracking-tight text-white">
                Dispatchly
              </span>
            </Link>

            <div className="space-y-2">
              <h2 className="font-headline font-bold text-2xl text-white leading-snug">
                The right technician, not just the nearest one.
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Intelligent dispatch for plumbing, AC and HVAC repair, and urgent package delivery.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs sm:text-sm text-white/80">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span>Real-time dispatch with live arrival tracking</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Wrench className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span>Matched by van parts, skills, and arrival deadline</span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span>Verified credentials and itemised quotes</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-xs text-white/60">
            Sign in to access your customer bookings, technician route offers, or dispatcher board.
          </div>
        </div>

        {/* Right Clean Form */}
        <div className="md:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <h1 className="font-headline font-bold text-2xl text-ink">
              Sign in to your account
            </h1>
            <p className="text-sm text-ink/70">
              Enter your email and password to access your dashboard.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-control bg-status-danger-tint border border-status-danger/30 text-status-danger-text text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-status-danger" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-semibold text-ink">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="login-password" className="block text-xs font-semibold text-ink">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-control border border-line bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink p-1 rounded-control transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={submitting}
              >
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-line text-sm text-ink/70 text-center">
            Do not have an account yet?{' '}
            <Link href="/register" className="font-semibold text-ink hover:underline">
              Register now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-16 text-center text-ink/60">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
