import React from 'react'
import { Badge } from './Badge'

type BadgeStyle = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface StatCardProps {
    title: string
    value: string
    badgeText?: string
    badgeStyle?: BadgeStyle
    className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    badgeText,
    badgeStyle = 'success',
    className = '',
}) => {
    return (
        <div
            className={`self-stretch p-1 bg-surface-card rounded-2xl outline outline-border inline-flex flex-col justify-start items-start overflow-hidden ${className}`}
        >
            {/* Header: Title + Badge */}
            <div className="self-stretch px-4 py-2.5 inline-flex justify-between items-center">
                <div className="text-white text-sm font-normal font-manrope">
                    {title}
                </div>
                {badgeText && (
                    <Badge text={badgeText} style={badgeStyle} />
                )}
            </div>

            {/* Value */}
            <div className="self-stretch p-4 bg-surface rounded-[10px] inline-flex justify-start items-center gap-2.5">
                <div className="text-white text-2xl font-normal font-ibm-plex-mono">
                    {value}
                </div>
            </div>
        </div>
    )
}
