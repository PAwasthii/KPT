import * as React from "react"
import { cn } from "@repo/ui/lib/utils"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onCheckedChange?: (checked: boolean) => void
}

function Checkbox({ className, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-3 w-3 rounded border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onChange={(e) => {
        onCheckedChange?.(e.target.checked)
      }}
      {...props}
    />
  )
}

export { Checkbox }
