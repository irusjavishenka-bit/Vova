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
    .map(s => [s.en, s.ru, s.ex]);
}

// Все слова, которые встречаются в приложении (для вариантов ответа и повторения)
function allWords() {
  const seen = new Set();
  return [...topicWords(), ...savedList()].filter(w => !seen.has(w[0]) && seen.add(w[0]));
}

function backBtn(target, label = "← Назад") {
  return `<button class="back" data-go="${target}">${label}</button>`;
}

// Набор слов для игр: тема, рассказ (s0, s1, ...), «мои слова» или повторение
function getSet(arg) {
  if (TOPICS[arg]) return { words: TOPICS[arg].words, title: TOPICS[arg].title, backTo: "topic:" + arg };
  if (arg === "my") return { words: savedList(), title: "Мои слова", backTo: "mywords" };
  if (arg === "abc") {
    return { words: ALPHABET.map(([L, , , word, , ru]) => [word, ru, `${L} — ${word}`]), title: "Азбука", backTo: "abc" };
  }
  if (arg === "review") {
    return { words: allWords().filter(w => progress.words[w[0]] !== undefined && !isLearned(w[0])), title: "Повторение", backTo: "home" };
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
      <h1>Здесь пока нет слов</h1>
      <p class="muted">Читай рассказы и нажимай на незнакомые слова — они появятся здесь.</p>
      <button class="btn primary" data-go="home">На главную</button>
    </div>`;
}

// Плитки игр для набора слов
function gameTiles(arg, count) {
  const games = [
    ["cards", "🃏", "Карточки", "Смотри и запоминай", 1],
    ["quiz", "✅", "Тест", "Выбери перевод", 1],
    ["typing", "⌨️", "Написание", "Напиши по-английски", 1],
    ["pairs", "🔗", "Пары", "Соедини слово и перевод", 2],
    ["listen", "🎧", "На слух", "Услышь и выбери", 1],
    ["blitz", "⚡", "На скорость", progress.best[arg] ? `Рекорд: ${progress.best[arg]}` : "60 секунд, 3 жизни", 1],
  ];
  return `<div class="modes">${games.map(([mode, icon, name, sub, min]) => `
    <button class="tile" data-go="${mode}:${arg}" ${count < min ? "disabled" : ""}>
      <div class="icon">${icon}</div><div class="name">${name}</div><div class="sub">${count < min ? `Нужно слов: ${min}` : sub}</div>
    </button>`).join("")}</div>`;
}

function resultScreen(correct, total, again, backTo, extra = "") {
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "💪";
  app.innerHTML = `
    <div class="card result">
      <div class="big">${emoji}</div>
      <h1>${correct} из ${total}</h1>
      <p class="muted">${pct >= 70 ? "Отличная работа!" : "Продолжай тренироваться — всё получится!"}</p>
      ${extra}
      <div class="row" style="justify-content:center">
        <button class="btn primary" id="again">Ещё раз</button>
        <button class="btn" data-go="${backTo}">Назад</button>
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

const LEVEL_NAMES = {
  A1: "Начальный — самые первые шаги",
  A2: "Элементарный",
  B1: "Средний",
  B2: "Выше среднего",
  C1: "Продвинутый",
  C2: "Свободное владение — финиш 🏁",
};

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
        <b>🗺 Путь от A1 до C2</b>
        <span class="muted">${done} из ${total} рассказов</span>
      </div>
      <div class="progress big-progress"><div style="width:${(done / total) * 100}%"></div></div>
      <div class="path">
        ${storyLevels().map(([code, items]) => {
          const d = items.filter(isDone).length;
          const state = d === items.length ? "done" : items.some(storyUnlocked) ? "current" : "";
          return `<div class="step ${state}"><span>${state === "done" ? "✅" : esc(code)}</span><small>${d}/${items.length}</small></div>`;
        }).join('<div class="step-line"></div>')}
        <div class="step-line"></div>
        <div class="step ${done === total ? "done" : ""}"><span>🏁</span><small>финиш</small></div>
      </div>
      ${next >= 0
        ? `<button class="btn primary" data-go="story:${next}" style="margin-top:12px">▶ Продолжить: ${esc(STORIES[next].title)} (${esc(STORIES[next].level)})</button>`
        : `<button class="btn primary" data-go="finish" style="margin-top:12px">🏆 Мой сертификат</button>`}
    </div>`;
}

function renderHome() {
  const review = getSet("review").words;
  const myCount = Object.keys(progress.saved).length;
  app.innerHTML = `
    <h1>Учим английский 🚀</h1>
    <p class="muted">Читай рассказы, учи слова по темам и играй, чтобы их запомнить.</p>

    ${review.length ? `
      <div class="card row" style="justify-content:space-between;margin-top:16px">
        <div><b>Повторение</b><div class="muted">Слов на повторение: ${review.length}</div></div>
        <button class="btn primary" data-go="quiz:review">Повторить</button>
      </div>` : ""}

    <h2>🔤 Азбука — начни здесь</h2>
    <button class="card abc-banner" data-go="abc">
      <span class="abc-letters">Aa Bb Cc</span>
      <span><b>Буквы и звуки</b><br><span class="muted">26 букв, как они читаются, сочетания sh, ch, th… и игра «Первая буква»</span></span>
    </button>

    <h2>📚 Чтение книги</h2>
    <p class="muted" style="margin-top:-6px">Потихоньку, шаг за шагом: от самых простых рассказов (A1) до самых сложных (C2). К каждому есть правило.</p>
    ${journeyCard()}
    <div class="grid">
      <button class="tile" data-go="mywords">
        <div class="icon">⭐</div>
        <div class="name">Мои слова</div>
        <div class="sub">${myCount} слов из рассказов</div>
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
              <div class="sub">${open ? (isDone(i) ? "✅ Прочитано" : "📖 Рассказ " + (i + 1)) : "🔒 Сначала прочитай предыдущий"}</div>
              <div class="name">${esc(s.title)}</div>
              <div class="sub">${esc(s.ru)}</div>
            </button>`;
        }).join("")}
      </div>`).join("")}

    <h2>📖 Словарь по темам</h2>
    <div class="grid">
      ${Object.entries(TOPICS).map(([key, t]) => {
        const p = t.words.filter(w => isLearned(w[0])).length / t.words.length;
        return `
          <button class="tile" data-go="topic:${key}">
            <div class="icon">${t.icon}</div>
            <div class="name">${esc(t.title)}</div>
            <div class="sub">${t.words.length} слов · ${Math.round(p * 100)}%</div>
            <div class="progress"><div style="width:${p * 100}%"></div></div>
          </button>`;
      }).join("")}
    </div>

    <h2>✏️ Грамматика</h2>
    <div class="grid">
      ${GRAMMAR.map((g, i) => `
        <button class="tile" data-go="grammar:${i}">
          <div class="name">${esc(g.title)}</div>
          <div class="sub">${progress.grammar[i] !== undefined ? `Лучший результат: ${progress.grammar[i]}/${g.exercises.length}` : "Не пройдено"}</div>
        </button>`).join("")}
    </div>

    <h2>⚙️ Настройки</h2>
    <div class="row">
      <button class="btn" id="slow-toggle">${progress.settings.slow ? "🐢 Медленная озвучка: включена" : "🔊 Обычная скорость озвучки"}</button>
      <button class="btn" data-say="Hello! Let's learn English together.">▶ Проверить голос</button>
      <button class="btn" id="reset">Сбросить прогресс</button>
    </div>
  `;
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
      resetBtn.textContent = "Точно сбросить? Нажми ещё раз";
      resetBtn.classList.add("danger");
      setTimeout(() => {
        if (!resetBtn.isConnected) return;
        armed = false;
        resetBtn.textContent = "Сбросить прогресс";
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
    <p class="muted">Выучено ${t.words.filter(w => isLearned(w[0])).length} из ${t.words.length}</p>
    ${gameTiles(key, t.words.length)}
    <h2>Список слов</h2>
    <div class="card">${wordList(t.words, false)}</div>`;
}

