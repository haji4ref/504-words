# 504 Words

A simple web app for learning and memorizing the "504 Absolutely Essential Words" with Persian meanings.

## Features

- **Browse mode** — go through all 504 words one by one, grouped by lesson (1–42), with the Persian meaning hidden until you ask for it.
- **Saved words mode** — save any word you want to review later, and go through only your saved list the same way.
- Keyboard shortcuts: `←` / `→` to move between words, `Space` to save/unsave the current word.
- Your position (current word + which mode you were in) is remembered in the browser via `localStorage`, so reloading the page picks up where you left off.

## Requirements

- [Node.js](https://nodejs.org/) 18+, or
- [Docker](https://www.docker.com/) / Docker Compose

## Running locally with Node

```bash
npm install
npm start
```

The app runs on `http://localhost:3000` by default. To use a different port:

```bash
PORT=4504 npm start
```

## Running with Docker

```bash
docker compose up -d
```

This builds the image and serves the app on `http://localhost:3000`. To use a different host port:

```bash
HOST_PORT=4504 docker compose up -d
```

Saved words are stored in `data/saved-words.json`, which is mounted as a volume so your saved list survives container rebuilds.

## How it works

- `data/words.json` contains all 504 words with their lesson number and Persian meaning.
- `data/saved-words.json` stores the list of word IDs you've saved — it's just a JSON file, no database needed.
- `server.js` is a small Express server exposing:
  - `GET /api/words` — all words
  - `GET /api/saved` — your saved words
  - `POST /api/saved` — save a word (`{ "id": <wordId> }`)
  - `DELETE /api/saved/:id` — remove a saved word
- `public/` holds the front end (plain HTML/CSS/JS, no framework).

## Project structure

```
.
├── data/
│   ├── words.json          # all 504 words + Persian meanings
│   └── saved-words.json    # your saved word IDs
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
├── Dockerfile
└── docker-compose.yml
```
