# Agent Control Center — Execution Checklist

This checklist is derived from `docs/agent-control-plan.md` and should be treated as the source of implementation progress.

Status legend:
- [ ] todo
- [~] in progress
- [x] done

---

## Phase 0 — Foundation
- [ ] Add `lib/openclaw/client.ts` typed wrapper
  - [ ] listAgents
  - [ ] listSubagents
  - [ ] steerSubagent
  - [ ] killSubagent
  - [ ] file ops wrappers
  - [ ] cron wrappers
  - [ ] heartbeat wrappers
- [ ] Add common error normalization (`OpenClawApiError`)
- [ ] Add timeout + retry policy (gentle mode)
- [ ] Add capability middleware helpers for API route handlers

---

## Phase 1 — Data Model + Audit
- [ ] Create migration for control center tables:
  - [ ] `agent_nodes`
  - [ ] `agent_processes`
  - [ ] `heartbeat_monitors`
  - [ ] `cron_jobs`
  - [ ] `managed_files`
  - [ ] `agent_actions_log`
- [ ] Create auth mapping tables:
  - [ ] `user_roles`
  - [ ] optional `role_capabilities`
- [ ] Add indexes + constraints
- [ ] Seed baseline roles (`owner/admin/operator/viewer`)

---

## Phase 2 — Backend API (MVP)
### Files
- [ ] `GET /api/control-center/files`
- [ ] `GET /api/control-center/files/content`
- [ ] `POST /api/control-center/files`
- [ ] `PATCH /api/control-center/files`
- [ ] `DELETE /api/control-center/files`
- [ ] Path allowlist + validation

### Agents/Subagents
- [ ] `GET /api/control-center/agents`
- [ ] `GET /api/control-center/subagents`
- [ ] `POST /api/control-center/subagents/:id/steer`
- [ ] `POST /api/control-center/subagents/:id/kill`

### Heartbeat
- [ ] `GET /api/control-center/heartbeat`
- [ ] `PATCH /api/control-center/heartbeat`
- [ ] `POST /api/control-center/heartbeat/trigger`

### Cron
- [ ] `GET /api/control-center/cron`
- [ ] `POST /api/control-center/cron`
- [ ] `PATCH /api/control-center/cron/:id`
- [ ] `DELETE /api/control-center/cron/:id`
- [ ] `POST /api/control-center/cron/:id/run-now`

### Shared
- [ ] Auth + capability guard on all routes
- [ ] Audit log insert on all mutating routes

---

## Phase 3 — Frontend UI (MVP)
### Navigation
- [ ] Add sidebar menu group: **Agent**
  - [ ] Overview
  - [ ] Sessions
  - [ ] Automations
  - [ ] Files

### Pages
- [ ] `/agent/overview`
  - [ ] KPI cards
  - [ ] health summary
- [ ] `/agent/sessions`
  - [ ] agent/subagent list
  - [ ] status + model column
  - [ ] action buttons (steer/kill)
- [ ] `/agent/automations`
  - [ ] cron tab
  - [ ] heartbeat tab
- [ ] `/agent/files`
  - [ ] file list
  - [ ] editor
  - [ ] diff preview modal

### Shared Components
- [ ] `StatusPill`
- [ ] `AgentPanel`
- [ ] `ActionConfirmDialog`
- [ ] `PermissionGate`
- [ ] `ErrorBanner` / `EmptyState`

---

## Phase 4 — Safety + Hardening
- [ ] Typed confirmation for destructive actions
- [ ] Dry-run preview for bulk operations
- [ ] Scope/burst impact text in dangerous dialogs
- [ ] Immutable action log view page (admin)

---

## Phase 5 — Testing
- [ ] Unit tests (validators, guards, adapters)
- [ ] API integration tests
- [ ] E2E flows:
  - [ ] file CRUD with diff
  - [ ] subagent kill confirm
  - [ ] cron create/edit/run-now
  - [ ] heartbeat trigger
- [ ] Security tests (path traversal, auth bypass)

---

## Rollout Plan
- [ ] Alpha (read-only)
- [ ] Beta (write actions for admin/operator)
- [ ] Prod MVP
- [ ] Post-MVP improvements

---

## Current Operational Automations (already active)
- [x] Daily OpenClaw Update Check (09:00)
- [x] Daily Agent Ops Report (20:00)
- [x] Work Transition Recovery Check (09:05, 17:05, 18:05)

Note:
- Keep retries gentle to avoid server-error spam.
- Record request IDs for repeated failures.
