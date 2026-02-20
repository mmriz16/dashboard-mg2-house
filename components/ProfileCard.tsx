'use client'

import React from 'react'
import Image from 'next/image'

interface ProfileCardProps {
    name: string
    role: string
    avatarUrl?: string
    onClick?: () => void
    onMenuClick?: () => void
    className?: string
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
    name,
    role,
    avatarUrl,
    onClick,
    onMenuClick,
    className = '',
}) => {
    // Generate initials from name (e.g. "Miftakhul Rizky" -> "MR")
    const initials = name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')

    return (
        <div
            onClick={onClick}
            className={`
        self-stretch p-1 bg-surface rounded-lg
        border border-border
        inline-flex justify-between items-center
        ${className}
      `}
        >
            {/* Left: Avatar + Info */}
            <div className="flex justify-start items-center gap-2.5">
                {avatarUrl ? (
                    <Image
                        className="w-12 h-12 rounded object-cover"
                        src={avatarUrl}
                        alt={name}
                        width={48}
                        height={48}
                    />
                ) : (
                    <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center">
                        <span className="text-white text-sm font-medium font-manrope">
                            {initials}
                        </span>
                    </div>
                )}
                <div className="inline-flex flex-col justify-start items-start">
                    <span className="text-white text-base font-medium font-manrope">
                        {name}
                    </span>
                    <span className="text-white/50 text-sm font-normal font-ibm-plex-mono uppercase">
                        {role}
                    </span>
                </div>
            </div>

            {/* Right: Three-dot vertical menu */}
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onMenuClick?.()
                }}
                className="w-5 self-stretch px-1.5 py-2.5 bg-neutral-900 rounded inline-flex flex-col justify-center items-center gap-1 hover:bg-white/5 transition-colors cursor-pointer"
            >
                <div className="w-0.75 h-0.75 bg-white/50 rounded-full" />
                <div className="w-0.75 h-0.75 bg-white/50 rounded-full" />
                <div className="w-0.75 h-0.75 bg-white/50 rounded-full" />
            </button>
        </div>
    )
}
