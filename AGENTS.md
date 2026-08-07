# JATLAS Project Instructions

## Persistent Project Records

This project preserves important requirements, decisions, implementation notes, and handoff context as Markdown files under the project-local `dict/` folder.

Treat `dict/` as the project memory layer. Do not rely on chat history alone for information that should survive across sessions.

`dict/` is local-only and intentionally ignored by Git. Do not assume records in this folder will be pushed to GitHub.

`dict/` records should be written in Chinese by default. The purpose is to make project thinking visible and understandable to both people and future AI agents. Use English only for code identifiers, commands, file paths, package names, API names, error messages, branch/commit names, or exact UI copy that must remain English.

Start project-knowledge lookup from `dict/index.md` for private local records and `docs/index.md` for public documentation. Use `dict/log.md` and `docs/log.md` to understand knowledge-base maintenance history.

## When to Write to `dict/`

Create or update a Markdown record when work introduces any of the following:

- A version requirement or feature requirement.
- A behavior change, refactor, migration, or fix with future relevance.
- A product, architecture, data, security, packaging, or workflow decision.
- A periodic conversation summary that captures conclusions or next steps.
- A handoff note for the next agent or future project work.

Before substantial work, inspect relevant existing files in `dict/` so decisions build on the current project record.

Before finishing substantial work, check whether the session produced information that should be persisted. If yes, write or update the relevant Markdown file and mention it in the final response.

## Directory Layout

Use this layout for new records:

- `dict/requirements/` for version requirements and feature specs.
- `dict/changes/` for implementation changes, refactors, fixes, and migrations.
- `dict/decisions/` for architecture, product, workflow, and process decisions.
- `dict/sessions/` for periodic conversation summaries.
- `dict/handoff/` for agent handoff notes.
- `dict/_templates/` for reusable document templates.

Existing top-level `dict/*.md` files may remain in place. Prefer the structured subdirectories for new records.

## Naming

Use sortable filenames:

`YYYY-MM-DD_<type>_<short-topic>.md`

Allowed types:

- `requirement`
- `change`
- `decision`
- `session`
- `handoff`

Keep the short topic lowercase, concise, and hyphenated.

## Record Content

A useful record should usually include:

- 背景
- 当前结论或需求
- 适用范围
- 执行说明
- 验收或验证
- 未决问题
- 后续动作

Skip sections that do not apply, but do not skip the decision or requirement itself.

## Skill

Use the project-local Codex skill `$jatlas-dict-keeper` when work involves requirements, feature changes, implementation decisions, handoffs, or session summaries.

## Project Structure and GitHub Boundary

Use `docs/project-structure.md` as the current source of truth for repository layout and push boundaries.

Current rule of thumb:

- `apps/desktop/` is the active desktop application mainline.
- The legacy root `src/` service layer has been removed; do not reintroduce a parallel business-logic tree.
- `docs/` is public project documentation and may be pushed.
- `dict/` is private local project memory and must stay untracked.
- Build output, local SQLite databases, `.env` files, `release/`, `backups/`, `logs/`, and traces must not be staged.

Before preparing a GitHub push, check `git status --short` and verify that only source, tests, public docs, package files, and schema changes are included.
