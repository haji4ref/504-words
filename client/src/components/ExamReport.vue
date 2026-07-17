<script setup>
import { computed } from 'vue';

const props = defineProps({
  exam: { type: Object, required: true },
});
defineEmits(['back']);

const tier = computed(() => {
  if (props.exam.score >= 80) return 'good';
  if (props.exam.score >= 50) return 'mid';
  return 'low';
});

const message = computed(() => {
  if (props.exam.score >= 80) return 'Excellent work!';
  if (props.exam.score >= 50) return 'Good effort — keep practicing.';
  return 'Keep at it, you’ll get there.';
});
</script>

<template>
  <div class="exam-report">
    <div class="exam-report-ring" :class="tier" :style="{ '--pct': exam.score }">
      <span class="exam-report-ring-score">{{ exam.score }}%</span>
    </div>
    <div class="exam-report-summary">
      <div class="exam-report-message">{{ message }}</div>
      <div class="exam-report-count">{{ exam.correctCount }}/{{ exam.questions.length }} correct</div>
    </div>

    <div class="exam-report-list">
      <div v-for="(q, i) in exam.questions" :key="i" class="exam-report-row" :class="{ wrong: !q.correct }">
        <span class="exam-report-mark" aria-hidden="true">{{ q.correct ? '✓' : '✗' }}</span>
        <span class="exam-report-word">{{ q.word }}</span>
        <span class="exam-report-meaning">
          {{ q.correct ? q.options[q.correctIndex] : `${q.options[q.selectedIndex]} → ${q.options[q.correctIndex]}` }}
        </span>
      </div>
    </div>

    <button class="ctrl-btn" @click="$emit('back')">Back to exams</button>
  </div>
</template>
