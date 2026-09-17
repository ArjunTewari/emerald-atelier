# Emerald Atelier

A premium textile asset-generation studio with a Vercel frontend and a secured Codex CLI worker designed for Railway.

## Architecture

- `app/` — Next.js interface and private Vercel proxy.
- `railway-worker/` — isolated Codex CLI service with prebuilt textile-CAD prompting.
- Browser requests never receive the Railway shared secret or the expert system prompt.
- The worker runs each brief in a fresh temporary workspace with Codex `workspace-write` sandboxing, then deletes it.

## Vercel environment

Copy `.env.example` and configure:

- `APP_ACCESS_CODE` — the private code used to open generation.
- `RAILWAY_AGENT_URL` — the public Railway service URL.
- `AGENT_SHARED_SECRET` — a long random secret shared only with Railway.

## Railway worker

Deploy the `railway-worker` directory with its Dockerfile, expose port `8080`, and configure:

- `AGENT_SHARED_SECRET` — must match Vercel.
- `CODEX_API_KEY` — recommended for a production automation service.
- `CODEX_AUTH_JSON_B64` — optional advanced private-MVP authentication using an existing Codex account session. Treat it like a password and never commit it. ChatGPT-managed authentication is intended only for trusted private automation; use persistent secure storage if the refreshed auth file must survive redeployments.

The health endpoint is `GET /health`. Asset jobs are accepted only at `POST /v1/generate` with the shared bearer secret.

## Local checks

```bash
pnpm build
node --check railway-worker/server.mjs
```
