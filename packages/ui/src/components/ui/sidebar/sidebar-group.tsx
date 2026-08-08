import * as React from "react";
import { cn } from "@repo/ui/lib/utils";

export function SidebarGroup({
  title,
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement> & { title?: string }) {
  return (
    <div className={cn("mb-4", className)}>
      {title && (
        <h4 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h4>
      )}
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}
