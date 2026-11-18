# TrackSense Architecture

## Overview

TrackSense is a GPS tracking and fleet management SaaS with three applications sharing one MongoDB database (`tracksense_db`).

| App | Stack | Port |
|-----|-------|------|
| Backend API | Node.js, Express, TypeScript, MongoDB, Socket.IO | 4000 |
| Admin Web | React, Vite, TypeScript, Tailwind, Shadcn-style UI | 5173 |
| Customer Mobile | Flutter, Riverpod, GoRouter, Dio | — |
| GPS TCP | Teltonika Codec8 / FMB920 | 5027 |

## Security

- JWT access + refresh tokens with rotation
- bcrypt password hashing (cost 12)
- RBAC via roles/permissions
- Customer data isolation from JWT `customerId` (never trust client-supplied scope)
- Rate limiting, Helmet, Zod validation, audit logs

## GPS Data Integrity

- Real device telemetry uses `source: "device"`
- Seeded/demo samples use `source: "import"`
- Clients must never present import samples as live production telemetry without labeling

## Protocol Extensibility

`backend/src/protocols/` registers handlers by key (`teltonika_codec8`, `fmb920`). New manufacturers can be added via the registry without changing core position persistence.
