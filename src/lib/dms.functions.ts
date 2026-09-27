import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.enum(["admin", "trainer", "volunteer"]);
const statusSchema = z.enum(["planned", "active", "completed", "cancelled"]);
const severitySchema = z.enum(["high", "medium", "info"]);

async function roleFor(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).single();
  if (error || !data) throw new Error("Account role is not configured.");
  return roleSchema.parse(data.role);
}
function requireRole(role: string, allowed: string[]) { if (!allowed.includes(role)) throw new Error("You do not have permission for this action."); }

export const getWorkspace = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await roleFor(context);
  const [profile, profiles, roles, trainings, resources, allocations, alerts, feedback, activity, participants, activities, disasters, teams, teamMembers, shelters, evacuations, warehouses, attendance, acknowledgements, notifications, hospitals, hospitalResponses, contacts] = await Promise.all([
    context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
    context.supabase.from("profiles").select("*").order("full_name"),
    context.supabase.from("user_roles").select("user_id, role"),
    context.supabase.from("trainings").select("*").order("scheduled_at"),
    context.supabase.from("resources").select("*").order("name"),
    context.supabase.from("allocations").select("*").order("created_at", { ascending: false }),
    context.supabase.from("alerts").select("*").order("created_at", { ascending: false }),
    context.supabase.from("feedback").select("*").order("created_at", { ascending: false }),
    context.supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(20),
    context.supabase.from("training_participants").select("*"),
    context.supabase.from("training_activities").select("*").order("sort_order"),
    context.supabase.from("disasters").select("*").order("occurred_at", { ascending: false }),
    context.supabase.from("response_teams").select("*").order("team_name"),
    context.supabase.from("response_team_members").select("*"),
    context.supabase.from("shelters").select("*").order("shelter_name"),
    context.supabase.from("evacuations").select("*").order("created_at", { ascending: false }),
    context.supabase.from("warehouses").select("*").order("warehouse_name"),
    context.supabase.from("attendance_records").select("*").order("attendance_date", { ascending: false }),
    context.supabase.from("alert_acknowledgements").select("*").order("acknowledged_at", { ascending: false }),
    context.supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    context.supabase.from("medical_facilities").select("*").order("hospital_name"),
    context.supabase.from("hospital_disaster_responses").select("*"),
    context.supabase.from("emergency_contacts").select("*").order("service"),
  ]);
  const failed = [profile, profiles, roles, trainings, resources, allocations, alerts, feedback, activity, participants, activities, disasters, teams, teamMembers, shelters, evacuations, warehouses, attendance, acknowledgements, notifications, hospitals, hospitalResponses, contacts].find((r) => r.error);
  if (failed?.error) throw failed.error;
  const profileData = profile.data;
  if (!profileData) throw new Error("Account profile is not configured.");
  return { userId: context.userId, role, profile: profileData, profiles: profiles.data ?? [], roles: roles.data ?? [], trainings: trainings.data ?? [], resources: resources.data ?? [], allocations: allocations.data ?? [], alerts: alerts.data ?? [], feedback: feedback.data ?? [], activity: activity.data ?? [], participants: participants.data ?? [], activities: activities.data ?? [], disasters: disasters.data ?? [], teams: teams.data ?? [], teamMembers: teamMembers.data ?? [], shelters: shelters.data ?? [], evacuations: evacuations.data ?? [], warehouses: warehouses.data ?? [], attendance: attendance.data ?? [], acknowledgements: acknowledgements.data ?? [], notifications: notifications.data ?? [], hospitals: hospitals.data ?? [], hospitalResponses: hospitalResponses.data ?? [], contacts: contacts.data ?? [] };
});

