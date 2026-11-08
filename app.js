"use strict";

// ---------- Хранение прогресса ----------
const STORAGE_KEY = "english-easy-progress";
const LEARNED_AT = 3; // сколько правильных ответов нужно, чтобы слово считалось выученным

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (p && typeof p === "object") return { words: {}, xp: 0, streak: 0, lastDay: null, grammar: {}, ...p };
  } catch (e) { /* хранилище недоступно */ }
  return { words: {}, xp: 0, streak: 0, lastDay: null, grammar: {} };
}

let progress = loadProgress();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  updateStats();
}

function today() { return new Date().toISOString().slice(0, 10); }

function touchStreak() {
  const t = today();
  if (progress.lastDay === t) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  progress.streak = progress.lastDay === yesterday ? progress.streak + 1 : 1;
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

function topicProgress(key) {
  const words = TOPICS[key].words;
  return words.filter(w => isLearned(w[0])).length / words.length;
}

function updateStats() {
  document.getElementById("stat-learned").textContent = Object.values(progress.words).filter(v => v >= LEARNED_AT).length;
  document.getElementById("stat-xp").textContent = progress.xp;
  const alive = progress.lastDay === today() ||
    progress.lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10);
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

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/^to /, ""));
  u.lang = "en-US";
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

function normalize(s) {
  return s.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").replace(/^to /, "");
}

function allWords() {
  return Object.values(TOPICS).flatMap(t => t.words);
}

function backBtn(target, label = "← Назад") {
  return `<button class="back" data-go="${target}">${label}</button>`;
}

function resultScreen(correct, total, again, backTo) {
  const pct = Math.round((correct / total) * 100);
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "💪";
  app.innerHTML = `
    <div class="card result">
      <div class="big">${emoji}</div>
      <h1>${correct} из ${total}</h1>
      <p class="muted">${pct >= 70 ? "Отличная работа!" : "Продолжай тренироваться — всё получится!"}</p>
      <div class="row" style="justify-content:center">
        <button class="btn primary" id="again">Ещё раз</button>
        <button class="btn" data-go="${backTo}">К теме</button>
      </div>
    </div>`;
  document.getElementById("again").onclick = again;
}

// ---------- Экраны ----------
function renderHome() {
  const toReview = allWords().filter(w => progress.words[w[0]] !== undefined && !isLearned(w[0]));
  app.innerHTML = `
    <h1>Учим английский 🚀</h1>
    <p class="muted">Выбери тему, учи слова на карточках и проверяй себя в тестах.</p>

    ${toReview.length ? `
      <div class="card row" style="justify-content:space-between;margin-top:16px">
        <div><b>Повторение</b><div class="muted">Слов на повторение: ${toReview.length}</div></div>
        <button class="btn primary" data-go="review">Повторить</button>
      </div>` : ""}

    <h2>📖 Словарь по темам</h2>
    <div class="grid">
      ${Object.entries(TOPICS).map(([key, t]) => {
        const p = topicProgress(key);
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

    <h2>⚙️</h2>
    <button class="btn" id="reset">Сбросить прогресс</button>
  `;
  document.getElementById("reset").onclick = () => {
    if (confirm("Точно сбросить весь прогресс?")) {
      progress = { words: {}, xp: 0, streak: 0, lastDay: null, grammar: {} };
      save();
      renderHome();
    }
  };
}

