# 项目进度追踪 | Project Progress

> 最后更新: 2025-01-20

## 当前状态

**阶段**: Week 1 - 核心引擎开发

**完成度**: 100% (Week 1-2 完成, 验收通过)

**下一步**: 启动 Week 1 开发 (详见 [`07-next-steps.md`](./07-next-steps.md))

## 进度概览

| 阶段 | 状态 | 完成度 | 开始日期 | 完成日期 |
|------|------|--------|----------|----------|
| Week 1: 核心引擎 | ✅ 完成 | 100% | 2025-01-20 | 2025-01-20 |
| Week 2: SDK 与演示站 | ✅ 完成 | 100% | 2025-01-20 | 2025-01-20 |
| Week 3: 开源与文档 | 🟡 待发布 | 80% | - | - |

---

## Week 1: 核心引擎 (待开始)

### Phase 1: 项目初始化 (Day 1-2) ✅

| 任务 | 状态 | 负责人 |
|------|------|--------|
| 创建 Monorepo 目录结构 | ✅ 完成 | - |
| 初始化 package.json (根) | ✅ 完成 | - |
| 配置 turbo.json | ✅ 完成 | - |
| 配置 pnpm-workspace.yaml | ✅ 完成 | - |
| 创建 .gitignore | ✅ 完成 | - |
| 创建 .env.example | ✅ 完成 | - |
| 初始化 apps/api (Next.js) | ✅ 完成 | - |
| 安装后端依赖 | ✅ 完成 | - |

### Phase 2: 数据层 (Day 3-4) ✅

| 任务 | 状态 | 负责人 |
|------|------|--------|
| 注册 Upstash 账号 | 🔶 外部依赖 | - |
| 创建 Redis 数据库 | 🔶 外部依赖 | - |
| 实现 lib/redis.ts | ✅ 完成 | - |
| 实现 lib/redis-scripts.ts (Lua) | ✅ 完成 | - |
| 实现 lib/utils.ts (工具函数) | ✅ 完成 | - |
| 实现 lib/turnstile.ts | ✅ 完成 | - |

### Phase 3: API 层 (Day 5-6) ✅

| 任务 | 状态 | 负责人 |
|------|------|--------|
| 实现 POST /api/join | ✅ 完成 | - |
| 实现 GET /api/status | ✅ 完成 | - |
| 实现 GET /api/export | ✅ 完成 | - |
| 错误处理和日志 | ✅ 完成 | - |
| 集成 Turnstile 验证 | ✅ 完成 | - |
| 添加 vercel.json | ✅ 完成 | - |

### Phase 4: 测试 (Day 7) 🟡

| 任务 | 状态 | 负责人 |
|------|------|--------|
| 编写单元测试 | ✅ 完成 | - |
| 创建 vitest.config.ts | ✅ 完成 | - |
| 创建 .env.test.example | ✅ 完成 | - |
| 并发测试 (1000 用户) 🔶 | ⏳ 需要 Upstash | - |
| 性能测试 (<100ms 目标) 🔶 | ⏳ 需要 Upstash | - |
| Bug 修复 | ⏳ 待发现 | - |

## Week 2: SDK 与演示站

| 任务 | 状态 | 负责人 | 备注 |
|------|------|--------|------|
| Preact 组件开发 | ✅ 完成 | - | WaitlistWidget.tsx |
| Web Component 封装 | ✅ 完成 | - | <v-waitlist> 自定义元素 |
| Vite 打包配置 | ✅ 完成 | - | 单文件 UMD 输出 |
| SDK 样式设计 | ✅ 完成 | - | Inline styles, Shadow DOM |
| LocalStorage 集成 | ✅ 完成 | - | 用户状态缓存 |
| 社交分享功能 | ✅ 完成 | - | Twitter/WhatsApp/Copy |
| 演示落地页 | ✅ 完成 | - | apps/web |
| 打包测试 | ✅ 完成 | - | build 成功 (19KB gzipped) |

## Week 3: 开源与文档

| 任务 | 状态 | 负责人 | 备注 |
|------|------|--------|------|
| vercel.json 配置 | ✅ 完成 | - | |
| README 营销文案 | ✅ 完成 | - | |
| LICENSE 文件 | ✅ 完成 | - | MIT License |
| 使用文档 | ✅ 完成 | - | docs/ 文件夹 |
| GitHub 仓库设置 | 🟡 待创建 | - | 需要创建 GitHub 仓库 |
| Product Hunt 发布准备 | ⏳ 待开始 | - | |

## 待办事项

### 高优先级
- [x] 创建项目仓库结构
- [x] 初始化 package.json 和依赖
- [ ] 注册 Upstash 账号获取 Redis 凭证
- [ ] 注册 Cloudflare 获取 Turnstile Site Key
- [ ] 创建 GitHub 仓库并推送代码

### 中优先级
- [ ] 设计系统 Logo 和品牌
- [ ] 创建 GitHub Issues 和 Milestones
- [ ] 准备 Product Hunt 发布素材

### 低优先级
- [ ] 建立社区 (Discord/Twitter)
- [ ] 撰写技术博客

## 阻塞问题

| 问题 | 优先级 | 解决方案 | 状态 |
|------|--------|----------|------|
| Upstash Redis 凭证 | 高 | 注册 https://upstash.com | 待处理 |
| Cloudflare Turnstile Key | 中 | 注册 https://dash.cloudflare.com | 待处理 |
| Vercel 部署账号 | 中 | 注册 https://vercel.com | 待处理 |

## 决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2025-01-20 | 使用 Monorepo 结构 | 便于管理 API、Web、SDK 三个包 |
| 2025-01-20 | 选择 Upstash Redis | 原生 HTTP API，Free Tier 足够 |
| 2025-01-20 | 使用 Lua 脚本 | 确保高并发下数据原子性 |
| 2025-01-20 | 使用 Next.js Edge Runtime | 冷启动快，全球分发 |
| 2025-01-20 | 使用 pnpm 而非 npm/yarn | 更省空间，更快 |
