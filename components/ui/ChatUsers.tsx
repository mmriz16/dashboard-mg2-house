import React, { useEffect, useState } from "react";

export const ChatUsersCard = ({ children, timestamp, showTime = true }: { children: React.ReactNode, timestamp?: number, showTime?: boolean }) => {
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
        <div className="flex flex-col gap-1 items-end w-full">
            {showTime && (
                <p className="text-white/50 text-xs font-mono" suppressHydrationWarning>
                    {mounted ? formattedDate : ""}
                </p>
            )}
            <div
                className="max-w-175 w-fit p-2.5 rounded-lg border border-border flex items-center justify-center shrink-0"
                style={{
                    backgroundImage: "linear-gradient(90deg, rgba(240, 177, 0, 0.1) 0%, rgba(240, 177, 0, 0.1) 100%), linear-gradient(90deg, rgb(21, 22, 24) 0%, rgb(21, 22, 24) 100%)"
                }}
            >
                <div className="text-white text-sm w-full max-w-none break-words whitespace-pre-wrap">{children}</div>
            </div>
        </div>
    );
};