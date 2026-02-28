'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface ProfileCardProps {
    name: string
    role: string
    avatarUrl?: string
    onClick?: () => void
    onMenuClick?: () => void
    onLogout?: () => void
    className?: string
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
    name,
    role,
    avatarUrl,
    onClick,
    onMenuClick,
    onLogout,
    className = '',
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuContainerRef = useRef<HTMLDivElement>(null)

    // Generate initials from name (e.g. "Miftakhul Rizky" -> "MR")
    const initials = name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')

    useEffect(() => {
        if (!isMenuOpen) return

        const handlePointerDown = (event: MouseEvent) => {
            if (!menuContainerRef.current?.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isMenuOpen])

    return (
        <div
            onClick={onClick}
            className={`
        self-stretch p-1 bg-surface rounded-[8px]
        border border-border
        inline-flex justify-between items-center
        gap-2.5
        ${className}
      `}
        >
            {/* Left: Avatar + Info */}
            <div className="min-w-0 flex flex-1 justify-start items-center gap-2.5">
                {avatarUrl ? (
                    <Image
                        className="h-[52px] w-[52px] rounded-[4px] object-cover shrink-0"
                        src={avatarUrl}
                        alt={name}
                        width={52}
                        height={52}
                    />
                ) : (
                    <div className="h-[52px] w-[52px] rounded-[4px] bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-white text-sm font-medium font-manrope">
                            {initials}
                        </span>
                    </div>
                )}
                <div className="min-w-0 inline-flex flex-col justify-start items-start leading-none">
                    <span className="max-w-full truncate text-white text-[16px] font-medium font-manrope leading-[1.2]">
                        {name}
                    </span>
                    <span className="max-w-full truncate text-white/50 text-[14px] font-normal font-ibm-plex-mono uppercase leading-[1.2] mt-0.5">
                        {role}
                    </span>
                </div>
            </div>

            {/* Right: Three-dot vertical menu */}
            <div ref={menuContainerRef} className="relative shrink-0 self-stretch">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsMenuOpen((prev) => !prev)
                        onMenuClick?.()
                    }}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    className="h-full w-5 rounded-[4px] bg-surface-card inline-flex flex-col justify-center items-center gap-1 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                    <div className="w-[3px] h-[3px] bg-white/50 rounded-full" />
                    <div className="w-[3px] h-[3px] bg-white/50 rounded-full" />
                    <div className="w-[3px] h-[3px] bg-white/50 rounded-full" />
                </button>

                {isMenuOpen && onLogout ? (
                    <div
                        role="menu"
                        className="absolute right-0 bottom-full mb-2 min-w-32 rounded-[8px] border border-border bg-surface-card p-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)] z-20"
                    >
                        <button
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsMenuOpen(false)
                                onLogout()
                            }}
                            className="w-full rounded-md px-3 py-2 text-left text-sm font-manrope text-red hover:bg-red/10 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
