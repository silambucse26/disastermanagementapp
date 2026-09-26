# DMS Sentinel

Build a complete modern web application called “Disaster Management System” with the subtitle “Real-Time Training Monitoring & Resource Management.” Use a Supabase / Lovable Cloud Postgres database for data persistence and authentication.

This is a functional full-stack web application, not just a static UI. The design should look like a professional emergency/disaster-management dashboard suitable for a college project, research demonstration, and journal paper.

1. DESIGN DIRECTION
Create a clean, modern, professional emergency-management SaaS dashboard.
Visual style:
- Modern enterprise dashboard
- Professional and trustworthy
- Clean white/light-gray backgrounds
- Dark navy/charcoal sidebar
- Use red/orange only for emergency and alert states
- Green for successful/available states
- Yellow/amber for warnings
- Blue for informational elements
- Rounded cards, subtle shadows, clear typography, spacious layout
- Responsive on desktop, tablet, and mobile
- Avoid excessive gradients or flashy animations; prioritize readability and usability
- Use a consistent design system across every page

2. APPLICATION ROLES
There are three roles:
1. Admin (full access)
2. Trainer (trainings, participants, resources, allocations, alerts, feedback)
3. Volunteer (assigned trainings, assigned resources, alerts, feedback submission)
The login page allows selecting a role or logging in with pre-seeded credentials.
After login, navigation and permissions adjust based on the user's role.

3. LOGIN PAGE
Polished centered login page with disaster-management branding:
- Email, Password, Role selector, Login button
- Validation: required fields, error messages, loading state, redirect
- Quick demo login buttons for Admin, Trainer, and Volunteer

4. GLOBAL APPLICATION LAYOUT
- Left sidebar with DMS logo, role-based navigation, settings, logout
- Top header with search, notifications bell with unread badge, user profile and role badge
- Responsive drawer on tablet/mobile

5. ADMIN DASHBOARD
- Overview statistics: Total Users, Total Trainings, Active Trainings, Resources, Allocations, Active Alerts, Active Volunteers
- Training progress cards with clean horizontal progress bars (Flood Training 90%, Fire Safety 70%, Earthquake Drill 50%)
- Recent activity timeline with timestamps
- Active alerts section with severity badges (High, Medium, Info) and quick actions

6. USER MANAGEMENT (Admin only)
- User list table: Name, Email, Role, Status, Joined Date, Actions (View, Edit, Delete with confirmation)
- Add User modal and filters by Role and Status

7. TRAINING MANAGEMENT
- Training table: Name, Disaster Type, Location, Date, Trainer, Participants, Progress, Status, Actions
- Create Training modal and search/filters
- Training Details view with training activities checklist, resources used, participants list, and progress updater

8. RESOURCE MANAGEMENT & INVENTORY
- Statistics: Total Resources, Available, Allocated, Low Stock
- Resources table: Name, Category, Total, Available, Allocated, Status badge (Available = green, Limited = amber, Out of Stock = red)
- Add Resource form with minimum stock threshold

9. RESOURCE ALLOCATION
- Allocation form: Select Training, Select Resource, Enter Quantity, Select Volunteer, Allocate button
- Validation rule: prevent allocating more than available quantity; show error if insufficient
- Display before/after quantity breakdown
- Allocation history log table

10. REAL-TIME MONITORING
- Research/demo centerpiece: Live overview of active trainings, live activity stream with blinking green LIVE indicator, visual progress bars, and real-time alert updates

11. ALERTS & NOTIFICATIONS
- Severity filters: All, High, Medium, Info
- High alert card with automated trigger when resource stock falls below minimum threshold
- Generate Alert modal/form (Title, Message, Severity, Training, Recipients)
- Real-time toast notifications for new alerts

12. FEEDBACK
- Rating (1-5 stars), training selection, comments input
- Submission history log viewable by Admins and Trainers

13. REPORTS & ANALYTICS
- Visual charts: Training Status breakdown, Resource Usage distribution, Training Progress comparisons, Alerts by Severity
- Export CSV and Generate Report actions

14. TRAINER & VOLUNTEER DASHBOARDS
- Trainer Dashboard: My Trainings, Participants count, Allocated Resources, Active Alerts, quick actions
- Volunteer Dashboard: My Assigned Trainings, My Assigned Resources, Emergency Alerts, Feedback shortcut

15. DATABASE & DEMO SEED DATA
- Set up Supabase tables: users, trainings, resources, allocations, alerts, feedback
- Seed with realistic initial data:
  - Admin: admin@test.com
  - Trainer: trainer@test.com
  - Volunteer: volunteer@test.com
  - Seed trainings (Flood, Fire Safety, Earthquake Drill), resources (First Aid Kits, Helmets, Radios, Water Bottles), allocations, and alerts.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://disastermanagementapp.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ae7fb3f2-b369-4d1e-bc8b-6eca9dcbde03).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