function renderTopic(key) {
  const t = TOPICS[key];
  app.innerHTML = `
    ${backBtn("home")}
    <h1>${t.icon} ${esc(t.title)}</h1>
    <p class="muted">Выучено ${t.words.filter(w => isLearned(w[0])).length} из ${t.words.length}</p>
    <div class="modes">
      <button class="tile" data-go="cards:${key}"><div class="icon">🃏</div><div class="name">Карточки</div><div class="sub">Смотри и запоминай</div></button>
      <button class="tile" data-go="quiz:${key}"><div class="icon">✅</div><div class="name">Тест</div><div class="sub">Выбери правильный перевод</div></button>
      <button class="tile" data-go="typing:${key}"><div class="icon">⌨️</div><div class="name">Написание</div><div class="sub">Напиши слово по-английски</div></button>
      <button class="tile" data-go="pairs:${key}"><div class="icon">🔗</div><div class="name">Пары</div><div class="sub">Соедини слово и перевод</div></button>
      <button class="tile" data-go="listen:${key}"><div class="icon">🎧</div><div class="name">На слух</div><div class="sub">Услышь и выбери</div></button>
    </div>
    <h2>Список слов</h2>
    <div class="card">
      <ul class="wordlist">
        ${t.words.map(([en, ru]) => `
          <li>
            <span><span class="en">${esc(en)}</span> — ${esc(ru)} ${isLearned(en) ? '<span class="badge">выучено</span>' : ""}</span>
            <button class="speak" data-say="${esc(en)}" title="Произнести">🔊</button>
          </li>`).join("")}
      </ul>
    </div>`;
}

// --- Карточки ---
function renderCards(key) {
  const words = shuffle(TOPICS[key].words);
  let i = 0;

  function draw() {
    const [en, ru, ex] = words[i];
    app.innerHTML = `
      ${backBtn("topic:" + key)}
      <div class="row" style="justify-content:space-between">
        <span class="counter">Карточка ${i + 1} из ${words.length}</span>
        <button class="speak" data-say="${esc(en)}">🔊</button>
      </div>
      <div class="flashcard" id="fc">
        <div class="flashcard-inner">
          <div class="face"><div class="word">${esc(en)}</div><div class="hint">Нажми, чтобы перевернуть</div></div>
          <div class="face back-face"><div class="word">${esc(ru)}</div><div class="example">${esc(ex)}</div></div>
        </div>
      </div>
      <div class="row" style="justify-content:space-between">
        <button class="btn" id="prev" ${i === 0 ? "disabled" : ""}>← Пред.</button>
        <button class="btn primary" id="next">${i === words.length - 1 ? "Готово ✓" : "След. →"}</button>
      </div>`;
    document.getElementById("fc").onclick = () => document.getElementById("fc").classList.toggle("flipped");
    document.getElementById("prev").onclick = () => { i--; draw(); };
    document.getElementById("next").onclick = () => {
      if (i === words.length - 1) { touchStreak(); save(); navigate("topic:" + key); }
      else { i++; draw(); }
    };
    speak(en);
  }
  draw();
}

// --- Тест с вариантами (обычный и на слух) ---
function renderQuiz(key, mode = "quiz", wordsOverride = null) {
  const pool = wordsOverride || TOPICS[key].words;
  const questions = shuffle(pool).slice(0, 10);
  const backTo = key ? "topic:" + key : "home";
  const distractorPool = key ? TOPICS[key].words : allWords();
  let i = 0, correct = 0;

  function draw() {
    const [en, ru] = questions[i];
    // В режиме теста чередуем направление: en→ru и ru→en
    const reverse = mode === "quiz" && i % 2 === 1;
    const answer = mode === "listen" ? en : reverse ? en : ru;
    const others = shuffle(distractorPool.filter(w => w[0] !== en))
      .slice(0, 3).map(w => (mode === "listen" || reverse) ? w[0] : w[1]);
    const options = shuffle([answer, ...others]);

    app.innerHTML = `
      ${backBtn(backTo)}
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
          else resultScreen(correct, questions.length, () => renderQuiz(key, mode, wordsOverride), backTo);
        };
      };
    });
  }
  draw();
}

// --- Написание ---
function renderTyping(key) {
  const questions = shuffle(TOPICS[key].words);
  let i = 0, correct = 0;

  function draw() {
    const [en, ru, ex] = questions[i];
    app.innerHTML = `
      ${backBtn("topic:" + key)}
      <div class="counter">Слово ${i + 1} из ${questions.length} · Верно: ${correct}</div>
      <div class="question">${esc(ru)}</div>
      <p class="muted" style="text-align:center">Напиши по-английски (${en.replace(/^to /, "").length} букв)</p>
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
      const target = en.replace(/^to /, "");
      hints = Math.min(hints + 1, target.length);
      input.value = target.slice(0, hints);
      input.focus();
    };

    document.getElementById("form").onsubmit = e => {
      e.preventDefault();
      if (answered) {
        i++;
        if (i < questions.length) draw();
        else resultScreen(correct, questions.length, () => renderTyping(key), "topic:" + key);
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
      fb.innerHTML += `<div class="muted" style="font-weight:400;font-style:italic">${esc(ex)}</div>`;
      speak(en);
      document.getElementById("check").textContent = "Дальше →";
      document.getElementById("hint").style.display = "none";
      document.getElementById("check").focus();
    };
  }
  draw();
}

