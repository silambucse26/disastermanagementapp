import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity, AlertTriangle, Archive, BarChart3, Bell, BookOpen, BookOpenCheck, Boxes, Building2,
  Calendar, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, Clock, ContactRound,
  Download, Edit3, Eye, FileText, GraduationCap, HeartHandshake, Hospital, LayoutDashboard,
  LogOut, MapPin, MapPinned, Menu, MoreHorizontal, PackageCheck, Plus, Radio, Route as RouteIcon,
  Search, Settings, Shield, ShieldCheck, Sparkles, Star, TentTree, Trash2, TrendingUp,
  UserCheck, UserPlus, Users, XCircle
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  allocateResource, createAlert, createResource, createTraining, createUser,
  deleteTraining, deleteUser, getWorkspace, joinTraining, resolveAlert,
  submitFeedback, updateTraining, updateTrainingProgress
} from "@/lib/dms.functions";
import { formatDate, formatTime, initials, ROLE_LABEL, type AlertRecord, type AppRole, type Resource, type Training } from "@/lib/dms";
import { ResponseModule, type ResponseView } from "@/components/response-views";
import { acknowledgeAlert } from "@/lib/response.functions";

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({
    meta: [
      { title: "Operations Centre — Disaster Management System" },
      { name: "description", content: "Comprehensive real-time disaster management and emergency monitoring system." },
      { property: "og:title", content: "DMS Operations Centre" },
      { property: "og:description", content: "Real-time training monitoring and resource management." },
      { property: "og:type", content: "website" },
    ]
  }),
  component: OperationsPage,
});

type ExtendedView =
  | "dashboard"
  | "users"
  | "trainings"
  | "available-trainings"
  | "my-trainings"
  | "schedule"
  | "assigned-resources"
  | "resources"
  | "allocations"
  | "monitoring"
  | "alerts"
  | "feedback"
  | "reports"
  | "settings"
  | ResponseView;

type Workspace = Awaited<ReturnType<typeof getWorkspace>>;
type IconType = typeof LayoutDashboard;

const allNav: { id: ExtendedView; label: string; icon: IconType; roles: AppRole[] }[] = [
  // Common
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "trainer", "volunteer"] },
  
  // Volunteer specific
  { id: "available-trainings", label: "Available Trainings", icon: BookOpen, roles: ["volunteer"] },
  { id: "my-trainings", label: "My Trainings", icon: GraduationCap, roles: ["volunteer"] },
  { id: "schedule", label: "Training Schedule", icon: Calendar, roles: ["volunteer", "trainer"] },
  { id: "assigned-resources", label: "Assigned Resources", icon: Boxes, roles: ["volunteer"] },

  // Admin / Trainer Modules
  { id: "users", label: "User Management", icon: Users, roles: ["admin"] },
  { id: "trainings", label: "Training Management", icon: GraduationCap, roles: ["admin", "trainer"] },
  { id: "participants", label: "Participant Management", icon: Users, roles: ["admin", "trainer"] },
  { id: "attendance", label: "Attendance Register", icon: ClipboardList, roles: ["admin", "trainer"] },
  { id: "resources", label: "Resource Management", icon: Boxes, roles: ["admin"] },
  { id: "allocations", label: "Resource Allocation", icon: PackageCheck, roles: ["admin", "trainer"] },
  { id: "warehouses", label: "Warehouses", icon: Building2, roles: ["admin", "trainer"] },
  { id: "monitoring", label: "Live Monitoring", icon: Radio, roles: ["admin", "trainer"] },

  // Disaster Operations Modules
  { id: "disasters", label: "Disasters & Incidents", icon: AlertTriangle, roles: ["admin", "trainer", "volunteer"] },
  { id: "incident-map", label: "Incident Map", icon: MapPinned, roles: ["admin", "trainer", "volunteer"] },
  { id: "teams", label: "Response Teams", icon: ShieldCheck, roles: ["admin", "trainer", "volunteer"] },
  { id: "shelters", label: "Shelters", icon: TentTree, roles: ["admin", "trainer", "volunteer"] },
  { id: "evacuations", label: "Evacuations", icon: RouteIcon, roles: ["admin", "trainer"] },
  { id: "hospitals", label: "Medical Facilities", icon: Hospital, roles: ["admin", "trainer", "volunteer"] },
  { id: "contacts", label: "Emergency Contacts", icon: ContactRound, roles: ["admin", "trainer", "volunteer"] },

  // Communications & Feedback
  { id: "alerts", label: "Alerts & Warnings", icon: AlertTriangle, roles: ["admin", "trainer", "volunteer"] },
  { id: "notifications", label: "Notifications", icon: Bell, roles: ["admin", "trainer", "volunteer"] },
  { id: "feedback", label: "Feedback & Reviews", icon: Star, roles: ["admin", "trainer", "volunteer"] },

  // Reports & Administration
  { id: "reports", label: "Reports & Analytics", icon: BarChart3, roles: ["admin"] },
  { id: "audit", label: "Audit Logs", icon: ClipboardCheck, roles: ["admin"] },
  { id: "settings", label: "System Settings", icon: Settings, roles: ["admin"] },
];

function OperationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState<ExtendedView>("dashboard");
  const [mobile, setMobile] = useState(false);
  const get = useServerFn(getWorkspace);
  const query = useQuery({ queryKey: ["workspace"], queryFn: () => get() });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["workspace"] });
    const channel = supabase
      .channel("dms-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, (payload) => {
        void refresh();
        if (payload.eventType === "INSERT") toast.error("New operational alert received!");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
        void refresh();
        if (payload.eventType === "INSERT") toast.info("New notification received!");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "disasters" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "response_teams" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "shelters" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "evacuations" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "trainings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "training_participants" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "allocations" }, refresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  }

  if (query.isLoading) return <LoadingScreen />;
  if (query.error || !query.data) return <ErrorScreen retry={() => query.refetch()} />;

  const data = query.data;
  const allowed = allNav.filter((n) => n.roles.includes(data.role));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 text-slate-100 shadow-xl lg:flex">
        <Brand />
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <Navigation items={allowed} active={view} onSelect={setView} />
        </div>
        <div className="border-t border-slate-800 p-3">
          <Button
            variant="ghost"
            onClick={() => void logout()}
            className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="mr-2 size-4" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="flex w-72 flex-col border-0 bg-slate-900 p-0 text-slate-100">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <Navigation items={allowed} active={view} onSelect={(v) => { setView(v); setMobile(false); }} />
          </div>
          <div className="border-t border-slate-800 p-3">
            <Button variant="ghost" className="w-full justify-start text-slate-300" onClick={() => void logout()}>
              <LogOut className="mr-2 size-4" />
              Log out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <Topbar data={data} onMenu={() => setMobile(true)} onAlerts={() => setView("alerts")} />
        <main className="mx-auto max-w-[1550px] p-4 sm:p-6 lg:p-8">
          <WorkspaceView
            view={view}
            data={data}
            refresh={() => queryClient.invalidateQueries({ queryKey: ["workspace"] })}
            setView={setView}
          />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
      <div className="grid size-10 place-items-center rounded-lg bg-red-600 shadow-md">
        <AlertTriangle className="size-5 text-white" />
      </div>
      <div>
        <p className="font-display text-lg font-black tracking-wider text-white">DMS PORTAL</p>
        <p className="text-[11px] font-medium text-slate-400">Disaster Management System</p>
      </div>
    </div>
  );
}

