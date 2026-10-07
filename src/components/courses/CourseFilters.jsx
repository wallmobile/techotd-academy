"use client";

import { LEVELS, MODES, DURATION_BANDS } from "@/data/courseFilters";
import { cn } from "@/lib/utils";

function PillGroup({ legend, options, selected, onToggle }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-transparent bg-dark text-white"
                  : "border-border bg-surface text-text hover:border-primary/40 hover:text-primary"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Inline filter tray — Level / Learning Mode / Duration as toggle pills. */
export function CourseFilters({ filters, onChange, onClear }) {
  const toggle = (key, value) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <PillGroup legend="Level" options={LEVELS} selected={filters.levels} onToggle={(v) => toggle("levels", v)} />
      <PillGroup legend="Learning Mode" options={MODES} selected={filters.modes} onToggle={(v) => toggle("modes", v)} />
      <PillGroup
        legend="Duration"
        options={DURATION_BANDS}
        selected={filters.durationBands}
        onToggle={(v) => toggle("durationBands", v)}
      />
      <button
        type="button"
        onClick={onClear}
        className="self-end justify-self-start text-sm font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
      >
        Reset all
      </button>
    </div>
  );
}
