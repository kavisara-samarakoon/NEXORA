# NEXORA frontends

| Directory (from repository root) | Status | Use |
| --- | --- | --- |
| [`frontend/nexora-web-next`](nexora-web-next/README.md) | Canonical active frontend | Next.js development, validation, and deployment |
| [`frontend/nexora-web`](nexora-web/README.md) | Archived and frozen | Legacy Vite prototype/reference only |

All new frontend work belongs in `frontend/nexora-web-next`. Follow the
[Next.js README](nexora-web-next/README.md) for setup and commands.

The deployment target is the **Next.js frontend only**. Use
`frontend/nexora-web-next` as the Vercel project root. Do not deploy
`frontend/nexora-web` or use it for new feature work.

The legacy folder stays in place to preserve historical source and assets;
running or building it is not required for the active frontend. See the
[deployment plan](../docs/deployment/production-demo-deployment-plan.md) for
the planned hosted-demo setup.
