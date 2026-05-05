# Threat Model

## Project Overview

GeoTrack224 Intelligence is a French-language real-time geolocation platform for tracking vehicles, assets, people, and drones in Guinea. The production application consists of a React/Vite frontend, an Express 5 API, a PostgreSQL database accessed through Drizzle ORM, a WebSocket channel for live events, and shell scripts that synchronize the repository to GitHub using a personal access token stored in Replit Secrets.

The main production security concern is that the platform exposes sensitive operational data and administrative controls: live and historical coordinates, alert history, device inventory, group/user assignment metadata, and secrets used for source-code synchronization.

## Assets

- **Live and historical location data** -- precise device coordinates, timestamps, speed, and headings. Exposure reveals movement patterns and operational intelligence.
- **Operational inventory and alerts** -- device names, IMEI values, status, group membership, alert severity, and acknowledgement state. Exposure enables monitoring of fleet activity and abuse of operational workflows.
- **User directory and authorization metadata** -- user names, emails, roles, and group assignments. Exposure leaks personal data and role structure; tampering can create privilege escalation paths.
- **Administrative integrity** -- device CRUD, group CRUD, user CRUD, device assignment, alert acknowledgement, and position ingestion endpoints must only accept authorized actions.
- **Application secrets** -- `DATABASE_URL`, `SESSION_SECRET`, `GITHUB_TOKEN`, and optional webhook URLs. Compromise affects database integrity or source-control access.

## Trust Boundaries

- **Browser / API boundary** -- all frontend requests cross from an untrusted client into the Express API. Every sensitive route must authenticate the caller and enforce server-side authorization.
- **Browser / WebSocket boundary** -- `/ws` delivers live events to connected clients. The handshake and subscription model must prevent unauthorized observers from receiving telemetry.
- **API / Database boundary** -- the API has broad database access. Injection or missing authorization at the API layer can expose or corrupt the full operational dataset.
- **API / External service boundary** -- the GitHub sync scripts call GitHub and optional webhook URLs with secret material. Outbound requests must not expose secrets or accept attacker-controlled destinations without validation.
- **Public / Authenticated / Admin boundary** -- health checks may be public, but operational dashboards, telemetry, user management, group management, and mutation endpoints require authenticated and role-appropriate access.
- **Internal development / Production boundary** -- `artifacts/mockup-sandbox` is assumed dev-only and should be ignored unless a production code path reaches it. Production analysis focuses on `artifacts/api-server`, `artifacts/geotrack`, `lib/db`, generated API contracts, and production-used scripts.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/api-server/src/lib/websocket.ts`.
- Highest-risk areas: route handlers for devices/users/groups/positions/alerts/stats, WebSocket handshake/broadcast logic, and GitHub sync scripts under `scripts/`.
- Public surface that may remain public: `/api/healthz` only.
- Sensitive authenticated/admin surfaces: all other `/api/*` business routes and `/ws`.
- Dev-only area to usually skip: `artifacts/mockup-sandbox/`.

## Threat Categories

### Spoofing

The system must prevent unauthenticated parties from acting as legitimate operators, telemetry sources, or administrators. All business API routes and the WebSocket channel must require a valid server-verified identity. Position ingestion must not trust arbitrary callers to submit coordinates for any device.

### Tampering

Attackers must not be able to create, modify, delete, or reassign devices, groups, users, alerts, or position records without explicit authorization. Server-side validation already exists for many request shapes, but validation alone is insufficient; business mutations must be authorized and tied to the acting principal.

### Information Disclosure

The platform stores highly sensitive location intelligence and user metadata. API responses, live WebSocket broadcasts, and logs must not disclose device positions, IMEI values, user emails, alert history, or internal structure to unauthorized parties. Error handling should stay generic, and secrets must never appear in responses or logs.

### Denial of Service

Publicly reachable endpoints that accept JSON bodies, live polling, or telemetry ingestion can be abused for storage growth or service degradation. The production system should bound request sizes, authenticate costly operations, and avoid exposing write-heavy or broadcast-triggering endpoints to the public internet.

### Elevation of Privilege

The application includes administrator-style capabilities such as user CRUD, role changes, group management, device assignment, and acknowledgement of operational alerts. These functions must be protected by server-side authorization checks. Any missing access control effectively grants anonymous users operator or admin privileges over the tracked fleet.
