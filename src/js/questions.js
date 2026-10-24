const LETTERS = ['A', 'B', 'C', 'D'];

export async function loadQuestions(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status})`);
  const raw = await res.json();
  if (!Array.isArray(raw)) throw new Error('questions.json must be an array.');

  const valid = [];
  for (const q of raw) {
    const answerIndex = LETTERS.indexOf(String(q.answer).toUpperCase());
    const ok =
      q && typeof q.question === 'string' &&
      Array.isArray(q.options) && q.options.length === 4 &&
      Array.isArray(q.levels) && q.levels.length > 0 &&
      answerIndex !== -1;
    if (!ok) {
      console.warn('Skipped invalid question:', q);
      continue;
    }
    valid.push({
      id: q.id,
      levels: q.levels.map(Number),
      question: q.question,
      options: q.options,
      answerIndex
    });
  }
  if (valid.length === 0) throw new Error('No valid questions found in questions.json.');
  return valid;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---- remembers questions seen in earlier games (so a new game doesn't start with the same ones)
const SEEN_KEY = 'milyoner_seen_ids';

export function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch { /* storage unavailable: just skip */ }
}

// Fisher–Yates shuffle (unbiased, unlike sort(() => Math.random() - 0.5))
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffles the A/B/C/D order so the correct answer's position is random in every game,
// whatever letter is written in questions.json.
function shuffleOptions(q) {
  const order = shuffled([0, 1, 2, 3]);
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answerIndex: order.indexOf(q.answerIndex)
  };
}

function choose(pool, level, used, seen) {
  // 1) allowed at this level, not used in this game, not seen in earlier games
  let candidates = pool.filter((q) => !used.has(q.id) && !seen.has(q.id) && q.levels.includes(level));
  if (candidates.length) return pick(candidates);

  // 2) allowed at this level, not used in this game (may have been seen in an earlier game)
  candidates = pool.filter((q) => !used.has(q.id) && q.levels.includes(level));
  if (candidates.length) return pick(candidates);

  // 3) closest difficulty among unused questions; as a last resort allow repeats
  const unused = pool.filter((q) => !used.has(q.id));
  const dist = (q) => Math.min(...q.levels.map((l) => Math.abs(l - level)));
  const source = unused.length ? unused : pool;
  const best = Math.min(...source.map(dist));
  return pick(source.filter((q) => dist(q) === best));
}

// Picks a random question for this level and returns it with shuffled options.
export function pickQuestion(pool, level, used, seen = new Set()) {
  // once every question has been seen, start the memory over
  if (pool.every((q) => seen.has(q.id))) seen.clear();

  const q = choose(pool, level, used, seen);
  seen.add(q.id);
  saveSeen(seen);
  return shuffleOptions(q);
}
