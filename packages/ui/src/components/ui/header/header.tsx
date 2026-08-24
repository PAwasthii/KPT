"use client"

import * as React from "react"
import { ProfileDropdown, type UserProfile } from "./profile-dropdown"
import { cn } from "@repo/ui/lib/utils"

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  icon?: React.ReactNode
  onNotificationClick?: () => void
  notificationCount?: number
  notificationSlot?: React.ReactNode
  user?: UserProfile
  onEditProfile?: () => void
  onManageNotifications?: () => void
  onChangePassword?: () => void
  onLogout?: () => void
  onToggleTheme?: () => void
  isDark?: boolean
  tabs?: React.ReactNode
}

export function Header({
  className,
  icon,
  onNotificationClick,
  notificationCount = 0,
  notificationSlot,
  user,
  onEditProfile,
  onManageNotifications,
  onChangePassword,
  onLogout,
  onToggleTheme,
  isDark,
  tabs,
  ...props
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full max-w-screen-3xl mx-auto",
        className
      )}
      {...props}
    >
      <div className="flex h-16 items-center justify-between px-4 pr-6 bg-card shadow-sm border-b border-border w-full">
        {/* Left side */}
        <div className="flex items-center">
          {icon && (
            <div className="flex items-center space-x-2 text-foreground">
              {icon}
            </div>
          )}
        </div>

        {/* Center — Tabs */}
        {tabs && (
          <div className="flex-1 flex justify-center">
            {tabs}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {notificationSlot}
          {user && (
            <ProfileDropdown
              user={user}
              onChangePassword={onChangePassword}
              onLogout={onLogout}
              onToggleTheme={onToggleTheme}
              isDark={isDark}
            />
          )}
        </div>
      </div>
      <div className="h-[2px] w-full bg-gradient-to-r from-primary via-primary/40 to-transparent" />
    </header>
  )
}
