"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@repo/ui/components/ui/dropdown-menu"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Filter, ChevronDown, Columns, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { getColumnPreferences, setColumnPreferences } from "../lib/user-preferences"
import tableScrollbarStyles from "./table-scrollbar.module.css"
import { cn } from "@repo/ui/lib/utils"

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  render?: (value: any, item: T) => React.ReactNode
  className?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  title: string
  count: number
  actionItems?: Array<{
    label: string
    onClick: (item: T) => void
    className?: string
  }>
  customActions?: (item: T) => React.ReactNode
  onNameClick?: (item: T) => void
  onRowClick?: (item: T) => void
  getRowHref?: (item: T) => string | undefined
  // Pagination props
  currentPage?: number
  totalPages?: number
  itemsPerPage?: number
  onPageChange?: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  // Filter props
  showFilter?: boolean
  customFilter?: React.ReactNode
  filterBadges?: React.ReactNode
  // Checkbox props
  showCheckboxes?: boolean
  selectedItems?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  // Search props
  searchQuery?: string
  isSearchMode?: boolean
  columnPreferenceKey?: string
  /** Rendered in the header row to the left of the Columns button */
  headerLeadingContent?: React.ReactNode
  /** Rendered in the header row to the right of Columns (Columns will be to the left of this) */
  headerTrailingContent?: React.ReactNode
  /** Rendered inline immediately after the title text */
  titleSuffix?: React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  count,
  actionItems = [],
  customActions,
  onNameClick,
  onRowClick,
  getRowHref,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  showFilter = false,
  customFilter,
  filterBadges,
  showCheckboxes = false,
  selectedItems = [],
  onSelectionChange,
  searchQuery,
  isSearchMode = false,
  columnPreferenceKey,
  headerLeadingContent,
  headerTrailingContent,
  titleSuffix,
}: DataTableProps<T>) {
  const router = useRouter()

  // Column visibility state - initialize with all columns visible
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const defaultColumns = new Set(columns.map(col => String(col.key)))
    if (typeof window === "undefined" || !columnPreferenceKey) {
      return defaultColumns
    }
    const saved = getColumnPreferences(columnPreferenceKey)
    if (!saved?.visibleColumns?.length) {
      return defaultColumns
    }
    const validSaved = saved.visibleColumns.filter((key) =>
      columns.some((col) => String(col.key) === key)
    )
    return validSaved.length > 0 ? new Set(validSaved) : defaultColumns
  })

  // Update visible columns when columns prop changes
  useEffect(() => {
    const currentKeys = new Set(columns.map(col => String(col.key)))
    setVisibleColumns(prev => {
      // Keep existing selections if columns haven't changed
      const newSet = new Set(prev)
      // Add any new columns (default to visible)
      currentKeys.forEach(key => {
        if (!newSet.has(key)) {
          newSet.add(key)
        }
      })
      // Remove columns that no longer exist
      newSet.forEach(key => {
        if (!currentKeys.has(key)) {
          newSet.delete(key)
        }
      })
      if (newSet.size === 0 && currentKeys.size > 0) {
        const [firstKey] = Array.from(currentKeys)
        if (firstKey) {
          newSet.add(firstKey)
        }
      }
      return newSet
    })
  }, [columns])

  useEffect(() => {
    if (!columnPreferenceKey) return
    const saved = getColumnPreferences(columnPreferenceKey)
    if (!saved?.visibleColumns?.length) return

    const validSaved = saved.visibleColumns.filter((key) =>
      columns.some((col) => String(col.key) === key)
    )

    if (validSaved.length === 0) return

    setVisibleColumns(prev => {
      const prevKeys = Array.from(prev)
      const isSame =
        prevKeys.length === validSaved.length &&
        prevKeys.every((key, index) => key === validSaved[index])
      if (isSame) return prev
      return new Set(validSaved)
    })
  }, [columnPreferenceKey, columns])

  useEffect(() => {
    if (!columnPreferenceKey) return
    setColumnPreferences(columnPreferenceKey, {
      visibleColumns: Array.from(visibleColumns),
    })
  }, [visibleColumns, columnPreferenceKey])

  // Filter columns based on visibility
  const visibleColumnsList = useMemo(() => {
    return columns.filter(col => visibleColumns.has(String(col.key)))
  }, [columns, visibleColumns])

  // Items per page state
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState("")
  
  // Column dropdown open state
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false)
  
  // Items per page dropdown open state
  const [itemsPerPageDropdownOpen, setItemsPerPageDropdownOpen] = useState(false)

  // Calculate pagination values
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, count)

  // Handle items per page change
  const handleItemsPerPageChange = (value: number) => {
    onItemsPerPageChange?.(value)
    setShowCustomInput(false)
    setCustomValue("")
  }

  const handleCustomSubmit = () => {
    const value = parseInt(customValue)
    if (value >= 1 && value <= 100) {
      handleItemsPerPageChange(value)
    }
  }

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = data.map(item => item.id?.toString() || '')
      onSelectionChange?.(allIds)
    } else {
      onSelectionChange?.([])
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedItems, itemId])
    } else {
      onSelectionChange?.(selectedItems.filter(id => id !== itemId))
    }
  }

  const isAllSelected = data.length > 0 && selectedItems.length === data.length

  // Column toggle handlers
  const handleToggleColumn = (columnKey: string, checked: boolean) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(columnKey)
      } else {
        // Prevent hiding all columns - ensure at least one remains visible
        if (newSet.size > 1) {
          newSet.delete(columnKey)
        }
      }
      return newSet
    })
  }

  const handleSelectAllColumns = () => {
    setVisibleColumns(new Set(columns.map(col => String(col.key))))
  }

  const handleDeselectAllColumns = () => {
    // Keep only the first column visible
    if (columns.length > 0 && columns[0]) {
      setVisibleColumns(new Set([String(columns[0].key)]))
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {/* Left: title + items-per-page */}
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-800">
            {title}
            {titleSuffix}
          </h3>
          {onPageChange && onItemsPerPageChange && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span>Show</span>
              <DropdownMenu open={itemsPerPageDropdownOpen} onOpenChange={setItemsPerPageDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    {itemsPerPage}
                    <ChevronDown className={cn("h-3 w-3 text-gray-400 transition-transform duration-150", itemsPerPageDropdownOpen && "rotate-180")} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-28 bg-white border border-gray-200 shadow-lg">
                  {[10, 20, 30, 40, 50].map((n) => (
                    <DropdownMenuItem key={n} onClick={() => handleItemsPerPageChange(n)} className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer">
                      {n}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => setShowCustomInput(true)} className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer">
                    Custom
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {showCustomInput && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="1–100"
                    value={customValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomValue(e.target.value)}
                    className="w-16 h-7 rounded-md border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    min="1"
                    max="100"
                  />
                  <button onClick={handleCustomSubmit} className="px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors">
                    Set
                  </button>
                  <button onClick={() => { setShowCustomInput(false); setCustomValue("") }} className="px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              )}
              <span>entries</span>
            </div>
          )}
          {isSearchMode && searchQuery && (
            <span className="text-sm text-gray-400">— results for &quot;{searchQuery}&quot;</span>
          )}
        </div>

        {/* Right: columns toggle + filter + extras */}
        <div className="flex items-center gap-2">
          {headerLeadingContent}
          {/* Column Selection Dropdown */}
          <DropdownMenu open={columnsDropdownOpen} onOpenChange={setColumnsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors",
                columnsDropdownOpen && "bg-gray-100"
              )}>
                <Columns className="h-3.5 w-3.5" />
                Columns
                <ChevronDown className={cn("h-3 w-3 text-gray-400 transition-transform duration-150", columnsDropdownOpen && "rotate-180")} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white border border-gray-200 shadow-lg">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Toggle columns</div>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem onClick={handleSelectAllColumns} className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer text-sm">
                Select all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeselectAllColumns} className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer text-sm">
                Deselect all
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              {columns.map((column) => {
                const columnKey = String(column.key)
                const isVisible = visibleColumns.has(columnKey)
                return (
                  <DropdownMenuCheckboxItem
                    key={columnKey}
                    checked={isVisible}
                    onCheckedChange={(checked) => handleToggleColumn(columnKey, checked === true)}
                    disabled={isVisible && visibleColumns.size === 1}
                    className="hover:bg-gray-50 focus:bg-gray-50 text-sm"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {showFilter && (
            customFilter ? customFilter : (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
            )
          )}
          {headerTrailingContent}
        </div>
      </div>

      {/* Filter Badges */}
      {filterBadges && (
        <div className="flex flex-wrap items-center gap-2">
          {filterBadges}
        </div>
      )}

      {/* Table card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className={cn("overflow-x-auto overflow-y-auto", tableScrollbarStyles.tableScrollContainer, onPageChange ? 'h-[calc(100vh-340px)]' : 'h-[calc(100vh-280px)]')}>
          <table className="w-full">
            <thead>
              <tr className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                {showCheckboxes && (
                  <th className="w-10 px-4 py-3 text-left align-middle bg-gray-50">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(checked === true)}
                    />
                  </th>
                )}
                {visibleColumnsList.map((column, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left align-middle bg-gray-50"
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                      {column.label}
                      <ChevronsUpDown className="h-3 w-3 text-gray-400" />
                    </span>
                  </th>
                ))}
                {customActions && (
                  <th className="px-4 py-3 text-left align-middle bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      visibleColumnsList.length +
                      (showCheckboxes ? 1 : 0) +
                      (customActions ? 1 : 0)
                    }
                    className="h-32 text-center text-sm text-gray-400"
                  >
                    No results found.
                  </td>
                </tr>
              ) : (
                data.map((item, rowIndex) => {
                  const rowHref = getRowHref?.(item)
                  const hasHref = !!rowHref

                  return (
                    <tr
                      key={item.id || rowIndex}
                      className={cn(
                        rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60",
                        "transition-colors",
                        (onRowClick || hasHref) && "cursor-pointer hover:bg-accent/50"
                      )}
                      onClick={() => {
                        if (onRowClick) {
                          onRowClick(item)
                        } else if (rowHref) {
                          router.push(rowHref)
                        }
                      }}
                    >
                      {showCheckboxes && (
                        <td className="w-10 px-4 py-3.5 align-middle">
                          <Checkbox
                            checked={selectedItems.includes(item.id?.toString() || '')}
                            onCheckedChange={(checked) => {
                              handleSelectItem(item.id?.toString() || '', checked === true)
                            }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          />
                        </td>
                      )}
                      {visibleColumnsList.map((column, colIndex) => (
                        <td key={colIndex} className={cn("px-4 py-3.5 align-middle text-sm text-gray-700", column.className)}>
                          {(() => {
                            const cellContent = column.render
                              ? column.render(item[column.key], item)
                              : item[column.key]

                            if (hasHref && (column.key === 'name' || column.label.toLowerCase() === 'name')) {
                              return (
                                <Link
                                  href={rowHref}
                                  prefetch={true}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    onNameClick?.(item)
                                  }}
                                >
                                  {cellContent}
                                </Link>
                              )
                            }

                            if (onNameClick && (column.key === 'name' || column.label.toLowerCase() === 'name') && !hasHref) {
                              return (
                                <button
                                  type="button"
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation()
                                    onNameClick(item)
                                  }}
                                >
                                  {cellContent}
                                </button>
                              )
                            }
                            return cellContent
                          })()}
                        </td>
                      ))}
                      {customActions && (
                        <td className="px-4 py-3.5 align-middle">
                          <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            {customActions(item)}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination footer */}
      {onPageChange && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-500">
            Showing {startItem} to {endItem} of {count} entries
          </p>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(currentPage - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            {(() => {
              const pages: React.ReactNode[] = []
              const showEllipsis = totalPages > 7

              const pageBtn = (i: number) => (
                <button
                  key={i}
                  onClick={() => onPageChange?.(i)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                    currentPage === i
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 border border-gray-200 bg-white hover:bg-gray-50"
                  )}
                >
                  {i}
                </button>
              )

              if (!showEllipsis) {
                for (let i = 1; i <= totalPages; i++) pages.push(pageBtn(i))
              } else {
                const startPage = Math.max(2, currentPage - 1)
                const endPage = Math.min(totalPages - 1, currentPage + 1)

                pages.push(pageBtn(1))
                if (startPage > 2) {
                  pages.push(<span key="l-ellipsis" className="px-1 text-gray-400 text-sm">…</span>)
                }
                for (let i = startPage; i <= endPage; i++) pages.push(pageBtn(i))
                if (endPage < totalPages - 1) {
                  pages.push(<span key="r-ellipsis" className="px-1 text-gray-400 text-sm">…</span>)
                }
                if (totalPages > 1) pages.push(pageBtn(totalPages))
              }

              return pages
            })()}

            <button
              disabled={currentPage === totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* No-pagination count */}
      {!onPageChange && (
        <p className="text-sm text-gray-500">
          Showing {count} {count === 1 ? 'record' : 'records'}
        </p>
      )}
    </div>
  )
}
