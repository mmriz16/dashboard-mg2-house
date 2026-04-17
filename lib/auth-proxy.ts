const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function getConvexSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
    process.env.CONVEX_SITE_URL ||
    "";

  if (!value) {
    throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not configured.");
  }

  return value.replace(/\/+$/, "");
}

function sanitizeHeaders(input: Headers) {
  const headers = new Headers(input);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  headers.set("accept-encoding", "application/json");
  headers.set("host", new URL(getConvexSiteUrl()).host);

  return headers;
}

export async function proxyAuthRequest(
  request: Request,
  upstreamPath: string,
): Promise<Response> {
  const url = `${getConvexSiteUrl()}${upstreamPath}`;
  const headers = sanitizeHeaders(request.headers);

  const upstreamRequest = new Request(url, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-expect-error Required for streaming request bodies in Node.
    duplex: "half",
    redirect: "manual",
  });

  const upstream = await fetch(upstreamRequest, {
    method: request.method,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstream.headers);
  const betterAuthCookie = upstream.headers.get("set-better-auth-cookie");

  if (betterAuthCookie) {
    responseHeaders.append("set-cookie", betterAuthCookie);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
