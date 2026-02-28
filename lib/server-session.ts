import { headers } from "next/headers";

export async function getServerSession() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  if (!cookie) return null;

  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const proto = forwardedProto ?? (host?.includes("localhost") ? "http" : "https");

  const origin = process.env.BETTER_AUTH_URL ?? (host ? `${proto}://${host}` : undefined);
  if (!origin) return null;

  try {
    const response = await fetch(`${origin}/api/auth/get-session`, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as { session: unknown; user: { id?: string } };
  } catch {
    return null;
  }
}
