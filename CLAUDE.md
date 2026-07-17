# 504 Words

Node/Express backend + Vue 3 (Vite) front end for learning the "504 Absolutely Essential Words" with Persian meanings. No database — JSON files on disk. Public repo (MIT-licensed) at `github.com/haji4ref/504-words`; open to outside contributions, so keep changes scoped and README/CLAUDE.md in sync with reality.

## ⚠️ Do not read personal data

`data/words.json` (the 504 book words) is fine — tracked in git, not personal.

`data/saved-words.json`, `data/custom-words.json`, and `data/exams.json` are **not** — they hold the user's personal word list, progress, and exam history. Treat them as opaque data the server reads/writes:

- Don't open or dump these three files.
- Don't hit `GET /api/saved`, `GET /api/exams`, or `GET /api/exams/:id` and print/log/screenshot the response.
- If you need their *shape*, infer it from `server.js` (below) rather than reading the files.
- When testing a feature that touches these files, add synthetic data through the API, verify, then delete it (`DELETE /api/saved/:id`, reset `data/exams.json` to `[]`) rather than reading what's already there — or better, point a throwaway copy of the server at an isolated `data/` dir seeded with only synthetic content, so the real files are never touched at all.

## Backend — `server.js`

Single file, no framework beyond Express. Reads `data/words.json` + `data/custom-words.json` + `data/exams.json` into memory at startup; `data/saved-words.json` is re-read from disk on every request (`readSavedIds`) since it's small and changes often. All writes are synchronous whole-file rewrites (`fs.writeFileSync`, pretty-printed).

| Route | Notes |
| --- | --- |
| `GET /api/words` | All book words. |
| `GET /api/saved` | Saved words (book + custom), resolved from `readSavedIds()`. |
| `POST /api/saved` `{ id }` | Save a word; 404 if `id` isn't a known word. |
| `DELETE /api/saved/:id` | Unsave; if it was a custom word, also deletes it from `customWords` and `wordsById` entirely. |
| `POST /api/custom-words` `{ word, meaning }` | Adds a custom word (id starts at `CUSTOM_ID_START = 10001`, increments off the current max), auto-saves it, labels it `label: 'Custom', custom: true`. |
| `GET /api/exams` | Summaries only: `id, type, createdAt, status, totalQuestions, answeredCount (= currentIndex), correctCount, score, completedAt`. Sorted newest-first by id. |
| `GET /api/exams/:id` | Full exam via `sanitizeExam`/`sanitizeQuestion` — `correctIndex` is stripped from any question not yet answered (`selectedIndex === null`), so the client never receives answers early. |
| `POST /api/exams` | Builds a new exam. Two modes based on body: |
| ↳ standard (no `type`, or anything other than `'weak'`) | Word pool = `new Set([...readSavedIds(), ...customWords.map(w => w.id)])` — union guards against saved/custom ever diverging, though in normal use every custom word is auto-saved too. 400s if empty. |
| ↳ weak (`{ type: 'weak', threshold }`) | Word pool = `getWeakWordIds(threshold)`: scans every past exam's answered questions, computes each word's correct-rate across all exam history, keeps words below `threshold`% (clamped to 1–100, defaults to 50 if invalid). 400s if nothing qualifies. |
| | Either way: shuffles the pool (`shuffle`), builds one question per word (`buildQuestion`, `OPTIONS_PER_QUESTION = 4`; distractor meanings are pulled from the *full* word pool — book + custom — so it still works with very few saved words), stores the exam in the in-memory `exams` array + `data/exams.json`, returns it sanitized. |
| `POST /api/exams/:id/answer` `{ questionIndex, selectedIndex }` | Must match `exam.currentIndex` — answers are strictly sequential, so `exam.currentIndex` is always "the next unanswered question," persisted server-side. This is what makes exams resumable across reloads/lost connections. Records the answer, advances `currentIndex`, and once every question is answered: sets `status: 'completed'`, `completedAt`, and `score` (0–100, rounded). |
| — | Serves `public/` as static files. `PORT` env var controls the port (default `4504`). |

