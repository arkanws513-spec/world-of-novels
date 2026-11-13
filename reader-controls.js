"use strict";
(() => {
  const article = document.getElementById("chapterContent");
  if (!article) return;
  const page = document.querySelector(".reader-page");
  const progress = document.getElementById("readingProgress");
  const note = document.getElementById("readerSaveNote");
  const key = "worldOfNovels:readerPreferences";
  const positionKey = "worldOfNovels:position:" + location.pathname;
  const defaults = { font: 19, line: 2.25, theme: "dark", wide: false, spacing: 1 };
  let prefs = { ...defaults };
  try { prefs = { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch {}
  const apply = () => {
    article.style.setProperty("--reader-font-size", prefs.font + "px");
    article.style.setProperty("--reader-line-height", String(prefs.line));
    document.body.classList.toggle("reader-paper", prefs.theme === "paper");
    document.body.classList.toggle("reader-light", prefs.theme === "light");
    page.classList.toggle("reader-wide", !!prefs.wide);
  };
  const savePrefs = () => { try { localStorage.setItem(key, JSON.stringify(prefs)); } catch {} };
  apply();
  document.querySelectorAll("[data-font-step]").forEach(button => button.addEventListener("click", () => {
    prefs.font = Math.max(15, Math.min(28, prefs.font + Number(button.dataset.fontStep)));
    apply(); savePrefs();
  }));
  document.querySelectorAll("[data-reader-theme]").forEach(button => button.addEventListener("click", () => {
    prefs.theme = button.dataset.readerTheme; apply(); savePrefs();
  }));
  document.getElementById("readerWidth")?.addEventListener("click", () => {
    prefs.wide = !prefs.wide; apply(); savePrefs();
    document.getElementById("readerWidth").textContent = prefs.wide ? "العرض الأصلي" : "عرض مريح";
  });
  document.getElementById("readerSpacing")?.addEventListener("click", () => {
    prefs.spacing = (prefs.spacing + 1) % 3;
    prefs.line = [2.0, 2.25, 2.55][prefs.spacing]; apply(); savePrefs();
  });
  document.getElementById("readerFullscreen")?.addEventListener("click", async () => {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
    catch { if (note) note.textContent = "وضع ملء الشاشة غير مدعوم في هذا المتصفح."; }
  });
  document.getElementById("readerCopy")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); if (note) note.textContent = "تم نسخ رابط الفصل."; }
    catch { if (note) note.textContent = "تعذر النسخ تلقائيًا؛ يمكنك نسخ الرابط من شريط العنوان."; }
  });
  const savePosition = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const percent = Math.min(100, Math.max(0, Math.round(scrollY / max * 100)));
    if (progress) progress.style.width = percent + "%";
    try {
      localStorage.setItem(positionKey, JSON.stringify({ y: scrollY, percent }));
      localStorage.setItem("worldOfNovels:lastRead", JSON.stringify({
        id: article.dataset.novelId, chapter: Number(article.dataset.chapter), url: location.pathname, percent
      }));
    } catch {}
  };
  document.getElementById("readerSave")?.addEventListener("click", () => {
    savePosition(); if (note) note.textContent = "تم حفظ موضع القراءة على هذا الجهاز.";
  });
  try {
    const saved = JSON.parse(localStorage.getItem(positionKey) || "null");
    if (saved && Number.isFinite(saved.y) && saved.y > 100) requestAnimationFrame(() => scrollTo({ top: saved.y, behavior: "auto" }));
  } catch {}
  addEventListener("scroll", savePosition, { passive: true });
  addEventListener("pagehide", savePosition);
  savePosition();
  const words = (article.innerText || "").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  const time = document.getElementById("readingTime");
  if (time) time.textContent = "وقت القراءة التقريبي: " + minutes + " دقيقة";
  const widthButton = document.getElementById("readerWidth");
  if (widthButton) widthButton.textContent = prefs.wide ? "العرض الأصلي" : "عرض مريح";
})();