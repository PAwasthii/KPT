"use client"

import React, { useState } from 'react'
import { Button } from '@repo/ui/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/components/ui/dialog'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@repo/ui/components/ui/select'
import { leadService } from '@/lib/api/services'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultEntity: 'leads' | 'contacts' | 'accounts'
}

export const ExportModal: React.FC<Props> = ({ open, onOpenChange, defaultEntity }) => {
  const [entity, setEntity] = useState<'leads'|'contacts'|'accounts'>(defaultEntity)
  const [format, setFormat] = useState<'xlsx'|'csv'>('xlsx')
  const [startPage, setStartPage] = useState<number>(1)
  const [endPage, setEndPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(50)
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    try {
      setLoading(true)
      const blob = await leadService.downloadExport(entity, { startPage, endPage, limit, format })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const extension = format === 'csv' ? '.csv' : '.xlsx'
      a.download = `${entity}-${Date.now()}${extension}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {(() => { const DialogContentAny = DialogContent as any; const DialogHeaderAny = DialogHeader as any; const DialogTitleAny = DialogTitle as any; const DialogFooterAny = DialogFooter as any; return (
      <DialogContentAny>
        <DialogHeaderAny>
          <DialogTitleAny>Export to Excel/CSV</DialogTitleAny>
        </DialogHeaderAny>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="p-4 space-y-2">
              <Label className="mb-2">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'xlsx'|'csv')}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select format…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 space-y-2">
              <Label className="mb-2">Start page</Label>
              <Input type="number" min={1} value={startPage} onChange={(e) => setStartPage(parseInt(e.target.value || '1'))} />
            </div>
            <div className="p-4 space-y-2">
              <Label className="mb-2">End page</Label>
              <Input type="number" min={startPage} value={endPage} onChange={(e) => setEndPage(parseInt(e.target.value || String(startPage)))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 space-y-2">
              <Label className="mb-2">Page size</Label>
              <Input type="number" min={1} max={100} value={limit} onChange={(e) => setLimit(parseInt(e.target.value || '50'))} />
            </div>
          </div>
        </div>
        <DialogFooterAny>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleExport} disabled={loading}>Export</Button>
        </DialogFooterAny>
      </DialogContentAny>
      ); })()}
    </Dialog>
  )
}



