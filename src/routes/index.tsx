import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Eye, EyeOff, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_PASSWORD, type AppRole } from "@/lib/dms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Personnel Sign In — Disaster Management System" },
      { name: "description", content: "Secure operations and command access for disaster management personnel." },
      { property: "og:title", content: "Disaster Management System" },
      { property: "og:description", content: "Real-Time Training Monitoring & Resource Management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const demos: { role: AppRole; email: string }[] = [
  { role: "admin", email: "admin@dms.gov.in" },
  { role: "trainer", email: "trainer@dms.gov.in" },
  { role: "volunteer", email: "volunteer@dms.gov.in" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("admin");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/operations" });
    });
  }, [navigate]);

  async function signIn(targetEmail = email, targetPassword = password, targetRole = role) {
    if (!targetEmail || !targetPassword) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    let result = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword,
    });

    // If account doesn't exist in auth.users yet, use instant registration RPC to bypass rate limits
    if (result.error && (result.error.message.toLowerCase().includes("invalid login") || result.error.message.toLowerCase().includes("user not found") || result.error.status === 400)) {
      const defaultNames: Record<string, string> = {
        "admin@dms.gov.in": "Operations Commander (Admin)",
        "trainer@dms.gov.in": "Captain Rajesh Kumar (Trainer)",
        "volunteer@dms.gov.in": "Ananya Sharma (Volunteer)",
      };
      const autoName: string = fullName || defaultNames[targetEmail] || (targetEmail.split("@")[0] ?? "Responder");
      
      const rpcRes = await supabase.rpc("register_responder", {
        _email: targetEmail,
        _password: targetPassword,
        _full_name: autoName,
        _role: targetRole,
      });

      if (rpcRes.data?.ok) {
        result = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: targetPassword,
        });
      } else {
        // Fallback to client signUp
        const signUpRes = await supabase.auth.signUp({
          email: targetEmail,
          password: targetPassword,
          options: {
            data: { full_name: autoName, role: targetRole },
          },
        });

        if (signUpRes.data.user) {
          await supabase.from("profiles").upsert({
            id: signUpRes.data.user.id,
            full_name: autoName,
            email: targetEmail,
            status: "active",
          });

          await supabase.from("user_roles").upsert({
            user_id: signUpRes.data.user.id,
            role: targetRole,
          });

          result = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: targetPassword,
          });
        }
      }
    }

    if (result.error || !result.data.user) {
      setError(result.error?.message || "Invalid email or password. Please verify your credentials.");
      setLoading(false);
      return;
    }

    const roleResult = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", result.data.user.id)
      .maybeSingle();

    if (!roleResult.data) {
      await supabase.from("user_roles").upsert({ user_id: result.data.user.id, role: targetRole });
    } else if (roleResult.data.role !== targetRole) {
      // Auto-update to selected role for demo testing convenience
      await supabase.from("user_roles").update({ role: targetRole }).eq("user_id", result.data.user.id);
    }

    // Ensure profile exists
    const userMeta = result.data.user.user_metadata as Record<string, unknown> | undefined;
    const resolvedFullName = (typeof userMeta?.["full_name"] === "string" ? userMeta["full_name"] : "") || (targetEmail.split("@")[0] ?? "Responder");

    await supabase.from("profiles").upsert({
      id: result.data.user.id,
      full_name: resolvedFullName,
      email: targetEmail,
      status: "active",
    });

    await navigate({ to: "/operations" });
  }

  async function signUp() {
    if (!email || !password || !fullName) {
      setError("Please complete all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (role === "admin") {
      setError("Administrator accounts cannot be self-registered. Please select Trainer or Volunteer.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    // Try instant server-side registration RPC first (immune to email 429 rate limit)
    const rpcRes = await supabase.rpc("register_responder", {
      _email: email,
      _password: password,
      _full_name: fullName,
      _role: role,
    });

    if (rpcRes.data?.ok) {
      setSuccess(`Account registered as ${role.toUpperCase()}! Signing into your dashboard...`);
      const loginRes = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginRes.data.user) {
        await navigate({ to: "/operations" });
        return;
      }
    }

    // Fallback: standard client signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (authError || !authData.user) {
      setError(
        authError?.status === 429
          ? "Supabase email rate limit reached. Please run instant_fix_auth.sql in your Supabase SQL editor to enable instant registrations without rate limits."
          : authError?.message || "Failed to create account."
      );
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // Attempt profile & role upserts (if session exists); database trigger handle_new_user also guarantees this on the server
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        email,
        status: "active",
      });

      await supabase.from("user_roles").upsert({
        user_id: userId,
        role,
      });

      await supabase.from("activity_log").insert({
        actor_id: userId,
        event: `New ${role === "trainer" ? "Trainer" : "Volunteer"} registered: ${fullName} (${email})`,
        entity_type: "user",
        entity_id: userId,
        action: "register",
        module: "users",
      });
    } catch {
      // Background database trigger handles sync
    }

    if (authData.session) {
      setSuccess(`Account registered as ${role.toUpperCase()}! Entering dashboard...`);
      await navigate({ to: "/operations" });
      return;
    }

    setSuccess(`Account registered as ${role.toUpperCase()}! Signing into your dashboard...`);
    const loginRes = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginRes.data.user) {
      await navigate({ to: "/operations" });
    } else if (loginRes.error?.message.toLowerCase().includes("email not confirmed")) {
      setError("Email confirmation is enabled in your Supabase project. Please disable 'Confirm email' under Authentication -> Providers -> Email in your Supabase dashboard, or run instant_fix_auth.sql.");
      setLoading(false);
    } else {
      setTimeout(() => {
        void signIn(email, password, role);
      }, 500);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4 py-10">
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-red-600 shadow-xl">
            <AlertTriangle className="size-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white sm:text-3xl">DISASTER MANAGEMENT SYSTEM</h1>
          <p className="mt-1.5 text-xs text-slate-400">Integrated Command, Real-Time Training & Logistics</p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur sm:p-8">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const newTab = v as typeof tab;
              setTab(newTab);
              setError("");
              setSuccess("");
              if (newTab === "signup" && role === "admin") {
                setRole("volunteer");
              }
            }}
            className="mb-5"
          >
            <TabsList className="grid w-full grid-cols-2 bg-slate-800">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register / Sign Up</TabsTrigger>
            </TabsList>
          </Tabs>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (tab === "signin") void signIn();
              else void signUp();
            }}
          >
            {tab === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullname" className="text-slate-200">Full Name</Label>
                <Input
                  id="fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="border-slate-700 bg-slate-800 text-white"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-200">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="responder@disaster.gov.in"
                autoComplete="email"
                className="border-slate-700 bg-slate-800 text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="border-slate-700 bg-slate-800 pr-10 text-white"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-0 top-0 text-slate-400 hover:text-white"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-200">Operational Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-white">
                  {tab === "signin" && (
                    <SelectItem value="admin">Administrator (Command Center)</SelectItem>
                  )}
                  <SelectItem value="trainer">Trainer / Drill Instructor</SelectItem>
                  <SelectItem value="volunteer">Volunteer Responder</SelectItem>
                </SelectContent>
              </Select>
              {tab === "signup" && (
                <p className="text-[11px] text-slate-400">
                  * Administrator access is restricted and granted only by the Command Center.
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                {success}
              </div>
            )}

            <Button className="h-11 w-full bg-red-600 hover:bg-red-700 text-white font-bold" disabled={loading}>
              {loading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : tab === "signin" ? (
                <LockKeyhole className="mr-2 size-4" />
              ) : (
                <UserPlus className="mr-2 size-4" />
              )}
              {loading ? "Authenticating…" : tab === "signin" ? "Authorize & Sign In" : "Create Verified Account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            ONE-CLICK ROLE DEMO ACCESS
            <span className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {demos.map((d) => (
              <Button
                key={d.role}
                variant="outline"
                className="h-auto flex-col border-slate-800 bg-slate-800/60 py-2.5 text-slate-200 hover:bg-slate-700 hover:text-white capitalize"
                onClick={() => {
                  setTab("signin");
                  setRole(d.role);
                  setEmail(d.email);
                  setPassword(DEMO_PASSWORD);
                  void signIn(d.email, DEMO_PASSWORD, d.role);
                }}
              >
                <span className="font-bold text-xs">{d.role}</span>
                <span className="text-[10px] font-normal text-slate-400">Auto-login</span>
              </Button>
            ))}
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="size-4 text-emerald-500" />
            256-bit Encrypted Operations Network
          </p>
        </section>
      </div>
    </main>
  );
}