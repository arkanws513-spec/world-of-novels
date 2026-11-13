"use strict";
const books = document.getElementById("books");
const search = document.getElementById("search");
const count = document.getElementById("resultCount");
const empty = document.getElementById("emptyState");
let novels = [];
let activeCategory = "الكل";
const norm = value => String(value || "").toLocaleLowerCase("ar");
const escapeHtml = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
function render() {
  const query = norm(search.value.trim());
  const filtered = novels.filter(n => {
    const haystack = [n.title,n.genre,n.author,n.description,...n.categories].join(" ");
    return norm(haystack).includes(query) && (activeCategory === "الكل" || n.categories.includes(activeCategory));
  });
  books.innerHTML = filtered.map(n => `
    <article class="book"><a class="book-link" href="${escapeHtml(n.link)}" aria-label="افتح رواية ${escapeHtml(n.title)}">
      <div class="cover cover-${escapeHtml(n.id)}" aria-hidden="true"><span>${escapeHtml(n.icon)}</span><small>عالم الروايات</small></div>
      <div class="book-info"><span class="book-status">${n.count} فصل</span><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.author)} — ${escapeHtml(n.genre)}</p><span class="read-link">افتح الرواية <b aria-hidden="true">←</b></span></div>
    </a></article>`).join("");
  count.textContent = `عدد النتائج: ${filtered.length}`;
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
search.addEventListener("input", render);
document.getElementById("showAll").addEventListener("click", () => {
  search.value = "";
  chooseCategory("الكل");
});
document.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => chooseCategory(button.dataset.category)));
document.querySelectorAll("[data-pick-category]").forEach(button => button.addEventListener("click", () => {
  chooseCategory(button.dataset.pickCategory);
  document.getElementById("novels").scrollIntoView({behavior:"smooth"});
}));
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
  mainNav.classList.toggle("open", open);
});
mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  menuToggle.setAttribute("aria-expanded","false");
  menuToggle.setAttribute("aria-label","فتح القائمة");
  mainNav.classList.remove("open");
}));
fetch("catalog.json").then(response => {
  if (!response.ok) throw new Error("Catalog request failed");
  return response.json();
}).then(data => {
  novels = data.novels || [];
  render();
  try {
    const saved = JSON.parse(localStorage.getItem("worldOfNovels:lastRead") || "null");
    const novel = novels.find(item => item.id === saved?.id);
    const chapter = novel?.chapters?.find(item => item.number === Number(saved?.chapter));
    if (novel && chapter) {
      document.getElementById("continueTitle").textContent = novel.title;
      document.getElementById("continueDetails").textContent = `آخر موضع محفوظ: الفصل ${chapter.number}`;
      document.getElementById("continueLink").href = chapter.url;
      document.getElementById("continueCard").hidden = false;
    }
  } catch (error) { console.warn("تعذر قراءة موضع القراءة المحفوظ.", error); }
}).catch(error => {
  console.error("تعذر تحميل فهرس الروايات.", error);
  empty.hidden = false;
  empty.textContent = "تعذر تحميل فهرس الروايات حاليًا. أعد تحميل الصفحة بعد قليل.";
});
