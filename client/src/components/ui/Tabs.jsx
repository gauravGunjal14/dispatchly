'use client';

import React from 'react';

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div className={`flex border-b border-line gap-2 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
              isActive
                ? 'border-ink text-ink'
                : 'border-transparent text-ink/60 hover:text-ink hover:border-line'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-2 px-1.5 py-0.5 text-xs rounded-control ${
                  isActive ? 'bg-concrete text-ink font-bold' : 'bg-concrete text-ink/70'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Accordion({ items = [], defaultOpenId = null }) {
  const [openId, setOpenId] = React.useState(defaultOpenId);

  const toggle = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="divide-y divide-line border-t border-b border-line">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="py-4">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between text-left text-sm sm:text-base font-semibold text-ink hover:text-ink/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <span>{item.title || item.question}</span>
              <span className="ml-4 flex-shrink-0 text-ink/60">
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="mt-2 text-xs sm:text-sm text-ink/80 leading-relaxed max-w-prose">
                {item.content || item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-concrete rounded-control ${className}`}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`p-8 text-center rounded-panel border border-line bg-white flex flex-col items-center justify-center space-y-3 ${className}`}>
      {Icon && (
        <div className="text-ink/40 p-3 bg-concrete rounded-control">
          <Icon className="w-6 h-6" strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {description && <p className="text-xs text-ink/70 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) {
  return (
    <div className={`p-5 rounded-panel border border-status-danger/40 bg-status-danger-tint text-left space-y-3 ${className}`}>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-status-danger-text">{title}</h4>
        {message && <p className="text-xs text-status-danger-text/90">{message}</p>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 text-xs font-semibold rounded-control bg-status-danger-text text-white hover:bg-black transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
