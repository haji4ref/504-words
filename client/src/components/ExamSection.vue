<script setup>
import { ref, onMounted } from 'vue';
import ExamRunner from './ExamRunner.vue';
import ExamReport from './ExamReport.vue';

const view = ref('list'); // 'list' | 'run' | 'report'
const exams = ref([]);
const activeExam = ref(null);
const loadingList = ref(true);
const errorMsg = ref('');
const weakThreshold = ref(50);

async function loadExams() {
  loadingList.value = true;
  const res = await fetch('/api/exams');
  exams.value = await res.json();
  loadingList.value = false;
}

async function openExam(id) {
  const res = await fetch(`/api/exams/${id}`);
  if (!res.ok) return;
  activeExam.value = await res.json();
  view.value = activeExam.value.status === 'completed' ? 'report' : 'run';
}

async function startNewExam() {
  errorMsg.value = '';
  const res = await fetch('/api/exams', { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    errorMsg.value = body.error || 'Could not start exam';
    return;
  }
  activeExam.value = await res.json();
  view.value = 'run';
  loadExams();
}

async function startWeakWordsExam() {
  errorMsg.value = '';
  const res = await fetch('/api/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'weak', threshold: Number(weakThreshold.value) || 50 }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    errorMsg.value = body.error || 'Could not start exam';
    return;
  }
  activeExam.value = await res.json();
  view.value = 'run';
  loadExams();
}

function onExamUpdated(updatedExam) {
  activeExam.value = updatedExam;
  if (updatedExam.status === 'completed') {
    view.value = 'report';
    loadExams();
  }
}

function backToList() {
  view.value = 'list';
  activeExam.value = null;
  loadExams();
}

onMounted(loadExams);
</script>

<template>
  <div class="exam-section">
    <template v-if="view === 'list'">
      <button class="ctrl-btn save-btn" @click="startNewExam">Start New Exam</button>

      <div class="exam-weak-form">
        <label for="weak-threshold-input">Weak words exam (correct rate below %)</label>
        <div class="exam-weak-row">
          <input
            id="weak-threshold-input"
            type="number"
            min="1"
            max="100"
            v-model="weakThreshold"
          />
          <button class="ctrl-btn" @click="startWeakWordsExam">Start Weak Words Exam</button>
        </div>
      </div>

      <p v-if="errorMsg" class="exam-empty">{{ errorMsg }}</p>

      <p v-if="!loadingList && exams.length === 0" class="exam-empty">
        No exams yet. Start one above.
      </p>

      <div v-else class="exam-list">
        <button v-for="exam in exams" :key="exam.id" class="exam-item" @click="openExam(exam.id)">
          <span>Exam #{{ exam.id }}{{ exam.type === 'weak' ? ' (weak words)' : '' }}</span>
          <span class="exam-item-status" :class="{ completed: exam.status === 'completed' }">
            {{
              exam.status === 'completed'
                ? `${exam.score}% (${exam.correctCount}/${exam.totalQuestions})`
                : `${exam.answeredCount}/${exam.totalQuestions} answered`
            }}
          </span>
        </button>
      </div>
    </template>

    <ExamRunner v-else-if="view === 'run'" :exam="activeExam" @updated="onExamUpdated" @exit="backToList" />

    <ExamReport v-else-if="view === 'report'" :exam="activeExam" @back="backToList" />
  </div>
</template>
