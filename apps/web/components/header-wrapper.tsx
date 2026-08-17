"use client"

import { Header } from "@repo/ui"
import { useAuth } from "../contexts/AuthContext"
import { useHealth } from "../hooks/useWebhook"
import { Badge } from "@repo/ui/components/ui/badge"
import { useState } from "react"
import { ChangePasswordModal } from "./change-password-modal"
import { NotificationDropdown } from "./notification-dropdown"
import { useCurrency, MAJOR_CURRENCIES } from "../contexts/CurrencyContext"

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
  const { currency, symbol, updateCurrency } = useCurrency()

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
        notificationSlot={
          <div className="flex items-center gap-2">
            <select
              value={currency}
              onChange={(e) => updateCurrency(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              aria-label="Currency"
            >
              {MAJOR_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            {!hideNotifications && <NotificationDropdown />}
          </div>
        }
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
