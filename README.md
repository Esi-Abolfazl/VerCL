# EazyVercel

A minimal **Vercel Edge Function** that relays **XHTTP** traffic to your
backend Xray/V2Ray server. Use Vercel's globally distributed edge network
(and its `vercel.com` / `*.vercel.app` SNI) as a front for your real Xray
endpoint — useful in regions where the backend host is blocked but Vercel
is reachable.

> ⚠️ **XHTTP transport only.** This relay is purpose-built for Xray's
> `xhttp` transport. It will **not** work with `WebSocket`, `gRPC`, `TCP`,
> `mKCP`, `QUIC`, or any other V2Ray/Xray transport — the Edge runtime
> doesn't support WebSocket upgrade or arbitrary TCP, and the other
> transports rely on protocol features Edge `fetch` doesn't expose.

## 📢 Author & Channel

Built and maintained by **Schmitz**.

- Telegram: [@schmi7zz](https://t.me/schmi7zz)
- Channel: [t.me/schmitzws](https://t.me/schmitzws)

For questions, updates, and bonus configs join the channel.

## Disclaimer

**This repository is for education, experimentation, and personal testing
only.** It is **not** production software: there is no SLA, no security
audit, no ongoing maintenance guarantee, and no support channel.

- **Do not rely on it for production** workloads, critical infrastructure,
  or anything where availability, confidentiality, or integrity must be
  assured. You deploy and operate it **entirely at your own risk**.
- **Compliance is your responsibility.** Laws, regulations, and acceptable
  use policies (including your host's and Vercel's) vary by jurisdiction
  and service. The author and contributors are **not** responsible for how
  you use this code or for any damages, losses, or legal consequences that
  arise from it.
- **Vercel's terms of service** apply to anything you run on their
  platform. A generic HTTP relay may violate their rules or acceptable use
  if misused; read and follow [Vercel's policies](https://vercel.com/legal)
  yourself.
- **No warranty.** The software is provided "as is", without warranty of
  any kind, express or implied. The author accepts no liability for its
  use or misuse.

If you need something production-grade, build or buy a properly engineered
solution with monitoring, hardening, legal review, and operational ownership.

---

## How It Works

```
┌──────────┐   TLS / SNI: *.vercel.app    ┌──────────────────┐    HTTP/2     ┌──────────────┐
│  Client  │ ───────────────────────────► │  Vercel Edge     │ ───────────►  │  Your Xray   │
│ (v2rayNG,│   XHTTP request (POST/GET)   │  (V8 isolate,    │  XHTTP frames │  server with │
│ Hiddify) │                              │  streams body)   │  forwarded    │ XHTTP inbound│
└──────────┘                              └──────────────────┘               └──────────────┘
```

1. Your Xray client opens an XHTTP request to a Vercel domain
   (`your-app.vercel.app`, or any custom domain pointed at Vercel).
2. The TLS handshake uses **Vercel's certificate / SNI**, so to a censor it
   looks like ordinary traffic to a legitimate Vercel-hosted site.
3. The Edge function pipes the request body to your real Xray server
   (`TARGET_DOMAIN`) as a `ReadableStream` — no buffering — and pipes the
   upstream response back the same way.

## Why Edge Runtime?

- **True bidirectional streaming** via WebStreams (`req.body` →
  `fetch(..., { duplex: "half" })` → upstream response). First byte out as
  soon as first byte in. This matches XHTTP's chunked POST/GET model
  exactly.
- **~5–50 ms cold starts.** Edge functions run in V8 isolates, not AWS
  Lambda microVMs — roughly 10× faster to start than the equivalent
  Rust/Go serverless function.
- **Runs at every Vercel PoP globally.** Anycast routing puts your relay
  within a few ms of every client, regardless of where your origin lives.
- **No buildtime, no toolchain, no native deps.** A single ~60-line JS
  file.

## High-load tuning baked in

The handler is written for sustained throughput:

- `TARGET_DOMAIN` is read **once at cold start** and cached at module
  scope — no env lookup per request.
- URL parsing is skipped entirely — `req.url.indexOf("/", 8)` + `slice`
  extracts the path+query without allocating a `URL` object.
- Headers are filtered in a **single pass**: hop-by-hop headers
  (`connection`, `keep-alive`, `transfer-encoding`, …), Vercel telemetry
  (`x-vercel-*`), and Vercel-edge `x-forwarded-host/proto/port` are
  dropped. The client's real IP (`x-real-ip` or original
  `x-forwarded-for`) is forwarded as `x-forwarded-for`.
- `fetch(targetUrl, options)` is called directly — no extra
  `new Request(...)` allocation.
- `redirect: "manual"` keeps Vercel from chasing 3xx upstream and
  breaking the XHTTP framing.

---

## Setup & Deployment

### 1. Requirements

- A working **Xray server with XHTTP inbound** already running on a public
  host (this is your `TARGET_DOMAIN`).
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- A Vercel account (Pro recommended for higher bandwidth and concurrent
  invocation limits).
- A custom domain you control (recommended; needed if `*.vercel.app` is
  blocked in your target region).

### 2. Set up DNS

You need **two** DNS records:

| Type   | Name      | Value                    | Purpose                                        |
| ------ | --------- | ------------------------ | ---------------------------------------------- |
| A      | `backend` | `<YOUR_SERVER_IP>`       | Resolved by Vercel only — points to your Xray  |
| CNAME  | `relay`   | `cname.vercel-dns.com`   | Resolved by clients — points to Vercel         |

> ⚠️ If you use Cloudflare, set **Proxy: OFF (DNS only)** for both records.
> Orange-cloud proxying breaks Vercel's TLS handshake.

> ⚠️ **Never put your server's raw IP behind the client-facing CNAME.**
> The whole point of the relay is that your origin IP stays hidden from
> clients. Only `backend.YOUR-DOMAIN` resolves to the real IP, and only
> Vercel ever queries it.

### 3. Configure Environment Variable

In the Vercel Dashboard → your project → **Settings → Environment
Variables**, add:

| Name            | Example                                | Description                                          |
| --------------- | -------------------------------------- | ---------------------------------------------------- |
| `TARGET_DOMAIN` | `http://backend.your-domain.com:2096`  | Full origin URL of your backend Xray XHTTP endpoint. |

Notes:

- **Use a domain, not a raw IP.** Vercel's Edge runtime rejects direct IP
  access with `Direct IP access is not allowed` errors. Use the `backend`
  subdomain you set up above.
- Use `https://` if your backend terminates TLS, `http://` if plain.
- Include the inbound port (e.g. `:2096`).
- Trailing slashes are stripped automatically.

### 4. Deploy

```bash
git clone https://github.com/schmi7zz/eazyvercel.git
cd eazyvercel

vercel --prod
```

After deployment Vercel gives you a URL like `your-app.vercel.app`.

### 5. Add your custom domain

In the Vercel Dashboard → your project → **Settings → Domains**:

1. Click **Add**.
2. Enter `relay.your-domain.com` (matches your CNAME from step 2).
3. Wait 1–3 minutes for the Let's Encrypt certificate to be issued
   (status will go from "Generating SSL Certificate" to "Valid
   Configuration").

### 6. Redeploy

After setting `TARGET_DOMAIN`, redeploy so the new env value is loaded:

```bash
vercel --prod
```

### 7. Verify end-to-end

```bash
curl -v https://relay.your-domain.com/yourpath
```

Expected response:

- TLS handshake succeeds with a valid Let's Encrypt cert
- `HTTP/2 404` with `content-length: 0`
- `server: Vercel` header

That `404` is correct — Xray's XHTTP inbound deliberately returns a 404
to non-VLESS requests so the endpoint looks like a generic HTTP server to
probes.

---

## Client Configuration (VLESS / Xray with XHTTP)

In your client config, point the **address** at your Vercel custom domain
and set **SNI / Host** accordingly. The `id`, `path`, and inbound settings
must match what your real Xray server expects — the relay is
transport-agnostic and just forwards bytes.

### Example VLESS share link

```
vless://UUID@relay.your-domain.com:443?encryption=none&security=tls&sni=relay.your-domain.com&fp=chrome&alpn=h2%2Chttp%2F1.1&type=xhttp&host=relay.your-domain.com&path=/yourpath&mode=auto#eazyvercel
```

### Example Xray client JSON (outbound)

```json
{
  "protocol": "vless",
  "settings": {
    "vnext": [
      {
        "address": "relay.your-domain.com",
        "port": 443,
        "users": [{ "id": "YOUR-UUID", "encryption": "none" }]
      }
    ]
  },
  "streamSettings": {
    "network": "xhttp",
    "security": "tls",
    "tlsSettings": {
      "serverName": "relay.your-domain.com",
      "allowInsecure": false,
      "fingerprint": "chrome",
      "alpn": ["h2", "http/1.1"]
    },
    "xhttpSettings": {
      "path": "/yourpath",
      "host": "relay.your-domain.com",
      "mode": "auto"
    }
  }
}
```

### Compatible clients

XHTTP is a newer transport. Make sure your client supports it:

| Client          | Platform                          | Minimum version |
| --------------- | --------------------------------- | --------------- |
| Hiddify Next    | Android / iOS / Win / Mac / Linux | ≥ 2.0           |
| v2rayNG         | Android                           | ≥ 1.9.5         |
| v2rayN          | Windows                           | ≥ 7.4           |
| NekoBox         | Android                           | ≥ 1.3           |

**Clients that do NOT support XHTTP** (will fail silently):
NPV Tunnel, HTTP Injector, HTTP Custom.

### Tips

- The `path` and `id` (UUID) must match the **backend Xray** XHTTP inbound,
  not this relay.
- If censorship targets `*.vercel.app` directly, the custom domain step
  above is mandatory.
- For maximum survivability, register multiple custom domains and rotate
  if any one gets blocked.

---

## Troubleshooting

| Symptom                                              | Cause                                                                                  | Fix                                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `308 Redirect` loop on curl                          | `TARGET_DOMAIN` points to your own Vercel domain instead of the backend                | Set `TARGET_DOMAIN` to `http://backend.YOUR-DOMAIN:2096`                                           |
| `Direct IP access is not allowed in Vercel's Edge`   | Raw IP in `TARGET_DOMAIN`                                                              | Use a domain (your `backend` subdomain, or `<dashed-ip>.sslip.io` for quick testing)               |
| `502` / `504` from Vercel                            | Backend not listening or unreachable                                                   | Check `ss -tlnp \| grep 2096` on server; verify firewall allows port 2096 from outside             |
| `bind: address already in use` in Xray logs          | x-ui's subscription server is on the same port as your inbound                         | In x-ui Panel Settings → Subscription, move sub port off 2096 (e.g. 8443), restart panel           |
| Client connects but no internet                      | Wrong UUID, path, or host header in client config                                      | Verify all match the inbound exactly                                                               |
| Client can't connect, but `tcpdump` shows Vercel SYN | Client doesn't support XHTTP                                                           | Switch to Hiddify Next or v2rayNG ≥ 1.9.5                                                          |
| Custom domain not reachable from target region       | Domain TLD is filtered                                                                 | Try `.com`, `.net`, `.de`, `.io`, `.dev` — avoid `.tk`, `.ml`, `.ga`, `.cf`                        |

### Useful diagnostic commands (on the Xray server)

```bash
# What's listening on port 2096?
ss -tlnp | grep 2096

# Live incoming SYNs to 2096 (excludes keepalives)
tcpdump -i any -n -l 'tcp port 2096 and tcp[tcpflags] & tcp-syn != 0 and not src host YOUR_SERVER_IP'

# Live x-ui logs
journalctl -u x-ui -f --no-pager

# Live Vercel deployment logs
vercel logs --follow
```

---

## Limitations

- **XHTTP only.** WebSocket / gRPC / raw TCP / mKCP / QUIC do **not** work
  on Vercel's Edge runtime regardless of how the relay is implemented.
- **Edge per-invocation CPU budget** (~50 ms compute on Hobby, more on
  Pro). I/O wait time doesn't count, so streaming proxies stay well within
  budget — but a stuck upstream can hit the wall-clock limit.
- **Bandwidth quotas.** All traffic counts against your Vercel account's
  quota. Heavy use → upgrade to Pro/Enterprise.
- **Logging.** Vercel logs request metadata (path, IP, status). The body
  is not logged, but be aware of the trust model.

## Project Layout

```
.
├── api/index.js     # Edge function: streams request → TARGET_DOMAIN, streams response back
├── package.json     # Project metadata (no runtime deps; fetch/Headers are globals)
├── vercel.json      # Routes all paths → /api/index
└── README.md
```

## License

MIT.

---

**EazyVercel** — by [Schmitz](https://t.me/schmi7zz) · Channel: [t.me/schmitzws](https://t.me/schmitzws)
