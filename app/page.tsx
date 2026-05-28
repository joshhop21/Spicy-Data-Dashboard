import { BtcLiquidityDashboard } from "@/components/additional/BtcLiquidityDashboard";
import { ChartTile } from "@/components/ChartTile";
import { Header } from "@/components/Header";
import { Legend } from "@/components/Legend";
import { TickerSearch } from "@/components/TickerSearch";
import { getAllChartData } from "@/lib/loadChartData";
import { getBtcLiquidityModel } from "@/lib/loadAdditionalData";
import { PHASE_1_TILES, PHASE_2_TILES } from "@/lib/tiles";
import type { TileConfig } from "@/lib/types";

function ChartSection({
  title,
  phase,
  tiles,
  chartData,
}: {
  title: string;
  phase: string;
  tiles: TileConfig[];
  chartData: ReturnType<typeof getAllChartData>;
}) {
  return (
    <section className="mt-10" aria-labelledby={`${phase}-heading`}>
      <div className="mb-5 border-b border-stone-200/80 pb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{phase}</p>
        <h2 id={`${phase}-heading`} className="font-serif text-2xl font-semibold text-ink">
          {title}
        </h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <ChartTile key={tile.slug} tile={tile} data={chartData[tile.slug]} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const chartData = getAllChartData();
  const btcLiquidity = getBtcLiquidityModel();

  const latestUpdate = Object.values(chartData)
    .map((d) => d.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Header lastUpdated={latestUpdate} />

      <div className="mt-8">
        <TickerSearch />
      </div>

      <ChartSection
        phase="Phase 1"
        title="Flagship signals"
        tiles={PHASE_1_TILES}
        chartData={chartData}
      />

      <ChartSection
        phase="Phase 2"
        title="Extended index"
        tiles={PHASE_2_TILES}
        chartData={chartData}
      />

      <section className="mt-12" aria-labelledby="additional-heading">
        <div className="mb-6 border-b border-stone-200/80 pb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Additional Requests</p>
          <h2 id="additional-heading" className="font-serif text-2xl font-semibold text-ink">
            Extra research modules
          </h2>
          <p className="mt-1 text-sm text-muted">
            Temporary section — phase headers will be reorganized later.
          </p>
        </div>
        <BtcLiquidityDashboard data={btcLiquidity} />
      </section>

      <Legend />
    </main>
  );
}
