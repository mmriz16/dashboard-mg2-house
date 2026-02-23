"use client";

import React from "react";

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

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.75" />
      <line x1="20" y1="20" x2="16.4" y2="16.4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

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
  regionLabel = "INDONESIA-NORTH-(BATAM)",
  systemStatusLabel = "System Online",
  systemOnline = true,
  onMenuClick,
  onSearchClick,
  onNotificationsClick,
}: TopbarProps) {
  const breadcrumbTitle = title.toUpperCase();
  const breadcrumbPrefix = subtitle?.toUpperCase();

  return (
    <header className="flex items-center gap-2 md:gap-[10px] px-3 py-3 md:px-6 md:py-3 bg-surface-card border-b border-border shrink-0">
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-white/70 hover:bg-surface-card hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <SearchIcon />
          </button>
          <div className="mx-[2px] h-4 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            aria-label="Notifications"
            onClick={onNotificationsClick}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-white/70 hover:bg-surface-card hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <BellIcon />
          </button>
        </div>

        <div className="sm:hidden flex items-center gap-1 rounded-[8px] border border-border bg-surface px-2 py-1.5 shrink-0">
          <span
            className={`size-1 rounded-full ${systemOnline ? "bg-green shadow-[0_0_8px_rgba(0,201,80,0.8)]" : "bg-red shadow-[0_0_8px_rgba(251,44,54,0.7)]"}`}
            aria-hidden="true"
          />
          <span className={`font-ibm-plex-mono text-[10px] uppercase ${systemOnline ? "text-green" : "text-red"}`}>
            {systemOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 md:gap-[10px] rounded-[8px] border border-border bg-surface px-3 py-2.5 shrink-0">
          <span className="font-ibm-plex-mono text-[11px] md:text-[12px] uppercase text-white/70 truncate max-w-[26ch]">
            {regionLabel}
          </span>
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
