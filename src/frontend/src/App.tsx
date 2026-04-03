import { Bell, LayoutDashboard, Loader2, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { Dashboard } from "./pages/Dashboard";
import { DocumentEditor } from "./pages/DocumentEditor";
import { Documents } from "./pages/Documents";
import { KanbanBoard } from "./pages/KanbanBoard";
import { Notifications } from "./pages/Notifications";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { Reports } from "./pages/Reports";
import { Tasks } from "./pages/Tasks";
import { Team } from "./pages/Team";

export type Page =
  | { name: "dashboard" }
  | { name: "projects" }
  | { name: "project-detail"; id: string }
  | { name: "kanban"; id: string }
  | { name: "tasks" }
  | { name: "documents" }
  | { name: "document-editor"; id: string }
  | { name: "team" }
  | { name: "reports" }
  | { name: "notifications" };

export default function App() {
  const { identity, login, clear, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const { actor } = useActor();
  const [page, setPage] = useState<Page>({ name: "dashboard" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = (p: Page) => {
    setPage(p);
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (!actor) return;
    const poll = () => {
      actor
        .getMyNotifications()
        .then((notifs) => {
          setUnreadCount(notifs.filter((n) => !n.isRead).length);
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [actor]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-blue-600 rounded-xl p-3">
              <LayoutDashboard className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white leading-tight">
                SmartSkale
              </h1>
              <p className="text-blue-400 text-sm font-medium">
                WorkFlow Docs Manager
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Welcome back</h2>
            <p className="text-slate-400 text-lg">
              Manage Projects, Tasks & Docs — All in One Place
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {["Projects", "Tasks", "Docs"].map((f) => (
                <div
                  key={f}
                  className="bg-slate-700/50 rounded-lg p-3 text-center"
                >
                  <div className="text-blue-400 font-semibold text-sm">{f}</div>
                </div>
              ))}
            </div>
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-base h-12"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Sign in with Internet Identity"
              )}
            </Button>
            <p className="text-slate-500 text-xs">
              Secure authentication powered by Internet Computer
            </p>
          </div>
        </div>
      </div>
    );
  }

  const principal = identity.getPrincipal().toString();
  const shortPrincipal = `${principal.slice(0, 5)}...${principal.slice(-3)}`;

  const renderPage = () => {
    switch (page.name) {
      case "dashboard":
        return <Dashboard navigate={navigate} />;
      case "projects":
        return <Projects navigate={navigate} />;
      case "project-detail":
        return <ProjectDetail id={page.id} navigate={navigate} />;
      case "kanban":
        return <KanbanBoard projectId={page.id} navigate={navigate} />;
      case "tasks":
        return <Tasks navigate={navigate} />;
      case "documents":
        return <Documents navigate={navigate} />;
      case "document-editor":
        return <DocumentEditor docId={page.id} navigate={navigate} />;
      case "team":
        return <Team />;
      case "reports":
        return <Reports />;
      case "notifications":
        return (
          <Notifications
            onRead={() => setUnreadCount((c) => Math.max(0, c - 1))}
          />
        );
      default:
        return <Dashboard navigate={navigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative z-30 lg:z-auto h-full transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar
          currentPage={page}
          navigate={navigate}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <span className="font-semibold text-slate-800 hidden sm:block">
            SmartSkale WorkFlow
          </span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate({ name: "notifications" })}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {principal.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {shortPrincipal}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={clear} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderPage()}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
