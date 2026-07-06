const STORAGE_KEY = '504-words-state';

let allWords = [];
let savedWords = [];
let savedIdSet = new Set();

let mode = 'all'; // 'all' | 'saved' | 'add'
let index = 0;
let meaningVisible = false;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state.mode === 'all' || state.mode === 'saved' || state.mode === 'add') mode = state.mode;
    if (Number.isInteger(state.index)) index = state.index;
  } catch {
    // ignore corrupt storage
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, index }));
}

const wordText = document.getElementById('word-text');
const meaningText = document.getElementById('meaning-text');
const meaningToggle = document.getElementById('meaning-toggle');
const positionLabel = document.getElementById('position-label');
const lessonLabel = document.getElementById('lesson-label');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const saveBtn = document.getElementById('save-btn');
const savedCountEl = document.getElementById('saved-count');
const emptyMsg = document.getElementById('empty-msg');
const wordCard = document.getElementById('word-card');
const controls = document.getElementById('controls');
const progressRow = document.getElementById('progress-row');
const tabBtns = document.querySelectorAll('.tab-btn');
const addWordSection = document.getElementById('add-word-section');
const addWordForm = document.getElementById('add-word-form');
const addWordInput = document.getElementById('add-word-input');
const addMeaningInput = document.getElementById('add-meaning-input');

function currentList() {
  return mode === 'all' ? allWords : savedWords;
}

function render() {
  savedCountEl.textContent = savedWords.length;

  if (mode === 'add') {
    progressRow.hidden = true;
    wordCard.hidden = true;
    controls.hidden = true;
    emptyMsg.hidden = true;
    addWordSection.hidden = false;
    saveState();
    return;
  }
  addWordSection.hidden = true;

  const list = currentList();

  if (list.length === 0) {
    progressRow.hidden = false;
    wordCard.hidden = true;
    controls.hidden = true;
    emptyMsg.hidden = false;
    positionLabel.textContent = '-';
    lessonLabel.textContent = '';
    saveState();
    return;
  }

  progressRow.hidden = false;
  wordCard.hidden = false;
  controls.hidden = false;
  emptyMsg.hidden = true;

  if (index >= list.length) index = list.length - 1;
  if (index < 0) index = 0;

  const w = list[index];
  wordText.textContent = w.word;
  meaningText.textContent = w.meaning;
  meaningText.hidden = !meaningVisible;
  meaningToggle.textContent = meaningVisible ? 'Hide meaning' : 'Show meaning';

  positionLabel.textContent = `${index + 1} / ${list.length}`;
  lessonLabel.textContent = w.custom ? (w.label || 'Custom') : `Lesson ${w.lesson}`;

  const isSaved = savedIdSet.has(w.id);
  saveBtn.textContent = mode === 'saved' ? '★ Remove' : (isSaved ? '★ Saved' : '☆ Save');
  saveBtn.classList.toggle('saved', isSaved);

  saveState();
}

function showWord(newIndex) {
  index = newIndex;
  meaningVisible = false;
  render();
}

async function loadData() {
  const [wordsRes, savedRes] = await Promise.all([
    fetch('/api/words'),
    fetch('/api/saved'),
  ]);
  allWords = await wordsRes.json();
  savedWords = await savedRes.json();
  savedIdSet = new Set(savedWords.map((w) => w.id));

  loadState();
  tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));

  render();
}

meaningToggle.addEventListener('click', () => {
  meaningVisible = !meaningVisible;
  render();
});

prevBtn.addEventListener('click', () => {
  if (mode === 'add') return;
  const list = currentList();
  if (list.length === 0) return;
  showWord((index - 1 + list.length) % list.length);
});

nextBtn.addEventListener('click', () => {
  if (mode === 'add') return;
  const list = currentList();
  if (list.length === 0) return;
  showWord((index + 1) % list.length);
});

saveBtn.addEventListener('click', async () => {
  if (mode === 'add') return;
  const list = currentList();
  if (list.length === 0) return;
  const w = list[index];

  if (mode === 'saved' || savedIdSet.has(w.id)) {
    await fetch(`/api/saved/${w.id}`, { method: 'DELETE' });
    savedIdSet.delete(w.id);
    savedWords = savedWords.filter((sw) => sw.id !== w.id);
    if (mode === 'saved' && index >= savedWords.length) {
      index = Math.max(0, savedWords.length - 1);
    }
  } else {
    await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id }),
    });
    savedIdSet.add(w.id);
    savedWords.push(w);
  }
  render();
});

function switchMode(newMode) {
  tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === newMode));
  mode = newMode;
  index = 0;
  meaningVisible = false;
  render();
  if (mode === 'add') addWordInput.focus();
}

addWordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const word = addWordInput.value.trim();
  const meaning = addMeaningInput.value.trim();
  if (!word || !meaning) return;

  const res = await fetch('/api/custom-words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, meaning }),
  });
  if (!res.ok) return;
  const newWord = await res.json();

  savedIdSet.add(newWord.id);
  savedWords.push(newWord);
  addWordForm.reset();

  switchMode('saved');
  showWord(savedWords.length - 1);
});

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (mode === 'add') return;

  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    prevBtn.click();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    nextBtn.click();
  } else if (e.code === 'Space') {
    e.preventDefault();
    saveBtn.click();
  }
});

loadData();
