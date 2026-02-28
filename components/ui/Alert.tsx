import React from 'react'

type AlertVariant = 'warning' | 'info' | 'success' | 'danger'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  message?: string
  icon?: React.ReactNode
}

const AlertIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 10V16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <circle cx="12" cy="7.5" fill="currentColor" r="1" />
    </svg>
  )
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'warning',
  message,
  icon,
  className = '',
  children,
  role = 'alert',
  ...props
}) => {
  const styles = {
    warning: 'bg-yellow/10 border-yellow/10 text-yellow',
    info: 'bg-blue/10 border-blue/10 text-blue',
    success: 'bg-green/10 border-green/10 text-green',
    danger: 'bg-red/10 border-red/10 text-red',
  }

  const content = children ?? message ?? 'Please input text first!'
  const isTextContent = typeof content === 'string' || typeof content === 'number'

  return (
    <div
      className={`w-full rounded-[8px] border px-[10px] py-[10px] flex items-center justify-center gap-[10px] ${styles[variant]} ${className}`}
      role={role}
      {...props}
    >
      <span className="shrink-0">
        {icon ?? <AlertIcon className="size-[18px]" />}
      </span>
      {isTextContent ? (
        <p className="font-manrope text-[14px] leading-normal">{content}</p>
      ) : (
        <div className="font-manrope text-[14px] leading-normal">{content}</div>
      )}
    </div>
  )
}
