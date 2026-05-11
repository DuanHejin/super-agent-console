# Frontend Agent Guide

## Scope

This guide covers Nuxt pages, Vue components, and composables for the Agent Console UI.

## Responsibilities

- Keep the first screen focused on the usable Agent Console, not a marketing landing page.
- Render AgentEvent data in three places: AI stream output, Agent Timeline, and run metadata.
- Keep state ownership simple: composables coordinate API/SSE state, components render UI state.
- Preserve runId and traceId whenever they appear in streamed events.

## Current Entry Points

- `pages/index.vue`: home page shell.
- `pages/deploy.vue`: deployment information page.
- `components/AgentConsole.vue`: future console container.
- `composables/useAgentRun.ts`: run state orchestration. It first creates a conversation message / Agent Run, then subscribes to the run event stream.
- `composables/useSseStream.ts`: GET SSE reader for `GET /api/agent/runs/:runId/events`.

## Agent Run Flow

1. Frontend generates a `clientRequestId` for each send action.
2. Frontend calls `POST /api/conversations/messages` with `conversationId`, `input`, and `clientRequestId`.
3. Server returns `conversationId`, `messageId`, `runId`, `traceId`, and `status`.
4. Frontend subscribes to `GET /api/agent/runs/:runId/events`.
5. Streamed AgentEvent data updates the Timeline, output area, and run metadata.

## UI Rules

- Keep controls compact and work-focused.
- Avoid complex UI libraries during MVP.
- Ensure text does not overflow on mobile.
- Prefer clear event/status labels over decorative UI.

## Before Editing

- Read `super_agent_console_codex_requirement.md`.
- Check `timeline.md` and append project-related changes after meaningful work.
- Keep frontend changes aligned with the AgentEvent protocol in `types/agent-event.ts`.
