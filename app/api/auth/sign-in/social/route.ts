import { proxyAuthRequest } from "@/lib/auth-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/api/auth/sign-in/social");
}
