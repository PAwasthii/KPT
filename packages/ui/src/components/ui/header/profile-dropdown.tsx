"use client"

import * as React from "react"
import { User, Bell, LogOut, Circle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu"
import { Button } from "../button"
import { cn } from "@repo/ui/lib/utils"

export interface UserProfile {
  name: string
  email: string
  role: string
  avatar?: string
  isOnline?: boolean
}

export interface ProfileDropdownProps {
  user: UserProfile
  onEditProfile?: () => void
  onManageNotifications?: () => void
  onChangePassword?: () => void
  onLogout?: () => void
  className?: string
}

export function ProfileDropdown({
  user,
  onEditProfile,
  onManageNotifications,
  onChangePassword,
  onLogout,
  className,
}: ProfileDropdownProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("relative h-10 w-10 rounded-full", className)}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {user.isOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-brand-mint border-2 border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{user.role}</p>
                <div className="flex items-center mt-1">
                  <Circle className={cn(
                    "h-2 w-2 mr-1",
                    user.isOnline ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"
                  )} />
                  <span className="text-xs text-muted-foreground">
                    {user.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        {(onEditProfile || onManageNotifications) && <DropdownMenuSeparator />}
        {onEditProfile && (
          <DropdownMenuItem onClick={onEditProfile} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
        )}
        {onManageNotifications && (
          <DropdownMenuItem onClick={onManageNotifications} className="cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            <span>Manage Notifications</span>
          </DropdownMenuItem>
        )}
        {onChangePassword && (
          <DropdownMenuItem onClick={onChangePassword} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
