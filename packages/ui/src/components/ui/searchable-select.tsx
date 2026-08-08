"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "./input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"
import { cn } from "../../lib/utils"

export type SearchableSelectItem = {
  value: string
  label: React.ReactNode
  /** Optional: if provided, used for searching instead of rendered label */
  searchText?: string
  disabled?: boolean
}

type SearchableSelectProps = {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  items: SearchableSelectItem[]
  searchPlaceholder?: string
  emptyText?: string
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = "Select...",
  items,
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  triggerClassName,
  contentClassName,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      const hay = (it.searchText ?? String(it.value)).toLowerCase()
      const labelStr =
        typeof it.label === "string" ? it.label.toLowerCase() : ""
      return hay.includes(q) || labelStr.includes(q)
    })
  }, [items, query])

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
      open={open}
    >
      <SelectTrigger className={cn(triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className={cn("w-[var(--radix-select-trigger-width)] max-w-[90vw]", contentClassName)}
      >
        <div
          className="p-2 border-b sticky top-0 bg-popover z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
              onKeyDown={(e) => {
                e.stopPropagation()
                // Prevent Radix Select from intercepting typing
                if (e.key !== "Escape" && e.key !== "Enter" && e.key !== "Tab") {
                  const nativeEvent = e.nativeEvent as Event & {
                    stopImmediatePropagation?: () => void
                  }
                  nativeEvent.stopImmediatePropagation?.()
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => {
                e.stopPropagation()
                e.currentTarget.focus()
              }}
              autoFocus={false}
              readOnly={false}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          filtered.map((it) => (
            <SelectItem key={it.value} value={it.value} disabled={it.disabled}>
              {it.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}


