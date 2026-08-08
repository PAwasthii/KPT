"use client"

import React, { useEffect } from 'react';
import { AnalyticsOverview } from './analytics-overview';
import { KeyMetrics } from './key-metrics';
import { RecentActivity } from './recent-activity';
import { TopPerformingCampaigns } from './top-campaigns';
import { ChartSkeleton, SectionSkeleton, StatGridSkeleton } from './skeletons';
import { useRouter } from 'next/navigation';

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Page Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Analytics Overview</h1>
          <p className="text-muted-foreground">
            Monitor your marketing performance and track key metrics
          </p>
        </div>
        <p className="text-sm text-muted-foreground sm:pt-2">
          Metrics update daily at 2 AM IST
        </p>
      </div>

      {/* Analytics Overview Cards */}
      <AnalyticsOverview />

      {/* Key Metrics */}
      <KeyMetrics />

      {/* Bottom Section - Two Columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <RecentActivity />
        
        {/* Top Performing Campaigns */}
        <TopPerformingCampaigns />
      </div>
    </div>
  );
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <SectionSkeleton titleWidth="w-64">
          <div className="space-y-2">
            <ChartSkeleton height={24} />
            <ChartSkeleton height={16} />
          </div>
        </SectionSkeleton>
      </div>
      <SectionSkeleton>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <ChartSkeleton key={idx} height={180} />
          ))}
        </div>
      </SectionSkeleton>
      <StatGridSkeleton count={6} />
      <div className="grid gap-6 md:grid-cols-2">
        <SectionSkeleton>
          <ChartSkeleton height={220} />
        </SectionSkeleton>
        <SectionSkeleton>
          <ChartSkeleton height={220} />
        </SectionSkeleton>
      </div>
    </div>
  );
}
