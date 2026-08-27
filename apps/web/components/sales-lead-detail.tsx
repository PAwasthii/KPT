"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card"
import { Button } from "@repo/ui/components/ui/button"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Badge } from "@repo/ui/components/ui/badge"
import { HeaderWrapper } from "./header-wrapper"
import { ArrowLeft, Phone, Building2, CheckCircle, XCircle } from "lucide-react"
import { Lead } from "../lib/api/types"
import { toast } from "sonner"
import Image from "next/image"
import logo from '../app/assets/images/logos/kpt-logo.png'
import { getLeadFullName } from "../lib/name"
import { displayPhone } from "../lib/phone-formatter"

interface SalesLeadDetailProps {
  lead: Lead
  onBack: () => void
  onStatusUpdate?: (leadId: number, status: string, remark: string) => Promise<void>
}

export function SalesLeadDetail({ lead, onBack, onStatusUpdate }: SalesLeadDetailProps) {
  const [remark, setRemark] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  const handleQualified = async () => {
    if (!onStatusUpdate) {
      toast.error("Status update functionality not available")
      return
    }

    if (!remark.trim()) {
      toast.error("Please add a remark before marking as qualified")
      return
    }

    setIsLoading(true)
    try {
      await onStatusUpdate(lead.id, "Qualified", remark)
      toast.success("Lead marked as qualified successfully!")
      setSelectedStatus("Qualified")
    } catch (error) {
      toast.error("Failed to update lead status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnqualified = async () => {
    if (!onStatusUpdate) {
      toast.error("Status update functionality not available")
      return
    }

    if (!remark.trim()) {
      toast.error("Please add a remark before marking as unqualified")
      return
    }

    setIsLoading(true)
    try {
      await onStatusUpdate(lead.id, "Closed Lost", remark)
      toast.success("Lead marked as unqualified")
      setSelectedStatus("Unqualified")
    } catch (error) {
      toast.error("Failed to update lead status")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderWrapper 
        icon={<Image src={logo} alt="Company Logo" width={120} height={40} className="object-contain" />}
        hideNotifications={true}
      />

      {/* Content */}
      <div className="container mx-auto p-4 md:p-6 max-w-2xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>

        {/* Lead Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{getLeadFullName(lead.firstName, lead.lastName)}</h3>
                  <p className="text-sm text-gray-600">{lead.companyName || 'No company'}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{displayPhone(lead.phone, lead.countryCode)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Lead Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                className="flex-1 h-auto py-12"
                variant="default"
                onClick={handleQualified}
                disabled={isLoading || selectedStatus === "Qualified"}
              >
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-lg">Qualified</span>
                </div>
              </Button>

              <Button
                className="flex-1 h-auto py-12"
                variant="destructive"
                onClick={handleUnqualified}
                disabled={isLoading || selectedStatus === "Unqualified"}
              >
                <div className="flex flex-col items-center gap-2">
                  <XCircle className="h-6 w-6" />
                  <span className="text-lg">Unqualified</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Remarks Card */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter your remarks about this lead..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="min-h-[120px]"
              disabled={isLoading || !!selectedStatus}
            />
            <p className="text-xs text-gray-500 mt-2">
              Add remarks to document your interaction with this lead
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

