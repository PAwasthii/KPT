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
  tabs,
  ...props
}: HeaderProps) {
  const hasWhiteBackground = className?.includes('bg-white') || className?.includes('!bg-white')
  const hasLightYellowBackground = className?.includes('bg-indigo-50') || className?.includes('bg-amber-50')
  
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-border backdrop-blur max-w-screen-3xl mx-auto justify-center  ",
        className
      )}
      {...props}
    >
        <div className={cn(
        "container flex h-16 shadow-sm items-center justify-between w-full max-w-screen-3xl mx-auto pr-6", 
        hasWhiteBackground ? 'bg-white' : 
        hasLightYellowBackground ? 'bg-indigo-50' :
        'bg-navbar'
      )}>
        {/* Left side - Icon */}
        <div className="flex items-center">
          {icon && (
            <div className="flex items-center space-x-2 text-primary">
              {icon}
            </div>
          )}
        </div>

        {/* Center - Tabs */}
        {tabs && (
          <div className="flex-1 flex justify-center">
            {tabs}
          </div>
        )}

        {/* Right side - Notifications and Profile */}
        <div className="flex items-center gap-3">
          {/* Notification bell — rendered by the app layer so it can use app hooks */}
          {notificationSlot}

          {/* Profile Dropdown */}
          {user && (
            <ProfileDropdown
              user={user}
              onChangePassword={onChangePassword}
              onLogout={onLogout}
            />
          )}
        </div>
      </div>
    </header>
  )
}
