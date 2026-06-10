# 前端 SDK 设计 | Frontend SDK Design

## 概述

V-Waitlist 前端 SDK 提供两种集成方式：Web Component (极简) 和 API 调用 (灵活)。

最终产物：单个 `v-waitlist.min.js` 文件，约 15-20KB (gzipped)。

---

## 集成方式

### 方式 A: Web Component (推荐)

开发者只需引入脚本，使用自定义标签：

```html
<script src="https://cdn.v-waitlist.com/sdk.js"></script>

<!-- 仅输入框模式 -->
<v-waitlist project-id="xyz" mode="input"></v-waitlist>

<!-- 弹窗模式 -->
<v-waitlist project-id="xyz" mode="modal"></v-waitlist>
```

### 方式 B: API 调用

开发者自定义 UI，只调用 SDK 方法：

```javascript
import { joinWaitlist, getStatus } from 'v-waitlist-sdk';

// 加入等待名单
const result = await joinWaitlist({
  email: 'user@example.com',
  projectId: 'xyz'
});

// 查询状态
const status = await getStatus({
  email: 'user@example.com',
  projectId: 'xyz'
});
```

---

## Web Component API

### 属性 (Attributes)

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `project-id` | string | 是 | - | 项目 ID |
| `mode` | string | 否 | `input` | `input` 或 `modal` |
| `theme` | string | 否 | `light` | `light` 或 `dark` |
| `primary-color` | string | 否 | `#000` | 主色调 (hex) |

### 事件 (Events)

```javascript
const widget = document.querySelector('v-waitlist');

widget.addEventListener('success', (e) => {
  console.log('Rank:', e.detail.rank);
  console.log('RefCode:', e.detail.refCode);
});

widget.addEventListener('error', (e) => {
  console.error('Error:', e.detail.error);
});
```

| 事件 | 数据 | 触发时机 |
|------|------|----------|
| `success` | `{ rank, refCode, total, shareUrl }` | 注册成功 |
| `error` | `{ error }` | 发生错误 |
| `loading` | `{ loading: boolean }` | 加载状态变化 |

---

## 组件状态机

```
┌─────────┐     ┌───────────┐     ┌──────────┐
│  idle   │────▶│ submitting │────▶│ success  │
└─────────┘     └───────────┘     └──────────┘
     │                                  │
     │  (已有记录)                       │
     └──────────────────────────────────┘
```

### idle (初始状态)

- 检查 `localStorage` 是否有 `v-waitlist-user`
- 如果有：调用 `/api/status`，跳转到 success 状态
- 如果没有：显示输入框

### submitting (提交中)

- 显示加载动画
- 调用 `/api/join`

### success (成功状态)

- 显示排名和推荐信息
- 显示分享按钮
- 保存用户信息到 `localStorage`

---

## LocalStorage 策略

### Key: `v-waitlist-user`

```json
{
  "email": "user@example.com",
  "refCode": "abc12345",
  "projectId": "xyz",
  "joinedAt": "2025-01-19T10:30:00Z"
}
```

### Key: `v-waitlist-ref`

用于追踪推荐关系（从 URL 参数 `?ref=xxx` 读取）。

---

## UI 设计参考

### 输入框模式

```
┌─────────────────────────────────────┐
│  🎉 Join the Waitlist               │
│  ┌─────────────────────────────┐    │
│  │ Enter your email...         │    │
│  └─────────────────────────────┘    │
│           [Join Now]                 │
└─────────────────────────────────────┘
```

### 成功状态

```
┌─────────────────────────────────────┐
│  🎊 You're #543!                    │
│                                     │
│  You've joined the waitlist.        │
│  997 people are behind you.         │
│                                     │
│  📢 Invite 3 friends to jump        │
│     ~1,000 spots!                   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🔗 Copy Referral Link      │    │
│  └─────────────────────────────┘    │
│                                     │
│     [Twitter]    [WhatsApp]         │
└─────────────────────────────────────┘
```

### 弹窗模式

- 页面加载时自动弹出
- 支持定时延迟显示
- 可通过按钮触发重新打开

---

## 社交分享链接

成功后自动生成分享链接，点击跳转预填充内容：

### Twitter
```
https://twitter.com/intent/tweet
  ?text=Just+joined+the+waitlist!+I'm+%23543+in+line.+Join+me+🚀
  &url=https://example.com?ref=abc12345
```

### WhatsApp
```
https://wa.me/?text=Join+the+waitlist+with+me!+https://example.com?ref=abc12345
```

---

## SDK 构建配置 (Vite)

```javascript
// vite.config.js
export default {
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'VWaitlist',
      fileName: 'v-waitlist.min',
      formats: ['umd']
    },
    rollupOptions: {
      output: {
        globals: {
          preact: 'preact'
        }
      }
    }
  }
}
```

### 输出文件结构

```
dist/
├── v-waitlist.min.js       # UMD 版本
└── v-waitlist.min.js.map   # Source map
```