function wordList(words, removable) {
  return `<ul class="wordlist">
    ${words.map(([en, ru]) => `
      <li>
        <span><span class="en">${esc(en)}</span> — ${esc(ru)} ${isLearned(en) ? '<span class="badge">выучено</span>' : ""}</span>
        <span class="row" style="flex-wrap:nowrap">
          <button class="speak" data-say="${esc(en)}" title="Произнести">🔊</button>
          ${removable ? `<button class="speak" data-unsave="${esc(en)}" title="Убрать из моих слов">✕</button>` : ""}
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
    <div class="counter"><span class="level-code">${esc(s.level)}</span> Рассказ ${i + 1} из ${STORIES.length} · ${esc(LEVEL_NAMES[s.level] || "")}</div>
    <h1>${wrapWords(s.title)}</h1>
    <p class="muted" style="margin-top:0">${esc(s.ru)}</p>

    <details class="card rule" ${isDone(i) ? "" : "open"}>
      <summary>📘 Правило: ${esc(s.rule.title)}</summary>
      <div class="theory">${s.rule.html}</div>
    </details>

    <p class="hint" style="text-align:left">👆 Нажми на любое слово, чтобы увидеть перевод. Слово сохранится в «Мои слова» для тренировки.</p>
    <div class="row">
      <button class="btn primary" id="read-all">▶ Слушать весь текст</button>
      <button class="btn" id="slow">${progress.settings.slow ? "🐢 Медленно" : "🔊 Обычная скорость"}</button>
      <button class="btn" id="toggle-tr">🇷🇺 Показать перевод</button>
    </div>

    <div class="card book" id="book">
      ${s.text.map(([en, ru], k) => `
        <div class="sentence">
          <div class="en-line">
            <button class="play-btn" data-k="${k}" title="Прослушать предложение">▶</button>
            ${wrapWords(en)}
            <button class="tr-btn" data-k="${k}" title="Перевод предложения">↔</button>
          </div>
          <div class="ru-line" id="tr-${k}" hidden>${esc(ru)}</div>
        </div>`).join("")}
    </div>

    <h2>⭐ Слова из этого рассказа</h2>
    <div class="card" id="story-words"></div>

    <div style="margin-top:16px">
      <button class="btn primary" data-go="story-done:${i}">Я дочитал(а) → тренировать слова</button>
    </div>`;

  refreshStoryWords();

  const sentences = app.querySelectorAll(".sentence");
  const highlight = k => sentences.forEach((el, j) => el.classList.toggle("playing", j === k));
  const readBtn = document.getElementById("read-all");
  let reading = false;
  const stopReading = () => {
    reading = false;
    highlight(-1);
    if (readBtn.isConnected) readBtn.textContent = "▶ Слушать весь текст";
  };
  readBtn.onclick = () => {
    if (reading) { speechSynthesis.cancel(); return stopReading(); }
    reading = true;
    readBtn.textContent = "⏹ Остановить";
    speakSentences(s.text.map(t => t[0]), k => {
      highlight(k);
      sentences[k].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, stopReading);
  };
  app.querySelectorAll(".play-btn").forEach(b => {
    b.onclick = e => {
      e.stopPropagation();
      reading = false;
      readBtn.textContent = "▶ Слушать весь текст";
      speakSentences([s.text[b.dataset.k][0]], () => highlight(Number(b.dataset.k)), () => highlight(-1));
    };
  });
  document.getElementById("slow").onclick = e => {
    progress.settings.slow = !progress.settings.slow;
    save();
    e.target.textContent = progress.settings.slow ? "🐢 Медленно" : "🔊 Обычная скорость";
  };
  let shown = false;
  document.getElementById("toggle-tr").onclick = e => {
    shown = !shown;
    app.querySelectorAll(".ru-line").forEach(el => { el.hidden = !shown; });
    e.target.textContent = shown ? "🇷🇺 Скрыть перевод" : "🇷🇺 Показать перевод";
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
      : `<p class="muted" style="margin:0">Пока пусто. Нажимай на незнакомые слова в тексте.</p>`;
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
    progress.saved[info.base] = { en: info.base, ru: info.ru, ex: sentenceWith(currentStory, info.word), story: STORIES[currentStory].id };
    touchStreak();
    save();
  }
  const draw = () => {
    sheet.innerHTML = `
      <button class="sheet-close" id="sheet-close" aria-label="Закрыть">✕</button>
      <div class="sheet-word">${esc(info.word)}</div>
      <div class="row" style="margin:6px 0">
        <button class="btn" data-say="${esc(info.word)}">🔊 Послушать</button>
        <button class="btn" data-say-slow="${esc(info.word)}">🐢 Медленно</button>
        ${info.base !== info.word ? `<button class="btn" data-say="${esc(info.base)}">🔊 ${esc(info.base)}</button>` : ""}
      </div>
      ${info.base !== info.word ? `<div class="muted">Начальная форма: <b>${esc(info.base)}</b></div>` : ""}
      <div class="sheet-ru">${esc(info.ru)}</div>
      ${info.note ? `<div class="muted">💡 ${esc(info.note)}</div>` : ""}
      <button class="btn ${isSaved() ? "" : "primary"}" id="sheet-save" style="margin-top:12px">
        ${isSaved() ? "✓ В моих словах (убрать)" : "⭐ Добавить в мои слова"}
      </button>`;
    document.getElementById("sheet-close").onclick = closeSheet;
    document.getElementById("sheet-save").onclick = () => {
      if (isSaved()) delete progress.saved[info.base];
      else progress.saved[info.base] = { en: info.base, ru: info.ru, ex: sentenceWith(currentStory, info.word), story: STORIES[currentStory].id };
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
    ${backBtn("story:" + i, "← К тексту")}
    <div class="card result">
      <div class="big">📖🎉</div>
      <h1>Рассказ «${esc(s.title)}» прочитан!</h1>
      ${first ? `<p class="muted">+50 ⭐ ${next ? "· Открыт следующий рассказ" : ""}</p>` : ""}
      ${levelDone ? `<p class="level-up">🎊 Уровень ${esc(s.level)} пройден! Дальше — ${esc(next.level)}: ${esc(LEVEL_NAMES[next.level] || "")}</p>` : ""}
      <p class="muted">Пройдено ${doneCount()} из ${STORIES.length} рассказов до финиша 🏁</p>
    </div>

    <h2>1. Закрепи правило</h2>
    <div class="card row" style="justify-content:space-between">
      <div><b>${esc(s.rule.title)}</b><div class="muted">${s.exercises.length} задания</div></div>
      <button class="btn primary" data-go="srule:${i}">Упражнения</button>
    </div>

    <h2>2. Выучи новые слова (${words.length})</h2>
    ${words.length
      ? `<p class="muted" style="margin-top:-6px">Это слова, которые ты переводил. Поиграй, чтобы их запомнить!</p>${gameTiles("s" + i, words.length)}`
      : `<div class="card"><p style="margin:0">Ты не открыл ни одного перевода — значит, знаешь все слова! 💪</p></div>`}

    <div class="row" style="margin-top:24px">
      ${next ? `<button class="btn primary" data-go="story:${i + 1}">Следующий рассказ →</button>`
        : doneCount() === STORIES.length ? `<button class="btn primary" data-go="finish">🏁 К финишу!</button>` : ""}
      <button class="btn" data-go="home">На главную</button>
    </div>`;
}

