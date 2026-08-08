"use client"

import * as React from "react"
import { cn } from "@repo/ui/lib/utils"

// Chart container component
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config?: ChartConfig
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <div
      data-chart={chartId}
      ref={ref}
      className={cn(
        "flex aspect-video justify-center text-xs",
        className
      )}
      {...props}
    >
      {config && <ChartStyle id={chartId} config={config} />}
      {children}
    </div>
  )
})
ChartContainer.displayName = "Chart"

// Chart style component
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).reduce(
    (acc, [key, item]) => {
      if (typeof item === "object" && "color" in item && item.color) {
        acc[`--color-${key}`] = item.color
      }
      return acc
    },
    {} as Record<string, string>
  )

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"] { ${Object.entries(colorConfig)
          .map(([key, value]) => `${key}: ${value};`)
          .join(" ")} }`,
      }}
    />
  )
}

// Chart tooltip component - simplified
const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
ChartTooltip.displayName = "ChartTooltip"

// Chart tooltip content component - simplified
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
      active?: boolean
      payload?: any[]
      label?: any
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
      labelFormatter?: (value: any, payload: any[]) => string
      labelClassName?: string
      formatter?: (value: any, key: string, item: any, index: number) => string
      color?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const value =
        typeof label === "string"
          ? label
          : typeof labelFormatter === "function"
          ? labelFormatter(label, payload)
          : label

      return (
        <div className={cn("font-medium", labelClassName)}>
          {typeof formatter === "function" ? formatter(value, key, item, 0) : value}
        </div>
      )
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      labelKey,
      formatter,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const [item] = payload

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!hideLabel && tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item: any, index: number) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {indicator === "dot" && !hideIndicator && (
                  <div
                    className="shrink-0 rounded-full border-[--color-border] bg-[--color-bg]"
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                {indicator === "line" && !hideIndicator && (
                  <div
                    className="h-px w-4 shrink-0 self-center bg-current"
                    style={{
                      backgroundColor: indicatorColor,
                    }}
                  />
                )}
                {indicator === "dashed" && !hideIndicator && (
                  <div
                    className="h-px w-4 shrink-0 self-center border-t-2 border-dashed border-current"
                    style={{
                      borderColor: indicatorColor,
                    }}
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    indicator === "dot" ? "items-center" : "items-baseline"
                  )}
                >
                  <div className="grid gap-1.5">
                    <div className="text-muted-foreground">
                      {typeof formatter === "function"
                        ? formatter(item.value, key, item, index)
                        : item.value}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

// Chart legend component - simplified
const ChartLegend = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
      payload?: any[]
      verticalAlign?: 'top' | 'bottom' | 'left' | 'right'
      hideIcon?: boolean
      nameKey?: string
    }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  if (!payload?.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item: any) => {
        const key = `${nameKey || item.dataKey || "value"}`

        return (
          <div
            key={item.value}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            )}
          >
            {!hideIcon && (
              <div
                className="h-2 w-2 shrink-0 rounded-[--color-radius]"
                style={
                  {
                    "--color-radius": "2px",
                    backgroundColor: item.color,
                  } as React.CSSProperties
                }
              />
            )}
            <span className="text-muted-foreground">{item.value}</span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegend.displayName = "ChartLegend"

// Export all components
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
}

// Chart config type
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    color?: string
  }
}