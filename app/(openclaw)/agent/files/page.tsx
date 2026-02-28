"use client";

import { useEffect, useState } from "react";

type ManagedFile = { path: string; updatedAt?: string };

export default function AgentFilesPage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<ManagedFile[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/control-center/files", { cache: "no-store" });
        const data = r.ok ? await r.json() : [];
        if (!cancelled) setFiles(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="text-white space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Agent Files</h1>
        <p className="text-white/60 mt-1">Managed files dari control center.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface-card p-4">
        {loading ? (
          <p className="text-white/60 text-sm">Memuat data...</p>
        ) : files.length === 0 ? (
          <p className="text-white/60 text-sm">Belum ada data file (cek gateway/API).</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/80">
            {files.map((file) => (
              <li key={file.path}>- {file.path}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
