import React from 'react'
import { Badge } from './ui/Badge'

interface SubMenuItemProps {
  label: string
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  badgeText?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

export const SubMenuItem: React.FC<SubMenuItemProps> = ({
  label,
  icon,
  rightIcon,
  badgeText,
  active = false,
  disabled = false,
  onClick
}) => {
  return (
    <div className="flex items-center w-[235px]">
      <div className="w-[16px] h-[40px] flex items-center justify-center">
        <div className="w-[8px] h-[1px] bg-white/10" />
      </div>
      <div 
        onClick={!disabled ? onClick : undefined}
        className={`
          flex-1 flex items-center gap-[10px] px-[10px] py-[8px] rounded-[8px] border h-[40px] transition-all cursor-pointer
          ${active ? 'bg-white/10 text-white border-white/10' : 'bg-[#111214] text-white/50 border-white/10 hover:bg-white/5 hover:text-white'}
          ${disabled ? 'opacity-20 cursor-not-allowed' : ''}
        `}
      >
        {icon && <div className="w-[16px] h-[16px] flex items-center justify-center">{icon}</div>}
        <span className="flex-1 text-[14px] font-manrope font-normal overflow-hidden text-ellipsis whitespace-nowrap">
          {label}
        </span>
        {badgeText && <Badge text={badgeText} style="default" />}
        {rightIcon && <div className="w-[16px] h-[16px] flex items-center justify-center">{rightIcon}</div>}
      </div>
    </div>
  )
}
