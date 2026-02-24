# Agent Control Center — Research, Spec, and Implementation Plan

## Objective
Build an **Agent Control Center** in the existing Next.js dashboard (Better Auth + Postgres + OpenClaw integration) for:
- Agent & subagent monitoring/control
- Persona/config file management (SOUL, IDENTITY, USER, TOOLS, HEARTBEAT, etc.)
- Cron/heartbeat operations
- Observability and safety/audit

---

## 1) Information Architecture (IA)
Recommended left-nav:
1. **Overview** — health, active agents/subagents, queue, failures, heartbeat freshness
2. **Agents** — list + detail (status, model, owner, last seen, actions)
3. **Runs / Sessions** — timeline + filters + replay
4. **Schedules** — cron + heartbeat in one place
5. **Files / Persona** — CRUD with diff/validation/versioning
6. **Logs & Observability** — structured logs, traces, metrics, alerts
7. **Safety & Audit** — policy blocks, destructive-action history
8. **Settings** — RBAC, environment config

Design principle:
- Organize by operator workflow: **monitor → investigate → intervene → audit**

---

## 2) UX Patterns (Cron + Heartbeat)
### Cron UX
- Human-readable schedule preview
- Next 5 runs simulator
- Explicit timezone
- Misfire policy (skip / run-now / catch-up)
- Concurrency policy (allow / queue / replace)
- Inline run history + retry

### Heartbeat UX
- Healthy / delayed / stale bands
- Last heartbeat payload + diff
- Quiet-hours + anti-spam controls
- Escalation after missed beats

### Unified Automation View
- One page, two tabs:
  - Scheduled (cron)
  - Reactive (heartbeat)

---

## 3) Safe File CRUD UX (SOUL/IDENTITY/USER/TOOLS/etc.)
Core safeguards:
- Diff-first save
- Validation checks before publish
- Version history + rollback
- Optimistic lock / conflict warning
- Scoped permissions (read/edit/approve/publish)
- Soft-delete where possible

Operational flow:
- Draft → Validate → Approve → Publish (for critical files)

---

## 4) Observability Patterns
Required telemetry:
- Correlation IDs: `session_id`, `run_id`, `subagent_id`, `job_id`
- Structured event levels (INFO/WARN/ERROR/POLICY_BLOCK)
- Lifecycle states: queued → started → completed/failed/cancelled

UI patterns:
- Session replay timeline
- Faceted filters (agent/status/tool/time)
- Drill-down to raw logs in <=2 clicks
- Error clustering
- Export JSON/CSV

---

## 5) Risk Controls
High-risk actions:
- delete files
- kill sessions/subagents
- bulk edits
- permission changes

Controls:
- Tiered confirmations
- Typed confirm for destructive actions
- Dry-run preview for bulk actions
- Blast-radius display
- Immutable audit log

---

## 6) MVP Scope (Phase 1)
### Must-have
1. Agent menu + pages:
   - `/agent/overview`
   - `/agent/sessions`
   - `/agent/automations`
   - `/agent/files`
2. Agents + subagents list with model/status + actions (steer/kill)
3. Persona/config file CRUD with diff-before-save
4. Cron + heartbeat list/manage/run-now
5. Basic action audit logging

### Nice-to-have next
- Approval workflow
- Better cron misfire/concurrency controls
- Alert hooks (Telegram/Slack/email)
- Saved log filters

---

## 7) Data Model Plan (Postgres)
Suggested tables:
- `agent_nodes`
- `agent_processes`
- `heartbeat_monitors`
- `cron_jobs`
- `managed_files`
- `agent_actions_log`
- `user_roles` (+ optional role_capabilities)

Current implementation note:
- Existing chat tables already exist and are active.
- Agent Control Center tables should be additive migrations.

---

## 8) API Plan (Next.js Route Handlers)
Under `app/api/control-center/**`:
- Files:
  - `GET /files`
  - `GET /files/content?path=`
  - `POST /files`
  - `PATCH /files`
  - `DELETE /files?path=`
- Agents/subagents:
  - `GET /agents`
  - `GET /subagents`
  - `POST /subagents/:id/steer`
  - `POST /subagents/:id/kill`
- Heartbeat:
  - `GET /heartbeat`
  - `PATCH /heartbeat`
  - `POST /heartbeat/trigger`
- Cron:
  - `GET /cron`
  - `POST /cron`
  - `PATCH /cron/:id`
  - `DELETE /cron/:id`
  - `POST /cron/:id/run-now`

All write routes:
- require auth
- require capability
- append audit log

---

## 9) Frontend Spec (React + Tailwind)
### Reusable components
- `AgentTopbar`
- `AgentKpiCard`
- `AgentPanel`
- `StatusPill`
- `ActionConfirmDialog`
- `PermissionGate`
- `LogViewer`

### States
- loading, empty, error, success
- focus-visible on all actionable controls
- mobile drawer behavior for sidebar

### Visual baseline
- dark surface cards
- subtle borders
- compact tables + hover actions
- consistent status badges

---

## 10) Migration + Rollout
Rollout strategy:
1. Additive schema migration
2. Read-only alpha views
3. Enable write actions behind flags
4. Full MVP rollout
5. Hardening

Feature flags:
- `cc_files`
- `cc_agents`
- `cc_heartbeat`
- `cc_cron`

---

## 11) Test Plan
- Unit: capability checks, validators, OpenClaw client adapters
- API integration: authz, CRUD happy path, error handling
- E2E: role-based access, destructive confirms, run-now flows
- Non-functional: retries, timeout behavior, path traversal prevention

---

## 12) Acceptance Criteria (MVP)
- User can navigate Overview → failing run detail in <=2 clicks
- Cron create form shows timezone + next run preview
- Heartbeat status visible with stale threshold
- File edits require diff before apply
- Destructive actions require confirmation
- All write/control actions recorded in audit log

---

## 13) Operational Notes
- Apply **gentle retry**: max 1 retry + backoff + no spam
- Daily reporting remains active via cron
- Recovery checks on work transition windows remain active
