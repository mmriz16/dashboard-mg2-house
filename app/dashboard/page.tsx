"use client";

import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { authClient, getCachedSession, clearCachedSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();
    const cached = getCachedSession();

    // Use cached session while fetching fresh data
    const displaySession = session || cached;

    const handleLogout = async () => {
        clearCachedSession();
        await authClient.signOut();
        router.push("/login");
    };

    if (isPending && !cached) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-surface">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                    <p className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-surface">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                <Topbar title="Dashboard" subtitle="Overview and key metrics" />
                <div className="flex flex-col gap-4 p-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-manrope font-medium text-white">Welcome back, Kaozi!</h1>
                        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">Here is what you need to know today</p>
                    </div>
                    <div className="flex flex-col gap-2.5 w-full">
                        <div className="flex gap-2.5 w-full">
                            <StatCard className="w-full" title="General Revenue" value="Rp 235,6 Mil" badgeText="+2.6%" />
                            <StatCard className="w-full" title="Total Orders" value="1.280" badgeText="-1.2%" badgeStyle="danger" />
                            <StatCard className="w-full" title="Active Users" value="3.450" />
                            <StatCard className="w-full" title="General Revenue" value="Rp 235,6 Mil" badgeText="+2.6%" />
                        </div>
                        {/* Welcome Card */}
                        <div className="w-full rounded-2xl border border-border bg-surface-card p-8">
                            <div className="flex flex-col gap-6">
                                {/* Header */}
                                <div className="flex flex-col gap-1">
                                    <p className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">Dashboard</p>
                                    <h1 className="text-2xl font-manrope font-bold text-white">
                                        Welcome back{displaySession?.user?.name ? `, ${displaySession.user.name}` : ""}! 👋
                                    </h1>
                                </div>

                                {/* User Info */}
                                <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/2 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white font-bold text-sm">
                                            {displaySession?.user?.name?.charAt(0)?.toUpperCase() || displaySession?.user?.email?.charAt(0)?.toUpperCase() || "?"}
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium text-white">
                                                {displaySession?.user?.name || "User"}
                                            </p>
                                            <p className="text-xs text-white/50 font-ibm-plex-mono">
                                                {displaySession?.user?.email || "No email"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-white/10"></div>

                                {/* Logout Button */}
                                <Button variant="white" onClick={handleLogout}>
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
