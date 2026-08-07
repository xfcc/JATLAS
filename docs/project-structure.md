---
type: reference
title: "JATLAS 项目结构与推送边界"
status: current
source: existing-project-record
updated: 2026-06-16
tags: [project-structure, github-boundary]
---
# JATLAS 项目结构与推送边界

本文档用于区分 GitHub 需要保留的源码结构、本机运行时文件、打包产物和项目私有记录。

## GitHub 保留结构

```text
.
├── apps/desktop/              # Electron 桌面应用
│   ├── core/                  # 桌面端数据、配置、任务、初始化逻辑
│   ├── electron/              # Electron 主进程与 preload
│   ├── renderer/              # React 渲染层
│   ├── shared/                # 主进程与渲染层共享类型
│   ├── tsconfig.electron.json
│   └── vite.config.ts
├── docs/                      # 可推送的项目说明与公开资料
│   └── assets/screenshots/    # README 或发布说明可引用的截图
├── prisma/
│   └── schema.prisma          # SQLite 数据结构定义
├── scripts/                   # 构建、打包辅助脚本
├── tests/                     # 桌面端逻辑与通用工具测试
├── AGENTS.md                  # AI 协作规则
├── README.md                  # 人类读者入口
├── package.json
└── package-lock.json
```

## 当前源码分层

`apps/desktop/` 是当前桌面应用主线。新功能默认优先落在这里：

- `apps/desktop/core/` 负责 SQLite 数据服务、任务执行、Emby 对接、存储扫描和数据库初始化。
- `apps/desktop/electron/` 负责窗口、IPC、文件选择和系统级能力。
- `apps/desktop/renderer/` 负责界面与交互。
- `apps/desktop/shared/` 放 IPC channel 与调用类型。

根目录旧 `src/` 服务层已移除。业务逻辑不再双轨维护，新增代码应进入 `apps/desktop/` 下对应层级。

## 本地保留但不推送

以下目录和文件只用于本机开发、运行或交接，不进入 GitHub：

- `dict/`：本地项目记录、需求、变更、决策和交接笔记。
- `release/`：Electron 打包输出和发布资产，发布时通过 GitHub Release 上传，不提交到代码仓库。
- `apps/desktop/dist/`：渲染层构建输出。
- `apps/desktop/dist-electron/`：Electron 主进程构建输出。
- `*.db`、`*.sqlite`、`*.sqlite3`：本地 SQLite 数据库和验证数据库。
- `.env`、`.env.*`：本地环境变量和密钥。
- `backups/`、`logs/`、`trace/`：本机备份、日志和追踪文件。

## 推送前检查

推送代码前建议执行：

```bash
npm test -- --runInBand
npm run desktop:build
git diff --check
git status --short
```

`git status --short` 中不应出现数据库、构建产物、release 包、私有配置或 `dict/` 记录。

## 打包与发布边界

`npm run desktop:pack:*` 会生成 `release/`。这些文件通常较大，不进入 Git 提交。

发布流程应分开处理：

- GitHub 仓库：提交源码、测试、文档和配置。
- GitHub Release：上传 `release/` 中生成的安装包或压缩包。

## 后续瘦身方向

后续结构优化应优先围绕 `apps/desktop/renderer/src/App.tsx` 的界面拆分、桌面数据服务边界和测试分组命名展开，不再恢复根目录 `src/` 双轨结构。