// --- Пары ---
function renderPairs(key) {
  const set = shuffle(TOPICS[key].words).slice(0, 6);
  const left = shuffle(set.map(w => w[0]));
  const right = shuffle(set.map(w => w[1]));
  const map = Object.fromEntries(set.map(w => [w[0], w[1]]));
  let selected = null, done = 0, mistakes = 0;
  const startedAt = Date.now();

  app.innerHTML = `
    ${backBtn("topic:" + key)}
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
        if (done === set.length) {
          const sec = Math.round((Date.now() - startedAt) / 1000);
          setTimeout(() => resultScreen(set.length, set.length + mistakes, () => renderPairs(key), "topic:" + key), 300);
          document.getElementById("fb").textContent = `Готово за ${sec} сек.`;
        }
      } else {
        mistakes++;
        a.classList.add("wrong"); b.classList.add("wrong");
        setTimeout(() => { a.classList.remove("wrong"); b.classList.remove("wrong"); }, 500);
      }
    };
  });
}

// --- Грамматика ---
function renderGrammar(idx) {
  const g = GRAMMAR[idx];
  app.innerHTML = `
    ${backBtn("home")}
    <h1>${esc(g.title)}</h1>
    <div class="card theory">${g.theory}</div>
    <div style="margin-top:16px"><button class="btn primary" id="start">Начать упражнения →</button></div>`;
  document.getElementById("start").onclick = () => grammarExercises(idx);
}

function grammarExercises(idx) {
  const g = GRAMMAR[idx];
  const qs = shuffle(g.exercises);
  let i = 0, correct = 0;

  function draw() {
    const [sentence, opts, ans] = qs[i];
    app.innerHTML = `
      ${backBtn("grammar:" + idx)}
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
        const full = sentence.replace("___", opts[ans]);
        const fb = document.getElementById("fb");
        fb.className = "feedback " + (ok ? "good" : "bad");
        fb.textContent = (ok ? "Правильно! " : "Неверно. ") + full;
        speak(full);
        const next = document.getElementById("next");
        next.style.display = "inline-block";
        next.onclick = () => {
          i++;
          if (i < qs.length) return draw();
          progress.grammar[idx] = Math.max(progress.grammar[idx] || 0, correct);
          save();
          resultScreen(correct, qs.length, () => grammarExercises(idx), "grammar:" + idx);
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
  const [view, arg] = (location.hash.slice(1) || "home").split(":");
  window.scrollTo(0, 0);
  if (arg !== undefined && ["topic", "cards", "quiz", "typing", "pairs", "listen"].includes(view) && !TOPICS[arg]) return renderHome();
  switch (view) {
    case "topic": return renderTopic(arg);
    case "cards": return renderCards(arg);
    case "quiz": return renderQuiz(arg, "quiz");
    case "listen": return renderQuiz(arg, "listen");
    case "typing": return renderTyping(arg);
    case "pairs": return renderPairs(arg);
    case "grammar": return GRAMMAR[arg] ? renderGrammar(Number(arg)) : renderHome();
    case "review": {
      const words = allWords().filter(w => progress.words[w[0]] !== undefined && !isLearned(w[0]));
      return words.length >= 1 ? renderQuiz(null, "quiz", words) : renderHome();
    }
    default: return renderHome();
  }
}

document.addEventListener("click", e => {
  const go = e.target.closest("[data-go]");
  if (go) { navigate(go.dataset.go); return; }
  const say = e.target.closest("[data-say]");
  if (say) { e.stopPropagation(); speak(say.dataset.say); }
});

window.addEventListener("hashchange", render);
updateStats();
render();
