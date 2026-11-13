"use strict";
const novels = [
  { id:"saint-seven-worlds", title:"صعود قديس العوالم السبع", author:"عالم الروايات", genre:"فانتازيا • مغامرة", categories:["فانتازيا","مغامرة"], icon:"✦", status:"12 فصلًا", link:"novels/saint-of-seven-worlds.html" },
  { id:"naruto-legacy", title:"ناروتو: إرث العوالم", author:"عالم الروايات", genre:"مغامرة • خيال • ناروتو", categories:["مغامرة","خيال","أكشن"], icon:"忍", status:"فصل واحد", link:"naruto-legacy-of-worlds/" }
];
const books = document.getElementById("books");
const search = document.getElementById("search");
const count = document.getElementById("resultCount");
const empty = document.getElementById("emptyState");
let activeCategory = "الكل";

function render() {
  const query = search.value.trim().toLocaleLowerCase("ar");
  const filtered = novels.filter(n => {
    const text = [n.title,n.genre,n.author,...n.categories].join(" ").toLocaleLowerCase("ar");
    return text.includes(query) && (activeCategory === "الكل" || n.categories.includes(activeCategory));
  });
  books.innerHTML = filtered.map(n => `
    <article class="book">
      <a class="book-link" href="${n.link}" aria-label="افتح رواية ${n.title}">
        <div class="cover cover-${n.id}" aria-hidden="true"><span>${n.icon}</span><small>عالم الروايات</small></div>
        <div class="book-info"><span class="book-status">${n.status}</span><h3>${n.title}</h3><p>${n.author} — ${n.genre}</p><span class="read-link">افتح الرواية <b aria-hidden="true">←</b></span></div>
      </a>
    </article>`).join("");
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
document.querySelectorAll("[data-category]").forEach(button =>
  button.addEventListener("click", () => chooseCategory(button.dataset.category))
);
document.querySelectorAll("[data-pick-category]").forEach(button =>
  button.addEventListener("click", () => {
    chooseCategory(button.dataset.pickCategory);
    document.getElementById("novels").scrollIntoView({behavior:"smooth"});
  })
);
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
try {
  const saved = JSON.parse(localStorage.getItem("worldOfNovels:lastRead") || "null");
  if (saved && novels.some(n => n.id === saved.id)) {
    const novel = novels.find(n => n.id === saved.id);
    const card = document.getElementById("continueCard");
    document.getElementById("continueTitle").textContent = novel.title;
    document.getElementById("continueDetails").textContent = saved.chapter ? `آخر موضع محفوظ: الفصل ${saved.chapter}` : "تابع من حيث توقفت.";
    document.getElementById("continueLink").href = novel.id === "naruto-legacy"
      ? `naruto-legacy-of-worlds/chapter.html?c=${saved.chapter || 1}`
      : `novels/chapter.html?c=${saved.chapter || 1}`;
    card.hidden = false;
  }
} catch (error) { console.warn("تعذر قراءة موضع القراءة المحفوظ.", error); }
render();