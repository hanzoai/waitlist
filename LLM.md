# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

**Hanzo Waitlist** 是单色、品牌中立的等待名单组件。包内零品牌色、
零 logo、零身份标识 —— 每个使用方自行实现品牌层(变量覆盖)。

- **前端**: React 组件 + 原生 fetch 客户端 + Web Component 三种入口,
  以 `@hanzo/waitlist` 名义发布,位于 `packages/widget/`。
- **后端**: Hanzo Base 插件,位于 `~/work/hanzo/base/plugins/waitlist/`。
  不依赖 Redis、Upstash 或任何第三方 SaaS。
- **演示站点**: `apps/web/`(Next.js)。

## 架构原则

1. **一种做法**: 后端逻辑全部集中在一个 Go 插件里。前端只有一个组件
   包,既输出 React、又输出 vanilla 客户端、又输出 `<hanzo-waitlist>`
   自定义元素 —— 同一份源码,三个出口。
2. **单色**: 组件内部不写任何品牌色。所有颜色都派生自 `--hw-*` CSS
   变量,默认走中性色。任何品牌想要自定义,覆盖几个变量即可。
3. **原子性**: 推荐计数 / 邀请码分配 / 条目持久化全部在 SQL 事务里
   完成(`app.RunInTransaction`),并发竞争由 SQLite 解决,不需要
   Redis Lua 脚本。

## 仓库结构

```
packages/widget/        @hanzo/waitlist 源码
apps/web/               演示站点(Next.js + React 19)
docs/                   architecture / api / widget 三份文档
docs/archive/           历史规划文档(已归档)
```

服务端在另一个仓库:`~/work/hanzo/base/plugins/waitlist/`。

## 数据模型(Base 集合)

| 集合 | 字段 |
|------|------|
| `waitlists` | id, slug(唯一), name, createdAt, updatedAt |
| `waitlist_entries` | id, waitlist→relation, email, refCode, referredBy, referralCount, createdAt |

索引:`UNIQUE(waitlist,email)`、`UNIQUE(waitlist,refCode)`、
`(waitlist, referralCount DESC, createdAt ASC)`。

## API 端点

- `POST /v1/waitlist/join` 注册条目,可带 `referrerCode` 与 Turnstile token
- `GET /v1/waitlist/status?waitlist=&email=` 查询排名
- `GET /v1/waitlist/export?waitlist=` 管理员导出 CSV(超级用户或共享密钥)

## 防滥用

- Cloudflare Turnstile 验证(可选,留空则跳过)
- 进程内滑动窗口限流(默认 5 次/IP/小时)
- 一次性邮箱域名拦截

## 环境变量

演示站点(`apps/web/.env.local`):
- `NEXT_PUBLIC_BASE_URL` 指向 Base 实例
- `NEXT_PUBLIC_WAITLIST_SLUG` 默认 `demo`

Base 服务端:
- `TURNSTILE_SECRET_KEY` (可选)
- `WAITLIST_ADMIN_SECRET` (可选,启用共享密钥导出)

## 开发命令

```bash
pnpm install
pnpm --filter @hanzo/waitlist dev          # 组件库 Vite dev
pnpm --filter @hanzo/waitlist typecheck    # tsc 校验
pnpm --filter @hanzo/waitlist build        # 输出 dist/
pnpm --filter @hanzo/waitlist-demo dev     # Next.js 演示站点
```

## 不要做的事

- 不要重新引入 Redis / Upstash。Base 即数据库,SQL 事务即原子性。
- 不要在组件源码里写任何具体颜色值;品牌色全部走 CSS 变量。
- 不要为每个品牌写单独的组件包;参数化即可。
- 不要在组件里挂载 Turnstile —— 站点宿主负责挂载,组件只接 token。
