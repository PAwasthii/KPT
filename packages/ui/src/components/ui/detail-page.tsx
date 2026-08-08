import * as React from "react"
import { cn } from "@repo/ui/lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"
import { Progress } from "./progress"
import { ArrowLeft, Edit, Trash2, ArrowRightLeft, Mail, MessageCircle } from "lucide-react"

interface DetailPageHeaderProps {
  title: string
  status?: string
  statusVariant?: "default" | "secondary" | "destructive" | "outline"
  onBack?: () => void
  /** Rendered on the right, to the left of the action buttons */
  headerRight?: React.ReactNode
  actions?: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }[]
  className?: string
}

const DetailPageHeader = React.forwardRef<HTMLDivElement, DetailPageHeaderProps>(
  ({ title, status, statusVariant = "secondary", onBack, headerRight, actions, className }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between mb-6", className)}
    >
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {status && (
            <Badge variant={statusVariant} className="px-2 py-1">
              {status}
            </Badge>
          )}
        </div>
      </div>
      {(headerRight || (actions && actions.length > 0)) && (
        <div className="flex items-center gap-2">
          {headerRight}
          {actions?.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline"}
              onClick={action.onClick}
              className="flex items-center gap-2"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
)
DetailPageHeader.displayName = "DetailPageHeader"

interface DetailCardProps {
  title: string
  children: React.ReactNode
  className?: string
  headerActions?: React.ReactNode
  description?: string
  icon?: React.ReactNode
  footer?: React.ReactNode
  dense?: boolean
}

const DetailCard = ({ title, children, className, headerActions, description, icon, footer, dense = false }: DetailCardProps) => (
  <Card className={cn("border shadow-sm", className)}>
    <CardHeader className={cn("pb-4 border-b bg-background/50", dense && "py-3") }>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className={cn("text-lg leading-tight", dense && "text-base")}>{title}</CardTitle>
            {description && (
              <p className={cn("mt-1 text-sm text-muted-foreground", dense && "mt-0.5 text-xs")}>{description}</p>
            )}
          </div>
        </div>
        {headerActions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {headerActions}
          </div>
        )}
      </div>
    </CardHeader>
    <CardContent className={cn(dense ? "py-4" : "py-6")}>{children}</CardContent>
    {footer && (
      <div className={cn("px-6 pb-6 pt-4 border-t", dense && "px-4 pb-4 pt-3")}>{footer}</div>
    )}
  </Card>
)
DetailCard.displayName = "DetailCard"

interface ActivityItemProps {
  title: string
  description: string
  time: string
  className?: string
}

const ActivityItem = React.forwardRef<HTMLDivElement, ActivityItemProps>(
  ({ title, description, time, className }, ref) => (
    <div ref={ref} className={cn("flex items-start gap-3 py-3", className)}>
      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{title}</h4>
          <span className="text-sm text-muted-foreground">{time}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
)
ActivityItem.displayName = "ActivityItem"

interface LeadScoreProps {
  score: number
  maxScore?: number
  description?: string
  className?: string
}

const LeadScore = React.forwardRef<HTMLDivElement, LeadScoreProps>(
  ({ score, maxScore = 100, description, className }, ref) => (
    <div ref={ref} className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Lead Score</span>
        <span className="text-sm font-medium">{score}/{maxScore}</span>
      </div>
      <Progress value={(score / maxScore) * 100} className="h-2" />
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
)
LeadScore.displayName = "LeadScore"

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  className?: string
}

const QuickAction = React.forwardRef<HTMLButtonElement, QuickActionProps>(
  ({ icon, label, onClick, className }, ref) => (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn("w-full justify-start gap-3", className)}
    >
      {icon}
      {label}
    </Button>
  )
)
QuickAction.displayName = "QuickAction"

export {
  DetailPageHeader,
  DetailCard,
  ActivityItem,
  LeadScore,
  QuickAction,
}
