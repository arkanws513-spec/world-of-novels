"use strict";
(function () {
  const namespace = "world-of-novels";
  const pathKey = (location.pathname || "/").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "home";
  const totalKey = namespace + "-total";
  const pageKey = namespace + "-" + pathKey;
  const sessionKey = "won-analytics:" + location.pathname + location.search;
  const endpoint = "https://countapi.mileshilliard.com/api/v1/";
  const totalLabel = document.getElementById("siteVisitCount");

  async function readCounter(key) {
    const response = await fetch(endpoint + "get/" + encodeURIComponent(key), {
      mode: "cors", cache: "no-store"
    });
    if (!response.ok) throw new Error("Counter read failed");
    return response.json();
  }
  async function hitCounter(key) {
    const response = await fetch(endpoint + "hit/" + encodeURIComponent(key), {
      mode: "cors", cache: "no-store"
    });
    if (!response.ok) throw new Error("Counter update failed");
    return response.json();
  }
  async function update() {
    try {
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        await Promise.all([hitCounter(totalKey), hitCounter(pageKey)]);
      }
      if (totalLabel) {
        const result = await readCounter(totalKey);
        if (Number.isFinite(Number(result.value))) {
          totalLabel.textContent = Number(result.value).toLocaleString("ar-EG");
          totalLabel.closest("[data-visit-counter]")?.removeAttribute("hidden");
        }
      }
    } catch (error) {
      if (totalLabel) {
        totalLabel.textContent = "غير متاح مؤقتًا";
        totalLabel.closest("[data-visit-counter]")?.removeAttribute("hidden");
      }
      console.warn("إحصاءات الزيارات غير متاحة حاليًا.", error);
    }
  }
  update();
})();