/* Voyazia — offres vols + logements selon les dates de l'utilisateur.
   À charger APRÈS le script principal et photos.js. Aucune clé d'API : les liens
   ouvrent Google Flights, Booking, Airbnb et Google Hôtels déjà remplis. */
(function () {
  if (typeof D === "undefined") return;
  const EN = new Intl.DisplayNames(["en"], { type: "region" });
  const eng = s => { const a = s.split("|"); return a.length > 1 ? a[1] : a[0]; };
  const TX = {
    fr: { h: "Vols & hébergement", dest: "Destination", from: "Ville de départ (optionnel)", dep: "Départ", ret: "Retour", pax: "Voyageurs", fl: "✈ Vols", ho: "🏨 Logements", pick: "Choisis tes dates pour voir les offres.", bad: "Le retour doit être après le départ.", off: "⚠ Cette période n'est pas la meilleure pour y aller.", good: "✓ Bonne période pour y aller.", bud: "Budget sur place estimé (hors vols)", n: "nuits", note: "Les prix et disponibilités s'affichent en direct sur les sites partenaires, avec tes dates déjà remplies.", gf: "Google Flights", bk: "Booking.com", ab: "Airbnb", gh: "Google Hôtels" },
    en: { h: "Flights & stays", dest: "Destination", from: "Departing from (optional)", dep: "Depart", ret: "Return", pax: "Travelers", fl: "✈ Flights", ho: "🏨 Stays", pick: "Pick your dates to see offers.", bad: "Return must be after departure.", off: "⚠ This is not the best time to visit.", good: "✓ Good time to visit.", bud: "Estimated budget on site (excl. flights)", n: "nights", note: "Live prices and availability are shown on partner sites, with your dates pre-filled.", gf: "Google Flights", bk: "Booking.com", ab: "Airbnb", gh: "Google Hotels" },
    es: { h: "Vuelos y alojamiento", dest: "Destino", from: "Ciudad de salida (opcional)", dep: "Ida", ret: "Vuelta", pax: "Viajeros", fl: "✈ Vuelos", ho: "🏨 Alojamientos", pick: "Elige tus fechas para ver ofertas.", bad: "La vuelta debe ser posterior a la ida.", off: "⚠ Esta no es la mejor época para ir.", good: "✓ Buena época para ir.", bud: "Presupuesto estimado en destino (sin vuelos)", n: "noches", note: "Los precios y la disponibilidad se muestran en directo en los sitios asociados, con tus fechas ya rellenadas.", gf: "Google Flights", bk: "Booking.com", ab: "Airbnb", gh: "Google Hoteles" }
  };
  const X = k => (TX[L] || TX.fr)[k];
  const today = new Date(); const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const MIN = iso(today);
  let trip = { from: "", to: "", pax: 2, origin: "" };
  try { Object.assign(trip, JSON.parse(localStorage.getItem("vz_trip") || "{}")); } catch (e) {}
  if (trip.from && trip.from < MIN) { trip.from = ""; trip.to = ""; }
  const saveTrip = () => { try { localStorage.setItem("vz_trip", JSON.stringify(trip)); } catch (e) {} };

  const css = document.createElement("style");
  css.textContent = `
.offers{border-top:1px solid var(--line);padding-top:14px;display:grid;gap:10px}
.offers h3{font-size:17px}
.offers label{display:grid;gap:4px;font-size:12px;color:var(--slate);font-weight:600}
.offers input,.offers select{width:100%;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;font-size:14px}
.offers .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.offers .links2{display:grid;gap:6px}
.offers .links2 b{font-size:13px}
.offers .lk{display:flex;flex-wrap:wrap;gap:6px}
.offers a.btn{text-decoration:none;font-size:13px;padding:9px 12px}
.offers a.off{opacity:.45;pointer-events:none}
.offers .msg2{font-size:13px;color:var(--slate);margin:0}
.offers .ok{color:#15803d}.offers .ko{color:#b45309}
.offers .bud{background:var(--mist);border-radius:12px;padding:10px 12px;font-size:13px}`;
  document.head.appendChild(css);

  const enc = encodeURIComponent;
  const fmt = n => new Intl.NumberFormat(L, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const nights = () => Math.round((Date.parse(trip.to) - Date.parse(trip.from)) / 864e5);

  function render(box, c) {
    const d = D[c], country = EN.of(c);
    const dest0 = d ? eng(d.cap) : country;
    box.innerHTML = `<h3>${X("h")}</h3>
<label>${X("dest")}<input class="o-dest" value="${dest0.replace(/"/g, "&quot;")}"></label>
<label>${X("from")}<input class="o-org" value="${(trip.origin || "").replace(/"/g, "&quot;")}" placeholder="Paris"></label>
<div class="two"><label>${X("dep")}<input class="o-from" type="date" min="${MIN}" value="${trip.from}"></label><label>${X("ret")}<input class="o-to" type="date" min="${trip.from || MIN}" value="${trip.to}"></label></div>
<label>${X("pax")}<select class="o-pax">${[1, 2, 3, 4, 5, 6].map(n => `<option ${n == trip.pax ? "selected" : ""}>${n}</option>`).join("")}</select></label>
<p class="msg2 o-msg"></p><div class="links2 o-links"></div><p class="msg2" style="font-size:11px">${X("note")}</p>`;
    const q = s => box.querySelector(s);
    function update() {
      trip.origin = q(".o-org").value.trim(); trip.from = q(".o-from").value; trip.to = q(".o-to").value; trip.pax = +q(".o-pax").value;
      q(".o-to").min = trip.from || MIN; saveTrip();
      const dest = q(".o-dest").value.trim() || dest0, place = dest + ", " + country;
      const ok = trip.from && trip.to && trip.to > trip.from;
      let msg = !trip.from || !trip.to ? X("pick") : !ok ? X("bad") : "", extra = "";
      if (ok) {
        const m = +trip.from.slice(5, 7), good = d && d.m.includes(m), n = nights();
        if (d) msg = `<span class="${good ? "ok" : "ko"}">${good ? X("good") : X("off")}</span>`;
        if (d) extra = `<div class="bud">${X("bud")} : <b>≈ ${fmt(n * d.b * trip.pax)}</b> · ${n} ${X("n")} × ${trip.pax}</div>`;
      }
      q(".o-msg").innerHTML = msg;
      const l = { fr: "fr", en: "en-gb", es: "es" }[L], dom = { fr: "fr", en: "com", es: "es" }[L];
      const gf = `https://www.google.com/travel/flights?hl=${L}&q=${enc(`Flights${trip.origin ? " from " + trip.origin : ""} to ${place} on ${trip.from} through ${trip.to}`)}`;
      const bk = `https://www.booking.com/searchresults.${l}.html?ss=${enc(place)}&checkin=${trip.from}&checkout=${trip.to}&group_adults=${trip.pax}&no_rooms=1`;
      const ab = `https://www.airbnb.${dom}/s/${enc(place)}/homes?checkin=${trip.from}&checkout=${trip.to}&adults=${trip.pax}`;
      const gh = `https://www.google.com/travel/search?hl=${L}&q=${enc(`Hotels in ${place} ${trip.from} to ${trip.to}, ${trip.pax} guests`)}`;
      const a = (u, t, cls) => `<a class="btn ${cls} ${ok ? "" : "off"}" href="${ok ? u : "#"}" target="_blank" rel="noopener sponsored">${t}</a>`;
      q(".o-links").innerHTML = extra + `<div><b>${X("fl")}</b><div class="lk">${a(gf, X("gf"), "")}</div></div><div><b>${X("ho")}</b><div class="lk">${a(bk, X("bk"), "")}${a(ab, X("ab"), "ghost")}${a(gh, X("gh"), "ghost")}</div></div>`;
    }
    box.querySelectorAll("input,select").forEach(e => e.addEventListener("input", update));
    update();
  }
  function scan() {
    const pb = document.querySelector("#panel .pb");
    if (!pb || pb.querySelector(".offers")) return;
    const g = document.querySelector("#panel .ph linearGradient");
    if (!g) return;
    const box = document.createElement("div"); box.className = "offers";
    pb.appendChild(box); render(box, g.id.slice(1));
  }
  new MutationObserver(scan).observe(document.querySelector("#panel"), { childList: true, subtree: true });
  scan();
})();
