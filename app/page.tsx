import { ChartTile } from "@/components/ChartTile";
import { Header } from "@/components/Header";
import { Legend } from "@/components/Legend";
import { TickerSearch } from "@/components/TickerSearch";
import { getAllChartData } from "@/lib/loadChartData";
import { TILES } from "@/lib/tiles";

export default function HomePage() {
  const chartData = getAllChartData();

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

      <section className="mt-10" aria-label="Research charts">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {TILES.map((tile) => (
            <ChartTile key={tile.slug} tile={tile} data={chartData[tile.slug]} />
          ))}
        </div>
      </section>

      <Legend />
    </main>
  );
}
