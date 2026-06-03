import { InfoTip } from "@/components/InfoTip";
import { LEGEND_DESCRIPTIONS } from "@/lib/glossary";
import { LEGEND_ITEMS } from "@/lib/tiles";

export function Legend() {
  return (
    <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-stone-200/80 pt-6">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2 text-xs text-muted">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
          {LEGEND_DESCRIPTIONS[item.label] && (
            <InfoTip text={LEGEND_DESCRIPTIONS[item.label]!} label={`About ${item.label}`} />
          )}
        </span>
      ))}
    </footer>
  );
}