## Frontend — `client/`

Vue 3 + Vite. `npm run build` (root) builds it into `public/`, which is what Express actually serves — `public/` is generated output, never hand-edit it.

- `client/src/App.vue` — root component: owns state for the `all`/`saved`/`add` modes (`mode`, `index`, `meaningVisible`), fetches `/api/words` + `/api/saved` on mount, persists `{ mode, index }` to `localStorage` under key `504-words-state`. The `exam` mode is delegated entirely to `ExamSection.vue`, which manages its own state/fetching independently.
- `client/src/components/TabsNav.vue` — tab bar (icon + label per tab, saved-count badge). Presentational, emits `switch`.
- `client/src/components/WordCard.vue`, `AddWordForm.vue` — presentational, take props/emit events, no state fetching of their own.
- `client/src/components/ExamSection.vue` — owns exam list + which sub-view is active (`list`/`run`/`report`); fetches fresh from the server on every navigation (not cached client state) so resuming after a reload always reflects server truth. List view has a primary "Start New Exam" CTA plus a collapsible weak-words form (`weakFormOpen`) that posts `{ type: 'weak', threshold }`.
- `client/src/components/ExamRunner.vue` — renders the current question (`exam.questions[exam.currentIndex]`) and posts answers; shows a brief correct/incorrect feedback state on the answered option before advancing (`CORRECT_FEEDBACK_DELAY_MS` / `INCORRECT_FEEDBACK_DELAY_MS`). No running score/tally shown mid-exam by design — results only appear after the whole exam is done.
- `client/src/components/ExamReport.vue` — renders a finished exam's score (as a ring, color-tiered by score) + per-question right/wrong breakdown.
- `client/src/style.css` — single global stylesheet, imported once in `main.js`; exam-specific classes are prefixed `exam-`.
- `client/vite.config.js` — `build.outDir` points at `../public` with `emptyOutDir: true`; dev server proxies `/api` to `http://localhost:4504`.

## Other files

- `public/` — **generated**, not source. Edit `client/src/` and run `npm run build` instead.
- `Dockerfile` — does *not* build the Vue app; it just copies the repo (including whatever's already built into `public/`) and runs `node server.js`. Run `npm run build` before `docker compose up` if `client/` changed. `client/` itself is excluded from the image via `.dockerignore`.
- `docker-compose.yml` — maps host port `${HOST_PORT:-4504}` to container port `3000` (set via `Dockerfile`'s `ENV PORT=3000`), and bind-mounts `./data` so personal data survives rebuilds.
- `scripts/dedupe-saved-words.js` (run via `npm run dedupe-saved`) — merges saved words that share the same word text (case-insensitive), preferring the book-word version over a custom duplicate; prunes orphaned duplicate custom-word entries. Backs up both files (`*.<timestamp>.bak`) before writing. Only prints counts, never word content.
- `LICENSE` — MIT.

## Dev workflow

- One-shot build: `npm run build` (root) → runs `npm install` + `npm run build` inside `client/`, outputs to `public/`.
- Hot-reload dev: `npm start` (Express on :4504) + `npm run dev:client` (Vite on :5173, proxies `/api`).
- No tests, no linter, no TypeScript anywhere in this repo. Verify changes by building and checking in a browser (or driving a headless browser against the built app) — don't claim a UI change works without having actually looked at it.

## Gitignore / tracked-vs-not

- Gitignored: `data/saved-words.json`, `data/custom-words.json`, `data/exams.json` (personal data — see warning above), `node_modules`, `client/node_modules`, `.env`.
- Tracked: `data/words.json` (the shared 504-word source list), `public/` (build output — tracked for deploy convenience; regenerate with `npm run build` after touching `client/`, don't forget to commit the diff).

README.md documents features/API/project structure for end users and contributors in more detail if needed.
