import React from 'react'

type BadgeStyle = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  text: string
  style?: BadgeStyle
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ text, style = 'default', className = '' }) => {
  const styles = {
    default: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${styles[style]} ${className}`}>
      {text}
    </span>
  )
}
