# Extend the Disaster Management System

## Goal
Preserve the current authenticated operations application and add the missing disaster-response data, workflows, maps, live notifications, and analytics.

## Build
- Add an additive SQL migration for disasters, response teams, shelters, evacuations, warehouses, attendance, alert acknowledgements, notifications, hospitals, hospital responses, and emergency contacts.
- Extend existing resources, trainings, participants, allocations, alerts, and audit records only with missing fields; use generated IDs and existing names where they already represent the requested concepts.
- Add grants, row-level access, validation, calculated capacities/remaining counts, audit triggers/functions, relationships, indexes, and realtime publication entries.
- Extend the existing server-function service with validated CRUD and operational actions, including incident status updates, team assignment, evacuation updates, alert acknowledgement, notification reads, and editable contacts.
- Extend the current workspace navigation and pages with Disasters, Incident Map, Response Teams, Shelters, Evacuations, Warehouses, Participants, Attendance, Medical Facilities, Emergency Contacts, Notifications, and Audit Logs.
- Preserve existing pages and visual patterns; add search, filters, detail/edit forms, loading/empty/error/success states, and destructive confirmations.
- Update dashboard, live monitoring, and reports using database-derived incident, response, occupancy, attendance, alert timing, allocation timing, and evacuation data.

## Technical details
- Keep the single protected operations route and select modules by the verified database role.
- Use additive database changes only; no destructive renames or duplicate semantic fields.
- Keep allocation inventory changes transactional and prohibit insufficient stock.
- Use the existing realtime subscription pattern for incidents, alerts, notifications, evacuations, teams, and shelters.
- Render map markers from stored coordinates with an in-app map surface and detail popups, avoiding external service dependencies.

## Verification
- Confirm migration and generated database types succeed.
- Verify the core workflow from incident creation through assignment, allocation, alert acknowledgement, evacuation, shelter update, resolution, feedback, and reports.
- Verify role visibility, validation, live refresh, desktop/mobile layouts, and a clean preview build.
