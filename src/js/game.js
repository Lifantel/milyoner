import { PRIZES, SAFE_LEVELS, TOTAL, TIMES, SUSPENSE_MS, QUESTIONS_URL, ICONS, fmt, url } from './config.js';
import * as sound from './audio.js';
import { loadQuestions, pickQuestion, loadSeen } from './questions.js';
import { fiftyFifty, phoneFriend } from './jokers.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const LETTERS = ['A', 'B', 'C', 'D'];

let pool = [];
let seen = new Set(); // question ids from earlier games (kept in localStorage)
let timeouts = [];
let modalInterval = null;

const state = {};

function resetState() {
  Object.assign(state, {
    level: 0,
    used: new Set(),
    current: null,
    selected: null,
    locked: false,
    eliminated: new Set(),   // removed by 50:50
    wrongTried: new Set(),   // wrong picks while 2x was active
    doubleActive: false,
    answeredCorrect: false,
    jokersUsed: new Set(),
    modalOpen: false
  });
}

const later = (fn, ms) => { const t = setTimeout(fn, ms); timeouts.push(t); return t; };
const clearLater = () => { timeouts.forEach(clearTimeout); timeouts = []; };

/* ---------------------------------------------------------- INIT */

export async function init() {
  sound.initAudio();
  buildLadder();
  buildLifelines();
  bindEvents();

  try {
    pool = await loadQuestions(QUESTIONS_URL);
    $('#btn-start').disabled = false;
    $('#pool-info').textContent = `${pool.length} questions loaded`;
  } catch (err) {
    console.error(err);
    const box = $('#load-error');
    box.classList.remove('hidden');
    box.innerHTML =
      `<strong>Questions could not be loaded.</strong><br>${err.message}<br><br>` +
      `Browsers block <code>fetch()</code> when you open <code>index.html</code> by double-clicking it. ` +
      `Run a local server in the project folder instead:<br>` +
      `<code>python -m http.server 8000</code> → open <code>http://localhost:8000</code><br>` +
      `(or use the VS Code "Live Server" extension).`;
  }
}

function bindEvents() {
  $('#btn-start').addEventListener('click', startGame);
  $('#btn-restart').addEventListener('click', startGame);
  $('#btn-yes').addEventListener('click', lockAnswer);
  $('#btn-no').addEventListener('click', cancelSelection);
  $('#btn-next').addEventListener('click', nextQuestion);
  $('#btn-walk').addEventListener('click', openWalkDialog);
  $('#walk-no').addEventListener('click', () => $('#walk-dialog').classList.add('hidden'));
  $('#walk-yes').addEventListener('click', walkAway);
  $('#modal-close').addEventListener('click', () => closeModal());
  $('#btn-mute').addEventListener('click', () => {
    sound.setMuted(!sound.isMuted());
    $('#btn-mute').textContent = sound.isMuted() ? '🔇' : '🔊';
  });

  $$('.answer').forEach((btn) =>
    btn.addEventListener('click', () => selectAnswer(Number(btn.dataset.index)))
  );

  document.addEventListener('keydown', (e) => {
    if (!$('#screen-game').classList.contains('active') || state.modalOpen) return;
    const k = e.key.toUpperCase();
    if (LETTERS.includes(k)) selectAnswer(LETTERS.indexOf(k));
    else if (e.key === 'Enter' && !$('#confirm').classList.contains('hidden')) lockAnswer();
    else if (e.key === 'Escape') cancelSelection();
  });
}

/* ---------------------------------------------------------- SCREENS */

function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

/* ---------------------------------------------------------- BUILD UI */

function buildLadder() {
  const ol = $('#ladder');
  ol.innerHTML = '';
  for (let lvl = TOTAL; lvl >= 1; lvl--) {
    const li = document.createElement('li');
    li.dataset.level = lvl;
    if (SAFE_LEVELS.includes(lvl) || lvl === TOTAL) li.classList.add('safe');
    li.innerHTML = `<span class="n">${lvl}</span><span class="d">◆</span><span class="amt">${fmt(PRIZES[lvl - 1])}</span>`;
    ol.appendChild(li);
  }
}

