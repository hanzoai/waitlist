# 下一步开发计划 | Next Steps

> 最后更新: 2025-01-20
> 当前阶段: Week 1 - 核心引擎开发

---

## 总览

根据当前项目进度（规划阶段，0% 完成），下一步将启动 **Week 1: 核心引擎** 开发。

```
┌─────────────────────────────────────────────────────────────┐
│                     Phase 1: 项目初始化                       │
│  创建 Monorepo 结构 · 配置开发环境 · 基础设施搭建             │
├─────────────────────────────────────────────────────────────┤
│                     Phase 2: 数据层                          │
│  Redis 集成 · Lua 脚本 · 数据模型实现                        │
├─────────────────────────────────────────────────────────────┤
│                     Phase 3: API 层                          │
│  /api/join · /api/status · /api/export                     │
├─────────────────────────────────────────────────────────────┤
│                     Phase 4: 测试                            │
│  单元测试 · 并发测试 · 手动验证                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 项目初始化 (Day 1-2)

### 1.1 创建 Monorepo 结构

```bash
# 安装 Turborepo (如果未安装)
pnpm add turbo -Dw

# 创建目录结构
mkdir -p apps/api apps/web packages/sdk
```

**文件清单:**

| 文件 | 用途 |
|------|------|
| `package.json` | 根依赖管理 |
| `turbo.json` | Turborepo 配置 |
| `pnpm-workspace.yaml` | PNPM workspace 配置 |
| `.gitignore` | Git 忽略规则 |
| `.env.example` | 环境变量模板 |

### 1.2 根 package.json

```json
{
  "name": "v-waitlist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0",
    "prettier": "^3.0.0",
    "eslint": "^8.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### 1.3 turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

### 1.4 初始化 apps/api

```bash
cd apps/api
pnpm create next-app . --typescript --tailwind --app --no-src-dir
```

**依赖安装:**

```bash
# Upstash Redis
pnpm add @upstash/redis @upstash/ratelimit

# 工具库
pnpm add nanoid

# 开发依赖
pnpm add -D @types/node tsx vitest
```

### 1.5 配置文件

**apps/api/package.json:**

```json
{
  "name": "@v-waitlist/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest"
  },
  "dependencies": {
    "@upstash/redis": "^1.34.0",
    "@upstash/ratelimit": "^1.0.0",
    "nanoid": "^5.0.0",
    "next": "^14.0.0"
  }
}
```

### 1.6 环境变量

**apps/api/.env.local:**

```bash
# Upstash Redis (从 https://upstash.com 获取)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXX...

# Cloudflare Turnstile (从 https://dash.cloudflare.com 获取)
TURNSTILE_SITE_KEY=0x...
TURNSTILE_SECRET_KEY=0x...

# Admin (用于导出 API)
ADMIN_SECRET_KEY=your-secret-key-here
```

---

## Phase 2: 数据层 (Day 3-4)

### 2.1 Redis 客户端封装

**文件:** `apps/api/lib/redis.ts`

```typescript
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### 2.2 Lua 脚本 (核心逻辑)

**文件:** `apps/api/lib/redis-scripts.ts`

```typescript
// 原子注册脚本
export const JOIN_SCRIPT = `
local leaderboardKey = KEYS[1]
local userHashPrefix = KEYS[2]
local refMapKey = KEYS[3]

local email = ARGV[1]
local userRefCode = ARGV[2]
local referrerCode = ARGV[3]
local timestamp = ARGV[4]

-- 幂等性检查
local existingScore = redis.call('ZSCORE', leaderboardKey, email)
if existingScore then
  return "EXISTS"
end

-- 处理推荐逻辑
local referrerEmail = nil
if referrerCode ~= "" then
  referrerEmail = redis.call('GET', refMapKey .. referrerCode)
  if referrerEmail then
    redis.call('ZINCRBY', leaderboardKey, 1, referrerEmail)
  end
end

-- 注册新用户
redis.call('ZADD', leaderboardKey, 0, email)

-- 写入用户详情
local userKey = userHashPrefix .. email
redis.call('HSET', userKey, 'ref_code', userRefCode, 'created_at', timestamp)
if referrerEmail then
  redis.call('HSET', userKey, 'referred_by', referrerEmail)
end

-- 建立映射
redis.call('SET', refMapKey .. userRefCode, email)

return "OK"
`;
```

### 2.3 工具函数

**文件:** `apps/api/lib/utils.ts`

```typescript
import { customAlphabet } from 'nanoid';

// 生成邀请码 (排除易混淆字符)
export const generateRefCode = customAlphabet(
  '6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz',
  8
);

// 一次性邮箱域名黑名单
export const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'trashmail.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

---

## Phase 3: API 层 (Day 5-6)

### 3.1 POST /api/join

**文件:** `apps/api/app/api/join/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { generateRefCode, isDisposableEmail, isValidEmail } from '@/lib/utils';
import { JOIN_SCRIPT } from '@/lib/redis-scripts';

export const runtime = 'edge';

// 速率限制
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1h'),
});

export async function POST(req: NextRequest) {
  try {
    const { email, projectId, referrerCode, turnstileToken } = await req.json();

    // 1. 验证输入
    if (!email || !projectId) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: 'DISPOSABLE_EMAIL' },
        { status: 400 }
      );
    }

    // 2. 速率限制
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const { success } = await ratelimit.limit(`waitlist:join:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    // 3. TODO: 验证 Turnstile Token

    // 4. 执行 Lua 脚本
    const userRefCode = generateRefCode();
    const result = await redis.eval(
      JOIN_SCRIPT,
      [
        `waitlist:leaderboard:${projectId}`,
        `user:${projectId}:`,
        `ref:${projectId}:`,
      ],
      [email, userRefCode, referrerCode || '', Date.now()]
    );

    if (result === 'EXISTS') {
      const existingUser = await redis.hget(`user:${projectId}:${email}`, 'ref_code');
      return NextResponse.json({
        success: false,
        error: 'ALREADY_JOINED',
        existingUser: { refCode: existingUser },
      });
    }

    // 5. 获取排名
    const rankIndex = await redis.zrevrank(`waitlist:leaderboard:${projectId}`, email);
    const total = await redis.zcard(`waitlist:leaderboard:${projectId}`);
    const rank = (rankIndex !== null ? rankIndex : total) + 1;

    return NextResponse.json({
      success: true,
      refCode: userRefCode,
      rank,
      total,
      shareUrl: `?ref=${userRefCode}`,
    });

  } catch (error) {
    console.error('Join error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

### 3.2 GET /api/status

**文件:** `apps/api/app/api/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const email = searchParams.get('email');
  const projectId = searchParams.get('projectId');

  if (!email || !projectId) {
    return NextResponse.json(
      { error: 'MISSING_PARAMS' },
      { status: 400 }
    );
  }

  // 获取排名
  const rankIndex = await redis.zrevrank(`waitlist:leaderboard:${projectId}`, email);

  if (rankIndex === null) {
    return NextResponse.json(
      { success: false, error: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // 获取总人数
  const total = await redis.zcard(`waitlist:leaderboard:${projectId}`);

  // 获取用户详情
  const user = await redis.hgetall(`user:${projectId}:${email}`);

  return NextResponse.json({
    success: true,
    rank: rankIndex + 1,
    total,
    aheadOf: total - rankIndex - 1,
    refCode: user.ref_code,
    shareUrl: `?ref=${user.ref_code}`,
  });
}
```

### 3.3 GET /api/export

**文件:** `apps/api/app/api/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const authHeader = req.headers.get('authorization');

  // 验证管理员密钥
  const expectedKey = process.env.ADMIN_SECRET_KEY;
  if (authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // 获取所有用户
  const members = await redis.zrevrange(
    `waitlist:leaderboard:${projectId}`,
    0,
    -1,
    { withScores: true }
  );

  // 构建 CSV
  const rows = ['email,ref_code,referred_by,referral_count,created_at,rank'];

  for (let i = 0; i < members.length; i += 2) {
    const email = members[i];
    const score = members[i + 1];
    const user = await redis.hgetall(`user:${projectId}:${email}`);

    rows.push(
      [
        email,
        user.ref_code || '',
        user.referred_by || '',
        Math.floor(score),
        user.created_at || '',
        Math.floor(i / 2) + 1,
      ].join(',')
    );
  }

  const csv = rows.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="waitlist-${projectId}-${Date.now()}.csv"`,
    },
  });
}
```

---

## Phase 4: 测试 (Day 7)

### 4.1 单元测试

**文件:** `apps/api/tests/join.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('API: /api/join', () => {
  it('should register a new user', async () => {
    const response = await fetch('http://localhost:3000/api/join', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        projectId: 'test-project',
      }),
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.refCode).toBeDefined();
    expect(data.rank).toBe(1);
  });

  it('should handle duplicate email', async () => {
    const body = {
      email: 'test@example.com',
      projectId: 'test-project',
    };

    await fetch('http://localhost:3000/api/join', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const response = await fetch('http://localhost:3000/api/join', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = await response.json();
    expect(data.error).toBe('ALREADY_JOINED');
  });

  it('should increment referrer score', async () => {
    // First user
    const res1 = await fetch('http://localhost:3000/api/join', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user1@example.com',
        projectId: 'test-project',
      }),
    });
    const { refCode } = await res1.json();

    // Referred user
    const res2 = await fetch('http://localhost:3000/api/join', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user2@example.com',
        projectId: 'test-project',
        referrerCode: refCode,
      }),
    });

    // Check user1's rank improved
    const status = await fetch(
      `http://localhost:3000/api/status?email=user1@example.com&projectId=test-project`
    );
    const data = await status.json();
    expect(data.rank).toBe(1); // Should be first due to referral
  });
});
```

### 4.2 测试命令

```bash
# 运行测试
pnpm test

