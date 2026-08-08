"use client"

import React from "react"
import { Badge } from "@repo/ui"
import { Button } from "@repo/ui"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui"
import { SearchInput } from "@repo/ui"
import { ExploreButton } from "@repo/ui"
import { MoreVertical } from "lucide-react"
import { DataTable, TableColumn } from "./data-table"
import { CampaignFilter, CampaignFilterValues } from "./campaign-filter"
import { TableSkeleton, ToolbarSkeleton } from "./skeletons"
import searchStyles from "./search-input.module.css"
import { Search } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"

export interface Campaign {
  id: string
  name: string
  channel: 'Email' | 'WhatsApp'
  status: string
  startDate: string
  startDateRaw?: string // Raw ISO date string for filtering
  endDate: string
  createdAt?: string
  createdBy: string
  subject?: string
  fromEmail?: string // Email-specific field
  replyToEmail?: string // Email-specific field
  previewText?: string
  templateName?: string // WhatsApp template name
  numMessages: number // WhatsApp-specific field
  openRate: number
  clickRate: number
  deliveryStats?: {
    total: number
    pending: number
    queued: number
    sent: number
    delivered: number
    read: number
    failed: number
  }
}

interface StatusBadgeProps {
  status: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalizedStatus = status?.toLowerCase() || ''
  
