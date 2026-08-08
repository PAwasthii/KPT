"use client"

import React, { useRef, useState } from 'react'
import { Button } from '@repo/ui/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/components/ui/dialog'
import { leadService } from '@/lib/api/services'
import { Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info, X, FileText, Users, Building, MapPin, Mail, Phone, Star } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { leadKeys } from '@/hooks/useLeads'
import { toast } from '@/lib/toast'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ImportLeadsModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const AnyDialog = Dialog as any
  const AnyDialogContent = DialogContent as any
  const AnyDialogHeader = DialogHeader as any
  const AnyDialogFooter = DialogFooter as any
  const AnyDialogTitle = DialogTitle as any
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()



  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    onOpenChange(false)
    try {
      await toast.promise(
        leadService.importLeads(file),
        {
          loading: 'Importing leads…',
          success: (res: any) => {
            // Refresh lead lists so imported leads appear immediately
            queryClient.invalidateQueries({ queryKey: leadKeys.all })
            if (res?.report?.base64) {
              const byteCharacters = atob(res.report.base64)
              const byteNumbers = new Array(byteCharacters.length)
              for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
              const byteArray = new Uint8Array(byteNumbers)
              const blob = new Blob([byteArray], { type: res.report.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = res.report.filename || `import-report.xlsx`
              document.body.appendChild(a)
              a.click()
              a.remove()
              URL.revokeObjectURL(url)
            }
            const inserted = res?.insertedCount ?? 0
            const skipped = (res?.skippedDuplicates ?? 0) || (res?.skippedCount ?? 0)
            return `Imported ${inserted}, skipped ${skipped}`
          },
          error: 'Import failed',
        },
        { duration: 5000 }
      )
    } finally {
      setLoading(false)
      // Clear file selection after import attempt
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    const blob = format === 'csv' 
      ? await leadService.downloadImportTemplateCsv()
      : await leadService.downloadImportTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const extension = format === 'csv' ? '.csv' : '.xlsx'
    a.download = `leads-template${extension}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <AnyDialog open={open} onOpenChange={onOpenChange}>
      <AnyDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <AnyDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <AnyDialogTitle className="text-2xl font-bold">Import Leads from Excel/CSV</AnyDialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your Excel or CSV file to import leads into your CRM system
              </p>
            </div>
          </div>
        </AnyDialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Upload Your File</h3>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              
              {!file ? (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Drop your Excel or CSV file here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Supports .xlsx and .csv formats
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.max(1, Math.round(file.size / 1024))} KB
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                  >
                    Choose Different File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Import Guidelines */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Required Fields */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Required Fields</h3>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">First Name</p>
                    <p className="text-sm text-red-600 dark:text-red-300">Required. Provide at least the lead&apos;s first name.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Last Name</p>
                    <p className="text-sm text-red-600 dark:text-red-300">Optional but recommended for clearer identification.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Email & Phone</p>
                    <p className="text-sm text-red-600 dark:text-red-300">Email and Phone are required</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Optional Fields</h3>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Company Name</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">Organization name</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Company Location</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">City, state, or country</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Status</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">Lead qualification status</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Values */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400">Lead Status Options</h3>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Open - Not Contacted</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">New lead that hasn't been contacted yet</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Working - Contacted</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Sales rep has reached out but not yet qualified</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Qualified</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Shows interest and meets qualification criteria</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Unqualified</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Not a good fit (no budget, authority, or interest)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Nurturing</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Not ready now but might be in the future</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Converted</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Converted into Account, Contact, and Opportunity</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-amber-800 dark:text-amber-200">Important Notes</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• Duplicates will be automatically skipped if email OR phone matches an existing lead</li>
                  <li>• Source will be set to <span className="font-medium">Import</span> automatically for all imported leads</li>
                  <li>• Both .xlsx and .csv formats are supported</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Template Download */}
          <div className="flex items-center justify-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => downloadTemplate('xlsx')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Excel Template
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadTemplate('csv')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download CSV Template
            </Button>
          </div>
        </div>

        <AnyDialogFooter className="flex gap-3 pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Leads
              </>
            )}
          </Button>
        </AnyDialogFooter>
      </AnyDialogContent>
    </AnyDialog>
  )
}



