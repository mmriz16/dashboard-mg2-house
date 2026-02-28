import { StatCard } from "@/components/ui/StatCard";

export default function AgentOverviewPage() {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">Agent Overview</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Ringkasan cepat status Agent Control
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        <div className="flex gap-2.5 w-full flex-wrap">
          <StatCard className="w-full xl:flex-1" title="Active Sessions" value="12" badgeText="+2" />
          <StatCard className="w-full xl:flex-1" title="Running Subagents" value="3" />
          <StatCard className="w-full xl:flex-1" title="Healthy Cron Jobs" value="4/5" badgeText="stable" />
          <StatCard className="w-full xl:flex-1" title="Managed Files" value="28" />
        </div>
      </div>
    </main>
  );
}
