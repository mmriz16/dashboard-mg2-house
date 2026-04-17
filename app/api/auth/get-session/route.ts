import { proxyAuthRequest } from "@/lib/auth-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyAuthRequest(request, "/api/auth/get-session");
}
