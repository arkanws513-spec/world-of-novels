import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const siteBase = "https://arkanws513-spec.github.io/world-of-novels/";
const manifestPath = path.join(ROOT, "content/novels.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(manifest.novels)) throw new Error("content/novels.json must contain a novels array.");
const novelRoot = path.join(ROOT, "content/novels");
let discoveredNovels = false;
if (fs.existsSync(novelRoot)) {
  for (const folder of fs.readdirSync(novelRoot, { withFileTypes: true }).filter(item => item.isDirectory())) {
    const metadataPath = path.join(novelRoot, folder.name, "novel.json");
    if (!fs.existsSync(metadataPath)) continue;
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    if (!metadata.id || !metadata.title) throw new Error("Each novel.json needs a unique id and a title: " + metadataPath);
    if (manifest.novels.some(item => item.id === metadata.id)) continue;
    const slug = metadata.slug || folder.name;
    manifest.novels.push({
      author: "عالم الروايات", genre: "", categories: [], icon: "✦", description: "",
      intro: [], status: "متاحة للقراءة", cover: "",
      contentDir: "content/novels/" + folder.name + "/chapters",
      outputDir: "novels", chapterPrefix: slug + "-chapter-",
      indexPath: "novels/" + slug + ".html", customPage: false,
      ...metadata
    });
    discoveredNovels = true;
    console.log("Discovered new novel from " + metadataPath);
  }
}
if (discoveredNovels) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
if (new Set(manifest.novels.map(novel => novel.id)).size !== manifest.novels.length) {
  throw new Error("Novel IDs must be unique in content/novels.json.");
}
const esc = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const out = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) {
      const text = paragraph.join(" ").trim();
      out.push("<p>" + esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") + "</p>");
      paragraph = [];
    }
  };
  for (const line of lines) {
    if (!line.trim()) { flush(); continue; }
    if (line.startsWith("# ")) continue;
    if (line.startsWith("### ")) { flush(); out.push("<h3>" + esc(line.slice(4).trim()) + "</h3>"); continue; }
    paragraph.push(line.trim());
  }
  flush();
  return out.join("\n");
}
function readChapters(novel) {
  const dir = path.join(ROOT, novel.contentDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => /^\d{3}\.md$/i.test(name)).sort().map((name, index) => {
    const source = fs.readFileSync(path.join(dir, name), "utf8");
    const title = source.match(/^#\s+(.+)$/m)?.[1]?.trim() || `الفصل ${index + 1}`;
    const number = Number(name.slice(0, 3));
    return { number, title, html: markdownToHtml(source), source: name };
  });
}
const all = manifest.novels.map(novel => ({ ...novel, chapters: readChapters(novel) }));
const catalog = { title: manifest.siteTitle, novels: all.map(n => ({
  id: n.id, slug: n.slug, title: n.title, author: n.author, genre: n.genre,
  categories: n.categories || [], icon: n.icon || "✦", description: n.description || "",
  status: n.status || "متاحة للقراءة", cover: n.cover || "", intro: n.intro || [],
  count: n.chapters.length, link: n.indexPath,
  chapters: n.chapters.map(c => ({ number: c.number, title: c.title, url: chapterUrl(n, c.number) }))
})) };
fs.writeFileSync(path.join(ROOT, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
for (const novel of all) {
  fs.mkdirSync(path.dirname(path.join(ROOT, novel.indexPath)), { recursive: true });
  if (!novel.customPage) fs.writeFileSync(path.join(ROOT, novel.indexPath), renderNovel(novel));
  for (let i = 0; i < novel.chapters.length; i++) {
    const chapter = novel.chapters[i];
    const previous = novel.chapters[i - 1] || null;
    const next = novel.chapters[i + 1] || null;
    const target = path.join(ROOT, chapterUrl(novel, chapter.number));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, renderChapter(novel, chapter, previous, next));
  }
  console.log(`Built ${novel.slug}: ${novel.chapters.length} chapters`);
}
const sitemapUrls = [siteBase, ...all.flatMap(n => [new URL(n.indexPath, siteBase).href, ...n.chapters.map(c => new URL(chapterUrl(n, c.number), siteBase).href)])];
const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapUrls.map(url => '  <url><loc>' + esc(url) + '</loc></url>').join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemapXml);
function chapterUrl(novel, number) {
  const file = novel.chapterPrefix + number + ".html";
  return path.posix.join(novel.outputDir, file);
}
function sharedHeader(novel) {
  return `<header class="site-header"><div class="container nav"><a class="logo" href="../index.html">عالم <span>الروايات</span></a><a class="ghost" href="../index.html#novels">← المكتبة</a></div></header>`;
}
function renderNovel(novel) {
  const canonical = siteBase + novel.indexPath;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: novel.title,
    author: { "@type": "Person", name: novel.author },
    description: novel.description,
    hasPart: novel.chapters.map(chapter => ({
      "@type": "Chapter", name: chapter.title,
      url: siteBase + chapterUrl(novel, chapter.number)
    }))
  };
  if (novel.cover) schema.image = siteBase + novel.cover;
  const schemaJson = JSON.stringify(schema).replaceAll("<", "\\u003c");
  const list = novel.chapters.map(c => `<a class="chapter-link" href="${esc(path.posix.basename(chapterUrl(novel, c.number)))}"><span>${esc(c.title)}</span><small>قراءة الفصل ${c.number} ←</small></a>`).join("\n");
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(novel.description)}"><meta name="theme-color" content="#100e16"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(novel.title)}"><meta property="og:description" content="${esc(novel.description)}">${novel.cover ? `<meta property="og:image" content="${esc(siteBase + novel.cover)}">` : ""}<meta name="twitter:card" content="summary_large_image"><title>${esc(novel.title)} — عالم الروايات</title><script type="application/ld+json">${schemaJson}</script><link rel="stylesheet" href="../style.css?v=9"></head>
<body>${sharedHeader(novel)}<main><section class="container section reader"><div class="reader-head">${novel.cover ? `<img src="../${esc(novel.cover)}" alt="غلاف ${esc(novel.title)}" loading="lazy" style="display:block;width:min(100%,300px);max-height:420px;object-fit:contain;margin:0 auto 22px;border-radius:14px">` : `<div class="book-mark">${esc(novel.icon)}</div>`}<p class="eyebrow">${esc(novel.genre)}</p><h1>${esc(novel.title)}</h1><p class="meta">تأليف: ${esc(novel.author)}</p><p class="meta">${esc(novel.status || "")}</p></div><article class="intro"><h2>مقدمة الرواية</h2>${novel.intro.map(p => `<p>${esc(p)}</p>`).join("\n")}</article><div class="reader-head"><p class="eyebrow">ابدأ القراءة</p><h2>فهرس الفصول</h2><div class="chapter-count">عدد الفصول: ${novel.chapters.length}</div></div><div class="chapter-list">${list || "<p>قريبًا ستضاف الفصول.</p>"}</div></section></main><footer><div class="container">© 2026 عالم الروايات</div></footer><script src="../site-analytics.js" defer></script></body></html>\n`;
}
function renderChapter(novel, chapter, previous, next) {
  const index = path.posix.basename(novel.indexPath);
  const controls = `<nav class="controls" aria-label="التنقل بين الفصول">${previous ? `<a href="${esc(path.posix.basename(chapterUrl(novel, previous.number)))}">← الفصل السابق</a>` : '<span class="disabled">← الفصل السابق</span>'}<a href="${esc(index)}">فهرس الرواية</a>${next ? `<a href="${esc(path.posix.basename(chapterUrl(novel, next.number)))}">الفصل التالي →</a>` : '<span class="disabled">الفصل التالي →</span>'}</nav>`;
  const chapterOptions = novel.chapters.map(item => `<option value="${esc(path.posix.basename(chapterUrl(novel, item.number)))}" ${item.number === chapter.number ? "selected" : ""}>الفصل ${item.number} — ${esc(item.title)}</option>`).join("");
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#100e16"><meta name="description" content="${esc(chapter.title)} — ${esc(novel.title)}"><title>${esc(chapter.title)} | ${esc(novel.title)}</title><link rel="canonical" href="${esc("https://arkanws513-spec.github.io/world-of-novels/" + chapterUrl(novel, chapter.number))}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(chapter.title)}"><meta property="og:description" content="${esc(novel.title)}"><link rel="stylesheet" href="../style.css?v=9"></head>
<body><div class="reading-progress" aria-hidden="true"><span id="readingProgress"></span></div><main class="reader reader-page"><div class="reader-top"><a class="logo" href="../index.html">عالم <span>الروايات</span></a><a class="ghost" href="${esc(index)}">فهرس الرواية</a></div><section class="reader-toolbar" aria-label="أدوات القراءة"><div class="toolbar-group"><span>حجم الخط</span><button type="button" data-font-step="-1" aria-label="تصغير الخط">−</button><button type="button" data-font-step="1" aria-label="تكبير الخط">+</button></div><div class="toolbar-group"><span>المظهر</span><button type="button" data-reader-theme="dark">داكن</button><button type="button" data-reader-theme="paper">ورقي</button><button type="button" data-reader-theme="sepia">سيبيا</button><button type="button" data-reader-theme="light">فاتح</button></div><div class="toolbar-group"><label for="readerFont">الخط</label><select id="readerFont" aria-label="نوع الخط"><option value="serif">نسخي</option><option value="system">النظام</option><option value="literata">Literata</option></select><button type="button" id="readerWidth">عرض مريح</button><button type="button" id="readerSpacing">تباعد السطور</button></div><div class="toolbar-group"><label for="chapterJump">انتقال</label><select id="chapterJump" aria-label="اختر فصلًا">${chapterOptions}</select><button type="button" id="readerBookmark">حفظ علامة</button></div><div class="toolbar-group"><button type="button" id="readerSpeak">استمع</button><button type="button" id="readerStop">إيقاف الصوت</button><button type="button" id="readerFullscreen">ملء الشاشة</button></div><div class="toolbar-group"><button type="button" id="readerSave">احفظ موضعي</button><button type="button" id="readerCopy">نسخ رابط الفصل</button></div><span class="reading-time" id="readingTime"></span></section>${controls}<article class="chapter" id="chapterContent" data-novel-id="${esc(novel.id)}" data-chapter="${chapter.number}"><div class="chapter-label">الفصل ${chapter.number} من ${novel.chapters.length}</div><h1>${esc(chapter.title)}</h1>${chapter.html}<p class="end">نهاية الفصل ${chapter.number}</p></article><div class="reader-save-note" id="readerSaveNote" role="status" aria-live="polite"></div>${controls}</main><script>try{localStorage.setItem("worldOfNovels:lastRead",JSON.stringify({id:"${esc(novel.id)}",chapter:${chapter.number},url:location.pathname}));}catch(e){}</script><script src="../reader-controls.js?v=2" defer></script><script src="../site-analytics.js" defer></script></body></html>\n`;
}
