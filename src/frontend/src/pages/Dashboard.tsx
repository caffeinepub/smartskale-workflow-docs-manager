import {
  BarChart3,
  CheckSquare,
  FolderKanban,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Page } from "../App";
import type { DashboardStats, Project } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

function timeAgo(nanoseconds: bigint): string {
  const ms = Number(nanoseconds) / 1_000_000;
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

interface Props {
  navigate: (p: Page) => void;
}

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export function Dashboard({ navigate }: Props) {
  const { actor } = useActor();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<
    { projectId: string; done: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    Promise.all([
      actor.getDashboardStats(),
      actor.getProjects(),
      actor.getTasks(),
    ])
      .then(([s, p, t]) => {
        setStats(s);
        setProjects(p);
        setAllTasks(
          t.map((task) => ({
            projectId: task.projectId,
            done: getKey(task.status) === "DONE",
          })),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton key={k} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalProjects = Number(stats?.totalProjects ?? 0);
  const totalTasks = Number(stats?.totalTasks ?? 0);
  const inProgress = Number(stats?.inProgressCount ?? 0);
  const done = Number(stats?.doneCount ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Overview of your workspace
          </p>
        </div>
        <Button onClick={() => navigate({ name: "projects" })}>
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Projects"
          value={totalProjects}
          subtitle="All workspaces"
          icon={FolderKanban}
          color="bg-blue-600"
        />
        <MetricCard
          title="Total Tasks"
          value={totalTasks}
          subtitle="Across all projects"
          icon={CheckSquare}
          color="bg-violet-600"
        />
        <MetricCard
          title="In Progress"
          value={inProgress}
          subtitle="Active tasks"
          icon={TrendingUp}
          color="bg-amber-500"
        />
        <MetricCard
          title="Completed"
          value={done}
          subtitle="Done tasks"
          icon={BarChart3}
          color="bg-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Progress */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Project Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No projects yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate({ name: "projects" })}
                >
                  Create your first project
                </Button>
              </div>
            ) : (
              projects.slice(0, 6).map((p) => {
                const pTasks = allTasks.filter((t) => t.projectId === p.id);
                const pct =
                  pTasks.length > 0
                    ? Math.round(
                        (pTasks.filter((t) => t.done).length / pTasks.length) *
                          100,
                      )
                    : 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="space-y-1.5 cursor-pointer w-full text-left bg-transparent border-0 p-0"
                    onClick={() =>
                      navigate({ name: "project-detail", id: p.id })
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                        {p.name}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0 ml-2">
                        {pct}%
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs text-slate-400">
                      {pTasks.filter((t) => t.done).length} / {pTasks.length}{" "}
                      tasks done
                    </p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats || stats.recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-0.5">
                      {a.actorId.toString().charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium capitalize">
                          {a.action.toLowerCase()}
                        </span>{" "}
                        <span className="text-slate-500 capitalize">
                          {a.entityType.toLowerCase()}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {timeAgo(a.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