function Navigation({ items, active, onSelect }: { items: typeof allNav; active: ExtendedView; onSelect: (v: ExtendedView) => void }) {
  return (
    <nav className="space-y-1">
      {items.map((n) => {
        const isActive = active === n.id;
        return (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              isActive
                ? "bg-red-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <n.icon className={`size-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
            <span className="truncate">{n.label}</span>
            {n.id === "monitoring" && <span className="ml-auto size-2 rounded-full bg-emerald-400 animate-ping" />}
          </button>
        );
      })}
    </nav>
  );
}

function Topbar({ data, onMenu, onAlerts }: { data: Workspace; onMenu: () => void; onAlerts: () => void }) {
  const activeAlerts = data.alerts.filter((a) => a.status === "active").length;
  const unreadNotifications = data.notifications.filter((n) => !n.read).length;
  const totalBadges = activeAlerts + unreadNotifications;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={onMenu}>
        <Menu className="size-5" />
      </Button>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/20 font-semibold">
          {ROLE_LABEL[data.role]} Mode
        </Badge>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live DB Connected
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative" aria-label="View alerts" onClick={onAlerts}>
          <Bell className="size-5 text-muted-foreground" />
          {totalBadges > 0 && (
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {totalBadges}
            </span>
          )}
        </Button>

        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold leading-tight">{data.profile.full_name}</p>
          <p className="text-xs text-muted-foreground">{data.profile.email}</p>
        </div>

        <Avatar className="size-9 border-2 border-primary/20">
          <AvatarFallback className="bg-primary font-bold text-primary-foreground">
            {initials(data.profile.full_name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function WorkspaceView({
  view,
  data,
  refresh,
  setView,
}: {
  view: ExtendedView;
  data: Workspace;
  refresh: () => Promise<unknown>;
  setView: (v: ExtendedView) => void;
}) {
  if (view === "dashboard") return <Dashboard data={data} setView={setView} refresh={refresh} />;
  if (view === "available-trainings") return <AvailableTrainingsView data={data} refresh={refresh} setView={setView} />;
  if (view === "my-trainings") return <VolunteerMyTrainingsView data={data} refresh={refresh} setView={setView} />;
  if (view === "schedule") return <TrainingScheduleView data={data} setView={setView} />;
  if (view === "assigned-resources") return <AssignedResourcesView data={data} />;
  if (view === "users") return <UsersView data={data} refresh={refresh} />;
  if (view === "trainings") return <TrainingsView data={data} refresh={refresh} />;
  if (view === "resources") return <ResourcesView data={data} refresh={refresh} />;
  if (view === "allocations") return <AllocationsView data={data} refresh={refresh} />;
  if (view === "monitoring") return <MonitoringView data={data} />;
  if (view === "alerts") return <AlertsView data={data} refresh={refresh} />;
  if (view === "feedback") return <FeedbackView data={data} refresh={refresh} />;
  if (view === "reports") return <ReportsView data={data} />;
  if (view === "settings") return <SettingsView data={data} />;

  return <ResponseModule view={view as ResponseView} data={data} refresh={refresh} />;
}

function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Operations & Command</p>
        <h1 className="text-2xl font-extrabold sm:text-3xl text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Panel({ title, children, action, className = "" }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card shadow-sm ${className}`}>
      <div className="flex min-h-14 items-center justify-between border-b px-5 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  note,
}: {
  label: string;
  value: string | number;
  icon: IconType;
  tone?: "blue" | "red" | "green" | "amber";
  note?: string;
}) {
  const styles = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/40",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/40",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/40",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/40",
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
        </div>
        <div className={`grid size-11 place-items-center rounded-xl border ${styles[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      {note && <p className="mt-2 text-xs font-medium text-muted-foreground">{note}</p>}
    </div>
  );
}

function Status({ value }: { value: string }) {
  const v = (value || "").toLowerCase();
  const c =
    v === "active" || v === "available" || v === "completed" || v === "enrolled" || v === "present" || v === "open"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : v === "high" || v === "critical" || v === "cancelled" || v === "out of stock" || v === "absent"
      ? "bg-red-50 text-red-700 border-red-200"
      : v === "medium" || v === "limited" || v === "planned" || v === "late" || v === "in progress"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  return <Badge variant="outline" className={`${c} capitalize font-semibold`}>{value}</Badge>;
}

// ----------------------------------------------------------------------------
// DASHBOARD VIEW (Role-Specific)
// ----------------------------------------------------------------------------
function Dashboard({ data, setView, refresh }: { data: Workspace; setView: (v: ExtendedView) => void; refresh: () => Promise<unknown> }) {
  const activeDisasters = data.disasters.filter((d) => !["Resolved", "Closed"].includes(d.status));
  const activeAlerts = data.alerts.filter((a) => a.status === "active");
  const myEnrolledIds = data.participants.filter((p) => p.user_id === data.userId).map((p) => p.training_id);
  const myTrainings = data.trainings.filter((t) => myEnrolledIds.includes(t.id));
  const myAllocations = data.allocations.filter((a) => a.volunteer_id === data.userId);

  if (data.role === "volunteer") {
    return (
      <>
        <PageHeading
          title={`Welcome back, ${data.profile.full_name}`}
          subtitle="Volunteer Incident Response, Enrolled Drills, and Field Equipment Status."
          action={
            <Button onClick={() => setView("available-trainings")}>
              <BookOpen className="mr-2 size-4" />
              Browse Available Trainings
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="My Enrolled Trainings" value={myTrainings.length} icon={GraduationCap} tone="blue" />
          <StatCard label="Assigned Resources" value={myAllocations.length} icon={Boxes} tone="green" />
          <StatCard label="Active Emergency Alerts" value={activeAlerts.length} icon={AlertTriangle} tone="red" />
          <StatCard
            label="Completed Drills"
            value={myTrainings.filter((t) => t.status === "completed").length}
            icon={CheckCircle2}
            tone="green"
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <Panel
            title="My Enrolled Trainings"
            action={
              <Button variant="ghost" size="sm" onClick={() => setView("my-trainings")}>
                View all <ChevronRight className="ml-1 size-4" />
              </Button>
            }
          >
            {myTrainings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">You are not enrolled in any training programs yet.</p>
                <Button className="mt-3" size="sm" onClick={() => setView("available-trainings")}>
                  Enroll in a Disaster Training
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myTrainings.map((t) => (
                  <div key={t.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-base">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.location} · {formatDate(t.scheduled_at)}</p>
                      </div>
                      <Status value={t.status} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={t.progress} className="h-2 flex-1" />
                      <span className="text-xs font-bold">{t.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Active Disaster Alerts"
            action={
              <Button variant="ghost" size="sm" onClick={() => setView("alerts")}>
                View all <ChevronRight className="ml-1 size-4" />
              </Button>
            }
          >
            <div className="space-y-3">
              {activeAlerts.slice(0, 3).map((a) => (
                <div key={a.id} className="rounded-lg border p-3.5 space-y-2 border-l-4 border-l-red-500 bg-red-50/20">
                  <div className="flex justify-between items-center">
                    <Status value={a.severity} />
                    <span className="text-xs text-muted-foreground">{formatTime(a.created_at)}</span>
                  </div>
                  <h4 className="font-bold text-sm">{a.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                </div>
              ))}
              {activeAlerts.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No active alerts right now.</p>}
            </div>
          </Panel>
        </div>

        <Panel title="Recent Operations Activity" className="mt-6">
          <ActivityList items={data.activity} />
        </Panel>
      </>
    );
  }

  // Admin / Trainer Dashboard
  const trainerTrainings = data.role === "trainer" ? data.trainings.filter((t) => t.trainer_id === data.userId) : data.trainings;
  const title = data.role === "admin" ? "Admin Command Dashboard" : "Trainer Command Dashboard";

  return (
    <>
      <PageHeading
        title={title}
        subtitle="Live situational awareness, training deployment, resource inventory, and emergency management."
        action={
          <div className="flex gap-2">
            {data.role === "admin" && (
              <Button onClick={() => setView("users")}>
                <UserPlus className="mr-2 size-4" />
                Manage Users
              </Button>
            )}
            <Button onClick={() => setView("trainings")}>
              <Plus className="mr-2 size-4" />
              Create Training
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Disasters" value={activeDisasters.length} icon={AlertTriangle} tone="red" />
        <StatCard label="Emergency Alerts" value={activeAlerts.length} icon={Bell} tone="red" />
        <StatCard
          label="Total Affected People"
          value={data.disasters.reduce((s, d) => s + d.people_affected, 0).toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="People Evacuated"
          value={data.disasters.reduce((s, d) => s + d.evacuated, 0).toLocaleString()}
          icon={RouteIcon}
          tone="green"
        />
        <StatCard label="Active Trainings" value={data.trainings.filter((t) => t.status === "active").length} icon={GraduationCap} />
        <StatCard label="Available Responders" value={data.teams.filter((t) => t.status === "Available").length} icon={ShieldCheck} tone="green" />
        <StatCard
          label="Available Resources"
          value={data.resources.reduce((s, r) => s + r.available_quantity, 0).toLocaleString()}
          icon={Boxes}
          tone="green"
        />
        <StatCard
          label="Open Shelters"
          value={data.shelters.filter((s) => s.status === "Open" || s.status === "Emergency Only").length}
          icon={TentTree}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Panel
          title={data.role === "trainer" ? "My Training Programs" : "Disaster Training Programs"}
          action={
            <Button variant="ghost" size="sm" onClick={() => setView("trainings")}>
              View all <ChevronRight className="ml-1 size-4" />
            </Button>
          }
        >
          <div className="space-y-4">
            {trainerTrainings.slice(0, 4).map((t) => (
              <div key={t.id} className="rounded-lg border p-3.5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm">{t.name}</h4>
                    <p className="text-xs text-muted-foreground">{t.location} · {t.participant_count} participants</p>
                  </div>
                  <Status value={t.status} />
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={t.progress} className="h-2 flex-1" />
                  <span className="text-xs font-bold">{t.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Active Operational Alerts"
          action={
            <Button variant="ghost" size="sm" onClick={() => setView("alerts")}>
              View all <ChevronRight className="ml-1 size-4" />
            </Button>
          }
        >
          <div className="space-y-3">
            {activeAlerts.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-lg border p-3.5 space-y-1 border-l-4 border-l-red-500">
                <div className="flex justify-between items-center">
                  <Status value={a.severity} />
                  <span className="text-xs text-muted-foreground">{formatTime(a.created_at)}</span>
                </div>
                <h4 className="font-bold text-sm">{a.title}</h4>
                <p className="text-xs text-muted-foreground">{a.message}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="System Activity & Audit Log" className="mt-6">
        <ActivityList items={data.activity} />
      </Panel>
    </>
  );
}

function ActivityList({ items }: { items: Workspace["activity"] }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((a, i) => (
        <div key={a.id} className="flex gap-4 items-start border-b border-border/50 pb-3 last:border-0 last:pb-0">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Activity className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{a.event}</p>
            <p className="text-xs text-muted-foreground">
              {a.module ?? a.entity_type ?? "system"} · {formatDate(a.created_at)} at {formatTime(a.created_at)}
            </p>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent activity recorded.</p>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// VOLUNTEER: AVAILABLE TRAININGS & JOIN TRAINING
// ----------------------------------------------------------------------------
function AvailableTrainingsView({ data, refresh, setView }: { data: Workspace; refresh: () => Promise<unknown>; setView: (v: ExtendedView) => void }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const joinFn = useServerFn(joinTraining);

  const enrolledTrainingIds = new Set(data.participants.filter((p) => p.user_id === data.userId).map((p) => p.training_id));

  const available = data.trainings.filter((t) => {
    const matchesSearch = (t.name + t.location + t.disaster_type).toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || t.disaster_type === filterType;
    return matchesSearch && matchesType;
  });

  const disasterTypes = Array.from(new Set(data.trainings.map((t) => t.disaster_type)));

  async function handleJoin(trainingId: string) {
    try {
      setJoiningId(trainingId);
      await joinFn({ data: { trainingId } });
      toast.success("Successfully enrolled in training!");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to join training.");
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <>
      <PageHeading
        title="Available Disaster Preparedness Trainings"
        subtitle="Explore active and planned emergency drills, search by disaster category, and join with 1-click."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search disaster trainings, skills, locations..." />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by Disaster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disaster Types</SelectItem>
            {disasterTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {available.map((t) => {
          const isEnrolled = enrolledTrainingIds.has(t.id);
          const trainer = data.profiles.find((p) => p.id === t.trainer_id);

          return (
            <div key={t.id} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {t.disaster_type}
                  </Badge>
                  <Status value={t.status} />
                </div>

                <h3 className="mt-3 font-bold text-lg leading-snug">{t.name}</h3>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{t.description || "Practical field preparedness drill covering life-safety and emergency response tactics."}</p>

                <div className="mt-4 space-y-2 border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary" />
                    <span className="truncate">{t.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3.5 text-primary" />
                    <span>{formatDate(t.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5 text-primary" />
                    <span>{t.participant_count} Volunteers Enrolled</span>
                  </div>
                  {trainer && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="size-3.5 text-primary" />
                      <span>Instructor: {trainer.full_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t pt-4">
                {isEnrolled ? (
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                      <CheckCircle2 className="mr-1.5 size-4 text-emerald-600" /> You are enrolled
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setView("my-trainings")}>
                      View My Status
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    disabled={joiningId === t.id}
                    onClick={() => void handleJoin(t.id)}
                  >
                    <Plus className="mr-1.5 size-4" />
                    {joiningId === t.id ? "Joining..." : "Join Training"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {available.length === 0 && (
        <div className="text-center py-16 rounded-xl border bg-card/50">
          <GraduationCap className="mx-auto size-12 text-muted-foreground/50" />
          <h3 className="mt-3 font-bold text-lg">No trainings found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try resetting your search query or filters.</p>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------------------------
// VOLUNTEER: MY TRAININGS
// ----------------------------------------------------------------------------
function VolunteerMyTrainingsView({ data, refresh, setView }: { data: Workspace; refresh: () => Promise<unknown>; setView: (v: ExtendedView) => void }) {
  const myParticipants = data.participants.filter((p) => p.user_id === data.userId);
  const myTrainingIds = new Set(myParticipants.map((p) => p.training_id));
  const myTrainings = data.trainings.filter((t) => myTrainingIds.has(t.id));

  return (
    <>
      <PageHeading
        title="My Enrolled Trainings"
        subtitle="Your personalized disaster preparedness courses, registration codes, progress tracking, and attendance."
        action={
          <Button onClick={() => setView("available-trainings")}>
            <BookOpen className="mr-2 size-4" />
            Explore More Trainings
          </Button>
        }
      />

      <div className="space-y-4">
        {myTrainings.map((t) => {
          const participant = myParticipants.find((p) => p.training_id === t.id);
          const trainer = data.profiles.find((p) => p.id === t.trainer_id);
          const activities = data.activities.filter((a) => a.training_id === t.id);
          const hasFeedback = data.feedback.some((f) => f.training_id === t.id && f.user_id === data.userId);

          return (
            <div key={t.id} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.disaster_type}</Badge>
                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded">
                      Code: {participant?.participant_code ?? "VOL-REG"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mt-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Location: {t.location} · Date: {formatDate(t.scheduled_at)} {trainer ? `· Trainer: ${trainer.full_name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Status value={participant?.status ?? "Enrolled"} />
                  <Status value={t.status} />
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Training Program Completion</span>
                  <span>{t.progress}%</span>
                </div>
                <Progress value={t.progress} className="h-2.5" />
              </div>

              {activities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Practical Modules & Drills</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activities.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs rounded-md border p-2 bg-background">
                        {a.completed ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <span className={a.completed ? "line-through text-muted-foreground" : "font-medium"}>
                          {a.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between border-t pt-3 gap-2">
                <span className="text-xs text-muted-foreground">
                  Enrolled on: {participant ? formatDate(participant.registration_date) : "Recent"}
                </span>
                <div className="flex gap-2">
                  {!hasFeedback && (
                    <Button size="sm" variant="outline" onClick={() => setView("feedback")}>
                      <Star className="mr-1.5 size-3.5 text-amber-500" />
                      Give Feedback
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setView("schedule")}>
                    <Calendar className="mr-1.5 size-3.5" />
                    View in Schedule
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {myTrainings.length === 0 && (
        <div className="text-center py-16 rounded-xl border bg-card">
          <GraduationCap className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="mt-3 font-bold text-lg">No enrolled trainings</h3>
          <p className="text-sm text-muted-foreground mt-1">Browse and join disaster management programs to participate in drills.</p>
          <Button className="mt-4" onClick={() => setView("available-trainings")}>
            Browse Available Trainings
          </Button>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------------------------
// TRAINING SCHEDULE VIEW (Calendar & Timeline)
// ----------------------------------------------------------------------------
function TrainingScheduleView({ data, setView }: { data: Workspace; setView: (v: ExtendedView) => void }) {
  const sortedTrainings = useMemo(() => {
    return [...data.trainings].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [data.trainings]);

  return (
    <>
      <PageHeading
        title="Disaster Training Schedule & Drill Calendar"
        subtitle="Chronological timeline of upcoming live disaster drills, classroom sessions, and field exercises."
      />

      <div className="space-y-4">
        {sortedTrainings.map((t, idx) => {
          const isUpcoming = new Date(t.scheduled_at).getTime() > Date.now();
          const trainer = data.profiles.find((p) => p.id === t.trainer_id);

          return (
            <div key={t.id} className="flex gap-4 items-start">
              <div className="flex flex-col items-center">
                <div className={`grid size-10 place-items-center rounded-xl font-bold text-xs ${
                  isUpcoming ? "bg-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground"
                }`}>
                  #{idx + 1}
                </div>
                {idx < sortedTrainings.length - 1 && <div className="h-20 w-0.5 bg-border mt-2" />}
              </div>

              <div className="flex-1 rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <span className="text-xs font-bold text-primary uppercase">{t.disaster_type} DRILL</span>
                    <h3 className="font-bold text-lg">{t.name}</h3>
                  </div>
                  <Status value={t.status} />
                </div>

                <p className="text-sm text-muted-foreground">{t.description}</p>

                <div className="grid gap-3 sm:grid-cols-3 pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <span><b>Date:</b> {formatDate(t.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <span><b>Venue:</b> {t.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-primary" />
                    <span><b>Lead Trainer:</b> {trainer?.full_name ?? "TBD"}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ----------------------------------------------------------------------------
// VOLUNTEER: ASSIGNED RESOURCES
// ----------------------------------------------------------------------------
function AssignedResourcesView({ data }: { data: Workspace }) {
  const myAllocations = data.allocations.filter((a) => a.volunteer_id === data.userId);

  return (
    <>
      <PageHeading
        title="My Assigned Emergency Resources"
        subtitle="Review life-saving kits, protective gear, radio transceivers, and equipment checked out to you."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {myAllocations.map((a) => {
          const resource = data.resources.find((r) => r.id === a.resource_id);
          const training = data.trainings.find((t) => t.id === a.training_id);
          const allocator = data.profiles.find((p) => p.id === a.allocated_by);

          return (
            <div key={a.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Boxes className="size-5" />
                </div>
                <Status value={a.status} />
              </div>

              <div>
                <h3 className="font-bold text-lg">{resource?.name ?? "Emergency Supply"}</h3>
                <p className="text-xs text-muted-foreground">{resource?.category ?? "Safety Equipment"}</p>
              </div>

              <div className="rounded-lg bg-muted p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span>Quantity Allocated:</span>
                  <strong className="text-sm">{a.quantity} {resource?.unit ?? "units"}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Condition:</span>
                  <span className="font-semibold">{resource?.condition ?? "Good"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned For:</span>
                  <span className="font-semibold truncate max-w-[150px]">{training?.name ?? "Disaster Deployment"}</span>
                </div>
              </div>

              <div className="border-t pt-2 text-[11px] text-muted-foreground flex justify-between">
                <span>Issued by: {allocator?.full_name ?? "Logistics Officer"}</span>
                <span>{formatDate(a.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {myAllocations.length === 0 && (
        <div className="text-center py-16 rounded-xl border bg-card">
          <Boxes className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="mt-3 font-bold text-lg">No equipment currently assigned</h3>
          <p className="text-sm text-muted-foreground mt-1">When emergency kits or gear are allocated for your drills or deployments, they will appear here.</p>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------------------------
// USERS VIEW (ADMIN)
// ----------------------------------------------------------------------------
function UsersView({ data, refresh }: { data: Workspace; refresh: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const createFn = useServerFn(createUser);
  const deleteFn = useServerFn(deleteUser);

  const roleMap = new Map(data.roles.map((r) => [r.user_id, r.role]));
  const users = data.profiles.filter(
    (p) =>
      (p.full_name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())) &&
      (role === "all" || roleMap.get(p.id) === role)
  );

  return (
    <>
      <PageHeading
        title="User & Personnel Management"
        subtitle="Manage disaster responders, trainers, and administrative access permissions."
        action={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="mr-2 size-4" />
            Add New Personnel
          </Button>
        }
      />

      <Filters search={search} setSearch={setSearch}>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Administrator</SelectItem>
            <SelectItem value="trainer">Trainer</SelectItem>
            <SelectItem value="volunteer">Volunteer</SelectItem>
          </SelectContent>
        </Select>
      </Filters>

      <DataPanel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.full_name}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>
                  <Status value={roleMap.get(p.id) ?? "volunteer"} />
                </TableCell>
                <TableCell>
                  <Status value={p.status} />
                </TableCell>
                <TableCell>{formatDate(p.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(p.id)}
                    disabled={p.id === data.userId}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>

      <UserDialog
        open={open}
        onOpen={setOpen}
        onSubmit={async (v) => {
          await createFn({ data: v });
          toast.success("User created successfully!");
          setOpen(false);
          await refresh();
        }}
      />

      <Confirm
        open={!!deleting}
        onOpen={() => setDeleting(null)}
        title="Delete this user?"
        description="Their access credentials, roles, and profile will be permanently removed from Supabase auth."
        action={async () => {
          if (deleting) {
            await deleteFn({ data: { id: deleting } });
            toast.success("User deleted successfully!");
            setDeleting(null);
            await refresh();
          }
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------------
// TRAININGS MANAGEMENT (Admin / Trainer)
// ----------------------------------------------------------------------------
function TrainingsView({ data, refresh }: { data: Workspace; refresh: () => Promise<unknown> }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [detail, setDetail] = useState<Training | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const createFn = useServerFn(createTraining);
  const updateFn = useServerFn(updateTraining);
  const deleteFn = useServerFn(deleteTraining);

  const rows = data.trainings.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || t.status === status)
  );

  const isStaff = data.role === "admin" || data.role === "trainer";

  return (
    <>
      <PageHeading
        title="Disaster Training Management"
        subtitle="Create, update, monitor milestones, and manage enrollment for disaster exercises."
        action={
          isStaff && (
            <Button onClick={() => { setEditingTraining(null); setOpen(true); }}>
              <Plus className="mr-2 size-4" />
              Create New Training
            </Button>
          )
        }
      />

      <Filters search={search} setSearch={setSearch}>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </Filters>

      <DataPanel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Training Title</TableHead>
              <TableHead>Disaster Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-bold">{t.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{t.disaster_type}</Badge>
                </TableCell>
                <TableCell>{t.location}</TableCell>
                <TableCell>{formatDate(t.scheduled_at)}</TableCell>
                <TableCell>{t.participant_count} enrolled</TableCell>
                <TableCell className="min-w-32">
                  <div className="flex items-center gap-2">
                    <Progress value={t.progress} className="h-2" />
                    <span className="text-xs font-bold">{t.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Status value={t.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDetail(t)}>
                      <Eye className="size-4" />
                    </Button>
                    {isStaff && (
                      <Button variant="ghost" size="icon" onClick={() => { setEditingTraining(t); setOpen(true); }}>
                        <Edit3 className="size-4" />
                      </Button>
                    )}
                    {data.role === "admin" && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(t.id)} className="text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>

      <TrainingDialog
        open={open}
        onOpen={setOpen}
        initialData={editingTraining}
        trainers={data.profiles.filter((p) => data.roles.some((r) => r.user_id === p.id && (r.role === "trainer" || r.role === "admin")))}
        onSubmit={async (v) => {
          if (editingTraining) {
            await updateFn({ data: { id: editingTraining.id, ...v } });
            toast.success("Training updated successfully!");
          } else {
            await createFn({ data: v });
            toast.success("Training created successfully!");
          }
          setOpen(false);
          await refresh();
        }}
      />

      <TrainingDetail training={detail} data={data} onOpen={(v) => !v && setDetail(null)} refresh={refresh} />

      <Confirm
        open={!!deleting}
        onOpen={() => setDeleting(null)}
        title="Delete this training program?"
        description="Linked activities, participant enrollments, and feedback records will also be removed."
        action={async () => {
          if (deleting) {
            await deleteFn({ data: { id: deleting } });
            toast.success("Training deleted successfully!");
            setDeleting(null);
            await refresh();
          }
        }}
      />
    </>
  );
}

function TrainingDetail({
  training,
  data,
  onOpen,
  refresh,
}: {
  training: Training | null;
  data: Workspace;
  onOpen: (v: boolean) => void;
  refresh: () => Promise<unknown>;
}) {
  const updateProgressFn = useServerFn(updateTrainingProgress);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (training) setProgress(training.progress);
  }, [training]);

  if (!training) return null;

  const acts = data.activities.filter((a) => a.training_id === training.id);
  const allocations = data.allocations.filter((a) => a.training_id === training.id);
  const trainer = data.profiles.find((p) => p.id === training.trainer_id);

  return (
    <Dialog open onOpenChange={onOpen}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{training.disaster_type}</Badge>
            <Status value={training.status} />
          </div>
          <DialogTitle className="text-2xl mt-1">{training.name}</DialogTitle>
          <DialogDescription>{training.description || "Comprehensive disaster response program."}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Location" value={training.location} />
          <Mini label="Scheduled Date" value={formatDate(training.scheduled_at)} />
          <Mini label="Participants" value={`${training.participant_count} Enrolled`} />
          <Mini label="Lead Instructor" value={trainer?.full_name ?? "Unassigned"} />
        </div>

        <div className="rounded-xl bg-muted p-4 space-y-3">
          <div className="flex justify-between font-bold text-sm">
            <span>Live Training Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />

          {data.role !== "volunteer" && (
            <div className="mt-3 flex gap-3 items-center">
              <input
                aria-label="Training progress slider"
                className="flex-1 accent-primary"
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
              <Button
                size="sm"
                onClick={async () => {
                  await updateProgressFn({ data: { id: training.id, progress } });
                  toast.success("Progress updated successfully!");
                  await refresh();
                }}
              >
                Save Progress
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 font-bold text-sm uppercase">Curriculum Modules & Drills</h3>
            <div className="space-y-2">
              {acts.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded border p-2 text-xs">
                  {a.completed ? <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> : <XCircle className="size-4 text-muted-foreground shrink-0" />}
                  <span>{a.label}</span>
                </div>
              ))}
              {acts.length === 0 && <p className="text-xs text-muted-foreground">Standard field drills in progress.</p>}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-bold text-sm uppercase">Allocated Equipment & Resources</h3>
            <div className="space-y-2">
              {allocations.map((a) => (
                <div key={a.id} className="flex justify-between border-b pb-1.5 text-xs">
                  <span>{data.resources.find((r) => r.id === a.resource_id)?.name}</span>
                  <strong>{a.quantity} units</strong>
                </div>
              ))}
              {allocations.length === 0 && <p className="text-xs text-muted-foreground">No resources allocated to this training yet.</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Mini({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold truncate">{value}</div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// RESOURCES VIEW (Admin / Trainer)
// ----------------------------------------------------------------------------
function ResourcesView({ data, refresh }: { data: Workspace; refresh: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const add = useServerFn(createResource);

  const rows = data.resources.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()));
  const available = data.resources.reduce((s, r) => s + r.available_quantity, 0);
  const allocated = data.resources.reduce((s, r) => s + r.allocated_quantity, 0);
  const lowStock = data.resources.filter((r) => r.available_quantity < r.minimum_stock);

  return (
    <>
      <PageHeading
        title="Disaster Relief Resource Management"
        subtitle="Track inventory readiness, available vs allocated quantities, conditions, and warehouse stores."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Resource Item
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Resource Categories" value={data.resources.length} icon={Archive} />
        <StatCard label="Available Stock" value={available.toLocaleString()} icon={PackageCheck} tone="green" />
        <StatCard label="Allocated Units" value={allocated.toLocaleString()} icon={Boxes} />
        <StatCard label="Low Stock Warnings" value={lowStock.length} icon={AlertTriangle} tone="amber" />
      </div>

      <Filters search={search} setSearch={setSearch} />

      <DataPanel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Warehouse / Base</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Stock Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const status = r.available_quantity === 0 ? "out of stock" : r.available_quantity < r.minimum_stock ? "limited" : "available";
              const warehouse = data.warehouses.find((w) => w.id === r.warehouse_id);

              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <b>{r.name}</b>
                    <p className="text-xs text-muted-foreground">{r.unit}</p>
                  </TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{warehouse?.warehouse_name ?? r.storage_location ?? "Central Store"}</TableCell>
                  <TableCell>{r.total_quantity}</TableCell>
                  <TableCell className="font-bold text-emerald-600">{r.available_quantity}</TableCell>
                  <TableCell>{r.allocated_quantity}</TableCell>
                  <TableCell>{r.condition}</TableCell>
                  <TableCell>
                    <Status value={status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataPanel>

      <ResourceDialog
        open={open}
        onOpen={setOpen}
        warehouses={data.warehouses}
        onSubmit={async (v) => {
          await add({ data: v });
          toast.success("Resource added successfully!");
          setOpen(false);
          await refresh();
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------------
// RESOURCE ALLOCATION VIEW (Admin / Trainer)
// ----------------------------------------------------------------------------
function AllocationsView({ data, refresh }: { data: Workspace; refresh: () => Promise<unknown> }) {
  const fn = useServerFn(allocateResource);
  const volunteers = data.profiles.filter((p) => data.roles.some((r) => r.user_id === p.id && r.role === "volunteer"));

  const [trainingId, setTraining] = useState(data.trainings[0]?.id ?? "");
  const [resourceId, setResource] = useState(data.resources[0]?.id ?? "");
  const [volunteerId, setVolunteer] = useState(volunteers[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<{ before: number; allocated: number; after: number } | null>(null);

  const selected = data.resources.find((r) => r.id === resourceId);

  async function allocate() {
    try {
      const value = (await fn({ data: { trainingId, resourceId, volunteerId, quantity } })) as typeof result;
      setResult(value);
      toast.success("Resource successfully allocated!");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to allocate resource.");
    }
  }

  return (
    <>
      <PageHeading
        title="Resource Allocation & Dispatch"
        subtitle="Allocate gear, medical kits, and rescue inventory to responders and training programs."
      />

      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Panel title="New Allocation Dispatch">
          <div className="space-y-4">
            <FieldSelect label="Target Training" value={trainingId} setValue={setTraining} items={data.trainings.map((t) => ({ value: t.id, label: t.name }))} />
            <FieldSelect
              label="Resource Inventory"
              value={resourceId}
              setValue={setResource}
              items={data.resources.map((r) => ({ value: r.id, label: `${r.name} (${r.available_quantity} available)` }))}
            />
            <div className="space-y-2">
              <Label>Quantity to Allocate</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </div>
            <FieldSelect label="Recipient Volunteer" value={volunteerId} setValue={setVolunteer} items={volunteers.map((v) => ({ value: v.id, label: v.full_name }))} />

            <div className="rounded-xl bg-muted/60 p-4 text-sm space-y-1.5 border">
              <div className="flex justify-between">
                <span>Currently Available in Warehouse:</span>
                <strong>{selected?.available_quantity ?? 0} {selected?.unit ?? "units"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Remaining After Allocation:</span>
                <strong className="text-primary">{Math.max(0, (selected?.available_quantity ?? 0) - quantity)} {selected?.unit ?? "units"}</strong>
              </div>
            </div>

            <Button className="w-full" onClick={() => void allocate()} disabled={!trainingId || !resourceId || !volunteerId}>
              <PackageCheck className="mr-2 size-4" />
              Confirm Resource Allocation
            </Button>

            {result && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <b>Transaction Successful</b>: Available Before: {result.before} · Allocated: {result.allocated} · Current Available: {result.after}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Recent Allocation Log">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Training</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.allocations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{formatDate(a.created_at)}</TableCell>
                    <TableCell className="font-semibold text-xs">{data.trainings.find((t) => t.id === a.training_id)?.name}</TableCell>
                    <TableCell className="text-xs">{data.resources.find((r) => r.id === a.resource_id)?.name}</TableCell>
                    <TableCell className="text-xs font-bold">{a.quantity}</TableCell>
                    <TableCell className="text-xs">{data.profiles.find((p) => p.id === a.volunteer_id)?.full_name ?? "Team Pool"}</TableCell>
                    <TableCell>
                      <Status value={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------------
// MONITORING VIEW
// ----------------------------------------------------------------------------
function MonitoringView({ data }: { data: Workspace }) {
  const activeDisasters = data.disasters.filter((d) => !["Resolved", "Closed"].includes(d.status));
  const activeAlerts = data.alerts.filter((a) => a.status === "active");

  return (
    <>
      <PageHeading
        title="Live Operations & Training Monitoring"
        subtitle="Real-time multi-dimensional view of active disasters, deployed response teams, evacuations, and drill completions."
        action={
          <div className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" /> REALTIME SYNC
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Incidents" value={activeDisasters.length} icon={AlertTriangle} tone="red" />
        <StatCard label="Deployed Response Teams" value={data.teams.filter((t) => t.status === "Deployed" || t.status === "Assigned").length} icon={ShieldCheck} tone="blue" />
        <StatCard label="Evacuated Population" value={data.evacuations.reduce((s, e) => s + e.people_evacuated, 0).toLocaleString()} icon={RouteIcon} tone="green" />
        <StatCard label="Critical Alerts Active" value={activeAlerts.length} icon={Bell} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Live Training Completion Rates">
          <div className="space-y-4">
            {data.trainings.map((t) => (
              <div key={t.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>{t.name}</span>
                  <span className="font-bold">{t.progress}%</span>
                </div>
                <Progress value={t.progress} className="h-2.5" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Real-Time Event Stream">
          <ActivityList items={data.activity} />
        </Panel>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------------
// ALERTS & NOTIFICATIONS VIEW
// ----------------------------------------------------------------------------
function AlertsView({ data, refresh }: { data: Workspace; refresh: () => Promise<unknown> }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const create = useServerFn(createAlert);
  const resolve = useServerFn(resolveAlert);
  const ack = useServerFn(acknowledgeAlert);

  const alerts = data.alerts.filter((a) => filter === "all" || a.severity === filter);
  const canGenerate = data.role === "admin" || data.role === "trainer";

  return (
    <>
      <PageHeading
        title="Emergency Alerts & Public Warning System"
        subtitle="Broadcast, monitor, and acknowledge high-priority disaster warnings and critical resource shortages."
        action={
          canGenerate && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              Generate Emergency Alert
            </Button>
          )
        }
      />

      <Tabs value={filter} onValueChange={setFilter} className="mb-5">
        <TabsList>
          <TabsTrigger value="all">All Alerts ({data.alerts.length})</TabsTrigger>
          <TabsTrigger value="high">High / Critical</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
          <TabsTrigger value="info">Advisory / Info</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-2">
        {alerts.map((a) => {
          const isAck = data.acknowledgements.some((x) => x.alert_id === a.id && x.user_id === data.userId);
          const training = data.trainings.find((t) => t.id === a.training_id);

          return (
            <div
              key={a.id}
              className={`rounded-xl border p-5 shadow-sm space-y-3 ${
                a.severity === "high"
                  ? "border-l-4 border-l-red-600 bg-card"
                  : a.severity === "medium"
                  ? "border-l-4 border-l-amber-500 bg-card"
                  : "border-l-4 border-l-blue-500 bg-card"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Status value={a.severity} />
                  <Badge variant="outline">{a.alert_type}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{formatTime(a.created_at)}</span>
              </div>

              <div>
                <h3 className="font-bold text-lg">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                {a.location && <p className="mt-2 text-xs font-semibold text-primary">Target Location: {a.location}</p>}
                {training && <p className="text-xs text-muted-foreground">Linked Training: {training.name}</p>}
              </div>

              <div className="flex flex-wrap items-center justify-between border-t pt-3 gap-2">
                <Status value={a.status} />
                <div className="flex gap-2">
                  {!isAck ? (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await ack({ data: { id: a.id } });
                        toast.success("Alert acknowledged!");
                        await refresh();
                      }}
                    >
                      <CheckCircle2 className="mr-1.5 size-4" />
                      Acknowledge
                    </Button>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Acknowledged
                    </Badge>
                  )}

                  {canGenerate && a.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await resolve({ data: { id: a.id } });
                        toast.success("Alert resolved!");
                        await refresh();
                      }}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialogForm
        open={open}
        onOpen={setOpen}
        trainings={data.trainings}
        onSubmit={async (v) => {
          await create({ data: v });
          toast.success("Emergency alert generated and broadcasted!");
          setOpen(false);
          await refresh();
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------------
// FEEDBACK VIEW
// ----------------------------------------------------------------------------
function FeedbackView({ data, refresh }: { data: Workspace; refresh: () => Promise<unknown> }) {
  const fn = useServerFn(submitFeedback);
  const [trainingId, setTraining] = useState(data.trainings[0]?.id ?? "");
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");

  async function submit() {
    try {
      await fn({ data: { trainingId, rating, comments } });
      setComments("");
      toast.success("Feedback submitted successfully!");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit feedback.");
    }
  }

  return (
    <>
      <PageHeading
        title="Training Feedback & Drill Evaluations"
        subtitle="Capture qualitative observations from field participants to continuously optimize response preparedness."
      />

      <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
        <Panel title="Submit Training Review">
          <div className="space-y-4">
            <FieldSelect
              label="Select Training"
              value={trainingId}
              setValue={setTraining}
              items={data.trainings.map((t) => ({ value: t.id, label: t.name }))}
            />

            <div>
              <Label>Rating</Label>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRating(n)}
                  >
                    <Star className={`size-6 ${n <= rating ? "fill-amber-400 text-amber-500" : "text-muted"}`} />
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Field Observations & Comments</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Detail what went well, equipment performance, response speed, or areas for improvement..."
                rows={4}
              />
            </div>

            <Button className="w-full" onClick={() => void submit()} disabled={comments.length < 5}>
              <Star className="mr-2 size-4" />
              Submit Review
            </Button>
          </div>
        </Panel>

        <Panel title="Feedback & Ratings History">
          <div className="space-y-4">
            {data.feedback.map((f) => {
              const training = data.trainings.find((t) => t.id === f.training_id);
              const author = data.profiles.find((p) => p.id === f.user_id);

              return (
                <div key={f.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">{training?.name ?? "Disaster Training"}</p>
                      <p className="text-xs text-muted-foreground">{author?.full_name ?? "Responder"} · {formatDate(f.created_at)}</p>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`size-4 ${n <= f.rating ? "fill-amber-400 text-amber-500" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg border italic">“{f.comments}”</p>
                </div>
              );
            })}
            {data.feedback.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No feedback reviews submitted yet.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------------
// REPORTS VIEW (Admin)
// ----------------------------------------------------------------------------
function ReportsView({ data }: { data: Workspace }) {
  const statusData = ["completed", "active", "planned", "cancelled"].map((name) => ({
    name,
    value: data.trainings.filter((t) => t.status === name).length,
  }));

  const resourceData = data.resources.slice(0, 6).map((r) => ({
    name: r.name.slice(0, 14),
    value: r.allocated_quantity,
  }));

  const severityData = ["high", "medium", "info"].map((name) => ({
    name,
    value: data.alerts.filter((a) => a.severity === name).length,
  }));

  function exportCSV() {
    const lines = [
      ["Training", "Disaster Type", "Location", "Scheduled Date", "Progress", "Status"],
      ...data.trainings.map((t) => [t.name, t.disaster_type, t.location, t.scheduled_at, String(t.progress), t.status]),
    ];
    const blob = new Blob([lines.map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dms-operations-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Operations CSV Report downloaded!");
  }

  return (
    <>
      <PageHeading
        title="Disaster Operations Reports & Analytics"
        subtitle="Executive readiness metrics, resource utilization, incident trends, and downloadable compliance reports."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <FileText className="mr-2 size-4" />
              Print Report
            </Button>
            <Button onClick={exportCSV}>
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Trainings" value={data.trainings.length} icon={GraduationCap} />
        <StatCard label="Drills Completed" value={statusData.find((s) => s.name === "completed")?.value ?? 0} icon={CheckCircle2} tone="green" />
        <StatCard label="Allocated Supplies" value={data.allocations.length} icon={Boxes} />
        <StatCard label="Total Responders" value={data.profiles.length} icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Training Status Distribution">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={["#10b981", "#3b82f6", "#f59e0b", "#ef4444"][i % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Allocated Resource Quantities">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Training Progress by Program">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trainings.slice(0, 6).map((t) => ({ name: t.name.slice(0, 12), value: t.progress }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Alerts by Severity">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------------
// SETTINGS VIEW
// ----------------------------------------------------------------------------
function SettingsView({ data }: { data: Workspace }) {
  return (
    <>
      <PageHeading title="System & Account Settings" subtitle="Personnel identity, security authorizations, and instance metadata." />
      <Panel title="Account Details">
        <div className="flex items-center gap-5">
          <Avatar className="size-16 border-2 border-primary">
            <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
              {initials(data.profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold">{data.profile.full_name}</h3>
            <p className="text-sm text-muted-foreground">{data.profile.email}</p>
            <div className="mt-2 flex gap-2">
              <Status value={ROLE_LABEL[data.role]} />
              <Status value={data.profile.status} />
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}

// ----------------------------------------------------------------------------
// HELPER DIALOGS & FORMS
// ----------------------------------------------------------------------------
function ModalForm({
  open,
  onOpen,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
}: {
  open: boolean;
  onOpen: (v: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserDialog({
  open,
  onOpen,
  onSubmit,
}: {
  open: boolean;
  onOpen: (v: boolean) => void;
  onSubmit: (v: { fullName: string; email: string; password: string; role: AppRole }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("volunteer");

  return (
    <ModalForm
      open={open}
      onOpen={onOpen}
      title="Add Personnel Account"
      description="Create an authorized emergency services user profile."
      submitLabel="Create User"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({ fullName: name, email, password, role }).catch((x) => toast.error(x.message));
      }}
    >
      <TextField label="Full Name" value={name} setValue={setName} />
      <TextField label="Email Address" value={email} setValue={setEmail} type="email" />
      <TextField label="Initial Password" value={password} setValue={setPassword} type="password" />
      <FieldSelect
        label="Assigned System Role"
        value={role}
        setValue={(v) => setRole(v as AppRole)}
        items={[
          { value: "admin", label: "Administrator" },
          { value: "trainer", label: "Trainer" },
          { value: "volunteer", label: "Volunteer" },
        ]}
      />
    </ModalForm>
  );
}

function TrainingDialog({
  open,
  onOpen,
  initialData,
  trainers,
  onSubmit,
}: {
  open: boolean;
  onOpen: (v: boolean) => void;
  initialData?: Training | null;
  trainers: Workspace["profiles"];
  onSubmit: (v: {
    name: string;
    disasterType: string;
    location: string;
    scheduledAt: string;
    trainerId: string | null;
    participants: number;
    status: "planned" | "active" | "completed" | "cancelled";
    description: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Flood");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [trainer, setTrainer] = useState(trainers[0]?.id ?? "");
  const [participants, setParticipants] = useState(0);
  const [status, setStatus] = useState<"planned" | "active" | "completed" | "cancelled">("planned");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.disaster_type);
      setLocation(initialData.location);
      setDate(String(initialData.scheduled_at).slice(0, 10));
      setTrainer(initialData.trainer_id ?? trainers[0]?.id ?? "");
      setParticipants(initialData.participant_count);
      setStatus(initialData.status);
      setDescription(initialData.description ?? "");
    } else {
      setName("");
      setType("Flood");
      setLocation("");
      setDate(new Date().toISOString().slice(0, 10));
      setTrainer(trainers[0]?.id ?? "");
      setParticipants(0);
      setStatus("planned");
      setDescription("");
    }
  }, [initialData, trainers, open]);

  return (
    <ModalForm
      open={open}
      onOpen={onOpen}
      title={initialData ? "Update Training Program" : "Create New Training Program"}
      description="Register preparedness sessions, drill locations, and instructors."
      submitLabel={initialData ? "Save Changes" : "Create Training"}
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          name,
          disasterType: type,
          location,
          scheduledAt: new Date(date).toISOString(),
          trainerId: trainer || null,
          participants,
          status,
          description,
        }).catch((x) => toast.error(x.message));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Training Title" value={name} setValue={setName} />
        <TextField label="Disaster Category" value={type} setValue={setType} />
        <TextField label="Venue / Location" value={location} setValue={setLocation} />
        <TextField label="Drill Date" value={date} setValue={setDate} type="date" />
        <TextField label="Estimated Capacity" value={String(participants)} setValue={(v) => setParticipants(Number(v))} type="number" />
        <FieldSelect
          label="Training Status"
          value={status}
          setValue={(v) => setStatus(v as typeof status)}
          items={[
            { value: "planned", label: "Planned" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>
      <FieldSelect label="Lead Instructor / Trainer" value={trainer} setValue={setTrainer} items={trainers.map((t) => ({ value: t.id, label: t.full_name }))} />
      <div className="space-y-2">
        <Label>Description & Learning Objectives</Label>
        <Textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
    </ModalForm>
  );
}

function ResourceDialog({
  open,
  onOpen,
  onSubmit,
  warehouses,
}: {
  open: boolean;
  onOpen: (v: boolean) => void;
  warehouses: Workspace["warehouses"];
  onSubmit: (v: {
    name: string;
    category: string;
    quantity: number;
    minimumStock: number;
    damagedQuantity: number;
    unit: string;
    storageLocation: string;
    condition: string;
    expiryDate: string | null;
    supplier: string;
    warehouseId: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Water Rescue");
  const [quantity, setQuantity] = useState(10);
  const [minimumStock, setMinimum] = useState(5);
  const [damagedQuantity, setDamaged] = useState(0);
  const [unit, setUnit] = useState("units");
  const [storageLocation, setLocation] = useState("Bay 1A");
  const [condition, setCondition] = useState("Good");
  const [expiryDate, setExpiry] = useState("");
  const [supplier, setSupplier] = useState("State Disaster Relief Store");
  const [warehouseId, setWarehouse] = useState(warehouses[0]?.id ?? "");

  return (
    <ModalForm
      open={open}
      onOpen={onOpen}
      title="Add Resource to Inventory"
      description="Register emergency supplies, life safety equipment, and storage locations."
      submitLabel="Add Resource"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          name,
          category,
          quantity,
          minimumStock,
          damagedQuantity,
          unit,
          storageLocation,
          condition,
          expiryDate: expiryDate || null,
          supplier,
          warehouseId: warehouseId || null,
        }).catch((x) => toast.error(x.message));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Resource Name" value={name} setValue={setName} />
        <TextField label="Category" value={category} setValue={setCategory} />
        <TextField label="Total Stock Quantity" type="number" value={String(quantity)} setValue={(v) => setQuantity(Number(v))} />
        <TextField label="Minimum Alert Threshold" type="number" value={String(minimumStock)} setValue={(v) => setMinimum(Number(v))} />
        <TextField label="Damaged Quantity" type="number" value={String(damagedQuantity)} setValue={(v) => setDamaged(Number(v))} />
        <TextField label="Measurement Unit (e.g. units, kits)" value={unit} setValue={setUnit} />
        <TextField label="Storage Bay / Shelf" value={storageLocation} setValue={setLocation} />
        <TextField label="Condition" value={condition} setValue={setCondition} />
      </div>
      {warehouses.length > 0 && (
        <FieldSelect label="Depot / Warehouse" value={warehouseId} setValue={setWarehouse} items={warehouses.map((w) => ({ value: w.id, label: w.warehouse_name }))} />
      )}
    </ModalForm>
  );
}

function AlertDialogForm({
  open,
  onOpen,
  trainings,
  onSubmit,
}: {
  open: boolean;
  onOpen: (v: boolean) => void;
  trainings: Training[];
  onSubmit: (v: {
    title: string;
    message: string;
    severity: "high" | "medium" | "info";
    trainingId: string | null;
    recipients: "all" | "admin" | "trainer" | "volunteer";
    alertType: "Disaster Warning" | "Resource Shortage" | "Evacuation" | "Medical Emergency" | "Weather" | "Training" | "Infrastructure" | "Security" | "Other";
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"high" | "medium" | "info">("high");
  const [alertType, setAlertType] = useState<"Disaster Warning" | "Resource Shortage" | "Evacuation" | "Medical Emergency" | "Weather" | "Training" | "Infrastructure" | "Security" | "Other">("Disaster Warning");
  const [training, setTraining] = useState("");
  const [recipients, setRecipients] = useState<"all" | "admin" | "trainer" | "volunteer">("all");

  return (
    <ModalForm
      open={open}
      onOpen={onOpen}
      title="Generate Emergency Alert"
      description="Immediately transmit a priority alert to personnel dashboards and mobile terminals."
      submitLabel="Broadcast Alert"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          title,
          message,
          severity,
          trainingId: training || null,
          recipients,
          alertType,
        }).catch((x) => toast.error(x.message));
      }}
    >
      <TextField label="Alert Title" value={title} setValue={setTitle} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSelect
          label="Alert Severity"
          value={severity}
          setValue={(v) => setSeverity(v as typeof severity)}
          items={[
            { value: "high", label: "High / Red Alert" },
            { value: "medium", label: "Medium / Warning" },
            { value: "info", label: "Info / Advisory" },
          ]}
        />
        <FieldSelect
          label="Alert Category"
          value={alertType}
          setValue={(v) => setAlertType(v as typeof alertType)}
          items={[
            { value: "Disaster Warning", label: "Disaster Warning" },
            { value: "Resource Shortage", label: "Resource Shortage" },
            { value: "Evacuation", label: "Evacuation" },
            { value: "Medical Emergency", label: "Medical Emergency" },
            { value: "Weather", label: "Weather" },
            { value: "Training", label: "Training Drill" },
            { value: "Other", label: "Other" },
          ]}
        />
      </div>
      <FieldSelect
        label="Recipients Target Group"
        value={recipients}
        setValue={(v) => setRecipients(v as typeof recipients)}
        items={[
          { value: "all", label: "All Personnel & Responders" },
          { value: "admin", label: "Administrators Only" },
          { value: "trainer", label: "Trainers & Team Leads" },
          { value: "volunteer", label: "Volunteers Only" },
        ]}
      />
      <div className="space-y-2">
        <Label>Alert Message Content</Label>
        <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
      </div>
    </ModalForm>
  );
}

function Filters({ search, setSearch, children }: { search: string; setSearch: (v: string) => void; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records…" />
      </div>
      {children}
    </div>
  );
}

function DataPanel({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">{children}</div>;
}

function TextField({ label, value, setValue, type = "text" }: { label: string; value: string; setValue: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input required type={type} value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

function FieldSelect({ label, value, setValue, items }: { label: string; value: string; setValue: (v: string) => void; items: { value: string; label: string }[] }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Confirm({ open, onOpen, title, description, action }: { open: boolean; onOpen: () => void; title: string; description: string; action: () => Promise<void> }) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onOpen()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void action()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="mt-3 text-sm font-semibold text-muted-foreground">Connecting to DMS Operations Centre…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ retry }: { retry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Unable to Load Operations Data</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Make sure your Supabase URL and credentials are configured in your <code className="bg-muted px-1.5 py-0.5 rounded">.env</code> file and the SQL schema has been executed.
        </p>
        <Button className="mt-5" onClick={retry}>
          Retry Connection
        </Button>
      </div>
    </div>
  );
}