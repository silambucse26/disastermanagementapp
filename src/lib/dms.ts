import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Training = Database["public"]["Tables"]["trainings"]["Row"];
export type Resource = Database["public"]["Tables"]["resources"]["Row"];
export type AlertRecord = Database["public"]["Tables"]["alerts"]["Row"];
export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
export type Allocation = Database["public"]["Tables"]["allocations"]["Row"];
export type Activity = Database["public"]["Tables"]["activity_log"]["Row"];

export const ROLE_LABEL: Record<AppRole, string> = { admin: "Administrator", trainer: "Trainer", volunteer: "Volunteer" };
export const DEMO_PASSWORD = "DmsDemo@2026";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
