'use client'

import React, { useState } from 'react'

export interface SegmentedControlItem {
    label: string
    value: string
    icon?: React.ReactNode
}

interface SegmentedControlProps {
    items: SegmentedControlItem[]
    value?: string
    defaultValue?: string
    onChange?: (value: string) => void
    className?: string
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
    items,
    value: controlledValue,
    defaultValue,
    onChange,
    className = '',
}) => {
    const [internalValue, setInternalValue] = useState(
        defaultValue ?? items[0]?.value ?? ''
    )

    const isControlled = controlledValue !== undefined
    const activeValue = isControlled ? controlledValue : internalValue

    const handleSelect = (val: string) => {
        if (!isControlled) {
            setInternalValue(val)
        }
        onChange?.(val)
    }

    return (
        <div
            className={`self-stretch p-1 bg-surface-card rounded-lg outline-1 -outline-offset-1 outline-border inline-flex justify-start items-start ${className}`}
        >
            {items.map((item) => {
                const isActive = activeValue === item.value
                return (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => handleSelect(item.value)}
                        className={`
                            flex-1 h-10 px-3 py-2.5 rounded-lg flex justify-center items-center gap-2.5
                            text-sm font-normal font-manrope cursor-pointer
                            transition-all duration-200 ease-in-out
                            ${isActive
                                ? 'bg-surface outline-1 -outline-offset-1 outline-border text-white'
                                : 'bg-transparent text-white/50 hover:text-white/80'
                            }
                        `}
                    >
                        {item.icon && (
                            <span className="w-4 h-4 flex items-center justify-center">
                                {item.icon}
                            </span>
                        )}
                        {item.label}
                    </button>
                )
            })}
        </div>
    )
}
