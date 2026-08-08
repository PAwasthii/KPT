"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useQueryStates, parseAsInteger } from "nuqs";
import { Plus } from "lucide-react";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { DataTable, type TableColumn } from "@/components/data-table";
import { CreateOpportunityDialog } from "@/components/opportunities/create-opportunity-dialog";
import { useOpportunitiesWithPagination } from "@/hooks/useOpportunities";
import type { OpportunityListItem } from "@/lib/api/types";

function OpportunitiesContent() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [{ page, limit }, setQuery] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(10),
    },
    { history: "push" }
  );

  const { data, pagination, isLoading, isError } =
    useOpportunitiesWithPagination({ page, limit });

  const columns = React.useMemo<TableColumn<OpportunityListItem>[]>(
    () => [
      {
        key: "name",
        label: "Opportunity Name",
        render: (value, item) => (
          <Link
            href={`/sales/opportunities/${item.id}`}
            className="text-muted-foreground hover:underline hover:text-blue-400"
          >
            {String(value)}
          </Link>
        ),
      },
      {
        key: "accountName",
        label: "Account Name",
        render: value => (
          <span className="text-muted-foreground">{value || "-"}</span>
        ),
      },
      {
        key: "stage",
        label: "Stage",
        render: value => (
          <span className="text-muted-foreground">{value || "-"}</span>
        ),
      },
      {
        key: "closeDate",
        label: "Close Date",
        render: value => (
          <span className="text-muted-foreground">
            {value
              ? new Date(value as string).toLocaleDateString("en-GB")
              : "-"}
          </span>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">
          Loading opportunities...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="text-sm text-red-500">
          Failed to load opportunities.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Opportunities</h1>
        </div>
        <div className="inline-flex items-center rounded-full border border-gray-300 bg-white">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50 border-b-4 border-b-transparent rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:border-b-gray-600 will-change-transform"
          >
            <Plus className="h-3 w-3" />
            Create Opportunity
          </button>
        </div>
      </div>

      <DataTable<OpportunityListItem>
        data={data}
        columns={columns}
        title="Opportunity Table"
        count={pagination?.totalItems ?? data.length}
        currentPage={page}
        totalPages={pagination?.totalPages ?? 1}
        itemsPerPage={limit}
        onPageChange={p => setQuery({ page: p })}
        onItemsPerPageChange={l => setQuery({ limit: l, page: 1 })}
      />

      <CreateOpportunityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={opportunity => {
          router.push(`/sales/opportunities/${opportunity.id}`);
        }}
      />
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <RoleGuard allowedRoles={["SYSTEM_ADMIN", "ADMIN", "SALES"]}>
      <NuqsAdapter>
        <OpportunitiesContent />
      </NuqsAdapter>
    </RoleGuard>
  );
}
