"use strict";
(() => {
  const article = document.getElementById("chapterContent");
  if (!article) return;
  const page = document.querySelector(".reader-page");
  const progress = document.getElementById("readingProgress");
  const note = document.getElementById("readerSaveNote");
  const prefsKey = "worldOfNovels:readerPreferences";
  const positionKey = "worldOfNovels:position:" + location.pathname;
  const defaults = { font: 19, line: 2.25, theme: "dark", wide: false, spacing: 1, fontFamily: "serif" };
  let prefs = { ...defaults };
  let saveFrame = 0;
  let utterance = null;
  let speechState = "idle";
  try {
    const stored = JSON.parse(localStorage.getItem(prefsKey) || "{}");
    prefs = { ...defaults, ...stored };
    if (!["dark","paper","light","sepia"].includes(prefs.theme)) prefs.theme = defaults.theme;
    if (!["serif","system","literata"].includes(prefs.fontFamily)) prefs.fontFamily = defaults.fontFamily;
    prefs.font = Math.max(15, Math.min(30, Number(prefs.font) || defaults.font));
    prefs.line = Math.max(1.6, Math.min(2.8, Number(prefs.line) || defaults.line));
  } catch {}

  const say = message => { if (note) note.textContent = message; };
  const apply = () => {
    article.style.setProperty("--reader-font-size", prefs.font + "px");
    article.style.setProperty("--reader-line-height", String(prefs.line));
    const families = {
      serif: 'Tahoma, "Noto Naskh Arabic", Arial, sans-serif',
      system: 'system-ui, Tahoma, Arial, sans-serif',
      literata: 'Georgia, "Noto Naskh Arabic", serif'
    };
    article.style.setProperty("--reader-font-family", families[prefs.fontFamily]);
    document.body.classList.remove("reader-paper", "reader-light", "reader-sepia");
    if (prefs.theme !== "dark") document.body.classList.add("reader-" + prefs.theme);
    page?.classList.toggle("reader-wide", !!prefs.wide);
    document.querySelectorAll("[data-reader-theme]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.readerTheme === prefs.theme));
    });
    const fontSelect = document.getElementById("readerFont");
    if (fontSelect) fontSelect.value = prefs.fontFamily;
    const widthButton = document.getElementById("readerWidth");
    if (widthButton) widthButton.textContent = prefs.wide ? "العرض الأصلي" : "عرض مريح";
  };
  const savePrefs = () => {
    try { localStorage.setItem(prefsKey, JSON.stringify(prefs)); } catch {}
  };
  apply();

  document.querySelectorAll("[data-font-step]").forEach(button => button.addEventListener("click", () => {
    prefs.font = Math.max(15, Math.min(30, prefs.font + Number(button.dataset.fontStep)));
    apply(); savePrefs();
  }));
  document.querySelectorAll("[data-reader-theme]").forEach(button => button.addEventListener("click", () => {
    prefs.theme = button.dataset.readerTheme;
    apply(); savePrefs();
  }));
  document.getElementById("readerFont")?.addEventListener("change", event => {
    prefs.fontFamily = event.target.value; apply(); savePrefs();
  });
  document.getElementById("readerWidth")?.addEventListener("click", () => {
    prefs.wide = !prefs.wide; apply(); savePrefs();
  });
  document.getElementById("readerSpacing")?.addEventListener("click", () => {
    prefs.spacing = (prefs.spacing + 1) % 4;
    prefs.line = [1.8, 2.0, 2.25, 2.5][prefs.spacing];
    apply(); savePrefs();
  });
  document.getElementById("chapterJump")?.addEventListener("change", event => {
    if (event.target.value) location.href = event.target.value;
  });
  document.getElementById("readerFullscreen")?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { say("وضع ملء الشاشة غير مدعوم في هذا المتصفح."); }
  });
  document.getElementById("readerCopy")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); say("تم نسخ رابط الفصل."); }
    catch { say("تعذر النسخ تلقائيًا؛ يمكنك نسخ الرابط من شريط العنوان."); }
  });

  const readBookmarks = () => {
    try { const value = JSON.parse(localStorage.getItem("worldOfNovels:bookmarks") || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const bookmarkKey = article.dataset.novelId + ":" + article.dataset.chapter;
  const bookmarkButton = document.getElementById("readerBookmark");
  const refreshBookmark = () => {
    if (!bookmarkButton) return;
    const exists = readBookmarks().some(item => item.key === bookmarkKey);
    bookmarkButton.textContent = exists ? "إزالة العلامة" : "حفظ علامة";
    bookmarkButton.setAttribute("aria-pressed", String(exists));
  };
  bookmarkButton?.addEventListener("click", () => {
    const list = readBookmarks();
    const exists = list.some(item => item.key === bookmarkKey);
    const updated = exists ? list.filter(item => item.key !== bookmarkKey) : [
      ...list, { key: bookmarkKey, id: article.dataset.novelId, chapter: Number(article.dataset.chapter), title: article.querySelector("h1")?.textContent || "", url: location.pathname, savedAt: new Date().toISOString() }
    ];
    try { localStorage.setItem("worldOfNovels:bookmarks", JSON.stringify(updated)); refreshBookmark(); say(exists ? "تمت إزالة علامة الفصل." : "تم حفظ علامة هذا الفصل على جهازك."); }
    catch { say("تعذر حفظ العلامة؛ مساحة التخزين المحلية غير متاحة."); }
  });
  refreshBookmark();

  const speakButton = document.getElementById("readerSpeak");
  const stopButton = document.getElementById("readerStop");
  const speechSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const updateSpeechButton = () => {
    if (speakButton) speakButton.textContent = speechState === "speaking" ? "إيقاف مؤقت" : speechState === "paused" ? "استكمال الصوت" : "استمع";
  };
  speakButton?.addEventListener("click", () => {
    if (!speechSupported) { say("ميزة القراءة الصوتية غير مدعومة في هذا المتصفح."); return; }
    if (speechState === "speaking") {
      speechSynthesis.pause(); speechState = "paused"; updateSpeechButton(); return;
    }
    if (speechState === "paused") {
      speechSynthesis.resume(); speechState = "speaking"; updateSpeechButton(); return;
    }
    speechSynthesis.cancel();
    utterance = new SpeechSynthesisUtterance(article.innerText);
    utterance.lang = "ar-EG";
    utterance.rate = 0.95;
    utterance.onstart = () => { speechState = "speaking"; updateSpeechButton(); };
    utterance.onend = () => { speechState = "idle"; updateSpeechButton(); };
    utterance.onerror = () => { speechState = "idle"; updateSpeechButton(); say("تعذرت القراءة الصوتية من محرك المتصفح."); };
    speechSynthesis.speak(utterance);
  });
  stopButton?.addEventListener("click", () => {
    if (speechSupported) speechSynthesis.cancel();
    utterance = null; speechState = "idle"; updateSpeechButton(); say("تم إيقاف القراءة الصوتية.");
  });
  window.addEventListener("pagehide", () => { if (speechSupported) speechSynthesis.cancel(); });

  const savePosition = () => {
    saveFrame = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const percent = Math.min(100, Math.max(0, Math.round(scrollY / max * 100)));
    if (progress) progress.style.width = percent + "%";
    try {
      localStorage.setItem(positionKey, JSON.stringify({ y: scrollY, percent, updatedAt: Date.now() }));
      localStorage.setItem("worldOfNovels:lastRead", JSON.stringify({
        id: article.dataset.novelId, chapter: Number(article.dataset.chapter), url: location.pathname, percent
      }));
    } catch {}
  };
  const queueSave = () => {
    if (!saveFrame) saveFrame = requestAnimationFrame(savePosition);
  };
  document.getElementById("readerSave")?.addEventListener("click", () => {
    savePosition(); say("تم حفظ موضع القراءة على هذا الجهاز.");
  });
  try {
    const saved = JSON.parse(localStorage.getItem(positionKey) || "null");
    if (saved && Number.isFinite(saved.y) && saved.y > 100) {
      requestAnimationFrame(() => scrollTo({ top: saved.y, behavior: "auto" }));
    }
  } catch {}
  addEventListener("scroll", queueSave, { passive: true });
  addEventListener("pagehide", savePosition);
  addEventListener("resize", queueSave);
  queueSave();

  const words = (article.innerText || "").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  const time = document.getElementById("readingTime");
  if (time) time.textContent = "وقت القراءة التقريبي: " + minutes + " دقيقة";
})();