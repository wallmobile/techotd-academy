function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TrainerWelcomeSection({ name }) {
  const firstName = name.split(" ")[0];
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-dark sm:text-3xl">
        {greeting}, {firstName}
      </h2>
      <p className="mt-1.5 text-sm text-muted sm:text-base">
        Here&apos;s what&apos;s happening across your assigned batches.
      </p>
    </div>
  );
}