export const createTraining = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ name:z.string().min(3), disasterType:z.string().min(2), location:z.string().min(2), scheduledAt:z.string().min(1), trainerId:z.string().uuid().nullable(), participants:z.number().int().min(0), status:statusSchema, description:z.string() }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin","trainer"]);
  const result = await context.supabase.from("trainings").insert({ name:data.name, disaster_type:data.disasterType, location:data.location, scheduled_at:data.scheduledAt, trainer_id:data.trainerId, participant_count:data.participants, status:data.status, description:data.description, created_by:context.userId }).select().single();
  if (result.error) throw result.error;
  await context.supabase.from("activity_log").insert({ actor_id:context.userId, event:`Created ${data.name}`, entity_type:"training", entity_id:result.data.id });
  return result.data;
});

export const updateTrainingProgress = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ id:z.string().uuid(), progress:z.number().int().min(0).max(100) }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin","trainer"]);
  const result = await context.supabase.from("trainings").update({ progress:data.progress, updated_at:new Date().toISOString() }).eq("id",data.id).select().single();
  if (result.error) throw result.error;
  await context.supabase.from("activity_log").insert({ actor_id:context.userId, event:`Updated ${result.data.name} to ${data.progress}%`, entity_type:"training", entity_id:data.id });
  return result.data;
});

export const deleteTraining = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ id:z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin"]);
  const result = await context.supabase.from("trainings").delete().eq("id", data.id);
  if (result.error) throw result.error;
  return { ok:true };
});

export const createResource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ name:z.string().min(2), category:z.string().min(2), quantity:z.number().int().min(0), minimumStock:z.number().int().min(0), damagedQuantity:z.number().int().min(0).default(0), unit:z.string().min(1).default("units"), storageLocation:z.string().default(""), condition:z.string().default("Good"), expiryDate:z.string().nullable().default(null), supplier:z.string().default(""), warehouseId:z.string().uuid().nullable().default(null) }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin","trainer"]);
  const result = await context.supabase.from("resources").insert({ name:data.name, category:data.category, total_quantity:data.quantity, available_quantity:data.quantity, allocated_quantity:0, minimum_stock:data.minimumStock, damaged_quantity:data.damagedQuantity, unit:data.unit, storage_location:data.storageLocation, condition:data.condition, expiry_date:data.expiryDate, supplier:data.supplier, warehouse_id:data.warehouseId }).select().single();
  if (result.error) throw result.error;
  return result.data;
});

export const allocateResource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ trainingId:z.string().uuid(), resourceId:z.string().uuid(), quantity:z.number().int().positive(), volunteerId:z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin","trainer"]);
  const result = await context.supabase.rpc("allocate_resource", { _training_id:data.trainingId, _resource_id:data.resourceId, _quantity:data.quantity, _volunteer_id:data.volunteerId });
  if (result.error) throw result.error;
  return result.data;
});

export const createAlert = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ title:z.string().min(3), message:z.string().min(3), severity:severitySchema, trainingId:z.string().uuid().nullable(), recipients:z.enum(["all","admin","trainer","volunteer"]), alertType:z.enum(["Disaster Warning","Resource Shortage","Evacuation","Medical Emergency","Weather","Training","Infrastructure","Security","Other"]).default("Other"), disasterId:z.string().uuid().nullable().default(null), location:z.string().default(""), targetTeams:z.array(z.string().uuid()).default([]), expiresAt:z.string().nullable().default(null) }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin","trainer"]);
  const result = await context.supabase.from("alerts").insert({ title:data.title, message:data.message, severity:data.severity, training_id:data.trainingId, recipients:data.recipients, created_by:context.userId, alert_type:data.alertType, disaster_id:data.disasterId, location:data.location, target_teams:data.targetTeams, expires_at:data.expiresAt }).select().single();
  if (result.error) throw result.error;
  await context.supabase.from("activity_log").insert({ actor_id:context.userId, event:"Emergency alert generated", entity_type:"alert", entity_id:result.data.id });
  return result.data;
});

