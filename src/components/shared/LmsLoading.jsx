import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Lightweight loading surface shared by the student and trainer areas'
 * `loading.jsx`. Mirrors the LMS shell's geometry (sidebar width, 64px
 * header, same main padding) so content doesn't jump when the real page
 * streams in. Static server markup — no client JS, no extra animation
 * beyond the Skeleton pulse.
 */
export function LmsLoading({ label = "Loading" }) {
  return (
    <div className="flex min-h-screen bg-surface" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>

      <aside aria-hidden="true" className="hidden h-screen w-64 flex-none flex-col gap-3 border-r border-border bg-white p-4 md:flex">
        <Skeleton className="h-8 w-40" />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div aria-hidden="true" className="flex h-16 flex-none items-center border-b border-border bg-white px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-5 w-40" />
        </div>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-7 w-56 max-w-full" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Card key={i} className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </Card>
              ))}
            </div>
            <Card className="flex flex-col gap-3">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
