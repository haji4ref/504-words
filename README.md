# 504 Words

A small, self-hosted web app for learning and memorizing the "504 Absolutely Essential Words" with Persian meanings — browse the list, save the ones you want to review, quiz yourself, and let the app surface the words you keep getting wrong.

No database, no account system, no tracking — just an Express server, some JSON files on disk, and a Vue front end.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Running with Docker](#running-with-docker)
- [Front-end development](#front-end-development)
- [How it works](#how-it-works)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Browse mode** — go through all 504 words one by one, grouped by lesson (1–42), with the Persian meaning hidden until you ask for it.
- **Saved words mode** — save any word you want to review later, and go through only your saved list the same way.
- **Add your own words** — a dedicated tab for adding a word + Persian meaning of your own; it's saved straight into your Saved Words list and labeled "Custom".
- **Exams** — generate a multiple-choice exam covering every word in your Saved Words list plus any custom words (order shuffled, each word appears once, 4 Persian-meaning options per question). Progress is saved on the server after every answer, so a lost connection or closed tab doesn't lose your place — reopen the same exam from the list to continue where you left off. Finished exams show a score and a right/wrong breakdown, and stay in the list for later review.
- **Weak-words exams** — generate an exam from just the words you've historically gotten wrong more than some threshold of the time (e.g. "words I get right less than 50% of the time"), computed from your past exam history.
- **Keyboard shortcuts** — `←` / `→` to move between words, `Space` to save/unsave the current word.
- **Resumable state** — your position (current word + which tab you were on) is remembered in the browser via `localStorage`, so reloading the page picks up where you left off.

## Requirements

- [Node.js](https://nodejs.org/) 18+, **or**
- [Docker](https://www.docker.com/) / Docker Compose

## Quick start

The front end (`public/`) is a built Vue 3 app — build it once after installing, and again any time you change something in `client/`:

```bash
npm install
npm run build
npm start
```

The app runs on `http://localhost:4504` by default. To use a different port:

```bash
PORT=3000 npm start
```

## Running with Docker

The Docker image doesn't build the Vue app itself — it just serves whatever is already in `public/`. Run `npm run build` first if you've changed anything under `client/`:

```bash
npm run build
docker compose up -d
```

This builds the image and serves the app on `http://localhost:4504`. To use a different host port:

```bash
HOST_PORT=3000 docker compose up -d
```

Your data (`data/*.json`) is mounted as a volume, so saved words, custom words, and exam history all survive container rebuilds.

## Front-end development

For hot-reload while editing the Vue app, run the API server and the Vite dev server side by side:

```bash
npm start                # terminal 1 — Express API on :4504
npm run dev:client       # terminal 2 — Vite dev server on :5173, proxies /api to :4504
```

Edit files under `client/src/`, then open `http://localhost:5173`. When you're done, run `npm run build` to regenerate `public/` from the latest source — `public/` is generated output, not something you hand-edit.

There's no test suite, linter, or TypeScript here — verify changes by building and clicking through the app in a browser.

## How it works

Everything is stored as JSON files under `data/`, read and written directly by `server.js` (no database):

- `data/words.json` — the 504 book words, each with a lesson number and Persian meaning. Tracked in git; this is the shared content.
- `data/saved-words.json` — the list of word IDs you've saved.
- `data/custom-words.json` — words you've added yourself (id, word, meaning), each labeled "Custom".
- `data/exams.json` — every exam you've generated: its questions/options, your answers, and its score, so exams survive server restarts and can be resumed.

The three personal files are gitignored — a fresh clone (or container) starts with an empty saved list, no custom words, and no exam history.

## API reference

| Method & path | Description |
| --- | --- |
| `GET /api/words` | All 504 book words. |
| `GET /api/saved` | Your saved words (book + custom). |
| `POST /api/saved` | Save a word — body `{ "id": <wordId> }`. |
| `DELETE /api/saved/:id` | Remove a saved word (deletes it entirely if it's a custom word). |
| `POST /api/custom-words` | Add your own word — body `{ "word", "meaning" }`. Automatically saved and labeled "Custom". |
| `GET /api/exams` | Summaries of all exams (type, status, score, progress). |
| `GET /api/exams/:id` | Full detail for one exam (questions/options). The correct answer for any question you haven't reached yet is stripped from the response. |
| `POST /api/exams` | Generate a new exam from your current Saved Words + custom words. 400s if that combined set is empty. |
| `POST /api/exams` (weak words) | Body `{ "type": "weak", "threshold": <1-100> }` — generate an exam from only the words whose historical correct-rate is below `threshold`%. 400s if no word qualifies. |
| `POST /api/exams/:id/answer` | Submit an answer for the current question — body `{ "questionIndex", "selectedIndex" }`. Answers must be submitted in order; advances the exam and marks it completed (with a score) once every question is answered. |

## Project structure

```
.
├── data/
│   ├── words.json          # all 504 words + Persian meanings (tracked)
│   ├── saved-words.json    # your saved word IDs (gitignored)
│   ├── custom-words.json   # words you've added yourself (gitignored)
│   └── exams.json          # generated exams, answers, and scores (gitignored)
├── client/                 # Vue 3 + Vite front end (source)
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   ├── style.css
│   │   └── components/
│   │       ├── TabsNav.vue
│   │       ├── WordCard.vue
│   │       ├── AddWordForm.vue
│   │       ├── ExamSection.vue
│   │       ├── ExamRunner.vue
│   │       └── ExamReport.vue
│   ├── index.html
│   └── vite.config.js
├── public/                 # built front end (generated by `npm run build`)
├── scripts/
│   └── dedupe-saved-words.js   # merge saved words that share the same text; `npm run dedupe-saved`
├── server.js
├── Dockerfile
└── docker-compose.yml
```

## Contributing

Issues and pull requests are welcome — this is a small hobby project, so keep changes focused and easy to review.

A few things that'll make a PR easier to merge:

- There's no build step for the backend and no TypeScript/linter anywhere — just run the app (see [Front-end development](#front-end-development)) and check your change in the browser.
- If you touch `client/`, run `npm run build` and commit the regenerated `public/` output along with your source change — `public/` is currently tracked in git for deployment convenience.
- Keep `data/words.json` (the shared 504-word list) and the personal data files (`saved-words.json`, `custom-words.json`, `exams.json`) conceptually separate — the latter three are gitignored on purpose and should stay that way.
- Bug fixes and small, well-scoped features are easiest to review. For anything larger (new tabs/modes, schema changes), consider opening an issue first to discuss the approach.

## License

[MIT](LICENSE)
