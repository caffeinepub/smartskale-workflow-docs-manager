import { Download } from "lucide-react";
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
import type { Activity, Project, Task, UserProfile } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { useActor } from "../hooks/useActor";
import { exportReportToExcel, exportToPDF } from "../utils/exportUtils";

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

const statusColors: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};
const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const COMPLETION_KEY = "smartskale_task_completion";
function getCompletions(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(COMPLETION_KEY) || "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

export function Reports() {
  const { actor } = useActor();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [exporting, setExporting] = useState("");

  // Task Status tab filters
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("ALL");
  const [taskProjectFilter, setTaskProjectFilter] = useState("ALL");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("ALL");

  useEffect(() => {
    if (!actor) return;
    Promise.all([
      actor.getTasks(),
      actor.getProjects(),
      actor.getAllProfiles(),
      actor.getRecentActivity(50n),
    ])
      .then(([t, p, pr, a]) => {
        setTasks(t);
        setProjects(p);
        setProfiles(pr);
        setActivities(a);
        setCompletions(getCompletions());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  // --- Computed values ---
  const now = Date.now();
  const overdue = tasks.filter((t) => {
    if (getKey(t.status) === "DONE") return false;
    if (t.dueDate.length === 0) return false;
    return Number(t.dueDate[0]) / 1_000_000 < now;
  }).length;

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

  // Task status tab filtered
  const filteredTasks = tasks.filter((t) => {
    if (taskStatusFilter !== "ALL" && getKey(t.status) !== taskStatusFilter)
      return false;
    if (
      taskPriorityFilter !== "ALL" &&
      getKey(t.priority) !== taskPriorityFilter
    )
      return false;
    if (taskProjectFilter !== "ALL" && t.projectId !== taskProjectFilter)
      return false;
    if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase()))
      return false;
    return true;
  });

  // Profile lookup
  const profileById = (id: string) =>
    profiles.find((p) => p.id.toString() === id);

  // Member stats
  const memberStats = profiles.map((prof) => {
    const profId = prof.id.toString();
    const myTasks = tasks.filter(
      (t) => t.assigneeId.length > 0 && t.assigneeId[0]?.toString() === profId,
    );
    const todo = myTasks.filter((t) => getKey(t.status) === "TODO").length;
    const inProgress = myTasks.filter(
      (t) => getKey(t.status) === "IN_PROGRESS",
    ).length;
    const done = myTasks.filter((t) => getKey(t.status) === "DONE").length;
    const pct =
      myTasks.length > 0 ? Math.round((done / myTasks.length) * 100) : 0;
    return { prof, total: myTasks.length, todo, inProgress, done, pct };
  });

  // Activity grouped by date
  const activityByDate = activities.reduce(
    (acc, a) => {
      const date = new Date(
        Number(a.timestamp) / 1_000_000,
      ).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date]!.push(a);
      return acc;
    },
    {} as Record<string, Activity[]>,
  );

  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || "Unknown";

  const handleExportTasksExcel = async () => {
    setExporting("tasks");
    try {
      await exportReportToExcel(
        filteredTasks.map((t) => ({
          Task: t.title,
          Project: getProjectName(t.projectId),
          Status: getKey(t.status).replace("_", " "),
          Priority: getKey(t.priority),
          Completion: `${completions[t.id] ?? 0}%`,
          "Due Date":
            t.dueDate.length > 0
              ? new Date(Number(t.dueDate[0]) / 1_000_000).toLocaleDateString()
              : "-",
        })),
        "Task Status",
        "smartskale-task-report",
      );
    } catch {
      /* ignore */
    }
    setExporting("");
  };

  const handleExportOverviewPDF = async () => {
    setExporting("overview");
    try {
      await exportToPDF(
        projects.map((p) => ({
          title: p.name,
          content: `Status: ${getKey(p.status)} | Priority: ${getKey(p.priority)}`,
          projectName: "",
          version: "",
          updatedAt: "",
        })),
        "smartskale-overview-report",
      );
    } catch {
      /* ignore */
    }
    setExporting("");
  };

  if (loading)
    return (
      <div className="space-y-4">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-64" />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Workspace analytics &amp; insights
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="taskstatus">Task Status</TabsTrigger>
          <TabsTrigger value="members">Assigned Members</TabsTrigger>
          <TabsTrigger value="activity">Member Activity</TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: OVERVIEW ===== */}
        <TabsContent value="overview" className="mt-4 space-y-5">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={exporting === "overview"}
              onClick={handleExportOverviewPDF}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              {exporting === "overview" ? "Exporting..." : "Export PDF"}
            </Button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: "Projects",
                value: projects.length,
                color: "text-indigo-600",
              },
              {
                label: "Total Tasks",
                value: tasks.length,
                color: "text-slate-700",
              },
              {
                label: "Open (TODO)",
                value: tasks.filter((t) => getKey(t.status) === "TODO").length,
                color: "text-slate-600",
              },
              {
                label: "In Progress",
                value: tasks.filter((t) => getKey(t.status) === "IN_PROGRESS")
                  .length,
                color: "text-blue-600",
              },
              {
                label: "Completed",
                value: tasks.filter((t) => getKey(t.status) === "DONE").length,
                color: "text-green-600",
              },
              { label: "Overdue", value: overdue, color: "text-red-600" },
            ].map((kpi) => (
              <Card key={kpi.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 font-medium">
                    {kpi.label}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>
                    {kpi.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Completion rate */}
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
                    <title>Completion rate</title>
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

          {/* Charts 2x2 */}
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
                <CardTitle className="text-base">
                  Priority Distribution
                </CardTitle>
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
        </TabsContent>

        {/* ===== TAB 2: TASK STATUS ===== */}
        <TabsContent value="taskstatus" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-44"
              />
              <Select
                value={taskStatusFilter}
                onValueChange={setTaskStatusFilter}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={taskProjectFilter}
                onValueChange={setTaskProjectFilter}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={taskPriorityFilter}
                onValueChange={setTaskPriorityFilter}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priority</SelectItem>
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {filteredTasks.length} tasks
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={exporting === "tasks"}
                onClick={handleExportTasksExcel}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                {exporting === "tasks" ? "Exporting..." : "Export Excel"}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                    Task
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                    Project
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                    Priority
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                    Assignee
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                    Due Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                    Completion
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-slate-400 py-12"
                    >
                      No tasks match filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((t) => {
                    const pct = completions[t.id] ?? 0;
                    const assignee =
                      t.assigneeId.length > 0
                        ? (profileById(t.assigneeId[0]!.toString())?.name ??
                          "Unknown")
                        : "-";
                    return (
                      <TableRow key={t.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="font-medium text-sm text-slate-800">
                            {t.title}
                          </div>
                          {t.description && (
                            <div className="text-xs text-slate-400 truncate max-w-xs">
                              {t.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {getProjectName(t.projectId)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${statusColors[getKey(t.status)] || ""}`}
                          >
                            {getKey(t.status).replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${priorityColors[getKey(t.priority)] || ""}`}
                          >
                            {getKey(t.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {assignee}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {t.dueDate.length > 0
                            ? new Date(
                                Number(t.dueDate[0]) / 1_000_000,
                              ).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 w-24">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-slate-500">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== TAB 3: ASSIGNED MEMBERS ===== */}
        <TabsContent value="members" className="mt-4">
          {profiles.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              No team members found
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                      Member
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                      Role
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                      Department
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                      Total Tasks
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                      TODO
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                      In Progress
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                      Done
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">
                      Completion
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberStats.map(
                    ({ prof, total, todo, inProgress, done, pct }) => (
                      <TableRow
                        key={prof.id.toString()}
                        className="hover:bg-slate-50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {prof.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm text-slate-800">
                                {prof.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                {prof.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {prof.role || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {prof.department || "-"}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-sm">
                          {total}
                        </TableCell>
                        <TableCell className="text-center text-sm text-slate-500">
                          {todo}
                        </TableCell>
                        <TableCell className="text-center text-sm text-blue-600">
                          {inProgress}
                        </TableCell>
                        <TableCell className="text-center text-sm text-green-600">
                          {done}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 w-24">
                            <Progress
                              value={pct}
                              className={`h-2 flex-1 ${
                                pct >= 80
                                  ? "[&>div]:bg-green-500"
                                  : pct >= 50
                                    ? "[&>div]:bg-blue-500"
                                    : "[&>div]:bg-slate-400"
                              }`}
                            />
                            <span className="text-xs text-slate-600 font-medium">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ===== TAB 4: MEMBER ACTIVITY ===== */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-base font-medium">No recent activity</p>
              <p className="text-sm mt-1">
                Activity will appear here as your team works
              </p>
            </div>
          ) : (
            Object.entries(activityByDate).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {date}
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {items.map((a, i) => {
                    const actor = profileById(a.actorId.toString());
                    return (
                      <div
                        key={a.id}
                        className={`flex items-start gap-3 px-4 py-3 ${
                          i < items.length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-0.5">
                          {actor?.name.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800">
                            <span className="font-medium">
                              {actor?.name ?? "Unknown"}
                            </span>{" "}
                            <span className="text-slate-600">{a.action}</span>{" "}
                            <Badge variant="outline" className="text-xs ml-1">
                              {a.entityType}
                            </Badge>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(
                              Number(a.timestamp) / 1_000_000,
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
