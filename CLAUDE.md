# 504 Words

Node/Express backend + Vue 3 (Vite) front end for learning the "504 Absolutely Essential Words" with Persian meanings. No database — JSON files on disk.

## Do not read `data/`

`data/words.json` (book words) is fine — it's tracked in git and not personal. But `data/saved-words.json`, `data/custom-words.json`, and `data/exams.json` contain the user's personal word list/progress/exam history. Don't open or dump these files — treat them as opaque data the server reads/writes. If you need their *shape*, infer it from `server.js` (below) rather than reading the files. This also applies to hitting `GET /api/saved`, `GET /api/exams`, or `GET /api/exams/:id` and printing/logging the response — don't do that either. When testing features that touch these files, add synthetic data through the API, verify, then delete it (via `DELETE /api/saved/:id` and by resetting `data/exams.json` to `[]`) rather than reading what's already there.

## Layout

- `server.js` — the entire backend. Reads/writes the JSON files in `data/` directly. Routes:
  - `GET /api/words` — all book words
  - `GET /api/saved` — saved words (book + custom)
  - `POST /api/saved` `{ id }` — save a word
  - `DELETE /api/saved/:id` — unsave (and delete entirely if it was custom)
  - `POST /api/custom-words` `{ word, meaning }` — add a custom word (auto-saved, id starts at 10001)
  - `GET /api/exams` — exam summaries (id, status, progress, score)
  - `GET /api/exams/:id` — full exam (questions/options; `correctIndex` is stripped from any question not yet answered, via `sanitizeExam`/`sanitizeQuestion`)
  - `POST /api/exams` — build a new exam from the union of the current saved-words list and all custom words (`new Set([...readSavedIds(), ...customWords.map(w => w.id)])` — in normal use custom words are always auto-saved too, but this guards against the two ever diverging): shuffles them (`shuffle`), builds one question per word (`buildQuestion`, `OPTIONS_PER_QUESTION = 4`, distractor meanings pulled from the full word pool so it works even with very few words), stores it in the in-memory `exams` array + `data/exams.json`. 400s if that combined set is empty.
  - `POST /api/exams/:id/answer` `{ questionIndex, selectedIndex }` — must match `exam.currentIndex` (answers are strictly sequential); records the answer, advances `currentIndex`, and marks the exam `completed` with a `score` (0–100) once every question is answered. This is what makes exams resumable — the next unanswered question is always `exam.currentIndex`, persisted server-side, so reloading the page or losing connection loses no progress.
  - Serves `public/` as static files.
  - `PORT` env var controls the port (defaults to 4504).
- `client/` — Vue 3 + Vite source for the front end. `npm run build` (root) builds it into `public/`, which is what Express actually serves.
  - `client/src/App.vue` — root component: holds all state for the `all`/`saved`/`add` modes (`mode`, `index`, `meaningVisible`), fetches `/api/words` + `/api/saved` on mount, persists `{ mode, index }` to `localStorage` under key `504-words-state`. The `exam` mode is delegated entirely to `ExamSection.vue`, which manages its own state/fetching (it doesn't need anything from `App.vue`).
  - `client/src/components/TabsNav.vue`, `WordCard.vue`, `AddWordForm.vue` — presentational, take props/emit events, no state fetching of their own.
  - `client/src/components/ExamSection.vue` — owns exam list + which sub-view is active (`list`/`run`/`report`); fetches fresh from the server on every navigation (not cached client state) so resuming after a reload always reflects server truth.
  - `client/src/components/ExamRunner.vue` — renders the current question (`exam.questions[exam.currentIndex]`) and posts answers; no local notion of score/feedback per-question by design (results only shown after the whole exam is done, per how this was spec'd).
  - `client/src/components/ExamReport.vue` — renders a finished exam's score + per-question right/wrong breakdown.
  - `client/src/style.css` — global stylesheet (same class names as before the rewrite, imported once in `main.js`); exam-specific classes are prefixed `exam-`.
  - `client/vite.config.js` — `build.outDir` points at `../public` with `emptyOutDir: true`; dev server proxies `/api` to `http://localhost:4504`.
- `public/` — **generated**, not source. Don't hand-edit; edit `client/src/` and run `npm run build`.
- `Dockerfile` — does *not* build the Vue app; it just copies the repo (including whatever's already built into `public/`) and runs `node server.js`. Run `npm run build` before `docker compose up` if `client/` changed. `client/` itself is excluded from the image via `.dockerignore`.
- `scripts/dedupe-saved-words.js` (run via `npm run dedupe-saved`) — merges saved words that share the same word text (case-insensitive), preferring the book-word version over a custom duplicate; prunes orphaned duplicate custom-word entries. Backs up both files (`*.bak`) before writing. Only prints counts, never word content.

## Front-end dev workflow

- One-shot build: `npm run build` (root) → runs `npm install` + `npm run build` inside `client/`, outputs to `public/`.
- Hot-reload dev: `npm start` (Express on :4504) + `npm run dev:client` (Vite on :5173, proxies `/api`).

## Notes

- No tests, no linter, no TypeScript. Verify changes by building and checking in the browser.
- `data/saved-words.json`, `data/custom-words.json`, and `data/exams.json` are gitignored (personal data); `data/words.json` (the 504-word source list) is tracked. `client/node_modules` is also gitignored; `public/` (build output) is currently tracked in git for convenience — regenerate it with `npm run build` after touching `client/`.
- README.md documents features/API/project structure in more detail if needed.
