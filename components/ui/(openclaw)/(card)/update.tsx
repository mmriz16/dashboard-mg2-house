"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const DEFAULT_PREVIEW_IMAGE = "https://www.figma.com/api/mcp/asset/8e8a081b-251b-4b97-9708-72cdad457fa9";
const DEFAULT_PREVIEW_LINK = "https://github.com/openclaw/openclaw/releases/tag/v2026.2.26";
const DEFAULT_X_POST_URL = "https://x.com/openclaw";
const RELEASES_URL = "https://github.com/openclaw/openclaw/releases";
const RELEASES_LATEST_API = "https://api.github.com/repos/openclaw/openclaw/releases/latest";

interface ReleaseNote {
  icon: string;
  text: string;
}

interface UpdateCardProps {
  className?: string;
  title?: string;
  subtitle?: string;
  currentVersion?: string;
  notes?: ReleaseNote[];
  previewImageUrl?: string;
  previewLink?: string;
  xPostUrl?: string;
  onAction?: () => void;
}

function PowerIcon() {
  return (
    <Image src="/icons/download.svg" alt="Update" width={16} height={16} className="size-4" aria-hidden="true" />
  );
}

function resolveGithubReleasePreview(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("github.com")) return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 5) return null;
    if (segments[2] !== "releases" || segments[3] !== "tag") return null;

    const owner = segments[0];
    const repo = segments[1];
    const tag = segments.slice(4).join("/");
    if (!owner || !repo || !tag) return null;

    const sanitizedTag = tag.replace(/[^a-zA-Z0-9.-]/g, "");
    return `https://opengraph.githubassets.com/openclaw-${sanitizedTag}/${owner}/${repo}/releases/tag/${tag}`;
  } catch {
    return null;
  }
}

function normalizeVersion(value: string): string {
  return value.trim().toLowerCase().replace(/^v/, "");
}

function compareVersions(a: string, b: string): number {
  const aParts = normalizeVersion(a).split(/[^0-9]+/).filter(Boolean).map(Number);
  const bParts = normalizeVersion(b).split(/[^0-9]+/).filter(Boolean).map(Number);
  const length = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < length; index += 1) {
    const aValue = aParts[index] ?? 0;
    const bValue = bParts[index] ?? 0;
    if (aValue > bValue) return 1;
    if (aValue < bValue) return -1;
  }

  return 0;
}

function extractVersionFromText(text: string): string | null {
  const match = text.match(/v?\d{4}\.\d{1,2}\.\d{1,2}/i);
  return match?.[0] || null;
}

function extractXSource(url: string): { tweetId?: string; username?: string } {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("x.com") && !parsed.hostname.includes("twitter.com")) return {};

    const segments = parsed.pathname.split("/").filter(Boolean);
    const statusIndex = segments.findIndex((segment) => segment === "status");
    if (statusIndex >= 0) {
      const tweetId = segments[statusIndex + 1];
      return tweetId ? { tweetId } : {};
    }

    const username = segments[0];
    if (!username) return {};
    return { username };
  } catch {
    return {};
  }
}

