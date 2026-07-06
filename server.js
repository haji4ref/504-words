const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const WORDS_PATH = path.join(__dirname, 'data', 'words.json');
const SAVED_PATH = path.join(__dirname, 'data', 'saved-words.json');
const CUSTOM_WORDS_PATH = path.join(__dirname, 'data', 'custom-words.json');
const CUSTOM_ID_START = 10001;

if (!fs.existsSync(SAVED_PATH)) fs.writeFileSync(SAVED_PATH, '[]');
if (!fs.existsSync(CUSTOM_WORDS_PATH)) fs.writeFileSync(CUSTOM_WORDS_PATH, '[]');

const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));
const customWords = JSON.parse(fs.readFileSync(CUSTOM_WORDS_PATH, 'utf-8'));

const wordsById = new Map(words.map((w) => [w.id, w]));
for (const w of customWords) wordsById.set(w.id, w);

function readSavedIds() {
  return JSON.parse(fs.readFileSync(SAVED_PATH, 'utf-8'));
}

function writeSavedIds(ids) {
  fs.writeFileSync(SAVED_PATH, JSON.stringify(ids, null, 2));
}

function writeCustomWords() {
  fs.writeFileSync(CUSTOM_WORDS_PATH, JSON.stringify(customWords, null, 2));
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

  const customIndex = customWords.findIndex((w) => w.id === id);
  if (customIndex !== -1) {
    customWords.splice(customIndex, 1);
    wordsById.delete(id);
    writeCustomWords();
  }

  res.json({ ok: true });
});

app.post('/api/custom-words', (req, res) => {
  const word = (req.body.word || '').trim();
  const meaning = (req.body.meaning || '').trim();

  if (!word || !meaning) {
    return res.status(400).json({ error: 'Word and meaning are required' });
  }

  const nextId = customWords.length
    ? Math.max(...customWords.map((w) => w.id)) + 1
    : CUSTOM_ID_START;

  const newWord = { id: nextId, word, meaning, label: 'Custom', custom: true };
  customWords.push(newWord);
  wordsById.set(newWord.id, newWord);
  writeCustomWords();

  const ids = readSavedIds();
  ids.push(newWord.id);
  writeSavedIds(ids);

  res.status(201).json(newWord);
});

app.listen(4504, '0.0.0.0', () => {
  console.log(`504 Words app running at http://0.0.0.0:${PORT}`);
});
