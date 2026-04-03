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

  const projectData = projects.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "..." : p.name,
    tasks: tasks.filter((t) => t.projectId === p.id).length,
  }));

  if (loading)
    return (
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-64" />
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
                    {statusData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
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
                    {priorityData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks per Project</CardTitle>
          </CardHeader>
          <CardContent>
            {projectData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                No projects yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projectData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
