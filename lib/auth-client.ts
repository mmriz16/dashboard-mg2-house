import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    fetchOptions: {
        onSuccess: (ctx) => {
            if (ctx.response.url.includes("/get-session")) {
                const data = ctx.data;
                if (data) {
                    localStorage.setItem("better-auth-session", JSON.stringify(data));
                }
            }
        },
    },
});

/**
 * Get cached session from localStorage for instant rendering.
 * Falls back to null if no cached session exists.
 */
export function getCachedSession() {
    if (typeof window === "undefined") return null;
    try {
        const cached = localStorage.getItem("better-auth-session");
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

/**
 * Clear cached session from localStorage (call on logout).
 */
export function clearCachedSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("better-auth-session");
}

