import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-[6px] w-full">
      {label && (
        <label className="text-[14px] font-manrope font-normal text-white ml-[1px]">
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className="absolute left-[16px] top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors">
            {leftIcon}
          </div>
        )}
        <input
          className={`
            w-full bg-[#111214] border border-white/10 rounded-[8px] 
            text-[14px] font-manrope text-white placeholder:text-white/50
            focus:outline-none focus:border-white/20 transition-all
            h-[40px] py-[10px]
            ${leftIcon ? 'pl-[42px]' : 'px-[16px]'} 
            ${rightIcon ? 'pr-[42px]' : 'px-[16px]'}
            ${error ? 'border-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-500 ml-1 mt-0.5">{error}</span>}
    </div>
  )
}
