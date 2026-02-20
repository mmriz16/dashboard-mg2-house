'use client'

import React from 'react'
import { Badge } from './ui/Badge'

type SubMenuItemVariant = 'primary' | 'secondary' | 'disabled'
type BadgeStyle = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface SubMenuItemProps {
  label: string
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  badgeText?: string
  badgeStyle?: BadgeStyle
  variant?: SubMenuItemVariant
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
}

export const SubMenuItem: React.FC<SubMenuItemProps> = ({
  label,
  icon,
  rightIcon,
  badgeText,
  badgeStyle = 'default',
  variant = 'primary',
  active = false,
  disabled = false,
  onClick,
  className = '',
}) => {
  const isDisabled = disabled || variant === 'disabled'

  const variantStyles: Record<SubMenuItemVariant, string> = {
    primary:
      'bg-surface outline outline-border',
    secondary:
      'outline outline-transparent hover:bg-surface-hover',
    disabled:
      'opacity-20 outline outline-transparent cursor-not-allowed',
  }

  const activeStyle = 'bg-surface outline outline-border'

  return (
    <div className={`w-60 pl-4 inline-flex flex-col justify-start items-start gap-2.5 ${className}`}>
      <div className="self-stretch border-l border-border inline-flex justify-start items-center">
        {/* Horizontal connector line */}
        <div className="w-2 h-0 outline outline-offset-[-0.50px] outline-border" />

        {/* Menu item content */}
        <div
          onClick={!isDisabled ? onClick : undefined}
          className={`
            flex-1 h-10 pl-2.5 pr-2 py-2 rounded-lg flex justify-start items-center gap-2.5
            transition-all cursor-pointer
            ${isDisabled ? variantStyles.disabled : active ? activeStyle : variantStyles[variant]}
          `}
        >
          {icon && (
            <div className="w-4 h-4 flex items-center justify-center text-white">
              {icon}
            </div>
          )}
          <span className="flex-1 text-white text-sm font-normal font-manrope line-clamp-1">
            {label}
          </span>
          {badgeText && <Badge text={badgeText} style={badgeStyle} />}
          {rightIcon && (
            <div className="w-4 h-4 flex items-center justify-center text-white">
              {rightIcon}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
