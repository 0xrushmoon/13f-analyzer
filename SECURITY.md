# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security issue, please report it responsibly:

1. Open a **private** security advisory on GitHub:  
   **Repository → Security → Advisories → Report a vulnerability**

2. Or email the maintainers (see repository owner profile).

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to acknowledge reports within **48 hours** and provide a status update within **7 days**.

## Scope

In scope:

- Authentication and API key handling
- Stripe webhook verification
- Admin backfill endpoint protection
- SEC data ingestion integrity
- Cloudflare Worker secrets exposure

Out of scope:

- Social engineering attacks
- Denial of service against SEC EDGAR (third-party)
- Issues in dependencies without a demonstrable exploit in this project

## Security Best Practices for Deployers

- Rotate `ADMIN_SECRET`, `BETTER_AUTH_SECRET`, and API keys regularly
- Never commit `.env` files
- Use Wrangler secrets for production credentials
- Restrict Stripe webhook endpoints to verified signatures only
