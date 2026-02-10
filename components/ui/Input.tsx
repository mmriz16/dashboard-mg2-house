import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  rightIcon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  rightIcon, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-manrope font-medium text-white/70 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          className={`
            w-full bg-[#151618] border border-white/10 rounded-lg px-4 py-2.5 
            text-sm text-white placeholder:text-white/20
            focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50
            transition-all ${rightIcon ? 'pr-11' : ''} ${error ? 'border-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-purple-500/50 transition-colors">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-500 ml-1 mt-0.5">{error}</span>}
    </div>
  )
}
