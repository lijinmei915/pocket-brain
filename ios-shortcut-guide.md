# iOS 捷径配置指南 — Pocket Brain

## 你能实现什么

配置完成后，iPhone 上任何 App（Safari、微信、小红书、YouTube 等）分享菜单里都会出现「存入 Pocket Brain」，点一下自动保存，无需手动填写链接。

---

## 前提：先把网页应用部署上线

iOS 捷径需要通过 URL 调用你的 Pocket Brain，所以 `index.html` 必须部署到一个可访问的地址，而不是本地文件。

**推荐免费部署方式（5 分钟完成）：**

1. 把整个 `pocket-brain/` 文件夹上传到 [GitHub](https://github.com)
2. 在仓库设置里开启 **GitHub Pages**（Settings → Pages → Branch: main → / root）
3. 几分钟后得到网址：`https://你的用户名.github.io/pocket-brain/`

---

## 方案一：分享菜单收藏（最常用）

**效果：** 在任何 App 点「分享 → 存入 Pocket Brain」，直接后台静默保存到收件箱。

### 创建步骤

1. 打开 iPhone **「捷径」App**（系统自带，搜索 Shortcuts）
2. 点右上角 **「+」** 新建捷径
3. 按顺序添加以下动作：

```
① 接受输入：Safari 网页
   → "捷径输入" 设为「Safari 网页」
   → 允许从「分享表单」运行

② 获取变量：捷径输入的 URL
   → 保存为变量「pageURL」

③ 获取变量：捷径输入的名称
   → 保存为变量「pageTitle」

④ 获取 URL 的内容（URL 动作）
   → URL 填写：
   https://你的域名/index.html?url=[pageURL]&title=[pageTitle]&autosave=1
   （把 [pageURL] 和 [pageTitle] 换成上面保存的变量）
   → 方法：GET

⑤（可选）显示通知：「已保存到 Pocket Brain ✓」
```

4. 点右上角完成，命名为「存入 Pocket Brain」
5. 捷径设置里开启 **「在分享表单中显示」**

### 使用方法

- Safari 里：点分享按钮（方框+箭头）→ 滚动找到「存入 Pocket Brain」
- 其他 App：同样的分享菜单
- 第一次可能需要在分享菜单底部「更多」里找到并开启

---

## 方案二：轻点背面触发（随时唤起）

**效果：** 三击 iPhone 背面 → 打开 Pocket Brain App 主界面。

1. 设置 → 辅助功能 → 触控 → **轻点背面**
2. 「三击」→ 选择「捷径」→ 找到你刚创建的捷径
3. 也可以单独创建一个「打开 Pocket Brain」捷径：
   - 动作：打开 URL → `https://你的域名/index.html`

---

## 方案三：主屏幕快捷方式（像原生 App 一样）

PWA 已经配置好了，步骤：

1. Safari 打开 `https://你的域名/index.html`
2. 点底部分享按钮 → **「添加到主屏幕」**
3. 名称填「Pocket Brain」→ 添加
4. 桌面出现图标，全屏打开，没有浏览器地址栏，跟原生 App 一样

---

## 捷径 URL 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `url` | 页面链接 | `https://example.com` |
| `title` | 页面标题 | `一篇好文章` |
| `type` | 内容类型 | `article` / `video` / `audio` / `tweet` / `other` |
| `note` | 备注 | `值得反复读` |
| `autosave=1` | 静默保存（不弹窗） | 加上后直接存入收件箱 |

**示例 URL（手动测试用）：**
```
https://你的域名/index.html?url=https://example.com&title=测试&autosave=1
```

---

## 常见问题

**Q: 捷径提示"无法连接"？**
确认 `index.html` 已部署上线，且 URL 正确。

**Q: 分享菜单里找不到捷径？**
分享菜单 → 滑到最底部「编辑动作」→ 找到「存入 Pocket Brain」→ 开启。

**Q: 保存了但网页里看不到？**
捷径是调用线上部署的页面，数据存在该设备的 localStorage 里，需要在部署的页面上查看，不是本地 `index.html` 文件。
