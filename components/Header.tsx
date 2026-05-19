type HeaderProps = {
  lastUpdated?: string;
};

export function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className="flex flex-col gap-1 border-b border-stone-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          P&amp;C Research Visuals
        </p>
        <p className="mt-1 text-sm text-muted">Spicy Data Dashboard — Phase 1</p>
      </div>
      {lastUpdated && (
        <p className="text-xs text-muted sm:text-right">
          Last updated{" "}
          <time dateTime={lastUpdated} className="font-medium text-ink">
            {formatDisplayDate(lastUpdated)}
          </time>
        </p>
      )}
    </header>
  );
}

function formatDisplayDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
