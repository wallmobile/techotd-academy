"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Password input with a show/hide toggle. Visibility state is purely
 * client-side UX — the value itself is never read or stored by this
 * component, only rendered through the underlying <input>.
 */
export function PasswordField({ label, id, name, error, defaultValue, autoComplete, icon, className }) {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          className={cn(
            "h-11 w-full rounded-sm border border-border bg-white px-3.5 pr-11 text-sm text-text placeholder:text-muted",
            icon && "pl-10",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            error && "border-danger",
            className
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 3l14 14M9.5 9.6a2 2 0 002.9 2.8M6.2 6.4C4 7.8 2.4 9.7 2 10c.6 1.2 3.6 6 8 6 1.3 0 2.5-.4 3.6-1M12 4.3c.6-.1 1.3-.2 2-.2 4.4 0 7.4 4.8 8 6-.3.6-1 1.7-2 2.8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
