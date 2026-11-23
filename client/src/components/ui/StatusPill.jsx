'use client';

import React from 'react';

/**
 * Universal StatusPill
 * Strict sentence case, 6px radius, script-verified contrast
 */
export const STATUS_MAP = {
  // Booking lifecycle
  draft: { label: 'Draft', variant: 'neutral' },
  searching: { label: 'Matching technician', variant: 'info' },
  offered: { label: 'Offer sent', variant: 'warning' },
  assigned: { label: 'Technician assigned', variant: 'info' },
  en_route: { label: 'En route', variant: 'info' },
  arrived: { label: 'Arrived on-site', variant: 'info' },
  in_progress: { label: 'Work in progress', variant: 'info' },
  completed: { label: 'Job completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },

  // Quotes
  quote_pending: { label: 'Quote pending', variant: 'warning' },
  quote_approved: { label: 'Quote approved', variant: 'success' },
  quote_rejected: { label: 'Quote rejected', variant: 'danger' },

  // Payments
  unpaid: { label: 'Payment pending', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  failed: { label: 'Payment failed', variant: 'danger' },
  refunded: { label: 'Refunded', variant: 'neutral' },

  // Verification
  unverified: { label: 'Unverified', variant: 'neutral' },
  pending: { label: 'Under review', variant: 'warning' },
  approved: { label: 'Verified', variant: 'success' },
  rejected: { label: 'Verification denied', variant: 'danger' },

  // Disputes
  open: { label: 'Dispute open', variant: 'danger' },
  resolved: { label: 'Dispute resolved', variant: 'success' },

  // Priority
  normal: { label: 'Standard priority', variant: 'neutral' },
  urgent: { label: 'Urgent priority', variant: 'warning' },
};

export function StatusPill({ status, label, variant, className = '' }) {
  const mapped = STATUS_MAP[status?.toLowerCase()] || {
    label: status ? String(status).replace(/_/g, ' ') : 'Unknown',
    variant: 'neutral',
  };

  const finalVariant = variant || mapped.variant;
  const finalLabel = label || mapped.label;

  const variantStyles = {
    // Neutral: Concrete fill + Line border + Ink text
    neutral: 'bg-concrete border-line text-ink',
    // Info: 10% tint + info border + info text (#2F5D8A)
    info: 'bg-status-info-tint border-status-info/40 text-status-info',
    // Warning: Amber tint + amber border + ink text (#12161C)
    warning: 'bg-status-warning-tint border-amber text-ink',
    // Success: 10% tint + success border + darker success text (#17753F)
    success: 'bg-status-success-tint border-status-success/40 text-status-success-text',
    // Danger: 10% tint + danger border + darker danger text (#B92E25)
    danger: 'bg-status-danger-tint border-status-danger/40 text-status-danger-text',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-control border ${
        variantStyles[finalVariant] || variantStyles.neutral
      } ${className}`}
    >
      {finalLabel}
    </span>
  );
}
