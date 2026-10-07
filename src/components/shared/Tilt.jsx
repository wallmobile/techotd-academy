"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Gentle 3D tilt that follows the pointer, with a soft light glare. Only runs
 * for mouse/pen pointers and never for users who prefer reduced motion.
 */
export function Tilt({ children, className, max = 7 }) {
  const ref = useRef(null);
  const glareRef = useRef(null);

  const canTilt = (event) =>
    event.pointerType !== "touch" && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const onMove = (event) => {
    if (!canTilt(event) || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    ref.current.style.transform = `perspective(900px) rotateX(${((0.5 - y) * max).toFixed(2)}deg) rotateY(${((x - 0.5) * max).toFixed(2)}deg) translateY(-6px)`;
    if (glareRef.current) {
      glareRef.current.style.opacity = "1";
      glareRef.current.style.background = `radial-gradient(260px circle at ${x * 100}% ${y * 100}%, rgb(255 255 255 / 0.35), transparent 60%)`;
    }
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
    if (glareRef.current) glareRef.current.style.opacity = "0";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("relative h-full transition-transform duration-200 ease-out will-change-transform", className)}
    >
      {children}
      <span
        ref={glareRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300"
      />
    </div>
  );
}
