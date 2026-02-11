import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'white' | 'disabled'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-manrope font-regular text-[14px] transition-all active:scale-[0.98] gap-[10px] px-[12px] py-[10px]'

  const variants = {
    primary: 'bg-[#111214] text-white border border-white/10 hover:bg-[#1a1b1e]',
    secondary: 'text-white/80 hover:bg-[#111214] hover:text-white',
    white: 'bg-white text-black border-transparent hover:bg-white/90',
    disabled: 'text-white/20 cursor-not-allowed',
  }

  const disabledStyles = disabled ? 'opacity-20 cursor-not-allowed active:scale-100' : ''

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${disabledStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {leftIcon && <span className="w-4 h-4 flex items-center justify-center">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="w-4 h-4 flex items-center justify-center">{rightIcon}</span>}
    </button>
  )
}
