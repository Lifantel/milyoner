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

// Picks a random unused question that is allowed at this level.
// If none are left, uses the closest-difficulty unused question; as a last resort allows repeats.
export function pickQuestion(pool, level, used) {
  let candidates = pool.filter((q) => !used.has(q.id) && q.levels.includes(level));
  if (candidates.length) return pick(candidates);

  const unused = pool.filter((q) => !used.has(q.id));
  const dist = (q) => Math.min(...q.levels.map((l) => Math.abs(l - level)));
  const source = unused.length ? unused : pool;
  const best = Math.min(...source.map(dist));
  candidates = source.filter((q) => dist(q) === best);
  return pick(candidates);
}
