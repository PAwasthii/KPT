"use client";

import * as React from "react";
import { cn } from "@repo/ui/lib/utils";
import { useSidebar } from "./sidebar-provider";

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  return (
    <div className={cn(
      "flex items-center gap-2 p-4 border-b border-sidebar-border transition-[justify-content] duration-200 ease-in-out",
      open ? "justify-between" : "justify-center",
      className
    )} {...props} />
  );
}
