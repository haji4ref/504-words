# 504 Words

Node/Express backend + Vue 3 (Vite) front end for learning the "504 Absolutely Essential Words" with Persian meanings. No database — JSON files on disk.

## Do not read `data/`

`data/words.json`, `data/saved-words.json`, and `data/custom-words.json` contain the user's personal word list/progress. Don't open or dump these files — treat them as opaque data the server reads/writes. If you need their *shape*, infer it from `server.js` (below) rather than reading the files. This also applies to hitting `GET /api/saved` and printing/logging its response — don't do that either.

## Layout

- `server.js` — the entire backend. Reads/writes the three JSON files in `data/` directly. Routes:
  - `GET /api/words` — all book words
  - `GET /api/saved` — saved words (book + custom)
  - `POST /api/saved` `{ id }` — save a word
  - `DELETE /api/saved/:id` — unsave (and delete entirely if it was custom)
  - `POST /api/custom-words` `{ word, meaning }` — add a custom word (auto-saved, id starts at 10001)
  - Serves `public/` as static files.
  - `PORT` env var controls the port (defaults to 4504).
- `client/` — Vue 3 + Vite source for the front end. `npm run build` (root) builds it into `public/`, which is what Express actually serves.
  - `client/src/App.vue` — root component: holds all state (`mode`: `all`/`saved`/`add`, `index`, `meaningVisible`), fetches `/api/words` + `/api/saved` on mount, persists `{ mode, index }` to `localStorage` under key `504-words-state`.
  - `client/src/components/TabsNav.vue`, `WordCard.vue`, `AddWordForm.vue` — presentational, take props/emit events, no state fetching of their own.
  - `client/src/style.css` — global stylesheet (same class names as before the rewrite, imported once in `main.js`).
  - `client/vite.config.js` — `build.outDir` points at `../public` with `emptyOutDir: true`; dev server proxies `/api` to `http://localhost:4504`.
- `public/` — **generated**, not source. Don't hand-edit; edit `client/src/` and run `npm run build`.
- `Dockerfile` — does *not* build the Vue app; it just copies the repo (including whatever's already built into `public/`) and runs `node server.js`. Run `npm run build` before `docker compose up` if `client/` changed. `client/` itself is excluded from the image via `.dockerignore`.

## Front-end dev workflow

- One-shot build: `npm run build` (root) → runs `npm install` + `npm run build` inside `client/`, outputs to `public/`.
- Hot-reload dev: `npm start` (Express on :4504) + `npm run dev:client` (Vite on :5173, proxies `/api`).

## Notes

- No tests, no linter, no TypeScript. Verify changes by building and checking in the browser.
- `data/saved-words.json` and `data/custom-words.json` are gitignored (personal data); `data/words.json` (the 504-word source list) is tracked. `client/node_modules` is also gitignored; `public/` (build output) is currently tracked in git for convenience — regenerate it with `npm run build` after touching `client/`.
- README.md documents features/API/project structure in more detail if needed.
