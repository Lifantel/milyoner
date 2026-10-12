const rand = (a, b) => a + Math.random() * (b - a);
const tier = (level) => (level <= 4 ? 0 : level <= 8 ? 1 : 2); // easy / medium / hard
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// 50:50 – returns the indexes of the two wrong options to remove
export function fiftyFifty(correct, unavailable) {
  const wrong = [0, 1, 2, 3].filter((i) => i !== correct && !unavailable.has(i));
  return shuffle(wrong).slice(0, Math.min(2, wrong.length - 1));
}

// Phone a friend – smarter on easy questions, shakier on hard ones
export function phoneFriend(correct, available, level) {
  const t = tier(level);
  const chance = [0.9, 0.75, 0.6][t];
  const wrong = available.filter((i) => i !== correct);
  const guess = Math.random() < chance || wrong.length === 0
    ? correct
    : wrong[Math.floor(Math.random() * wrong.length)];
  return { guess, tier: t };
}

// Ask the audience – returns an array of 4 percentages
export function askAudience(correct, available, level) {
  const [lo, hi] = [[65, 85], [45, 65], [28, 48]][tier(level)];
  const result = [0, 0, 0, 0];
  const others = available.filter((i) => i !== correct);

  let share = Math.round(rand(lo, hi));
  if (others.length === 0) share = 100;
  result[correct] = share;

  let left = 100 - share;
  const weights = others.map(() => Math.random() + 0.2);
  const total = weights.reduce((a, b) => a + b, 0);
  others.forEach((idx, k) => {
    const v = k === others.length - 1 ? left : Math.round(((100 - share) * weights[k]) / total);
    result[idx] = Math.min(v, left);
    left -= result[idx];
  });
  return result;
}
