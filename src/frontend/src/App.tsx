import {
  Bell,
  Eye,
  EyeOff,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Toaster } from "./components/ui/sonner";
import { useActor } from "./hooks/useActor";
import { useAuth } from "./hooks/useAuth";
import { useUserProfile } from "./hooks/useUserProfile";
import { Dashboard } from "./pages/Dashboard";
import { DocumentEditor } from "./pages/DocumentEditor";
import { Documents } from "./pages/Documents";
import { KanbanBoard } from "./pages/KanbanBoard";
import { Notifications } from "./pages/Notifications";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { Reports } from "./pages/Reports";
import { SubProjectDetail } from "./pages/SubProjectDetail";
import { Tasks } from "./pages/Tasks";
import { Team } from "./pages/Team";

export type Page =
  | { name: "dashboard" }
  | { name: "projects" }
  | { name: "project-detail"; id: string }
  | { name: "sub-project-detail"; id: string; parentId: string }
  | { name: "kanban"; id: string }
  | { name: "tasks" }
  | { name: "documents" }
  | { name: "document-editor"; id: string }
  | { name: "team" }
  | { name: "reports" }
  | { name: "notifications" };

function LoginScreen() {
  const { login, isLoggingIn, loginError, isInitializing } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState("");

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (!username.trim()) {
      setLocalError("Username is required");
      return;
    }
    if (!password) {
      setLocalError("Password is required");
      return;
    }
    const ok = login(username, password);
    if (!ok) setLocalError(loginError || "Invalid username or password.");
  };

  const errorMsg = localError || loginError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
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
          <h2 className="text-3xl font-bold text-white">Welcome back</h2>
          <p className="text-slate-400 mt-1">
            Sign in to your account to continue
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex justify-center gap-3">
          {["Projects", "Tasks", "Docs"].map((f) => (
            <div
              key={f}
              className="bg-slate-700/50 rounded-lg px-4 py-2 text-center"
            >
              <div className="text-blue-400 font-semibold text-sm">{f}</div>
            </div>
          ))}
        </div>

        {/* Login form */}
        <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-slate-300 text-sm font-medium"
              >
                Username / Email
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setLocalError("");
                }}
                placeholder="e.g. admin@smartskale.tech"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 h-11"
                data-ocid="login.username.input"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-slate-300 text-sm font-medium"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLocalError("");
                  }}
                  placeholder="Enter your password"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 h-11 pr-10"
                  data-ocid="login.password.input"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p
                className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2"
                data-ocid="login.error_state"
              >
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-base h-12"
              data-ocid="login.submit_button"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs">
          SmartSkale WorkFlow &mdash; Secure access for your team
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, logout, isInitializing } = useAuth();
  const { actor } = useActor();
  const { profile } = useUserProfile();
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

  // Loading splash
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    switch (page.name) {
      case "dashboard":
        return <Dashboard navigate={navigate} />;
      case "projects":
        return <Projects navigate={navigate} />;
      case "project-detail":
        return <ProjectDetail id={page.id} navigate={navigate} />;
      case "sub-project-detail":
        return (
          <SubProjectDetail
            id={page.id}
            parentId={page.parentId}
            navigate={navigate}
          />
        );
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

  const displayName = profile?.name ?? user.profile.name;
  const displayRole = profile
    ? "ADMIN" in profile.userRole
      ? "Admin"
      : "MANAGER" in profile.userRole
        ? "Manager"
        : "Employee"
    : user.profile.userRole;
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

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
            data-ocid="topbar.notifications.button"
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
              {initials}
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-medium text-slate-700 leading-none">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 leading-none mt-0.5">
                {displayRole}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            data-ocid="topbar.logout.button"
            onClick={logout}
            title="Sign out"
          >
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