  const statusConfig: Record<string, { bg: string; text: string; hover: string }> = {
    'draft': { bg: 'bg-gray-100', text: 'text-gray-800', hover: 'hover:bg-gray-100' },
    'sent': { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-100' },
    'scheduled': { bg: 'bg-violet-100', text: 'text-violet-800', hover: 'hover:bg-violet-100' },
    'running': { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-100' },
    'in_process': { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-100' },
    'archived': { bg: 'bg-gray-100', text: 'text-gray-800', hover: 'hover:bg-gray-100' },
    'archive': { bg: 'bg-gray-100', text: 'text-gray-800', hover: 'hover:bg-gray-100' },
    'suspended': { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-100' },
    'rejected': { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-100' },
    'cancelled': { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-100' },
    'canceled': { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-100' },
  }
  
  const config = statusConfig[normalizedStatus] || { bg: 'bg-gray-100', text: 'text-gray-800', hover: 'hover:bg-gray-100' }
  
  return (
    <Badge variant="outline" className={`${config.bg} ${config.text} ${config.hover}`}>
      {status}
    </Badge>
  )
}

// Helper function to format time and date
const formatTimeThenDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const date = d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${time} · ${date}`;
};

// Column configuration helper function
const getCampaignColumns = (channel: 'Email' | 'WhatsApp'): TableColumn<Campaign>[] => {
  if (channel === 'WhatsApp') {
    return [
      { key: 'name', label: 'Campaign Name' },
      { key: 'status', label: 'Status', render: (_v, item) => <StatusBadge status={item.status} /> },
      {
        key: 'templateName',
        label: 'Template',
        className: 'text-muted-foreground',
        render: (v) => v || '-',
      },
      {
        key: 'numMessages',
        label: 'Messages',
        className: 'text-muted-foreground text-right',
        render: (v) => (typeof v === 'number' ? v.toLocaleString() : '-'),
      },
      {
        key: 'startDate',
        label: 'Scheduled / Start Time',
        className: 'text-muted-foreground',
        render: (v) => formatTimeThenDate(v as string | undefined),
      },
      {
        key: 'createdAt',
        label: 'Created At',
        className: 'text-muted-foreground',
        render: (v) => formatTimeThenDate(v as string | undefined),
      },
      {
        key: 'createdBy',
        label: 'Created By',
        className: 'text-muted-foreground',
      },
    ];
  }

  // Email columns
  return [
    { key: 'name', label: 'Campaign Name' },
    {
      key: 'status',
      label: 'Status',
      render: (_v, item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'templateName',
      label: 'Subject / Template',
      className: 'text-muted-foreground',
      render: (v) => v || '-',
    },
    {
      key: 'createdBy',
      label: 'Created By',
      className: 'text-muted-foreground',
    },
    {
      key: 'fromEmail',
      label: 'Email',
      className: 'text-muted-foreground',
    },
    {
      key: 'replyToEmail',
      label: 'Reply To',
      className: 'text-muted-foreground',
    },
    {
      key: 'startDate',
      label: 'Start Date',
      className: 'text-muted-foreground',
    },
    {
      key: 'createdAt',
      label: 'Created At',
      className: 'text-muted-foreground',
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
  ];
};

interface CampaignTableProps {
  campaigns: Campaign[]
  searchQuery?: string
  filters?: CampaignFilterValues
  channelFilter?: string
  currentPage?: number
  totalPages?: number
  totalCount?: number
  itemsPerPage?: number
  isLoading?: boolean
  onSearchChange?: (value: string) => void
  onFilterChange?: (filters: CampaignFilterValues) => void
  onChannelChange?: (value: string) => void
  onPageChange?: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  onCampaignClick?: (campaign: Campaign) => void
  onGoToCampaign?: (campaign: Campaign) => void
  onDeleteClick?: (campaign: Campaign) => void
  onEditClick?: (campaign: Campaign) => void
  onCreateClick?: () => void
  onOptOutClick?: () => void
  title?: string
  subtitle?: string
  titleClassName?: string
  headerActions?: React.ReactNode
}

export const CampaignTable: React.FC<CampaignTableProps> = ({
  campaigns,
  searchQuery = "",
  filters = {},
  channelFilter = "All Channels",
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  itemsPerPage = 10,
  isLoading = false,
  onSearchChange,
  onFilterChange,
  onChannelChange,
  onPageChange,
  onItemsPerPageChange,
  onCampaignClick,
  onGoToCampaign,
  onDeleteClick,
  onEditClick,
  onCreateClick,
  onOptOutClick,
  title,
  subtitle,
  titleClassName,
  headerActions
}) => {
  // Derive channel type from channelFilter for backward compatibility
  const channel: 'Email' | 'WhatsApp' = channelFilter === 'WhatsApp' ? 'WhatsApp' : 'Email';
  const columns = React.useMemo(() => getCampaignColumns(channel), [channel]);

  // Show skeleton when loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className={cn("text-3xl mt-4", !titleClassName && "font-bold", titleClassName)}>{title ?? 'Campaign Management'}</h1>
            <p className={cn("text-muted-foreground", title === "Email Campaigns" && "font-['Karla'] font-normal")}>{subtitle ?? 'Manage your campaigns'}</p>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            {onCreateClick && (
              <ExploreButton onClick={onCreateClick}>
                Create Campaign
              </ExploreButton>
            )}
          </div>
        </div>
        <ToolbarSkeleton />
        <div className="rounded-md border">
          <TableSkeleton rows={10} />
        </div>
      </div>
    )
  }

  const customFilter = (
    <div className="flex items-center gap-4">
      <div className="w-80">
        <SearchInput 
          placeholder="Search campaign..." 
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
      {onFilterChange && (
        <CampaignFilter
          filters={filters}
          onStatusChange={(status) => onFilterChange({ ...filters, status })}
          onStartDateChange={(date) => onFilterChange({ ...filters, startDate: date })}
          onCreatedFromChange={(date) => onFilterChange({ ...filters, createdFrom: date })}
          onCreatedToChange={(date) => onFilterChange({ ...filters, createdTo: date })}
          onClearFilters={() => onFilterChange({})}
          onApplyFilters={(newFilters) => onFilterChange(newFilters)}
        />
      )}
    </div>
  )

  const renderActions = (item: Campaign) => {
    const isDraft = item.status?.toLowerCase() === 'draft';
    const isPending = item.status?.toLowerCase() === 'pending';
    const canEdit = isDraft || isPending;
    const isWhatsApp = item.channel?.toLowerCase() === 'whatsapp';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onCampaignClick?.(item)}>
            View Details
          </DropdownMenuItem>
          {isWhatsApp && onOptOutClick && (
            <DropdownMenuItem onSelect={() => onOptOutClick()}>
              View Opt-Outs
            </DropdownMenuItem>
          )}
          {canEdit && onEditClick && (
            <DropdownMenuItem onSelect={() => onEditClick(item)}>
              Edit
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem className="text-red-600" onSelect={() => onDeleteClick?.(item)}>
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className={cn("text-3xl mt-4", !titleClassName && "font-bold", titleClassName)}>{title ?? 'Campaign Management'}</h1>
            <p className={cn("text-muted-foreground", title === "Email Campaigns" && "font-['Karla'] font-normal")}>{subtitle ?? 'Manage your campaigns'}</p>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            {onCreateClick && (
              <ExploreButton onClick={onCreateClick}>
                Create Campaign
              </ExploreButton>
            )}
          </div>
        </div>

      <DataTable
        data={campaigns}
        columns={columns}
        title={title ?? 'Campaigns'}
        count={totalCount || campaigns.length}
        onNameClick={(item) => onCampaignClick?.(item)}
        getRowHref={(campaign) => `/campaigns/${campaign.channel.toLowerCase()}/${campaign.id}`}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
        showFilter={true}
        customFilter={customFilter}
        searchQuery={searchQuery}
        isSearchMode={Boolean(searchQuery)}
      />
    </div>
  )
}

