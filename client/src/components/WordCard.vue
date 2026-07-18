<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  word: { type: Object, default: null },
  loading: { type: Boolean, required: true },
  index: { type: Number, required: true },
  listLength: { type: Number, required: true },
  mode: { type: String, required: true },
  isSaved: { type: Boolean, required: true },
  meaningVisible: { type: Boolean, required: true },
});
defineEmits(['toggle-meaning', 'prev', 'next', 'toggle-save']);

// null = not yet fetched, '' = no audio available, string = playable URL
const audioUrl = ref(null);
const audioLoading = ref(false);
const audioCache = new Map(); // word text → URL or ''

watch(
  () => props.word?.id,
  () => {
    if (!props.word) { audioUrl.value = null; return; }
    const cached = audioCache.get(props.word.word);
    audioUrl.value = cached !== undefined ? cached : null;
  }
);

async function playPronunciation() {
  if (!props.word || audioLoading.value) return;

  const wordText = props.word.word;

  if (audioCache.has(wordText)) {
    const url = audioCache.get(wordText);
    if (url) new Audio(url).play().catch(() => {});
    return;
  }

  audioLoading.value = true;
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(wordText)}`
    );
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const phonetics = data[0]?.phonetics ?? [];
    const found = phonetics.find((p) => p.audio && p.audio.trim());
    const url = found
      ? found.audio.startsWith('//')
        ? 'https:' + found.audio
        : found.audio
      : '';
    audioCache.set(wordText, url);
    audioUrl.value = url;
    if (url) new Audio(url).play().catch(() => {});
  } catch {
    audioCache.set(wordText, '');
    audioUrl.value = '';
  } finally {
    audioLoading.value = false;
  }
}
</script>

<template>
  <div class="progress-row">
    <span>{{ listLength ? `${index + 1} / ${listLength}` : '-' }}</span>
    <span>{{ word ? (word.custom ? word.label || 'Custom' : `Lesson ${word.lesson}`) : '' }}</span>
  </div>

  <section v-if="loading || word" class="card">
    <div class="word">{{ loading ? 'Loading...' : word.word }}</div>
    <template v-if="!loading">
      <button
        class="pronounce-btn"
        :class="{ unavailable: audioUrl === '' }"
        :disabled="audioLoading || audioUrl === ''"
        :aria-label="audioUrl === '' ? 'Pronunciation unavailable' : 'Play pronunciation'"
        @click="playPronunciation"
      >
        <span :class="{ 'pronounce-spin': audioLoading }" aria-hidden="true">
          {{ audioLoading ? '⟳' : audioUrl === '' ? '🔇' : '🔊' }}
        </span>
        {{ audioLoading ? 'Loading…' : audioUrl === '' ? 'No audio' : 'Pronounce' }}
      </button>
      <button class="meaning-toggle" @click="$emit('toggle-meaning')">
        {{ meaningVisible ? 'Hide meaning' : 'Show meaning' }}
      </button>
      <div class="meaning fa" v-show="meaningVisible">{{ word.meaning }}</div>
    </template>
  </section>

  <div v-if="!loading && word" class="controls">
    <button class="ctrl-btn" @click="$emit('prev')">&#8592; Prev</button>
    <button class="ctrl-btn save-btn" :class="{ saved: isSaved }" @click="$emit('toggle-save')">
      {{ mode === 'saved' ? '★ Remove' : isSaved ? '★ Saved' : '☆ Save' }}
    </button>
    <button class="ctrl-btn" @click="$emit('next')">Next &#8594;</button>
  </div>

  <p v-if="!loading && !word" class="empty-msg">No saved words yet. Switch to "All Words" and save some!</p>
</template>
