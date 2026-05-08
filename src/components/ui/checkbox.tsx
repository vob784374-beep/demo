import * as React from "react"

import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
  label?: string
  onCheckedChange?: (checked: boolean) => void
}

function Checkbox({ className, label, id, onCheckedChange, ...props }: CheckboxProps) {
  const inputId = id || React.useId()

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={inputId}
        data-slot="checkbox"
        className={cn(
          "h-4 w-4 rounded border-border accent-primary accent-accent shrink-0 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium leading-none cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
    </div>
  )
}

export { Checkbox }