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

## Domain Hunter Intelligence (`artifacts/domain-hunter` + `artifacts/api-server`)

Deep-tech domain investment dashboard. Generates brandable .com candidates across AI, Quantum, Biotech, Green-Energy and Space-Tech using Groq Llama-3 for trend keywords, scores them on length / TLD / trend / phonetic / memorability / radio-test, checks availability via GoDaddy (with built-in heuristic fallback when the key is unauthorized), and lets the user shortlist picks.

**Routes (frontend, `/`-mounted Vite app):** `/` Hunter dashboard, `/trends` AI trend lab, `/saved` Shortlist, `/stats` Analytics.

**API endpoints (Express, mounted at `/api`):**
- `GET /healthz`
- `POST /trends` — Groq-generated keywords + suggested prefixes/suffixes per category (curated fallback if Groq fails)
- `POST /hunt` — generate + score + (optionally) availability-check N candidates for a {category, strategy}
- `GET /domains/:name/{availability,social,trademark,details}` — per-domain inspector data (GoDaddy → heuristic fallback, social HEAD probes, curated brand-collision check)
- `GET|POST /saved`, `DELETE /saved/:id`
- `GET /stats` — totals + by-category and by-strategy breakdowns + top picks

**Strategies:** `brandable_cvcv`, `future_suffix`, `dictionary_hack`, `transliteration`, `four_letter`.

**DB tables:** `saved_domains`, `hunted_cache` (in `lib/db/src/schema/savedDomains.ts`).

**Required secrets:** `GROQ_API_KEY` (for live trends; falls back to curated set if missing), `GODADDY_API_KEY` in `KEY:SECRET` form (for live availability/pricing; falls back to a deterministic heuristic if missing or unauthorized).
