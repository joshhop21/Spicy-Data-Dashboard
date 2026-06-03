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
  tiles,
  chartData,
}: {
  title: string;
  tiles: TileConfig[];
  chartData: ReturnType<typeof getAllChartData>;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">{title}</h2>
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

      <ChartSection title="Flagship signals" tiles={PHASE_1_TILES} chartData={chartData} />

      <ChartSection title="Extended index" tiles={PHASE_2_TILES} chartData={chartData} />

      <section className="mt-12">
        <BtcLiquidityDashboard data={btcLiquidity} />
      </section>

      <Legend />
    </main>
  );
}
