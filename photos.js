/* Voyazia — photos pour chaque pays (Wikipédia / Wikimedia Commons)
   À charger APRÈS le script principal : <script src="photos.js"></script> avant </body> */
(function () {
  if (typeof D === "undefined") return;
  const css = document.createElement("style");
  css.textContent = `
.ph{height:190px}
.pimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s}
.pimg.on{opacity:1}
.ph:has(.pimg.on)::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,#0000 35%,#091a35cc)}
.ph .fl{z-index:2}
.pcred{position:absolute;right:10px;bottom:8px;z-index:2;font-size:10px;color:#fffc;text-decoration:none}
.tile .pimg{filter:brightness(.62)}
.tile>b,.tile>span{position:relative}
.tile em{z-index:1}`;
  document.head.appendChild(css);

  const EN = new Intl.DisplayNames(["en"], { type: "region" });
  const BAD = /flag|coat_of|emblem|locator|location|map|blason|seal_of|logo/i;
  const eng = s => { const a = s.split("|"); return a.length > 1 ? a[1] : a[0]; };
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem("vz_ph") || "{}"); } catch (e) {}
  const pend = {};

  function cands(c) {
    const n = EN.of(c), d = D[c], o = [];
    if (d && d.d) d.hl.slice(0, 2).forEach(h => o.push(eng(h)));
    o.push("Tourism in " + n);
    if (d) o.push(eng(d.cap));
    o.push(n);
    return o;
  }
  function find(c) {
    if (c in cache) return Promise.resolve(cache[c]);
    if (pend[c]) return pend[c];
    return pend[c] = (async () => {
      let netErr = false, url = "";
      for (const t of cands(c)) {
        try {
          const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t.replace(/ /g, "_")) + "?redirect=true");
          if (!r.ok) continue;
          const j = await r.json();
          const u = j.thumbnail && j.thumbnail.source;
          if (j.type === "disambiguation" || !u || BAD.test(decodeURIComponent(u))) continue;
          url = u.replace(/\/\d+px-/, "/960px-");
          break;
        } catch (e) { netErr = true; }
      }
      delete pend[c];
      if (!netErr || url) {
        cache[c] = url;
        try { localStorage.setItem("vz_ph", JSON.stringify(cache)); } catch (e) {}
      }
      return url;
    })();
  }
  function attach(el, c) {
    if (!c || el.dataset.ph) return;
    el.dataset.ph = 1;
    find(c).then(u => {
      if (!u || !el.isConnected) return;
      const img = new Image();
      img.className = "pimg"; img.alt = ""; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
      img.onload = () => img.classList.add("on");
      img.onerror = () => img.remove();
      img.src = u;
      const svg = el.querySelector("svg");
      svg ? svg.after(img) : el.prepend(img);
      if (el.classList.contains("ph")) {
        const a = document.createElement("a");
        a.className = "pcred"; a.href = "https://commons.wikimedia.org"; a.target = "_blank"; a.rel = "noopener";
        a.textContent = "📷 Wikimedia";
        el.appendChild(a);
      }
    });
  }
  function scan() {
    document.querySelectorAll(".ph:not([data-ph])").forEach(el => {
      const g = el.querySelector("linearGradient");
      if (g) attach(el, g.id.slice(1));
    });
    document.querySelectorAll("#mosaic .tile[data-c]:not([data-ph])").forEach(el => attach(el, el.dataset.c));
    const REP = { plage: "TH", aventure: "NZ", culture: "PE", gastronomie: "IT" };
    document.querySelectorAll("#four .tile[data-k]:not([data-ph])").forEach(el => attach(el, REP[el.dataset.k]));
  }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();
