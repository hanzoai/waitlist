# API 设计 | API Design

## 概述

V-Waitlist 提供三个核心 API 端点，所有端点运行在 Vercel Edge Runtime 上。

---

## 1. POST /api/join

用户加入等待名单，支持推荐跟踪。

### 请求

```http
POST /api/join
Content-Type: application/json

{
  "email": "user@example.com",
  "projectId": "xyz",
  "referrerCode": "abc12345",  // 可选，推荐人的邀请码
  "turnstileToken": "0x..."     // Cloudflare Turnstile 验证令牌
}
```

### 响应 (成功)

```json
{
  "success": true,
  "refCode": "def67890",         // 用户的专属邀请码
  "rank": 543,                    // 当前排名
  "total": 1002,                  // 总人数
  "shareUrl": "https://example.com?ref=def67890"
}
```

### 响应 (已存在)

```json
{
  "success": false,
  "error": "ALREADY_JOINED",
  "existingUser": {
    "refCode": "def67890",
    "rank": 543
  }
}
```

### 处理流程

```
1. 验证 Turnstile Token (防机器人)
   └─> 失败返回 400 错误

2. 验证邮箱格式 + 过滤一次性邮箱
   └─> 失败返回 400 错误

3. 速率限制检查 (5次/小时/IP)
   └─> 超限返回 429 错误

4. 执行 Lua 脚本 (原子操作)
   ├─ 检查用户是否已存在
   ├─ 处理推荐逻辑 (给推荐人加分)
   ├─ 注册新用户
   ├─ 写入用户 Hash
   └─ 建立邀请码映射

5. 计算即时排名
   ├─ ZREVRANK 获取排名索引
   └─ ZCARD 获取总人数

6. 返回结果
```

### 错误码

| 错误码 | 说明 |
|--------|------|
| `INVALID_EMAIL` | 邮箱格式无效 |
| `DISPOSABLE_EMAIL` | 一次性邮箱域名 |
| `INVALIDturnstile` | Turnstile 验证失败 |
| `RATE_LIMITED` | 超过速率限制 |
| `ALREADY_JOINED` | 邮箱已加入 |

---

## 2. GET /api/status

查询用户当前的等待名单状态。

### 请求

```http
GET /api/status?email=user@example.com&projectId=xyz
```

### 响应

```json
{
  "success": true,
  "rank": 543,           // 当前排名 (1-based)
  "total": 1002,         // 总人数
  "aheadOf": 459,        // 排在后面的人数
  "refCode": "abc12345",
  "referralCount": 3,    // 推荐的人数
  "shareUrl": "https://example.com?ref=abc12345"
}
```

### 响应 (未找到)

```json
{
  "success": false,
  "error": "NOT_FOUND"
}
```

### 处理流程

```
1. ZREVRANK waitlist:leaderboard:{projectId} {email}
   └─ 返回排名索引 (0-based)

2. ZCARD waitlist:leaderboard:{projectId}
   └─ 返回总人数

3. 计算排名 = 索引 + 1
   计算 aheadOf = 总人数 - 排名

4. 返回结果
```

---

## 3. GET /api/export

导出等待名单数据为 CSV (仅管理员)。

### 请求

```http
GET /api/export?projectId=xyz
Authorization: Bearer {ADMIN_SECRET_KEY}
```

### 响应

```http
Content-Type: text/csv
Content-Disposition: attachment; filename="waitlist-xyz-20250120.csv"

email,ref_code,referred_by,referral_count,created_at,rank
user1@example.com,abc12345,,5,2025-01-19T10:30:00Z,10
user2@example.com,def67890,abc12345,0,2025-01-19T11:00:00Z,23
...
```

### 处理流程

```
1. 验证 Admin Secret Key
   └─ 失败返回 401

2. 遍历 ZSET waitlist:leaderboard:{projectId}
   └─ 获取所有邮箱

3. 对每个邮箱获取 HASH user:{projectId}:{email}

4. 生成 CSV

5. 返回文件下载
```

---

## 数据结构

### Redis Keys

| 类型 | Key 格式 | 用途 |
|------|----------|------|
| ZSET | `waitlist:leaderboard:{project_id}` | 排行榜 |
| HASH | `user:{project_id}:{email}` | 用户详情 |
| STRING | `ref:{project_id}:{ref_code}` | 邀请码→邮箱映射 |

### 排名分数算法

```
Score = (Referral_Count × 1,000,000) + (Max_Timestamp - Current_Timestamp)
```

- 推荐人数越多，分数越高 (权重: 1,000,000)
- 相同推荐数时，注册越早排名越靠前
