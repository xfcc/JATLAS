---
type: index
title: JATLAS 公开文档索引
status: current
source: current-reorganization
updated: 2026-06-16
tags: [docs, knowledge]
---

# JATLAS 公开文档索引

`docs/` 保存可以随 GitHub 仓库发布的公开资料。私有项目记录、需求讨论、实现交接和本地过程笔记放在 `dict/`，不要从 `dict/` 直接复制到公开提交，除非已经确认内容可公开。

## 当前文档

- [项目结构与推送边界](project-structure.md)：当前源码布局、可提交范围、本地产物和发布边界。
- [发布检查清单](release-checklist.md)：发布前的代码、数据迁移、核心流程、界面和打包验证。
- [Superpowers 计划](superpowers/plans/2026-06-15-database-versioned-migrations.md)：数据库版本化迁移的执行计划，属于开发过程参考。

## 资料边界

- `docs/assets/screenshots/` 保存 README、发布说明或公开说明可引用的截图。
- `docs/superpowers/plans/` 保存可公开的计划文档；如果计划包含私有路径、密钥、数据库内容或不可公开资料，应改放 `dict/`。
- 本地数据库、`.env`、日志、构建输出、`release/` 和 `dict/` 不属于公开文档。

## 维护方式

- 公开文档应能脱离本地机器阅读。
- 新增长期文档时优先更新本索引。
- 与仓库结构、推送边界相关的结论同步更新 [项目结构与推送边界](project-structure.md)。
