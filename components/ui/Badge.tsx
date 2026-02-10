import React from 'react'

type BadgeStyle = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  text: string
  style?: BadgeStyle
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ text, style = 'default', className = '' }) => {
  const styles = {
    default: 'bg-[#B558FF]/10 text-[#B558FF] border-[#B558FF]/20',
    success: 'bg-[#00C950]/10 text-[#00C950] border-[#00C950]/20',
    warning: 'bg-[#F0B100]/10 text-[#F0B100] border-[#F0B100]/20',
    danger: 'bg-[#FB2C36]/10 text-[#FB2C36] border-[#FB2C36]/20',
    info: 'bg-[#00A6F4]/10 text-[#00A6F4] border-[#00A6F4]/20',
  }

  return (
    <span className={`px-[6px] py-[2px] rounded-full text-[10px] font-mono uppercase tracking-wider border ${styles[style]} ${className}`}>
      {text}
    </span>
  )
}
