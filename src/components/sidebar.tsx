"use client";

import * as React from "react";
import {
  ChevronRight,
  ChevronsLeft,
  FileCode2,
  Folder,
  GitBranch,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/logo";

/* Notion's sidebar rules, encoded:
   - 240px, sunken tint, no border between it and the page — just the tint edge
   - rows are 27px tall with a 3px radius and an instant hover fill
   - the disclosure chevron *replaces* the row icon on hover, it doesn't sit
     beside it. This is the detail everyone gets wrong.
   - section labels are 12px, tertiary, and are themselves hoverable rows  */

function Row({
  icon,
  label,
  depth = 0,
  active,
  chevron,
  open,
  onToggle,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  depth?: number;
  active?: boolean;
  chevron?: boolean;
  open?: boolean;
  onToggle?: () => void;
  action?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "reveal-parent group relative flex h-[27px] cursor-pointer items-center gap-1.5 rounded-sm pr-1",
        "text-[14px] transition-[background] duration-[20ms] ease-in",
        active
          ? "bg-active font-medium text-primary"
          : "text-secondary hover:bg-hover",
      )}
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={onClick}
    >
      <span className="relative flex size-[18px] shrink-0 items-center justify-center">
        {/* chevron takes over the icon slot on hover — Notion's signature swap */}
        {chevron ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="absolute inset-0 hidden items-center justify-center rounded-xs hover:bg-active group-hover:flex"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn(
                "size-3.5 text-tertiary transition-transform duration-150",
                open && "rotate-90",
              )}
            />
          </button>
        ) : null}
        <span
          className={cn(
            "text-tertiary",
            chevron && "group-hover:invisible",
          )}
        >
          {icon}
        </span>
      </span>
      <span className="truncate">{label}</span>
      {action ? <span className="reveal ml-auto flex">{action}</span> : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="reveal-parent flex h-[27px] items-center gap-1 rounded-sm px-2 text-[12px] font-medium text-tertiary hover:bg-hover">
      <span className="truncate">{children}</span>
      <button
        className="reveal ml-auto grid size-5 place-items-center rounded-xs text-tertiary hover:bg-active"
        aria-label="Add"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function Sidebar() {
  const [openApi, setOpenApi] = React.useState(true);
  const [openWeb, setOpenWeb] = React.useState(false);

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar">
      {/* workspace switcher */}
      <div className="reveal-parent flex items-center px-1 pt-1">
        <div className="flex h-[38px] flex-1 cursor-pointer items-center gap-2 rounded-sm px-2 hover:bg-hover">
          <Logo className="size-5 shrink-0 text-primary" />
          <span className="truncate text-[14px] font-medium text-primary">
            Codarc
          </span>
        </div>
        <button
          className="reveal grid size-7 place-items-center rounded-sm text-tertiary hover:bg-hover"
          aria-label="Collapse sidebar"
        >
          <ChevronsLeft className="size-[18px]" />
        </button>
      </div>

      <nav className="px-1 pb-2">
        <Row icon={<Search className="size-[18px]" />} label="Search" />
        <Row icon={<Sparkles className="size-[18px]" />} label="Ask Codarc" />
        <Row icon={<Settings className="size-[18px]" />} label="Settings" />
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-1">
        <SectionLabel>Repositories</SectionLabel>

        <Row
          icon={<Folder className="size-[18px]" />}
          label="trendstack-api"
          chevron
          open={openApi}
          onToggle={() => setOpenApi((v) => !v)}
          active
        />
        {openApi && (
          <>
            <Row
              icon={<GitBranch className="size-[18px]" />}
              label="Architecture map"
              depth={1}
            />
            <Row
              icon={<FileCode2 className="size-[18px]" />}
              label="routes/auth.py"
              depth={1}
            />
            <Row
              icon={<FileCode2 className="size-[18px]" />}
              label="services/billing.py"
              depth={1}
            />
            <Row
              icon={<FileCode2 className="size-[18px]" />}
              label="models/user.py"
              depth={1}
            />
          </>
        )}

        <Row
          icon={<Folder className="size-[18px]" />}
          label="trendstack-web"
          chevron
          open={openWeb}
          onToggle={() => setOpenWeb((v) => !v)}
        />

        <div className="mt-2">
          <SectionLabel>Shared</SectionLabel>
          <Row
            icon={<Share2 className="size-[18px]" />}
            label="Handoff for Chigu"
          />
        </div>
      </div>

      <div className="px-1 pb-2">
        <Row
          icon={<Plus className="size-[18px]" />}
          label="Connect a repo"
          onClick={() => {}}
        />
      </div>
    </aside>
  );
}
