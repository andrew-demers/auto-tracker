# Trusting a corporate/proxy root CA during the Docker build

If you build this image on a network that TLS-inspects outbound traffic
(a corporate VPN/proxy, e.g. Zscaler-style setups), `apk add` and `npm ci`
inside the build will fail with errors like:

```
WARNING: fetching https://dl-cdn.alpinelinux.org/...: TLS: server certificate not trusted
ERROR: unable to select packages: ...
```

This happens because the proxy re-signs HTTPS traffic with its own root
certificate, which the Alpine base image doesn't trust by default.

**Fix:** export your organization's root CA certificate as a PEM file (ask
IT, or find it in your OS's certificate trust store - on macOS: Keychain
Access, System keychain, "Certificates" category, export as `.pem`) and
drop it in this directory, e.g.:

```
certs/corporate-root-ca.pem
```

Any `*.crt` or `*.pem` file placed here is automatically trusted by the
build (see the `Dockerfile`'s `deps`/`builder` stages) before any network
calls happen - no other changes needed. Files in this directory are
git-ignored by default (only this README is tracked), so your
organization's CA never ends up committed.

If you're not behind an inspecting proxy, leave this directory empty and
the build behaves exactly as before.
