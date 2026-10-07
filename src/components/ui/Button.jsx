import Link from "next/link";
import { cn } from "@/lib/utils";

const variantClasses = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-soft",
  secondary:
    "bg-secondary text-white hover:bg-secondary-hover active:bg-secondary-hover shadow-soft",
  outline:
    "border border-border bg-white text-text hover:border-primary hover:text-primary",
  ghost: "text-text hover:bg-surface",
  dark: "bg-dark text-white hover:bg-dark/90 active:bg-dark/80",
};

const sizeClasses = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

/**
 * Global Button primitive. Renders a Next.js <Link> when `href` is
 * given, otherwise a native <button>, so it works for both navigation
 * and actions while keeping one consistent visual system.
 */
export function Button({
  as,
  href,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-button font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:opacity-50 disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  const content = (
    <>
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span className={loading ? "opacity-80" : undefined}>{children}</span>
    </>
  );

  if (href && !disabled) {
    const Component = as || Link;
    return (
      <Component href={href} className={classes} {...props}>
        {content}
      </Component>
    );
  }

  return (
    <button
      type={props.type || "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}
