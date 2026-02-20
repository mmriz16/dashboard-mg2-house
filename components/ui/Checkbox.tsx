import React from 'react'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', ...props }) => {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer group">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="peer appearance-none w-5 h-5 bg-surface-card border border-border rounded-md checked:bg-purple-600 checked:border-purple-600 transition-all cursor-pointer"
          {...props}
        />
        <svg
          className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {label && (
        <span className="text-sm font-manrope text-white/50 group-hover:text-white/80 transition-colors">
          {label}
        </span>
      )}
    </label>
  )
}
