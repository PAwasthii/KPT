"use client"

import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/api/client"

export function useRecentActivity(limit = 6) {
  return useQuery({
    queryKey: ["audit-logs-recent", limit],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/audit-logs", {
        params: { limit, sortBy: "changedAt", sortOrder: "desc" },
      })
      return data
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
