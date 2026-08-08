import * as React from "react";
import { cn } from "@repo/ui/lib/utils";

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-2", className)} {...props} />
  );
}
