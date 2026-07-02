# 贡献指南

感谢你对 13F 智能分析平台的关注！本项目遵循成熟开源社区的协作规范。

**English contributors: see [CONTRIBUTING.md](./CONTRIBUTING.md)**

## 行为准则

请阅读并遵守 [行为准则](./CODE_OF_CONDUCT.md)。

## 如何贡献

### 报告 Bug

使用 [GitHub Issues](https://github.com/0xrushmoon/13f-analyzer/issues) 的 **Bug 报告** 模板，请包含：

- 复现步骤
- 预期行为 vs 实际行为
- 环境信息（操作系统、Node 版本、Wrangler 版本）

### 功能建议

使用 **功能请求** 模板提交 Issue，说明使用场景与建议方案。

### 提交 Pull Request

1. **Fork** 仓库，从 `main` 创建分支
2. **安装**依赖：`pnpm install`
3. **开发**时保持提交清晰、聚焦
4. **本地验证**：
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```
5. 使用 PR 模板 **提交 Pull Request**，关联相关 Issue

### Commit 规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 添加机构搜索筛选
fix: 修复 13F 修正申报 XML 解析
docs: 更新 Cloudflare 部署文档
chore: 升级 wrangler 至 4.x
```

### 国际化 (i18n)

界面文案位于 `src/lib/i18n/dictionaries/`。新增用户可见文本时：

- 在 `en.ts` 和 `zh-CN.ts` 中 **同时** 添加对应键
- 保持各语言键名一致
- 使用页头语言切换器验证中英文

### 安全披露

请勿在公开 Issue 中报告安全漏洞，请参阅 [SECURITY.md](./SECURITY.md)。

## 许可证

贡献即表示你同意将代码以 [MIT 许可证](./LICENSE) 发布。
