"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";
import { useSidebar } from "./sidebar-provider";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../tooltip";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  icon?: LucideIcon;
  label: string;
  href?: string;
  active?: boolean;
  target?: string;
}

export function SidebarItem({ icon: Icon, label, href, active }: SidebarItemProps) {
  const { open } = useSidebar();
  const className = cn(
    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 h-10 min-h-10",
    active && "bg-sidebar-primary text-sidebar-primary-foreground font-semibold hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
  );

  const content = (
    <>
      {active && (
        <span className="absolute left-0 inset-y-[6px] w-[3px] rounded-r-full bg-sidebar-primary-foreground/80 pointer-events-none" />
      )}
      {Icon && (
        <span className={cn(
          "flex-shrink-0 transition-transform duration-150",
          !active && "group-hover:scale-110"
        )}>
          {React.createElement(Icon, { size: 18 })}
        </span>
      )}
      <span className={cn(
        "transition-opacity duration-150 ease-in-out whitespace-nowrap",
        !open && "opacity-0 w-0 overflow-hidden"
      )}>
        {label}
      </span>
    </>
  );

  const itemContent = href ? (
    <Link href={href} prefetch={true} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );

  if (!open) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {itemContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white rounded-md px-2 py-1 text-xs border-none shadow-lg">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return itemContent;
}
