// Fetches product photos from Wikipedia at runtime and strips their backgrounds
// in the browser with an edge flood-fill, so products float on the page.
(function () {
  const API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
  const CACHE_KEY = "apple-history-img-v1";
  const TARGET_W = 800;
  const MAX_CONCURRENT = 4;

  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch (e) { cache = {}; }
  const saveCache = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {} };

  // ── simple concurrency-limited queue ──
  let active = 0;
  const queue = [];
  function schedule(task) {
    return new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      pump();
    });
  }
  function pump() {
    while (active < MAX_CONCURRENT && queue.length) {
      const { task, resolve, reject } = queue.shift();
      active++;
      task().then(resolve, reject).finally(() => { active--; pump(); });
    }
  }

  function pickUrl(summary) {
    const orig = summary.originalimage;
    const thumb = summary.thumbnail;
    if (!orig && !thumb) return null;
    const isSvg = orig && /\.svg$/i.test(orig.source);
    if (thumb && (isSvg || (orig && orig.width > TARGET_W))) {
      return thumb.source.replace(/\/(\d+)px-([^/]+)$/, `/${TARGET_W}px-$2`);
    }
    return (orig || thumb).source;
  }

  async function resolveUrl(titles) {
    const key = titles.join("|");
    if (key in cache) return cache[key];
    for (const t of titles) {
      try {
        const res = await fetch(API + encodeURIComponent(t.replace(/ /g, "_")), { headers: { accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        const url = pickUrl(data);
        if (url) { cache[key] = url; saveCache(); return url; }
      } catch (e) { /* try next title */ }
    }
    cache[key] = null; saveCache();
    return null;
  }

  function loadImg(src, cors) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (cors) img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // ── background removal ──
  const dist = (d, i, r, g, b) => {
    const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  function removeBackground(img) {
    const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h); // throws if CORS-tainted
    const d = imgData.data;

    // Sample the border.
    const border = [];
    for (let x = 0; x < w; x++) { border.push(x, (h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { border.push(y * w, y * w + w - 1); }

    let transparent = 0;
    for (const p of border) if (d[p * 4 + 3] < 24) transparent++;
    if (transparent / border.length > 0.5) return { canvas: trim(canvas, ctx, w, h), mode: "alpha" };

    // Dominant border color via coarse histogram.
    const buckets = new Map();
    for (const p of border) {
      const i = p * 4;
      const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4);
      const b = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
      b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2];
      buckets.set(k, b);
    }
    let best = null;
    for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
    const br = best.r / best.n, bg = best.g / best.n, bb = best.b / best.n;

    let similar = 0;
    for (const p of border) if (dist(d, p * 4, br, bg, bb) < 40) similar++;
    if (similar / border.length < 0.55) return null; // busy photo — leave as is

    // Flood fill from the border.
    const HARD = 28, SOFT = 52, STEP = 7;
    const removed = new Uint8Array(w * h);
    const stack = [];
    for (const p of border) {
      if (!removed[p] && dist(d, p * 4, br, bg, bb) < SOFT) { removed[p] = 1; stack.push(p); }
    }
    let count = stack.length;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      const pi = p * 4;
      const nbrs = [];
      if (x > 0) nbrs.push(p - 1);
      if (x < w - 1) nbrs.push(p + 1);
      if (y > 0) nbrs.push(p - w);
      if (y < h - 1) nbrs.push(p + w);
      for (const n of nbrs) {
        if (removed[n]) continue;
        const ni = n * 4;
        const db = dist(d, ni, br, bg, bb);
        if (db < HARD || (db < SOFT && dist(d, ni, d[pi], d[pi + 1], d[pi + 2]) < STEP)) {
          removed[n] = 1; count++; stack.push(n);
        }
      }
    }

    const frac = count / (w * h);
    if (frac < 0.03 || frac > 0.97) return null; // nothing to remove, or we ate the product

    // Apply alpha, feathering pixels that touch the removed region.
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (removed[p]) { d[i + 3] = 0; continue; }
      const x = p % w, y = (p / w) | 0;
      const edge = (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) ||
                   (y > 0 && removed[p - w]) || (y < h - 1 && removed[p + w]);
      if (edge) {
        const a = Math.min(1, Math.max(0.15, (dist(d, i, br, bg, bb) - HARD * 0.5) / 60));
        d[i + 3] = Math.round(d[i + 3] * a);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return { canvas: trim(canvas, ctx, w, h), mode: "cutout" };
  }

  function trim(canvas, ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return canvas;
    const pad = 4;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const out = document.createElement("canvas");
    out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext("2d").drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  const toBlobUrl = (canvas) => new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/png")), "image/png");
  });

  // Public: returns { src, mode, source } where mode is "cutout" | "alpha" | "photo", or null.
  const memo = new Map();
  window.ProductImages = {
    get(titles) {
      const key = titles.join("|");
      if (!memo.has(key)) {
        memo.set(key, schedule(async () => {
          const url = await resolveUrl(titles);
          if (!url) return null;
          try {
            const img = await loadImg(url, true);
            const out = removeBackground(img);
            if (out) return { src: await toBlobUrl(out.canvas), mode: out.mode, source: url };
            return { src: url, mode: "photo", source: url };
          } catch (e) {
            // CORS failed or decode failed — fall back to the plain image.
            try { await loadImg(url, false); return { src: url, mode: "photo", source: url }; }
            catch (e2) { return null; }
          }
        }));
      }
      return memo.get(key);
    }
  };
})();
