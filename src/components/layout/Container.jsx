import { cn } from "@/lib/utils";

/**
 * Centered, responsive content wrapper. Use this instead of hardcoding
 * max-width/padding in individual sections.
 */
export function Container({ as: Tag = "div", className, children, ...props }) {
  return (
    <Tag
      className={cn("mx-auto w-full max-w-[1280px] px-6 sm:px-8 lg:px-10", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
