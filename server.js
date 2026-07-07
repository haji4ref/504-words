const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4504;

const WORDS_PATH = path.join(__dirname, 'data', 'words.json');
const SAVED_PATH = path.join(__dirname, 'data', 'saved-words.json');
const CUSTOM_WORDS_PATH = path.join(__dirname, 'data', 'custom-words.json');
const EXAMS_PATH = path.join(__dirname, 'data', 'exams.json');
const CUSTOM_ID_START = 10001;
const OPTIONS_PER_QUESTION = 4;

if (!fs.existsSync(SAVED_PATH)) fs.writeFileSync(SAVED_PATH, '[]');
if (!fs.existsSync(CUSTOM_WORDS_PATH)) fs.writeFileSync(CUSTOM_WORDS_PATH, '[]');
if (!fs.existsSync(EXAMS_PATH)) fs.writeFileSync(EXAMS_PATH, '[]');

const words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));
const customWords = JSON.parse(fs.readFileSync(CUSTOM_WORDS_PATH, 'utf-8'));
const exams = JSON.parse(fs.readFileSync(EXAMS_PATH, 'utf-8'));

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

function writeExams() {
  fs.writeFileSync(EXAMS_PATH, JSON.stringify(exams, null, 2));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(word, pool) {
  const seenMeanings = new Set([word.meaning]);
  const distractors = [];
  for (const w of shuffle(pool)) {
    if (w.id === word.id || seenMeanings.has(w.meaning)) continue;
    seenMeanings.add(w.meaning);
    distractors.push(w.meaning);
    if (distractors.length === OPTIONS_PER_QUESTION - 1) break;
  }

  const options = shuffle([word.meaning, ...distractors]);
  return {
    wordId: word.id,
    word: word.word,
    options,
    correctIndex: options.indexOf(word.meaning),
    selectedIndex: null,
    correct: null,
  };
}

function sanitizeQuestion(q) {
  if (q.selectedIndex === null) {
    const { correctIndex, ...rest } = q;
    return rest;
  }
  return q;
}

function sanitizeExam(exam) {
  return { ...exam, questions: exam.questions.map(sanitizeQuestion) };
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

app.get('/api/exams', (req, res) => {
  const summaries = exams
    .map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      status: e.status,
      totalQuestions: e.questions.length,
      answeredCount: e.currentIndex,
      correctCount: e.correctCount,
      score: e.score,
      completedAt: e.completedAt,
    }))
    .sort((a, b) => b.id - a.id);
  res.json(summaries);
});

app.get('/api/exams/:id', (req, res) => {
  const exam = exams.find((e) => e.id === Number(req.params.id));
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  res.json(sanitizeExam(exam));
});

app.post('/api/exams', (req, res) => {
  const examWordIds = new Set([...readSavedIds(), ...customWords.map((w) => w.id)]);
  const savedWordsForExam = Array.from(examWordIds)
    .map((id) => wordsById.get(id))
    .filter(Boolean);

  if (savedWordsForExam.length === 0) {
    return res.status(400).json({ error: 'No saved or custom words to build an exam from' });
  }

  const pool = Array.from(wordsById.values());
  const questions = shuffle(savedWordsForExam).map((w) => buildQuestion(w, pool));

  const exam = {
    id: exams.length ? Math.max(...exams.map((e) => e.id)) + 1 : 1,
    createdAt: new Date().toISOString(),
    status: 'in-progress',
    currentIndex: 0,
    questions,
    correctCount: 0,
    score: null,
    completedAt: null,
  };

  exams.push(exam);
  writeExams();

  res.status(201).json(sanitizeExam(exam));
});

app.post('/api/exams/:id/answer', (req, res) => {
  const exam = exams.find((e) => e.id === Number(req.params.id));
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (exam.status === 'completed') {
    return res.status(400).json({ error: 'Exam already completed' });
  }

  const { questionIndex, selectedIndex } = req.body;
  const question = exam.questions[questionIndex];
  if (questionIndex !== exam.currentIndex || !question) {
    return res.status(400).json({ error: 'Question is out of order' });
  }
  if (typeof selectedIndex !== 'number' || selectedIndex < 0 || selectedIndex >= question.options.length) {
    return res.status(400).json({ error: 'Invalid selected index' });
  }

  question.selectedIndex = selectedIndex;
  question.correct = selectedIndex === question.correctIndex;
  if (question.correct) exam.correctCount += 1;
  exam.currentIndex += 1;

  if (exam.currentIndex === exam.questions.length) {
    exam.status = 'completed';
    exam.completedAt = new Date().toISOString();
    exam.score = Math.round((exam.correctCount / exam.questions.length) * 100);
  }

  writeExams();
  res.json(sanitizeExam(exam));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`504 Words app running at http://0.0.0.0:${PORT}`);
});
