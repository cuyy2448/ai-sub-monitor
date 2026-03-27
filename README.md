# AI Usage Monitor v0.3 🔍

Chrome 扩展 — 在一个面板里监控所有 AI 订阅的包月用量，并在用量低时推送浏览器通知。

## 功能

**Dashboard 显示（每个服务卡片包含 6 个字段）：**
- 平台名称 + 图标
- 当前套餐（Pro / Plus / Allegretto 等）
- 本窗口剩余 %（带进度条）
- 周度剩余 %（带进度条）
- 下次重置时间
- 最近一次抓取时间
- 状态灯：🟢 绿色（>20%）/ 🟡 黄色（5~20%）/ 🔴 红色（≤5%）

**浏览器通知告警：**
- 剩余 20% 时推送 ⚠️ 告警
- 剩余 10% 时推送 🟠 告警
- 剩余 5% 时推送 🔴 紧急告警
- 用量恢复后自动清除标记，下次再降到阈值时重新告警
- 点击通知直接跳转到对应平台 usage 页面
- 支持一键开关告警、重置告警记录

## 支持的服务

| 服务 | Usage 页面 |
|------|----------|
| Claude Pro | `claude.ai/settings/usage` |
| ChatGPT Codex | `chatgpt.com/codex/settings/usage` |
| Kimi Code | `kimi.com/code/console` |

## 安装

1. 解压 ZIP
2. Chrome → `chrome://extensions/` → 开启「开发者模式」
3. 「加载已解压的扩展程序」→ 选择 `ai-usage-monitor` 文件夹
4. 工具栏出现 AI 图标

## 使用

1. 依次访问上表中的 usage 页面，扩展自动抓取
2. 点击工具栏图标查看 dashboard
3. 再次访问 usage 页面即可刷新数据

## 隐私

所有数据存储在 `chrome.storage.local`，不上传任何服务器。

## 扩展更多服务

1. `content_scripts/` 下新建 JS，解析目标页面 DOM
2. `manifest.json` 注册 content script
3. `popup.js` 的 `SVCS` 添加配置
4. `background.js` 的 `SVC_NAMES` / `SVC_URLS` 添加条目
