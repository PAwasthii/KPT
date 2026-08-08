"use client"

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { cn } from "@repo/ui/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend
);

interface DonutChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
      borderColor?: string[];
      borderWidth?: number;
    }[];
  };
  title?: string;
  subtitle?: string;
  className?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export function DonutChart({
  data,
  title,
  subtitle,
  className,
  showLegend = true,
  legendPosition = 'bottom'
}: DonutChartProps) {
  // Chart.js built-in legend is disabled; we render a custom legend that follows
  // the Synkro brand guideline (2.5 Proportions): square swatch + bold percentage
  // + label.
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '68%',
  };

  const values = data?.datasets?.[0]?.data ?? [];
  const colors = data?.datasets?.[0]?.backgroundColor ?? [];
  const total = values.reduce((a, b) => a + (Number(b) || 0), 0);

  const legendItems = (data?.labels ?? []).map((label, i) => {
    const value = Number(values[i]) || 0;
    const pct = total ? Math.round((value / total) * 100) : 0;
    return { label, color: colors[i] || '#009D9A', pct };
  });

  const isSide = legendPosition === 'right' || legendPosition === 'left';

  const LegendEl = showLegend ? (
    <div
      className={cn(
        isSide
          ? 'flex flex-col gap-3 pl-2'
          : 'mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2'
      )}
    >
      {legendItems.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-3.5 w-3.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm font-bold text-foreground tabular-nums">
            {item.pct}%
          </span>
          <span className="text-sm text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      {(title || subtitle) && (
        <div className="text-center mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div
        className={cn(
          "flex-1 min-h-0",
          isSide ? "flex flex-row items-center justify-center gap-4" : "flex flex-col"
        )}
      >
        <div className={cn("flex items-center justify-center min-h-0", isSide ? "flex-1 h-full" : "flex-1 w-full")}>
          <div className={cn("h-full", isSide ? "aspect-square max-h-full" : "w-full max-w-[220px] mx-auto")}>
            <Doughnut data={data} options={options} />
          </div>
        </div>
        {LegendEl}
      </div>
    </div>
  );
}
