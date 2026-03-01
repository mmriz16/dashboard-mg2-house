import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export const convex = new ConvexHttpClient(CONVEX_URL);
