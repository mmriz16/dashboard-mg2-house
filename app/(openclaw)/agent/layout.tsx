"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { authClient, clearCachedSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  authClient.useSession();
  const [isGatewayOnline, setIsGatewayOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const r = await fetch("/api/openclaw/health", { cache: "no-store" });
        if (!cancelled) setIsGatewayOnline(r.ok);
      } catch {
        if (!cancelled) setIsGatewayOnline(false);
      }
    };

    checkHealth();
    const id = setInterval(checkHealth, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleLogout = async () => {
    clearCachedSession();
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar onLogout={handleLogout} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          title="Agent Control"
          subtitle="OpenClaw"
          systemOnline={isGatewayOnline}
          systemStatusLabel={isGatewayOnline ? "System Online" : "System Offline"}
        />
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
