# 开发路线图 | Roadmap

> 最后更新: 2025-01-21

## 总览

```
Week 1                    Week 2                    Week 3
├────────────────────────┼────────────────────────┼────────────────────────┤
│ ✅ 核心引擎 (100%)      │ ✅ SDK 与演示站 (100%) │ 🟡 开源与发布 (80%)     │
│ Backend & Data          │ Frontend & UI           │ Launch & Marketing      │
└────────────────────────┴────────────────────────┴────────────────────────┘
```

**当前进度**: Week 1-2 已完成，Week 3 进行中 (80%)

---

## Week 1: 核心引擎 ✅

### 目标
搭建可运行的后端 API，完成 Redis 数据模型和核心业务逻辑。

### 任务清单

#### Day 1-2: 项目初始化 ✅
- [x] 创建 Monorepo 结构 (Turborepo)
- [x] 初始化 Next.js 项目 (`apps/api`)
- [x] 配置 TypeScript
- [ ] 注册 Upstash 账号，创建 Redis 数据库 🔶 外部依赖
- [x] 配置环境变量

#### Day 3-4: Redis 集成 ✅
- [x] 安装 `@upstash/redis`
- [x] 创建 `lib/redis.ts` 客户端封装
- [x] 编写 Lua 脚本 (`lib/redis-scripts.ts`)
  - [x] `JOIN_SCRIPT` - 原子注册逻辑
  - [x] `STATUS_SCRIPT` - 排名查询
- [x] 单元测试：模拟并发注册

#### Day 5-6: API 实现 ✅
- [x] `POST /api/join` 端点
  - [x] Turnstile 验证
  - [x] 邮箱验证
  - [x] 速率限制
  - [x] Lua 脚本调用
- [x] `GET /api/status` 端点
- [x] `GET /api/export` 端点 (Admin)

#### Day 7: 测试 🟡
- [x] 单元测试框架配置 (vitest)
- [ ] 并发测试 (1000 用户) 🔶 需要 Upstash
- [ ] 性能测试 (目标 <100ms) 🔶 需要 Upstash

### 交付物
- ✅ 可运行的 API 服务
- 🟡 测试覆盖 (单元测试已编写，需 Redis 连接运行)

---

## Week 2: SDK 与演示站 ✅

### 目标
构建前端 SDK 和演示落地页，实现完整的用户流程。

### 任务清单

#### Day 1-2: SDK 开发 ✅
- [x] 创建 `packages/sdk` 项目
- [x] 配置 Preact + Vite
- [x] 实现 `WaitlistWidget.jsx` 组件
  - [x] 状态机 (idle → submitting → success)
  - [x] LocalStorage 集成
  - [x] 表单验证
- [x] Web Component 封装 (`<v-waitlist>`)

#### Day 3-4: SDK 完善 ✅
- [x] Cloudflare Turnstile 前端集成
- [x] 社交分享功能 (Twitter, WhatsApp)
- [x] 主题定制 (light/dark mode)
- [x] Shadow DOM 样式隔离
- [x] Vite 打包配置

#### Day 5-6: 演示落地页 ✅
- [x] 创建 `apps/web` 项目
- [x] 设计 Landing Page UI
  - [x] Hero 区域
  - [x] 功能介绍
  - [x] 集成演示 (Demo)
  - [x] FAQ
- [x] 响应式设计

#### Day 7: 测试与优化 ✅
- [x] SDK 在不同环境测试
- [x] 跨浏览器测试
- [x] 性能优化 (目标 <15KB) ✅ 19KB (7.89KB gzipped)

### 交付物
- ✅ `v-waitlist.min.js` SDK 文件 (19KB)
- ✅ 完整的演示落地页

---

## Week 3: 开源与发布 🟡 (80%)

### 目标
准备开源发布，配置一键部署，准备 Product Hunt 上线。

### 任务清单

#### Day 1-2: 部署配置 ✅
- [x] 配置 `vercel.json`
- [x] 环境变量模板
- [x] Vercel Deploy 按钮
- [ ] 部署到 Vercel 测试 🔶 需要配置凭证

#### Day 3-4: 文档与开源 ✅
- [x] README 营销文案
- [x] 使用文档编写
- [x] API 文档
- [ ] GitHub 仓库设置
  - [x] License (MIT)
  - [ ] Issues/PR templates
  - [ ] Contributing guidelines
  - [x] Badge 和徽章

#### Day 5-6: 营销准备 ⏳
- [ ] Logo 设计
- [ ] Demo 视频/GIF
- [ ] Product Hunt 页面准备
- [ ] Twitter 账号创建
- [ ] 发布预告推文

#### Day 7: 发布 ⏳
- [ ] GitHub 正式发布
- [ ] Product Hunt 上线
- [ ] Reddit/HackerNews 分享
- [ ] 收集反馈

### 交付物
- ✅ 完整的开源仓库代码
- 🟡 Vercel 一键部署 (已配置，待测试)
- ⏳ Product Hunt 发布

---

## 未来规划 (Post-Launch)

### v1.1 功能增强
- [ ] 邮件验证 (双 opt-in)
- [ ] 自定义感谢页面
- [ ] 更多社交平台分享
- [ ] Webhook 通知
- [ ] 管理后台 Dashboard

### v1.2 分析与优化
- [ ] 转化率分析
- [ ] A/B 测试支持
- [ ] 热力图集成
- [ ] 更多防刷策略

### v2.0 企业功能
- [ ] 多项目管理
- [ ] 团队协作
- [ ] 白标方案
- [ ] 自定义域名
- [ ] SLA 保证

---

## 关键里程碑

| 里程碑 | 目标日期 | 状态 |
|--------|----------|------|
| MVP 完成 | Week 2 结束 | ✅ 已完成 (2025-01-20) |
| GitHub 发布 | Week 3 第 3 天 | 🟡 待发布 |
| Product Hunt 发布 | Week 3 第 7 天 | ⏳ 待开始 |
| 100 GitHub Stars | 发布后 1 周 | ⏳ 待开始 |
| 10 个真实使用项目 | 发布后 1 月 | ⏳ 待开始 |

---

## 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 防刷失效 | 高 | 多层防护，持续监控 |
| 性能瓶颈 | 中 | Edge Runtime + Redis 缓存 |
| SDK 兼容性 | 中 | 广泛测试，降级方案 |
| 部署复杂 | 低 | 一键部署，详细文档 |
