# Contributing to 13F Intelligence Platform

Thank you for your interest in contributing! This project follows practices used by mature open-source communities.

**中文贡献指南请参阅 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)**

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## How to Contribute

### Report Bugs

Use [GitHub Issues](https://github.com/0xrushmoon/13f-analyzer/issues) with the **Bug report** template. Include:

- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, Wrangler version)

### Suggest Features

Open an issue with the **Feature request** template. Explain the use case and proposed solution.

### Pull Requests

1. **Fork** the repository and create a branch from `main`
2. **Install** dependencies: `pnpm install`
3. **Develop** with clear, focused commits
4. **Verify** locally:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```
5. **Open a PR** using our template; link related issues

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add institution search filter
fix: correct 13F XML parser for amended filings
docs: update Cloudflare deployment guide
chore: bump wrangler to 4.x
```

### Internationalization (i18n)

UI strings live in `src/lib/i18n/dictionaries/`. When adding user-facing text:

- Add keys to **both** `en.ts` and `zh-CN.ts`
- Keep keys identical across locales
- Use the header language switcher to verify both languages

### Project Structure

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js pages & API routes |
| `src/lib/sec/` | SEC EDGAR client |
| `src/lib/parser/` | 13F XML parser |
| `src/workers/` | Cloudflare ingestion worker |
| `drizzle/` | Database migrations |

### Development Setup

See [README.md](./README.md#quick-start).

### Security

Do **not** open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
