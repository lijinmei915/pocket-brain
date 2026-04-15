# Claude 专属配置

> 项目规范在 `AGENTS.md`，本文件只放 Claude Code 专属内容。

## 当前状态速览（每次收尾更新，保持 5 行以内）

- **上次做到**：灵感/资料 tab 加手动标签区，三 tab 标签状态隔离；Prompt 加标签去重去包含规则 + 用户标签库复用；标签拖拽排序 + 顺序持久化
- **下一步**：本地测 Prompt 改动效果（npx vercel dev）；验证标签持久化（检查 RLS）；API 并行优化减少分类延迟
- **线上地址**：https://pocketbrain.me

---

## Claude Memory 导航

| 文件 | 内容 | 位置 |
|------|------|------|
| `project_pocket_brain.md` | 项目指针、关键事实 | `~/.claude/projects/.../memory/` |
| `user_profile.md` | 用户背景与偏好 | `~/.claude/projects/.../memory/` |
| `feedback_style.md` | 工作风格偏好 | `~/.claude/projects/.../memory/` |
| `feedback_session_closeout.md` | 收尾 checklist | `~/.claude/projects/.../memory/` |
| `feedback_agents.md` | agent 使用反馈 | `~/.claude/projects/.../memory/` |

**改动行为/流程前额外读**：`feedback_style.md`（用户纠正过的工作方式）

---

## 收尾 Checklist（每次对话完成主要任务后主动执行）

| 文件 | 何时更新 |
|------|---------|
| `CLAUDE.md` 状态速览 | 每次必更新 |
| `memory/project_pocket_brain.md` | 有新模块或阶段变化时 |
| `docs/DECISIONS.md` | 本次有架构/流程决策时 |
| `docs/LESSONS.md` | 本次犯了错时 |
| `docs/PROJECT.md` 功能清单 | 有功能上线或确认新缺口时 |

**自动防护**：`.claude/settings.local.json` 配置了 `PreToolUse` hook，commit 时如果 `CLAUDE.md` 不在暂存区会被拦住。
