<script setup>
import { ref } from 'vue';

const props = defineProps({
  addWord: { type: Function, required: true },
});

const word = ref('');
const meaning = ref('');
const wordInputEl = ref(null);

async function onSubmit() {
  const w = word.value.trim();
  const m = meaning.value.trim();
  if (!w || !m) return;

  const ok = await props.addWord(w, m);
  if (!ok) return;
  word.value = '';
  meaning.value = '';
  wordInputEl.value?.focus();
}

defineExpose({
  focus: () => wordInputEl.value?.focus(),
});
</script>

<template>
  <section class="add-word-section">
    <h2>Add your own word</h2>
    <form class="add-word-form" @submit.prevent="onSubmit">
      <input ref="wordInputEl" v-model="word" type="text" placeholder="Word (English)" required />
      <input v-model="meaning" type="text" placeholder="Meaning (Persian)" required />
      <button type="submit" class="ctrl-btn save-btn">Add Word</button>
    </form>
  </section>
</template>
