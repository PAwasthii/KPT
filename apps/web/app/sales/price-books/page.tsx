"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePricebooks } from "@/hooks/usePricebooks";
import { DataTable } from "@/components/data-table";
import type { TableColumn } from "@/components/data-table";
import type { PriceBook } from "@/lib/api/types";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { ChevronUp, ChevronDown, Search, ArrowLeft } from "lucide-react";

const columns: TableColumn<PriceBook>[] = [
  {
    key: "id",
    label: "ID",
    render: (id) => id,
  },
  {
    key: "name",
    label: "Name",
    render: (name) => name,
  },
  {
    key: "currencyISOCode",
    label: "Currency",
    render: (currencyISOCode) => <Badge variant="outline">{currencyISOCode}</Badge>,
  },
  {
    key: "isActive",
    label: "Status",
    render: (isActive) => (
      <Badge variant={isActive ? "default" : "destructive"}>
        {isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "description",
    label: "Description",
    render: (description) => description || "-",
  },
  {
    key: "createdAt",
    label: "Created At",
    render: (createdAt) => new Date(createdAt).toLocaleString(),
  },
];


export default function PriceBookEntriesPage() {
  const { data, isLoading, error } = usePricebooks();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("asc");
  const router = useRouter();

  const filteredAndSortedData = useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data;

    // Filter by name if search query exists
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }

    // Sort by ID if sort direction is set
    if (sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        if (sortDirection === "asc") {
          return a.id - b.id;
        } else {
          return b.id - a.id;
        }
      });
    }

    return filtered;
  }, [data?.data, searchQuery, sortDirection]);

  const handleSort = () => {
    if (sortDirection === null) {
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortDirection(null);
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Failed to load PriceBook</div>;

  return (
    <div className="p-6">
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <h1 className="text-xl font-semibold mb-4">
        Price Books
      </h1>
      
      {/* Filter and Sort Controls */}
      <div className="mb-4 flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={handleSort}
          className="flex items-center gap-2"
        >
          Sort by ID
          {sortDirection === "asc" && <ChevronUp className="h-4 w-4" />}
          {sortDirection === "desc" && <ChevronDown className="h-4 w-4" />}
          {sortDirection === null && <ChevronDown className="h-4 w-4 opacity-50" />}
        </Button>
      </div>

      <DataTable
        title="Price Books"
        data={filteredAndSortedData}
        columns={columns}
        count={filteredAndSortedData.length}
        getRowHref={(item) => `/sales/price-books/${item.id}`}
      />
    </div>
  );
}

