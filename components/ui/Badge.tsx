import React from 'react'

type BadgeStyle = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  text: string
  style?: BadgeStyle
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ text, style = 'default', className = '' }) => {
  const styles = {
    default: 'bg-[#B558FF]/10 text-[#B558FF]',
    success: 'bg-[#00C950]/10 text-[#00C950]',
    warning: 'bg-[#F0B100]/10 text-[#F0B100]',
    danger: 'bg-[#FB2C36]/10 text-[#FB2C36]',
    info: 'bg-[#00A6F4]/10 text-[#00A6F4]',
  }

  return (
    <span className={`px-[6px] py-[2px] font-ibm-plex-mono rounded-full text-[10px] uppercase tracking-wider ${styles[style]} ${className}`}>
      {text}
    </span>
  )
}
