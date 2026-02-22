"use client";

import { MenuItem } from "@/components/MenuItem";
import { SubMenuItem } from "@/components/SubMenuItem";
import { ProfileCard } from "@/components/ProfileCard";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden md:flex md:flex-row">
            <div className="flex p-6 w-75 gap-4 flex-col h-screen border-r bg-surface-card border-border">
                <h1 className="text-2xl font-manrope font-medium text-white">MG2 House</h1>
                <div className="flex flex-col gap-2">
                    <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">control</h1>
                    <div className="flex flex-col gap-0.5">
                        <MenuItem variant="secondary" label="Virtual Office" />
                        <MenuItem variant="secondary" label="Notification" badgeText="99+" badgeStyle="warning" />
                        <Link href="/dashboard" className="w-full">
                            <MenuItem variant={pathname === "/dashboard" ? "primary" : "secondary"} label="Dashboard" />
                        </Link>
                        <Link href="/chat" className="w-full">
                            <MenuItem variant={pathname === "/chat" ? "primary" : "secondary"} label="Chat" />
                        </Link>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">Working Area</h1>
                    <div className="flex flex-col gap-0.5">
                        <MenuItem variant="secondary" label="Virtual Office" />
                        <div className="flex flex-col gap-0">
                            <SubMenuItem variant="secondary" label="Advanced AI Model Training" />
                            <SubMenuItem variant="secondary" label="Thorough AI Safety Testing" />
                            <SubMenuItem variant="secondary" label="Comprehensive AI Ethics Review" badgeText="99+" badgeStyle="default" />
                        </div>
                    </div>
                </div>
                <div className="mt-auto w-full">
                    <ProfileCard
                        className="w-full"
                        name="Miftakhul Rizky"
                        role="Owner"
                    />
                </div>
            </div>
        </div>
    );
}
