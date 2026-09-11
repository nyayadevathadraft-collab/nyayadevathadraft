"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderPlus,
  Settings,
  LogOut,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matters/new", label: "New Matter", icon: FolderPlus },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <aside className="w-60 flex flex-col bg-blue-950 text-white min-h-screen">
      <div className="px-5 py-6 border-b border-blue-900">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-lg tracking-tight">NyayaDraft AI</span>
        </div>
        <p className="text-xs text-blue-300 mt-1">Indian Legal Drafting</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-blue-800 text-white"
                : "text-blue-200 hover:bg-blue-900 hover:text-white"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-blue-900">
        <div className="px-3 py-2 text-xs text-blue-400 mb-2">
          AI outputs are drafts only — not legal advice.
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-blue-900 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
