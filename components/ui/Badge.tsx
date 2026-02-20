import React from 'react'

type BadgeStyle = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  text: string
  style?: BadgeStyle
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ text, style = 'default', className = '' }) => {
  const styles = {
    default: 'bg-purple/10 text-purple',
    success: 'bg-green/10 text-green',
    warning: 'bg-yellow/10 text-yellow',
    danger: 'bg-red/10 text-red',
    info: 'bg-blue/10 text-blue',
  }

  return (
    <span className={`px-[6px] py-[2px] font-ibm-plex-mono rounded-full text-[10px] uppercase tracking-wider ${styles[style]} ${className}`}>
      {text}
    </span>
  )
}
