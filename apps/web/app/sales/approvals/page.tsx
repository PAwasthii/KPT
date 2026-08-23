"use client"

export const runtime = "edge"

import * as React from "react"
import { useRouter } from "next/navigation"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { useQueryStates, parseAsString } from "nuqs"
import { RoleGuard, useHasRole } from "@/components/guards/RoleGuard"
import { Tabs, TabsContent, TabsContents, TabsList, TabsTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui"
import { ApprovalsTable } from "@/components/approvals/approvals-table"
import { useAllApprovals, useMyApprovals } from "@/hooks/useApprovals"

const STATUS_OPTIONS = [
  { value: "__all__", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

const TARGET_OPTIONS = [
  { value: "__all__", label: "All types" },
  { value: "QUOTE", label: "Quote" },
  { value: "OPP", label: "Opportunity" },
]

const MY_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending_for_me", label: "Pending for me" },
  { value: "raised_by_me", label: "Raised by me" },
]

function ApprovalsPageContent() {
  const router = useRouter()
  const isAdmin = useHasRole(["SYSTEM_ADMIN", "ADMIN"])
  const [queryState, setQuery] = useQueryStates(
    {
      tab: parseAsString.withDefault(isAdmin ? "all" : "my"),
      status: parseAsString.withDefault(""),
      targetObjectName: parseAsString.withDefault(""),
      type: parseAsString.withDefault("all"),
    },
    { history: "push", shallow: false }
  )
  const tab = isAdmin ? (queryState.tab === "my" ? "my" : "all") : "my"
  const status = queryState.status || ""
  const targetObjectName = queryState.targetObjectName || ""
  const type = queryState.type || "all"

  const [page, setPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)

  React.useEffect(() => {
    setPage(1)
  }, [tab, status, targetObjectName, type])

  const allParams = React.useMemo(
    () => ({
      status: status || undefined,
      targetObjectName: targetObjectName || undefined,
      page,
      limit: itemsPerPage,
    }),
    [status, targetObjectName, page, itemsPerPage]
  )
  const myParams = React.useMemo(
    () => ({
      type: type === "all" ? undefined : type,
      status: status || undefined,
      targetObjectName: targetObjectName || undefined,
      page,
      limit: itemsPerPage,
    }),
    [type, status, targetObjectName, page, itemsPerPage]
  )

  const { data: allData, pagination: allPagination, isLoading: allLoading } = useAllApprovals(tab === "all" ? allParams : undefined)
  const { data: myData, pagination: myPagination, isLoading: myLoading } = useMyApprovals(tab === "my" ? myParams : undefined)

  const handleQuoteNoClick = React.useCallback(
    (approval: { id: string }) => {
      router.push(`/sales/approvals/${approval.id}`)
    },
    [router]
  )

  const setTab = React.useCallback(
    (v: string) => {
      setQuery({ tab: v === "my" ? "my" : "all" })
    },
    [setQuery]
  )

  const filterContent = (
    <div className="flex items-center gap-2 flex-wrap">
      {tab === "my" && (
        <Select
          value={type}
          onValueChange={(v) => setQuery({ type: v || "all" })}
        >
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {MY_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={status || "__all__"}
        onValueChange={(v) => setQuery({ status: v === "__all__" ? "" : v })}
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={targetObjectName || "__all__"}
        onValueChange={(v) => setQuery({ targetObjectName: v === "__all__" ? "" : v })}
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Target" />
        </SelectTrigger>
        <SelectContent>
          {TARGET_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const allPaginationProps = {
    count: allPagination?.totalItems ?? 0,
    currentPage: page,
    totalPages: allPagination?.totalPages ?? 1,
    itemsPerPage,
    onPageChange: setPage,
    onItemsPerPageChange: setItemsPerPage,
  }
  const myPaginationProps = {
    count: myPagination?.totalItems ?? 0,
    currentPage: page,
    totalPages: myPagination?.totalPages ?? 1,
    itemsPerPage,
    onPageChange: setPage,
    onItemsPerPageChange: setItemsPerPage,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-muted-foreground">Manage approval requests</p>
      </div>

      <Tabs value={tab} onValueChange={isAdmin ? setTab : undefined}>
        <TabsList className="justify-start space-x-16 border-b border-gray-300">
          {isAdmin && (
            <TabsTrigger
              value="all"
              className="text-3xl font-medium data-[state=active]:border-b-[6px] data-[state=active]:border-gray-700"
            >
              All Approvals
            </TabsTrigger>
          )}
          <TabsTrigger
            value="my"
            className="text-3xl font-medium data-[state=active]:border-b-[6px] data-[state=active]:border-gray-700"
          >
            My Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContents className="mt-6">
          <TabsContent value="all">
            {allLoading ? (
              <div className="text-sm text-muted-foreground py-6">Loading approvals...</div>
            ) : (
              <ApprovalsTable
                approvals={allData ?? []}
                title="All Approvals"
                onQuoteNoClick={handleQuoteNoClick}
                columnPreferenceKey="approvals-all"
                headerLeadingContent={filterContent}
                {...allPaginationProps}
              />
            )}
          </TabsContent>
          <TabsContent value="my">
            {myLoading ? (
              <div className="text-sm text-muted-foreground py-6">Loading approvals...</div>
            ) : (
              <ApprovalsTable
                approvals={myData ?? []}
                title="My Approvals"
                onQuoteNoClick={handleQuoteNoClick}
                columnPreferenceKey="approvals-my"
                headerLeadingContent={filterContent}
                {...myPaginationProps}
              />
            )}
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
  )
}

export default function ApprovalsPage() {
  return (
    <RoleGuard allowedRoles={["SYSTEM_ADMIN", "ADMIN", "SALES"]}>
      <NuqsAdapter>
        <ApprovalsPageContent />
      </NuqsAdapter>
    </RoleGuard>
  )
}
