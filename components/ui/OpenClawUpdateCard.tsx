"use client";

import { useEffect, useState } from "react";
import { Badge } from "./Badge";
import { Button } from "./Button";

interface ReleaseNote {
  emoji: string;
  text: string;
}

interface VersionInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  releaseNotes: ReleaseNote[];
  releaseBody?: string;
  checkedAt: number;
}

export function OpenClawUpdateCard() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkVersion = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/version", { cache: "no-store" });
      const data = await res.json();
      setVersion(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check version");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!confirm("Update OpenClaw to latest version?")) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/update", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Update failed");
      } else {
        alert("Update completed! Please refresh the page.");
        await checkVersion();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => { checkVersion(); }, []);

  const getEmoji = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes("security")) return "🛡️";
    if (lower.includes("secrets")) return "🔐";
    if (lower.includes("agent")) return "🤖";
    if (lower.includes("codex")) return "⚡";
    if (lower.includes("android") || lower.includes("app")) return "📱";
    if (lower.includes("cli") || lower.includes("command")) return "🔧";
    if (lower.includes("fix")) return "🔧";
    if (lower.includes("improv")) return "✨";
    return "•";
  };

  return (
    <div className="w-full max-w-md bg-surface-card rounded-2xl outline outline-border overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-red/20 to-transparent border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦞</span>
          <div>
            <div className="text-white font-manrope font-medium">OpenClaw {version?.current || "..."}</div>
            <div className="text-white/50 text-xs font-ibm-plex-mono">{version?.latest || "..."}</div>
          </div>
        </div>
        {version && (
          version.updateAvailable ? <Badge text="UPDATE" style="warning" /> : <Badge text="LATEST" style="success" />
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-white/50 text-sm font-ibm-plex-mono py-2">Checking version...</div>
        ) : error ? (
          <div className="text-red text-sm font-ibm-plex-mono py-2">Error: {error}</div>
        ) : version ? (
          <>
            {version.updateAvailable && version.releaseNotes && version.releaseNotes.length > 0 && (
              <div className="mb-4">
                <div className="text-white/50 text-xs font-ibm-plex-mono uppercase mb-2">Whats New</div>
                <ul className="space-y-1">
                  {version.releaseNotes.map((note, i) => (
                    <li key={i} className="text-white/80 text-sm font-manrope flex items-start gap-2">
                      <span className="text-red">{getEmoji(note.text)}</span>
                      <span>{note.text.length > 60 ? note.text.substring(0, 60) + "..." : note.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={checkVersion} disabled={updating} className="flex-1 text-xs">
                Refresh
              </Button>
              {version.updateAvailable && (
                <Button variant="primary" onClick={handleUpdate} disabled={updating} className="flex-1 text-xs bg-red hover:bg-red/80">
                  {updating ? "Updating..." : "Update"}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
