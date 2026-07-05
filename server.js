const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const WORDS_PATH = path.join(__dirname, 'data', 'words.json');
const SAVED_PATH = path.join(__dirname, 'data', 'saved-words.json');

const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));
const wordsById = new Map(words.map((w) => [w.id, w]));

function readSavedIds() {
  return JSON.parse(fs.readFileSync(SAVED_PATH, 'utf-8'));
}

function writeSavedIds(ids) {
  fs.writeFileSync(SAVED_PATH, JSON.stringify(ids, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/words', (req, res) => {
  res.json(words);
});

app.get('/api/saved', (req, res) => {
  const ids = readSavedIds();
  const saved = ids.map((id) => wordsById.get(id)).filter(Boolean);
  res.json(saved);
});

app.post('/api/saved', (req, res) => {
  const { id } = req.body;
  if (!wordsById.has(id)) {
    return res.status(404).json({ error: 'Word not found' });
  }
  const ids = readSavedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    writeSavedIds(ids);
  }
  res.json({ ok: true });
});

app.delete('/api/saved/:id', (req, res) => {
  const id = Number(req.params.id);
  const ids = readSavedIds().filter((savedId) => savedId !== id);
  writeSavedIds(ids);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`504 Words app running at http://localhost:${PORT}`);
});
