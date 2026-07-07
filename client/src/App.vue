<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import TabsNav from './components/TabsNav.vue';
import WordCard from './components/WordCard.vue';
import AddWordForm from './components/AddWordForm.vue';

const STORAGE_KEY = '504-words-state';

const allWords = ref([]);
const savedWords = ref([]);
const loading = ref(true);

const mode = ref('all'); // 'all' | 'saved' | 'add'
const index = ref(0);
const meaningVisible = ref(false);

const addFormRef = ref(null);

const savedIdSet = computed(() => new Set(savedWords.value.map((w) => w.id)));
const currentList = computed(() => (mode.value === 'all' ? allWords.value : savedWords.value));
const currentWord = computed(() => {
  const list = currentList.value;
  if (list.length === 0) return null;
  const i = Math.min(Math.max(index.value, 0), list.length - 1);
  return list[i];
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state.mode === 'all' || state.mode === 'saved' || state.mode === 'add') mode.value = state.mode;
    if (Number.isInteger(state.index)) index.value = state.index;
  } catch {
    // ignore corrupt storage
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: mode.value, index: index.value }));
}

watch([mode, index], saveState);

async function loadData() {
  const [wordsRes, savedRes] = await Promise.all([fetch('/api/words'), fetch('/api/saved')]);
  allWords.value = await wordsRes.json();
  savedWords.value = await savedRes.json();

  loadState();
  loading.value = false;
}

function showWord(newIndex) {
  index.value = newIndex;
  meaningVisible.value = false;
}

function toggleMeaning() {
  meaningVisible.value = !meaningVisible.value;
}

function goPrev() {
  if (mode.value === 'add') return;
  const list = currentList.value;
  if (list.length === 0) return;
  showWord((index.value - 1 + list.length) % list.length);
}

function goNext() {
  if (mode.value === 'add') return;
  const list = currentList.value;
  if (list.length === 0) return;
  showWord((index.value + 1) % list.length);
}

async function toggleSave() {
  if (mode.value === 'add') return;
  const w = currentWord.value;
  if (!w) return;

  if (mode.value === 'saved' || savedIdSet.value.has(w.id)) {
    await fetch(`/api/saved/${w.id}`, { method: 'DELETE' });
    savedWords.value = savedWords.value.filter((sw) => sw.id !== w.id);
    if (mode.value === 'saved' && index.value >= savedWords.value.length) {
      index.value = Math.max(0, savedWords.value.length - 1);
    }
  } else {
    await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id }),
    });
    savedWords.value = [...savedWords.value, w];
  }
}

function switchMode(newMode) {
  mode.value = newMode;
  index.value = 0;
  meaningVisible.value = false;
  if (newMode === 'add') {
    nextTick(() => addFormRef.value?.focus());
  }
}

async function addWord(word, meaning) {
  const res = await fetch('/api/custom-words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, meaning }),
  });
  if (!res.ok) return false;
  const newWord = await res.json();
  savedWords.value = [...savedWords.value, newWord];
  return true;
}

function onKeydown(e) {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (mode.value === 'add') return;

  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    goPrev();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    goNext();
  } else if (e.code === 'Space') {
    e.preventDefault();
    toggleSave();
  }
}

onMounted(() => {
  loadData();
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>504 Essential Words</h1>
      <TabsNav :mode="mode" :saved-count="savedWords.length" @switch="switchMode" />
    </header>

    <main>
      <WordCard
        v-if="mode !== 'add'"
        :word="currentWord"
        :loading="loading"
        :index="index"
        :list-length="currentList.length"
        :mode="mode"
        :is-saved="currentWord ? savedIdSet.has(currentWord.id) : false"
        :meaning-visible="meaningVisible"
        @toggle-meaning="toggleMeaning"
        @prev="goPrev"
        @next="goNext"
        @toggle-save="toggleSave"
      />

      <AddWordForm v-else ref="addFormRef" :add-word="addWord" />
    </main>
  </div>
</template>
