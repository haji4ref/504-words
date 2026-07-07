const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WORDS_PATH = path.join(DATA_DIR, 'words.json');
const CUSTOM_WORDS_PATH = path.join(DATA_DIR, 'custom-words.json');
const SAVED_PATH = path.join(DATA_DIR, 'saved-words.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function backup(filePath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(filePath, `${filePath}.${stamp}.bak`);
}

function normalize(word) {
  return word.trim().toLowerCase();
}

function main() {
  const words = readJson(WORDS_PATH);
  const customWords = readJson(CUSTOM_WORDS_PATH);
  const savedIds = readJson(SAVED_PATH);

  const wordsById = new Map(words.map((w) => [w.id, w]));
  for (const w of customWords) wordsById.set(w.id, w);

  const customIdSet = new Set(customWords.map((w) => w.id));

  // group saved ids by normalized word text, preserving save order
  const groups = new Map();
  for (const id of savedIds) {
    const entry = wordsById.get(id);
    if (!entry) continue; // stale id, leave untouched
    const key = normalize(entry.word);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(id);
  }

  const idsToRemove = new Set();
  let duplicateGroups = 0;

  for (const ids of groups.values()) {
    if (ids.length <= 1) continue;
    duplicateGroups += 1;

    // prefer keeping a book word (non-custom) over a custom duplicate;
    // otherwise keep the earliest-saved id
    const keeper = ids.find((id) => !customIdSet.has(id)) ?? ids[0];
    for (const id of ids) {
      if (id !== keeper) idsToRemove.add(id);
    }
  }

  if (idsToRemove.size === 0) {
    console.log('No duplicate saved words found. Nothing to do.');
    return;
  }

  const newSavedIds = savedIds.filter((id) => !idsToRemove.has(id));
  const newCustomWords = customWords.filter((w) => !idsToRemove.has(w.id));

  backup(SAVED_PATH);
  fs.writeFileSync(SAVED_PATH, JSON.stringify(newSavedIds, null, 2));

  const removedCustomCount = customWords.length - newCustomWords.length;
  if (removedCustomCount > 0) {
    backup(CUSTOM_WORDS_PATH);
    fs.writeFileSync(CUSTOM_WORDS_PATH, JSON.stringify(newCustomWords, null, 2));
  }

  console.log(`Found ${duplicateGroups} duplicate word group(s).`);
  console.log(`Removed ${idsToRemove.size} duplicate saved id(s).`);
  if (removedCustomCount > 0) {
    console.log(`Removed ${removedCustomCount} orphaned duplicate custom word entr${removedCustomCount === 1 ? 'y' : 'ies'}.`);
  }
  console.log('Backups of the original files were saved alongside them (*.bak).');
}

main();
