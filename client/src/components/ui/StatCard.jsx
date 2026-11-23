'use client';

import React from 'react';

export function StatCard({
  label,
  value,
  sublabel,
  benchmark,
  trend,
  badge,
  className = '',
}) {
  return (
    <div className={`p-5 rounded-panel border border-line bg-white space-y-2 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-ink/70">
          {label}
        </span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-control bg-concrete text-ink font-semibold">
            {badge}
          </span>
        )}
        {trend && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded-control font-semibold ${
              trend.isPositive
                ? 'bg-status-success-tint text-status-success-text'
                : 'bg-status-danger-tint text-status-danger-text'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div className="text-2xl sm:text-3xl font-headline font-bold text-ink tabular-nums tracking-tight">
        {value}
      </div>

      {(sublabel || benchmark) && (
        <div className="flex items-center justify-between text-xs text-ink/60 pt-1 border-t border-line/50">
          {sublabel && <span>{sublabel}</span>}
          {benchmark && <span>{benchmark}</span>}
        </div>
      )}
    </div>
  );
}

export function Stepper({ steps = [], currentStep = 1, onStepClick }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Background connecting route line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-line -z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-ink transition-all duration-300 -z-0"
          style={{
            width: `${((currentStep - 1) / Math.max(1, steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div
              key={step.title || idx}
              onClick={() => onStepClick && isDone && onStepClick(stepNum)}
              className={`flex flex-col items-center relative z-10 ${
                isDone ? 'cursor-pointer' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-control flex items-center justify-center text-xs font-bold transition-colors ${
                  isDone
                    ? 'bg-ink text-white'
                    : isCurrent
                    ? 'bg-amber text-ink border-2 border-ink'
                    : 'bg-white border border-line text-ink/50'
                }`}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`mt-2 text-xs font-semibold text-center whitespace-nowrap ${
                  isCurrent ? 'text-ink' : 'text-ink/60'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Timeline({ items = [], className = '' }) {
  return (
    <div className={`space-y-4 relative ${className}`}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isComplete = item.status === 'completed' || item.status === 'done';
        const isCurrent = item.status === 'current' || item.status === 'in_progress' || item.status === 'active';

        return (
          <div key={item.title || idx} className="flex items-start gap-3 relative">
            {!isLast && (
              <div
                className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${
                  isComplete ? 'bg-ink' : 'bg-line'
                }`}
              />
            )}
            <div
              className={`w-7 h-7 rounded-control flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                isComplete
                  ? 'bg-ink text-white'
                  : isCurrent
                  ? 'bg-amber text-ink ring-2 ring-ink ring-offset-1'
                  : 'bg-concrete border border-line text-ink/40'
              }`}
            >
              {isComplete ? '✓' : idx + 1}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isCurrent ? 'text-ink' : 'text-ink/80'}`}>
                  {item.title}
                </span>
                {item.timestamp && (
                  <span className="text-[11px] text-ink/50 tabular-nums">{item.timestamp}</span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-ink/70 mt-0.5 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreBar({
  label,
  value,
  percentage,
  isTop = false,
  className = '',
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center text-xs font-medium text-ink">
        <span>{label}</span>
        <span className="tabular-nums font-semibold">{percentage}%</span>
      </div>
      <div className="w-full bg-concrete rounded-control h-2.5 overflow-hidden border border-line/60">
        <div
          className={`h-full transition-all duration-300 ${
            isTop ? 'bg-amber' : 'bg-ink'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}

export function CountdownRing({
  seconds,
  totalSeconds = 60,
  size = 48,
  strokeWidth = 4,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.max(0, Math.min(1, seconds / totalSeconds));
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EEF0F2"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FFB400"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute font-headline font-bold text-xs text-ink tabular-nums">
        {seconds}s
      </span>
    </div>
  );
}

export function DropdownMenu({
  trigger,
  items = [],
  align = 'right',
  className = '',
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-40 mt-1 min-w-[180px] bg-white rounded-panel border border-line shadow-floating py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return <div key={idx} className="my-1 border-t border-line" />;
            }
            return (
              <button
                key={item.label || idx}
                type="button"
                onClick={() => {
                  item.onClick && item.onClick();
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium text-ink hover:bg-concrete transition-colors flex items-center justify-between ${
                  item.danger ? 'text-status-danger-text hover:bg-status-danger-tint' : ''
                }`}
              >
                <span>{item.label}</span>
                {item.icon && <item.icon className="w-3.5 h-3.5" strokeWidth={1.75} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
