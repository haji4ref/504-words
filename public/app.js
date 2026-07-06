const STORAGE_KEY = '504-words-state';

let allWords = [];
let savedWords = [];
let savedIdSet = new Set();

let mode = 'all'; // 'all' | 'saved'
let index = 0;
let meaningVisible = false;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state.mode === 'all' || state.mode === 'saved') mode = state.mode;
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
const controls = document.querySelector('.controls');
const tabBtns = document.querySelectorAll('.tab-btn');
const addWordToggle = document.getElementById('add-word-toggle');
const addWordForm = document.getElementById('add-word-form');
const addWordCancel = document.getElementById('add-word-cancel');
const addWordInput = document.getElementById('add-word-input');
const addMeaningInput = document.getElementById('add-meaning-input');
const addLabelInput = document.getElementById('add-label-input');

function currentList() {
  return mode === 'all' ? allWords : savedWords;
}

function render() {
  const list = currentList();
  savedCountEl.textContent = savedWords.length;

  if (list.length === 0) {
    wordCard.hidden = true;
    controls.hidden = true;
    emptyMsg.hidden = false;
    positionLabel.textContent = '-';
    lessonLabel.textContent = '';
    saveState();
    return;
  }

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
  const list = currentList();
  if (list.length === 0) return;
  showWord((index - 1 + list.length) % list.length);
});

nextBtn.addEventListener('click', () => {
  const list = currentList();
  if (list.length === 0) return;
  showWord((index + 1) % list.length);
});

saveBtn.addEventListener('click', async () => {
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

function openAddWordForm() {
  addWordForm.hidden = false;
  addWordToggle.hidden = true;
  addWordInput.focus();
}

function closeAddWordForm() {
  addWordForm.hidden = true;
  addWordToggle.hidden = false;
  addWordForm.reset();
}

addWordToggle.addEventListener('click', openAddWordForm);
addWordCancel.addEventListener('click', closeAddWordForm);

addWordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const word = addWordInput.value.trim();
  const meaning = addMeaningInput.value.trim();
  const label = addLabelInput.value.trim();
  if (!word || !meaning) return;

  const res = await fetch('/api/custom-words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, meaning, label }),
  });
  if (!res.ok) return;
  const newWord = await res.json();

  savedIdSet.add(newWord.id);
  savedWords.push(newWord);

  closeAddWordForm();

  tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === 'saved'));
  mode = 'saved';
  showWord(savedWords.length - 1);
});

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    showWord(0);
  });
});

document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

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
