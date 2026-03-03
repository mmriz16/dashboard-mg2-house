"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { authClient, clearCachedSession } from "@/lib/auth-client";
import { usePathname, useRouter } from "next/navigation";

const titleByPath: Array<{ match: (path: string) => boolean; title: string; subtitle?: string }> = [
  { match: (path) => path.startsWith("/website"), title: "Website", subtitle: "Server" },
  { match: (path) => path.startsWith("/database"), title: "Database", subtitle: "Server" },
  { match: (path) => path.startsWith("/overview"), title: "Overview", subtitle: "Server" },
];

export default function ServerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  authClient.useSession();

  const [isGatewayOnline, setIsGatewayOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const response = await fetch("/api/oracle-gateway/status", { cache: "no-store" });
        const data = await response.json();
        const online = data?.status === "healthy" || data?.status === "warning";
        if (!cancelled) setIsGatewayOnline(Boolean(online));
      } catch {
        if (!cancelled) setIsGatewayOnline(false);
      }
    };

    void checkHealth();
    const intervalId = setInterval(() => {
      void checkHealth();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const handleLogout = async () => {
    clearCachedSession();
    await authClient.signOut();
    router.push("/login");
  };

  const activeTitle =
    titleByPath.find((entry) => entry.match(pathname)) ??
    ({ title: "Server", subtitle: "Dashboard" } as const);

  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar onLogout={handleLogout} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          title={activeTitle.title}
          subtitle={activeTitle.subtitle}
          systemOnline={isGatewayOnline}
          systemStatusLabel={isGatewayOnline ? "System Online" : "System Offline"}
        />
        <div className="p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
