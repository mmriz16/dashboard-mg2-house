import { headers } from "next/headers";

export async function getServerSession() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  if (!cookie) return null;

  try {
    const originHeader = requestHeaders.get("origin");
    const hostHeader = requestHeaders.get("host");

    // Always fetch directly from localhost to avoid DNS/hairpin NAT timeout loops!
    const response = await fetch(`http://127.0.0.1:3000/api/auth/get-session`, {
      method: "GET",
      headers: {
        cookie,
        ...(hostHeader && { host: hostHeader }),
        ...(originHeader && { origin: originHeader }),
        "user-agent": requestHeaders.get("user-agent") || "Next.js Server",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as { session: unknown; user: { id?: string } };
  } catch (error) {
    console.error("getServerSession error:", error);
    return null;
  }
}
