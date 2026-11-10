/*
 * JavaScript Code Quest — app logic
 *
 * Security model (classroom-grade, NOT production-grade):
 *  1. Input restriction: the student writes ONE expression. A static filter rejects
 *     statements, assignment, braces, brackets, template strings, loops, functions and any
 *     identifier that is not an allowed variable or a small set of safe globals.
 *  2. Isolation: the expression runs inside a sandboxed iframe (sandbox="allow-scripts",
 *     no allow-same-origin => opaque origin, no access to this page, its DOM or localStorage).
 *     The iframe has its own CSP (no network). Inside it, code runs in a Web Worker when the
 *     browser allows one, so an endless computation can be terminated.
 *  3. Messaging: postMessage with a channel tag, a unique random execution id per run, and
 *     strict source/origin checks on replies.
 *  4. Timeouts: the worker is terminated after 1.5 s; if the iframe itself stops replying,
 *     the parent destroys and recreates it after 3 s ("รีเซ็ตตัวรัน" does the same manually).
 * The parent page never calls eval() or new Function().
 */
(function () {
  "use strict";

  var CHALLENGES = window.CHALLENGES || [];
  var STORAGE_KEY = "jcq-progress-v1";
  var XP_PER_LEVEL = 10;
  var MAX_LEN = 300;
  var WORKER_TIMEOUT_MS = 1500;
  var PARENT_TIMEOUT_MS = 3000;
  var SAFE_GLOBALS = ["true", "false", "null", "undefined", "NaN", "Infinity", "Math", "Number", "String", "Boolean"];
  var BLOCKED_PROPS = ["constructor", "prototype", "__proto__", "__defineGetter__", "__defineSetter__",
    "__lookupGetter__", "__lookupSetter__", "call", "apply", "bind", "repeat", "padStart", "padEnd"];

  // ---------- Sandboxed runner (iframe srcdoc) ----------
  var WORKER_SRC = [
    "self.onmessage = function (e) {",
    "  var d = e.data;",
    "  try { self.fetch = undefined; self.XMLHttpRequest = undefined; self.WebSocket = undefined; self.importScripts = undefined; } catch (_) {}",
    "  var fn;",
    "  try { fn = new Function(d.params.join(','), '\"use strict\";\\nreturn (' + d.expr + '\\n);'); }",
    "  catch (err) { self.postMessage({ status: 'syntax', message: String(err && err.message || err) }); return; }",
    "  var out = [];",
    "  for (var i = 0; i < d.cases.length; i++) {",
    "    var c = d.cases[i];",
    "    try {",
    "      var v = fn.apply(undefined, d.params.map(function (p) { return c[p]; }));",
    "      var t = typeof v;",
    "      if (v !== null && (t === 'object' || t === 'function' || t === 'symbol' || t === 'bigint')) { v = String(v).slice(0, 200); }",
    "      out.push({ ok: true, type: v === null ? 'null' : t, value: v });",
    "    } catch (err) { out.push({ ok: false, message: String(err && err.message || err) }); }",
    "  }",
    "  self.postMessage({ status: 'ok', results: out });",
    "};"
  ].join("\n");

  var RUNNER_SCRIPT = [
    "(function () {",
    "  'use strict';",
    "  var P = window.parent;",
    "  var WORKER_SRC = " + JSON.stringify(WORKER_SRC) + ";",
    "  var workerUrl = null;",
    "  try { workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })); } catch (_) {}",
    "  function reply(id, payload) { payload.channel = 'jcq'; payload.type = 'result'; payload.id = id; P.postMessage(payload, '*'); }",
    "  function runInline(d) {",
    "    var result = null;",
    "    var fakeSelf = { postMessage: function (r) { result = r; } };",
    "    var f = new Function('self', WORKER_SRC + '\\nreturn self.onmessage;');",
    "    var handler = f(fakeSelf);",
    "    handler({ data: d });",
    "    return result;",
    "  }",
    "  window.addEventListener('message', function (e) {",
    "    if (e.source !== P) return;",
    "    var d = e.data;",
    "    if (!d || d.channel !== 'jcq' || d.type !== 'run' || typeof d.id !== 'string') return;",
    "    var job = { expr: String(d.expr), params: d.params, cases: d.cases };",
    "    var w = null;",
    "    try { if (workerUrl) w = new Worker(workerUrl); } catch (_) { w = null; }",
    "    if (!w) {",
    "      var r; try { r = runInline(job); } catch (err) { r = { status: 'error', message: String(err && err.message || err) }; }",
    "      r = r || { status: 'error', message: 'no result' }; r.mode = 'inline'; reply(d.id, r); return;",
    "    }",
    "    var done = false;",
    "    var timer = setTimeout(function () { if (done) return; done = true; w.terminate(); reply(d.id, { status: 'timeout', mode: 'worker' }); }, " + WORKER_TIMEOUT_MS + ");",
    "    w.onmessage = function (ev) { if (done) return; done = true; clearTimeout(timer); w.terminate(); var r = ev.data || {}; r.mode = 'worker'; reply(d.id, r); };",
    "    w.onerror = function (ev) { if (done) return; done = true; clearTimeout(timer); w.terminate(); reply(d.id, { status: 'error', message: String(ev && ev.message || 'worker error'), mode: 'worker' }); if (ev && ev.preventDefault) ev.preventDefault(); };",
    "    w.postMessage(job);",
    "  });",
    "  P.postMessage({ channel: 'jcq', type: 'ready' }, '*');",
    "})();"
  ].join("\n");

  var RUNNER_HTML =
    "<!doctype html><html><head><meta charset=\"utf-8\">" +
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:\">" +
    "</head><body><script>" + RUNNER_SCRIPT.replace(/<\//g, "<\\/") + "<\/script></body></html>";

  var runner = { frame: null, ready: false, queue: [], pending: null };

  function makeId() {
    var a = new Uint32Array(4);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (n) { return n.toString(16); }).join("-") + "-" + Date.now().toString(36);
  }

  function createRunner() {
    if (runner.frame) runner.frame.remove();
    runner.ready = false;
    var f = document.createElement("iframe");
    f.setAttribute("sandbox", "allow-scripts");
    f.setAttribute("aria-hidden", "true");
    f.setAttribute("tabindex", "-1");
    f.title = "code runner";
    f.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden;";
    f.srcdoc = RUNNER_HTML;
    document.body.appendChild(f);
    runner.frame = f;
  }

  function resetRunner(reason) {
    if (runner.pending) {
      clearTimeout(runner.pending.timer);
      runner.pending.resolve({ status: reason || "reset" });
      runner.pending = null;
    }
    runner.queue.forEach(function (job) { job.resolve({ status: reason || "reset" }); });
    runner.queue = [];
    createRunner();
  }

  window.addEventListener("message", function (e) {
    if (!runner.frame || e.source !== runner.frame.contentWindow) return;
    if (e.origin !== "null") return; // sandboxed iframe without allow-same-origin => opaque origin
    var d = e.data;
    if (!d || d.channel !== "jcq") return;
    if (d.type === "ready") { runner.ready = true; pump(); return; }
    if (d.type === "result" && runner.pending && d.id === runner.pending.id) {
      var p = runner.pending;
      runner.pending = null;
      clearTimeout(p.timer);
      p.resolve(d);
      pump();
    }
  });

  function pump() {
    if (!runner.ready || runner.pending || !runner.queue.length) return;
    var job = runner.queue.shift();
    job.id = makeId();
    job.timer = setTimeout(function () {
      if (runner.pending === job) {
        runner.pending = null;
        job.resolve({ status: "timeout" });
        resetRunner("timeout");
      }
    }, PARENT_TIMEOUT_MS);
    runner.pending = job;
    runner.frame.contentWindow.postMessage({
      channel: "jcq", type: "run", id: job.id, expr: job.expr, params: job.params, cases: job.cases
    }, "*");
  }

  function execute(expr, params, cases) {
    return new Promise(function (resolve) {
      runner.queue.push({ expr: expr, params: params, cases: cases, resolve: resolve });
      pump();
    });
  }

  // ---------- Static validation ----------
  function stripStrings(src) {
    return src.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
  }

  var OPERATOR_TESTS = {
    "+": function (s) { return /\+/.test(s); },
    "*": function (s) { return /\*/.test(s); },
    "&&": function (s) { return s.indexOf("&&") !== -1; },
    "||": function (s) { return s.indexOf("||") !== -1; },
    "!": function (s) { return /!(?!=)/.test(s); },
    "===": function (s) { return s.indexOf("===") !== -1 || s.indexOf("!==") !== -1; },
    "==": function (s) { return /(^|[^=!])==(?!=)|!=(?!=)/.test(s); },
    "?": function (s) { return /\?(?![.?])/.test(s); },
    ":": function (s) { return s.indexOf(":") !== -1; }
  };
  var OPERATOR_NAMES = {
    "+": "+ (บวก)", "*": "* (คูณ)", "&&": "&& (และ)", "||": "|| (หรือ)", "!": "! (ไม่)",
    "===": "=== (เท่ากันแบบเข้มงวด)", "==": "== หรือ != (แบบไม่เข้มงวด)", "?": "? (ternary)", ":": ": (ternary)"
  };

  function validate(answer, ch) {
    var a = answer.trim();
    if (!a) return "ยังไม่ได้เติมโค้ดในช่องสีม่วง";
    if (a.length > MAX_LEN) return "โค้ดยาวเกินไป (สูงสุด " + MAX_LEN + " ตัวอักษร)";
    if (a.indexOf("____") !== -1) return "ลบเครื่องหมาย ____ ออก แล้วเขียนโค้ดแทน";
    var s = stripStrings(a);
    if (/["']/.test(s.replace(/""/g, ""))) return "มีเครื่องหมายคำพูดที่ไม่ครบคู่";
    if (/[^\x20-\x7e]/.test(s)) return "ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และเครื่องหมาย (ภาษาไทยใส่ได้เฉพาะในเครื่องหมายคำพูด)";
    if (/[`;{}\[\]\\]/.test(s))return "ช่องนี้รับเพียงนิพจน์เดียว ห้ามใช้ ; { } [ ] หรือ ` ";
    if (/\+\+|--/.test(s)) return "ห้ามใช้ ++ หรือ -- ในด่านนี้";
    var noCmp = s.replace(/===|!==|==|!=|<=|>=/g, " ");
    if (/=/.test(noCmp)) return "ห้ามใช้ = (กำหนดค่า) หรือ => ในช่องนี้ ถ้าต้องการเปรียบเทียบให้ใช้ ===";
    var idRe = /(\.\s*)?([A-Za-z_$][\w$]*)/g, m;
    var allowed = ch.params.concat(SAFE_GLOBALS);
    while ((m = idRe.exec(s)) !== null) {
      var name = m[2];
      if (m[1]) {
        if (BLOCKED_PROPS.indexOf(name) !== -1) return "ไม่อนุญาตให้ใช้ ." + name + " ในเกมนี้";
      } else if (allowed.indexOf(name) === -1) {
        // allow numeric literals like 1e3 (handled because idRe starts with a letter after digits)
        var prev = s.charAt(m.index - 1);
        if (/[0-9.]/.test(prev)) continue;
        return "ไม่รู้จักชื่อ \"" + name + "\" — ใช้ได้เฉพาะตัวแปร: " + ch.params.join(", ");
      }
    }
    for (var i = 0; i < ch.forbidden.length; i++) {
      var f = ch.forbidden[i];
      if (OPERATOR_TESTS[f] && OPERATOR_TESTS[f](s)) return "ด่านนี้ห้ามใช้ " + OPERATOR_NAMES[f];
    }
    var missing = ch.required.filter(function (r) { return OPERATOR_TESTS[r] && !OPERATOR_TESTS[r](s); });
    if (missing.length) return "ด่านนี้ต้องใช้ตัวดำเนินการ: " + missing.map(function (r) { return OPERATOR_NAMES[r]; }).join(", ");
    return null;
  }

  // ---------- Progress (localStorage) ----------
  function loadProgress() {
    var empty = { completed: [], answers: {} };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;
      var p = JSON.parse(raw);
      var ids = CHALLENGES.map(function (c) { return c.id; });
      var completed = Array.isArray(p.completed) ? p.completed.filter(function (id, i, arr) {
        return ids.indexOf(id) !== -1 && arr.indexOf(id) === i;
      }) : [];
      var answers = {};
      if (p.answers && typeof p.answers === "object") {
        Object.keys(p.answers).forEach(function (k) {
          if (typeof p.answers[k] === "string") answers[k] = p.answers[k].slice(0, MAX_LEN + 50);
        });
      }
      return { completed: completed, answers: answers };
    } catch (_) { return empty; }
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); } catch (_) {}
  }

  var state = { progress: loadProgress(), current: 1, busy: false };

  function isDone(id) { return state.progress.completed.indexOf(id) !== -1; }
  function isUnlocked(id) { return id === 1 || isDone(id) || isDone(id - 1); }
  function xp() { return state.progress.completed.length * XP_PER_LEVEL; }
  function challenge(id) { return CHALLENGES.filter(function (c) { return c.id === id; })[0]; }

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    xpValue: $("xpValue"), progressText: $("progressText"), progressPct: $("progressPct"),
    progressBar: $("progressBar"), progressFill: $("progressFill"),
    levelChip: $("levelChip"), topicChip: $("topicChip"), xpChip: $("xpChip"), doneChip: $("doneChip"),
    levelTitle: $("levelTitle"), statement: $("statement"), expectedText: $("expectedText"),
    editor: $("editor"), runBtn: $("runBtn"), checkBtn: $("checkBtn"), hintBtn: $("hintBtn"), nextBtn: $("nextBtn"),
    hintBox: $("hintBox"), consoleOut: $("consoleOut"), feedback: $("feedback"),
    levelList: $("levelList"), resetProgressBtn: $("resetProgressBtn"), resetRunnerBtn: $("resetRunnerBtn"),
    toast: $("toast")
  };
  var blankInput = null;

  var TOKEN_RE = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(let|const|var|console)\b|\b(true|false|null)\b|\b(\d+(?:\.\d+)?)\b/g;
  function highlight(target, text) {
    var last = 0, m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      if (m.index > last) target.appendChild(document.createTextNode(text.slice(last, m.index)));
      var span = document.createElement("span");
      span.className = m[1] ? "tok-com" : m[2] ? "tok-str" : m[3] ? "tok-kw" : m[4] ? "tok-bool" : "tok-num";
      span.textContent = m[0];
      target.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) target.appendChild(document.createTextNode(text.slice(last)));
  }

  function sizeBlank() {
    if (!blankInput) return;
    blankInput.style.width = Math.min(Math.max(14, blankInput.value.length + 2), 80) + "ch";
  }

  function renderEditor(ch) {
    el.editor.textContent = "";
    blankInput = null;
    ch.code.forEach(function (line, i) {
      var row = document.createElement("div");
      row.className = "code-line";
      var ln = document.createElement("span");
      ln.className = "ln";
      ln.textContent = String(i + 1);
      var src = document.createElement("span");
      src.className = "src";
      var idx = line.indexOf("____");
      if (idx !== -1) {
        row.classList.add("editable");
        highlight(src, line.slice(0, idx));
        blankInput = document.createElement("input");
        blankInput.type = "text";
        blankInput.className = "blank";
        blankInput.id = "answerInput";
        blankInput.setAttribute("aria-label", "ช่องเติมโค้ด ด่าน " + ch.id);
        blankInput.setAttribute("autocomplete", "off");
        blankInput.setAttribute("autocapitalize", "off");
        blankInput.setAttribute("autocorrect", "off");
        blankInput.setAttribute("spellcheck", "false");
        blankInput.maxLength = MAX_LEN;
        blankInput.placeholder = "เขียนโค้ดที่นี่";
        blankInput.value = state.progress.answers[ch.id] || "";
        blankInput.addEventListener("input", function () {
          sizeBlank();
          state.progress.answers[ch.id] = blankInput.value;
          saveProgress();
        });
        blankInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); (e.ctrlKey || e.metaKey ? checkAnswer : runCode)(); }
        });
        src.appendChild(blankInput);
        highlight(src, line.slice(idx + 4));
      } else {
        highlight(src, line || " ");
      }
      row.appendChild(ln);
      row.appendChild(src);
      el.editor.appendChild(row);
    });
    sizeBlank();
  }

  function renderLevels() {
    el.levelList.textContent = "";
    CHALLENGES.forEach(function (c) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "level-btn";
      b.dataset.level = String(c.id);
      var unlocked = isUnlocked(c.id), done = isDone(c.id);
      if (done) b.classList.add("done");
      if (c.id === state.current) { b.classList.add("active"); b.setAttribute("aria-current", "true"); }
      b.disabled = !unlocked;
      var num = document.createElement("span"); num.className = "num"; num.textContent = String(c.id);
      var meta = document.createElement("span"); meta.className = "meta";
      var t = document.createElement("span"); t.textContent = c.title;
      var s = document.createElement("small"); s.textContent = c.topic + " · " + XP_PER_LEVEL + " XP";
      meta.appendChild(t); meta.appendChild(s);
      var st = document.createElement("span"); st.className = "status";
      st.textContent = done ? "✅" : unlocked ? "▶" : "🔒";
      b.setAttribute("aria-label", "ด่าน " + c.id + " " + c.title + (done ? " ผ่านแล้ว" : unlocked ? "" : " ล็อกอยู่"));
      b.appendChild(num); b.appendChild(meta); b.appendChild(st);
      b.addEventListener("click", function () { selectLevel(c.id); });
      li.appendChild(b);
      el.levelList.appendChild(li);
    });
  }

  function renderStats() {
    var total = CHALLENGES.length * XP_PER_LEVEL;
    var value = xp();
    var pct = total ? Math.round(value / total * 100) : 0;
    el.xpValue.textContent = String(value);
    el.progressText.textContent = "ผ่านแล้ว " + state.progress.completed.length + "/" + CHALLENGES.length + " ด่าน";
    el.progressPct.textContent = pct + "%";
    el.progressFill.style.width = pct + "%";
    el.progressBar.setAttribute("aria-valuenow", String(pct));
  }

  function updateNext() {
    var ch = challenge(state.current);
    var hasNext = !!challenge(state.current + 1);
    el.nextBtn.disabled = !(isDone(ch.id) && hasNext);
    el.nextBtn.textContent = hasNext ? "ด่านถัดไป →" : "ด่านสุดท้าย";
    el.doneChip.classList.toggle("hidden", !isDone(ch.id));
  }

  function selectLevel(id) {
    var ch = challenge(id);
    if (!ch || !isUnlocked(id)) return;
    state.current = id;
    el.levelChip.textContent = "ด่าน " + ch.id + "/" + CHALLENGES.length;
    el.topicChip.textContent = ch.topic;
    el.xpChip.textContent = "+" + XP_PER_LEVEL + " XP";
    el.levelTitle.textContent = ch.title;
    el.statement.textContent = ch.statement;
    el.expectedText.textContent = ch.expected;
    renderEditor(ch);
    el.hintBox.classList.add("hidden");
    el.feedback.classList.add("hidden");
    el.consoleOut.className = "";
    el.consoleOut.textContent = "กด \"รันโค้ด\" เพื่อดูผลลัพธ์";
    updateNext();
    renderLevels();
    try { localStorage.setItem(STORAGE_KEY + "-current", String(id)); } catch (_) {}
  }

  // ---------- Formatting & comparison ----------
  function consoleFormat(r) {
    if (!r.ok) return "Error: " + r.message;
    if (r.type === "undefined") return "undefined";
    if (r.type === "null") return "null";
    return String(r.value);
  }
  function describe(type, value) {
    if (type === "string") return JSON.stringify(value) + " (string)";
    if (type === "undefined" || type === "null") return type;
    return String(value) + " (" + type + ")";
  }
  function typeOfValue(v) { return v === null ? "null" : typeof v; }
  function same(r, expected) {
    if (!r.ok) return false;
    var et = typeOfValue(expected);
    if (r.type !== et) return false;
    if (et === "number") {
      if (isNaN(expected)) return isNaN(r.value);
      return Math.abs(r.value - expected) < 1e-9;
    }
    return r.value === expected;
  }

  function setBusy(b) {
    state.busy = b;
    el.runBtn.disabled = b;
    el.checkBtn.disabled = b;
  }

  function showError(msg) {
    el.consoleOut.className = "err";
    el.consoleOut.textContent = msg;
  }

  function runtimeProblem(res) {
    if (res.status === "timeout") return "หมดเวลา: โค้ดทำงานนานเกินไป ระบบรีเซ็ตตัวรันโค้ดให้แล้ว";
    if (res.status === "syntax") return "SyntaxError: " + res.message + "\nตรวจวงเล็บและเครื่องหมายคำพูดให้ครบคู่";
    if (res.status === "reset") return "ตัวรันโค้ดถูกรีเซ็ต ลองกดอีกครั้ง";
    if (res.status !== "ok") return "เกิดข้อผิดพลาดในการรันโค้ด: " + (res.message || res.status);
    return null;
  }

  // ---------- Actions ----------
  function runCode() {
    if (state.busy) return;
    var ch = challenge(state.current);
    var answer = blankInput ? blankInput.value : "";
    var problem = validate(answer, ch);
    if (problem) { showError(problem); return; }
    setBusy(true);
    el.consoleOut.className = "";
    el.consoleOut.textContent = "กำลังรัน…";
    execute(answer.trim(), ch.params, [ch.cases[0]]).then(function (res) {
      setBusy(false);
      var p = runtimeProblem(res);
      if (p) { showError(p); return; }
      var r = res.results[0];
      el.consoleOut.className = r.ok ? "" : "err";
      el.consoleOut.textContent = "> " + consoleFormat(r);
    });
  }

  function checkAnswer() {
    if (state.busy) return;
    var ch = challenge(state.current);
    var answer = blankInput ? blankInput.value : "";
    var problem = validate(answer, ch);
    if (problem) {
      showFeedback(false, "ยังไม่ผ่าน", [problem]);
      showError(problem);
      return;
    }
    setBusy(true);
    execute(answer.trim(), ch.params, ch.cases).then(function (res) {
      setBusy(false);
      var p = runtimeProblem(res);
      if (p) { showError(p); showFeedback(false, "ยังไม่ผ่าน", [p]); return; }
      var expected = ch.cases.map(function (c) { return ch.solve(c); });
      var passes = res.results.map(function (r, i) { return same(r, expected[i]); });
      var passed = passes.filter(Boolean).length;
      var first = res.results[0];
      el.consoleOut.className = first.ok ? "" : "err";
      el.consoleOut.textContent = "> " + consoleFormat(first);

      var rows = [];
      rows.push({ cls: passes[0] ? "pass" : "fail", text: (passes[0] ? "✓" : "✗") + " ตัวอย่าง: ได้ " + (first.ok ? describe(first.type, first.value) : "Error") + " / ต้องการ " + describe(typeOfValue(expected[0]), expected[0]) });
      for (var i = 1; i < passes.length; i++) {
        rows.push({ cls: passes[i] ? "pass" : "fail", text: (passes[i] ? "✓" : "✗") + " กรณีทดสอบซ่อน #" + i });
      }

      if (passed === passes.length) {
        var already = isDone(ch.id);
        if (!already) {
          state.progress.completed.push(ch.id);
          saveProgress();
        }
        renderStats();
        renderLevels();
        updateNext();
        var msg = already ? "ผ่านอีกครั้ง! (ด่านนี้ได้รับ XP ไปแล้ว)" : "ถูกต้อง! ได้รับ +" + XP_PER_LEVEL + " XP";
        if (!already && !challenge(ch.id + 1)) msg += " 🎉 จบภารกิจครบทุกด่าน!";
        else if (!already) msg += " ปลดล็อกด่าน " + (ch.id + 1) + " แล้ว";
        showFeedback(true, msg, null, rows);
        toast(already ? "ผ่านอีกครั้ง ✓" : "+" + XP_PER_LEVEL + " XP 🎉");
      } else {
        showFeedback(false, "ยังไม่ผ่าน (ผ่าน " + passed + "/" + passes.length + " กรณีทดสอบ)", diagnose(ch, answer, res.results, expected, passes), rows);
      }
    });
  }

  function diagnose(ch, answer, results, expected, passes) {
    var tips = [];
    var s = stripStrings(answer);
    var usesVar = ch.params.some(function (p) { return new RegExp("(^|[^\\w$.])" + p.replace(/\$/g, "\\$") + "(?![\\w$])").test(s); });
    if (!usesVar) tips.push("อย่าพิมพ์คำตอบเป็นค่าตายตัว ค่าตัวแปรจะเปลี่ยนตอนตรวจ ให้ใช้ชื่อตัวแปรในการคำนวณ");
    var err = results.filter(function (r) { return !r.ok; })[0];
    if (err) tips.push("โค้ดเกิดข้อผิดพลาดขณะทำงาน: " + err.message);
    var wrongType = null;
    results.forEach(function (r, i) {
      if (!wrongType && r.ok && r.type !== typeOfValue(expected[i])) wrongType = { got: r.type, want: typeOfValue(expected[i]) };
    });
    if (wrongType) tips.push("ชนิดข้อมูลของผลลัพธ์ควรเป็น " + wrongType.want + " แต่โค้ดของคุณได้ " + wrongType.got);
    if (passes[0] && usesVar && !wrongType && !err) tips.push("ผ่านตัวอย่างแล้ว แต่บางกรณีที่ซ่อนอยู่ยังไม่ผ่าน ลองคิดถึงกรณีขอบ เช่น ค่าเท่ากับเกณฑ์พอดี ค่า 0 หรือตัวพิมพ์เล็ก-ใหญ่");
    if (!tips.length) tips.push("ลองอ่านโจทย์อีกครั้ง แล้วกด \"รันโค้ด\" เพื่อดูว่าโค้ดได้ค่าอะไร หรือกด \"คำใบ้\"");
    return tips;
  }

  function showFeedback(ok, title, tips, rows) {
    el.feedback.className = "feedback " + (ok ? "ok" : "bad");
    el.feedback.textContent = "";
    var h = document.createElement("h4");
    h.textContent = (ok ? "✅ " : "❌ ") + title;
    el.feedback.appendChild(h);
    if (tips && tips.length) {
      var ul = document.createElement("ul");
      tips.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
      el.feedback.appendChild(ul);
    }
    if (rows && rows.length) {
      var box = document.createElement("div");
      box.style.marginTop = "8px";
      rows.forEach(function (r) {
        var d = document.createElement("div");
        d.className = "test-row " + r.cls;
        d.textContent = r.text;
        box.appendChild(d);
      });
      el.feedback.appendChild(box);
    }
  }

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.add("hidden"); }, 2200);
  }

  el.runBtn.addEventListener("click", runCode);
  el.checkBtn.addEventListener("click", checkAnswer);
  el.hintBtn.addEventListener("click", function () {
    var ch = challenge(state.current);
    el.hintBox.textContent = "💡 " + ch.hint;
    el.hintBox.classList.toggle("hidden");
  });
  el.nextBtn.addEventListener("click", function () {
    var next = challenge(state.current + 1);
    if (next && isUnlocked(next.id)) selectLevel(next.id);
    if (blankInput) blankInput.focus();
  });
  el.resetRunnerBtn.addEventListener("click", function () {
    resetRunner("reset");
    el.consoleOut.className = "";
    el.consoleOut.textContent = "รีเซ็ตตัวรันโค้ดแล้ว";
    setBusy(false);
  });
  el.resetProgressBtn.addEventListener("click", function () {
    if (!window.confirm("ต้องการล้าง XP และความคืบหน้าทั้งหมดหรือไม่?")) return;
    state.progress = { completed: [], answers: {} };
    saveProgress();
    renderStats();
    selectLevel(1);
  });

  // ---------- Init ----------
  createRunner();
  renderStats();
  var startLevel = 1;
  try {
    var saved = parseInt(localStorage.getItem(STORAGE_KEY + "-current"), 10);
    if (saved && challenge(saved) && isUnlocked(saved)) startLevel = saved;
  } catch (_) {}
  selectLevel(startLevel);
})();
