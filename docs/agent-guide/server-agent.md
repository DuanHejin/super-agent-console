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
- `server/api/conversations/messages.post.ts`: creates a conversation message and Agent Run, with `clientRequestId` idempotency.
- `server/api/agent/runs/[runId]/events.get.ts`: streams AgentEvent data for an existing run. Mock stream interval can be tuned with `intervalMs`, clamped to 100-5000 ms.
- `server/utils/logger.ts`: JSON logger.
- `server/utils/prisma.ts`: Prisma client singleton.
- `server/services/*`: Agent, model, tool, and prompt boundaries.

## Config Rules

- Local development reads from `.env`.
- Production configuration should prefer K3S ConfigMap / Secret injection.
- Do not log API keys, database passwords, or complete sensitive environment values.
- Keep `.env.example` as the local template and K3S configuration mapping reference.

## Agent Config Layer

- Keep Tool schema, Tool workflow, Skill definition, and Model definition in `server/agent-config/`.
- Treat these files as the code-first version of the future configuration backend: the shape should stay close to JSON-serializable data so a later admin UI can persist the same structure.
- `server/agent-config/tools.ts` defines tool names, descriptions, parameter schemas, enabled flags, and the workflow each tool uses.
- `server/agent-config/skills.ts` defines skill input/output schemas and the handler name that will execute the skill.
- `server/agent-config/workflows.ts` defines Tool-to-Skill orchestration with `inputMapping`; MVP can keep execution simple, but new workflows should be added here instead of hard-coding step order inside the runtime.
- `server/agent-config/models.ts` defines selectable model providers and default generation options.
- `server/services/model-adapters/` is the model integration boundary. Add or switch LLM providers by implementing `ModelAdapter` instead of coupling Agent Runtime to one vendor SDK.

## MVP Run Store

- `server/services/run-store.ts` is an in-memory MVP store for conversation message creation, Agent Run records, and `clientRequestId` idempotency.
- This store keeps the current interface shape stable while the MVP is still avoiding NSQ, Redis, and full database persistence.
- Replace this service with Prisma / Redis backed storage before treating run state as durable across process restarts or multiple replicas.

## Before Editing

- Read `super_agent_console_codex_requirement.md`.
- Check `timeline.md` and append project-related changes after meaningful work.
- Keep server changes compatible with Docker, K3S, and JSON stdout logs.
- Agent runtime events should use the shared `AgentEvent` protocol with `eventId`, `eventType`, `conversationId`, `messageId`, `runId`, `traceId`, `sequence`, `status`, `timestamp`, and `data` so frontend Timeline, logs, and future database records can be correlated.
- Treat `eventType` as "what happened" and `status` as "where the Agent Run is now"; do not mix the two concepts.
- Stream the whole Agent process, not only the final answer: model analysis uses `model_text_delta`, Skill inputs are included in `skill_start.data.input`, Skill outputs are included in `skill_result.data.result`, and final answer chunks use `final_answer_delta`.
