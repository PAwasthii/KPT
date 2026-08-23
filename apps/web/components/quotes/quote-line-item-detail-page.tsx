"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Button,
  Card,
  CardContent,
  DetailPageHeader,
  InfoField,
  InfoGrid,
} from "@repo/ui"
import { useQuoteLineItems } from "@/hooks/useQuotes"
import { useCurrency } from "@/contexts/CurrencyContext"

type QuoteLineItemDetailPageProps = {
  quoteId: string
  lineItemId: string
}

export function QuoteLineItemDetailPage({
  quoteId,
  lineItemId,
}: QuoteLineItemDetailPageProps) {
  const router = useRouter()
  const { symbol, convert } = useCurrency()

  const { data: lineItems = [], isLoading, isError } = useQuoteLineItems(quoteId, { limit: 100 })

  const lineItem = lineItems.find((item) => String(item.id) === lineItemId)

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading line item...</div>
  }

  if (isError || !lineItem) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-lg font-semibold">Line item not found</div>
        <Button variant="outline" onClick={() => router.push(`/sales/quotes/${quoteId}`)}>
          Back to Quote
        </Button>
      </div>
    )
  }

  const listPrice = Number(lineItem.listPrice ?? 0)
  const unitPrice = Number(lineItem.unitPrice ?? 0)
  const totalPrice = Number(lineItem.totalPrice ?? 0)
  const discount = Number(lineItem.discount ?? 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <DetailPageHeader
        title={lineItem.product?.name ?? `Line Item #${lineItem.id}`}
        onBack={() => router.push(`/sales/quotes/${quoteId}`)}
      />

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <InfoGrid columns={2}>
            <InfoField label="Product" value={lineItem.product?.name ?? "—"} />
            <InfoField label="Product Code" value={lineItem.product?.code ?? "—"} />
            <InfoField label="Quantity" value={String(lineItem.quantity)} />
            <InfoField label="List Price" value={`${symbol}${convert(listPrice).toLocaleString()}`} />
            <InfoField label="Discount" value={`${discount.toFixed(2)}%`} />
            <InfoField label="Unit Price" value={`${symbol}${convert(unitPrice).toLocaleString()}`} />
            <InfoField label="Total Price" value={`${symbol}${convert(totalPrice).toLocaleString()}`} />
            <InfoField label="Sort Order" value={String(lineItem.sortOrder)} />
            {lineItem.description && (
              <div className="col-span-2 space-y-1.5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{lineItem.description}</p>
              </div>
            )}
          </InfoGrid>
        </CardContent>
      </Card>
    </div>
  )
}
