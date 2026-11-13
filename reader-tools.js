"use strict";
(function () {
  const path = location.pathname;
  const isNaruto = path.includes("/naruto-legacy-of-worlds/");
  const novelId = isNaruto ? "naruto-legacy" : "saint-seven-worlds";
  const novelTitle = isNaruto ? "ناروتو: إرث العوالم" : "صعود قديس العوالم السبع";
  const chapter = Math.max(1, Number(new URLSearchParams(location.search).get("c")) || 1);
  const storageKey = "worldOfNovels:lastRead";
  const body = document.getElementById("chapterBody");
  if (!body) return;

  try {
    localStorage.setItem(storageKey, JSON.stringify({id:novelId, chapter, title:novelTitle, updatedAt:Date.now()}));
  } catch (error) { /* Reading remains available when storage is disabled. */ }

  const toolbar = document.createElement("section");
  toolbar.className = "reader-tools";
  toolbar.setAttribute("aria-label", "أدوات القراءة");
  toolbar.innerHTML = `
    <a class="tool-home" href="../">المكتبة</a>
    <div class="tool-actions">
      <button type="button" data-action="smaller" aria-label="تصغير الخط">A−</button>
      <button type="button" data-action="larger" aria-label="تكبير الخط">A+</button>
      <button type="button" data-action="theme" aria-pressed="false">وضع مريح</button>
      <button type="button" data-action="bookmark">حفظ الفصل</button>
    </div>
    <span class="tool-message" aria-live="polite"></span>`;
  const style = document.createElement("style");
  style.textContent = `
    .reader-tools{max-width:850px;margin:14px auto 12px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:#191520;border:1px solid #382e40;border-radius:12px;font:14px Tahoma,Arial,sans-serif}
    .reader-tools a{color:#e5c77b;text-decoration:none;font-weight:700}
    .tool-actions{display:flex;gap:7px;flex-wrap:wrap}
    .tool-actions button{background:#25202c;border:1px solid #51445b;color:#eee;border-radius:8px;padding:7px 10px;cursor:pointer}
    .tool-actions button:hover{border-color:#d2a765;color:#f2d7a5}
    .tool-message{width:100%;color:#d2a765;font-size:12px}
    body.reader-sepia{background:#e9dfca!important;color:#30271e!important}
    body.reader-sepia .chapter{background:#f4ecd9!important;border-color:#c8b99a!important}
    body.reader-sepia .chapter p{color:#382f26!important}
    body.reader-sepia .chapter h1,body.reader-sepia h3{color:#79572c!important}
    @media(max-width:600px){.reader-tools{margin:10px 12px}.tool-actions{width:100%}.tool-actions button{flex:1}}
  `;
  document.head.appendChild(style);
  document.body.insertBefore(toolbar, document.body.firstChild);
  const message = toolbar.querySelector(".tool-message");
  let fontSize = 19;
  const paragraphs = body.querySelectorAll("p");
  function setFontSize() {
    paragraphs.forEach(p => p.style.fontSize = fontSize + "px");
    message.textContent = "حجم الخط: " + fontSize;
  }
  toolbar.querySelector('[data-action="smaller"]').addEventListener("click", () => {
    fontSize = Math.max(15, fontSize - 1); setFontSize();
  });
  toolbar.querySelector('[data-action="larger"]').addEventListener("click", () => {
    fontSize = Math.min(26, fontSize + 1); setFontSize();
  });
  const themeButton = toolbar.querySelector('[data-action="theme"]');
  themeButton.addEventListener("click", () => {
    const enabled = document.body.classList.toggle("reader-sepia");
    themeButton.setAttribute("aria-pressed", String(enabled));
    themeButton.textContent = enabled ? "الوضع الداكن" : "وضع مريح";
  });
  toolbar.querySelector('[data-action="bookmark"]').addEventListener("click", () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({id:novelId,chapter,title:novelTitle,updatedAt:Date.now()}));
      message.textContent = "تم حفظ موضعك في الفصل " + chapter + ".";
    } catch (error) { message.textContent = "تعذر الحفظ على هذا الجهاز؛ يمكنك متابعة القراءة دون حفظ."; }
  });
})();