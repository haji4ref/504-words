<script setup>
defineProps({
  mode: { type: String, required: true },
  savedCount: { type: Number, required: true },
});
defineEmits(['switch']);

const tabs = [
  { key: 'all', label: 'All Words', icon: '📚' },
  { key: 'saved', label: 'Saved', icon: '⭐' },
  { key: 'add', label: 'Add', icon: '➕' },
  { key: 'exam', label: 'Exam', icon: '📝' },
];
</script>

<template>
  <nav class="tabs">
    <button
      v-for="t in tabs"
      :key="t.key"
      class="tab-btn"
      :class="{ active: mode === t.key }"
      @click="$emit('switch', t.key)"
    >
      <span class="tab-icon" aria-hidden="true">{{ t.icon }}</span>
      <span class="tab-label">{{ t.label }}</span>
      <span v-if="t.key === 'saved' && savedCount > 0" class="tab-badge">{{ savedCount }}</span>
    </button>
  </nav>
</template>
