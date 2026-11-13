"use strict";
(function () {
  if (window.goatcounter) return;
  const script = document.createElement("script");
  script.dataset.goatcounter = "https://akgame.goatcounter.com/count";
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.onerror = function () {
    console.warn("تعذر تحميل إحصائيات GoatCounter. تحقق من الاتصال أو مانع الإعلانات.");
  };
  document.head.appendChild(script);
})();