export function UpdateCard({
  className = "",
  title,
  subtitle,
  currentVersion = "2026.02.26",
  notes = [],
  previewImageUrl,
  previewLink = DEFAULT_PREVIEW_LINK,
  xPostUrl = DEFAULT_X_POST_URL,
  onAction,
}: UpdateCardProps) {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [latestReleaseUrl, setLatestReleaseUrl] = useState<string>(RELEASES_URL);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [xNotes, setXNotes] = useState<ReleaseNote[] | null>(null);
  const [xPreviewImage, setXPreviewImage] = useState<string | null>(null);
  const [xVersion, setXVersion] = useState<string | null>(null);
  const xSource = useMemo(() => extractXSource(xPostUrl), [xPostUrl]);

  useEffect(() => {
    let cancelled = false;

    fetch(RELEASES_LATEST_API, {
      headers: {
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { tag_name?: string; html_url?: string };
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.tag_name === "string" && data.tag_name.trim()) {
          setLatestVersion(data.tag_name.trim());
        }
        if (typeof data.html_url === "string" && data.html_url.trim()) {
          setLatestReleaseUrl(data.html_url.trim());
        }
      })
      .catch(() => {
        // Keep defaults when GitHub API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!xSource.tweetId && !xSource.username) return;

    let cancelled = false;
    const query = new URLSearchParams();
    if (xSource.tweetId) query.set("tweetId", xSource.tweetId);
    if (xSource.username) query.set("username", xSource.username);

    fetch(`/api/openclaw/x-release?${query.toString()}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          notes?: Array<{ icon?: string; text?: string }>;
          previewImageUrl?: string;
          rawText?: string;
        };
      })
      .then((payload) => {
        if (cancelled || !payload) return;

        if (Array.isArray(payload.notes) && payload.notes.length > 0) {
          const normalizedNotes = payload.notes
            .map((item) => ({ icon: item.icon?.trim() || "", text: item.text?.trim() || "" }))
            .filter((item) => item.text.length > 0);

          setXNotes(normalizedNotes.length > 0 ? normalizedNotes : []);
        } else {
          setXNotes([]);
        }

        if (typeof payload.previewImageUrl === "string" && payload.previewImageUrl.trim().length > 0) {
          setXPreviewImage(payload.previewImageUrl.trim());
        }

        setXVersion(extractVersionFromText(payload.rawText || ""));
      })
      .catch(() => {
        setXNotes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [xSource]);

  const isUpdateAvailable = useMemo(() => {
    if (!latestVersion) return false;
    return compareVersions(latestVersion, currentVersion) > 0;
  }, [currentVersion, latestVersion]);

  const isLoadingReleaseNotes = Boolean((xSource.tweetId || xSource.username) && xNotes === null);
  const syncedVersion = normalizeVersion(latestVersion || currentVersion);
  const resolvedTitle = title || `Openclaw ${syncedVersion}`;
  const resolvedSubtitle = subtitle || syncedVersion;
  const isXSyncedWithGithub = Boolean(
    latestVersion &&
    xVersion &&
    normalizeVersion(latestVersion) === normalizeVersion(xVersion)
  );
  const notesToRender = isXSyncedWithGithub && xNotes && xNotes.length > 0 ? xNotes : notes;
  const resolvedPreviewSrc =
    resolveGithubReleasePreview(latestReleaseUrl) ||
    (isXSyncedWithGithub ? xPreviewImage : null) ||
    resolveGithubReleasePreview(previewLink) ||
    previewImageUrl ||
    DEFAULT_PREVIEW_IMAGE;

  const [displayedPreviewSrc, setDisplayedPreviewSrc] = useState(resolvedPreviewSrc);

  useEffect(() => {
    if (resolvedPreviewSrc === displayedPreviewSrc) return;

    // Never downgrade from a real preview to the default fallback image.
    const isCurrentReal = displayedPreviewSrc !== DEFAULT_PREVIEW_IMAGE;
    const isNewDefault = resolvedPreviewSrc === DEFAULT_PREVIEW_IMAGE;
    if (isCurrentReal && isNewDefault) return;

    const img = new window.Image();
    let cancelled = false;

    img.onload = () => {
      if (!cancelled) setDisplayedPreviewSrc(resolvedPreviewSrc);
    };
    img.onerror = () => {
      // New URL failed to load — keep showing the current displayedPreviewSrc.
    };
    img.src = resolvedPreviewSrc;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [resolvedPreviewSrc]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section
      className={`w-full h-full min-h-0 flex flex-col overflow-hidden rounded-[14px] border border-border bg-surface-card p-1 ${className}`}
    >
      <div className="rounded-[10px] bg-gradient-to-r from-[#FB2C36]/10 to-transparent px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-1.5 sm:gap-2">
        <p className="text-[24px] sm:text-[38px] leading-none shrink-0">{"\uD83E\uDD9E"}</p>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm sm:text-base text-white leading-none">{resolvedTitle}</h2>
          <p className="mt-1 text-[10px] sm:text-xs text-white/50 leading-none font-ibm-plex-mono">{resolvedSubtitle}</p>
        </div>
        {isUpdateAvailable ? (
          <button
            type="button"
            className="flex items-center justify-center gap-[10px] rounded-[8px] bg-[rgba(0,201,80,0.1)] px-[12px] py-[12px] text-[#00C950] transition-all hover:bg-[rgba(0,201,80,0.2)] active:scale-[0.98] shrink-0"
            onClick={async () => {
              if (onAction) {
                onAction();
                return;
              }

              try {
                const res = await fetch("/api/openclaw/update", { method: "POST" });
                const data = await res.json();

                if (data?.success) {
                  setAlertMessage("Command executed successfully.");
                } else {
                  setAlertMessage("Command failed: " + (data?.error || "Unknown error"));
                }
              } catch (e) {
                setAlertMessage("Request failed: " + ((e instanceof Error) ? e.message : "Unknown error"));
              }
            }}
            aria-label="Open latest OpenClaw release"
          >
            <PowerIcon />
          </button>
        ) : (
          <Badge text="LATEST" style="success" className="shrink-0 h-4 px-[6px] py-0 leading-[16px]" />
        )}
      </div>

      <div className="rounded-[10px] flex min-h-0 flex-1 flex-col justify-between">
        {isLoadingReleaseNotes ? (
          <div className="p-2 text-xs sm:text-sm text-white/60">Getting Release Note...</div>
        ) : notesToRender.length > 0 ? (
          <ul className="space-y-1.5 p-2">
            {notesToRender.map((note) => (
              <li key={`${note.icon}-${note.text}`} className="flex items-start gap-1 text-xs sm:text-sm text-white">
                {note.icon ? <span className="shrink-0">{note.icon}</span> : null}
                <span className="break-words min-w-0">{note.text}</span>
              </li>
            ))}
          </ul>
        ) : !isXSyncedWithGithub && xVersion ? (
          <div className="p-2 text-xs sm:text-sm text-white/60">Waiting for synced X release notes for {normalizeVersion(latestVersion || "")}.</div>
        ) : (
          <div className="p-2 text-xs sm:text-sm text-white/60">No release notes available.</div>
        )}

        <div className="aspect-[564/295] overflow-hidden rounded-[10px]">
          <a href={latestReleaseUrl} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayedPreviewSrc}
              alt="OpenClaw release preview"
              className="h-full w-full object-cover"
            />
          </a>
        </div>
      </div>

      {alertMessage && (
        <AlertOverlay message={alertMessage} onClose={() => setAlertMessage(null)} />
      )}
    </section>
  );
}

function AlertOverlay({ message, onClose }: { message: string, onClose: () => void }) {
  const [hostname, setHostname] = useState<string>("dashboard");

  useEffect(() => {
    setHostname(window.location.host);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 px-4">
      <div
        className="w-full max-w-[460px] rounded-[12px] border border-[#2D2E3A] bg-[#1a1b26] shadow-2xl p-6 sm:p-7 zoom-in-95 animate-in duration-200 flex flex-col gap-6"
        role="dialog"
        aria-modal="true"
      >
        <div>
          <div className="flex items-center gap-2 mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="size-5 text-white/90" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <span className="text-white text-[15px] font-semibold tracking-wide">
              {hostname}
            </span>
          </div>
          <p className="text-white text-[15px] leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-3 h-[40px] px-5 rounded-[8px] bg-[#4C55FF] hover:bg-[#3E47EB] text-white text-[14px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#4C55FF]/50"
            onClick={onClose}
          >
            <span>OK</span>
            <span className="flex items-center justify-center p-0.5 px-1 border border-white/30 rounded-[4px] bg-white/10">
              <svg viewBox="0 0 24 24" fill="none" className="size-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 10l-5 5 5 5" />
                <path d="M20 4v7a4 4 0 0 1-4 4H4" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateCard;
