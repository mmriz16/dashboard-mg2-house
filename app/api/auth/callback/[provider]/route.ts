import { proxyAuthRequest } from "@/lib/auth-proxy";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    provider: string;
  }>;
};

export async function GET(request: Request, context: Params) {
  const { provider } = await context.params;
  return proxyAuthRequest(request, `/api/auth/callback/${provider}`);
}

export async function POST(request: Request, context: Params) {
  const { provider } = await context.params;
  return proxyAuthRequest(request, `/api/auth/callback/${provider}`);
}
