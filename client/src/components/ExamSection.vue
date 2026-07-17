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
const weakFormOpen = ref(false);
const starting = ref(false);

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
  starting.value = true;
  try {
    const res = await fetch('/api/exams', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      errorMsg.value = body.error || 'Could not start exam';
      return;
    }
    activeExam.value = await res.json();
    view.value = 'run';
    loadExams();
  } finally {
    starting.value = false;
  }
}

async function startWeakWordsExam() {
  errorMsg.value = '';
  starting.value = true;
  try {
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
  } finally {
    starting.value = false;
  }
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

function scorePillClass(exam) {
  if (exam.status !== 'completed') return '';
  if (exam.score >= 80) return 'good';
  if (exam.score >= 50) return 'mid';
  return 'low';
}

onMounted(loadExams);
</script>

<template>
  <div class="exam-section">
    <template v-if="view === 'list'">
      <button class="exam-start-card" :disabled="starting" @click="startNewExam">
        <span class="exam-start-icon" aria-hidden="true">📝</span>
        <span class="exam-start-text">
          <span class="exam-start-title">Start New Exam</span>
          <span class="exam-start-sub">Quiz yourself on all saved words</span>
        </span>
        <span class="exam-start-arrow" aria-hidden="true">→</span>
      </button>

      <button
        class="exam-weak-toggle"
        :aria-expanded="weakFormOpen"
        @click="weakFormOpen = !weakFormOpen"
      >
        <span aria-hidden="true">🎯</span>
        Practice weak words
        <span class="exam-weak-toggle-chevron" :class="{ open: weakFormOpen }" aria-hidden="true">▾</span>
      </button>

      <div v-show="weakFormOpen" class="exam-weak-form">
        <label for="weak-threshold-input">Only include words with correct rate below %</label>
        <div class="exam-weak-row">
          <input
            id="weak-threshold-input"
            type="number"
            min="1"
            max="100"
            v-model="weakThreshold"
          />
          <button class="ctrl-btn" :disabled="starting" @click="startWeakWordsExam">Start</button>
        </div>
      </div>

      <p v-if="errorMsg" class="exam-empty">{{ errorMsg }}</p>

      <p v-if="!loadingList && exams.length === 0" class="exam-empty">
        <span class="exam-empty-icon" aria-hidden="true">🗂️</span>
        No exams yet. Start one above.
      </p>

      <div v-else class="exam-list">
        <button v-for="exam in exams" :key="exam.id" class="exam-item" @click="openExam(exam.id)">
          <span class="exam-item-icon" aria-hidden="true">{{ exam.type === 'weak' ? '🎯' : '📝' }}</span>
          <span class="exam-item-body">
            <span class="exam-item-title">
              Exam #{{ exam.id }}<template v-if="exam.type === 'weak'"> (weak words)</template>
            </span>
            <span v-if="exam.status !== 'completed'" class="exam-item-progress">
              <span
                class="exam-item-progress-bar"
                :style="{ width: `${(exam.answeredCount / exam.totalQuestions) * 100}%` }"
              />
            </span>
          </span>
          <span
            class="exam-item-status"
            :class="[{ completed: exam.status === 'completed' }, scorePillClass(exam)]"
          >
            {{
              exam.status === 'completed'
                ? `${exam.score}%`
                : `${exam.answeredCount}/${exam.totalQuestions}`
            }}
          </span>
        </button>
      </div>
    </template>

    <ExamRunner v-else-if="view === 'run'" :exam="activeExam" @updated="onExamUpdated" @exit="backToList" />

    <ExamReport v-else-if="view === 'report'" :exam="activeExam" @back="backToList" />
  </div>
</template>
