"use client"

import React from "react"
import { Badge } from "@repo/ui"
import { Button } from "@repo/ui"
import { Card } from "@repo/ui"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui"
import { ArrowLeft, Download, FileText, Edit, RefreshCw, FileSpreadsheet, Table } from "lucide-react"
import { Campaign } from "./campaign-table"
import { type CampaignDelivery, type AnalyticsEvent, type BrevoCampaign, type MessageTemplate } from "@/lib/api/types"
import { generateCampaignPDF } from "@/lib/utils/pdf-generator"
import logo from '@/app/assets/images/logos/logo_v1.png'
import { WhatsAppPreview } from "./whatsapp/whatsapp-preview"

interface CampaignDetailPageProps {
  campaign: Campaign
  brevoCampaign?: BrevoCampaign
  template?: MessageTemplate // WhatsApp template
  messageParams?: Record<string, any> // Message parameters with DB column values
  onBack: () => void
  onEdit?: () => void
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
  deliveries?: CampaignDelivery[]
  events?: AnalyticsEvent[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue }) => {
  // Determine color for rates
  const getRateColor = (subValueText: string, labelText: string) => {
    // Extract percentage number from text
    const match = subValueText.match(/([\d.]+)%/);
    if (!match || !match[1]) return 'text-muted-foreground';
    
    const rate = parseFloat(match[1] as string);
    const lowerLabel = (labelText || '').toLowerCase();
    const lowerSubValue = subValueText.toLowerCase();
    
    // Bad metrics - red for high values
    if (lowerLabel.includes('unsubscribe') || lowerLabel.includes('spam') || lowerLabel.includes('bounce') ||
        lowerSubValue.includes('unsubscribe') || lowerSubValue.includes('spam') || lowerSubValue.includes('bounce')) {
      if (rate >= 2) return 'text-red-600';
      if (rate >= 1) return 'text-orange-500';
      return 'text-green-600';
    }
    
    // Good metrics - green for high values (check both label and subValue)
    if (lowerLabel.includes('delivery') || lowerLabel.includes('delivered') || lowerLabel.includes('open') || lowerLabel.includes('click') ||
        lowerSubValue.includes('delivery') || lowerSubValue.includes('open') || lowerSubValue.includes('click')) {
      if (rate >= 50) return 'text-green-600';
      if (rate >= 25) return 'text-blue-600';
      if (rate >= 10) return 'text-blue-500';
      return 'text-orange-500';
    }
    
    return 'text-muted-foreground';
  };

  const rateColor = subValue ? getRateColor(subValue, label) : 'text-muted-foreground';

  return (
    <div className="relative bg-white rounded-lg border p-6 shadow-lg w-[150px] overflow-hidden">
      {/* Glossy overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        <div className="text-sm text-muted-foreground mb-1">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
        {subValue && <div className={`text-sm mt-1 ${rateColor}`}>{subValue}</div>}
      </div>
    </div>
  );
}

const HorizontalSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">{title}</h3>
    <div className="flex flex-wrap gap-4">
      {children}
    </div>
  </div>
)

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
  return `${time}, ${dateStr}`
}

export function CampaignDetailPage({ campaign, brevoCampaign, template, messageParams, onBack, onEdit, onRefresh, refreshing = false, deliveries = [], events = [], loading = false, error = null, onRetry }: CampaignDetailPageProps) {
  const isWhatsApp = campaign.channel === 'WhatsApp'
  const isEmail = campaign.channel === 'Email'

  // Calculate statistics from Brevo campaign data or use defaults
  // Prioritize globalStats if available, otherwise fall back to legacy statistics structure
  const globalStats = brevoCampaign?.statistics?.globalStats;
  const legacyStats = brevoCampaign?.statistics;
  const safeRate = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0);
  
  // Use globalStats fields if available, otherwise fall back to legacy fields
  const sent = globalStats?.sent || (legacyStats as any)?.sent || 0;
  const delivered = globalStats?.delivered || (legacyStats as any)?.delivered || 0;
  const opens = globalStats?.uniqueViews || (legacyStats as any)?.uniqueOpens || (legacyStats as any)?.opens || 0;
  const clicks = globalStats?.uniqueClicks || (legacyStats as any)?.uniqueClicks || (legacyStats as any)?.clicks || 0;
  const unsubscribes = globalStats?.unsubscriptions || (legacyStats as any)?.unsubscriptions || 0;
  const spamReports = globalStats?.complaints || (legacyStats as any)?.spamReports || 0;
  const bounces = (globalStats?.hardBounces || 0) + (globalStats?.softBounces || 0) || (legacyStats as any)?.bounces || 0;
  const hardBounces = globalStats?.hardBounces || (legacyStats as any)?.hardBounces || 0;
  const softBounces = globalStats?.softBounces || (legacyStats as any)?.softBounces || 0;
  const processing = globalStats?.deferred || (legacyStats as any)?.processing || 0;
  const totalOpens = globalStats?.viewed || (legacyStats as any)?.opens || (legacyStats as any)?.uniqueOpens || 0;
  const totalClicks = globalStats?.clickers || (legacyStats as any)?.clicks || (legacyStats as any)?.uniqueClicks || 0;
  const appleMPPOpens = globalStats?.appleMppOpens || 0;

  const emailStats = {
    delivered: delivered,
    deliveryRate: (legacyStats as any)?.deliveredPercentage ?? safeRate(delivered, sent),
    opens: opens,
    openRate: globalStats?.opensRate ?? (legacyStats as any)?.openPercentage ?? safeRate(opens, delivered || sent),
    clicks: clicks,
    clickThroughRate: (legacyStats as any)?.clickPercentage ?? safeRate(clicks, delivered || sent),
    unsubscribes: unsubscribes,
    unsubscribeRate: (legacyStats as any)?.unsubscriptionPercentage ?? safeRate(unsubscribes, delivered || sent),
    sentTo: sent,
    deliveredCount: delivered,
    inProcessing: processing,
    softBounces: softBounces,
    hardBounces: hardBounces,
    totalOpens: totalOpens,
    appleMPPOpens: appleMPPOpens,
    totalClicks: totalClicks,
    clickToOpenRate: safeRate(clicks, opens),
    spamComplaints: spamReports,
    spamComplaintRate: (legacyStats as any)?.spamPercentage ?? safeRate(spamReports, delivered || sent),
  }


  // Export functions for WhatsApp campaigns
  const exportWhatsAppStats = (format: 'pdf' | 'excel' | 'csv') => {
    const kpi = campaign.deliveryStats || {
      total: deliveries.length,
      pending: deliveries.filter(x => x.status === 'pending').length,
      queued: deliveries.filter(x => x.status === 'queued').length,
      sent: deliveries.filter(x => x.status === 'sent').length,
      delivered: deliveries.filter(x => x.status === 'delivered').length,
      read: deliveries.filter(x => x.status === 'read').length,
      failed: deliveries.filter(x => x.status === 'failed').length,
    }

    const stats = [
      ['Metric', 'Count', 'Percentage'],
      ['Total', kpi.total, '100%'],
      ['Pending', kpi.pending, kpi.total > 0 ? `${((kpi.pending / kpi.total) * 100).toFixed(1)}%` : '0%'],
      ['Queued', kpi.queued, kpi.total > 0 ? `${((kpi.queued / kpi.total) * 100).toFixed(1)}%` : '0%'],
      ['Sent', kpi.sent, kpi.total > 0 ? `${((kpi.sent / kpi.total) * 100).toFixed(1)}%` : '0%'],
      ['Delivered', kpi.delivered, kpi.total > 0 ? `${((kpi.delivered / kpi.total) * 100).toFixed(1)}%` : '0%'],
      ['Read', kpi.read, kpi.total > 0 ? `${((kpi.read / kpi.total) * 100).toFixed(1)}%` : '0%'],
      ['Failed', kpi.failed, kpi.total > 0 ? `${((kpi.failed / kpi.total) * 100).toFixed(1)}%` : '0%'],
    ]

    if (format === 'csv') {
      const csvContent = stats.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${campaign.name}_report.csv`
      link.click()
    } else if (format === 'excel') {
      // Create a simple HTML table for Excel
      const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>${campaign.name}</h1>
          <p>Campaign Report - ${new Date().toLocaleDateString()}</p>
          <table border="1">
            ${stats.map((row, i) => `<tr>${row.map(cell => i === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </table>
        </body>
        </html>
      `
      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${campaign.name}_report.xls`
      link.click()
    } else if (format === 'pdf') {
      // Create a printable HTML and trigger print
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>${campaign.name} - Campaign Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #333; }
              table { border-collapse: collapse; width: 100%; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .header { margin-bottom: 20px; }
              .date { color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${campaign.name}</h1>
              <p class="date">Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Channel: WhatsApp | Status: ${campaign.status}</p>
            </div>
            <table>
              ${stats.map((row, i) => `<tr>${row.map(cell => i === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('')}
            </table>
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  // Helper function to extract components from template
  const extractComponentsArray = (raw: any): any[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw.components)) return raw.components
    if (Array.isArray(raw.template?.components)) return raw.template.components
    if (Array.isArray(raw.payload?.template?.components)) return raw.payload.template.components
    return []
  }

  // Helper function to get button list
  const getButtonList = (component: any): any[] => {
    if (Array.isArray(component?.buttons)) return component.buttons
    if (Array.isArray(component?.buttonList)) return component.buttonList
    if (Array.isArray(component?.button)) return component.button
    return []
  }

  // Helper function to build preview components with DB column placeholders
  const buildPreviewComponents = () => {
    if (!template) return []

    const components = extractComponentsArray(
      (template as any)?.componentsJson ?? (template as any)?.components ?? null
    )

    return components.map((component: any) => {
      const type = String(component.type || component.component_type || "").toUpperCase()

      if (type === 'HEADER') {
        const format = String(component.format || component.format_type || "").toUpperCase()
        let headerText = component.text || ''

        // Show DB column placeholders instead of actual values
        if (format === 'TEXT' && headerText && messageParams) {
          Object.keys(messageParams).forEach((key) => {
            if (key.startsWith('header_')) {
              const num = key.replace('header_', '')
              // Replace with DB column reference if it's a placeholder like {{name}}, {{email}}, etc.
              const paramValue = messageParams[key]
              if (typeof paramValue === 'string' && paramValue.startsWith('{{') && paramValue.endsWith('}}')) {
                headerText = headerText.replace(new RegExp(`\\{\\{${num}\\}\\}`, 'g'), paramValue)
              }
            }
          })
        }

        return {
          type: 'HEADER' as const,
          format: format,
          text: headerText || undefined
        }
      } else if (type === 'BODY') {
        let bodyText = component.text || ''

        // Show DB column placeholders instead of actual values
        if (messageParams) {
          Object.keys(messageParams).forEach((key) => {
            if (key.startsWith('body_')) {
              const num = key.replace('body_', '')
              // Replace with DB column reference
              const paramValue = messageParams[key]
              if (typeof paramValue === 'string' && paramValue.startsWith('{{') && paramValue.endsWith('}}')) {
                bodyText = bodyText.replace(new RegExp(`\\{\\{${num}\\}\\}`, 'g'), paramValue)
              }
            }
          })
        }

        return {
          type: 'BODY' as const,
          text: bodyText
        }
      } else if (type === 'FOOTER') {
        return {
          type: 'FOOTER' as const,
          text: component.text || undefined
        }
      } else if (type === 'BUTTONS' || type === 'BUTTON') {
        const buttons = getButtonList(component)
        return {
          type: 'BUTTONS' as const,
          buttons: buttons.map((btn: any, idx: number) => {
            const btnType = String(btn.sub_type || btn.type || "").toUpperCase()
            const buttonKey = `button_${idx + 1}`
            const buttonValue = messageParams?.[buttonKey]

            return {
              type: btnType === 'VISIT_WEBSITE' ? 'URL' : btnType === 'CALL_PHONE_NUMBER' ? 'PHONE_NUMBER' : btnType === 'COPY_CODE' ? 'COPY_CODE' : 'QUICK_REPLY',
              text: btn.text || `Button ${idx + 1}`,
              url: buttonValue || btn.url,
              phone_number: btn.phone_number
            }
          })
        }
      }

      return component
    })
  }

  // Render WhatsApp campaign
  if (isWhatsApp) {
    const kpi = campaign.deliveryStats || {
      total: deliveries.length,
      pending: deliveries.filter(x => x.status === 'pending').length,
      queued: deliveries.filter(x => x.status === 'queued').length,
      sent: deliveries.filter(x => x.status === 'sent').length,
      delivered: deliveries.filter(x => x.status === 'delivered').length,
      read: deliveries.filter(x => x.status === 'read').length,
      failed: deliveries.filter(x => x.status === 'failed').length,
    }
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportWhatsAppStats('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportWhatsAppStats('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportWhatsAppStats('csv')}>
                <Table className="h-4 w-4 mr-2" />
                Download CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <Badge variant="secondary">{campaign.channel}</Badge>
            <Badge variant="secondary">{campaign.status}</Badge>
            {campaign.templateName && (
              <Badge variant="outline" className="text-sm">
                Template: {campaign.templateName}
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-between rounded-md border p-4">
              <div className="text-red-600">{error}</div>
              <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 md:grid-cols-7">
                <StatCard label="Total" value={kpi.total} />
                <StatCard label="Pending" value={kpi.pending} />
                <StatCard label="Queued" value={kpi.queued} />
                <StatCard label="Sent" value={kpi.sent} />
                <StatCard label="Delivered" value={kpi.delivered} />
                <StatCard label="Read" value={kpi.read} />
                <StatCard label="Failed" value={kpi.failed} />
              </div>

              {/* Message Preview */}
              {template && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-4 max-w-sm">Message Preview</h2>
                  <Card className="p-4 bg-gray-50">
                    <WhatsAppPreview
                      components={buildPreviewComponents()}
                      templateName={template.name}
                    />
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Handler for PDF download
  const handleDownloadPDF = async () => {
    if (!brevoCampaign) return;
    
    try {
      // Convert logo to base64 data URL
      let logoDataUrl: string | undefined;
      try {
        // Get the logo path from Next.js static import
        const logoPath = typeof logo === 'string' 
          ? logo 
          : (logo as any).src || (logo as any).default?.src || String(logo);
        
        // Fetch the image and convert to base64
        const response = await fetch(logoPath);
        if (!response.ok) throw new Error('Failed to fetch logo');
        
        const blob = await response.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (logoError) {
        console.warn('Could not load logo for PDF:', logoError);
        // Continue without logo - PDF will still be generated
      }

      await generateCampaignPDF(
        brevoCampaign,
        campaign.name,
        campaign.subject,
        campaign.fromEmail,
        campaign.replyToEmail,
        logoDataUrl
      );
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Render Email campaign
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {campaign.status}
          </Badge>
          <Badge variant="secondary">{campaign.channel}</Badge>
        </div>

        <div className="relative bg-white rounded-lg border p-6 shadow-lg overflow-hidden">
          {/* Glossy overlay effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Date & Time</div>
                <div className="font-medium">{campaign.startDate}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Subject</div>
                <div className="font-medium">{campaign.subject || '-'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">From</div>
                <div className="font-medium">{campaign.fromEmail || '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Reply To</div>
                <div className="font-medium">{campaign.replyToEmail || '-'}</div>
              </div>
              {campaign.previewText && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Preview Text</div>
                  <div className="font-medium">{campaign.previewText}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <div className="flex justify-start mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Statistics'}
            </Button>
          </div>
        )}
      </div>

      {/* Campaign Performance */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Campaign Performance</h2>
        <div className="flex flex-wrap gap-4">
          <StatCard label="Delivered" value={emailStats.delivered} subValue={`${emailStats.deliveryRate}% delivery rate`} />
          <StatCard label="Opens" value={emailStats.opens} subValue={`${emailStats.openRate}% open rate`} />
          <StatCard label="Clicks" value={emailStats.clicks} subValue={`${emailStats.clickThroughRate}% click-through rate`} />
          <StatCard label="Unsubscribes" value={emailStats.unsubscribes} subValue={`${emailStats.unsubscribeRate}% unsubscribe rate`} />
        </div>
      </div>

      {/* Deliverability Details */}
      <HorizontalSection title="Deliverability Details">
        <StatCard label="Sent to" value={emailStats.sentTo} />
        <StatCard label="Delivered" value={emailStats.deliveredCount} subValue={`${emailStats.deliveryRate}% delivery rate`} />
        <StatCard label="In Processing" value={emailStats.inProcessing} />
        <StatCard label="Soft Bounces" value={emailStats.softBounces} />
        <StatCard label="Hard Bounces" value={emailStats.hardBounces} />
      </HorizontalSection>

      {/* Opens Details */}
      <HorizontalSection title="Opens Details">
        <StatCard label="Opens" value={emailStats.opens} subValue={`${emailStats.openRate}% open rate`} />
        <StatCard label="Total Opens" value={emailStats.totalOpens} />
        <StatCard label="Apple MPP Opens" value={emailStats.appleMPPOpens} />
        <div></div>
        <div></div>
      </HorizontalSection>

      {/* Clicks Details */}
      <HorizontalSection title="Clicks Details">
        <StatCard label="Click-through Rate" value={`${emailStats.clickThroughRate}%`} />
        <StatCard label="Total Clicks" value={emailStats.totalClicks} />
        <StatCard label="Clicks" value={emailStats.clicks} />
        <StatCard label="Click to Open Rate" value={`${emailStats.clickToOpenRate}%`} />
        <div></div>
      </HorizontalSection>

      {/* Unsubscribers Details */}
      <HorizontalSection title="Unsubscribers Details">
        <StatCard label="Unsubscribers" value={emailStats.unsubscribes} />
        <StatCard label="Unsubscribe Rate" value={`${emailStats.unsubscribeRate}%`} />
        <StatCard label="Spam Complaints" value={emailStats.spamComplaints} />
        <StatCard label="Spam Complaint Rate" value={`${emailStats.spamComplaintRate}%`} />
        <div></div>
      </HorizontalSection>

    </div>
  )
}

