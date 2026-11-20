# Architecture

## 1. Overview

DUT Wolves Stats is a React single-page application built with Vite and TypeScript. The app is structured around a role-based interface, a domain model for sports data, and a repository abstraction that can serve either Firebase-backed production data or local mock data.

The architecture intentionally keeps the frontend product flexible while preserving a strong domain model for basketball operations.

## 2. High-level architecture

### Client application
The frontend is a browser-only React app. It renders route-based experiences for public pages and authenticated internal areas.

### Identity and access
Authentication is handled through Firebase Auth. User profiles are loaded from the app’s repository layer and mapped to a role-based permissions model.

### Data layer
Data access is abstracted behind `repositories`. The system chooses a concrete implementation based on runtime configuration:
- Firebase repositories for live application data
- mock repositories for local/demo development

### Storage and media
Firestore stores application records and legacy media metadata. Media publishing is archived; existing published assets remain readable. The public site links to the official Instagram profile but does not embed or import its feed. No active Cloudinary or Firebase Storage upload workflow is used.

## 3. Technical stack

### Frontend
- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS

### UI primitives
- Radix UI primitives for dialogs, selects, tabs, and dropdowns
- custom component wrappers built on top of them

### Data and auth
- Firebase Auth
- Firestore
- optional analytics integration

### Build tooling
- TypeScript compiler
- Vite build pipeline
- Oxlint for linting

## 4. Application structure

### Routing model
Routes are split into several areas:

Public routes
- `/`
- `/live`
- `/fixtures`
- `/results`
- `/teams`
- `/players`
- `/standings`

Role-based protected routes
- `/manager`
- `/coach`
- `/player`
- `/admin`

The `App` component composes the application using nested route groups and `RequireRole` guards. Media publishing and its role are archived.

### Auth and role enforcement
The app checks for a logged-in user and verifies role access before rendering protected sections. The `AuthContext` loads the current user and keeps the UI in sync with Firebase auth state.

### Team scope
`TeamScopeProvider` keeps the active team context for the current user, using local storage persistence so the user’s chosen team persists across sessions.

## 5. Domain model

The domain layer forms the core of the product. It includes the central business concepts:
- User
- Team
- TeamMembership
- Player
- Match
- MatchEvent
- Competition
- Season
- PlayerRegistration

This model is intentionally aligned with basketball operations and event-driven analytics.

## 6. Data flow

### Authentication flow
1. A user logs in through Firebase Auth.
2. The app loads that user’s profile by auth UID.
3. If the profile does not exist or is disabled, access is rejected.
4. Role-based routes are then rendered and authorisation is enforced.

### Team context flow
1. The authenticated user loads available team assignments.
2. The app filters team data according to user role and membership.
3. If the user has one DUT squad assignment, it is selected automatically; users assigned multiple DUT squads can switch between those squads.
4. The opponent is selected per DUT fixture and is never part of the DUT squad selector or team administration.
5. Every dashboard and stats view resolves against the selected DUT squad.

### Match and stats flow
1. Match data is stored with competition, season, and team references.
2. Match events are stored individually to allow score and stat reconstruction.
3. Managers record individual events for DUT players; opponent points are team-score events with no player identity or opponent roster.
4. Public pages list DUT squads and players only. Opponent team records remain available as fixture labels and scores against DUT.
5. Public pages consume only safe data views while internal views can access full records.

## 7. Repository abstraction

The repository layer is the key architectural decision that makes the app flexible.

### Single swap point
All data access goes through a central `repositories` object created in `src/services/repositories/index.ts`.

### Production and mock modes
- `firebase` mode: Firestore-backed repositories are used.
- `mock` mode: local mock repositories are used.

This setup allows:
- reliable end-to-end work in production
- local demos and offline interface testing
- separation of concerns without spreading Firebase logic across the app

## 8. Public/private data boundary

The app explicitly distinguishes between:
- internal data required for operations and administration
- public-safe data suitable for fans and public pages

For example, player data includes private fields such as student numbers and campus detail; public pages rely on a reduced public model. This boundary is codified in the domain types and repository logic.

Firestore stores private player records separately from `publicPlayers`. Full
match events are kept in `matchEvents`; `publicMatchEvents` is a whitelisted
projection that omits the recording user, voiding user, and internal correction
reason. Player and event source records are written atomically with their
allowlisted public projections. Event writes and corrections update both
collections atomically.
Injury reports remain in `reports`; `reportStatuses` contains only match, team,
submission status, and timestamp so match completion can be calculated without
reading another team's injury details.

## 9. UI architecture

### Component layering
The app uses layered UI organization:
- route pages for screens
- reusable business components for scoreboards, cards, charts, and list rows
- low-level design-system pieces such as button, table, dialog, and select

