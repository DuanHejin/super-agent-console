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
6. `model_text_delta` updates the model analysis stream, `final_answer_delta` updates the final answer stream, and Tool / Skill events expose their `data` payload in the Timeline.
7. Mock SSE speed is configurable for demos: use page query `?sseIntervalMs=1200` first, or browser localStorage key `agent:sseIntervalMs`; values are clamped to 100-5000 ms.
8. Typewriter rendering is handled by `composables/useTypewriterQueue.ts`; SSE chunks should be enqueued there instead of directly assigning display text.
9. While a run is `running`, show lightweight loading affordances near output and Timeline instead of blocking the whole console.

## UI Rules

- Keep controls compact and work-focused.
- Avoid complex UI libraries during MVP.
- Ensure text does not overflow on mobile.
- Prefer clear event/status labels over decorative UI.

## Before Editing

- Read `super_agent_console_codex_requirement.md`.
- Check `timeline.md` and append project-related changes after meaningful work.
- Keep frontend changes aligned with the AgentEvent protocol in `types/agent-event.ts`.
