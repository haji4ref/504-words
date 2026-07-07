<script setup>
defineProps({
  exam: { type: Object, required: true },
});
defineEmits(['back']);
</script>

<template>
  <div class="exam-report">
    <div class="exam-report-score">{{ exam.score }}% ({{ exam.correctCount }}/{{ exam.questions.length }})</div>

    <div class="exam-report-list">
      <div v-for="(q, i) in exam.questions" :key="i" class="exam-report-row" :class="{ wrong: !q.correct }">
        <span>{{ q.word }}</span>
        <span class="exam-report-meaning">
          {{ q.correct ? q.options[q.correctIndex] : `${q.options[q.selectedIndex]} → ${q.options[q.correctIndex]}` }}
        </span>
      </div>
    </div>

    <button class="ctrl-btn" @click="$emit('back')">Back to exams</button>
  </div>
</template>
