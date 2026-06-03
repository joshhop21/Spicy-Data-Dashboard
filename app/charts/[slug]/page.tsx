import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoTip } from "@/components/InfoTip";
import { MiniChart } from "@/components/MiniChart";
import { getChartData } from "@/lib/loadChartData";
import { TILES } from "@/lib/tiles";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return TILES.map((t) => ({ slug: t.slug }));
}

export default async function ChartDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const tile = TILES.find((t) => t.slug === slug);
  const data = getChartData(slug);

  if (!tile) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        ← Back to dashboard
      </Link>

      <header className="mt-4 border-b border-stone-200 pb-6">
        <p className="text-2xl" aria-hidden>
          {tile.icon}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
          {tile.title}
          {tile.description && (
            <InfoTip text={tile.description} label={`About ${tile.title}`} />
          )}
        </h1>
        <p className="mt-1 text-muted">{tile.subtitle}</p>
        {data?.headline && (
          <p className="mt-3 text-lg font-semibold tabular-nums">
            {data.headline.value}{" "}
            <span
              className={
                data.headline.deltaPositive === false ? "text-spice-red" : "text-emerald-700"
              }
            >
              {data.headline.delta} {data.headline.deltaDate}
            </span>
          </p>
        )}
        {data?.updatedAt && (
          <p className="mt-2 text-xs text-muted">Data as of {data.updatedAt}</p>
        )}
      </header>

      {data?.constituents && data.constituents.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Constituents
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.constituents.map((c) => (
              <span
                key={c.ticker}
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium"
              >
                {c.ticker}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-stone-200 bg-card p-4 shadow-sm">
        {data?.points?.length ? (
          <MiniChart data={data} compact={false} />
        ) : (
          <p className="py-16 text-center text-sm text-muted">
            Chart data not loaded yet. Run the nightly GitHub Action or{" "}
            <code className="rounded bg-stone-100 px-1">python scripts/fetch_all.py</code> locally.
          </p>
        )}
      </section>

      {data?.constituents && data.constituents.length > 0 && (
        <section className="mt-8 overflow-x-auto">
          <h2 className="font-serif text-lg font-semibold">Constituents table</h2>
          <table className="mt-3 w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase text-muted">
                <th className="py-2 pr-4">Ticker</th>
                <th className="py-2 pr-4">Weight</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {data.constituents.map((row) => (
                <tr key={row.ticker} className="border-b border-stone-100">
                  <td className="py-2 font-medium">{row.ticker}</td>
                  <td className="py-2">{row.weight}</td>
                  <td className="py-2">{row.category}</td>
                  <td className="py-2">{row.status}</td>
                  <td className="py-2">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-10 space-y-6 text-sm leading-relaxed text-stone-700">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">Thesis</h2>
          <p className="mt-2">
            {data?.thesis ??
              "Thesis copy will be added when Jared shares chart notes. This placeholder keeps the layout ready."}
          </p>
        </div>
        {data?.sources && data.sources.length > 0 && (
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">Data sources</h2>
            <ul className="mt-2 list-inside list-disc">
              {data.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
