'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogIn, AlertCircle, ArrowRight, ShieldCheck, Wrench, UserCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'technician') router.push('/technician/dashboard');
      else router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPass, targetRole) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">Sign in to Dispatchly</h1>
        <p className="text-sm text-slate-500">
          Access your customer, technician, or dispatch admin account
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Demo Pre-fill Bar */}
      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
        <div className="font-semibold text-slate-700 flex items-center space-x-1">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Quick Demo One-Click Selectors:</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickFill('customer@dispatchly.com', 'password123', 'customer')}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition text-center"
          >
            👤 Customer
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('plumber@dispatchly.com', 'password123', 'technician')}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition text-center"
          >
            🔧 Technician
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('admin@dispatchly.com', 'password123', 'admin')}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition text-center"
          >
            ⚡ Admin
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
        </button>
      </form>

      <div className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-blue-600 hover:underline">
          Register now
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
