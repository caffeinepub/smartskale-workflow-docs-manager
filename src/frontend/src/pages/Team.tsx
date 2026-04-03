import { Check, Copy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Project } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function Team() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!actor) return;
    actor
      .getProjects()
      .then((p) => {
        setProjects(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  const currentPrincipal = identity?.getPrincipal().toString();

  // Collect unique members
  const memberMap: Record<string, string[]> = {};
  for (const p of projects) {
    for (const m of p.memberIds) {
      const pid = m.toString();
      if (!memberMap[pid]) memberMap[pid] = [];
      if (!memberMap[pid].includes(p.name)) memberMap[pid].push(p.name);
    }
  }
  const members = Object.entries(memberMap);

  const copyPrincipal = async (principal: string) => {
    await navigator.clipboard.writeText(principal);
    setCopied(principal);
    toast.success("Principal ID copied");
    setTimeout(() => setCopied(null), 2000);
  };

  const avatarColors = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-amber-500",
    "bg-rose-500",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {members.length} member{members.length !== 1 ? "s" : ""} across{" "}
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-36" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-1">
            No team members yet
          </h3>
          <p className="text-slate-400">Create a project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(([principal, projectNames], idx) => {
            const isMe = principal === currentPrincipal;
            const isFirst = idx === 0;
            const short = `${principal.slice(0, 5)}...${principal.slice(-3)}`;
            const color = avatarColors[idx % avatarColors.length];
            return (
              <Card
                key={principal}
                className={`border-0 shadow-sm ${isMe ? "ring-2 ring-blue-500" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`${color} rounded-full h-11 w-11 flex items-center justify-center text-white font-bold text-lg shrink-0`}
                    >
                      {principal.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm font-mono truncate">
                        {short}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {isMe && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs py-0">
                            You
                          </Badge>
                        )}
                        <Badge
                          className={`text-xs py-0 ${isFirst ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          {isFirst ? "Admin" : "Member"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyPrincipal(principal)}
                      title="Copy Principal ID"
                    >
                      {copied === principal ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-medium">
                      Projects ({projectNames.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {projectNames.map((pn) => (
                        <span
                          key={pn}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                        >
                          {pn}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
