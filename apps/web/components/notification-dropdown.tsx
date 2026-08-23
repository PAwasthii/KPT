"use client"

import * as React from "react"

import { Bell, CheckCheck, Loader2, X } from "lucide-react"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/hooks/useNotifications"

const TYPE_ICONS: Record<string, string> = {
  LEAD_ASSIGNED: "👤",
  LEAD_UPDATED: "✏️",
  APPROVAL_REQUESTED: "📋",
  APPROVAL_APPROVED: "✅",
  APPROVAL_REJECTED: "❌",
  QUOTE_ACCEPTED: "🤝",
  ORDER_CREATED: "🛒",
  INVENTORY_CREATED: "📦",
  INVENTORY_BULK_IMPORT: "📥",
  INVENTORY_LOW_STOCK: "⚠️",
  INVENTORY_CRITICAL_STOCK: "🔴",
  INVENTORY_OUT_OF_STOCK: "🚫",
  STOCK_DISPATCHED: "🚚",
  STOCK_LOW_ALERT: "⚠️",
  STOCK_CRITICAL_ALERT: "🔴",
  STOCK_OUT_OF_STOCK: "🚫",
  PASSWORD_CHANGED: "🔐",
  PASSWORD_CHANGE_FAILED: "⛔",
  PASSWORD_RESET: "🔑",
  GENERAL: "🔔",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function NotificationModal({
  notification,
  onClose,
}: {
  notification: AppNotification
  onClose: () => void
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl flex-shrink-0">{TYPE_ICONS[notification.type] ?? "🔔"}</span>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-snug pr-6">
              {notification.title}
            </p>
            <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 leading-relaxed mb-6">{notification.message}</p>

        {/* Actions */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: AppNotification
  onSelect: (n: AppNotification) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
        !notification.isRead ? "bg-brand-pale-aqua/60" : ""
      }`}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">
        {TYPE_ICONS[notification.type] ?? "🔔"}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-primary" />
      )}
    </button>
  )
}

export function NotificationDropdown() {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<AppNotification | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)

  const { data, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = data?.unreadCount ?? 0
  const notifications = data?.data ?? []

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  function handleSelect(notification: AppNotification) {
    if (!notification.isRead) markRead.mutate(notification.id)
    setOpen(false)
    setSelected(notification)
  }

  return (
    <>
      <div ref={ref} className="relative">
        {/* Bell button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative h-10 w-10 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-800">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-blue-50 text-primary text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="flex items-center gap-1 text-xs text-primary hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {markAllRead.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                  <Bell className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} onSelect={handleSelect} />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail popup */}
      {selected && (
        <NotificationModal notification={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
