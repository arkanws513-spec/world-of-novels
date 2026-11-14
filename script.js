"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const books = $("books"), search = $("search"), count = $("resultCount"), empty = $("emptyState");
  if (!books || !search || !count || !empty) return;
  let novels = [], activeCategory = "الكل";
  const norm = value => String(value || "").toLocaleLowerCase("ar");
  const escapeHtml = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const totalChapters = list => list.reduce((sum, novel) => sum + Number(novel.count || 0), 0);
  const coverClass = novel => novel.id === "naruto-legacy" ? "cover-shinobi" : "cover-fantasy";
  const coverMarkup = novel => novel.cover ? `<div class="book-cover book-cover-image"><img src="${escapeHtml(novel.cover)}" alt="غلاف ${escapeHtml(novel.title)}" loading="lazy"></div>` : `<div class="book-cover ${coverClass(novel)}" aria-hidden="true"><span class="cover-kicker">عالم الروايات</span><span class="cover-emblem">${escapeHtml(novel.icon || "✦")}</span><span class="cover-title">${escapeHtml(novel.title)}</span><span class="cover-bottom">${escapeHtml((novel.categories || []).slice(0,2).join(" • "))}</span></div>`;
  function filteredNovels() {
    const query = norm(search.value.trim());
    const filtered = novels.filter(n => {
      const haystack = [n.title,n.genre,n.author,n.description,...(n.categories || [])].join(" ");
      return norm(haystack).includes(query) && (activeCategory === "الكل" || (n.categories || []).includes(activeCategory));
    });
    const sort = $("sortNovels")?.value || "featured";
    if (sort === "chapters") filtered.sort((a,b) => b.count-a.count);
    if (sort === "title") filtered.sort((a,b) => a.title.localeCompare(b.title,"ar"));
    return filtered;
  }
  function render() {
    const filtered = filteredNovels();
    books.innerHTML = filtered.map(n => {
      const firstChapter = n.chapters?.[0];
      return `<article class="book"><a class="book-link" href="${escapeHtml(n.link)}" aria-label="افتح رواية ${escapeHtml(n.title)}">
        ${coverMarkup(n)}
        <div class="book-info"><div class="book-meta"><span class="book-status">${escapeHtml(n.status || "متاحة للقراءة")}</span><span class="chapter-total">${Number(n.count)>0 ? `${Number(n.count)} فصل` : "قريباً"}</span></div>
          <h3>${escapeHtml(n.title)}</h3><p class="book-description">${escapeHtml(n.description)}</p>
          <div class="book-tags">${(n.categories || []).slice(0,3).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          <span class="read-link">اكتشف الرواية <b aria-hidden="true">←</b></span></div></a></article>`;
    }).join("");
    count.textContent = `عدد النتائج: ${filtered.length}`;
    $("libraryCount").textContent = `${novels.length} أعمال في المكتبة`;
    empty.hidden = filtered.length !== 0;
  }
  function chooseCategory(category) {
    activeCategory = category;
    document.querySelectorAll("[data-category]").forEach(button => {
      const selected = button.dataset.category === category;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    render();
  }
  function renderCategories() {
    const categories = [...new Set(novels.flatMap(n => n.categories || []))];
    const filters = $("categoryFilters"), tiles = $("categoryTiles");
    filters.innerHTML = `<button class="filter active" type="button" data-category="الكل" aria-pressed="true">الكل</button>` + categories.map(c => `<button class="filter" type="button" data-category="${escapeHtml(c)}" aria-pressed="false">${escapeHtml(c)}</button>`).join("");
    tiles.innerHTML = categories.map((c,i) => `<button type="button" data-pick-category="${escapeHtml(c)}"><span>${["✦","◈","⌁","❖","✧","◇"][i%6]}</span>${escapeHtml(c)}<small>اكتشف الأعمال</small></button>`).join("");
    filters.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => chooseCategory(button.dataset.category)));
    tiles.querySelectorAll("[data-pick-category]").forEach(button => button.addEventListener("click", () => {
      chooseCategory(button.dataset.pickCategory);
      $("novels").scrollIntoView({behavior:"smooth"});
    }));
  }
  function renderLatest() {
    const entries = novels.filter(n => n.chapters?.length).map(n => {
      const chapter = n.chapters[n.chapters.length-1];
      return {novel:n,chapter};
    }).reverse();
    $("latestChapters").innerHTML = entries.length ? entries.map(({novel,chapter}) => `
      <article class="latest-card"><div class="latest-mark">${escapeHtml(novel.icon || "✦")}</div><div class="latest-copy"><span class="eyebrow">${escapeHtml(novel.title)}</span><h3>${escapeHtml(chapter.title)}</h3><p>الفصل ${chapter.number} · ${novel.count} فصل متاح</p></div><a href="${escapeHtml(chapter.url)}" aria-label="اقرأ ${escapeHtml(chapter.title)}">اقرأ الفصل <b>←</b></a></article>`).join("") : "<p class='section-note'>ستظهر الفصول هنا عند إضافتها.</p>";
  }
  function renderFeatured() {
    const n = novels[0];
    if (!n) return;
    $("featuredNovel").innerHTML = `${n.cover ? `<div class="feature-art feature-art-image"><img src="${escapeHtml(n.cover)}" alt="غلاف ${escapeHtml(n.title)}"></div>` : `<div class="feature-art ${coverClass(n)}"><span class="feature-ring"></span><span class="feature-glyph">${escapeHtml(n.icon || "✦")}</span><small>من عوالمنا</small></div>`}<div class="feature-info"><span class="eyebrow">اختيار المكتبة</span><h2>${escapeHtml(n.title)}</h2><p>${escapeHtml(n.description)}</p><a class="feature-link" href="${escapeHtml(n.link)}">اكتشف الرواية ←</a></div>`;
  }
  function renderContinue() {
    try {
      const saved = JSON.parse(localStorage.getItem("worldOfNovels:lastRead") || "null");
      const novel = novels.find(item => item.id === saved?.id);
      const chapter = novel?.chapters?.find(item => item.number === Number(saved?.chapter));
      if (novel && chapter) {
        $("continueTitle").textContent = novel.title;
        $("continueDetails").textContent = `آخر موضع محفوظ: الفصل ${chapter.number}${saved.percent ? " · "+saved.percent+"% من الفصل" : ""}`;
        $("continueLink").href = chapter.url;
        $("continueCard").hidden = false;
      }
    } catch (error) { console.warn("تعذر قراءة موضع القراءة المحفوظ.", error); }
  }
  function renderBookmarks() {
    const card=$("bookmarksCard"),host=$("bookmarksList");
    if(!card||!host)return;
    let items=[];
    try{items=JSON.parse(localStorage.getItem("worldOfNovels:bookmarks")||"[]");}catch{}
    const valid=Array.isArray(items)?items.filter(item=>item&&item.url&&item.id):[];
    if(!valid.length){card.hidden=true;host.replaceChildren();return;}
    card.hidden=false;
    host.innerHTML=valid.map(item=>{
      const novel=novels.find(n=>n.id===item.id);
      let href="#novels";
      try{const url=new URL(item.url,location.origin);if(url.origin===location.origin)href=url.pathname+url.search+url.hash;}catch{}
      return `<article class="bookmark-item"><a href="${escapeHtml(href)}"><span class="bookmark-novel">${escapeHtml(novel?.title||"رواية")}</span><strong>${escapeHtml(item.title||("الفصل "+item.chapter))}</strong></a><button type="button" data-remove-bookmark="${escapeHtml(item.key||"")}" aria-label="إزالة العلامة المرجعية">×</button></article>`;
    }).join("");
    host.querySelectorAll("[data-remove-bookmark]").forEach(button=>button.addEventListener("click",()=>{
      const key=button.dataset.removeBookmark;
      const next=valid.filter(item=>item.key!==key);
      try{localStorage.setItem("worldOfNovels:bookmarks",JSON.stringify(next));}catch{}
      renderBookmarks();
    }));
  }

  search.addEventListener("input", render);
  $("sortNovels")?.addEventListener("change", render);
  $("showAll")?.addEventListener("click", () => { search.value = ""; chooseCategory("الكل"); });
  const menuToggle = $("menuToggle"), mainNav = $("mainNav");
  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
    mainNav?.classList.toggle("open", open);
  });
  mainNav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    menuToggle?.setAttribute("aria-expanded","false"); menuToggle?.setAttribute("aria-label","فتح القائمة"); mainNav.classList.remove("open");
  }));
  fetch("catalog.json").then(response => {
    if (!response.ok) throw new Error("Catalog request failed");
    return response.json();
  }).then(data => {
    novels = Array.isArray(data.novels) ? data.novels : [];
    $("totalNovels").textContent = novels.length;
    $("totalChapters").textContent = totalChapters(novels);
    renderCategories(); render(); renderLatest(); renderFeatured(); renderContinue(); renderBookmarks();
  }).catch(error => {
    console.error("تعذر تحميل فهرس الروايات.", error);
    empty.hidden = false; empty.textContent = "تعذر تحميل فهرس الروايات حاليًا. أعد تحميل الصفحة بعد قليل.";
  });
})();