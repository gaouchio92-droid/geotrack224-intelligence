# GeoTrack224 Intelligence

Plateforme professionnelle de géolocalisation et de suivi d'actifs en temps réel pour la Guinée (Afrique de l'Ouest), entièrement en français.

## Run & Operate

- `pnpm run typecheck` — vérification TypeScript complète (tous les packages)
- `pnpm run build` — typecheck + build de tous les packages
- `pnpm --filter @workspace/api-spec run codegen` — regénère les hooks React Query et schemas Zod depuis l'OpenAPI spec
- `pnpm --filter @workspace/db run push` — applique les changements de schéma DB (dev seulement)

**Env vars requises :** `PORT` (géré par les workflows Replit), `DATABASE_URL` (PostgreSQL Replit), `SESSION_SECRET`, `GITHUB_TOKEN` (secret Replit, scope `repo`)

## Stack

- **Monorepo** : pnpm workspaces
- **Runtime** : Node.js 24
- **API** : Express 5 + pino logger (jamais `console.log` dans le serveur)
- **DB** : PostgreSQL + Drizzle ORM
- **Validation** : Zod (zod/v4) + drizzle-zod, Orval (codegen depuis OpenAPI)
- **Frontend** : React + Vite, react-leaflet/OpenStreetMap, TanStack Query v5, shadcn/ui, date-fns `fr`
- **Temps réel** : WebSocket (ws), simulateur GPS 3s (10 appareils en Guinée)
- **Build** : esbuild (bundle CJS)

## Where things live

```
artifacts/
  api-server/src/        — Express routes, simulateur, websocket
    routes/              — devices.ts, positions.ts, alerts.ts, stats.ts
    lib/                 — simulator.ts, websocket.ts, logger.ts
  geotrack/src/          — Frontend React
    pages/               — dashboard.tsx, devices.tsx, alerts.tsx, history.tsx
    components/layout/   — AppLayout.tsx (sidebar + indicateur WebSocket), GeoTrackLogo.tsx
    components/map/      — LiveMap.tsx (Leaflet)
    hooks/               — use-websocket.ts
lib/
  api-spec/              — OpenAPI spec (source de vérité des contrats)
  api-client-react/      — Hooks React Query générés par Orval
  api-zod/               — Schémas Zod générés par Orval
  db/                    — Schéma Drizzle + connexion PostgreSQL
scripts/
  sync-to-github.sh      — Push vers GitHub (fetch+merge si non-fast-forward)
  github-sync-watcher.sh — Démon polling 30s, validation token, sync auto
  post-merge.sh          — Appelé après chaque merge de tâche
```

## Architecture decisions

- **Contract-first** : OpenAPI spec → Orval génère hooks et schemas → serveur valide avec Zod
- **Simulateur en mémoire** : 10 appareils simulés avec tick 3s, positions en Guinée (9–11.5°N, -14.5–-10.5°E)
- **WebSocket broadcast** : `position_update`, `alert`, `device_status_change` — clients invalident React Query
- **`DISTINCT ON` PostgreSQL** : `/positions/live` utilise une seule requête SQL au lieu de N+1
- **Sync GitHub robuste** : push normal d'abord, fallback fetch+merge (`--strategy-option=ours`) si non-fast-forward

## Product

- Tableau de bord temps réel : carte Leaflet sombre + liste filtrée des cibles + stats
- Gestion complète CRUD des appareils (véhicule/actif/personnel/drone)
- Journal des alertes (excès vitesse, géofence, hors-ligne) avec acquittement
- Historique des positions par appareil (timeline chronologique)
- Indicateur de connexion WebSocket dans la sidebar (Live / Reconnexion)
- Sync automatique vers GitHub toutes les 30s avec validation du token

## User preferences

- Interface 100% en français (labels, messages, dates via date-fns `fr`)
- Messages d'activité et d'alerte en français côté serveur
- Logo SVG couleurs drapeau guinéen (rouge/jaune/vert)
- Style dark professionnel, police mono pour les données techniques

## Gotchas

- Ne jamais utiliser `console.log` côté serveur : utiliser `req.log` dans les routes, `logger` ailleurs
- La branche `main` sur GitHub est protégée (no force push) — le script gère le merge auto
- Les filtres sur `devicesTable` doivent passer par SQL (`and(...conditions)`) pas en JS
- Orval `UseQueryOptions` en TanQuery v5 requiert `queryKey` dans les options passées — ne pas passer `{ query: { enabled } }` directement ; gérer la condition avant l'appel du hook
- Les workflows peuvent planter sur "port already in use" après un redémarrage système — redémarrer manuellement

## Pointers

- `.local/skills/pnpm-workspace/` — structure monorepo, TypeScript, codegen
- `.local/skills/pnpm-workspace/references/server.md` — logging, routes Express
- `.local/skills/pnpm-workspace/references/db.md` — schéma Drizzle, migrations
