import Link from "next/link";
import { MiniChart } from "./MiniChart";
import type { ChartDataFile, TileConfig } from "@/lib/types";

type ChartTileProps = {
  tile: TileConfig;
  data?: ChartDataFile;
};

export function ChartTile({ tile, data }: ChartTileProps) {
  const headline = data?.headline;
  const placeholder = !data?.points?.length;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-card shadow-sm transition hover:shadow-md">
      <div className="relative border-b border-stone-100 px-4 pb-3 pt-4">
        <Link
          href={`/charts/${tile.slug}`}
          className="absolute right-3 top-3 text-muted transition hover:text-ink"
          aria-label={`Open ${tile.title} detail`}
        >
          <ExpandIcon />
        </Link>

        <div className="flex gap-3 pr-8">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: `${tile.accentColor}18` }}
            aria-hidden
          >
            {tile.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-sm font-semibold leading-snug text-ink sm:text-base">
              {tile.title}
            </h3>
            <p className="text-xs text-muted">{tile.subtitle}</p>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-2">
          <div>
            {tile.status && (
              <span className="inline-block rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-stone-600">
                {tile.status}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums text-ink sm:text-2xl">
              {headline?.value ?? "—"}
            </p>
            {headline && (
              <p
                className={`text-xs font-medium tabular-nums ${
                  headline.deltaPositive === false ? "text-spice-red" : "text-emerald-700"
                }`}
              >
                {headline.delta} {headline.deltaDate}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-2 pb-3 pt-1">
        {placeholder ? (
          <div className="flex h-36 items-center justify-center text-xs text-muted">
            Data pending — nightly refresh
          </div>
        ) : (
          <MiniChart data={data} />
        )}
      </div>
    </article>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3h7v7M10 21H3v-7M21 3l-9 9M3 21l9-9" />
    </svg>
  );
}
