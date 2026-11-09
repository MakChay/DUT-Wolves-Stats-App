# Product Requirements Document

## 1. Product overview

DUT Wolves Stats is a sports management platform for a university basketball programme. It supports public fan engagement, internal team operations, and coach/player administration through a single web application.

The product is designed for the DUT Wolves programme and covers the full lifecycle of a basketball season:
- match scheduling and score tracking
- competition management
- player rosters and availability
- performance analytics
- media publishing and galleries
- public-facing standings and results

## 2. Product goals

### Business goals
- Give the DUT Wolves programme a modern digital home for team operations.
- Improve visibility for supporters, students, and sponsors.
- Standardise match and player data across internal and public channels.
- Reduce operational overhead for team managers, coaches, and media staff.

### User goals
- Managers need a clear operational dashboard for fixtures, rosters, requests, and reports.
- Coaches need to review team performance and manage player data without relying on manual workflows.
- Players need access to personal stats, team context, and profile information.
- Admins need to keep system users, teams, and competition data accurate.
- Public users want quick access to live results, standings, fixtures, and team information.

## 3. Target audience

### Internal roles
1. Team manager
   - Approves line-ups, competitions, and operational workflows.
2. Coach
   - Reviews analytics, manages requests, and tracks player performance.
3. Player
   - Views personal stats, match history, and team context.
4. Admin
   - Maintains teams, users, competitions, and match records.
5. Media manager
   - Uploads media, manages galleries, and prepares publishing workflows.

### External audience
- Fans and supporters
- Prospective students
- University community members
- Media and sponsors

## 4. Problem statement

The programme currently needs a consistent source of truth for team data, match records, player stats, and public content. Without a central platform, the team risks inconsistent records, limited transparency, and inefficient communication between internal stakeholders and external audiences.

## 5. Core user journeys

### 5.1 Public fan journey
- User opens the homepage.
- User switches between men’s and women’s teams.
- User examines live scores, upcoming fixtures, recent results, and standings.
- User selects a player or team to view profile and stat details.

### 5.2 Manager workflow
- User logs in as manager.
- User views the overview dashboard with team context.
- User reviews matches, rosters, competitions, and reports.
- User manages team settings and change requests.

### 5.3 Coach workflow
- User logs in as coach.
- User checks match schedule and team analytics.
- User inspects player performance and reports.
- User submits or reviews player-related change requests.

### 5.4 Player workflow
- User logs in as player.
- User reviews personal dashboard and stats.
- User views team information and match history.
- User updates their own profile information.

### 5.5 Admin workflow
- User logs in as admin.
- User configures teams and users.
- User maintains competitions and match data.
- User ensures a stable and accurate system configuration.

## 6. Functional requirements

### 6.1 Authentication and access control
- Users must sign in with Firebase authentication.
- The app must enforce role-based access.
- Users with a forced password reset must complete a password change before continuing.
- Disabled or missing profiles must be blocked from access.

### 6.2 Team and user management
- Admins must manage teams and user relationships.
- A user can belong to one or more team contexts.
- Team selection must persist for the current user.

### 6.3 Player management
- Players must have profile information including team, jersey number, position, bio, and availability status.
- Private player details must remain restricted from public views.
- Public-safe player data must be used for public pages.

### 6.4 Match and event tracking
- Matches must support scheduled, live, paused, completed, and postponed states.
- Match events must capture basketball actions such as shots, turnovers, assists, rebounds, fouls, and substitutions.
- Managers must be able to record both DUT and opponent player events; opponent jersey entries belong only to that match and must not alter DUT player or season records.
- Match records must support history and corrections without deleting earlier records.

### 6.5 Public content
- The public site must show live scores, fixtures, results, standings, team pages, and player pages.
- Public pages must use gender-specific team views.
- Public pages link to the official DUT Wolves Instagram account, @dut_wolves.
- The app does not include a public gallery, media studio, or Instagram post feed; app photography is limited to bundled static assets and existing player portrait URLs.

### 6.6 Analytics and reporting
- Coaches and managers must access statistical summaries.
- Players must view personal and team-related performance context.
- Reports must be structured for operational use rather than just raw data dumps.

### 6.7 Media management
- Media-manager accounts and gallery/upload/publishing workflows are archived.
- New social content is published through the official Instagram account, not through this app.

### 6.8 Installable application
- Public users should be able to install the application where supported by their browser.
- The app shell must provide an offline fallback when a network is unavailable.
- Offline mode must not imply that live scores or private records are available or writable.

## 7. Non-functional requirements
- A clean, mobile-responsive design must work across desktop and tablet experiences.
- The app should use a fast single-page interface with clear navigation.
- The system should prefer Firebase-backed real data when configured and allow mock data for offline development or demos.
- Data handling must clearly separate public-safe data from internal private records.
- Security must rely on Firebase rules and role checks rather than client-only hiding.
- The service worker must not cache authentication state, Firestore data, match events, or private player/report records.

## 8. Success metrics
- Users can complete core workflows without training.
- Internal roles can access correct dashboards within a few clicks.
- Public pages load and display live content reliably.
- Team managers and coaches can manage match/player data without manual spreadsheets.
- Standings and official schedule information remain up-to-date across the season.

## 9. Constraints and assumptions
- The product is built around basketball team operations in a university environment.
- The product supports both men’s and women’s squads.
- The app is front-end focused but intends to connect to Firebase services as the primary backend.
- Some data is intentionally mock-backed for local development and demonstration.

## 10. Future roadmap
- Add richer analytics and trend charts across match windows.
- Expand reporting exports and PDF generation.
- Support direct live match entry from tablet devices at courtside.
- Consider a supported social feed integration only if access, permissions, and a clear product need are established.
- Extend admin capabilities with audit logs and activity history.

## 11. Acceptance criteria
- A user can log in only if they have a valid profile.
- Roles see only their permitted sections.
- Managers and coaches can navigate to schedule, roster, and analytics views.
- Public pages render team and player data without exposing private identifiers.
- Match events can populate score and statistical summaries correctly.
- Public pages provide a working link to the official DUT Wolves Instagram account and do not expose a gallery route.

## 12. Summary

DUT Wolves Stats is a role-based sports platform that combines public fan engagement with internal operations for a basketball programme. It is built for accurate data capture, flexible team workflows, and clear visibility into performance and schedule information.
