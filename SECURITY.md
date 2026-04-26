# Security Policy

## Reporting a Vulnerability

If you discover a security issue in this project, please **do not** open a public GitHub issue.

Contact the maintainer privately:

- Telegram: [@schmi7zz](https://t.me/schmi7zz)
- Channel: [t.me/schmitzws](https://t.me/schmitzws)

You can expect an initial response within 72 hours. Coordinated disclosure is preferred — give the maintainer a reasonable window (typically 14 days) to deploy a fix before going public.

## Operational warnings

This project is designed to relay traffic through a public CDN. A few operational rules to keep your setup safe:

- **Never publish the origin server's IP.** It must only appear in the `TARGET_DOMAIN` value (which is private to your Vercel project) or in DNS records for the `backend.*` subdomain. If a client ever resolves the origin IP directly, the relay's purpose is defeated.
- **Use unique paths.** Don't reuse the same `path` across multiple deployments — if one path is fingerprinted by a censor, all your relays leak together.
- **Rotate UUIDs periodically** if you share the relay with multiple users.
- **Vercel logs request metadata** (path, status, timing). Bodies are not logged, but treat the path as semi-public.
- **DNS records must be DNS-only** if you use Cloudflare. A proxied (orange-cloud) record will break Vercel's TLS termination and may also leak the origin to Cloudflare.

## Out of scope

- Bugs in upstream projects (`Xray-core`, `3x-ui`, `Vercel`) — please report them there.
- Censorship-related requests from authorities — this project does not collect data and the maintainer cannot assist with such requests.
