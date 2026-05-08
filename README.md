# DoList

> 本地优先 (local-first) 的桌面任务管理应用，集成番茄钟、智能排程与多视图工作流。

[![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 下载使用

前往 [Releases](https://github.com/yilin1212/dolist/releases) 下载最新版本的压缩包，解压后双击 `DoList.exe` 即可运行——无需安装、无需联网、所有数据保存在本地。

> 当前仅提供 Windows x64 构建。macOS / Linux 用户可参考下方"开发与构建"章节自行打包。

## 主要特性

### 多视图任务管理
- **收件箱 (Inbox)** — 所有未分类任务的入口
- **今天 / 即将 (Today / Upcoming)** — 按时间排列的待办列表
- **看板 (Kanban)** — 拖拽切换 待办 / 进行中 / 已完成 三栏
- **四象限 (Matrix)** — 艾森豪威尔矩阵，按紧急 × 重要四个维度归类
- **日历 (Calendar)** — 月视图日程总览
- **时间线 (Timeline)** — 按时间轴查看任务/日程
- **项目报告 (Report)** — 完成情况的统计与可视化

### 智能排程 (Smart Scheduler)
扫描接下来 4 天的日程空隙，自动推荐合适的执行时段，按可用时长 / 截止日期 / 优先级排序候选项；用户一键确认即可写入日程，并在执行前 30 秒触发桌面通知提醒。

### 番茄钟 (Pomodoro)
- 计时状态机运行在主进程，渲染窗口刷新或最小化都不会丢失计时
- **Mini 窗口** — 无边框、可置顶的迷你浮窗，专注时全屏其他应用也能看到剩余时间
- 完成时桌面通知 + 可配置的工作 / 休息时长

### 其他实用功能
- **标签与分类** — 多维度组织任务，颜色标识优先级
- **托盘驻留** — 关闭窗口时缩到系统托盘，不退出
- **全局快捷键** — `Ctrl+Shift+D` 唤出主窗口；新建任务页内 `Ctrl+N`
- **国际化** — 内置简体中文 / English，运行时切换
- **错误边界** — 单页面崩溃不会拖垮整个应用

---

## 数据存储

所有数据通过 `sql.js` (SQLite WASM) 保存在本地的 Electron `userData` 目录下：

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\DoList\` |
| macOS | `~/Library/Application Support/DoList/` |
| Linux | `~/.config/DoList/` |

应用每次写入后会在 500ms 内自动落盘，文件可直接备份 / 迁移。

---

## 开发与构建

### 环境要求
- Node.js 18+
- npm 9+

### 启动开发服务器
```bash
npm install
npm run dev
```

### 类型检查
```bash
npm run lint   # 实际执行 tsc --noEmit
```

### 打包为可执行文件
```bash
npm run package:exe
```

产物位于 `release/DoList-win32-x64/`。该脚本使用本地缓存的 Electron 二进制（无需联网下载），约 30 秒完成打包。

> 项目中也保留了 `npm run package` / `npm run make`（基于 electron-forge），但其会扫描整个 `node_modules` 导致打包很慢，建议用上面的 `package:exe`。

---

## 技术栈

| 层 | 选型 |
|----|------|
| 桌面运行时 | Electron 28 |
| 渲染层 | React 18 + TypeScript 5 + Vite 5 |
| 状态管理 | Zustand |
| UI 组件 | Radix UI + Tailwind CSS 3 + class-variance-authority |
| 路由 | React Router (HashRouter) |
| 持久化 | sql.js（SQLite WASM，本地文件） |
| 拖拽 | @dnd-kit |
| 动画 | framer-motion |
| 国际化 | 自研 React Context |

### 进程模型
- **主进程** (`src/main/`) — 数据库、IPC、托盘、全局快捷键、番茄钟状态机、迷你窗口、提醒服务
- **预加载** (`src/preload/`) — 通过 `contextBridge` 暴露 `window.electronAPI`
- **渲染进程** (`src/renderer/`) — UI、Zustand store、i18n

详见 [`CLAUDE.md`](CLAUDE.md)（架构速查与代码约定）。

---

## 项目结构

```
dolist/
├── src/
│   ├── main/              # Electron 主进程：DB、IPC、托盘、番茄钟、调度
│   │   ├── db/            # sql.js client + repositories
│   │   ├── ipc/           # 各 IPC 域的 handler
│   │   ├── pomodoro/      # 番茄钟状态机
│   │   ├── scheduler/     # 智能排程 + 提醒服务
│   │   └── windows/       # Mini 窗口
│   ├── preload/           # contextBridge 桥接层
│   └── renderer/          # React UI
│       ├── components/ui/ # shadcn/ui 风格基础组件
│       ├── features/      # 各功能模块（任务、看板、番茄钟等）
│       ├── i18n/          # 中英文 locale
│       └── layouts/       # 主布局
├── resources/             # 应用图标
├── scripts/build-exe.cjs  # 离线快速打包脚本
└── electron.vite.config.ts
```

---

## License

[MIT](LICENSE)
