'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled client application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center space-y-6">
      <div className="bg-red-50 text-red-600 p-4 rounded-3xl border border-red-200">
        <AlertTriangle className="w-12 h-12 stroke-1" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100 px-3 py-1 rounded-full">
          500 &bull; System Encountered An Issue
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight pt-2">
          Temporary Platform Disruption
        </h1>
        <p className="text-sm text-slate-500">
          Our dispatch engine encountered an unexpected runtime fault. Our background monitors have been notified.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Operation</span>
        </button>
        <Link
          href="/"
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
        >
          <Home className="w-4 h-4" />
          <span>Platform Home</span>
        </Link>
      </div>
    </div>
  );
}
