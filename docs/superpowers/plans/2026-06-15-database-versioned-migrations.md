---
type: plan
title: "Database Versioned Migrations Implementation Plan"
status: reference
source: existing-project-record
updated: 2026-06-16
tags: [plan, superpowers]
---
# Database Versioned Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-confirmed database upgrade flow so older SQLite databases can be backed up and migrated by the app instead of by manual AI intervention.

**Architecture:** The core database layer exposes migration inspection and execution functions. The Electron main process reports migration-required bootstrap states and exposes a confirmation IPC. The renderer shows a plain-language upgrade confirmation page before any old database is modified.

**Tech Stack:** Electron IPC, React renderer, SQLite through Prisma raw SQL, Jest tests.

---

### Task 1: Core Migration Service

**Files:**
- Create: `apps/desktop/core/migrationService.ts`
- Test: `tests/desktop/migrationService.test.ts`

- [ ] Write tests for legacy database detection, automatic backup creation, schema migration, and current-version metadata.
- [ ] Implement `_jatlas_meta` version storage with current schema version `7`.
- [ ] Treat non-empty databases without metadata as legacy version `0`.
- [ ] Make migration execution create a timestamped `.before-migration.*.db` backup before schema changes.
- [ ] Verify legacy test database upgrades to version `7`.

### Task 2: Bootstrap and IPC Integration

**Files:**
- Modify: `apps/desktop/core/bootstrapService.ts`
- Modify: `apps/desktop/shared/ipc.ts`
- Modify: `apps/desktop/electron/preload.ts`
- Modify: `apps/desktop/electron/main.ts`
- Test: `tests/desktop/bootstrapService.test.ts`

- [ ] Extend bootstrap state with migration status.
- [ ] Return `initialized: false` and `migration.required: true` when an old configured database is detected.
- [ ] Keep fresh or current databases entering the existing initialization path.
- [ ] Add `desktop:confirm-database-migration` IPC for the user-confirmed upgrade.

### Task 3: Renderer Upgrade Confirmation

**Files:**
- Modify: `apps/desktop/renderer/src/App.tsx`
- Modify: `apps/desktop/renderer/src/bootstrapState.ts`
- Modify: `apps/desktop/renderer/src/global.d.ts`
- Test: `tests/desktop/bootstrapState.test.ts`

- [ ] Show a plain-language "需要升级数据库" page when migration is required.
- [ ] Provide `备份并升级数据库` and `暂不升级` actions.
- [ ] Display upgrade failures and backup path if the migration fails after backup.

### Task 4: Verification and Records

**Files:**
- Create: `dict/requirements/2026-06-15_requirement_database-versioned-migrations.md`
- Create: `dict/changes/2026-06-15_change_database-versioned-migrations.md`

- [ ] Run focused migration/bootstrap tests.
- [ ] Run full test suite, desktop build, and lint.
- [ ] Record the requirement and implementation decision in `dict/`.
