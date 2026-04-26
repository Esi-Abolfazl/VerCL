# Contributing

Thanks for your interest in improving EazyVercel.

## Reporting bugs

Open an issue with:

1. What you ran (commands, deploy steps).
2. What you expected to happen.
3. What actually happened (full output, log snippets).
4. Your environment (Vercel plan, server OS, Xray version, client app + version).

For sensitive issues, see [SECURITY.md](SECURITY.md) — don't post them in public issues.

## Suggesting a change

If the change is non-trivial, open an issue describing the idea **before** writing code. That way we don't both spend an evening on the same thing.

## Pull requests

- Branch from `main`.
- Keep commits small and focused.
- Test the relay end-to-end before submitting (deploy → curl → client).
- Don't include personal config: no real domains, real UUIDs, or real server IPs in code or docs. Use `relay.your-domain.com` and `<UUID>` style placeholders.

## Code style

This project is intentionally minimal. The Edge Function should stay short enough that a reasonable person can read all of it in under a minute. Resist the urge to add features that would be better as a fork.

## Local testing

There's no local emulator for Vercel Edge that round-trips XHTTP cleanly. The only reliable test loop is:

```bash
vercel --prod
curl -v https://your-relay-domain.com/your-path
```

If `curl` returns `404` with `content-length: 0` and `server: Vercel`, the relay is reaching your origin and Xray is responding. Anything else means something upstream of Xray failed (see the troubleshooting table in [README.md](README.md)).

## License

By contributing, you agree your changes will be released under the [MIT License](LICENSE).
