"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

export type StepperProps = {
  steps: string[]
  currentIndex: number
  className?: string
  onStepClick?: (index: number) => void
}

function getStepBackground(i: number, safeIndex: number, total: number): string {
  if (i === safeIndex) {
    // Active step: bright green so it stands out
    return "linear-gradient(90deg, #009c1a 0%, #22b600 100%)"
  }
  if (i < safeIndex) {
    // Past steps: light blue → progressively darker blue as they approach active
    // Ratio 0 (first) → 1 (just before active)
    const ratio = safeIndex > 0 ? i / safeIndex : 0
    // Lightest: hsl(210, 70%, 75%) → Darkest before active: hsl(215, 70%, 55%)
    const lightness = 75 - ratio * 20   // 75% → 55%
    const saturation = 60 + ratio * 15   // 60% → 75%
    const hue = 210 + ratio * 5          // 210 → 215
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }
  // Future steps: continue darkening blue beyond active
  const stepsAfter = total - 1 - safeIndex
  const distFromActive = i - safeIndex
  const ratio = stepsAfter > 0 ? distFromActive / stepsAfter : 0
  // Just after active: hsl(215, 65%, 50%) → Farthest: hsl(220, 75%, 30%)
  const lightness = 50 - ratio * 20   // 50% → 30%
  const saturation = 65 + ratio * 10  // 65% → 75%
  const hue = 215 + ratio * 5         // 215 → 220
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export function Stepper({ steps, currentIndex, className, onStepClick }: StepperProps) {
  const safeIndex = Math.max(0, Math.min(currentIndex, steps.length - 1))
  const isLast = (i: number) => i === steps.length - 1
  const isFirst = (i: number) => i === 0
  const isActive = (i: number) => i === safeIndex
  const isFuture = (i: number) => i > safeIndex
  const isClickable = typeof onStepClick === "function"
  const progressPercent = steps.length > 1 ? Math.round((safeIndex / (steps.length - 1)) * 100) : 0

  return (
    <div className="w-full">
      <div
        role="progressbar"
        aria-valuenow={safeIndex + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        className={cn("flex items-stretch w-full max-w-full overflow-hidden", className)}
      >
        {steps.map((label, i) => (
          <div
            key={i}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={isClickable ? () => onStepClick(i) : undefined}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onStepClick(i)
                    }
                  }
                : undefined
            }
            className={cn(
              "relative flex items-center justify-center min-w-0 flex-1 py-2.5 px-3 text-sm font-medium",
              "first:pl-4 last:pr-4",
              "-ml-[1px] first:ml-0",
              isActive(i) ? "text-white font-semibold" : "text-white",
              isClickable && "cursor-pointer hover:opacity-90 transition-opacity"
            )}
            style={{
              clipPath: isFirst(i)
                ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
                : isLast(i)
                  ? "polygon(14px 50%, 0 0, 100% 0, 100% 100%, 0 100%)"
                  : "polygon(14px 50%, 0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)",
              marginRight: isLast(i) ? 0 : "-1px",
              background: getStepBackground(i, safeIndex, steps.length),
              boxShadow: isActive(i)
                ? "0 0 12px rgba(0, 156, 26, 0.5), 0 0 0 1px rgba(255,255,255,0.8)"
                : "0 0 0 1px rgba(255,255,255,0.8)",
              transform: isActive(i) ? "scale(1.03)" : undefined,
              zIndex: isActive(i) ? 1 : 0,
            }}
          >
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Stage {safeIndex + 1} of {steps.length} ({progressPercent}%)
      </p>
    </div>
  )
}
