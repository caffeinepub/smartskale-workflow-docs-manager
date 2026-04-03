import {
  Activity as ActivityIcon,
  CheckCheck,
  CheckSquare,
  Clock,
  FolderKanban,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Page } from "../App";
import type { Activity, DashboardStats } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
}

export function Dashboard({ navigate }: Props) {
  const { actor } = useActor();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    actor
      .getDashboardStats()
      .then((s) => {
        setStats(s);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  const chartData = stats
    ? [
        { name: "TODO", value: Number(stats.todoCount), color: "#64748b" },
        {
          name: "In Progress",
          value: Number(stats.inProgressCount),
          color: "#3b82f6",
        },
        {
          name: "In Review",
          value: Number(stats.inReviewCount),
          color: "#f59e0b",
        },
        { name: "Done", value: Number(stats.doneCount), color: "#22c55e" },
      ]
    : [];

  const statCards = [
    {
      title: "Total Projects",
      value: stats ? Number(stats.totalProjects) : 0,
      icon: FolderKanban,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      title: "Total Tasks",
      value: stats ? Number(stats.totalTasks) : 0,
      icon: CheckSquare,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      title: "In Progress",
      value: stats ? Number(stats.inProgressCount) : 0,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      title: "Completed",
      value: stats ? Number(stats.doneCount) : 0,
      icon: CheckCheck,
      color: "text-green-500",
      bg: "bg-green-50",
    },
  ];

  const formatTime = (ts: bigint) => {
    return new Date(Number(ts) / 1_000_000).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Overview of your workspace
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ name: "projects" })}
          >
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
          <Button size="sm" onClick={() => navigate({ name: "tasks" })}>
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon: Icon, color, bg }) => (
          <Card key={title} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`${bg} rounded-xl p-2.5`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-7 w-12 mb-1" />
                  ) : (
                    <div className="text-2xl font-bold text-slate-900">
                      {value}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 font-medium">
                    {title}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
              </div>
            ) : !stats?.recentActivities.length ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No activity yet. Start by creating a project!
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentActivities.map((a: Activity, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="bg-blue-100 rounded-full p-1.5 mt-0.5">
                      <ActivityIcon className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-700 font-medium">
                        {a.action} {a.entityType.toLowerCase()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatTime(a.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "New Project",
            desc: "Start a new project",
            page: "projects" as const,
            color: "border-blue-200 hover:border-blue-400",
          },
          {
            label: "New Task",
            desc: "Add a task",
            page: "tasks" as const,
            color: "border-purple-200 hover:border-purple-400",
          },
          {
            label: "New Document",
            desc: "Write a document",
            page: "documents" as const,
            color: "border-green-200 hover:border-green-400",
          },
        ].map(({ label, desc, page, color }) => (
          <button
            key={label}
            onClick={() => navigate({ name: page })}
            className={`p-5 rounded-xl border-2 border-dashed ${color} text-left transition-all bg-white hover:shadow-sm group`}
          >
            <div className="flex items-center gap-2 text-slate-700 font-semibold group-hover:text-slate-900">
              <Plus className="h-4 w-4" /> {label}
            </div>
            <div className="text-sm text-slate-400 mt-1">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
