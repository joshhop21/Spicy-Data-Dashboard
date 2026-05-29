import { NextRequest, NextResponse } from "next/server";
import { searchMetrics } from "@/lib/company-metrics-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = searchMetrics(q).map((m) => ({
    id: m.id,
    label: m.label,
    subtitle: m.subtitle,
    icon: m.icon,
    accentColor: m.accentColor,
    format: m.format,
    keywords: m.keywords,
  }));
  return NextResponse.json({ results });
}
