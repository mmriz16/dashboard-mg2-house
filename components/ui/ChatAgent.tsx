import React from "react";
import Image from "next/image";

import { useEffect, useState } from "react";

export const ChatCard = ({ children, name = "Marsha Lenathea👾", avatarUrl = "/image/marsha.jpg", timestamp, showTime = true, modelName = "Gemini 3 Flash" }: { children: React.ReactNode, name?: string, avatarUrl?: string, timestamp?: number, showTime?: boolean, modelName?: string }) => {
    const [mounted, setMounted] = useState(false);
    const [formattedDate, setFormattedDate] = useState<string>("");

    useEffect(() => {
        // eslint-disable-next-line
        setMounted(true);
        if (showTime) {
            const dateObj = timestamp ? new Date(timestamp) : new Date();
            setFormattedDate(
                dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: '2-digit',
                    year: 'numeric'
                }) + ' - ' + dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                })
            );
        }
    }, [timestamp, showTime]);

    return (
        <div className="flex gap-3">
            {/* Avatar */}
            <Image
                src={avatarUrl}
                alt={`${name} profile`}
                width={40}
                height={40}
                className="w-10 h-10 object-cover rounded-md shrink-0"
            />

            {/* Chat Content container */}
            <div className="flex flex-col gap-2">
                <div className="flex gap-1.5 items-center w-[800px] font-mono">
                    <p className="text-white text-sm">{name}</p>
                    <p className="text-white text-sm">&middot;</p>
                    <p className="text-white/50 text-xs" suppressHydrationWarning>{showTime ? (mounted ? formattedDate : "") : ""}</p>
                    <p className="text-white text-sm">&middot;</p>
                    <div className="flex gap-1.5 items-center">
                        <div className="w-4 h-4 shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                <path d="M12 2L14.4444 9.55556L22 12L14.4444 14.4444L12 22L9.55556 14.4444L2 12L9.55556 9.55556L12 2Z" fill="#3B82F6" />
                            </svg>
                        </div>
                        <p className="text-white/50 text-xs truncate">{modelName}</p>
                    </div>
                </div>
                <div className="w-[700px] text-sm rounded-lg border border-border bg-surface-card p-2.5">
                    {children}
                </div>
            </div>
        </div>
    );
};