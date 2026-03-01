# AGENTS.md

## Cursor Cloud specific instructions

This is a **Svelte 4 + Vite 5 + TypeScript** client-side SPA (no backend). All data is fetched at runtime from public GitHub APIs.

### Running the dev server

```bash
npm run dev
```

The app runs on `http://localhost:5173` by default.

### Available scripts (see `package.json`)

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run check` | Run `svelte-check` (TypeScript + Svelte diagnostics) |
| `npm run format` | Run Prettier with `--write` |

### Known issues

- `npm run check` reports 9 pre-existing TypeScript errors (type-casting issues in `App.svelte`, `Providers.svelte`, `Main.svelte`). These do **not** block the build or dev server.
- `npx prettier --check .` reports 10 files with formatting issues (pre-existing).

### Environment variables (optional)

- `VITE_MIXPANEL_TOKEN` — enables Mixpanel analytics. The app works fully without it.
