import React from "react";
import Image from "next/image";

export const ChatCard = ({
  children,
  name = "Marsha Lenathea👾",
  avatarUrl = "/image/marsha.jpg",
  timestamp,
  showTime = true,
  modelName = "OpenClaw",
  modelLogo = "/logos/openclaw.svg",
  modelClassName = "text-white/60",
  modelUsageLabel,
}: {
  children: React.ReactNode;
  name?: string;
  avatarUrl?: string;
  timestamp?: number;
  showTime?: boolean;
  modelName?: string;
  modelLogo?: string;
  modelClassName?: string;
  modelUsageLabel?: string;
}) => {
  const formattedDate =
    showTime && timestamp
      ? new Date(timestamp).toLocaleDateString("en-US", {
          month: "long",
          day: "2-digit",
          year: "numeric",
        }) +
        " - " +
        new Date(timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "";

  return (
    <div className="flex gap-3">
      <Image
        src={avatarUrl}
        alt={`${name} profile`}
        width={40}
        height={40}
        className="w-10 h-10 object-cover rounded-md shrink-0"
      />

      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5 items-center w-[800px] font-mono">
          <p className="text-white text-sm">{name}</p>
          <p className="text-white text-sm">&middot;</p>
          <p className="text-white/50 text-xs" suppressHydrationWarning>
            {formattedDate}
          </p>
          <p className="text-white text-sm">&middot;</p>
          <div className="flex gap-1.5 items-center">
            <Image src={modelLogo} alt={`${modelName} logo`} width={14} height={14} className="w-3.5 h-3.5 rounded-sm" />
            <p className={`text-xs truncate ${modelClassName}`}>{modelUsageLabel ? `${modelName} | ${modelUsageLabel}` : modelName}</p>
          </div>
        </div>
        <div className="w-[700px] text-sm rounded-lg border border-border bg-surface-card p-2.5">{children}</div>
      </div>
    </div>
  );
};
