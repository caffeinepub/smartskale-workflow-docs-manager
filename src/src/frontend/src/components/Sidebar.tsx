import type { Identity } from "@icp-sdk/core/agent";
import {
  BarChart2,
  Bell,
  CheckSquare,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import type { Page } from "../App";
import { cn } from "../lib/utils";

interface SidebarProps {
  currentPage: string;
  navigate: (p: Page) => void;
  onLogout: () => void;
  identity: Identity;
}

const navItems = [
  { name: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { name: "projects", label: "Projects", icon: FolderKanban },
  { name: "tasks", label: "Tasks", icon: CheckSquare },
  { name: "documents", label: "Documents", icon: FileText },
  { name: "team", label: "Team", icon: Users },
  { name: "reports", label: "Reports", icon: BarChart2 },
  { name: "notifications", label: "Notifications", icon: Bell },
];

export function Sidebar({
  currentPage,
  navigate,
  onLogout,
  identity,
}: SidebarProps) {
  const principal = identity.getPrincipal().toString();
  const shortPrincipal = principal.slice(0, 5) + "..." + principal.slice(-3);

  return (
    <div className="w-60 bg-slate-900 flex flex-col h-full border-r border-slate-700/50 shrink-0">
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 rounded-lg p-1.5">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">
              SmartSkale
            </div>
            <div className="text-blue-400 text-xs">WorkFlow Manager</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ name, label, icon: Icon }) => {
          const active = currentPage === name;
          return (
            <button
              key={name}
              onClick={() => navigate({ name } as Page)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-60" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 mb-2">
          <div className="bg-blue-500 rounded-full h-7 w-7 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {shortPrincipal.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate">User</div>
            <div className="text-slate-500 text-xs truncate">
              {shortPrincipal}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
