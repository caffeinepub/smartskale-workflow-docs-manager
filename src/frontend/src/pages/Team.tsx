import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Task, UserProfile, UserRole } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";
import { CREDENTIALS, useAuth } from "../hooks/useAuth";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function getRoleBadgeClass(userRole: UserRole) {
  if ("ADMIN" in userRole)
    return "bg-violet-100 text-violet-700 border-violet-200";
  if ("MANAGER" in userRole) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function getRoleLabel(userRole: UserRole) {
  if ("ADMIN" in userRole) return "Admin";
  if ("MANAGER" in userRole) return "Manager";
  return "Employee";
}

interface TeamMember {
  username: string;
  name: string;
  jobTitle: string;
  department: string;
  email: string;
  phone: string;
  userRole: "Admin" | "Manager" | "Employee";
}

function buildTeamFromCredentials(): TeamMember[] {
  return CREDENTIALS.map((c) => ({
    username: c.username,
    name: c.profile.name,
    jobTitle: c.profile.jobTitle,
    department: c.profile.department,
    email: c.profile.email,
    phone: c.profile.phone,
    userRole: c.profile.userRole,
  }));
}

// Helper to extract assignee email from task tags
function getAssigneeEmail(t: Task): string {
  const tag = t.tags.find((tag) => tag.startsWith("assignee:"));
  return tag ? tag.replace("assignee:", "") : "";
}

function buildTags(existingTags: string[], assigneeEmail: string): string[] {
  const filtered = existingTags.filter((t) => !t.startsWith("assignee:"));
  if (assigneeEmail) {
    filtered.push(`assignee:${assigneeEmail}`);
  }
  return filtered;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  member: TeamMember;
  onSaved: (updated: TeamMember) => void;
}

function EditProfileDialog({
  open,
  onClose,
  member,
  onSaved,
}: EditProfileDialogProps) {
  const [name, setName] = useState(member.name);
  const [jobTitle, setJobTitle] = useState(member.jobTitle);
  const [department, setDepartment] = useState(member.department);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone);
  const [userRole, setUserRole] = useState<"Admin" | "Manager" | "Employee">(
    member.userRole,
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    onSaved({ ...member, name, jobTitle, department, email, phone, userRole });
    toast.success("Profile updated!");
    onClose();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" data-ocid="team.edit_profile.dialog">
        <DialogHeader>
          <DialogTitle>Edit My Profile</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Full Name</Label>
            <Input
              data-ocid="team.edit_name.input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Job Title</Label>
            <Input
              data-ocid="team.edit_role.input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Department</Label>
            <Input
              data-ocid="team.edit_department.input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Access Level</Label>
            <Select
              value={userRole}
              onValueChange={(v) =>
                setUserRole(v as "Admin" | "Manager" | "Employee")
              }
            >
              <SelectTrigger data-ocid="team.edit_userrole.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Email</Label>
            <Input
              data-ocid="team.edit_email.input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Phone</Label>
            <Input
              data-ocid="team.edit_phone.input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            data-ocid="team.edit_profile.cancel_button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            data-ocid="team.edit_profile.save_button"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Team() {
  const { actor } = useActor();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // Expanded member for task list view
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  // Assign task to member dialog
  const [assignTargetEmail, setAssignTargetEmail] = useState<string | null>(
    null,
  );
  const [assignTaskId, setAssignTaskId] = useState<string>("__none__");
  const [assigning, setAssigning] = useState(false);

  const loadMembers = useCallback(() => {
    setLoading(true);
    setMembers(buildTeamFromCredentials());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Load all tasks
  useEffect(() => {
    if (!actor) return;
    actor
      .getTasks()
      .then((t) => setAllTasks(t))
      .catch(() => {});
  }, [actor]);

  // Also attempt to merge any backend profiles
  useEffect(() => {
    if (!actor) return;
    actor
      .getAllProfiles()
      .then((profiles: UserProfile[]) => {
        if (profiles.length > 0) {
          setMembers((prev) =>
            prev.map((m) => {
              const match = profiles.find(
                (p) => p.email.toLowerCase() === m.email.toLowerCase(),
              );
              if (match) {
                return {
                  ...m,
                  name: match.name,
                  jobTitle: match.role,
                  department: match.department,
                  phone: match.phone,
                };
              }
              return m;
            }),
          );
        }
      })
      .catch(() => {});
  }, [actor]);

  const currentEmail = user?.username.toLowerCase() ?? "";
  const myMember = members.find(
    (m) =>
      m.email.toLowerCase() === currentEmail ||
      m.username?.toLowerCase() === currentEmail,
  );

  const adminCount = members.filter((m) => m.userRole === "Admin").length;
  const managerCount = members.filter((m) => m.userRole === "Manager").length;
  const employeeCount = members.filter((m) => m.userRole === "Employee").length;

  const toUserRole = (r: string): UserRole => {
    if (r === "Admin") return { ADMIN: null };
    if (r === "Manager") return { MANAGER: null };
    return { EMPLOYEE: null };
  };

  // Get tasks for a given member email
  function getTasksForMember(email: string): Task[] {
    return allTasks.filter(
      (t) => getAssigneeEmail(t).toLowerCase() === email.toLowerCase(),
    );
  }

  // Do assign task to member
  const doAssignTaskToMember = async () => {
    if (!actor || !assignTargetEmail || assignTaskId === "__none__") return;
    const task = allTasks.find((t) => t.id === assignTaskId);
    if (!task) return;
    setAssigning(true);
    try {
      const newTags = buildTags(task.tags, assignTargetEmail);
      await actor.updateTask(
        task.id,
        task.title,
        task.description,
        task.status,
        task.priority,
        [],
        task.dueDate,
        newTags,
      );
      const memberName =
        members.find(
          (m) => m.email.toLowerCase() === assignTargetEmail.toLowerCase(),
        )?.name ?? assignTargetEmail;
      toast.success(`Task assigned to ${memberName}`);
      // Refresh tasks
      const updated = await actor.getTasks();
      setAllTasks(updated);
      setAssignTargetEmail(null);
      setAssignTaskId("__none__");
    } catch {
      toast.error("Failed to assign task");
    } finally {
      setAssigning(false);
    }
  };

  const statCards = [
    {
      label: "Total Members",
      value: members.length,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      label: "Admins",
      value: adminCount,
      color: "bg-violet-50 text-violet-700 border-violet-200",
    },
    {
      label: "Managers",
      value: managerCount,
      color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    },
    {
      label: "Employees",
      value: employeeCount,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  ];

  // Tasks not yet assigned (for the assign dialog dropdown)
  const unassignedOrAllTasks = allTasks;

  // Member whose assign dialog is open
  const assignTargetMember = members.find((m) => m.email === assignTargetEmail);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {myMember && (
          <Button
            variant="outline"
            size="sm"
            data-ocid="team.edit_profile.open_modal_button"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 shrink-0"
          >
            <Pencil className="h-4 w-4" />
            Edit My Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm font-medium mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-ocid="team.loading_state"
        >
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton key={k} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20" data-ocid="team.empty_state">
          <Users className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-1">
            No team members
          </h3>
          <p className="text-slate-400 max-w-sm mx-auto text-sm">
            No team members found.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-ocid="team.list"
        >
          {members.map((member, idx) => {
            const isMe =
              member.email.toLowerCase() === currentEmail ||
              member.username?.toLowerCase() === currentEmail;
            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const fakeUserRole = toUserRole(member.userRole);
            const memberTasks = getTasksForMember(member.email);
            const isExpanded = expandedEmail === member.email;

            return (
              <div key={member.email} className="space-y-0">
                <Card
                  data-ocid={`team.item.${idx + 1}`}
                  className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                    isMe ? "ring-2 ring-blue-500" : ""
                  } ${isExpanded ? "rounded-b-none" : ""}`}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`${color} rounded-full h-12 w-12 flex items-center justify-center text-white font-bold text-base shrink-0`}
                      >
                        {getInitials(member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm leading-tight">
                            {member.name}
                          </span>
                          {isMe && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px] py-0 px-1.5 h-4">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          {member.jobTitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getRoleBadgeClass(fakeUserRole)}`}
                      >
                        {getRoleLabel(fakeUserRole)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs bg-slate-50 text-slate-600 border-slate-200"
                      >
                        {member.department}
                      </Badge>
                      {memberTasks.length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                        >
                          {memberTasks.length} task
                          {memberTasks.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 truncate">
                        ✉ {member.email}
                      </div>
                      {member.phone && (
                        <div className="text-xs text-slate-500">
                          📞 {member.phone}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1"
                        onClick={() =>
                          setExpandedEmail(isExpanded ? null : member.email)
                        }
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Tasks ({memberTasks.length})
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => {
                          setAssignTargetEmail(member.email);
                          setAssignTaskId("__none__");
                        }}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign Task
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Expanded tasks section */}
                {isExpanded && (
                  <div className="bg-slate-50 border border-t-0 border-slate-200 rounded-b-xl px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Assigned Tasks
                    </p>
                    {memberTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No tasks assigned to {member.name}
                      </p>
                    ) : (
                      memberTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-800 truncate">
                              {t.title}
                            </div>
                            {t.description && (
                              <div className="text-xs text-slate-400 truncate">
                                {t.description}
                              </div>
                            )}
                          </div>
                          <Badge
                            className={`text-xs ml-2 shrink-0 ${
                              STATUS_COLORS[getKey(t.status)] || ""
                            }`}
                          >
                            {getKey(t.status).replace("_", " ")}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit My Profile Dialog */}
      {myMember && editOpen && (
        <EditProfileDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          member={myMember}
          onSaved={(updated) => {
            setMembers((prev) =>
              prev.map((m) => (m.email === updated.email ? updated : m)),
            );
            setEditOpen(false);
          }}
        />
      )}

      {/* Assign Task to Member Dialog */}
      <Dialog
        open={!!assignTargetEmail}
        onOpenChange={(o) => !o && setAssignTargetEmail(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Task to {assignTargetMember?.name ?? "Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Select a task to assign to{" "}
              <strong>{assignTargetMember?.name}</strong>:
            </p>
            <div>
              <Label>Select Task</Label>
              <Select value={assignTaskId} onValueChange={setAssignTaskId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pick a task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select a task --</SelectItem>
                  {unassignedOrAllTasks.map((t) => {
                    const currentAssignee = getAssigneeEmail(t);
                    const currentName = currentAssignee
                      ? (members.find(
                          (m) =>
                            m.email.toLowerCase() ===
                            currentAssignee.toLowerCase(),
                        )?.name ?? currentAssignee)
                      : null;
                    return (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                        {currentName
                          ? ` (currently: ${currentName})`
                          : " (unassigned)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignTargetEmail(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={doAssignTaskToMember}
              disabled={assigning || assignTaskId === "__none__"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {assigning ? "Assigning..." : "Assign Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
