import React from 'react'

interface SidebarItemProps {
  icon?: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  badge?: string
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, 
  label, 
  active = false, 
  onClick,
  badge
}) => {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors group ${
        active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon && <div className="w-5 h-5">{icon}</div>}
        <span className="text-sm font-manrope font-medium">{label}</span>
      </div>
      {badge && (
        <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
          {badge}
        </span>
      )}
    </div>
  )
}
