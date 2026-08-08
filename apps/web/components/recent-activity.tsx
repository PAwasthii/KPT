"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

interface ActivityItemProps {
  action: string;
  time: string;
  accentClass: string;
}

function ActivityItem({ action, time, accentClass }: ActivityItemProps) {
  return (
    <div className="group flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-white ${accentClass}`}
        />
        <span className="truncate text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
          {action}
        </span>
      </div>
      <span
        className="shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide select-none
        bg-gray-50/80 border-gray-200 text-gray-700 group-hover:bg-white group-hover:border-gray-300 transition-colors"
      >
        {time}
      </span>
    </div>
  );
}

export function RecentActivity() {
  const activities = [
    { action: 'New lead from Landing Page', time: '2 mins ago' },
    { action: 'Campaign "Summer Sale" launched', time: '15 mins ago' },
    { action: 'Email sent to 120 contacts', time: '1 hour ago' },
    { action: 'WhatsApp message sent to 102 contacts', time: '2 hours ago' },
    { action: 'New campaign completed', time: '3 hours ago' },
    { action: 'Email campaign completed', time: '5 hours ago' },
  ];

  function getAccentClass(action: string) {
    const text = action.toLowerCase();
    if (text.includes('whatsapp')) return 'bg-brand-turquoise/90 ring-brand-turquoise/30';
    if (text.includes('email')) return 'bg-brand-teal/90 ring-brand-teal/30';
    if (text.includes('campaign')) return 'bg-brand-indigo/90 ring-brand-indigo/30';
    return 'bg-brand-teal/90 ring-brand-teal/30';
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-wide">Recent Activity</CardTitle>
        <p className="mt-1 text-xs text-gray-500">Latest events across your campaigns</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {activities.map((activity, index) => (
            <ActivityItem
              key={index}
              action={activity.action}
              time={activity.time}
              accentClass={getAccentClass(activity.action)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
