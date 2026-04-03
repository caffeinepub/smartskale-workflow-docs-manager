import {
  BarChart3,
  Bell,
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Users,
} from "lucide-react";
import type { Page } from "../App";

interface Props {
  currentPage: Page;
  navigate: (p: Page) => void;
  onClose: () => void;
}

const NAV_ITEMS = [
  { name: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { name: "projects" as const, label: "Projects", icon: FolderKanban },
  { name: "tasks" as const, label: "Tasks", icon: CheckSquare },
  { name: "documents" as const, label: "Documents", icon: FileText },
  { name: "team" as const, label: "Team", icon: Users },
  { name: "reports" as const, label: "Reports", icon: BarChart3 },
  { name: "notifications" as const, label: "Notifications", icon: Bell },
];

export function Sidebar({ currentPage, navigate, onClose }: Props) {
  const isActive = (name: string) => currentPage.name === name;

  return (
    <aside className="w-64 h-full bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-slate-800">
        <div className="bg-blue-600 rounded-lg p-1.5 mr-2.5">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">
            SmartSkale
          </div>
          <div className="text-blue-400 text-xs">WorkFlow Manager</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ name, label, icon: Icon }) => (
          <button
            type="button"
            key={name}
            onClick={() => {
              navigate({ name } as Page);
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(name)
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="text-xs text-slate-600 text-center">
          Powered by Internet Computer
        </div>
      </div>
    </aside>
  );
}