function buildLifelines() {
  const defs = [
    ['fifty', '50:50 – removes two wrong answers'],
    ['phone', 'Phone a friend (45 s)'],
    ['audience', 'Ask the audience (15 s)'],
    ['double', '2x – a second chance if your first answer is wrong']
  ];
  const wrap = $('#lifelines');
  wrap.innerHTML = '';
  for (const [key, title] of defs) {
    const b = document.createElement('button');
    b.className = 'lifeline';
    b.dataset.joker = key;
    b.title = title;
    b.innerHTML = `<img src="${url(ICONS[key])}" alt="${title}"><span class="cross">✕</span>`;
    b.addEventListener('click', () => useJoker(key));
    wrap.appendChild(b);
  }
}

function renderLadder() {
  $$('#ladder li').forEach((li) => {
    const lvl = Number(li.dataset.level);
    li.classList.toggle('current', lvl === state.level);
    li.classList.toggle('passed', lvl < state.level || (lvl === state.level && state.answeredCorrect));
  });
  const prize = fmt(PRIZES[state.level - 1]);
  $('#prize-chip').textContent = `Q${state.level}/${TOTAL} · ${prize}`;
}

function renderLifelines() {
  $$('.lifeline').forEach((b) => {
    const used = state.jokersUsed.has(b.dataset.joker);
    b.classList.toggle('used', used);
    b.disabled = used || state.locked;
  });
}

/* ---------------------------------------------------------- GAME FLOW */

function startGame() {
  clearLater();
  closeModal(true);
  sound.stopAll();
  resetState();
  $('#walk-dialog').classList.add('hidden');
  showScreen('screen-game');
  sound.play('intro');
  later(() => sound.fadeOut('intro', 2000), 6000);
  nextQuestion(true);
}

function nextQuestion(first = false) {
  if (!first) sound.stop('correct');
  state.level++;
  if (first) seen = loadSeen();
  const q = pickQuestion(pool, state.level, state.used, seen);
  state.used.add(q.id);
  Object.assign(state, {
    current: q, selected: null, locked: false, answeredCorrect: false, doubleActive: false
  });
  state.eliminated.clear();
  state.wrongTried.clear();

  $('#q-number').textContent = `Question ${state.level} of ${TOTAL}  •  ${fmt(PRIZES[state.level - 1])}`;
  const box = $('#question-box');
  box.classList.remove('pop');
  void box.offsetWidth;
  box.classList.add('pop');
  $('#question-text').textContent = q.question;
  $('#double-badge').classList.add('hidden');

  $$('.answer').forEach((btn, i) => {
    btn.className = 'answer';
    btn.disabled = false;
    btn.querySelector('.text').textContent = q.options[i];
    btn.style.animationDelay = `${0.15 * i + 0.2}s`;
  });

  $('#confirm').classList.add('hidden');
  $('#next-bar').classList.add('hidden');
  $('#toast').classList.add('hidden');
  $('#btn-walk').disabled = state.level === 1;
  renderLadder();
  renderLifelines();
}

function selectAnswer(i) {
  if (state.locked || state.modalOpen) return;
  if (state.eliminated.has(i) || state.wrongTried.has(i)) return;
  state.selected = i;
  $$('.answer').forEach((b, idx) => b.classList.toggle('selected', idx === i));
  $('#confirm-text').textContent = `Final answer: ${LETTERS[i]} – ${state.current.options[i]}?`;
  $('#confirm').classList.remove('hidden');
}

function cancelSelection() {
  if (state.locked) return;
  state.selected = null;
  $$('.answer').forEach((b) => b.classList.remove('selected'));
  $('#confirm').classList.add('hidden');
}

