import React from 'react'
import { Input } from './Input'

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  title?: string
  description?: string
  linkText?: string
  linkHref?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  descriptionClassName?: string
}

export const InputGroup: React.FC<InputGroupProps> = ({
  title,
  placeholder,
  description,
  linkText,
  linkHref = '#',
  leftIcon,
  rightIcon,
  className,
  descriptionClassName,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-[4px] w-full ${className || ''}`}>
      <Input
        label={title}
        placeholder={placeholder}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        {...props}
      />

      {(description || linkText) && (
        <div className="flex items-center justify-between w-full">
          {description && (
            <span className={`text-[14px] font-ibm-plex-mono font-normal text-white/70 ${descriptionClassName || ''}`}>
              {description}
            </span>
          )}
          {linkText && (
            <a href={linkHref} className="text-[14px] font-ibm-plex-mono font-normal text-red hover:underline ml-auto">
              {linkText}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
