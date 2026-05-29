import { CompanyDashboard } from "@/components/company/CompanyDashboard";

type PageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function CompanyPage({ params }: PageProps) {
  const { symbol } = await params;
  const normalized = symbol.trim().toUpperCase();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CompanyDashboard symbol={normalized} />
    </main>
  );
}
