"use client";

import * as React from "react";
import { Button } from "../button";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-provider";

export function SidebarTrigger() {
  const { toggle } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
