import React from 'react'
import { Input } from './Input'

interface InputGroupProps {
  title?: string
  placeholder?: string
  description?: string
  linkText?: string
  linkHref?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const InputGroup: React.FC<InputGroupProps> = ({
  title,
  placeholder,
  description,
  linkText,
  linkHref = '#',
  leftIcon,
  rightIcon
}) => {
  return (
    <div className="flex flex-col gap-[10px] w-full max-w-[320px]">
      {title && (
        <label className="text-[14px] font-manrope font-normal text-white ml-[1px]">
          {title}
        </label>
      )}
      <Input 
        placeholder={placeholder}
        rightIcon={rightIcon}
        className="h-[40px] px-[16px] py-[16px]" // Adjusted to match Figma's total height
      />
      {(description || linkText) && (
        <div className="flex items-center justify-between px-[1px]">
          {description && (
            <span className="text-[14px] font-manrope font-normal text-white/70">
              {description}
            </span>
          )}
          {linkText && (
            <a href={linkHref} className="text-[14px] font-manrope font-normal text-[#FB2C36] hover:underline">
              {linkText}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
