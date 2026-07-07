<script setup>
import { ref, computed } from 'vue';

const CORRECT_FEEDBACK_DELAY_MS = 500;
const INCORRECT_FEEDBACK_DELAY_MS = 3000;

const props = defineProps({
  exam: { type: Object, required: true },
});
const emit = defineEmits(['updated', 'exit']);

const submitting = ref(false);
const feedback = ref(null); // answered question (with correctIndex) while showing feedback
const selectedOption = ref(null);

const currentQuestion = computed(() => feedback.value ?? props.exam.questions[props.exam.currentIndex]);

function optionClass(i) {
  if (!feedback.value) return '';
  if (i === feedback.value.correctIndex) return 'correct';
  if (i === selectedOption.value) return 'incorrect';
  return '';
}

async function selectOption(optionIndex) {
  if (submitting.value || feedback.value) return;
  submitting.value = true;
  const answeredIndex = props.exam.currentIndex;
  try {
    const res = await fetch(`/api/exams/${props.exam.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex: answeredIndex, selectedIndex: optionIndex }),
    });
    if (!res.ok) return;
    const updated = await res.json();

    feedback.value = updated.questions[answeredIndex];
    selectedOption.value = optionIndex;

    const delay = feedback.value.correct ? CORRECT_FEEDBACK_DELAY_MS : INCORRECT_FEEDBACK_DELAY_MS;
    setTimeout(() => {
      feedback.value = null;
      selectedOption.value = null;
      emit('updated', updated);
    }, delay);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <div class="progress-row">
      <span>{{ exam.currentIndex + 1 }} / {{ exam.questions.length }}</span>
      <span>Exam #{{ exam.id }}</span>
    </div>

    <section class="card">
      <div class="word">{{ currentQuestion.word }}</div>
    </section>

    <div class="exam-options">
      <button
        v-for="(option, i) in currentQuestion.options"
        :key="i"
        class="exam-option"
        :class="optionClass(i)"
        :disabled="submitting || !!feedback"
        @click="selectOption(i)"
      >
        {{ option }}
      </button>
    </div>

    <button class="ctrl-btn exam-exit-btn" @click="$emit('exit')">Back to exams</button>
  </div>
</template>
