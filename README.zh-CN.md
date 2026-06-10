# Hanzo Waitlist

[English](./README.md)

单色、品牌中立的病毒式等待名单。包内无 logo、无品牌色、无任何嵌入的
品牌标识 —— 每个使用方自行提供。由 [Hanzo Base](https://github.com/hanzoai/base)
提供后端;不依赖 Redis,不依赖第三方 SaaS。

```tsx
import { Waitlist } from '@hanzo/waitlist'
import '@hanzo/waitlist/styles.css'

<Waitlist waitlist="my-product" baseUrl="https://api.example.com" />
```

## 仓库结构

| 路径                          | 内容 |
|-------------------------------|------|
| `packages/widget/`            | `@hanzo/waitlist` —— React 组件、原生客户端、自定义元素 |
| `apps/web/`                   | 演示站点(Next.js),可一键切换品牌 |
| `docs/`                       | [架构](./docs/architecture.md)、[API](./docs/api.md)、[组件](./docs/widget.md) |

服务端代码在另一仓库:`~/work/hanzo/base` 下的 `plugins/waitlist/`。
在任意 Base 进程中注册:

```go
import "github.com/hanzoai/base/plugins/waitlist"

waitlist.MustRegister(app, waitlist.Config{
    Enabled:         true,
    TurnstileSecret: os.Getenv("TURNSTILE_SECRET_KEY"),
    AdminSecret:     os.Getenv("WAITLIST_ADMIN_SECRET"),
})
```

首次启动时自动创建两张集合(`waitlists`、`waitlist_entries`),并在
`/v1/waitlist` 下挂载三个端点。

## 本地开发

```bash
pnpm install
pnpm --filter @hanzo/waitlist build

# 终端 1:后端(内存版参考实现)
pnpm --filter @hanzo/waitlist-mock-api dev   # 监听 :8090

# 终端 2:演示
NEXT_PUBLIC_BASE_URL=http://localhost:8090 \
  pnpm --filter @hanzo/waitlist-demo dev     # http://localhost:3000
```

生产环境把 `mock-api` 换成注册了 `plugins/waitlist` 的真正 Base 实例
即可。Mock 实现的就是 `/v1/waitlist/{join,status,export}` 那份契约
—— 既是演示后端,也是可执行的规范。

## 主题

组件内部不写任何品牌色。在你自定义的祖先元素 class 上覆盖变量:

```css
.your-brand {
  --hw-accent: <品牌色>;
  --hw-accent-fg: <品牌色之上的文字色>;
  --hw-radius: <圆角>;
}
```

Logo、标题、任何品牌身份都由宿主页面负责。组件本身完全中立。

完整变量列表见 [`docs/widget.md`](./docs/widget.md)。

## API

| 端点                            | 用途 |
|--------------------------------|------|
| `POST /v1/waitlist/join`       | 注册条目,原子地为推荐人记一票 |
| `GET /v1/waitlist/status`      | 查询当前排名 / 分享链接 |
| `GET /v1/waitlist/export`      | 管理员 CSV 导出(超级用户或共享密钥) |

报文格式见 [`docs/api.md`](./docs/api.md)。

## 许可

MIT。
