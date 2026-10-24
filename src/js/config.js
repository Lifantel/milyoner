// ============================================================
//  GAME SETTINGS  –  change values here, no need to touch game.js
// ============================================================

export const CURRENCY = '₺';

// Prize for each question (12 questions)
export const PRIZES = [
  1000, 2000, 3000, 5000,        // Q1–Q4
  10000, 20000, 40000, 75000,    // Q5–Q8
  150000, 300000, 600000, 1000000 // Q9–Q12
];

// Guaranteed ("safe") levels. Answer these correctly and you keep the money even if you fail later.
export const SAFE_LEVELS = [4, 8];

export const TOTAL = PRIZES.length;

// Lifeline timers (seconds) – the only timed parts of the game
export const TIMES = {
  phone: 45,
  audience: 15
};

// Suspense time (ms) between "Final answer" and the reveal
export const SUSPENSE_MS = 4500;

export const QUESTIONS_URL = 'src/data/questions.json';

export const SOUNDS = {
  intro:    { src: 'assets/sounds/intro.mp3',                 volume: 0.7 },
  suspense: { src: 'assets/sounds/sonkararim.mp3',            volume: 0.8 },
  correct:  { src: 'assets/sounds/dogrucevap.mp3',            volume: 0.9 },
  wrong:    { src: 'assets/sounds/yanliscevap.mp3',           volume: 0.9 },
  phone:    { src: 'assets/sounds/telefonjokerimuzigi.mp3',   volume: 0.6 },
  audience: { src: 'assets/sounds/SeyirciJokeriMuzigi.mp3',   volume: 0.6 }
};

export const ICONS = {
  fifty:    'assets/icons/50:50.png',
  phone:    'assets/icons/telefon.png',
  audience: 'assets/icons/seyirci.png',
  double:   'assets/icons/2x.png'
};

export const fmt = (n) => CURRENCY + n.toLocaleString('en-US');

// Turns a file path into a safe URL (handles the ":" in "50:50.png")
export const url = (p) => encodeURI(p).replace(/:/g, '%3A');
