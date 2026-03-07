import React from 'react'
import { Badge } from './ui/Badge'

type BadgeStyle = 'default' | 'success' | 'warning' | 'danger' | 'info'

type MenuItemVariant = 'primary' | 'secondary' | 'disabled'

interface MenuItemProps {
  label: string
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  badgeText?: string
  badgeStyle?: BadgeStyle
  variant?: MenuItemVariant
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
}

export const MenuItem: React.FC<MenuItemProps> = ({
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

  const variantStyles: Record<MenuItemVariant, string> = {
    primary:
      'bg-surface outline outline-border',
    secondary:
      'outline outline-transparent hover:bg-surface-hover',
    disabled:
      'opacity-20 outline outline-transparent cursor-not-allowed',
  }

  const activeStyle = active
    ? 'bg-surface outline outline-border'
    : ''

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      className={`
        w-full h-10 p-2 rounded-lg inline-flex justify-start items-center gap-2.5
        transition-all cursor-pointer
        ${isDisabled ? variantStyles.disabled : active ? activeStyle : variantStyles[variant]}
        ${className}
      `}
    >
      {icon && (
        <div className="w-4 h-4 flex items-center justify-center text-white">
          {icon}
        </div>
      )}
      <span className="flex-1 text-white text-sm font-normal font-manrope overflow-hidden text-ellipsis whitespace-nowrap">
        {label}
      </span>
      {badgeText && <Badge text={badgeText} style={badgeStyle} />}
      {rightIcon && (
        <div className="w-4 h-4 flex items-center justify-center text-white">
          {rightIcon}
        </div>
      )}
    </div>
  )
}
