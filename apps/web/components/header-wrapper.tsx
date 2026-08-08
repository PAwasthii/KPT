"use client"

import { Header } from "@repo/ui"
import { useAuth } from "../contexts/AuthContext"
import { useHealth } from "../hooks/useWebhook"
import { Badge } from "@repo/ui/components/ui/badge"
import { useState } from "react"
import { ChangePasswordModal } from "./change-password-modal"
import { NotificationDropdown } from "./notification-dropdown"

interface HeaderWrapperProps {
  icon?: React.ReactNode
  hideNotifications?: boolean
  className?: string
}

export function HeaderWrapper({
  icon,
  hideNotifications = false,
  className,
}: HeaderWrapperProps) {
  const { user, logout } = useAuth()
  const { data: health, isLoading: healthLoading } = useHealth()
  const [showChangePassword, setShowChangePassword] = useState(false)

  if (!user) return null

  const getHealthStatus = () => {
    if (healthLoading) return { text: "Loading...", variant: "secondary" as const }
    if (!health) return { text: "Offline", variant: "destructive" as const }
    if (health.status === "ok" && health.database === "connected") {
      return { text: "Online", variant: "default" as const }
    }
    return { text: "Issues", variant: "destructive" as const }
  }

  const healthStatus = getHealthStatus()

  return (
    <>
      <Header
        className={className}
        icon={
          icon ?? (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">C</span>
              </div>
              <span className="font-bold text-xl">CRM Suite</span>
              <Badge variant={healthStatus.variant} className="ml-2">
                {healthStatus.text}
              </Badge>
            </div>
          )
        }
        notificationSlot={hideNotifications ? undefined : <NotificationDropdown />}
        user={{
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown User",
          email: user.email || "No email provided",
          role: user.role || "User",
          isOnline: true,
        }}
        onLogout={logout}
        onChangePassword={() => setShowChangePassword(true)}
      />
      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </>
  )
}