function lockAnswer() {
  if (state.locked || state.selected === null) return;
  state.locked = true;
  $('#confirm').classList.add('hidden');
  $('#btn-walk').disabled = true;
  renderLifelines();
  $$('.answer').forEach((b) => (b.disabled = true));
  sound.play('suspense');
  later(() => reveal(state.selected), SUSPENSE_MS);
}

function reveal(i) {
  sound.stop('suspense');
  const q = state.current;
  const answerBtns = $$('.answer');

  if (i === q.answerIndex) {
    answerBtns[i].classList.remove('selected');
    answerBtns[i].classList.add('correct');
    state.answeredCorrect = true;
    $('#double-badge').classList.add('hidden');
    sound.play('correct');
    renderLadder();
    if (state.level === TOTAL) {
      later(() => showEnd('win'), 4500);
    } else {
      $('#next-bar').classList.remove('hidden');
      $('#btn-walk').disabled = false;
    }
    return;
  }

  // Wrong answer – but 2x might save the player
  if (state.doubleActive) {
    state.doubleActive = false;
    state.wrongTried.add(i);
    state.locked = false;
    state.selected = null;
    answerBtns[i].classList.remove('selected');
    answerBtns[i].classList.add('wrong', 'eliminated-wrong');
    $('#double-badge').classList.add('hidden');
    showToast('Wrong – but your 2x lifeline gives you a second chance!');
    sound.play('wrong');
    later(() => sound.stop('wrong'), 1800);
    answerBtns.forEach((b, idx) => {
      b.disabled = state.eliminated.has(idx) || state.wrongTried.has(idx);
    });
    renderLifelines();
    return;
  }

  answerBtns[i].classList.remove('selected');
  answerBtns[i].classList.add('wrong');
  answerBtns[q.answerIndex].classList.add('correct');
  sound.play('wrong');
  later(() => showEnd('lose'), 4200);
}

/* ---------------------------------------------------------- WALK AWAY */

function walkAmount() {
  if (state.answeredCorrect) return PRIZES[state.level - 1];
  return state.level > 1 ? PRIZES[state.level - 2] : 0;
}

function openWalkDialog() {
  if (state.locked || state.modalOpen || state.level < 2) return;
  $('#walk-text').textContent = `Take ${fmt(walkAmount())} and leave the game?`;
  $('#walk-dialog').classList.remove('hidden');
}

function walkAway() {
  $('#walk-dialog').classList.add('hidden');
  showEnd('walk');
}

/* ---------------------------------------------------------- END */

function guaranteed() {
  let g = 0;
  for (const s of SAFE_LEVELS) if (s < state.level) g = PRIZES[s - 1];
  return g;
}

function showEnd(kind) {
  clearLater();
  sound.stopAll();
  const q = state.current;
  const correctText = `${LETTERS[q.answerIndex]}: ${q.options[q.answerIndex]}`;
  let title, amount, msg;

  if (kind === 'win') {
    title = 'YOU ARE A MILLIONAIRE!';
    amount = PRIZES[TOTAL - 1];
    msg = 'Incredible! You answered all 12 questions correctly.';
    sound.play('intro');
    confetti();
  } else if (kind === 'walk') {
    title = 'You walked away!';
    amount = walkAmount();
    msg = `Smart move. For the record, the correct answer was <b>${correctText}</b>.`;
  } else {
    title = 'Game over';
    amount = guaranteed();
    msg = `The correct answer was <b>${correctText}</b>.`;
  }

  $('#end-title').textContent = title;
  $('#end-amount').textContent = fmt(amount);
  $('#end-message').innerHTML = msg;
  $('#screen-end').classList.toggle('win', kind === 'win');
  showScreen('screen-end');
}

