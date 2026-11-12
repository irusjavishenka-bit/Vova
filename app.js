"use strict";

// ---------- Хранение прогресса ----------
const STORAGE_KEY = "english-easy-progress";
const LEARNED_AT = 3; // сколько правильных ответов нужно, чтобы слово считалось выученным

function emptyProgress() {
  // saved: слова, которые пользователь переводил при чтении { en: {en, ru, ex, story} }
  // stories: прочитанные рассказы { index: true }; best: рекорды игры «На скорость»
  return { words: {}, xp: 0, streak: 0, lastDay: null, grammar: {}, saved: {}, stories: {}, best: {}, settings: { slow: false } };
}

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (p && typeof p === "object") return { ...emptyProgress(), ...p };
  } catch (e) { /* хранилище недоступно */ }
  return emptyProgress();
}

let progress = loadProgress();

// ---------- Язык интерфейса: украинский (по умолчанию) или русский ----------
let LANG = progress.settings.lang === "ru" ? "ru" : "uk";
function L(ru, uk) { return LANG === "ru" ? ru : uk; }

// Русские оригиналы данных, чтобы можно было переключаться туда и обратно
const ORIGINAL = JSON.parse(JSON.stringify({ TOPICS, GRAMMAR, ALPHABET, PHONICS, STORIES, COMMON_DICT }));

function trWord(v) {
  if (LANG === "ru") return v;
  if (typeof v === "string") return UK_TR[v] || v;
  return [v[0], UK_TR[v[1]] || v[1], v[2] ? (UK_NOTES[v[2]] || v[2]) : v[2]];
}

function applyLang() {
  const O = JSON.parse(JSON.stringify(ORIGINAL));
  const uk = LANG === "uk";
  for (const k in TOPICS) {
    TOPICS[k].title = uk ? UK_TOPICS[k].title : O.TOPICS[k].title;
    TOPICS[k].words.forEach((w, i) => { w[1] = uk ? UK_TOPICS[k].words[i] : O.TOPICS[k].words[i][1]; });
  }
  GRAMMAR.forEach((g, i) => {
    g.title = uk ? UK_GRAMMAR[i].title : O.GRAMMAR[i].title;
    g.theory = uk ? UK_GRAMMAR[i].theory : O.GRAMMAR[i].theory;
  });
  ALPHABET.forEach((a, i) => {
    const o = O.ALPHABET[i];
    a[1] = uk ? ukReading(o[1]) : o[1];
    a[2] = uk ? UK_ALPHABET[o[0]][0] : o[2];
    a[5] = uk ? UK_ALPHABET[o[0]][1] : o[5];
  });
  PHONICS.forEach((p, i) => {
    const o = O.PHONICS[i];
    p[1] = uk ? UK_PHONICS[o[0]][0] : o[1];
    p[4] = uk ? UK_PHONICS[o[0]][1] : o[4];
  });
  for (const k in COMMON_DICT) COMMON_DICT[k] = trWord(O.COMMON_DICT[k]);
  STORIES.forEach((s, i) => {
    const o = O.STORIES[i];
    const u = STORIES_UK[s.id];
    s.ru = uk && u ? u.ru : o.ru;
    s.rule = uk && u ? u.rule : o.rule;
    s.text = o.text.map(([en, ru], k) => [en, uk && u ? u.text[k] : ru]);
    for (const w in o.dict) s.dict[w] = trWord(o.dict[w]);
    s.exercises = o.exercises.map(([q, opts, ans]) => {
      if (uk) for (const h in UK_EXERCISE_HINTS) q = q.replace(h, UK_EXERCISE_HINTS[h]);
      return [q, opts, ans];
    });
  });
  document.documentElement.lang = LANG;
  const btn = document.getElementById("lang-btn");
  if (btn) btn.textContent = LANG === "uk" ? "UA → RU" : "RU → UA";
}

function setLang(lang) {
  LANG = lang;
  progress.settings.lang = lang;
  save();
  applyLang();
  render();
}

// Как читается слово: [кэт] / [кет]
function readingOf(word) {
  const r = READ[String(word).toLowerCase().replace(/^to /, "")];
  if (!r) return "";
  return LANG === "uk" ? ukReading(r) : r;
}
function emojiOf(word) { return EMOJI[String(word).toLowerCase().replace(/^to /, "")] || ""; }

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  updateStats();
}

function dayString(offsetDays = 0) {
  return new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);
}

function touchStreak() {
  const t = dayString();
  if (progress.lastDay === t) return;
  progress.streak = progress.lastDay === dayString(1) ? progress.streak + 1 : 1;
  progress.lastDay = t;
}

function markAnswer(en, correct) {
  touchStreak();
  const cur = progress.words[en] || 0;
  progress.words[en] = correct ? Math.min(cur + 1, LEARNED_AT) : Math.max(cur - 1, 0);
  if (correct) progress.xp += 10;
  save();
}

function isLearned(en) { return (progress.words[en] || 0) >= LEARNED_AT; }

function updateStats() {
  document.getElementById("stat-learned").textContent = Object.values(progress.words).filter(v => v >= LEARNED_AT).length;
  document.getElementById("stat-xp").textContent = progress.xp;
  const alive = progress.lastDay === dayString() || progress.lastDay === dayString(1);
  document.getElementById("stat-streak").textContent = alive ? progress.streak : 0;
}

// ---------- Утилиты ----------
const app = document.getElementById("app");

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Озвучка ----------
const HAS_TTS = "speechSynthesis" in window;
let enVoice = null;

// Выбираем самый качественный английский голос из доступных на устройстве
function pickVoice() {
  if (!HAS_TTS) return showVoiceWarning(true);
  const voices = speechSynthesis.getVoices();
  const en = voices.filter(v => /^en([-_]|$)/i.test(v.lang));
  enVoice =
    en.find(v => /en[-_]US/i.test(v.lang) && /google|samantha|natural|aria|jenny|neural/i.test(v.name)) ||
    en.find(v => /en[-_](US|GB)/i.test(v.lang) && v.localService) ||
    en.find(v => /en[-_](US|GB)/i.test(v.lang)) ||
    en[0] || null;
  // Голоса подгружаются не сразу: предупреждаем, только если список уже есть, а английского нет
  showVoiceWarning(voices.length > 0 && !enVoice);
}

function showVoiceWarning(show) {
  const el = document.getElementById("voice-warn");
  if (el) el.hidden = !show;
}

function utter(text, slow = false) {
  const u = new SpeechSynthesisUtterance(text.replace(/^to /, ""));
  u.lang = enVoice ? enVoice.lang : "en-US";
  if (enVoice) u.voice = enVoice;
  u.rate = slow ? 0.55 : progress.settings.slow ? 0.7 : 0.95;
  return u;
}

function speak(text, slow = false) {
  if (!HAS_TTS) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter(text, slow));
}

// Читает предложения по очереди и сообщает, какое звучит сейчас
function speakSentences(list, onSentence, onEnd) {
  if (!HAS_TTS) return;
  speechSynthesis.cancel();
  list.forEach((text, k) => {
    const u = utter(text);
    u.onstart = () => onSentence(k);
    if (k === list.length - 1) { u.onend = onEnd; u.onerror = onEnd; }
    speechSynthesis.speak(u);
  });
}

if (HAS_TTS) {
  speechSynthesis.addEventListener("voiceschanged", pickVoice);
  pickVoice();
} else {
  showVoiceWarning(true);
}

function normalize(s) {
  return s.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").replace(/^to /, "");
}

function topicWords() {
  return Object.values(TOPICS).flatMap(t => t.words);
}

function savedList(storyId) {
  return Object.values(progress.saved)
    .filter(s => storyId === undefined || s.story === storyId)
    .map(s => [s.en, savedTranslation(s), s.ex]);
}

