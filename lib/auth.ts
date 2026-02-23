import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

export const auth = betterAuth({
    database: db,
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
});
