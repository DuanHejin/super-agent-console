# Server Agent Guide

## Scope

This guide covers Nitro server APIs, Agent Runtime services, logging, configuration, and Prisma access.

## Responsibilities

- Keep API handlers thin: parse input, set response behavior, and call services.
- Keep Agent Runtime in `server/services/agent-runtime.ts`.
- Emit each key AgentEvent to SSE, database, and JSON stdout logs.
- Preserve traceId and runId across API responses, logs, database rows, and frontend events.

## Current Entry Points

- `server/api/health.get.ts`: process health check.
- `server/api/ready.get.ts`: readiness/config check.
- `server/api/db-check.get.ts`: database connectivity check.
- `server/utils/logger.ts`: JSON logger.
- `server/utils/prisma.ts`: Prisma client singleton.
- `server/services/*`: Agent, model, tool, and prompt boundaries.

## Config Rules

- Local development reads from `.env`.
- Production configuration should prefer K3S ConfigMap / Secret injection.
- Do not log API keys, database passwords, or complete sensitive environment values.
- Keep `.env.example` as the local template and K3S configuration mapping reference.

## Before Editing

- Read `super_agent_console_codex_requirement.md`.
- Check `timeline.md` and append project-related changes after meaningful work.
- Keep server changes compatible with Docker, K3S, and JSON stdout logs.
