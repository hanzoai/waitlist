# 清理记录 | Cleanup Notes

> 本文档记录项目中发现的冗余、过期、错误、无效内容及其处理状态。

## 2025-01-20: 文档重组

### 已处理

| 内容 | 问题 | 处理方式 |
|------|------|----------|
| README.md (原始版本) | 内容过于详细，中文技术规范不适合作为项目首页 | 归档到 `docs/archive/original-spec-zh.md` |
| CLAUDE.md | 需要中文版本 | 已翻译为中文 |

### 当前状态

项目处于**规划阶段**，暂无代码实现。以下内容尚未创建：

| 类别 | 状态 |
|------|------|
| 源代码 | 不存在 |
| 测试代码 | 不存在 |
| 配置文件 | 不存在 |
| 脚本文件 | 不存在 |

---

## 待创建的文件

### 根目录
- [ ] `package.json` - 项目依赖管理
- [ ] `turbo.json` - Turborepo 配置
- [ ] `vercel.json` - Vercel 部署配置
- [ ] `.env.example` - 环境变量模板
- [ ] `.gitignore` - Git 忽略规则
- [ ] `LICENSE` - MIT License

### apps/api (待创建)
- [ ] `package.json`
- [ ] `next.config.js`
- [ ] `app/api/join/route.ts`
- [ ] `app/api/status/route.ts`
- [ ] `app/api/export/route.ts`
- [ ] `lib/redis.ts`
- [ ] `lib/redis-scripts.ts`

### apps/web (待创建)
- [ ] `package.json`
- [ ] Landing page 组件

### packages/sdk (待创建)
- [ ] `package.json`
- [ ] `vite.config.js`
- [ ] `src/main.js`
- [ ] `src/components/WaitlistWidget.jsx`

---

## 代码规范 (待实施)

### TypeScript
- 使用 strict mode
- 所有函数添加类型注解
- 接口定义放在 `types/` 目录

### 命名约定
- 组件: PascalCase
- 函数: camelCase
- 常量: UPPER_SNAKE_CASE
- 文件名: kebab-case

### Git 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

---

## 后续清理计划

在开发过程中需要关注：

1. **依赖管理**
   - 定期更新依赖
   - 移除未使用的包
   - 使用 pnpm 替代 npm/yarn (更省空间)

2. **代码质量**
   - ESLint 配置
   - Prettier 配置
   - Pre-commit hooks (Husky)

3. **文档同步**
   - API 变更时更新文档
   - 重大变更更新 CHANGELOG

4. **安全性**
   - 定期审计依赖
   - 确保 .env 不被提交
   - API 密钥使用环境变量