function confetti() {
  const box = $('#confetti');
  box.innerHTML = '';
  const colors = ['#f5c451', '#ffffff', '#4aa3ff', '#ff6b6b', '#6be38b'];
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.background = colors[i % colors.length];
    s.style.animationDuration = 3 + Math.random() * 4 + 's';
    s.style.animationDelay = Math.random() * 3 + 's';
    s.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(s);
  }
}

/* ---------------------------------------------------------- LIFELINES */

function available() {
  return [0, 1, 2, 3].filter((i) => !state.eliminated.has(i) && !state.wrongTried.has(i));
}

function useJoker(key) {
  if (state.locked || state.modalOpen || state.jokersUsed.has(key)) return;
  state.jokersUsed.add(key);
  const q = state.current;

  if (key === 'fifty') {
    const unavailable = new Set([...state.eliminated, ...state.wrongTried]);
    fiftyFifty(q.answerIndex, unavailable).forEach((i) => {
      state.eliminated.add(i);
      $$('.answer')[i].classList.add('eliminated');
      $$('.answer')[i].disabled = true;
    });
    if (state.selected !== null && state.eliminated.has(state.selected)) cancelSelection();
  }

  if (key === 'double') {
    state.doubleActive = true;
    $('#double-badge').classList.remove('hidden');
    showToast('2x activated: you may pick a second answer if the first is wrong.');
  }

  if (key === 'phone') openPhone();
  if (key === 'audience') openAudience();

  renderLifelines();
}

/* ---- modal helpers ---- */

function openModal(title, seconds, soundKey) {
  state.modalOpen = true;
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = '';
  $('#modal').classList.remove('hidden');
  $('#modal').dataset.sound = soundKey;
  sound.play(soundKey);

  const bar = $('#timer-bar');
  const text = $('#timer-text');
  let left = seconds;
  text.textContent = left;
  bar.style.transition = 'none';
  bar.style.width = '100%';
  void bar.offsetWidth;
  bar.style.transition = `width ${seconds}s linear`;
  bar.style.width = '0%';

  clearInterval(modalInterval);
  modalInterval = setInterval(() => {
    left--;
    text.textContent = Math.max(left, 0);
    if (left <= 0) closeModal();
  }, 1000);
}

function closeModal(silent = false) {
  clearInterval(modalInterval);
  const m = $('#modal');
  if (m.dataset.sound) sound.stop(m.dataset.sound);
  m.dataset.sound = '';
  m.classList.add('hidden');
  state.modalOpen = false;
  if (!silent) renderLifelines();
}

function openPhone() {
  const q = state.current;
  const { guess, tier } = phoneFriend(q.answerIndex, available(), state.level);
  openModal('📞 Phone a Friend', TIMES.phone, 'phone');

  const body = $('#modal-body');
  body.innerHTML = '<div class="chat"></div>';
  const chat = body.querySelector('.chat');
  const say = (who, html) => {
    const d = document.createElement('div');
    d.className = `bubble ${who}`;
    d.innerHTML = html;
    chat.appendChild(d);
  };

  const L = LETTERS[guess];
  const opt = q.options[guess];
  const answers = [
    `I'm quite sure it's <b>${L}: ${opt}</b>. I've seen this one before!`,
    `Hmm… I think it's <b>${L}: ${opt}</b>, but I'm not 100% sure.`,
    `Wow, that's a tough one. If I had to guess, I'd go with <b>${L}: ${opt}</b>… but don't bet everything on it.`
  ];

  say('you', 'Hi! I need your help with a question.');
  later(() => say('friend', 'Sure! Read me the question and the options.'), 2000);
  later(() => say('you', `“${q.question}”`), 4000);
  later(() => say('friend', 'Let me think…'), 6500);
  later(() => say('friend', answers[tier]), 11000);
}

function openAudience() {
  // Only a 15 s countdown + music; the question is put to the class in person.
  openModal('👥 Ask the Audience', TIMES.audience, 'audience');
}

/* ---------------------------------------------------------- TOAST */

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  later(() => t.classList.add('hidden'), 4500);
}
