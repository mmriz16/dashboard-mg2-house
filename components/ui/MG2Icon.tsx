import Image from "next/image";
import React from "react";

const ICON_MAP = {
  lock: "/icons/lock.svg",
  profile: "/icons/profile.svg",
  inbox: "/icons/inbox.svg",
  search: "/icons/search.svg",
  document: "/icons/document.svg",
  dashboard: "/icons/dashboard.svg",
  project: "/icons/project.svg",
  team: "/icons/team.svg",
  tasks: "/icons/tasks.svg",
  calendar: "/icons/calendar.svg",
  company: "/icons/company.svg",
  backward: "/icons/backward.svg",
  back: "/icons/back.svg",
  globe: "/icons/globe.svg",
  notifications: "/icons/notifications.svg",
  chats: "/icons/chats.svg",
  user: "/icons/user.svg",
  dropdown: "/icons/dropdown.svg",
  eye: "/icons/eye.svg",
  sort: "/icons/sort.svg",
  forward: "/icons/forward.svg",
  next: "/icons/next.svg",
  italic: "/icons/italic.svg",
  "align-left": "/icons/align-left.svg",
  bold: "/icons/bold.svg",
  "align-center": "/icons/align-center.svg",
  underline: "/icons/underline.svg",
  "align-right": "/icons/align-right.svg",
  send: "/icons/send.svg",
  "eye-off": "/icons/eye-off.svg",
} as const;

export type MG2IconName = keyof typeof ICON_MAP;

interface MG2IconProps {
  name: MG2IconName;
  size?: number;
  className?: string;
  alt?: string;
  decorative?: boolean;
}

export function MG2Icon({
  name,
  size = 24,
  className = "",
  alt,
  decorative = true,
}: MG2IconProps) {
  const src = ICON_MAP[name];
  const resolvedAlt = decorative ? "" : alt ?? name.replace(/-/g, " ");

  return (
    <Image
      src={src}
      alt={resolvedAlt}
      width={size}
      height={size}
      className={className}
      aria-hidden={decorative ? true : undefined}
    />
  );
}
