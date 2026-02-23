"use client";

import React from "react";

type TopbarProps = {
  title: string;
  subtitle?: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="flex items-center justify-between gap-3 p-4 md:p-6 bg-surface-card border-b border-border shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          aria-label="Open menu"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-white/5 text-white/80"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-white font-manrope text-lg md:text-2xl font-medium truncate">{title}</h1>
          {subtitle ? (
            <p className="text-white/50 font-ibm-plex-mono text-[11px] md:text-xs uppercase tracking-widest truncate">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <button
          type="button"
          aria-label="Search"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <div className="h-10 min-w-10 px-3 rounded-[10px] border border-border bg-white/5 text-white/90 text-sm font-manrope inline-flex items-center justify-center">
          MR
        </div>
      </div>
    </header>
  );
}
