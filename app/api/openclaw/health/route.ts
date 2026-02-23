import { NextResponse } from "next/server";

const OPENCLAW_BASE_URL =
  process.env.OPENCLAW_BASE_URL ||
  process.env.OPENCLAW_GATEWAY_URL ||
  "http://127.0.0.1:18789";

const OPENCLAW_GATEWAY_TOKEN =
  process.env.OPENCLAW_GATEWAY_TOKEN ||
  process.env.OPENCLAW_HOOKS_TOKEN ||
  "";

async function ping(path: string) {
  const url = `${OPENCLAW_BASE_URL.replace(/\/+$/, "")}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (OPENCLAW_GATEWAY_TOKEN) {
    headers.Authorization = `Bearer ${OPENCLAW_GATEWAY_TOKEN}`;
  }

  const res = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(3000),
    cache: "no-store",
  });

  return { ok: res.ok, status: res.status, url };
}

export async function GET() {
  try {
    const checks = await Promise.allSettled([ping("/health"), ping("/")]);

    const success = checks
      .filter((r): r is PromiseFulfilledResult<{ ok: boolean; status: number; url: string }> => r.status === "fulfilled")
      .find((r) => r.value.ok || (r.value.status >= 200 && r.value.status < 500));

    if (success) {
      return NextResponse.json({
        online: true,
        status: success.value.status,
        checkedUrl: success.value.url,
        checkedAt: Date.now(),
      });
    }

    return NextResponse.json(
      {
        online: false,
        checkedAt: Date.now(),
      },
      { status: 503 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      {
        online: false,
        error: e instanceof Error ? e.message : "Unknown error",
        checkedAt: Date.now(),
      },
      { status: 503 }
    );
  }
}
