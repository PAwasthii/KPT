"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

interface CampaignItemProps {
  name: string;
  metric: string;
  value: string;
}

function CampaignItem({ name, metric, value }: CampaignItemProps) {
  const percent = (() => {
    const match = value.match(/([+\-]?\d+)/);
    const num = Number.parseInt(match?.[1] ?? '0', 10);
    return Math.max(0, Math.min(100, num));
  })();

  const metricColors: Record<string, { bg: string; text: string; bar: string }> = {
    conversion: { bg: 'bg-brand-pale-aqua border-brand-teal/30', text: 'text-brand-teal', bar: 'bg-brand-teal' },
    engagement: { bg: 'bg-brand-soft-white border-brand-indigo/20', text: 'text-brand-indigo', bar: 'bg-brand-indigo' },
    users: { bg: 'bg-brand-pale-aqua border-brand-turquoise/30', text: 'text-brand-turquoise', bar: 'bg-brand-turquoise' },
  };

  const colors = metricColors[metric] ?? { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', bar: 'bg-gray-400' };

  return (
    <div className="group py-2.5 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-sm text-gray-800 truncate">{name}</span>
          <span className={`hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}>
            {metric}
          </span>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-brand-teal">
          <span aria-hidden>▲</span>
          {value}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-500 group-hover:opacity-90`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function TopPerformingCampaigns() {
  const campaigns = [
    { name: 'Summer Sale 2025', metric: 'conversion', value: '+23% conversion' },
    { name: 'Product Launch', metric: 'engagement', value: '+20% engagement' },
    { name: 'Newsletter Campaign', metric: 'users', value: '+15% users' },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-wide">Top Performing Campaigns</CardTitle>
        <p className="mt-1 text-xs text-gray-500">Quick glance at your strongest initiatives</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {campaigns.map((campaign, index) => (
            <CampaignItem
              key={index}
              name={campaign.name}
              metric={campaign.metric}
              value={campaign.value}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
