import { NextResponse } from "next/server";

type GeoResponse = {
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
};

function compact(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" | ");
}

export async function GET() {
  const serverIp = process.env.OPENCLAW_SERVER_PUBLIC_IP?.trim();
  const fallbackLabel =
    process.env.OPENCLAW_SERVER_REGION_LABEL?.trim().toUpperCase() ||
    "ORACLE SERVER";

  try {
    const geoUrl = serverIp
      ? `https://ipapi.co/${serverIp}/json/`
      : "https://ipapi.co/json/";

    const res = await fetch(geoUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({
        ok: true,
        regionLabel: fallbackLabel,
        source: "fallback",
        serverIp: serverIp || null,
        checkedAt: Date.now(),
      });
    }

    const data = (await res.json()) as GeoResponse;

    const city = data.city?.trim();
    const region = data.region?.trim();
    const country = (data.country_name || data.country_code || "").trim();

    const regionLabel = compact([city, region, country]).toUpperCase() || fallbackLabel;

    return NextResponse.json({
      ok: true,
      regionLabel,
      source: serverIp ? "geoip:server_ip" : "geoip:local_runtime",
      serverIp: serverIp || null,
      checkedAt: Date.now(),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      regionLabel: fallbackLabel,
      source: "fallback",
      serverIp: serverIp || null,
      checkedAt: Date.now(),
    });
  }
}

