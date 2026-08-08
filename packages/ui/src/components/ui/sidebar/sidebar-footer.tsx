"use client";

import * as React from "react";
import { cn } from "@repo/ui/lib/utils";
import { useSidebar } from "./sidebar-provider";

export function SidebarFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  return (
    <div className={cn("p-4 border-t-[1px] border-sidebar-border dark:border-neutral-800 h-12 flex items-center", className)} {...props}>
      <div className={cn("transition-opacity duration-150 ease-in-out w-full", !open && "opacity-0 overflow-hidden")}>
        {children}
      </div>
    </div>
  );
}
