"use client"

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { cn } from "@repo/ui/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }[];
  };
  title?: string;
  subtitle?: string;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  horizontal?: boolean;
}

export function BarChart({
  data,
  title,
  subtitle,
  className,
  showLegend = false,
  showGrid = true,
  horizontal = false
}: BarChartProps) {
  const options = {
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: !horizontal,
        grid: {
          display: showGrid && !horizontal,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        display: horizontal,
        grid: {
          display: showGrid && horizontal,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: horizontal ? 'y' as const : 'x' as const,
      intersect: false,
    },
  };

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="w-full h-full">
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  );
}
