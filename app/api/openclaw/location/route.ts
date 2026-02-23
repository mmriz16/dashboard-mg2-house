import { NextResponse } from "next/server";

type GeoResponse = {
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
};

function compact(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" • ");
}

export async function GET() {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          regionLabel: "UNKNOWN REGION",
          source: "geoip",
        },
        { status: 503 }
      );
    }

    const data = (await res.json()) as GeoResponse;

    const city = data.city?.trim();
    const region = data.region?.trim();
    const country = (data.country_name || data.country_code || "").trim();

    const regionLabel = compact([city, region, country]).toUpperCase() || "UNKNOWN REGION";

    return NextResponse.json({
      ok: true,
      regionLabel,
      source: "geoip",
      checkedAt: Date.now(),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        regionLabel: "UNKNOWN REGION",
        source: "geoip",
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