### Theme system
The app supports an intentional light/dark theme managed by a React context. The initial theme follows system preference; a saved preference takes precedence and is persisted in local storage.

### Toast and notification layer
A toast context provides user-friendly feedback for actions and validation errors.

## 10. Archived media publishing

The media-manager route, invitation role, public gallery and upload/publishing
workflow are retired. Existing media records remain legacy data; Firestore
rejects media writes. Team photographs used in the public design are static
assets bundled with the web app. Open Graph and Twitter/X previews use a
static 1200×630 social image; metadata URLs use the canonical Vercel host.
Existing media-manager Auth accounts should be disabled separately during
account cleanup; legacy profiles receive no workspace access.

## 11. USSA Wits 2026 draft schedule

The supplied 1–3 December pool schedule is stored as validated source data.
`npm run import:ussa-draft` performs a read-free dry run; passing `--apply`
requires an administrator login and creates missing teams, competition and
season metadata, and 48 private draft pool fixtures. Admins publish each
reviewed fixture individually. Classification and playoff fixtures remain
uncreated until their participants are determined.

## 12. Public live updates

Public match pages listen to published match and safe public-event collections
through Firestore snapshots. Player identifiers and staff-only event metadata
remain excluded from those snapshots.

## 13. Security architecture

### Frontend assumptions
The app does not treat client-side checks as security boundaries. It uses Firebase auth and role gating for user experience, but the real enforcement depends on Firebase rules and secure backend rules.

### Key security principles
- never leak private identifiers to public routes
- never rely on hidden UI to secure sensitive data
- keep environment variables for client config minimal and public-safe
- avoid embedding secret credentials in frontend bundles
- Firestore rules scope private player, registration, request, report, match,
  roster, and event access to the user's own record or assigned team/match
- public and player-facing score pages read only the safe event projection;
  managers/coaches use full event records only for matches involving their team
- report status summaries are readable to managers, but report contents remain
  limited to administrators and the manager of the reporting team

For an existing database, treat the projection backfill, frontend, and rules as
a coordinated maintenance-window cutover. Pause edits and close old app
sessions, run `npm run backfill:firestore-projections` while the current rules
still allow the administrator to create the projections, deploy the new
frontend, and immediately publish the matching rules before resuming use. This
avoids old clients writing only private source records after the stricter rules
take effect. The backfill requires `FIREBASE_ADMIN_EMAIL` and
`FIREBASE_ADMIN_PASSWORD` from the encrypted local env store or the local process
environment; do not commit credentials. Validate rule changes with `npm run test:firestore-rules` against
the Firebase Auth and Firestore emulators before deployment.

## 14. Configuration model

The app reads Firebase runtime configuration from Vite environment variables. Local
secrets are kept outside the repository in `%LOCALAPPDATA%\dut-wolves-stats\env`,
encrypted at rest with Windows DPAPI. `scripts/lib/secure-env.mjs` is the single
loader used by maintenance scripts; `scripts/env-secure.mjs` migrates, locks,
unlocks and verifies the encrypted file without printing values.

Important implementation detail:
- Firebase web config is client-safe to initialise the app
- secret or dangerous credentials must not be placed into Vite public variables
- `SEED_*` administrator/staff credentials are read only by local scripts and never enter the client bundle
- production deployments receive configuration from the host environment, not from a repository env file
- no credentials for the archived media upload workflow are required

## 15. Deployment shape

The project is structured as a static frontend application. It can be deployed to any platform that supports Vite builds and static hosting, while Firebase provides the data/auth backend.

Typical deployment pattern:
- frontend hosted on a static host
- Firebase Auth and Firestore used for identity and data persistence
- previously published media is served as read-only public content
- HTTPS hosting required for service worker and install support

## 16. PWA and offline boundary

The PWA manifest describes the app name, standalone display mode, theme, and install icons. Production builds register a small service worker that caches the static app shell, hashed JS/CSS/font/image resources, the supplied public team images, and an offline fallback page.

The service worker does not cache API responses, Firestore data, authentication state, or private player/report records. Courtside events are persisted to a per-match local queue before the network write and retried when connectivity returns; the queue is idempotent by `clientEventId`. Opening a match, loading rosters, submitting reports and all administrative actions still require a network connection.

## 17. Scalability and maintenance

This architecture is easy to evolve because of the clear separation between:
- routes
- domain types
- services/repositories
- UI components
- configuration

As the product grows, new features can be added without breaking the repository abstraction or domain model. The design is intentionally modular enough for future expansion into richer analytics, reporting, and automation.

## 18. Summary

DUT Wolves Stats follows a layered frontend architecture built around role-based navigation, a strong sports-domain model, and a repository abstraction that supports both live Firebase usage and offline mock data. This makes the app simple to reason about while providing a solid foundation for growth as the sports programme evolves.