// Перевод сохранённого слова на текущем языке (ищем его в словаре рассказа)
function savedTranslation(s) {
  const idx = STORIES.findIndex(st => st.id === s.story);
  if (idx >= 0) {
    const byForm = s.w ? lookup(idx, s.w) : null;
    if (byForm) return byForm.ru;
    const dict = { ...COMMON_DICT, ...STORIES[idx].dict };
    for (const [k, v] of Object.entries(dict)) {
      if ((Array.isArray(v) ? v[0].toLowerCase() : k) === s.en.toLowerCase()) return Array.isArray(v) ? v[1] : v;
    }
  }
  return s.ru;
}

// Все слова, которые встречаются в приложении (для вариантов ответа и повторения)
function allWords() {
  const seen = new Set();
  return [...topicWords(), ...savedList()].filter(w => !seen.has(w[0]) && seen.add(w[0]));
}

function backBtn(target, label = L("← Назад", "← Назад")) {
  return `<button class="back" data-go="${target}">${label}</button>`;
}

// Набор слов для игр: тема, рассказ (s0, s1, ...), «мои слова» или повторение
function getSet(arg) {
  if (TOPICS[arg]) return { words: TOPICS[arg].words, title: TOPICS[arg].title, backTo: "topic:" + arg };
  if (arg === "my") return { words: savedList(), title: L("Мои слова", "Мої слова"), backTo: "mywords" };
  if (arg === "abc") {
    return { words: ALPHABET.map(([Lt, , , word, , ru]) => [word, ru, `${Lt} — ${word}`]), title: L("Азбука", "Абетка"), backTo: "abc" };
  }
  if (arg === "review") {
    return { words: allWords().filter(w => progress.words[w[0]] !== undefined && !isLearned(w[0])), title: L("Повторение", "Повторення"), backTo: "home" };
  }
  const m = /^s(\d+)$/.exec(arg || "");
  if (m && STORIES[m[1]]) {
    return { words: savedList(STORIES[m[1]].id), title: STORIES[m[1]].title, backTo: "story-done:" + m[1] };
  }
  return null;
}

function emptySet(set) {
  app.innerHTML = `
    ${backBtn(set ? set.backTo : "home")}
    <div class="card result">
      <div class="big">📭</div>
      <h1>${L("Здесь пока нет слов", "Тут поки немає слів")}</h1>
      <p class="muted">${L("Читай рассказы и нажимай на незнакомые слова — они появятся здесь.", "Читай оповідання і натискай на незнайомі слова — вони з'являться тут.")}</p>
      <button class="btn primary" data-go="home">${L("На главную", "На головну")}</button>
    </div>`;
}

// Плитки игр для набора слов
function gameTiles(arg, count) {
  const games = [
    ["cards", "🃏", L("Карточки", "Картки"), L("Смотри и запоминай", "Дивись і запам'ятовуй"), 1],
    ["quiz", "✅", L("Тест", "Тест"), L("Выбери перевод", "Обери переклад"), 1],
    ["typing", "⌨️", L("Написание", "Написання"), L("Напиши по-английски", "Напиши англійською"), 1],
    ["pairs", "🔗", L("Пары", "Пари"), L("Соедини слово и перевод", "З'єднай слово і переклад"), 2],
    ["listen", "🎧", L("На слух", "На слух"), L("Услышь и выбери", "Почуй і обери"), 1],
    ["blitz", "⚡", L("На скорость", "На швидкість"), progress.best[arg] ? `${L("Рекорд", "Рекорд")}: ${progress.best[arg]}` : L("60 секунд, 3 жизни", "60 секунд, 3 життя"), 1],
  ];
  return `<div class="modes">${games.map(([mode, icon, name, sub, min]) => `
    <button class="tile" data-go="${mode}:${arg}" ${count < min ? "disabled" : ""}>
      <div class="icon">${icon}</div><div class="name">${name}</div><div class="sub">${count < min ? `${L("Нужно слов", "Потрібно слів")}: ${min}` : sub}</div>
    </button>`).join("")}</div>`;
}

function resultScreen(correct, total, again, backTo, extra = "") {
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "💪";
  app.innerHTML = `
    <div class="card result">
      <div class="big">${emoji}</div>
      <h1>${correct} ${L("из", "з")} ${total}</h1>
      <p class="muted">${pct >= 70 ? L("Отличная работа!", "Чудова робота!") : L("Продолжай тренироваться — всё получится!", "Продовжуй тренуватися — все вийде!")}</p>
      ${extra}
      <div class="row" style="justify-content:center">
        <button class="btn primary" id="again">${L("Ещё раз", "Ще раз")}</button>
        <button class="btn" data-go="${backTo}">${L("Назад", "Назад")}</button>
      </div>
    </div>`;
  document.getElementById("again").onclick = again;
}

// ---------- Главная ----------
// Прогресс чтения хранится по id рассказа, чтобы новые рассказы не сбивали его
function isDone(i) { return !!(STORIES[i] && progress.stories[STORIES[i].id]); }
function storyUnlocked(i) { return i === 0 || isDone(i - 1); }
function doneCount() { return STORIES.filter((_, i) => isDone(i)).length; }
function nextStoryIndex() { const i = STORIES.findIndex((_, k) => !isDone(k)); return i; }

const LEVEL_NAMES_ALL = {
  A1: ["Начальный — самые первые шаги", "Початковий — найперші кроки"],
  A2: ["Элементарный", "Елементарний"],
  B1: ["Средний", "Середній"],
  B2: ["Выше среднего", "Вище середнього"],
  C1: ["Продвинутый", "Просунутий"],
  C2: ["Свободное владение — финиш 🏁", "Вільне володіння — фініш 🏁"],
};
const LEVEL_NAMES = new Proxy({}, { get: (_, code) => LEVEL_NAMES_ALL[code] ? L(...LEVEL_NAMES_ALL[code]) : "" });

// Группируем рассказы по уровню (A1 … C2) в порядке сложности
function storyLevels() {
  const groups = [];
  STORIES.forEach((s, i) => {
    const last = groups[groups.length - 1];
    if (last && last[0] === s.level) last[1].push(i);
    else groups.push([s.level, [i]]);
  });
  return groups;
}

// Карта пути от A1 до C2
function journeyCard() {
  const done = doneCount();
  const total = STORIES.length;
  const next = nextStoryIndex();
  return `
    <div class="card journey">
      <div class="row" style="justify-content:space-between">
        <b>${L("🗺 Путь от A1 до C2", "🗺 Шлях від A1 до C2")}</b>
        <span class="muted">${done} ${L("из", "з")} ${total} ${L("рассказов", "оповідань")}</span>
      </div>
      <div class="progress big-progress"><div style="width:${(done / total) * 100}%"></div></div>
      <div class="path">
        ${storyLevels().map(([code, items]) => {
          const d = items.filter(isDone).length;
          const state = d === items.length ? "done" : items.some(storyUnlocked) ? "current" : "";
          return `<div class="step ${state}"><span>${state === "done" ? "✅" : esc(code)}</span><small>${d}/${items.length}</small></div>`;
        }).join('<div class="step-line"></div>')}
        <div class="step-line"></div>
        <div class="step ${done === total ? "done" : ""}"><span>🏁</span><small>${L("финиш", "фініш")}</small></div>
      </div>
      ${next >= 0
        ? `<button class="btn primary" data-go="story:${next}" style="margin-top:12px">▶ ${L("Продолжить", "Продовжити")}: ${esc(STORIES[next].title)} (${esc(STORIES[next].level)})</button>`
        : `<button class="btn primary" data-go="finish" style="margin-top:12px">${L("🏆 Мой сертификат", "🏆 Мій сертифікат")}</button>`}
    </div>`;
}

