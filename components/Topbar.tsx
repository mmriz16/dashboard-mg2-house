"use client";

import React from "react";
import { MG2Icon } from "@/components/ui/MG2Icon";

type TopbarProps = {
  title: string;
  subtitle?: string;
  regionLabel?: string;
  systemStatusLabel?: string;
  systemOnline?: boolean;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
};

function MenuIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function Topbar({
  title,
  subtitle,
  regionLabel,
  systemStatusLabel = "System Online",
  systemOnline = true,
  onMenuClick,
  onSearchClick,
  onNotificationsClick,
}: TopbarProps) {
  const breadcrumbTitle = title.toUpperCase();
  const breadcrumbPrefix = subtitle?.toUpperCase();
  const normalizedRegion = regionLabel?.trim().replace(/[•◆◇◈�]/g, "|");
  const isLocating = !normalizedRegion;

  return (
    <header className="flex items-center gap-2 md:gap-[10px] px-3 py-3 md:px-6 md:py-3 bg-surface-card border-b border-border shrink-0 max-w-full overflow-hidden">
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-surface text-white/80 hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <MenuIcon />
        </button>

        <div className="min-w-0 flex items-center gap-2 md:gap-[10px] font-ibm-plex-mono text-[11px] md:text-[12px] uppercase tracking-[0.01em]">
          <span className="shrink-0 text-white/50">/</span>
          {breadcrumbPrefix ? (
            <>
              <span className="truncate text-white/50 hidden sm:inline">{breadcrumbPrefix}</span>
              <span className="shrink-0 text-white/20 hidden sm:inline">/</span>
            </>
          ) : null}
          <h1 className="truncate text-yellow font-normal">{breadcrumbTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-[10px] shrink-0">
        <div className="flex items-center rounded-[8px] border border-border bg-surface p-1 shrink-0">
          <button
            type="button"
            aria-label="Search"
            onClick={onSearchClick}
            className="group inline-flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-surface-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <MG2Icon
              name="search"
              size={13}
              className="opacity-70 group-hover:opacity-100 transition-opacity"
            />
          </button>
          <div className="mx-[2px] h-4 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            aria-label="Notifications"
            onClick={onNotificationsClick}
            className="group inline-flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-surface-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <MG2Icon
              name="notifications"
              size={13}
              className="opacity-70 group-hover:opacity-100 transition-opacity"
            />
          </button>
        </div>

        <div className="sm:hidden flex h-8 items-center gap-1 rounded-[8px] border border-border bg-surface px-2 shrink-0">
          <span
            className={`size-1 rounded-full ${systemOnline ? "bg-green shadow-[0_0_8px_rgba(0,201,80,0.8)]" : "bg-red shadow-[0_0_8px_rgba(251,44,54,0.7)]"}`}
            aria-hidden="true"
          />
          <span className={`font-ibm-plex-mono text-[10px] uppercase ${systemOnline ? "text-green" : "text-red"}`}>
            {systemOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 md:gap-[10px] rounded-[8px] border border-border bg-surface px-3 py-2.5 shrink-0">
          {isLocating ? (
            <span className="inline-flex items-center gap-2 font-ibm-plex-mono text-[11px] md:text-[12px] uppercase text-white/60 whitespace-nowrap">
              <span className="size-2 rounded-full border border-white/40 border-t-white animate-spin" aria-hidden="true" />
              Locating...
            </span>
          ) : (
            <span className="font-ibm-plex-mono text-[11px] md:text-[12px] uppercase text-white/70 whitespace-nowrap">
              {normalizedRegion}
            </span>
          )}
          <div className="h-4 w-px bg-border" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <span
              className={`size-1 rounded-full ${systemOnline ? "bg-green shadow-[0_0_8px_rgba(0,201,80,0.8)]" : "bg-red shadow-[0_0_8px_rgba(251,44,54,0.7)]"}`}
              aria-hidden="true"
            />
            <span className={`font-ibm-plex-mono text-[11px] md:text-[12px] uppercase ${systemOnline ? "text-green" : "text-red"}`}>
              {systemStatusLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