# 开发模式
pnpm dev

# 构建
pnpm build
```

---

## 执行清单

### 第 1 天
- [ ] 创建 Monorepo 目录结构
- [ ] 初始化 `package.json` 和 `turbo.json`
- [ ] 创建 `apps/api` Next.js 项目
- [ ] 配置 TypeScript
- [ ] 创建 `.env.example`

### 第 2 天
- [ ] 安装依赖 (@upstash/redis, nanoid 等)
- [ ] 注册 Upstash 账号
- [ ] 创建 Redis 数据库
- [ ] 配置环境变量

### 第 3 天
- [ ] 实现 `lib/redis.ts`
- [ ] 实现 `lib/redis-scripts.ts` (Lua 脚本)
- [ ] 实现 `lib/utils.ts` (工具函数)

### 第 4 天
- [ ] 测试 Redis 连接
- [ ] 手动测试 Lua 脚本逻辑
- [ ] 编写 Redis 相关单元测试

### 第 5 天
- [ ] 实现 `POST /api/join`
- [ ] 实现 `GET /api/status`
- [ ] 本地测试 API 端点

### 第 6 天
- [ ] 实现 `GET /api/export`
- [ ] 添加错误处理
- [ ] 添加日志

### 第 7 天
- [ ] 编写完整单元测试
- [ ] 并发测试 (1000 模拟用户)
- [ ] 性能测试 (目标 <100ms)
- [ ] 修复发现的问题

---

## 阻塞问题处理

| 问题 | 解决方案 | 状态 |
|------|----------|------|
| Upstash 账号 | 注册 https://upstash.com | 待处理 |
| Cloudflare Turnstile | 注册 https://dash.cloudflare.com | 待处理 |
| Redis 连接测试 | 使用 Upstash Console 测试 | 待处理 |

---

## 下一步行动

1. **立即开始**: 执行 Phase 1，创建项目结构
2. **外部依赖**: 注册 Upstash 和 Cloudflare 账号
3. **每日同步**: 更新 `00-progress.md` 中的任务状态
