# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## GitHub Sync

Code is automatically synced to GitHub (`gaouchio92-droid/geotrack224-intelligence`) on every commit.

**How it works:**
- `scripts/github-sync-watcher.sh` runs as the "GitHub Sync Watcher" Replit workflow. It polls every 30 s, auto-commits any uncommitted working-tree changes, and pushes new commits to GitHub.
- `scripts/post-merge.sh` also calls `scripts/sync-to-github.sh` immediately after each task merge.
- `.github/workflows/ci-after-sync.yml` is a GitHub Actions CI workflow that runs typecheck on every push to `main` (confirms the sync landed correctly).

**Required setup:**
- `GITHUB_TOKEN` **Replit Secret** — a GitHub personal access token with `repo` scope. Must be stored as a **Secret** (not a plain environment variable) in Replit's Secrets panel for security. The sync scripts validate the token against the GitHub API before every push and will exit with a clear error if the token is missing, invalid, or expired.
- A `github` git remote pointing to the target repository: `git remote add github https://github.com/gaouchio92-droid/geotrack224-intelligence.git`
- "GitHub Sync Watcher" Replit workflow must be running for continuous sync.

**Token health:**
- Both `sync-to-github.sh` and `github-sync-watcher.sh` call the GitHub API to confirm the token is valid before any push.
- A `WARNING` is logged when the token expires within 7 days so you have time to rotate it.
- An `ERROR` is logged (and the sync is aborted) if the token is invalid or already expired.
