(function () {
  const PRODUCTS = window.PRODUCTS, ERAS = window.ERAS, CATS = window.CATEGORIES;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Simple line icons used while a photo loads, or when none is found.
  const ICONS = {
    classic: '<rect x="14" y="10" width="36" height="28" rx="3"/><rect x="20" y="15" width="24" height="17" rx="1"/><path d="M8 46h48l-4 8H12z"/>',
    mac: '<rect x="8" y="10" width="48" height="32" rx="3"/><path d="M26 42v8M38 42v8M20 52h24"/>',
    ipod: '<rect x="18" y="6" width="28" height="52" rx="5"/><rect x="23" y="11" width="18" height="16" rx="1"/><circle cx="32" cy="42" r="8"/><circle cx="32" cy="42" r="2.5"/>',
    iphone: '<rect x="18" y="4" width="28" height="56" rx="6"/><path d="M28 9h8"/>',
    ipad: '<rect x="12" y="6" width="40" height="52" rx="5"/><circle cx="32" cy="53" r="1.5"/>',
    watch: '<rect x="18" y="18" width="28" height="28" rx="8"/><path d="M22 18l2-12h16l2 12M22 46l2 12h16l2-12M46 28h3v8h-3"/>',
    audio: '<path d="M20 12a8 8 0 0 1 8 8v4a6 6 0 0 1-6 6v22a3 3 0 0 1-6 0V30a8 8 0 0 1-4-6v-4a8 8 0 0 1 8-8zM44 12a8 8 0 0 0-8 8v4a6 6 0 0 0 6 6v22a3 3 0 0 0 6 0V30a8 8 0 0 0 4-6v-4a8 8 0 0 0-8-8z"/>',
    home: '<rect x="12" y="20" width="40" height="22" rx="5"/><path d="M24 50h16"/>',
    vision: '<path d="M6 30c0-8 6-12 26-12s26 4 26 12-4 14-12 14c-6 0-8-6-14-6s-8 6-14 6C10 44 6 38 6 30z"/>',
    acc: '<rect x="20" y="8" width="24" height="48" rx="12"/><path d="M32 8v14"/>'
  };
  const icon = (cat) => `<svg class="ph-icon" viewBox="0 0 64 64" aria-hidden="true">${ICONS[cat]}</svg>`;

  // ── Build DOM ──
  const entriesEl = $("#entries");
  const itemEls = [];
  const eraEls = [];

  ERAS.forEach((era, ei) => {
    const items = PRODUCTS.filter((p) => p.year >= era.from && p.year < era.to);
    if (!items.length) return;
    const section = document.createElement("section");
    section.className = "era";
    section.dataset.from = era.from;
    const endLabel = Math.min(era.to - 1, items[items.length - 1].year);
    section.innerHTML = `
      <header class="era-head">
        <div class="era-years" aria-hidden="true"><span>${era.from}</span><span>${endLabel}</span></div>
        <p class="era-num">Chapter ${String(ei + 1).padStart(2, "0")}</p>
        <h2>${esc(era.title)}</h2>
        <p class="era-blurb">${esc(era.blurb)}</p>
      </header>`;
    items.forEach((p) => {
      const cat = CATS[p.cat];
      const el = document.createElement("article");
      el.className = "item";
      el.dataset.id = p.id;
      el.dataset.cat = p.cat;
      el.dataset.year = p.year;
      el.style.setProperty("--c", cat.color);
      el.innerHTML = `
        <div class="item-media">
          <div class="halo"></div>
          <div class="img-wrap loading">${icon(p.cat)}</div>
          <span class="year-ghost" aria-hidden="true">${p.year}</span>
        </div>
        <div class="dot" aria-hidden="true"><i></i></div>
        <div class="card" tabindex="0" role="button" aria-label="${esc(p.name)} — more details">
          <div class="glare" aria-hidden="true"></div>
          <p class="meta"><span class="chip">${cat.label}</span><time>${MONTHS[p.month - 1]} ${p.year}</time></p>
          <h3>${esc(p.name)}</h3>
          <ul>${p.facts.slice(0, 2).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          <span class="more">Learn more ›</span>
        </div>`;
      section.appendChild(el);
      itemEls.push(el);
      el._p = p;
    });
    entriesEl.appendChild(section);
    eraEls.push(section);
    section._era = era;
  });

  function layoutSides() {
    let i = 0;
    itemEls.forEach((el) => { if (!el.hidden) el.classList.toggle("right", i++ % 2 === 1); });
  }
  layoutSides();

  // ── Hero stats count-up ──
  const stats = { products: PRODUCTS.length, years: new Date().getFullYear() - 1976, cats: Object.keys(CATS).length };
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = stats[el.dataset.count];
    if (reduceMotion) { el.textContent = target; return; }
    const t0 = performance.now() + 500, dur = 1600;
    const step = (t) => {
      const k = Math.min(1, Math.max(0, (t - t0) / dur));
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  // ── Hero orbit of category-colored planets ──
  const orbit = $("#orbit");
  Object.entries(CATS).forEach(([key, c], i, arr) => {
    const ring = document.createElement("div");
    ring.className = "ring";
    const size = 34 + i * 7;
    const dur = 30 + i * 9;
    ring.style.cssText = `--size:${size}vmin;--dur:${dur}s;--delay:${(-dur * i) / arr.length}s;--c:${c.color}`;
    ring.innerHTML = `<span class="planet"><i></i><b>${c.label}</b></span>`;
    orbit.appendChild(ring);
  });

  // ── Filters & search ──
  const filtersEl = $("#filters");
  let activeCat = "all";
  const chips = [["all", "All", "#f5f5f7"], ...Object.entries(CATS).map(([k, c]) => [k, c.label, c.color])];
  chips.forEach(([key, label, color]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.dataset.cat = key;
    b.style.setProperty("--c", color);
    if (key === "all") b.classList.add("on");
    b.addEventListener("click", () => {
      activeCat = key;
      filtersEl.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      applyFilter();
      $("#timeline").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
    filtersEl.appendChild(b);
  });
  const searchEl = $("#search");
  searchEl.addEventListener("input", () => applyFilter());

  function applyFilter() {
    const q = searchEl.value.trim().toLowerCase();
    let shown = 0;
    itemEls.forEach((el) => {
      const p = el._p;
      const hay = (p.name + " " + p.year + " " + p.facts.join(" ")).toLowerCase();
      const ok = (activeCat === "all" || p.cat === activeCat) && (!q || hay.includes(q));
      el.hidden = !ok;
      if (ok) shown++;
    });
    eraEls.forEach((s) => { s.hidden = !s.querySelector(".item:not([hidden])"); });
    $("#empty").hidden = shown > 0;
    layoutSides();
    requestAnimationFrame(onScroll);
  }

  // ── Decade rail ──
  const rail = $("#rail");
  for (let dec = 1970; dec <= 2020; dec += 10) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `’${String(dec).slice(2)}s`;
    b.dataset.dec = dec;
    b.addEventListener("click", () => {
      const target = itemEls.find((el) => !el.hidden && +el.dataset.year >= dec);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
    rail.appendChild(b);
  }

  // ── Images: load when near the viewport ──
  function loadImage(el) {
    if (el._imgRequested) return;
    el._imgRequested = true;
    const wrap = el.querySelector(".img-wrap");
    window.ProductImages.get(el._p.wiki, el._p.name).then((res) => {
      wrap.classList.remove("loading");
      if (!res) { wrap.classList.add("noimg"); return; }
      const img = new Image();
      img.alt = el._p.name;
      img.decoding = "async";
      img.src = res.src;
      img.className = res.mode;
      img.onload = () => {
        wrap.innerHTML = "";
        wrap.appendChild(img);
        requestAnimationFrame(() => wrap.classList.add("ready"));
        el._img = res;
      };
      img.onerror = () => wrap.classList.add("noimg");
    });
  }

  // ── Reveal + visibility tracking ──
  const visible = new Set();
  const nearIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) loadImage(e.target); });
  }, { rootMargin: "1200px 0px" });
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); visible.add(e.target); }
      else {
        visible.delete(e.target);
        e.target.style.setProperty("--f", e.boundingClientRect.top < 0 ? 1 : 0);
      }
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
  itemEls.forEach((el) => { nearIO.observe(el); revealIO.observe(el); });

  const eraIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); });
  }, { threshold: 0.25 });
  eraEls.forEach((s) => eraIO.observe(s.querySelector(".era-head")));

  // ── Scroll-linked animation loop ──
  const progressEl = $("#progress"), timeline = $("#timeline");
  const heroInner = $(".hero-inner"), hero = $("#hero");
  const yearBig = $("#yearBig"), yearEra = $("#yearEra"), hud = $(".year-hud");
  const topbar = $("#topbar");
  let shownYear = 1976, targetYear = 1976, ticking = false;

  function onScroll() {
    ticking = false;
    const vh = window.innerHeight;
    const sy = window.scrollY;
    const max = document.documentElement.scrollHeight - vh;
    progressEl.style.transform = `scaleX(${max > 0 ? sy / max : 0})`;
    topbar.classList.toggle("solid", sy > 40);

    // Hero recedes as you scroll.
    const hp = Math.min(1, sy / vh);
    if (!reduceMotion) {
      heroInner.style.transform = `translateY(${hp * 25}vh) scale(${1 - hp * 0.18})`;
      heroInner.style.opacity = String(1 - hp * 1.3);
      orbit.style.transform = `translate(-50%, -50%) scale(${1 + hp * 0.6}) rotate(${hp * 40}deg)`;
      orbit.style.opacity = String(1 - hp);
    }

    const tr = timeline.getBoundingClientRect();
    hud.classList.toggle("show", tr.top < vh * 0.5 && tr.bottom > vh * 0.5);

    // Era headers: giant years slide apart.
    eraEls.forEach((s) => {
      if (s.hidden) return;
      const head = s.firstElementChild;
      const r = head.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const k = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
      if (!reduceMotion) head.style.setProperty("--k", k.toFixed(3));
    });

    // Items: parallax, active state, current year.
    let best = null, bestD = Infinity;
    visible.forEach((el) => {
      if (el.hidden) return;
      const r = el.getBoundingClientRect();
      const c = r.top + r.height / 2;
      const o = (c - vh / 2) / vh;
      if (!reduceMotion) el.style.setProperty("--o", o.toFixed(3));
      el.style.setProperty("--f", Math.min(1, Math.max(0, (vh / 2 - r.top) / r.height)).toFixed(3));
      const d = Math.abs(c - vh / 2);
      el.classList.toggle("active", d < r.height * 0.6);
      if (d < bestD) { bestD = d; best = el; }
    });
    if (best) {
      targetYear = +best.dataset.year;
      const era = best.parentElement._era;
      if (era && yearEra.textContent !== era.title) yearEra.textContent = era.title;
      railActive(targetYear);
      if (targetYear !== shownYear) animateYear();
    }
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(onScroll));

  let yearAnim = null;
  function animateYear() {
    if (yearAnim) return;
    const step = () => {
      if (shownYear === targetYear) { yearAnim = null; return; }
      const diff = targetYear - shownYear;
      shownYear += Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff) / 6));
      yearBig.textContent = shownYear;
      yearBig.classList.remove("tick"); void yearBig.offsetWidth; yearBig.classList.add("tick");
      yearAnim = setTimeout(() => { yearAnim = null; step(); }, 45);
    };
    step();
  }

  let lastDec = null;
  function railActive(year) {
    const dec = Math.floor(year / 10) * 10;
    if (dec === lastDec) return;
    lastDec = dec;
    rail.querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.dec === dec));
  }

  onScroll();

  // ── 3D tilt + glare on cards ──
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    entriesEl.addEventListener("pointermove", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
      card.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
      card.style.setProperty("--gx", `${x * 100}%`);
      card.style.setProperty("--gy", `${y * 100}%`);
    });
    entriesEl.addEventListener("pointerout", (e) => {
      const card = e.target.closest(".card");
      if (card && !card.contains(e.relatedTarget)) {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      }
    });
  }

  // ── Modal ──
  const modal = $("#modal");
  function openModal(el) {
    const p = el._p, cat = CATS[p.cat];
    modal.style.setProperty("--c", cat.color);
    $("#modalMeta").textContent = `${cat.label} · ${MONTHS[p.month - 1]} ${p.year}`;
    $("#modalTitle").textContent = p.name;
    $("#modalFacts").innerHTML = p.facts.map((f) => `<li>${esc(f)}</li>`).join("");
    const link = $("#modalLink");
    link.href = "https://en.wikipedia.org/wiki/" + encodeURIComponent(p.wiki[0].replace(/ /g, "_"));
    const media = $("#modalMedia");
    const img = el.querySelector(".img-wrap img");
    media.innerHTML = img ? `<img src="${img.src}" alt="${esc(p.name)}" class="${img.className}">` : icon(p.cat);
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
  }
  entriesEl.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openModal(card.parentElement);
  });
  entriesEl.addEventListener("keydown", (e) => {
    const card = e.target.closest(".card");
    if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openModal(card.parentElement); }
  });
  $("#modalClose").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
})();
