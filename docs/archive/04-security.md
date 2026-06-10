# 安全与防刷 | Security & Anti-Abuse

## 概述

病毒式等待名单系统容易成为刷单攻击的目标。必须在 MVP 阶段就部署多层防护措施。

---

## 防护层级

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 1: 前端验证                      │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │ Cloudflare         │  │ 表单验证                 │   │
│  │ Turnstile          │  │ (邮箱格式、必填项)        │   │
│  └────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Layer 2: 后端验证                      │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │ Turnstile Token    │  │ 邮箱域名黑名单           │   │
│  │ 服务端验证          │  │ (disposable email)       │   │
│  └────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Layer 3: 速率限制                      │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │ IP 速率限制         │  │ 异常活动检测             │   │
│  │ (5次/小时)          │  │ (同IP同邀请码>10次)      │   │
│  └────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Layer 4: 数据层                        │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │ Redis 原子操作      │  │ 幂等性保证               │   │
│  │ (Lua 脚本)          │  │ (重复注册返回 EXISTS)    │   │
│  └────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Cloudflare Turnstile

### 前端集成

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div class="cf-turnstile" data-site-id="YOUR_SITE_KEY"></div>
```

### 后端验证

```typescript
// POST /api/join
const response = await fetch(
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  {
    method: 'POST',
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: turnstileToken
    })
  }
);

const result = await response.json();
if (!result.success) {
  return NextResponse.json({ error: 'INVALID_CAPTCHA' }, { status: 400 });
}
```

---

## 2. 速率限制

### Upstash RateLimit 配置

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1h'), // 5次/小时
  analytics: true
});

// 使用
const { success } = await ratelimit.limit(`waitlist:join:${ip}`);
if (!success) {
  return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
}
```

---

## 3. 一次性邮箱黑名单

### 常见一次性邮箱域名

```
tempmail.com
guerrillamail.com
10minutemail.com
mailinator.com
trashmail.com
...
```

### 实现

```typescript
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  // ... 更多域名
];

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}
```

### 进阶: 使用外部 API

```typescript
// https://open.kickbox.com/ (Free tier available)
async function verifyEmail(email: string) {
  const response = await fetch(
    `https://open.kickbox.com/v1/disposable/${email}`
  );
  const data = await response.json();
  return data.disposable === false;
}
```

---

## 4. 异常活动检测

### 同 IP 异常推荐

```typescript
// 检测: 同一 IP 在短时间内为同一邀请码贡献超过 10 个推荐
const ipRefCount = await redis.incr(`suspicious:ip:${ip}:ref:${referrerCode}`);

if (ipRefCount > 10) {
  // 标记为可疑，暂存起来人工审核
  await redis.sadd(`suspicious:ref:${referrerCode}`, ip);
  return NextResponse.json(
    { error: 'SUSPICIOUS_ACTIVITY' },
    { status: 403 }
  );
}
```

### 蜜罐检测

```typescript
// 在表单中添加隐藏字段，机器人会填写但人类看不到
if (formData.honeypot !== '') {
  // 静默返回成功，但不实际处理
  return NextResponse.json({ success: true });
}
```

---

## 5. 数据层防护

### Lua 脚本原子操作

确保在高并发下数据一致性：

```lua
-- 幂等性检查
local existingScore = redis.call('ZSCORE', leaderboardKey, email)
if existingScore then
  return "EXISTS"
end

-- 原子操作：加分 + 注册
redis.call('ZINCRBY', leaderboardKey, 1, referrerEmail)
redis.call('ZADD', leaderboardKey, 0, email)
```

### Redis Key 设计

```
waitlist:leaderboard:{project_id}    # ZSET - 排行榜
user:{project_id}:{email}            # HASH - 用户详情
ref:{project_id}:{ref_code}          # STRING - 邀请码映射
suspicious:ip:{ip}:ref:{ref_code}    # STRING - 可疑活动计数
suspicious:ref:{ref_code}            # SET - 可疑邀请码的 IP 集合
```

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `UPSTASH_REDIS_REST_URL` | 是 | Redis REST API 地址 |
| `UPSTASH_REDIS_REST_TOKEN` | 是 | Redis 认证令牌 |
| `TURNSTILE_SITE_KEY` | 是 | Turnstile Site Key (前端用) |
| `TURNSTILE_SECRET_KEY` | 是 | Turnstile Secret Key (后端用) |
| `ADMIN_SECRET_KEY` | 是 | 导出 API 的管理密钥 |

---

## 安全清单

- [ ] Cloudflare Turnstile 集成
- [ ] Turnstile 服务端验证
- [ ] IP 速率限制 (5次/小时)
- [ ] 一次性邮箱黑名单
- [ ] 异常活动检测
- [ ] Redis Lua 脚本原子操作
- [ ] 幂等性保证
- [ ] 管理员 API 密钥保护
- [ ] HTTPS 强制 (Vercel 自动)
- [ ] CORS 配置
- [ ] 输入验证和清理
