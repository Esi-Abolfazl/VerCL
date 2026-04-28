export const config = { runtime: "edge" };

const TARGET_BASE = (process.env.TARGET_DOMAIN ?? "").replace(/\/$/, "");

// Headers that must not be forwarded to the upstream target
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// Vercel-internal headers that should never leak upstream
const isVercelInternal = (key) =>
  key.startsWith("x-vercel-") || key === "host";

export default async function handler(req) {
  if (!TARGET_BASE) {
    return new Response("Misconfigured: TARGET_DOMAIN is not set", {
      status: 500,
    });
  }

  try {
    const incomingUrl = new URL(req.url);
    const targetUrl = TARGET_BASE + incomingUrl.pathname + incomingUrl.search;

    const upstreamHeaders = new Headers();

    for (const [key, value] of req.headers) {
      if (HOP_BY_HOP_HEADERS.has(key)) continue;
      if (isVercelInternal(key)) continue;
      upstreamHeaders.set(key, value);
    }

    // Resolve client IP from Vercel-injected headers and forward it correctly
    const clientIp =
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0].trim();

    if (clientIp) {
      upstreamHeaders.set("x-forwarded-for", clientIp);
    }

    // Let the target know the original host and protocol
    upstreamHeaders.set("x-forwarded-host", incomingUrl.hostname);
    upstreamHeaders.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

    const bodyAllowed = req.method !== "GET" && req.method !== "HEAD";

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: bodyAllowed ? req.body : null,
      // Required for streaming request bodies in edge runtimes
      duplex: "half",
      redirect: "manual",
    });

    return upstreamRes;
  } catch (err) {
    console.error("[relay] upstream fetch failed:", err);
    return new Response("Bad Gateway", { status: 502 });
  }
}