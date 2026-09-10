"use client"

import * as React from "react"
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  SearchableSelect,
} from "@repo/ui"
import type { SearchableSelectItem } from "@repo/ui"
import { useAddOpportunityLineItem, useUpdateOpportunity } from "@/hooks/useOpportunities"
import { usePricebookEntriesByPriceBookId } from "@/hooks/usePricebookEntries"
import { usePricebooksWithPagination } from "@/hooks/usePricebooks"
import { toast } from "@/lib/toast"

type AddOpportunityLineItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: number
  priceBook?: { id: number; name: string } | null
}

export function AddOpportunityLineItemDialog({
  open,
  onOpenChange,
  opportunityId,
  priceBook,
}: AddOpportunityLineItemDialogProps) {
  const addLineItem = useAddOpportunityLineItem()
  const updateOpportunity = useUpdateOpportunity()

  // Local selected price book (initialized from prop; only user-selectable when prop is null)
  const [selectedPriceBookId, setSelectedPriceBookId] = React.useState<number | null>(
    priceBook?.id ?? null
  )
  const [productId, setProductId] = React.useState("")
  const [quantity, setQuantity] = React.useState(1)
  const [listPrice, setListPrice] = React.useState(0)
  const [discount, setDiscount] = React.useState(0)
  const [selectedEntryId, setSelectedEntryId] = React.useState<number | null>(null)

  // Fetch all active price books — only needed when no price book is locked on the opportunity
  const { data: pricebooks, isLoading: pbLoading } = usePricebooksWithPagination(
    { limit: 200 },
    { enabled: !priceBook && open }
  )

  // Fetch entries for whichever price book is selected
  const { data: entriesResponse, isLoading: entriesLoading } = usePricebookEntriesByPriceBookId(
    { priceBookId: selectedPriceBookId ?? 0 },
  )
  const entries = entriesResponse?.data ?? []

  // Reset all fields when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSelectedPriceBookId(priceBook?.id ?? null)
      setProductId("")
      setQuantity(1)
      setListPrice(0)
      setDiscount(0)
      setSelectedEntryId(null)
    }
  }, [open, priceBook])

  // Sync selectedPriceBookId when priceBook prop changes (e.g. parent sets it after first save)
  React.useEffect(() => {
    setSelectedPriceBookId(priceBook?.id ?? null)
  }, [priceBook])

  // Auto-fill list price and track the entry id when product selection changes
  React.useEffect(() => {
    if (!productId || !selectedPriceBookId) {
      setListPrice(0)
      setSelectedEntryId(null)
      return
    }
    const entry = entries.find((e) => String(e.productId) === productId)
    if (entry) {
      setListPrice(Number(entry.listPrice) || 0)
      setSelectedEntryId(entry.id)
    } else {
      setListPrice(0)
      setSelectedEntryId(null)
    }
  }, [productId, selectedPriceBookId, entries])

  // Build SearchableSelect items from the selected price book's entries
  const selectItems: SearchableSelectItem[] = entries.map((e) => ({
    value: String(e.productId),
    label: e.product?.name ?? `Product #${e.productId}`,
    searchText: e.product?.name ?? "",
  }))

  const productsDisabled = !selectedPriceBookId || entriesLoading
  const unitPrice = listPrice * (1 - discount / 100)
  const totalPrice = quantity * unitPrice

  // Submit is allowed only when a price book is chosen, a product is chosen, and qty > 0
  const canSubmit =
    !!selectedPriceBookId &&
    productId.length > 0 &&
    quantity > 0 &&
    listPrice >= 0 &&
    !addLineItem.isPending &&
    !updateOpportunity.isPending

  const handlePriceBookChange = (pbId: string) => {
    const id = pbId ? Number(pbId) : null
    setSelectedPriceBookId(id)
    // Reset product-level state whenever price book changes
    setProductId("")
    setListPrice(0)
    setDiscount(0)
    setSelectedEntryId(null)
  }

  const doAddLineItem = () => {
    addLineItem.mutate(
      {
        opportunityId,
        data: {
          productId: Number(productId),
          quantity,
          listPrice,
          discount,
          description: null,
          priceBookEntryId: selectedEntryId ?? undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Line item added successfully")
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(error, "Failed to add line item")
        },
      }
    )
  }

  const handleSubmit = () => {
    if (!canSubmit || !selectedPriceBookId) return

    if (!priceBook && selectedPriceBookId) {
      // Persist price book FIRST — the updateOpportunity controller deletes all line items
      // when priceBookId changes, so we must set it before adding any items.
      updateOpportunity.mutate(
        { id: opportunityId, data: { priceBookId: selectedPriceBookId } },
        {
          onSuccess: () => doAddLineItem(),
          onError: () => { toast.error(null, "Failed to save price book") },
        }
      )
    } else {
      doAddLineItem()
    }
  }

  const isBusy = addLineItem.isPending || updateOpportunity.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Price Book selector */}
          <div className="col-span-2 space-y-1.5">
            <Label>
              Price Book <span className="text-red-500">*</span>
            </Label>
            {priceBook ? (
              // Locked — opportunity already has a price book
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700">
                <span className="font-medium">{priceBook.name}</span>
                <span className="text-xs text-gray-400 ml-auto">locked</span>
              </div>
            ) : (
              <select
                value={selectedPriceBookId ? String(selectedPriceBookId) : ""}
                onChange={(e) => handlePriceBookChange(e.target.value)}
                disabled={pbLoading}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
              >
                <option value="">{pbLoading ? "Loading price books…" : "Select a price book"}</option>
                {pricebooks.map((pb) => (
                  <option key={pb.id} value={String(pb.id)}>
                    {pb.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product selector */}
          <div className="col-span-2 space-y-1.5">
            <Label>Product</Label>
            <SearchableSelect
              value={productId}
              onValueChange={setProductId}
              items={selectItems}
              placeholder={
                !selectedPriceBookId
                  ? "Select a price book first"
                  : entriesLoading
                  ? "Loading products…"
                  : "Select a product"
              }
              searchPlaceholder="Search products..."
              emptyText="No products found in this price book."
              disabled={productsDisabled}
              triggerClassName="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>List Price ($)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={listPrice}
              readOnly
              className="bg-gray-50 cursor-not-allowed"
              tabIndex={-1}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Discount (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Unit Price ($)</Label>
            <Input value={unitPrice.toFixed(2)} disabled />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Total Price ($)</Label>
            <Input value={totalPrice.toFixed(2)} disabled />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isBusy ? "Adding…" : "Add Line Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
