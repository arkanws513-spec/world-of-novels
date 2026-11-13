"use strict";
(async function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (value) => new Intl.NumberFormat("ar-EG").format(Number(value) || 0);
  const base = new URL("./", window.location.href);
  const counterBase = "https://akgame.goatcounter.com/counter/";
  const status = $("statsStatus");

  function setStatus(message, error) {
    status.textContent = message;
    status.classList.toggle("error", Boolean(error));
  }

  function makeRow(item) {
    const row = document.createElement("div");
    row.className = "stats-row";
    const link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.title;
    const count = document.createElement("span");
    count.className = "stats-count";
    count.textContent = fmt(item.count);
    row.append(link, count);
    return row;
  }

  function renderList(id, items, emptyText) {
    const target = $(id);
    target.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "stats-empty";
      empty.textContent = emptyText;
      target.append(empty);
      return;
    }
    items.forEach((item) => target.append(makeRow(item)));
  }

  async function getCounter(path) {
    const endpoint = counterBase + encodeURIComponent(path) + ".json";
    const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error("Counter unavailable: " + response.status);
    const data = await response.json();
    const value = Number(String(data.count ?? "").replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(value)) throw new Error("Invalid counter response");
    return value;
  }

  try {
    const response = await fetch(new URL("catalog.json", base), { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل فهرس الروايات.");
    const catalog = await response.json();
    const pages = [];
    pages.push({ kind: "library", title: "الصفحة الرئيسية", path: new URL("./", base).pathname, url: new URL("./", base).href });

    for (const novel of catalog.novels || []) {
      const novelUrl = new URL(novel.link, base);
      pages.push({ kind: "novel", novelId: novel.id, title: novel.title, path: novelUrl.pathname, url: novelUrl.href });
      for (const chapter of novel.chapters || []) {
        const chapterUrl = new URL(chapter.url, base);
        pages.push({
          kind: "chapter",
          novelId: novel.id,
          title: chapter.title || ("الفصل " + chapter.number),
          path: chapterUrl.pathname,
          url: chapterUrl.href
        });
      }
    }

    $("chapterCount").textContent = fmt(pages.filter((p) => p.kind === "chapter").length);

    const results = [];
    const failures = [];
    for (let i = 0; i < pages.length; i += 5) {
      const batch = pages.slice(i, i + 5);
      const settled = await Promise.all(batch.map(async (page) => {
        try { return { ...page, count: await getCounter(page.path) }; }
        catch (error) { failures.push({ page, error }); return null; }
      }));
      results.push(...settled.filter(Boolean));
    }

    if (!results.length) {
      $("totalTracked").textContent = "—";
      $("measuredPages").textContent = "0";
      renderList("novelStats", [], "لا توجد عدادات متاحة للعرض.");
      renderList("chapterStats", [], "لا توجد عدادات متاحة للعرض.");
      renderList("libraryStats", [], "لا توجد عدادات متاحة للعرض.");
      setStatus("تعذر قراءة العدادات العامة. افتح إعدادات GoatCounter وفعّل خيار السماح بعرض عدادات الزوار، ثم أعد المحاولة.", true);
      $("statsUpdated").textContent = "لم يتم تحميل البيانات";
      return;
    }

    const total = results.reduce((sum, page) => sum + page.count, 0);
    $("totalTracked").textContent = fmt(total);
    $("measuredPages").textContent = fmt(results.length);
    $("statsUpdated").textContent = "آخر تحديث: " + new Date().toLocaleString("ar-EG");

    const novels = (catalog.novels || []).map((novel) => {
      const items = results.filter((page) => page.novelId === novel.id);
      return {
        title: novel.title,
        url: new URL(novel.link, base).href,
        count: items.reduce((sum, page) => sum + page.count, 0)
      };
    }).sort((a, b) => b.count - a.count);

    const chapters = results.filter((page) => page.kind === "chapter")
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const library = results.filter((page) => page.kind === "library" || page.kind === "novel")
      .sort((a, b) => b.count - a.count);

    renderList("novelStats", novels, "لا توجد بيانات للروايات بعد.");
    renderList("chapterStats", chapters, "لا توجد بيانات للفصول بعد.");
    renderList("libraryStats", library, "لا توجد بيانات لصفحات المكتبة بعد.");

    if (failures.length) {
      setStatus("تم تحميل " + fmt(results.length) + " من " + fmt(pages.length) + " صفحة. بعض العدادات غير متاحة حاليًا؛ قد تكون صفحات جديدة أو لم يُفعّل عرض عداداتها.", false);
    } else {
      setStatus("تم تحميل عدادات جميع صفحات المكتبة بنجاح من GoatCounter.", false);
    }
  } catch (error) {
    console.error(error);
    setStatus("حدثت مشكلة أثناء تحميل لوحة الإحصائيات. يمكنك فتح لوحة GoatCounter الكاملة مباشرة.", true);
    $("statsUpdated").textContent = "تعذر الاتصال";
  }
})();
