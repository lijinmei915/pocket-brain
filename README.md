# Pocket Brain

你的第二大脑 — 随时收藏，随时整理。

## 简介

Pocket Brain 是一个个人知识库工具，帮助你保存和管理来自网络的内容（文章、视频、音频、推文等），支持文件夹分类、搜索、以及浏览器书签快速收藏。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite |
| UI | shadcn/ui + Tailwind CSS v4 |
| 字体 | Geist Variable |
| 数据库 | Supabase（PostgreSQL REST API）|
| 部署 | Vercel |

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`

## 项目结构

```
pocket-brain/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn 基础组件
│   │   ├── Sidebar.jsx      # 侧边栏（导航 + 文件夹树 + 书签工具）
│   │   ├── ItemGrid.jsx     # 内容卡片列表
│   │   ├── AddItemDialog.jsx# 新增/编辑内容弹窗
│   │   ├── FolderDialog.jsx # 新建/重命名文件夹弹窗
│   │   └── ConfirmDialog.jsx# 确认删除弹窗
│   ├── hooks/
│   │   └── use-mobile.js    # 移动端检测
│   ├── lib/
│   │   ├── supabase.js      # 所有数据库操作（fetch/create/update/delete）
│   │   └── utils.js         # 工具函数（cn）
│   ├── App.jsx              # 根组件，状态管理
│   ├── main.jsx             # 入口
│   └── index.css            # 全局样式（Tailwind + shadcn token）
├── index.html
├── package.json
└── vite.config.js
```

## 核心功能

- **收件箱** — 未分类内容统一落在收件箱，稍后整理
- **文件夹树** — 支持多级嵌套文件夹，拖拽或菜单操作
- **内容类型** — 文章 / 视频 / 音频 / 推文 / 其他
- **搜索** — 全字段搜索（标题、链接、备注）
- **书签工具** — 侧边栏一键复制 Bookmarklet，任意浏览器可用
- **扩展保存** — 通过 URL 参数 `?autosave=1` 接收浏览器扩展传来的内容

## 数据库表结构

### `items`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| title | text | 标题 |
| url | text | 链接 |
| type | text | article / video / audio / tweet / other |
| note | text | 备注 |
| tags | text[] | 标签数组 |
| folderid | text | 所属文件夹 ID（null = 收件箱）|
| createdat | bigint | 创建时间戳（ms）|
| thumbnail | text | 封面图 URL |
| source | text | 来源标识（bookmarklet / context-menu 等）|
| summary | text | 摘要 |

### `folders`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| name | text | 文件夹名称 |
| parentid | text | 父文件夹 ID（null = 顶级）|
| createdat | bigint | 创建时间戳（ms）|

## 部署

项目连接 GitHub，推送到 `main` 分支后 Vercel 自动部署。

```bash
git add .
git commit -m "your message"
git push origin main
```

线上地址：https://pocket-brain-blush.vercel.app
