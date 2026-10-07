import { cn } from "@/lib/utils";

/**
 * `icon` is optional and purely presentational, same as Input's — omitting
 * it renders exactly as before.
 */
export function Select({ label, id, error, icon, className, children, ...props }) {
  const inputId = id || props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted"
          >
            {icon}
          </span>
        )}
        <select
          id={inputId}
          className={cn(
            "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-sm text-text",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pl-10",
            error && "border-danger",
            className
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        >
          {children}
        </select>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
