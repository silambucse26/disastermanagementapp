import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Training = Database["public"]["Tables"]["trainings"]["Row"];
export type Resource = Database["public"]["Tables"]["resources"]["Row"];
export type AlertRecord = Database["public"]["Tables"]["alerts"]["Row"];
export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
export type Allocation = Database["public"]["Tables"]["allocations"]["Row"];
export type Activity = Database["public"]["Tables"]["activity_log"]["Row"];
export type Disaster = Database["public"]["Tables"]["disasters"]["Row"];
export type ResponseTeam = Database["public"]["Tables"]["response_teams"]["Row"];
export type Shelter = Database["public"]["Tables"]["shelters"]["Row"];
export type Evacuation = Database["public"]["Tables"]["evacuations"]["Row"];
export type Warehouse = Database["public"]["Tables"]["warehouses"]["Row"];
export type MedicalFacility = Database["public"]["Tables"]["medical_facilities"]["Row"];
export type EmergencyContact = Database["public"]["Tables"]["emergency_contacts"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"];

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
