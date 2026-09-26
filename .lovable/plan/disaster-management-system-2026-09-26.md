# Disaster Management System

## Goal
Build a polished, responsive operations application for admins, trainers, and volunteers, backed by Lovable Cloud authentication, Postgres data, secure role permissions, live alerts, and realistic demo records.

## What will be built
- Public sign-in page with email/password, role selection, validation, and quick demo-account shortcuts.
- Protected, role-aware application shell with desktop sidebar, mobile drawer, search, notifications, profile details, and safe sign-out.
- Distinct admin, trainer, and volunteer dashboards with database-derived metrics and role-specific actions.
- User management for admins, including filters, create/edit/view flows, and confirmed deletion.
- Training list, create/edit/delete flows, detail view, participants, activity checklist, and progress updates.
- Resource inventory and allocation workflows with availability checks, before/after totals, history, and automatic low-stock alerts.
- Live monitoring and alerts views using database realtime updates and immediate toast notifications.
- Feedback submission/history and reports with charts, CSV export, and printable report generation.
- Consistent loading, empty, error, success, validation, and confirmation states throughout.

## Data and security
- Enable Lovable Cloud and email/password authentication.
- Store user profile data because roles, names, and status are required.
- Create separate profile and role tables; roles are never trusted from the browser.
- Add trainings, participants, resources, allocations, alerts, feedback, and activity records with row-level access rules by role.
- Perform resource allocation atomically in the database, reject over-allocation, and create low-stock alerts automatically.
- Seed the three demo accounts plus realistic training, inventory, allocation, alert, activity, participant, and feedback records. Use a documented shared demo password because none was supplied.

## Technical details
- Use TanStack Start pages and server functions with generated Lovable Cloud clients.
- Keep public sign-in separate from protected pages and enforce authorization both on pages and data operations.
- Use Postgres realtime subscriptions instead of Socket.IO, matching the requested live behavior within Lovable Cloud.
- Use semantic design tokens, reusable controls, Recharts, and responsive tables/cards.
- Add route-specific page metadata and verify the key journey on desktop and mobile.

## Verification
- Verify authentication and all three role redirects.
- Verify role restrictions, CRUD operations, allocation inventory math, auto-alert creation, realtime updates, feedback, CSV export, and report rendering.
- Confirm successful app compilation and inspect the main workflows in the live preview.
