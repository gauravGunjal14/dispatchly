'use client';

import React from 'react';

/**
 * Panel component
 * Exactly 12px radius, 1px line border, white or concrete background
 */
export function Panel({
  children,
  title,
  action,
  subtitle,
  variant = 'white',
  noPadding = false,
  className = '',
  id,
}) {
  const bgStyles = {
    white: 'bg-white',
    concrete: 'bg-concrete',
    ink: 'bg-ink text-white',
  };

  return (
    <div
      id={id}
      className={`rounded-panel border border-line overflow-hidden ${bgStyles[variant] || bgStyles.white} ${className}`}
    >
      {(title || action || subtitle) && (
        <div className="px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            {title && (
              <h3 className={`text-base font-semibold ${variant === 'ink' ? 'text-white' : 'text-ink'}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`text-xs mt-0.5 ${variant === 'ink' ? 'text-white/70' : 'text-ink/70'}`}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

export function Table({
  columns = [],
  data = [],
  emptyText = 'No records found',
  className = '',
}) {
  return (
    <div className={`overflow-x-auto rounded-panel border border-line ${className}`}>
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-concrete border-b border-line text-xs font-semibold text-ink">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-xs text-ink/60">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => (
              <tr key={row._id || row.id || rIdx} className="hover:bg-concrete/40 transition-colors">
                {columns.map((col, cIdx) => (
                  <td
                    key={col.key || cIdx}
                    className={`py-3 px-4 text-xs sm:text-sm text-ink ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row, rIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-xs text-ink/70 py-3 px-1">
      <div>
        {totalItems ? <span>Total: {totalItems} items</span> : <span>Page {currentPage} of {totalPages}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2.5 py-1 rounded-control border border-line bg-white hover:bg-concrete disabled:opacity-40 disabled:pointer-events-none text-ink font-medium"
        >
          Previous
        </button>
        <span className="px-2 text-ink font-semibold">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2.5 py-1 rounded-control border border-line bg-white hover:bg-concrete disabled:opacity-40 disabled:pointer-events-none text-ink font-medium"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${maxWidth} bg-white rounded-panel border border-line shadow-floating overflow-hidden z-10`}
      >
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 id="modal-title" className="text-base font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-control text-ink/60 hover:text-ink hover:bg-concrete transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ type = 'info', message, onClose }) {
  const typeStyles = {
    info: 'bg-status-info-tint border-status-info/40 text-status-info',
    success: 'bg-status-success-tint border-status-success/40 text-status-success-text',
    danger: 'bg-status-danger-tint border-status-danger/40 text-status-danger-text',
  };

  return (
    <div
      role="status"
      className={`flex items-center justify-between p-3.5 rounded-control border text-xs font-semibold shadow-floating min-w-[280px] max-w-sm ${
        typeStyles[type] || typeStyles.info
      }`}
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-3 text-current opacity-70 hover:opacity-100"
        >
          &times;
        </button>
      )}
    </div>
  );
}