export const resolveAlert = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ id:z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin","trainer"]);
  const result = await context.supabase.from("alerts").update({ status:"resolved", resolved_at:new Date().toISOString() }).eq("id",data.id);
  if (result.error) throw result.error;
  return { ok:true };
});

export const submitFeedback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ trainingId:z.string().uuid(), rating:z.number().int().min(1).max(5), comments:z.string().min(5) }).parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.from("feedback").insert({ training_id:data.trainingId, user_id:context.userId, rating:data.rating, comments:data.comments }).select().single();
  if (result.error) throw result.error;
  return result.data;
});

export const updateTraining = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ id:z.string().uuid(), name:z.string().min(3), disasterType:z.string().min(2), location:z.string().min(2), scheduledAt:z.string().min(1), trainerId:z.string().uuid().nullable(), participants:z.number().int().min(0), status:statusSchema, description:z.string() }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin","trainer"]);
  const result = await context.supabase.from("trainings").update({ name:data.name, disaster_type:data.disasterType, location:data.location, scheduled_at:data.scheduledAt, trainer_id:data.trainerId, participant_count:data.participants, status:data.status, description:data.description, updated_at:new Date().toISOString() }).eq("id", data.id).select().single();
  if (result.error) throw result.error;
  await context.supabase.from("activity_log").insert({ actor_id:context.userId, event:`Updated training: ${data.name}`, entity_type:"training", entity_id:data.id });
  return result.data;
});

export const joinTraining = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ trainingId:z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const existing = await context.supabase.from("training_participants").select("id").eq("training_id", data.trainingId).eq("user_id", context.userId).maybeSingle();
  if (existing.data) throw new Error("You are already enrolled in this training program.");

  const { data: userProfile } = await context.supabase.from("profiles").select("full_name").eq("id", context.userId).single();
  const participantCode = `VOL-${Math.floor(1000 + Math.random() * 9000)}`;

  const result = await context.supabase.from("training_participants").insert({
    training_id: data.trainingId,
    user_id: context.userId,
    participant_name: userProfile?.full_name ?? "Volunteer Participant",
    participant_code: participantCode,
    participant_role: "Volunteer",
    status: "Enrolled",
    attendance: false
  }).select().single();
  if (result.error) throw result.error;

  const { data: tr } = await context.supabase.from("trainings").select("participant_count, name").eq("id", data.trainingId).single();
  if (tr) {
    await context.supabase.from("trainings").update({ participant_count: (tr.participant_count || 0) + 1 }).eq("id", data.trainingId);
  }

  await context.supabase.from("activity_log").insert({
    actor_id: context.userId,
    event: `Enrolled in ${tr?.name ?? "training"}`,
    entity_type: "training",
    entity_id: data.trainingId
  });

  return result.data;
});

export const createUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ fullName:z.string().min(2), email:z.string().email(), password:z.string().min(8), role:roleSchema }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin"]);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const created = await supabaseAdmin.auth.admin.createUser({ email:data.email, password:data.password, email_confirm:true, user_metadata:{ full_name:data.fullName } });
  if (created.error || !created.data.user) throw created.error ?? new Error("Unable to create user");
  const userId = created.data.user.id;
  const profile = await supabaseAdmin.from("profiles").insert({ id:userId, full_name:data.fullName, email:data.email, status:"active" });
  const role = await supabaseAdmin.from("user_roles").insert({ user_id:userId, role:data.role });
  if (profile.error || role.error) { await supabaseAdmin.auth.admin.deleteUser(userId); throw profile.error ?? role.error; }
  return { id:userId };
});

export const deleteUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input) => z.object({ id:z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  requireRole(await roleFor(context), ["admin"]);
  if (data.id === context.userId) throw new Error("You cannot delete your own account.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("user_roles").delete().eq("user_id",data.id);
  await supabaseAdmin.from("profiles").delete().eq("id",data.id);
  const result = await supabaseAdmin.auth.admin.deleteUser(data.id);
  if (result.error) throw result.error;
  return { ok:true };
});
