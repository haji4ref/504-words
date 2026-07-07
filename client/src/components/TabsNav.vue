<script setup>
defineProps({
  mode: { type: String, required: true },
  savedCount: { type: Number, required: true },
});
defineEmits(['switch']);
</script>

<template>
  <nav class="tabs">
    <button class="tab-btn" :class="{ active: mode === 'all' }" @click="$emit('switch', 'all')">
      All Words
    </button>
    <button class="tab-btn" :class="{ active: mode === 'saved' }" @click="$emit('switch', 'saved')">
      Saved Words (<span>{{ savedCount }}</span>)
    </button>
    <button class="tab-btn" :class="{ active: mode === 'add' }" @click="$emit('switch', 'add')">
      + Add Word
    </button>
  </nav>
</template>
