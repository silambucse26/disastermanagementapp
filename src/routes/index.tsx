import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEMO_PASSWORD, type AppRole } from "@/lib/dms";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Secure Sign In — Disaster Management System" },
    { name: "description", content: "Secure access for disaster management personnel." },
    { property: "og:title", content: "Disaster Management System" },
    { property: "og:description", content: "Real-Time Training Monitoring & Resource Management." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: LoginPage,
});

const demos: { role: AppRole; email: string }[] = [
  { role: "admin", email: "admin@test.com" }, { role: "trainer", email: "trainer@test.com" }, { role: "volunteer", email: "volunteer@test.com" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [role, setRole] = useState<AppRole>("admin");
  const [show, setShow] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) void navigate({ to: "/operations" }); }); }, [navigate]);
  async function signIn(targetEmail = email, targetPassword = password, targetRole = role) {
    if (!targetEmail || !targetPassword) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    const result = await supabase.auth.signInWithPassword({ email: targetEmail, password: targetPassword });
    if (result.error || !result.data.user) { setError("The email or password is incorrect."); setLoading(false); return; }
    const roleResult = await supabase.from("user_roles").select("role").eq("user_id", result.data.user.id).single();
    if (roleResult.error || roleResult.data.role !== targetRole) { await supabase.auth.signOut(); setError(`This account is not registered as ${targetRole}.`); setLoading(false); return; }
    await navigate({ to: "/operations" });
  }
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-primary px-4 py-10">
    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(var(--color-primary-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary-foreground) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
    <div className="relative w-full max-w-md">
      <div className="mb-7 text-center text-primary-foreground"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-lg bg-destructive shadow-lg"><AlertTriangle className="size-7" /></div><h1 className="text-2xl font-extrabold">DISASTER MANAGEMENT SYSTEM</h1><p className="mt-2 text-sm text-primary-foreground/75">Real-Time Training Monitoring & Resource Management</p></div>
      <section className="rounded-lg border border-primary-foreground/15 bg-card p-6 shadow-2xl sm:p-8"><div className="mb-6"><h2 className="text-xl font-bold">Personnel sign in</h2><p className="mt-1 text-sm text-muted-foreground">Use your authorized operations account.</p></div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void signIn(); }}>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@agency.org" autoComplete="email" /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={show?"text":"password"} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter password" className="pr-10" /><Button type="button" variant="ghost" size="icon" aria-label={show?"Hide password":"Show password"} className="absolute right-0 top-0" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</Button></div></div>
          <div className="space-y-2"><Label>Role</Label><Select value={role} onValueChange={(v)=>setRole(v as AppRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrator</SelectItem><SelectItem value="trainer">Trainer</SelectItem><SelectItem value="volunteer">Volunteer</SelectItem></SelectContent></Select></div>
          {error && <div role="alert" className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <Button className="h-11 w-full" disabled={loading}>{loading?<span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"/>:<LockKeyhole/>}{loading?"Signing in…":"Secure login"}</Button>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>QUICK DEMO ACCESS<span className="h-px flex-1 bg-border"/></div>
        <div className="grid grid-cols-3 gap-2">{demos.map((d)=><Button key={d.role} variant="outline" className="h-auto flex-col py-2 capitalize" onClick={()=>{setRole(d.role);setEmail(d.email);setPassword(DEMO_PASSWORD);void signIn(d.email,DEMO_PASSWORD,d.role)}}><span>{d.role}</span><span className="text-[10px] font-normal text-muted-foreground">Demo</span></Button>)}</div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-emerald-600"/>Secure access for disaster management personnel</p>
      </section>
    </div>
  </main>;
}