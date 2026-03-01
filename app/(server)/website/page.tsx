"use client";

import { useEffect, useState } from "react";
import {
    authClient,
    clearCachedSession,
} from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { SidebarWrapper as Sidebar } from "@/components/SidebarWrapper";
import { Topbar } from "@/components/Topbar";

export default function DashboardPage() {
    const router = useRouter();
    authClient.useSession();
    const [isGatewayOnline, setIsGatewayOnline] = useState(true);
    const REGION_CACHE_KEY = "mg2_region_label";
    const [regionLabel, setRegionLabel] = useState(() => {
        if (typeof window === "undefined") return "";
        try {
            return localStorage.getItem(REGION_CACHE_KEY)?.trim() || "";
        } catch {
            return "";
        }
    });

    useEffect(() => {
        let cancelled = false;

        const checkHealth = async () => {
            try {
                const r = await fetch("/api/openclaw/health", { cache: "no-store" });
                if (cancelled) return;
                setIsGatewayOnline(r.ok);
            } catch {
                if (!cancelled) setIsGatewayOnline(false);
            }
        };

        const checkLocation = async () => {
      try {
        const r = await fetch("/api/openclaw/location", { cache: "no-store" });
        const data = (await r.json()) as { regionLabel?: string };
        if (cancelled) return;
        if (typeof data?.regionLabel === "string" && data.regionLabel.trim()) {
          const normalized = data.regionLabel.trim();
          setRegionLabel(normalized);
          try {
            localStorage.setItem(REGION_CACHE_KEY, normalized);
          } catch {
            // ignore cache write error
          }
        }
      } catch {
        // keep fallback label
      }
    };
    checkHealth();
        checkLocation();
        const healthId = setInterval(checkHealth, 15000);
        const locationId = setInterval(checkLocation, 300000);

        return () => {
            cancelled = true;
            clearInterval(healthId);
            clearInterval(locationId);
        };
    }, []);


    const handleLogout = async () => {
        clearCachedSession();
        await authClient.signOut();
        router.push("/login");
    };

    return (
        <div className="flex h-screen w-full bg-surface">
            {/* Sidebar */}
            <Sidebar onLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                <Topbar
                    title="Website"
                    subtitle="Server"
                    regionLabel={regionLabel}
                    systemOnline={isGatewayOnline}
                    systemStatusLabel={
                        isGatewayOnline ? "System Online" : "System Offline"
                    }
                />
                <div className="flex flex-col gap-4 p-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-manrope font-medium text-white">
                            Website Management
                        </h1>
                        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
                            Manage your website
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}





