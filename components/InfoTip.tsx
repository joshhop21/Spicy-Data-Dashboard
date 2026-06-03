"use client";

type Props = {
  /** Plain-language explanation shown on hover / focus */
  text: string;
  /** Accessible label for the trigger */
  label?: string;
  className?: string;
};

/** Small (?) control — hover or focus shows a definition popup. */
export function InfoTip({ text, label = "What does this mean?", className = "" }: Props) {
  return (
    <span className={`group/info relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-[10px] font-semibold leading-none text-stone-500 transition hover:border-stone-400 hover:bg-white hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-spice-gold/40"
        aria-label={label}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-stone-600 shadow-lg group-hover/info:block group-focus-within/info:block sm:w-64"
      >
        {text}
        <span
          className="absolute left-1/2 top-full -mt-px -translate-x-1/2 border-4 border-transparent border-t-stone-200"
          aria-hidden
        />
      </span>
    </span>
  );
}
