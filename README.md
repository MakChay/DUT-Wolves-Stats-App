# DUT Wolves Stats

DUT Wolves Stats is a role-based basketball operations and public fan portal for the Durban University of Technology Wolves. It combines internal team workflows with a public-facing site for live scores, fixtures, standings, and player statistics. Official team social posts are published on Instagram; a gallery/media studio is not in the active app scope. Digital experience by QM Web Designs.

## Product purpose

The platform helps the team manage:
- user access and role-based dashboards
- team and roster management
- match tracking and event capture
- competitions and season status
- player statistics and profile visibility

## Key capabilities

- Public pages for home, live scores, fixtures, results, standings, teams, and players
- Manager dashboard for operational workflows
- Coach dashboard with analytics and change requests
- Player dashboard for personal stats and history
- Admin management for teams, users, competitions, and matches
- Courtside scoring records individual stats only for DUT Wolves players and team-level scores for opponents; opponents are fixture references, not squads managed by the app
- Team photos used in the public design are bundled static assets; new media publishing is archived
- Public pages link to the official Instagram profile, [@dut_wolves](https://www.instagram.com/dut_wolves/)
- Open Graph and Twitter/X metadata use a branded 1200×630 share image at `public/social-card.jpg`
- Firebase-backed data layer with optional mock mode for offline demos
- Installable PWA app shell with cached static resources and an offline fallback
- Wolf-branded startup and workspace loading screens
- Public match scores and status stream live from Firestore

The PWA does **not** cache Firebase records or support offline scoring. Real match operations require a network connection.

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Firebase Auth and Firestore
- No Cloudinary upload or Instagram feed integration
- Radix UI primitives
- React Router

## Repository structure

- `src/App.tsx` — route map and protected app layout
- `src/features/auth` — auth flows and access control
- `src/features/manager` — manager dashboard and management screens
- `src/features/coach` — coach tools and analytics
- `src/features/player` — player pages
- `src/features/admin` — administrative configuration screens
- `src/features/public` — public-facing website pages
- `src/services` — Firebase, repositories, and app configuration
- `src/types/domain.ts` — core domain model
- `public/manifest.webmanifest` and `public/sw.js` — PWA installation metadata and static-shell caching

## Documentation

- [prd.md](./prd.md) — product requirements and scope
- [design_system.md](./design_system.md) — visual language and design system guidance
- [architecture.md](./architecture.md) — system architecture and technical structure

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Firestore access controls

- Run `npm run test:firestore-rules` to start the Firebase Auth/Firestore emulators and verify the rules. The Firebase CLI must be available.
- For an existing Firebase project, coordinate the projection backfill, frontend, and rules as one maintenance-window cutover. Pause match/report/player edits and close old app sessions; run `npm run backfill:firestore-projections` while the current rules still allow the administrator to write projections; deploy the new frontend, then immediately publish the matching Firestore rules before resuming use. This order avoids old clients writing only the private collections after the rules become strict. The backfill requires an administrator account supplied through `FIREBASE_ADMIN_EMAIL` and `FIREBASE_ADMIN_PASSWORD` in the local process environment; never commit these credentials.
- The backfill creates sanitized public event records and non-sensitive report-status records. It does not change player or report contents.
- Publishing new media is disabled. Existing media-manager profiles are legacy-only and should be disabled in Firebase Auth during account cleanup.

## USSA Wits 2026 draft fixtures

- `npm run import:ussa-draft` validates the supplied pool-stage schedule and prints a dry-run summary without connecting to Firebase.
- To create the draft season, competition, participating team records, and 48 pool fixtures in the configured Firebase project, provide local Firebase admin credentials and explicitly run `node scripts/import-ussa-wits-2026-draft.mjs --apply`.
- Imported fixtures are private drafts; administrators can review and publish them individually from Admin → Matches. Re-running the importer skips existing fixture IDs.
- The Friday classification/playoff and Saturday finals fixtures are not imported because participant identities depend on pool results and the supplied extraction does not name them.

## PWA deployment notes

- Serve the production build over HTTPS (localhost is also supported for development).
- Ensure the host serves `manifest.webmanifest`, `sw.js`, and the app routes from the site root.
- The service worker caches only static application resources and supplied public imagery; it does not cache authentication or Firestore data.
- Verify installation and offline fallback on the target mobile browsers before launch.

## Notes

This application is intentionally built around DUT Wolves basketball operations. Opponents exist to define fixtures and record team scores/results against DUT; the app does not manage their rosters, players, or player statistics. When Firebase is configured and `VITE_DATA_MODE` is not set to `mock`, it uses Firestore repositories; otherwise, it uses mock data. A configured Firebase mode is not, by itself, proof that production permissions, data, or match-day procedures have been validated.
