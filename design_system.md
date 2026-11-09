# Design System

## 1. Purpose

The design system for DUT Wolves Stats supports a premium sports product that balances operational clarity with public-facing visual appeal. It is built to feel confident, modern, and data-rich while remaining accessible and simple to navigate.

## 2. Design principles

### 2.1 Clarity first
Every interface should make state and actions obvious. Users should understand their role, current team scope, and whether they are viewing live or mock data.

### 2.2 Confidence and performance
Use strong typography, clear contrast, and compact components so users can work quickly with match and stat-heavy content.

### 2.3 Role-aware information hierarchy
Internal workflows must be structured around action-oriented surfaces, while public-facing pages prioritise narrative, scores, and team information.

### 2.4 Trust and data integrity
This product presents operational records and real data. All visual design choices should support readability and reduce ambiguity in stats and match events.

## 3. Visual language

### 3.1 Brand direction
The visual direction is based on the supplied DUT logo and team uniform photographs, with the Dribbble reference used for broad sports-editorial inspiration rather than copied layouts or artwork.
The supplied transparent DUT Wolves artwork is the app's primary mark and is reused
in the shared brand component and installable PWA icons. Keep the artwork intact;
do not recolour, crop, or substitute a generic wolf illustration.

Core traits:
- disciplined
- modern
- high-contrast
- performance-driven
- credible for university sport operations

### 3.2 Colour system
The palette uses the supplied monochrome DUT identity and black/white uniforms as its base. Small cyan, magenta, violet, and lime accents echo the geometric uniform trim. These are visual approximations from supplied images, not official brand-standard HEX specifications.

| Token | HEX | Use |
|---|---|---|
| Near-black | `#0B0D10` | Dark canvas and dramatic sports surfaces |
| Charcoal | `#171A1F` | Raised dark surfaces |
| White | `#F5F6F7` | Text and light canvas |
| Muted silver | `#A9AFB7` | Secondary labels on dark surfaces |
| Cyan | `#31C5D8` | Primary action accent and live focus |
| Magenta | `#E74192` | Small uniform-inspired decorative accent |
| Violet | `#8068D8` | Small uniform-inspired decorative accent |
| Lime | `#A8CE3A` | Small uniform-inspired decorative accent |

Use the neutral base for most of the interface. Keep the four jersey accents to thin motifs and small highlights rather than colouring whole sections. Light and dark themes are intentionally designed separately; the initial theme follows the device preference unless the user has saved a choice.

Glass effects are for the public hero and lightweight navigation surfaces only. Match entry, injury reporting, tables, and other data-critical workflows should remain opaque and high-contrast.

### 3.3 Typography
The implementation uses the Inter type family via `@fontsource-variable/inter`.

Typographic structure:
- headings: bold, high-contrast, tight tracking for dashboard clarity
- labels: uppercase caps for small metadata
- body text: compact, readable, suitable for stat cards and dashboards
- numeric values: emphasis for scores, counts, and performance figures

## 4. Layout system

### 4.1 Shell structure
The interface uses a sidebar + header layout for authenticated roles.
- sidebar: navigation and team scope selector
- header: role label, active team, data badge, theme toggle, account menu
- content area: modules, cards, tables, and lists

### 4.2 Public layout
Public pages use a photo-led, editorial sports layout. The homepage uses approved team photographs, a gender/team switch, live or upcoming match content, and clear paths into results and team pages.

### 4.3 Responsive behaviour
The design supports:
- desktop dashboard workflows
- tablet-friendly browsing
- mobile exploration of fixtures, standings, and public data

## 5. Components

The component library is built around reusable design primitives rather than bespoke screen-level patterns.

### 5.1 Buttons
Usage rules:
- primary action: highest emphasis
- secondary action: lower emphasis but still clear
- ghost: tertiary or utility action
- all buttons should support clear icon + text combinations when needed

### 5.2 Cards
Cards are used for grouped summaries, timeline entries, stat highlights, and status blocks. They should be compact but readable, with strong hierarchy between title, metadata, and value.

### 5.3 Badges and pills
Badges provide compact state and label cues for:
- live status
- active/inactive players
- gender or team groupings
- data mode states like mock/live

### 5.4 Tables
Tables are preferred for roster, standings, and historical performance data. They should include clear labels and align values for readability.

### 5.5 Selectors and filters
The app uses scoped selectors and small filter controls to keep users in context while switching team or view.

## 6. UX patterns

### 6.1 Team scope pattern
This is a key product pattern: internal users are always aware of the active team scope. The selector sits in the sidebar and informs the current context across modules.

### 6.2 Live status pattern
Live match states use motion and strong contrast to signal current activity. The app clearly distinguishes live match indicators from normal fixtures and results.

### 6.3 Data mode communication
The app makes the data source visible to the user: whether the app is using live Firestore data or mock data. This lowers ambiguity in development, demos, and onboarding.

### 6.4 Password onboarding
For invited users, the app handles account activation cleanly through a focused prompt rather than allowing access before setup is complete.

### 6.5 Installable web app
The public app shell can be installed where the browser supports PWA installation. The service worker caches static application resources and an offline fallback only; live data, authentication, and private player or injury records are not cached, and offline score entry is not supported.

### 6.6 Loading experience
Show a lightweight, branded first-paint screen while the application bundle starts, then dismiss it as soon as React mounts. Use the supplied wolf mark as a subdued watermark behind the mark and status indicator. Authenticated routes reuse the same visual language while Firebase resolves the user's session. Respect reduced-motion preferences and keep the loading state informational rather than implying offline support.

## 7. Accessibility guidance
- Maintain sufficient color contrast for labels, badges, and navigation text.
- Use semantic HTML for navigation, headings, and actions.
- Ensure interactive elements have visible focus states.
- Keep text readable, particularly in dense dashboards and tables.
- Use icons only to support meaning, not to replace labels for core actions.

## 8. Design tokens and implementation notes

The design system is implemented via custom utility classes and reusable UI primitives:
- `Button`
- `Card`
- `Badge`
- `Dialog`
- `Select`
- `Table`
- `Tabs`
- `Input`

These components share a consistent spacing, radius, border, and colour treatment. The app uses utility classes and a reusable `cn` helper to compose clean UI states.

## 9. Components to preserve

When extending the system, designers and developers should preserve these patterns:
- dark canvas with layered surfaces
- strong left navigation for role-based internal apps
- compact status badges for sport metadata
- score-first visuals for live scores and fixtures
- respectful separation between public and private content
- deterministic team context in all role screens

## 10. Summary

The design system for DUT Wolves Stats aims to make operational sports data feel clear, premium, and accessible. Its neutral base and restrained uniform-inspired accents support a photo-led public presence while preserving clarity in role-based workspaces.
