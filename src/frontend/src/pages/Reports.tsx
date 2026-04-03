import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Project, Task } from "../backend";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

const STATUS_COLORS = ["#64748b", "#3b82f6", "#f59e0b", "#22c55e"];
const PRIORITY_COLORS = ["#94a3b8", "#3b82f6", "#f97316", "#ef4444"];
const PROJECT_STATUS_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#f59e0b",
  "#22c55e",
  "#ef4444",
];

export function Reports() {
  const { actor } = useActor();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    Promise.all([actor.getTasks(), actor.getProjects()])
      .then(([t, p]) => {
        setTasks(t);
        setProjects(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  const completionRate =
    tasks.length > 0
      ? Math.round(
          (tasks.filter((t) => getKey(t.status) === "DONE").length /
            tasks.length) *
            100,
        )
      : 0;

  const statusData = [
    {
      name: "TODO",
      value: tasks.filter((t) => getKey(t.status) === "TODO").length,
      color: STATUS_COLORS[0],
    },
    {
      name: "In Progress",
      value: tasks.filter((t) => getKey(t.status) === "IN_PROGRESS").length,
      color: STATUS_COLORS[1],
    },
    {
      name: "In Review",
      value: tasks.filter((t) => getKey(t.status) === "IN_REVIEW").length,
      color: STATUS_COLORS[2],
    },
    {
      name: "Done",
      value: tasks.filter((t) => getKey(t.status) === "DONE").length,
      color: STATUS_COLORS[3],
    },
  ];

  const priorityData = [
    {
      name: "Low",
      value: tasks.filter((t) => getKey(t.priority) === "LOW").length,
      color: PRIORITY_COLORS[0],
    },
    {
      name: "Medium",
      value: tasks.filter((t) => getKey(t.priority) === "MEDIUM").length,
      color: PRIORITY_COLORS[1],
    },
    {
      name: "High",
      value: tasks.filter((t) => getKey(t.priority) === "HIGH").length,
      color: PRIORITY_COLORS[2],
    },
    {
      name: "Urgent",
      value: tasks.filter((t) => getKey(t.priority) === "URGENT").length,
      color: PRIORITY_COLORS[3],
    },
  ];

  const projectTaskData = projects.map((p) => ({
    name: p.name.length > 14 ? `${p.name.slice(0, 14)}...` : p.name,
    tasks: tasks.filter((t) => t.projectId === p.id).length,
    done: tasks.filter(
      (t) => t.projectId === p.id && getKey(t.status) === "DONE",
    ).length,
  }));

  const projectStatusData = [
    {
      name: "Planning",
      value: projects.filter((p) => getKey(p.status) === "PLANNING").length,
      color: PROJECT_STATUS_COLORS[0],
    },
    {
      name: "Active",
      value: projects.filter((p) => getKey(p.status) === "ACTIVE").length,
      color: PROJECT_STATUS_COLORS[1],
    },
    {
      name: "On Hold",
      value: projects.filter((p) => getKey(p.status) === "ON_HOLD").length,
      color: PROJECT_STATUS_COLORS[2],
    },
    {
      name: "Completed",
      value: projects.filter((p) => getKey(p.status) === "COMPLETED").length,
      color: PROJECT_STATUS_COLORS[3],
    },
    {
      name: "Cancelled",
      value: projects.filter((p) => getKey(p.status) === "CANCELLED").length,
      color: PROJECT_STATUS_COLORS[4],
    },
  ].filter((d) => d.value > 0);

  if (loading)
    return (
      <div className="space-y-4">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="h-64" />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Analytics overview of your workspace
        </p>
      </div>

      {/* Completion Rate */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                Overall Completion Rate
              </p>
              <p className="text-5xl font-bold text-slate-900 mt-1">
                {completionRate}%
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {tasks.filter((t) => getKey(t.status) === "DONE").length} of{" "}
                {tasks.length} tasks completed
              </p>
            </div>
            <div className="relative">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <title>Completion rate circle</title>
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray={`${completionRate}, 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {statusData.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {priorityData.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks per Project</CardTitle>
          </CardHeader>
          <CardContent>
            {projectTaskData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                No projects yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projectTaskData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="tasks"
                    name="Total"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="done"
                    name="Done"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            {projectStatusData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                No projects yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {projectStatusData.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
