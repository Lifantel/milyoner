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