function renderHome() {
  const review = getSet("review").words;
  const myCount = Object.keys(progress.saved).length;
  app.innerHTML = `
    <h1>${L("Учим английский 🚀", "Вчимо англійську 🚀")}</h1>
    <p class="muted">${L("Читай рассказы, учи слова по темам и играй, чтобы их запомнить.", "Читай оповідання, вчи слова за темами і грай, щоб їх запам'ятати.")}</p>

    ${review.length ? `
      <div class="card row" style="justify-content:space-between;margin-top:16px">
        <div><b>${L("Повторение", "Повторення")}</b><div class="muted">${L("Слов на повторение", "Слів на повторення")}: ${review.length}</div></div>
        <button class="btn primary" data-go="quiz:review">${L("Повторить", "Повторити")}</button>
      </div>` : ""}

    <h2>${L("🔤 Азбука — начни здесь", "🔤 Абетка — почни тут")}</h2>
    <button class="card abc-banner" data-go="abc">
      <span class="abc-letters">Aa Bb Cc</span>
      <span><b>${L("Буквы и звуки", "Літери і звуки")}</b><br><span class="muted">${L("26 букв, как они читаются, сочетания sh, ch, th… и игра «Первая буква»", "26 літер, як вони читаються, поєднання sh, ch, th… і гра «Перша літера»")}</span></span>
    </button>

    <h2>${L("📚 Чтение книги", "📚 Читання книжки")}</h2>
    <p class="muted" style="margin-top:-6px">${L("Потихоньку, шаг за шагом: от самых простых рассказов (A1) до самых сложных (C2). К каждому есть правило.", "Потроху, крок за кроком: від найпростіших оповідань (A1) до найскладніших (C2). До кожного є правило.")}</p>
    ${journeyCard()}
    <div class="grid">
      <button class="tile" data-go="mywords">
        <div class="icon">⭐</div>
        <div class="name">${L("Мои слова", "Мої слова")}</div>
        <div class="sub">${myCount} ${L("слов из рассказов", "слів з оповідань")}</div>
      </button>
    </div>
    ${storyLevels().map(([code, items]) => `
      <h3 class="level-head"><span class="level-code">${esc(code)}</span> ${esc(LEVEL_NAMES[code] || "")}</h3>
      <div class="grid">
        ${items.map(i => {
          const s = STORIES[i];
          const open = storyUnlocked(i);
          return `
            <button class="tile ${open ? "" : "locked"}" data-go="${open ? "story:" + i : ""}" ${open ? "" : "disabled"}>
              <div class="sub">${open ? (isDone(i) ? L("✅ Прочитано", "✅ Прочитано") : L("📖 Рассказ ", "📖 Оповідання ") + (i + 1)) : L("🔒 Сначала прочитай предыдущий", "🔒 Спочатку прочитай попереднє")}</div>
              <div class="name">${esc(s.title)}</div>
              <div class="sub">${esc(s.ru)}</div>
            </button>`;
        }).join("")}
      </div>`).join("")}

    <h2>${L("📖 Словарь по темам", "📖 Словник за темами")}</h2>
    <div class="grid">
      ${Object.entries(TOPICS).map(([key, t]) => {
        const p = t.words.filter(w => isLearned(w[0])).length / t.words.length;
        return `
          <button class="tile" data-go="topic:${key}">
            <div class="icon">${t.icon}</div>
            <div class="name">${esc(t.title)}</div>
            <div class="sub">${t.words.length} ${L("слов", "слів")} · ${Math.round(p * 100)}%</div>
            <div class="progress"><div style="width:${p * 100}%"></div></div>
          </button>`;
      }).join("")}
    </div>

    <h2>${L("✏️ Грамматика", "✏️ Граматика")}</h2>
    <div class="grid">
      ${GRAMMAR.map((g, i) => `
        <button class="tile" data-go="grammar:${i}">
          <div class="name">${esc(g.title)}</div>
          <div class="sub">${progress.grammar[i] !== undefined ? `${L("Лучший результат", "Найкращий результат")}: ${progress.grammar[i]}/${g.exercises.length}` : L("Не пройдено", "Не пройдено")}</div>
        </button>`).join("")}
    </div>

    <h2>${L("⚙️ Настройки", "⚙️ Налаштування")}</h2>
    <div class="row">
      <button class="btn" id="slow-toggle">${progress.settings.slow ? L("🐢 Медленная озвучка: включена", "🐢 Повільне озвучення: увімкнено") : L("🔊 Обычная скорость озвучки", "🔊 Звичайна швидкість озвучення")}</button>
      <button class="btn" id="lang-toggle">${L("🌐 Язык: русский → українська", "🌐 Мова: українська → русский")}</button>
      <button class="btn" data-say="Hello! Let's learn English together.">${L("▶ Проверить голос", "▶ Перевірити голос")}</button>
      <button class="btn" id="reset">${L("Сбросить прогресс", "Скинути прогрес")}</button>
    </div>
  `;
  document.getElementById("lang-toggle").onclick = () => setLang(LANG === "uk" ? "ru" : "uk");
  document.getElementById("slow-toggle").onclick = () => {
    progress.settings.slow = !progress.settings.slow;
    save();
    renderHome();
  };
  // Сброс в два нажатия: первое спрашивает, второе подтверждает
  const resetBtn = document.getElementById("reset");
  let armed = false;
  resetBtn.onclick = () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = L("Точно сбросить? Нажми ещё раз", "Точно скинути? Натисни ще раз");
      resetBtn.classList.add("danger");
      setTimeout(() => {
        if (!resetBtn.isConnected) return;
        armed = false;
        resetBtn.textContent = L("Сбросить прогресс", "Скинути прогрес");
        resetBtn.classList.remove("danger");
      }, 4000);
      return;
    }
    progress = emptyProgress();
    save();
    renderHome();
  };
}

function renderTopic(key) {
  const t = TOPICS[key];
  app.innerHTML = `
    ${backBtn("home")}
    <h1>${t.icon} ${esc(t.title)}</h1>
    <p class="muted">${L("Выучено", "Вивчено")} ${t.words.filter(w => isLearned(w[0])).length} ${L("из", "з")} ${t.words.length}</p>
    ${gameTiles(key, t.words.length)}
    <h2>${L("Список слов", "Список слів")}</h2>
    <div class="card">${wordList(t.words, false)}</div>`;
}

function wordList(words, removable) {
  return `<ul class="wordlist">
    ${words.map(([en, ru]) => `
      <li>
        <span>${emojiOf(en)} <span class="en">${esc(en)}</span>${readingOf(en) ? ` <span class="reading-sm">[${esc(readingOf(en))}]</span>` : ""} — ${esc(ru)} ${isLearned(en) ? `<span class="badge">${L("выучено", "вивчено")}</span>` : ""}</span>
        <span class="row" style="flex-wrap:nowrap">
          <button class="speak" data-say="${esc(en)}" title="${L("Произнести", "Вимовити")}">🔊</button>
          ${removable ? `<button class="speak" data-unsave="${esc(en)}" title="${L("Убрать из моих слов", "Прибрати з моїх слів")}">✕</button>` : ""}
        </span>
      </li>`).join("")}
  </ul>`;
}

// ---------- Чтение ----------
const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

function lookup(story, word) {
  const key = word.toLowerCase();
  const entry = STORIES[story].dict[key] || COMMON_DICT[key];
  if (!entry) return null;
  if (typeof entry === "string") return { word: key, base: key, ru: entry, note: "" };
  return { word: key, base: entry[0], ru: entry[1], note: entry[2] || "" };
}

function wrapWords(text) {
  let out = "", last = 0;
  text.replace(WORD_RE, (w, idx) => {
    out += esc(text.slice(last, idx)) + `<span class="w" data-w="${esc(w)}">${esc(w)}</span>`;
    last = idx + w.length;
  });
  return out + esc(text.slice(last));
}

let currentStory = null;

