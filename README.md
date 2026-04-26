# EazyVercel — XHTTP Relay through Vercel Edge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/schmi7zz/eazyvercel)
[![Telegram](https://img.shields.io/badge/Telegram-@schmi7zz-blue?logo=telegram)](https://t.me/schmi7zz)

A minimal Vercel Edge Function that relays XHTTP traffic from clients in restricted networks to a backend Xray server. Originally built for Iranian users to bypass IP-based censorship by routing traffic through Vercel's CDN.

## How it works

```
Client (Iran)
    │  TLS:443 → relay.your-domain.com  (CDN-fronted via Vercel)
    ▼
Vercel Edge Function
    │  HTTP → TARGET_DOMAIN  (your origin server)
    ▼
Xray xhttp inbound
    │
    ▼
Open internet
```

The client never resolves your origin server's IP — only Vercel's edge sees it. From the ISP's perspective, the client is making a regular HTTPS request to a CDN-fronted domain.

## What you need

- A Linux server with a public IP (Hetzner, DigitalOcean, etc.)
- A domain you control (subdomains work)
- A free Vercel account
- An Xray server (3X-UI Sanaei recommended)

## Quick deploy

```bash
git clone https://github.com/schmi7zz/eazyvercel
cd eazyvercel
npm i -g vercel
vercel login
vercel --prod
```

Then set the `TARGET_DOMAIN` environment variable in the Vercel dashboard:

```
TARGET_DOMAIN = http://backend.your-domain.com:2096
```

Add a custom domain in Vercel (Settings → Domains) like `relay.your-domain.com`, then redeploy:

```bash
vercel --prod
```

## DNS setup

Two records on your domain:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | `backend` | your server IP | Resolved by Vercel only |
| CNAME | `relay` | `cname.vercel-dns.com` | Seen by clients |

Both records must be **DNS-only** (no Cloudflare proxy), otherwise TLS termination breaks.

## Server setup (Xray inbound)

Install 3X-UI Sanaei:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
```

In the panel, **change the Subscription port from 2096** (the default) to something else (e.g. `8443`). Otherwise it conflicts with your inbound.

Create a VLESS inbound:

| Field | Value |
|-------|-------|
| Protocol | `vless` |
| Port | `2096` |
| Network | `xhttp` |
| Path | `/your-path` |
| Mode | `auto` |
| Security | `none` (TLS handled by Vercel) |

## Client config

```
vless://YOUR-UUID@vercel.com:443?encryption=none&security=tls&sni=vercel.com&fp=chrome&alpn=h2%2Chttp%2F1.1&type=xhttp&host=relay.your-domain.com&path=%2Fyour-path&mode=auto#EazyVercel
```

## Compatible clients

- ✅ Hiddify Next ≥ 2.0
- ✅ v2rayNG ≥ 1.9.5
- ✅ v2rayN ≥ 7.4 (Windows)
- ✅ NekoBox ≥ 1.3
- ❌ NPV Tunnel, HTTP Injector, HTTP Custom (no xhttp support)

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `308 redirect loop` | `TARGET_DOMAIN` points to your Vercel domain — point it to your origin instead |
| `Direct IP access not allowed` | Vercel rejects raw IPs — use a domain in `TARGET_DOMAIN` |
| `502/504` | Origin not reachable. Check `ss -tlnp \| grep 2096` |
| `bind: address already in use` | Sub server collides with inbound — move sub port off 2096 |
| Client connects but no traffic | `xhttp` not supported by your client — upgrade or switch app |
| Domain unreachable from Iran | The TLD might be filtered — try `.com`, `.de`, `.net` |

## Limits

- Vercel Hobby plan: ~100GB bandwidth/month, 50ms CPU per Edge invocation
- Vercel logs request metadata (path, IP, status). Bodies are not logged
- Origin IP must remain hidden — never publish it alongside the relay domain

## Credits

Forked and adapted from [orilaxnet/vercel-xhttp-relay](https://github.com/orilaxnet/vercel-xhttp-relay).
Built and maintained by [Schmitz](https://t.me/schmitzws) ([@schmi7zz](https://t.me/schmi7zz)).

## License

[MIT](LICENSE)
