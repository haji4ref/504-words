<script setup>
defineProps({
  word: { type: Object, default: null },
  loading: { type: Boolean, required: true },
  index: { type: Number, required: true },
  listLength: { type: Number, required: true },
  mode: { type: String, required: true },
  isSaved: { type: Boolean, required: true },
  meaningVisible: { type: Boolean, required: true },
});
defineEmits(['toggle-meaning', 'prev', 'next', 'toggle-save']);
</script>

<template>
  <div class="progress-row">
    <span>{{ listLength ? `${index + 1} / ${listLength}` : '-' }}</span>
    <span>{{ word ? (word.custom ? word.label || 'Custom' : `Lesson ${word.lesson}`) : '' }}</span>
  </div>

  <section v-if="loading || word" class="card">
    <div class="word">{{ loading ? 'Loading...' : word.word }}</div>
    <template v-if="!loading">
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
