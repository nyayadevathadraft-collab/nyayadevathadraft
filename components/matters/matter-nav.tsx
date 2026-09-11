"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  matterId: string;
  active: "upload" | "facts" | "issues" | "authorities" | "draft" | "review" | "export" | "history";
}

const TABS = [
  { key: "upload", label: "Documents", href: (id: string) => `/matters/${id}/upload` },
  { key: "facts", label: "Facts", href: (id: string) => `/matters/${id}/facts` },
  { key: "issues", label: "Issues", href: (id: string) => `/matters/${id}/issues` },
  { key: "authorities", label: "Authorities", href: (id: string) => `/matters/${id}/authorities` },
  { key: "draft", label: "Draft", href: (id: string) => `/matters/${id}/draft` },
  { key: "review", label: "Review", href: (id: string) => `/matters/${id}/review-draft` },
  { key: "export", label: "Export", href: (id: string) => `/matters/${id}/export` },
  { key: "history", label: "History", href: (id: string) => `/matters/${id}/history` },
];

export function MatterNav({ matterId, active }: Props) {
  return (
    <nav className="flex gap-1 border-b border-gray-200 pb-0 -mx-8 px-8">
      {TABS.map(({ key, label, href }) => (
        <Link
          key={key}
          href={href(matterId)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            active === key
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
