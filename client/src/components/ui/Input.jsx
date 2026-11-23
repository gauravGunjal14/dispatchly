'use client';

import React from 'react';

export function FormField({
  label,
  error,
  hint,
  required = false,
  id,
  children,
  className = '',
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-ink"
        >
          {label} {required && <span className="text-status-danger">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-ink/70">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-status-danger-text flex items-center gap-1">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function Input({
  label,
  error,
  hint,
  required = false,
  id,
  leftIcon: LeftIcon,
  rightElement,
  className = '',
  ...props
}) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const inputEl = (
    <div className="relative flex items-center">
      {LeftIcon && (
        <div className="absolute left-3 text-ink/50 pointer-events-none">
          <LeftIcon className="w-4 h-4" strokeWidth={1.75} />
        </div>
      )}
      <input
        id={inputId}
        required={required}
        className={`w-full h-10 px-3 text-sm text-ink bg-white border rounded-control transition-colors placeholder:text-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink disabled:bg-concrete disabled:text-ink/40 disabled:cursor-not-allowed ${
          LeftIcon ? 'pl-9' : ''
        } ${rightElement ? 'pr-10' : ''} ${
          error ? 'border-status-danger bg-status-danger-tint/30 text-status-danger-text' : 'border-line hover:border-ink/40'
        } ${className}`}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-3 flex items-center text-ink/60">
          {rightElement}
        </div>
      )}
    </div>
  );

  if (label || error || hint) {
    return (
      <FormField label={label} error={error} hint={hint} required={required} id={inputId}>
        {inputEl}
      </FormField>
    );
  }

  return inputEl;
}

export function Select({
  label,
  error,
  hint,
  required = false,
  id,
  options = [],
  children,
  className = '',
  ...props
}) {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  const selectEl = (
    <div className="relative flex items-center">
      <select
        id={selectId}
        required={required}
        className={`w-full h-10 px-3 pr-8 text-sm text-ink bg-white border rounded-control appearance-none transition-colors focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink disabled:bg-concrete disabled:cursor-not-allowed ${
          error ? 'border-status-danger bg-status-danger-tint/30 text-status-danger-text' : 'border-line hover:border-ink/40'
        } ${className}`}
        {...props}
      >
        {children ||
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>
      <div className="absolute right-3 pointer-events-none text-ink/60">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  if (label || error || hint) {
    return (
      <FormField label={label} error={error} hint={hint} required={required} id={selectId}>
        {selectEl}
      </FormField>
    );
  }

  return selectEl;
}

export function Textarea({
  label,
  error,
  hint,
  required = false,
  id,
  rows = 3,
  className = '',
  ...props
}) {
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  const textareaEl = (
    <textarea
      id={textareaId}
      rows={rows}
      required={required}
      className={`w-full p-3 text-sm text-ink bg-white border rounded-control transition-colors placeholder:text-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink disabled:bg-concrete disabled:cursor-not-allowed ${
        error ? 'border-status-danger bg-status-danger-tint/30 text-status-danger-text' : 'border-line hover:border-ink/40'
      } ${className}`}
      {...props}
    />
  );

  if (label || error || hint) {
    return (
      <FormField label={label} error={error} hint={hint} required={required} id={textareaId}>
        {textareaEl}
      </FormField>
    );
  }

  return textareaEl;
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  id,
  className = '',
  description,
}) {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  return (
    <label
      htmlFor={checkboxId}
      className={`flex items-start gap-2.5 select-none cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 w-4 h-4 rounded-[4px] border border-line text-ink focus:ring-2 focus:ring-ink focus:ring-offset-1 focus:outline-none cursor-pointer"
      />
      <div className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {description && <p className="text-xs text-ink/70 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}
