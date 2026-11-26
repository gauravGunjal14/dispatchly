'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Wrench, 
  User, 
  Clock 
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('customer');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const user = await register({ name: name.trim(), email: email.trim(), password, role, phone: phone.trim() });
      if (user.role === 'technician') router.push('/technician/dashboard');
      else if (user.role === 'admin') router.push('/admin/dashboard');
      else router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
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
                Join Dispatchly
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Connect with qualified technicians or accept matched jobs that fit your van inventory.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs sm:text-sm text-white/80">
              <div className="flex items-start gap-2.5">
                <User className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span><strong className="font-semibold text-white">Customer:</strong> Request on-demand plumbing, AC repair, and delivery with live tracking</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Wrench className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span><strong className="font-semibold text-white">Technician:</strong> Receive dispatches matched to your van parts, skills, and territory</span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span><strong className="font-semibold text-white">Operations:</strong> Dispatch board monitoring, disputes, and audit trails</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-xs text-white/60">
            Account registration is instant. Test mode payments are active.
          </div>
        </div>

        {/* Right Clean Form */}
        <div className="md:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <h1 className="font-headline font-bold text-2xl text-ink">
              Create your account
            </h1>
            <p className="text-sm text-ink/70">
              Select your role and enter your details to get started.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-control bg-status-danger-tint border border-status-danger/30 text-status-danger-text text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-status-danger" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">
                Select your account role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`p-2.5 rounded-control border text-left transition flex flex-col items-start gap-1 ${
                    role === 'customer'
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink border-line hover:bg-concrete'
                  }`}
                >
                  <User className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-semibold">Customer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('technician')}
                  className={`p-2.5 rounded-control border text-left transition flex flex-col items-start gap-1 ${
                    role === 'technician'
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink border-line hover:bg-concrete'
                  }`}
                >
                  <Wrench className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-semibold">Technician</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`p-2.5 rounded-control border text-left transition flex flex-col items-start gap-1 ${
                    role === 'admin'
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink border-line hover:bg-concrete'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-semibold">Admin</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-name" className="block text-xs font-semibold text-ink">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-xs font-semibold text-ink">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-ink">
                Phone number
              </label>
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 0000000000"
                className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="block text-xs font-semibold text-ink">
                Password (minimum 6 characters)
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
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
                {submitting ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-line text-sm text-ink/70 text-center">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-ink hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