function renderStory(i) {
  if (!storyUnlocked(i)) return renderHome();
  const s = STORIES[i];
  currentStory = i;
  app.innerHTML = `
    ${backBtn("home")}
    <div class="counter"><span class="level-code">${esc(s.level)}</span> ${L("Рассказ", "Оповідання")} ${i + 1} ${L("из", "з")} ${STORIES.length} · ${esc(LEVEL_NAMES[s.level] || "")}</div>
    <h1>${wrapWords(s.title)}</h1>
    <p class="muted" style="margin-top:0">${esc(s.ru)}</p>

    <details class="card rule" ${isDone(i) ? "" : "open"}>
      <summary>📘 ${L("Правило", "Правило")}: ${esc(s.rule.title)}</summary>
      <div class="theory">${s.rule.html}</div>
    </details>

    <p class="hint" style="text-align:left">${L("👆 Нажми на любое слово, чтобы увидеть перевод. Слово сохранится в «Мои слова» для тренировки.", "👆 Натисни на будь-яке слово, щоб побачити переклад. Слово збережеться в «Мої слова» для тренування.")}</p>
    <div class="row">
      <button class="btn primary" id="read-all">${L("▶ Слушать весь текст", "▶ Слухати весь текст")}</button>
      <button class="btn" id="slow">${progress.settings.slow ? L("🐢 Медленно", "🐢 Повільно") : L("🔊 Обычная скорость", "🔊 Звичайна швидкість")}</button>
      <button class="btn" id="toggle-tr">${L("🇷🇺 Показать перевод", "🇺🇦 Показати переклад")}</button>
    </div>

    <div class="card book" id="book">
      ${s.text.map(([en, ru], k) => `
        <div class="sentence">
          <div class="en-line">
            <button class="play-btn" data-k="${k}" title="${L("Прослушать предложение", "Прослухати речення")}">▶</button>
            ${wrapWords(en)}
            <button class="tr-btn" data-k="${k}" title="${L("Перевод предложения", "Переклад речення")}">↔</button>
          </div>
          <div class="ru-line" id="tr-${k}" hidden>${esc(ru)}</div>
        </div>`).join("")}
    </div>

    <h2>${L("⭐ Слова из этого рассказа", "⭐ Слова з цього оповідання")}</h2>
    <div class="card" id="story-words"></div>

    <div style="margin-top:16px">
      <button class="btn primary" data-go="story-done:${i}">${L("Я дочитал(а) → тренировать слова", "Я дочитав(ла) → тренувати слова")}</button>
    </div>`;

  refreshStoryWords();

  const sentences = app.querySelectorAll(".sentence");
  const highlight = k => sentences.forEach((el, j) => el.classList.toggle("playing", j === k));
  const readBtn = document.getElementById("read-all");
  let reading = false;
  const stopReading = () => {
    reading = false;
    highlight(-1);
    if (readBtn.isConnected) readBtn.textContent = L("▶ Слушать весь текст", "▶ Слухати весь текст");
  };
  readBtn.onclick = () => {
    if (reading) { speechSynthesis.cancel(); return stopReading(); }
    reading = true;
    readBtn.textContent = L("⏹ Остановить", "⏹ Зупинити");
    speakSentences(s.text.map(t => t[0]), k => {
      highlight(k);
      sentences[k].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, stopReading);
  };
  app.querySelectorAll(".play-btn").forEach(b => {
    b.onclick = e => {
      e.stopPropagation();
      reading = false;
      readBtn.textContent = L("▶ Слушать весь текст", "▶ Слухати весь текст");
      speakSentences([s.text[b.dataset.k][0]], () => highlight(Number(b.dataset.k)), () => highlight(-1));
    };
  });
  document.getElementById("slow").onclick = e => {
    progress.settings.slow = !progress.settings.slow;
    save();
    e.target.textContent = progress.settings.slow ? L("🐢 Медленно", "🐢 Повільно") : L("🔊 Обычная скорость", "🔊 Звичайна швидкість");
  };
  let shown = false;
  document.getElementById("toggle-tr").onclick = e => {
    shown = !shown;
    app.querySelectorAll(".ru-line").forEach(el => { el.hidden = !shown; });
    e.target.textContent = shown ? L("🇷🇺 Скрыть перевод", "🇺🇦 Сховати переклад") : L("🇷🇺 Показать перевод", "🇺🇦 Показати переклад");
  };
  app.querySelectorAll(".tr-btn").forEach(b => {
    b.onclick = e => {
      e.stopPropagation();
      const line = document.getElementById("tr-" + b.dataset.k);
      line.hidden = !line.hidden;
    };
  });
}

function sentenceWith(story, word) {
  const found = STORIES[story].text.find(([en]) => (en.match(WORD_RE) || []).some(w => w.toLowerCase() === word));
  return found ? found[0] : "";
}

function refreshStoryWords() {
  if (currentStory === null) return;
  const box = document.getElementById("story-words");
  if (box) {
    const words = savedList(STORIES[currentStory].id);
    box.innerHTML = words.length
      ? wordList(words, true)
      : `<p class="muted" style="margin:0">${L("Пока пусто. Нажимай на незнакомые слова в тексте.", "Поки порожньо. Натискай на незнайомі слова в тексті.")}</p>`;
  }
  // Подсвечиваем в тексте слова, которые уже сохранены
  app.querySelectorAll(".w").forEach(el => {
    const info = lookup(currentStory, el.dataset.w);
    el.classList.toggle("saved", !!(info && progress.saved[info.base]));
  });
}

// Нижняя панель с переводом слова
const sheet = document.getElementById("sheet");

function openSheet(word) {
  const info = lookup(currentStory, word);
  if (!info) return;
  const isSaved = () => !!progress.saved[info.base];
  // Нажал на слово — значит не знает: сразу добавляем в «Мои слова»
  if (!isSaved()) {
    progress.saved[info.base] = { en: info.base, w: info.word, ru: info.ru, ex: sentenceWith(currentStory, info.word), story: STORIES[currentStory].id };
    touchStreak();
    save();
  }
  const draw = () => {
    sheet.innerHTML = `
      <button class="sheet-close" id="sheet-close" aria-label="${L("Закрыть", "Закрити")}">✕</button>
      <div class="sheet-word">${esc(info.word)} ${emojiOf(info.base)}</div>
      ${readingOf(info.word) || readingOf(info.base) ? `<div class="reading">[${esc(readingOf(info.word) || readingOf(info.base))}]</div>` : ""}
      <div class="row" style="margin:6px 0">
        <button class="btn" data-say="${esc(info.word)}">${L("🔊 Послушать", "🔊 Послухати")}</button>
        <button class="btn" data-say-slow="${esc(info.word)}">${L("🐢 Медленно", "🐢 Повільно")}</button>
        ${info.base !== info.word ? `<button class="btn" data-say="${esc(info.base)}">🔊 ${esc(info.base)}</button>` : ""}
      </div>
      ${info.base !== info.word ? `<div class="muted">${L("Начальная форма", "Початкова форма")}: <b>${esc(info.base)}</b></div>` : ""}
      <div class="sheet-ru">${esc(info.ru)}</div>
      ${info.note ? `<div class="muted">💡 ${esc(info.note)}</div>` : ""}
      <button class="btn ${isSaved() ? "" : "primary"}" id="sheet-save" style="margin-top:12px">
        ${isSaved() ? L("✓ В моих словах (убрать)", "✓ У моїх словах (прибрати)") : L("⭐ Добавить в мои слова", "⭐ Додати в мої слова")}
      </button>`;
    document.getElementById("sheet-close").onclick = closeSheet;
    document.getElementById("sheet-save").onclick = () => {
      if (isSaved()) delete progress.saved[info.base];
      else progress.saved[info.base] = { en: info.base, w: info.word, ru: info.ru, ex: sentenceWith(currentStory, info.word), story: STORIES[currentStory].id };
      save();
      draw();
      refreshStoryWords();
    };
  };
  draw();
  sheet.hidden = false;
  refreshStoryWords();
  speak(info.word);
}

function closeSheet() { if (sheet) sheet.hidden = true; }

function renderStoryDone(i) {
  if (!storyUnlocked(i)) return renderHome();
  const s = STORIES[i];
  const first = !isDone(i);
  if (first) {
    progress.stories[s.id] = true;
    progress.xp += 50;
    touchStreak();
    save();
  }
  const words = savedList(s.id);
  const next = STORIES[i + 1];
  const levelDone = next && next.level !== s.level;
  app.innerHTML = `
    ${backBtn("story:" + i, L("← К тексту", "← До тексту"))}
    <div class="card result">
      <div class="big">📖🎉</div>
      <h1>${L("Рассказ", "Оповідання")} «${esc(s.title)}» ${L("прочитан!", "прочитано!")}</h1>
      ${first ? `<p class="muted">+50 ⭐ ${next ? L("· Открыт следующий рассказ", "· Відкрито наступне оповідання") : ""}</p>` : ""}
      ${levelDone ? `<p class="level-up">🎊 ${L("Уровень", "Рівень")} ${esc(s.level)} ${L("пройден! Дальше", "пройдено! Далі")} — ${esc(next.level)}: ${esc(LEVEL_NAMES[next.level] || "")}</p>` : ""}
      <p class="muted">${L("Пройдено", "Пройдено")} ${doneCount()} ${L("из", "з")} ${STORIES.length} ${L("рассказов до финиша", "оповідань до фінішу")} 🏁</p>
    </div>

    <h2>${L("1. Закрепи правило", "1. Закріпи правило")}</h2>
    <div class="card row" style="justify-content:space-between">
      <div><b>${esc(s.rule.title)}</b><div class="muted">${s.exercises.length} ${L("задания", "завдання")}</div></div>
      <button class="btn primary" data-go="srule:${i}">${L("Упражнения", "Вправи")}</button>
    </div>

    <h2>${L("2. Выучи новые слова", "2. Вивчи нові слова")} (${words.length})</h2>
    ${words.length
      ? `<p class="muted" style="margin-top:-6px">${L("Это слова, которые ты переводил. Поиграй, чтобы их запомнить!", "Це слова, які ти перекладав(ла). Пограй, щоб їх запам'ятати!")}</p>${gameTiles("s" + i, words.length)}`
      : `<div class="card"><p style="margin:0">${L("Ты не открыл ни одного перевода — значит, знаешь все слова! 💪", "Ти не відкрив(ла) жодного перекладу — отже, знаєш усі слова! 💪")}</p></div>`}

    <div class="row" style="margin-top:24px">
      ${next ? `<button class="btn primary" data-go="story:${i + 1}">${L("Следующий рассказ →", "Наступне оповідання →")}</button>`
        : doneCount() === STORIES.length ? `<button class="btn primary" data-go="finish">${L("🏁 К финишу!", "🏁 До фінішу!")}</button>` : ""}
      <button class="btn" data-go="home">${L("На главную", "На головну")}</button>
    </div>`;
}

// ---------- Азбука ----------
function renderAbc() {
  app.innerHTML = `
    ${backBtn("home")}
    <h1>${L("🔤 Азбука", "🔤 Абетка")}</h1>
    <p class="muted">${L("Нажми на букву — услышишь, как она называется, и слово на эту букву.", "Натисни на літеру — почуєш, як вона називається, і побачиш, як вона читається в різних словах.")}</p>
    <div class="row">
      <button class="btn primary" data-go="abcgame">${L("🎯 Игра «Первая буква»", "🎯 Гра «Перша літера»")}</button>
      <button class="btn" id="abc-song">${L("▶ Весь алфавит", "▶ Уся абетка")}</button>
    </div>
    <div class="abc-grid">
      ${ALPHABET.map(([Lt, name, sound, word, emoji, ru]) => `
        <button class="abc-card" data-letter="${Lt}">
          <div class="abc-big">${Lt}${Lt.toLowerCase()}</div>
          <div class="abc-emoji">${emoji}</div>
          <div class="abc-word">${esc(word)}</div>
          <div class="muted abc-ru">${esc(ru)}</div>
          <div class="abc-name">[${esc(name)}]</div>
        </button>`).join("")}
    </div>
    <div class="card" id="abc-info" hidden></div>

    <h2>${L("🧩 Фоника — как читаются сочетания букв", "🧩 Фоніка — як читаються поєднання літер")}</h2>
    <p class="muted" style="margin-top:-6px">${L("Некоторые буквы вместе читаются по-особому. Нажми и послушай.", "Деякі літери разом читаються по-особливому. Натисни і послухай.")}</p>
    <div class="abc-grid">
      ${PHONICS.map(([combo, sound, word, emoji, ru]) => `
        <button class="abc-card" data-say="${esc(word)}">
          <div class="abc-big" style="font-size:1.4rem">${esc(combo)}</div>
          <div class="abc-emoji">${emoji}</div>
          <div class="abc-word">${esc(word)}</div>
          <div class="muted abc-ru">${esc(ru)}</div>
          <div class="abc-name">${esc(sound)}</div>
        </button>`).join("")}
    </div>

    <h2>${L("🎮 Тренируй слова из азбуки", "🎮 Тренуй слова з абетки")}</h2>
    ${gameTiles("abc", ALPHABET.length)}`;

  app.querySelectorAll("[data-letter]").forEach(btn => {
    btn.onclick = () => {
      const [Lt, name, sound, word, emoji, ru] = ALPHABET.find(a => a[0] === btn.dataset.letter);
      const info = document.getElementById("abc-info");
      info.hidden = false;
      info.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div class="abc-big">${Lt}${Lt.toLowerCase()}</div>
          <div class="abc-emoji">${emoji}</div>
        </div>
        <p><b>${L("Называется", "Називається")}:</b> [${esc(name)}] <button class="btn btn-sm" data-say="${Lt}">${L("🔊 Буква", "🔊 Літера")}</button></p>
        <h3 class="letter-head">${L("Как читается буква", "Як читається літера")} ${Lt} ${L("в словах", "у словах")}:</h3>
        <div class="letter-sounds">
          ${(LETTER_SOUNDS[Lt] || []).map(([w, r, pic, sRu, sUk]) => `
            <div class="ls-row">
              <span class="ls-pic">${pic}</span>
              <span class="ls-main">
                <b class="ls-word">${highlightLetter(w, Lt)}</b>
                <span class="reading-sm">[${esc(LANG === "uk" ? ukReading(r) : r)}]</span>
                <span class="muted ls-note">${esc(L(sRu, sUk))}</span>
              </span>
              <span class="row" style="flex-wrap:nowrap;gap:4px">
                <button class="speak" data-say="${esc(w)}" title="${L("Послушать", "Послухати")}">🔊</button>
                <button class="speak" data-say-slow="${esc(w)}" title="${L("Медленно", "Повільно")}">🐢</button>
              </span>
            </div>`).join("")}
        </div>`;
      app.querySelectorAll(".abc-card.active").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      speakSentences([Lt + "."], () => {}, () => {});
      info.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
  });
  document.getElementById("abc-song").onclick = () => {
    const cards = app.querySelectorAll("[data-letter]");
    speakSentences(ALPHABET.map(a => a[0] + "."), k => {
      cards.forEach((c, j) => c.classList.toggle("active", j === k));
    }, () => cards.forEach(c => c.classList.remove("active")));
  };
}

// Выделяет букву в слове: c<b>a</b>t
function highlightLetter(word, letter) {
  return esc(word).replace(new RegExp(letter, "gi"), m => `<span class="hl">${m}</span>`);
}

// Игра: услышь слово и выбери, с какой буквы оно начинается
function renderAbcGame() {
  const rounds = shuffle(ALPHABET).slice(0, 10);
  let i = 0, correct = 0;
  function draw() {
    const [Lt, , , word, emoji, ru] = rounds[i];
    const options = shuffle([Lt, ...shuffle(ALPHABET.filter(a => a[0] !== Lt)).slice(0, 3).map(a => a[0])]);
    app.innerHTML = `
      ${backBtn("abc")}
      <div class="counter">${L("Слово", "Слово")} ${i + 1} ${L("из", "з")} ${rounds.length} · ${L("Верно", "Правильно")}: ${correct}</div>
      <div class="question"><div class="abc-emoji" style="font-size:4rem">${emoji}</div>
        <button class="btn primary" id="play">${L("🔊 Послушать слово", "🔊 Послухати слово")}</button></div>
      <p class="muted" style="text-align:center">${L("С какой буквы начинается слово?", "З якої літери починається слово?")}</p>
      <div class="abc-options">${options.map(o => `<button class="option abc-option" data-val="${o}">${o}${o.toLowerCase()}</button>`).join("")}</div>
      <div class="feedback" id="fb"></div>
      <button class="btn primary" id="next" style="display:none">${L("Дальше →", "Далі →")}</button>`;
    document.getElementById("play").onclick = () => speak(word);
    speak(word);
    app.querySelectorAll(".abc-option").forEach(btn => {
      btn.onclick = () => {
        const ok = btn.dataset.val === Lt;
        app.querySelectorAll(".abc-option").forEach(b => {
          b.disabled = true;
          if (b.dataset.val === Lt) b.classList.add("correct");
        });
        if (!ok) btn.classList.add("wrong");
        if (ok) { correct++; progress.xp += 10; }
        touchStreak(); save();
        const fb = document.getElementById("fb");
        fb.className = "feedback " + (ok ? "good" : "bad");
        fb.textContent = `${ok ? L("Правильно! 🎉", "Правильно! 🎉") : L("Не совсем.", "Не зовсім.")} ${word} — ${ru}, ${L("начинается с буквы", "починається з літери")} ${Lt}`;
        const next = document.getElementById("next");
        next.style.display = "inline-block";
        next.onclick = () => {
          i++;
          if (i < rounds.length) draw();
          else resultScreen(correct, rounds.length, renderAbcGame, "abc");
        };
      };
    });
  }
  draw();
}

function renderFinish() {
  if (doneCount() < STORIES.length) return renderHome();
  const learned = Object.values(progress.words).filter(v => v >= LEARNED_AT).length;
  const name = progress.settings.name || "";
  app.innerHTML = `
    ${backBtn("home")}
    <div class="card certificate">
      <div class="big">🏆</div>
      <div class="muted">${L("СЕРТИФИКАТ", "СЕРТИФІКАТ")}</div>
      <h1>${L("Путь от A1 до C2 пройден!", "Шлях від A1 до C2 пройдено!")}</h1>
      <p class="cert-name">${name ? esc(name) : L("Ваше имя", "Ваше ім'я")}</p>
      <p>${L("прочитал(а) все рассказы", "прочитав(ла) всі оповідання")} (${STORIES.length}), ${L("выучил(а) слов", "вивчив(ла) слів")}: ${learned}, ${L("набрал(а)", "набрав(ла)")} ${progress.xp} ⭐</p>
      <div class="cert-levels">${["A1", "A2", "B1", "B2", "C1", "C2"].map(l => `<span class="level-code">${l} ✓</span>`).join("")}</div>
      <p class="muted">${new Date().toLocaleDateString("ru-RU")}</p>
    </div>
    <div class="row no-print" style="margin-top:16px">
      <input class="input" id="cert-name" placeholder="${L("Впиши имя для сертификата", "Впиши ім'я для сертифіката")}" value="${esc(name)}" style="flex:1;min-width:200px">
      <button class="btn primary" id="cert-save">${L("Сохранить имя", "Зберегти ім'я")}</button>
    </div>
    <p class="muted no-print">${L("📸 Сделай снимок экрана, чтобы сохранить сертификат.", "📸 Зроби знімок екрана, щоб зберегти сертифікат.")}</p>`;
  document.getElementById("cert-save").onclick = () => {
    progress.settings.name = document.getElementById("cert-name").value.trim();
    save();
    renderFinish();
  };
}

function renderMyWords() {
  const words = savedList();
  app.innerHTML = `
    ${backBtn("home")}
    <h1>⭐ ${L("Мои слова", "Мої слова")}</h1>
    <p class="muted">${L("Слова, которые ты переводил при чтении. Выучено", "Слова, які ти перекладав(ла) під час читання. Вивчено")} ${words.filter(w => isLearned(w[0])).length} ${L("из", "з")} ${words.length}.</p>
    ${gameTiles("my", words.length)}
    <h2>${L("Список", "Список")}</h2>
    <div class="card" id="my-list">${words.length ? wordList(words, true) : `<p class="muted" style="margin:0">${L("Пока пусто. Открой рассказ и нажимай на незнакомые слова.", "Поки порожньо. Відкрий оповідання і натискай на незнайомі слова.")}</p>`}</div>`;
}

// ---------- Игры ----------
function renderCards(arg) {
  const set = getSet(arg);
  if (!set || !set.words.length) return emptySet(set);
  const words = shuffle(set.words);
  let i = 0;

  function draw() {
    const [en, ru, ex] = words[i];
    app.innerHTML = `
      ${backBtn(set.backTo)}
      <div class="row" style="justify-content:space-between">
        <span class="counter">${L("Карточка", "Картка")} ${i + 1} ${L("из", "з")} ${words.length}</span>
        <button class="speak" data-say="${esc(en)}">🔊</button>
      </div>
      <div class="flashcard" id="fc">
        <div class="flashcard-inner">
          <div class="face"><div class="word">${esc(en)}</div><div class="hint">${L("Нажми, чтобы перевернуть", "Натисни, щоб перевернути")}</div></div>
          <div class="face back-face">
            ${emojiOf(en) ? `<div class="card-pic">${emojiOf(en)}</div>` : ""}
            <div class="word">${esc(ru)}</div>
            <div class="reading">${esc(en)}${readingOf(en) ? ` — [${esc(readingOf(en))}]` : ""}</div>
            <div class="example">${esc(ex || "")}</div>
            ${ex ? `<button class="btn" data-say="${esc(ex)}" style="margin-top:8px">${L("🔊 Пример", "🔊 Приклад")}</button>` : ""}
          </div>
        </div>
      </div>
      <div class="row" style="justify-content:space-between">
        <button class="btn" id="prev" ${i === 0 ? "disabled" : ""}>${L("← Пред.", "← Попер.")}</button>
        <button class="btn primary" id="next">${i === words.length - 1 ? L("Готово ✓", "Готово ✓") : L("След. →", "Наст. →")}</button>
      </div>`;
    document.getElementById("fc").onclick = () => document.getElementById("fc").classList.toggle("flipped");
    document.getElementById("prev").onclick = () => { i--; draw(); };
    document.getElementById("next").onclick = () => {
      if (i === words.length - 1) { touchStreak(); save(); navigate(set.backTo); }
      else { i++; draw(); }
    };
    speak(en);
  }
  draw();
}

// Варианты ответа: правильный + 3 других, без повторов
function makeOptions(answer, en, pool, field) {
  const vals = [answer];
  for (const w of shuffle(pool)) {
    if (vals.length >= 4) break;
    const v = w[field];
    if (w[0] !== en && !vals.includes(v)) vals.push(v);
  }
  return shuffle(vals);
}

function distractorPool(set) {
  return set.words.length >= 4 ? set.words : allWords();
}

// Тест с вариантами (обычный и на слух)
function renderQuiz(arg, mode = "quiz") {
  const set = getSet(arg);
  if (!set || !set.words.length) return emptySet(set);
  const questions = shuffle(set.words).slice(0, 10);
  const pool = distractorPool(set);
  let i = 0, correct = 0;

  function draw() {
    const [en, ru] = questions[i];
    // В режиме теста чередуем направление: en→ru и ru→en
    const reverse = mode === "quiz" && i % 2 === 1;
    const toEnglish = mode === "listen" || reverse;
    const answer = toEnglish ? en : ru;
    const options = makeOptions(answer, en, pool, toEnglish ? 0 : 1);

    app.innerHTML = `
      ${backBtn(set.backTo)}
      <div class="counter">${L("Вопрос", "Питання")} ${i + 1} ${L("из", "з")} ${questions.length} · ${L("Верно", "Правильно")}: ${correct}</div>
      ${mode === "listen"
        ? `<div class="question"><button class="btn primary" id="play">${L("🔊 Прослушать ещё раз", "🔊 Прослухати ще раз")}</button></div>
           <p class="muted" style="text-align:center">${L("Какое слово ты услышал?", "Яке слово ти почув(ла)?")}</p>`
        : `<div class="question">${esc(reverse ? ru : en)}</div>
           <p class="muted" style="text-align:center">${reverse ? L("Как это по-английски?", "Як це англійською?") : L("Выбери перевод", "Обери переклад")}</p>`}
      <div class="options">
        ${options.map(o => `<button class="option" data-val="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>
      <div class="feedback" id="fb"></div>
      <button class="btn primary" id="next" style="display:none">${L("Дальше →", "Далі →")}</button>`;

    if (mode === "listen") {
      document.getElementById("play").onclick = () => speak(en);
      speak(en);
    }

    app.querySelectorAll(".option").forEach(btn => {
      btn.onclick = () => {
        const ok = btn.dataset.val === answer;
        app.querySelectorAll(".option").forEach(b => {
          b.disabled = true;
          if (b.dataset.val === answer) b.classList.add("correct");
        });
        if (!ok) btn.classList.add("wrong");
        if (ok) correct++;
        markAnswer(en, ok);
        const fb = document.getElementById("fb");
        fb.className = "feedback " + (ok ? "good" : "bad");
        fb.textContent = ok ? L("Правильно! 🎉", "Правильно! 🎉") : `${L("Неверно.", "Неправильно.")} ${en} — ${ru}`;
        if (mode !== "listen") speak(en);
        const next = document.getElementById("next");
        next.style.display = "inline-block";
        next.focus();
        next.onclick = () => {
          i++;
          if (i < questions.length) draw();
          else resultScreen(correct, questions.length, () => renderQuiz(arg, mode), set.backTo);
        };
      };
    });
  }
  draw();
}

function renderTyping(arg) {
  const set = getSet(arg);
  if (!set || !set.words.length) return emptySet(set);
  const questions = shuffle(set.words).slice(0, 10);
  let i = 0, correct = 0;

  function draw() {
    const [en, ru, ex] = questions[i];
    const target = en.replace(/^to /, "");
    app.innerHTML = `
      ${backBtn(set.backTo)}
      <div class="counter">${L("Слово", "Слово")} ${i + 1} ${L("из", "з")} ${questions.length} · ${L("Верно", "Правильно")}: ${correct}</div>
      <div class="question">${esc(ru)}</div>
      <p class="muted" style="text-align:center">${L("Напиши по-английски", "Напиши англійською")} (${target.length} ${L("букв", "літер")})</p>
      <form id="form">
        <input class="input" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${L("Твой ответ...", "Твоя відповідь...")}">
        <div class="feedback" id="fb"></div>
        <div class="row">
          <button class="btn primary" type="submit" id="check">${L("Проверить", "Перевірити")}</button>
          <button class="btn" type="button" id="hint">${L("Подсказка", "Підказка")}</button>
        </div>
      </form>`;
    const input = document.getElementById("answer");
    const fb = document.getElementById("fb");
    let answered = false, hints = 0;
    input.focus();

    document.getElementById("hint").onclick = () => {
      hints = Math.min(hints + 1, target.length);
      input.value = target.slice(0, hints);
      input.focus();
    };

    document.getElementById("form").onsubmit = e => {
      e.preventDefault();
      if (answered) {
        i++;
        if (i < questions.length) draw();
        else resultScreen(correct, questions.length, () => renderTyping(arg), set.backTo);
        return;
      }
      if (!input.value.trim()) return;
      answered = true;
      const ok = normalize(input.value) === normalize(en);
      if (ok) correct++;
      markAnswer(en, ok);
      input.disabled = true;
      fb.className = "feedback " + (ok ? "good" : "bad");
      fb.innerHTML = ok ? L("Правильно! 🎉", "Правильно! 🎉") : `${L("Неверно. Правильно:", "Неправильно. Правильно:")} <b>${esc(en)}</b>`;
      if (ex) fb.innerHTML += `<div class="muted" style="font-weight:400;font-style:italic">${esc(ex)}</div>`;
      speak(en);
      document.getElementById("check").textContent = L("Дальше →", "Далі →");
      document.getElementById("hint").style.display = "none";
      document.getElementById("check").focus();
    };
  }
  draw();
}

function renderPairs(arg) {
  const set = getSet(arg);
  if (!set || set.words.length < 2) return emptySet(set);
  const chosen = shuffle(set.words).slice(0, 6);
  const left = shuffle(chosen.map(w => w[0]));
  const right = shuffle(chosen.map(w => w[1]));
  const map = Object.fromEntries(chosen.map(w => [w[0], w[1]]));
  let selected = null, done = 0, mistakes = 0;
  const startedAt = Date.now();

  app.innerHTML = `
    ${backBtn(set.backTo)}
    <h1>${L("🔗 Соедини пары", "🔗 З'єднай пари")}</h1>
    <p class="muted">${L("Нажми на английское слово, а затем на его перевод.", "Натисни на англійське слово, а потім на його переклад.")}</p>
    <div class="pairs">
      <div class="options">${left.map(w => `<button class="pair" data-side="en" data-val="${esc(w)}">${esc(w)}</button>`).join("")}</div>
      <div class="options">${right.map(w => `<button class="pair" data-side="ru" data-val="${esc(w)}">${esc(w)}</button>`).join("")}</div>
    </div>
    <div class="feedback" id="fb"></div>`;

  app.querySelectorAll(".pair").forEach(btn => {
    btn.onclick = () => {
      if (btn.classList.contains("done")) return;
      if (!selected || selected.dataset.side === btn.dataset.side) {
        if (selected) selected.classList.remove("selected");
        selected = btn;
        btn.classList.add("selected");
        if (btn.dataset.side === "en") speak(btn.dataset.val);
        return;
      }
      const en = selected.dataset.side === "en" ? selected.dataset.val : btn.dataset.val;
      const ru = selected.dataset.side === "ru" ? selected.dataset.val : btn.dataset.val;
      const a = selected, b = btn;
      selected = null;
      a.classList.remove("selected");
      if (map[en] === ru) {
        a.classList.add("done"); b.classList.add("done");
        markAnswer(en, true);
        done++;
        if (done === chosen.length) {
          const sec = Math.round((Date.now() - startedAt) / 1000);
          setTimeout(() => resultScreen(chosen.length, chosen.length + mistakes, () => renderPairs(arg), set.backTo,
            `<p>⏱ ${L("Время", "Час")}: ${sec} ${L("сек.", "с")} · ${L("Ошибок", "Помилок")}: ${mistakes}</p>`), 300);
        }
      } else {
        mistakes++;
        a.classList.add("wrong"); b.classList.add("wrong");
        setTimeout(() => { a.classList.remove("wrong"); b.classList.remove("wrong"); }, 500);
      }
    };
  });
}

// Игра «На скорость»: 60 секунд, 3 жизни, комбо за серию правильных ответов
let blitzTimer = null;

function renderBlitz(arg) {
  const set = getSet(arg);
  if (!set || !set.words.length) return emptySet(set);
  const pool = distractorPool(set);
  let queue = [], score = 0, lives = 3, combo = 0, timeLeft = 60, current = null, locked = false;

  app.innerHTML = `
    ${backBtn(set.backTo)}
    <div class="blitz-bar">
      <span id="b-lives">❤️❤️❤️</span>
      <span>⏱ <b id="b-time">60</b></span>
      <span>${L("Очки", "Бали")}: <b id="b-score">0</b></span>
    </div>
    <div class="progress"><div id="b-progress" style="width:100%;background:var(--primary)"></div></div>
    <div class="combo" id="b-combo"></div>
    <div class="question" id="b-word"></div>
    <div class="options" id="b-options"></div>`;

  function nextWord() {
    if (!queue.length) queue = shuffle(set.words);
    current = queue.pop();
    const reverse = Math.random() < 0.5;
    const answer = reverse ? current[0] : current[1];
    document.getElementById("b-word").textContent = reverse ? current[1] : current[0];
    const opts = makeOptions(answer, current[0], pool, reverse ? 0 : 1);
    const box = document.getElementById("b-options");
    box.innerHTML = opts.map(o => `<button class="option" data-val="${esc(o)}">${esc(o)}</button>`).join("");
    locked = false;
    box.querySelectorAll(".option").forEach(btn => {
      btn.onclick = () => {
        if (locked) return;
        locked = true;
        const ok = btn.dataset.val === answer;
        markAnswer(current[0], ok);
        if (ok) {
          combo++;
          score += 10 * Math.min(1 + Math.floor(combo / 3), 4);
          btn.classList.add("correct");
        } else {
          combo = 0;
          lives--;
          btn.classList.add("wrong");
          box.querySelectorAll(".option").forEach(b => { if (b.dataset.val === answer) b.classList.add("correct"); });
        }
        updateHud();
        if (lives <= 0) return setTimeout(finish, 600);
        setTimeout(nextWord, ok ? 250 : 900);
      };
    });
  }

  function updateHud() {
    document.getElementById("b-score").textContent = score;
    document.getElementById("b-lives").textContent = "❤️".repeat(lives) + "🤍".repeat(3 - lives);
    const mult = Math.min(1 + Math.floor(combo / 3), 4);
    document.getElementById("b-combo").textContent = combo >= 3 ? `🔥 ${L("Комбо", "Комбо")} ×${mult} (${combo} ${L("подряд", "поспіль")})` : "";
  }

  function finish() {
    clearInterval(blitzTimer);
    blitzTimer = null;
    const record = score > (progress.best[arg] || 0);
    if (record) progress.best[arg] = score;
    progress.xp += Math.round(score / 5);
    touchStreak();
    save();
    app.innerHTML = `
      <div class="card result">
        <div class="big">${record ? "🏆" : "⚡"}</div>
        <h1>${score} ${L("очков", "балів")}</h1>
        <p class="muted">${record ? L("Новый рекорд!", "Новий рекорд!") : `${L("Рекорд", "Рекорд")}: ${progress.best[arg]}`}</p>
        <p>+${Math.round(score / 5)} ⭐</p>
        <div class="row" style="justify-content:center">
          <button class="btn primary" id="again">${L("Ещё раз", "Ще раз")}</button>
          <button class="btn" data-go="${set.backTo}">${L("Назад", "Назад")}</button>
        </div>
      </div>`;
    document.getElementById("again").onclick = () => renderBlitz(arg);
  }

  clearInterval(blitzTimer);
  blitzTimer = setInterval(() => {
    timeLeft--;
    const t = document.getElementById("b-time");
    if (!t) { clearInterval(blitzTimer); return; }
    t.textContent = timeLeft;
    document.getElementById("b-progress").style.width = (timeLeft / 60) * 100 + "%";
    if (timeLeft <= 0) finish();
  }, 1000);
  nextWord();
}

// ---------- Грамматика ----------
function renderGrammar(idx) {
  const g = GRAMMAR[idx];
  app.innerHTML = `
    ${backBtn("home")}
    <h1>${esc(g.title)}</h1>
    <div class="card theory">${g.theory}</div>
    <div style="margin-top:16px"><button class="btn primary" data-go="gex:${idx}">${L("Начать упражнения →", "Почати вправи →")}</button></div>`;
}

// Упражнения «вставь слово» — для уроков грамматики и правил к рассказам
function runExercises(exercises, backTo, onFinish, again) {
  const qs = shuffle(exercises);
  let i = 0, correct = 0;

  function draw() {
    const [sentence, opts, ans] = qs[i];
    app.innerHTML = `
      ${backBtn(backTo)}
      <div class="counter">${L("Задание", "Завдання")} ${i + 1} ${L("из", "з")} ${qs.length} · ${L("Верно", "Правильно")}: ${correct}</div>
      <div class="question">${esc(sentence).replace("___", "<u>&nbsp;&nbsp;?&nbsp;&nbsp;</u>")}</div>
      <div class="options">${opts.map((o, k) => `<button class="option" data-k="${k}">${esc(o)}</button>`).join("")}</div>
      <div class="feedback" id="fb"></div>
      <button class="btn primary" id="next" style="display:none">${L("Дальше →", "Далі →")}</button>`;
    app.querySelectorAll(".option").forEach(btn => {
      btn.onclick = () => {
        const ok = Number(btn.dataset.k) === ans;
        app.querySelectorAll(".option").forEach(b => {
          b.disabled = true;
          if (Number(b.dataset.k) === ans) b.classList.add("correct");
        });
        if (!ok) btn.classList.add("wrong");
        if (ok) { correct++; progress.xp += 10; }
        touchStreak(); save();
        const full = sentence.replace(/ \(.*\)$/, "").replace("___", opts[ans]);
        const fb = document.getElementById("fb");
        fb.className = "feedback " + (ok ? "good" : "bad");
        fb.textContent = (ok ? L("Правильно! ", "Правильно! ") : L("Неверно. ", "Неправильно. ")) + full;
        speak(full);
        const next = document.getElementById("next");
        next.style.display = "inline-block";
        next.onclick = () => {
          i++;
          if (i < qs.length) return draw();
          onFinish(correct);
          resultScreen(correct, qs.length, again, backTo);
        };
      };
    });
  }
  draw();
}

// ---------- Навигация ----------
function navigate(route) {
  if (location.hash.slice(1) !== route) location.hash = route;
  else render();
}

function render() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  clearInterval(blitzTimer);
  closeSheet();
  currentStory = null;
  const [view, arg] = (location.hash.slice(1) || "home").split(":");
  const n = Number(arg);
  window.scrollTo(0, 0);
  switch (view) {
    case "topic": return TOPICS[arg] ? renderTopic(arg) : renderHome();
    case "cards": return renderCards(arg);
    case "quiz": return renderQuiz(arg, "quiz");
    case "listen": return renderQuiz(arg, "listen");
    case "typing": return renderTyping(arg);
    case "pairs": return renderPairs(arg);
    case "blitz": return renderBlitz(arg);
    case "mywords": return renderMyWords();
    case "finish": return renderFinish();
    case "abc": return renderAbc();
    case "abcgame": return renderAbcGame();
    case "story": return STORIES[n] ? renderStory(n) : renderHome();
    case "story-done": return STORIES[n] ? renderStoryDone(n) : renderHome();
    case "srule":
      if (!STORIES[n]) return renderHome();
      return runExercises(STORIES[n].exercises, "story-done:" + n, () => {}, () => render());
    case "grammar": return GRAMMAR[n] ? renderGrammar(n) : renderHome();
    case "gex":
      if (!GRAMMAR[n]) return renderHome();
      return runExercises(GRAMMAR[n].exercises, "grammar:" + n, correct => {
        progress.grammar[n] = Math.max(progress.grammar[n] || 0, correct);
        save();
      }, () => render());
    default: return renderHome();
  }
}

document.addEventListener("click", e => {
  const go = e.target.closest("[data-go]");
  if (go) { if (go.dataset.go) navigate(go.dataset.go); return; }
  const say = e.target.closest("[data-say]");
  if (say) { e.stopPropagation(); speak(say.dataset.say); return; }
  const saySlow = e.target.closest("[data-say-slow]");
  if (saySlow) { e.stopPropagation(); speak(saySlow.dataset.saySlow, true); return; }
  const unsave = e.target.closest("[data-unsave]");
  if (unsave) {
    delete progress.saved[unsave.dataset.unsave];
    save();
    if (currentStory !== null) refreshStoryWords();
    else render();
    return;
  }
  const w = e.target.closest(".w");
  if (w && currentStory !== null) { openSheet(w.dataset.w); return; }
  if (!sheet.hidden && e.target.isConnected && !sheet.contains(e.target)) closeSheet();
});

document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
window.addEventListener("hashchange", render);
document.getElementById("lang-btn").onclick = () => setLang(LANG === "uk" ? "ru" : "uk");
applyLang();
updateStats();
render();
