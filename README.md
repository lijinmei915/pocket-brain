# Pocket Brain

个人知识库——一键保存网页、视频、文章，分类整理，随时找回。

**线上地址**：https://pocket-brain-blush.vercel.app

---

## 功能

- 收藏网页内容，AI 自动识别类型（文章 / 视频 / 音频 / 帖子）
- 保存时自动抓取页面标题
- 文件夹归类（支持嵌套）、全文搜索
- 富文本笔记（标题 / 加粗 / 颜色 / 高亮）

## 保存方式

| 方式 | 说明 |
|------|------|
| 网页手动添加 | 打开 App，点「添加」 |
| 书签工具 | 从「获取应用」拖按钮到书签栏 |
| Chrome 扩展 | 加载 `extension/` 文件夹到 Chrome |
| iOS 快捷指令 | 系统分享菜单选「Pocket Brain」 |
| PWA | 手机桌面安装，体验接近原生 |

## 技术栈

- **前端**：React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- **数据库**：Supabase（PostgreSQL）
- **后端**：Vercel Serverless Functions
- **部署**：Vercel

## 本地运行

```bash
npm install
cp .env.example .env.local   # 填入 Supabase 和 Qwen API Key
npm run dev
```

## 环境变量

```
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=
QWEN_API_KEY=
QWEN_MODEL=qwen3.6-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```
