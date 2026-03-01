import { handler } from "@/lib/auth-server";

/**
 * Hop-by-hop headers that must NOT be forwarded to upstream HTTP/2 endpoints.
 * Node.js 22+ (undici) strictly rejects these, causing
 * "TypeError: fetch failed – UND_ERR_INVALID_ARG invalid connection header"
 */
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

/**
 * Strip hop-by-hop headers from the incoming request so that
 * the proxy fetch to Convex (HTTP/2) doesn't fail on Node 22+.
 */
function sanitizeRequest(request: Request): Request {
    const headers = new Headers(request.headers);
    for (const h of HOP_BY_HOP_HEADERS) {
        headers.delete(h);
    }
    return new Request(request.url, {
        method: request.method,
        headers,
        body: request.body,
        // @ts-expect-error — duplex is required for streaming bodies in Node 18+
        duplex: "half",
    });
}

export async function GET(request: Request) {
    return handler.GET(sanitizeRequest(request));
}

export async function POST(request: Request) {
    return handler.POST(sanitizeRequest(request));
}
