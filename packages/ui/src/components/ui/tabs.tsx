"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

const TabsContext = React.createContext<{
  activeValue: string
  handleValueChange: (value: string) => void
}>({
  activeValue: "",
  handleValueChange: () => {},
})

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("useTabs must be used within a TabsProvider")
  }
  return context
}

type TabsProps = {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [activeValue, setActiveValue] = React.useState(defaultValue || "")

  const handleValueChange = (val: string) => {
    if (value === undefined) {
      setActiveValue(val)
    }
    onValueChange?.(val)
  }

  const currentValue = value !== undefined ? value : activeValue

  return (
    <TabsContext.Provider
      value={{
        activeValue: currentValue,
        handleValueChange,
      }}
    >
      <div className={cn("flex flex-col gap-2", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

type TabsListProps = {
  children: React.ReactNode
  className?: string
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center space-x-8 border-b border-gray-200",
        className
      )}
    >
      {children}
    </div>
  )
}

type TabsTriggerProps = {
  value: string
  children: React.ReactNode
  className?: string
}

function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { activeValue, handleValueChange } = useTabs()
  const isActive = activeValue === value

  return (
    <button
      role="tab"
      onClick={() => handleValueChange(value)}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "relative cursor-pointer px-0 py-4 text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "text-gray-900 border-b-2 border-gray-900" 
          : "text-gray-500 hover:text-gray-700",
        className
      )}
    >
      {children}
    </button>
  )
}

type TabsContentsProps = {
  children: React.ReactNode
  className?: string
}

function TabsContents({ children, className }: TabsContentsProps) {
  return (
    <div className={cn("overflow-hidden", className)}>
      {children}
    </div>
  )
}

type TabsContentProps = {
  value: string
  children: React.ReactNode
  className?: string
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeValue } = useTabs()
  const isActive = activeValue === value

  if (!isActive) return null

  return (
    <div
      role="tabpanel"
      className={cn("overflow-hidden", className)}
    >
      {children}
    </div>
  )
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
  useTabs,
}