// ---------- Азбука ----------
function renderAbc() {
  app.innerHTML = `
    ${backBtn("home")}
    <h1>🔤 Азбука</h1>
    <p class="muted">Нажми на букву — услышишь, как она называется, и слово на эту букву.</p>
    <div class="row">
      <button class="btn primary" data-go="abcgame">🎯 Игра «Первая буква»</button>
      <button class="btn" id="abc-song">▶ Весь алфавит</button>
    </div>
    <div class="abc-grid">
      ${ALPHABET.map(([L, name, sound, word, emoji, ru]) => `
        <button class="abc-card" data-letter="${L}">
          <div class="abc-big">${L}${L.toLowerCase()}</div>
          <div class="abc-emoji">${emoji}</div>
          <div class="abc-word">${esc(word)}</div>
          <div class="muted abc-ru">${esc(ru)}</div>
          <div class="abc-name">[${esc(name)}]</div>
        </button>`).join("")}
    </div>
    <div class="card" id="abc-info" hidden></div>

    <h2>🧩 Фоника — как читаются сочетания букв</h2>
    <p class="muted" style="margin-top:-6px">Некоторые буквы вместе читаются по-особому. Нажми и послушай.</p>
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

    <h2>🎮 Тренируй слова из азбуки</h2>
    ${gameTiles("abc", ALPHABET.length)}`;

  app.querySelectorAll("[data-letter]").forEach(btn => {
    btn.onclick = () => {
      const [L, name, sound, word, emoji, ru] = ALPHABET.find(a => a[0] === btn.dataset.letter);
      const info = document.getElementById("abc-info");
      info.hidden = false;
      info.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <div class="abc-big">${L}${L.toLowerCase()}</div>
          <div class="abc-emoji">${emoji}</div>
        </div>
        <p><b>Называется:</b> [${esc(name)}]<br><b>Звук в словах:</b> ${esc(sound)}</p>
        <p><b>${esc(word)}</b> — ${esc(ru)}</p>
        <div class="row">
          <button class="btn" data-say="${L}">🔊 Буква</button>
          <button class="btn" data-say="${esc(word)}">🔊 Слово</button>
          <button class="btn" data-say-slow="${esc(word)}">🐢 Медленно</button>
        </div>`;
      app.querySelectorAll(".abc-card.active").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      speakSentences([L + ".", word], () => {}, () => {});
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

// Игра: услышь слово и выбери, с какой буквы оно начинается
function renderAbcGame() {
  const rounds = shuffle(ALPHABET).slice(0, 10);
  let i = 0, correct = 0;
  function draw() {
    const [L, , , word, emoji, ru] = rounds[i];
    const options = shuffle([L, ...shuffle(ALPHABET.filter(a => a[0] !== L)).slice(0, 3).map(a => a[0])]);
    app.innerHTML = `
      ${backBtn("abc")}
      <div class="counter">Слово ${i + 1} из ${rounds.length} · Верно: ${correct}</div>
      <div class="question"><div class="abc-emoji" style="font-size:4rem">${emoji}</div>
        <button class="btn primary" id="play">🔊 Послушать слово</button></div>
      <p class="muted" style="text-align:center">С какой буквы начинается слово?</p>
      <div class="abc-options">${options.map(o => `<button class="option abc-option" data-val="${o}">${o}${o.toLowerCase()}</button>`).join("")}</div>
      <div class="feedback" id="fb"></div>
      <button class="btn primary" id="next" style="display:none">Дальше →</button>`;
    document.getElementById("play").onclick = () => speak(word);
    speak(word);
    app.querySelectorAll(".abc-option").forEach(btn => {
      btn.onclick = () => {
        const ok = btn.dataset.val === L;
        app.querySelectorAll(".abc-option").forEach(b => {
          b.disabled = true;
          if (b.dataset.val === L) b.classList.add("correct");
        });
        if (!ok) btn.classList.add("wrong");
        if (ok) { correct++; progress.xp += 10; }
        touchStreak(); save();
        const fb = document.getElementById("fb");
        fb.className = "feedback " + (ok ? "good" : "bad");
        fb.textContent = `${ok ? "Правильно! 🎉" : "Не совсем."} ${word} — ${ru}, начинается с буквы ${L}`;
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
      <div class="muted">СЕРТИФИКАТ</div>
      <h1>Путь от A1 до C2 пройден!</h1>
      <p class="cert-name">${name ? esc(name) : "Ваше имя"}</p>
      <p>прочитал(а) все рассказы (${STORIES.length}), выучил(а) слов: ${learned}, набрал(а) ${progress.xp} ⭐</p>
      <div class="cert-levels">${["A1", "A2", "B1", "B2", "C1", "C2"].map(l => `<span class="level-code">${l} ✓</span>`).join("")}</div>
      <p class="muted">${new Date().toLocaleDateString("ru-RU")}</p>
    </div>
    <div class="row no-print" style="margin-top:16px">
      <input class="input" id="cert-name" placeholder="Впиши имя для сертификата" value="${esc(name)}" style="flex:1;min-width:200px">
      <button class="btn primary" id="cert-save">Сохранить имя</button>
    </div>
    <p class="muted no-print">📸 Сделай снимок экрана, чтобы сохранить сертификат.</p>`;
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
    <h1>⭐ Мои слова</h1>
    <p class="muted">Слова, которые ты переводил при чтении. Выучено ${words.filter(w => isLearned(w[0])).length} из ${words.length}.</p>
    ${gameTiles("my", words.length)}
    <h2>Список</h2>
    <div class="card" id="my-list">${words.length ? wordList(words, true) : '<p class="muted" style="margin:0">Пока пусто. Открой рассказ и нажимай на незнакомые слова.</p>'}</div>`;
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
        <span class="counter">Карточка ${i + 1} из ${words.length}</span>
        <button class="speak" data-say="${esc(en)}">🔊</button>
      </div>
      <div class="flashcard" id="fc">
        <div class="flashcard-inner">
          <div class="face"><div class="word">${esc(en)}</div><div class="hint">Нажми, чтобы перевернуть</div></div>
          <div class="face back-face"><div class="word">${esc(ru)}</div><div class="example">${esc(ex || "")}</div>${ex ? `<button class="btn" data-say="${esc(ex)}" style="margin-top:10px">🔊 Пример</button>` : ""}</div>
        </div>
      </div>
      <div class="row" style="justify-content:space-between">
        <button class="btn" id="prev" ${i === 0 ? "disabled" : ""}>← Пред.</button>
        <button class="btn primary" id="next">${i === words.length - 1 ? "Готово ✓" : "След. →"}</button>
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
      <div class="counter">Вопрос ${i + 1} из ${questions.length} · Верно: ${correct}</div>
      ${mode === "listen"
        ? `<div class="question"><button class="btn primary" id="play">🔊 Прослушать ещё раз</button></div>
           <p class="muted" style="text-align:center">Какое слово ты услышал?</p>`
        : `<div class="question">${esc(reverse ? ru : en)}</div>
           <p class="muted" style="text-align:center">${reverse ? "Как это по-английски?" : "Выбери перевод"}</p>`}
      <div class="options">
        ${options.map(o => `<button class="option" data-val="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>
      <div class="feedback" id="fb"></div>
      <button class="btn primary" id="next" style="display:none">Дальше →</button>`;

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
        fb.textContent = ok ? "Правильно! 🎉" : `Неверно. ${en} — ${ru}`;
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
      <div class="counter">Слово ${i + 1} из ${questions.length} · Верно: ${correct}</div>
      <div class="question">${esc(ru)}</div>
      <p class="muted" style="text-align:center">Напиши по-английски (${target.length} букв)</p>
      <form id="form">
        <input class="input" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Твой ответ...">
        <div class="feedback" id="fb"></div>
        <div class="row">
          <button class="btn primary" type="submit" id="check">Проверить</button>
          <button class="btn" type="button" id="hint">Подсказка</button>
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
      fb.innerHTML = ok ? "Правильно! 🎉" : `Неверно. Правильно: <b>${esc(en)}</b>`;
      if (ex) fb.innerHTML += `<div class="muted" style="font-weight:400;font-style:italic">${esc(ex)}</div>`;
      speak(en);
      document.getElementById("check").textContent = "Дальше →";
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
    <h1>🔗 Соедини пары</h1>
    <p class="muted">Нажми на английское слово, а затем на его перевод.</p>
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
            `<p>⏱ Время: ${sec} сек. · Ошибок: ${mistakes}</p>`), 300);
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
      <span>Очки: <b id="b-score">0</b></span>
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
    document.getElementById("b-combo").textContent = combo >= 3 ? `🔥 Комбо ×${mult} (${combo} подряд)` : "";
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
        <h1>${score} очков</h1>
        <p class="muted">${record ? "Новый рекорд!" : `Рекорд: ${progress.best[arg]}`}</p>
        <p>+${Math.round(score / 5)} ⭐</p>
        <div class="row" style="justify-content:center">
          <button class="btn primary" id="again">Ещё раз</button>
          <button class="btn" data-go="${set.backTo}">Назад</button>
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
    <div style="margin-top:16px"><button class="btn primary" data-go="gex:${idx}">Начать упражнения →</button></div>`;
}

// Упражнения «вставь слово» — для уроков грамматики и правил к рассказам
function runExercises(exercises, backTo, onFinish, again) {
  const qs = shuffle(exercises);
  let i = 0, correct = 0;

  function draw() {
    const [sentence, opts, ans] = qs[i];
    app.innerHTML = `
      ${backBtn(backTo)}
      <div class="counter">Задание ${i + 1} из ${qs.length} · Верно: ${correct}</div>
      <div class="question">${esc(sentence).replace("___", "<u>&nbsp;&nbsp;?&nbsp;&nbsp;</u>")}</div>
      <div class="options">${opts.map((o, k) => `<button class="option" data-k="${k}">${esc(o)}</button>`).join("")}</div>
      <div class="feedback" id="fb"></div>
      <button class="btn primary" id="next" style="display:none">Дальше →</button>`;
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
        fb.textContent = (ok ? "Правильно! " : "Неверно. ") + full;
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
updateStats();
render();
