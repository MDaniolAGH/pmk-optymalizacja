/* =====================================================================
   Shared UI: typesetting, number formatting, plots, controls, the step-by-step player.
   ===================================================================== */
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
/* progress and preferences kept in the browser (nothing leaves the device) */
const Store = (() => {
  const KEY = 'pmk-optymalizacja-v1'; let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { d = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* private mode: keep in memory */ } };
  return { get: (k, def) => (k in d ? d[k] : def), set(k, v) { d[k] = v; save(); }, clear() { d = {}; save(); } };
})();
const KOPT = { throwOnError: false, output: 'html', strict: false, trust: true };
const K = (t, disp = false) => {   // symbols are tagged first, so that each of them opens its glossary entry
  try {
    const html = katex.renderToString(annot(t), Object.assign({ displayMode: disp }, KOPT));
    if (!html.includes('katex-error')) return html.includes('data-g') ? html.replace('<span class="katex">', '<span class="katex" tabindex="0">') : html;   // formulas with symbols can be reached with Tab; Enter opens their explanation
    (window.__kfall = window.__kfall || []).push(t);   // tagging failed for this formula: render it untagged
    return katex.renderToString(t, Object.assign({ displayMode: disp }, KOPT));
  } catch (e) { return `<code>${t}</code>`; }
};
/* Mini-markup for texts: $inline$, $$display$$, **bold**, *italic*, blank line = new paragraph. */
function md(src, inline = false) {
  const stash = [];
  const keep = h => { stash.push(h); return stash.length - 1; };
  let s = String(src)
    .replace(/\$\$([\s\S]+?)\$\$/g, (m, t) => `\n\n\u0002${keep(`<div class="dm">${K(t.trim(), true)}</div>`)}\u0002\n\n`)
    .replace(/\$([^$]+?)\$/g, (m, t) => `\u0001${keep(K(t.trim()))}\u0001`)
    .replace(/\[\[([A-Za-z0-9_]+)\|([^\]]+)\]\]/g, '<span class="gl" data-g="$1">$2</span>')
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  if (!inline) {
    s = s.trim().split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
      .map(b => (/^\u0002\d+\u0002$/.test(b) || /^<(div|table|ul|ol|details|section|p)\b/.test(b)) ? b : `<p>${b}</p>`).join('');
  }
  return s.replace(/[\u0001\u0002](\d+)[\u0001\u0002]/g, (m, i) => stash[+i]);
}
const mdi = s => md(s, true);
const noTab = e => { e.querySelectorAll('.katex[tabindex]').forEach(k => k.removeAttribute('tabindex')); return e; };   // formulas inside buttons are not separate tab stops
const box = (kind, label, body) => `<div class="box ${kind}"><span class="box-l">${label}</span>${md(body)}</div>`;

/* ---------- numbers ---------- */
function num(x, sig = 5) {
  if (!Number.isFinite(x)) return Number.isNaN(x) ? '—' : (x > 0 ? '∞' : '−∞');
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e6 || a < 1e-4) return x.toExponential(Math.max(1, sig - 3)).replace('e+', 'e').replace('-', '−').replace('e-', 'e−');
  return String(parseFloat(x.toPrecision(sig))).replace('-', '−');
}
/* same number as TeX (scientific notation as m·10^e) */
function tn(x, sig = 5) {
  if (!Number.isFinite(x)) return Number.isNaN(x) ? R`\text{—}` : (x > 0 ? R`\infty` : R`-\infty`);
  const s = num(x, sig).replace(/−/g, '-');
  if (s.includes('e')) { const [m, e] = s.split('e'); return `${m}\\cdot 10^{${+e}}`; }
  return s;
}
const tp = (x, sig) => (x < 0 ? `(${tn(x, sig)})` : tn(x, sig));          // negative numbers in parentheses
const tv = (v, sig) => `(${v.map(c => tn(c, sig)).join(R`,\ `)})`;        // point / vector as a tuple
const tm = (A, sig) => R`\begin{bmatrix}` + A.map(r => r.map(c => tn(c, sig)).join('&')).join(R`\\`) + R`\end{bmatrix}`;
const al = (lhs, ...rhs) => R`\begin{aligned}` + lhs + rhs.map((r, i) => (i ? R`\\ ` : '') + '&=' + r).join('') + R`\end{aligned}`;  // one relation per line
const vecs = (v, sig = 5) => '(' + v.map(c => num(c, sig)).join(', ') + ')';

/* ---------- colours (read once from the CSS tokens) ---------- */
const C = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['green', 'green-d', 'red', 'black', 'ink', 'ink2', 'ink3', 'paper', 'line', 'line2', 'contour', 'grid', 'ghost', 'green-t2', 'red-t2', 'grey-t'])
    C[k.replace(/-(\w)/g, (m, c) => c.toUpperCase())] = cs.getPropertyValue('--' + k).trim();
}
const FONT_UI = '"Source Sans 3", "Segoe UI", system-ui, sans-serif';

/* ---------- contour extraction (marching squares) ---------- */
function marching(vals, nx, ny, x0, dx, y0, dy, L) {
  const out = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = vals[j * nx + i], b = vals[j * nx + i + 1], c = vals[(j + 1) * nx + i + 1], d = vals[(j + 1) * nx + i];
    const idx = (a > L ? 1 : 0) | (b > L ? 2 : 0) | (c > L ? 4 : 0) | (d > L ? 8 : 0);
    if (idx === 0 || idx === 15) continue;
    const xa = x0 + i * dx, ya = y0 + j * dy;
    const T = () => [xa + dx * (L - a) / (b - a), ya], Rt = () => [xa + dx, ya + dy * (L - b) / (c - b)];
    const B = () => [xa + dx * (L - d) / (c - d), ya + dy], Lf = () => [xa, ya + dy * (L - a) / (d - a)];
    switch (idx) {
      case 1: case 14: out.push(Lf(), T()); break;
      case 2: case 13: out.push(T(), Rt()); break;
      case 3: case 12: out.push(Lf(), Rt()); break;
      case 4: case 11: out.push(Rt(), B()); break;
      case 6: case 9: out.push(T(), B()); break;
      case 7: case 8: out.push(Lf(), B()); break;
      case 5: out.push(Lf(), T(), Rt(), B()); break;
      case 10: out.push(T(), Rt(), Lf(), B()); break;
    }
  }
  return out;
}
function niceStep(raw) { const p = 10 ** Math.floor(Math.log10(raw)), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function linTicks(a, b, n) {
  const st = niceStep((b - a) / Math.max(2, n)), out = [];
  for (let i = Math.ceil(a / st - 1e-9); i * st <= b + st * 1e-9; i++) { const v = parseFloat((i * st).toPrecision(10)); out.push({ v, label: num(v, 6) }); }
  return out;
}
function logTicks(a, b, n) {
  const e0 = Math.ceil(Math.log10(a) - 1e-9), e1 = Math.floor(Math.log10(b) + 1e-9), st = Math.max(1, Math.ceil((e1 - e0 + 1) / Math.max(2, n))), out = [];
  for (let e = Math.ceil(e0 / st) * st; e <= e1; e += st) out.push({ v: 10 ** e, pow: e });
  return out;
}

/* ---------- canvas plot ---------- */
const PLOTS = new Set();
class Plot {
  constructor(o = {}) {
    this.o = Object.assign({ ratio: '1 / 0.84', xlog: false, ylog: false, equal: false, xlabel: null, ylabel: null, ml: 52, mr: 14, mt: 30, mb: 46, floor: 1e-300 }, o);
    this.el = el('div', 'plot'); this.el.style.aspectRatio = this.o.ratio;
    this.cv = el('canvas'); this.cv.setAttribute('role', 'img'); if (o.aria) this.cv.setAttribute('aria-label', o.aria);
    this.el.append(this.cv);
    if (this.o.xlabel) this.el.append(el('span', 'ax axx', K(this.o.xlabel)));
    if (this.o.ylabel) this.el.append(el('span', 'ax axy', K(this.o.ylabel)));
    this.view = [0, 1, 0, 1]; this.draw = null; this.onpick = null; this._cc = new Map();
    new ResizeObserver(() => this.render()).observe(this.el);
    const pick = e => { if (!this.b) return; const r = this.cv.getBoundingClientRect(); this.onpick(this.ix(e.clientX - r.left), this.iy(e.clientY - r.top)); };
    this.cv.addEventListener('pointerdown', e => {
      if (this.three) { if (e.pointerType !== 'touch') { this._rot = [e.clientX, e.clientY]; try { this.cv.setPointerCapture(e.pointerId); } catch (_) { } } return; }   // 3-D view: drag rotates (touch keeps scrolling the page)
      if (!this.onpick) return; this._drag = true; try { this.cv.setPointerCapture(e.pointerId); } catch (_) { } pick(e); });
    this.cv.addEventListener('pointermove', e => {
      if (this._rot && this.three) { const dx = e.clientX - this._rot[0], dy = e.clientY - this._rot[1]; this._rot = [e.clientX, e.clientY]; this.rotate(dx * 0.01, dy * 0.008); return; }
      if (this._drag && this.onpick) pick(e);
    });
    const end = () => { this._drag = false; this._rot = null; };
    this.cv.addEventListener('pointerup', end); this.cv.addEventListener('pointercancel', end);
    PLOTS.add(this);
  }
  pickable(fn) { this.onpick = fn; this.el.classList.add('pick'); return this; }
  rotate(daz, del) { const t = this.three; if (!t) return; t.az += daz; t.el = Math.max(0.32, Math.min(1.35, t.el + del)); this.render(); }
  setView(x0, x1, y0, y1) { this.view = [x0, x1, y0, y1]; return this; }
  _tx(x) { return this.o.xlog ? Math.log10(Math.max(x, this.o.floor)) : x; }
  _ty(y) { return this.o.ylog ? Math.log10(Math.max(y, this.o.floor)) : y; }
  X(x) { const b = this.b, p = b.l + (this._tx(x) - b.tx0) / (b.tx1 - b.tx0) * b.w; return Math.max(-2e4, Math.min(2e4, p)); }
  Y(y) { const b = this.b, p = b.t + b.h - (this._ty(y) - b.ty0) / (b.ty1 - b.ty0) * b.h; return Math.max(-2e4, Math.min(2e4, p)); }
  ix(px) { const b = this.b, t = b.tx0 + (px - b.l) / b.w * (b.tx1 - b.tx0); return this.o.xlog ? 10 ** t : t; }
  iy(py) { const b = this.b, t = b.ty0 + (b.t + b.h - py) / b.h * (b.ty1 - b.ty0); return this.o.ylog ? 10 ** t : t; }
  render() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (w < 60 || h < 60) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5), W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; }
    const c = this.c = this.cv.getContext('2d'), o = this.o;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    if (this.three && this.scene) { this.b = null; render3(this, w, h); return; }   // surface view, see plot3d.js
    const b = this.b = { l: o.ml, t: o.mt, w: w - o.ml - o.mr, h: h - o.mt - o.mb };
    let [x0, x1, y0, y1] = this.view;
    if (o.equal) {
      const s = Math.min(b.w / (x1 - x0), b.h / (y1 - y0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = b.w / (2 * s), hy = b.h / (2 * s);
      x0 = cx - hx; x1 = cx + hx; y0 = cy - hy; y1 = cy + hy;
    }
    this.v = [x0, x1, y0, y1];
    b.tx0 = this._tx(x0); b.tx1 = this._tx(x1); b.ty0 = this._ty(y0); b.ty1 = this._ty(y1);
    c.fillStyle = C.paper; c.fillRect(b.l, b.t, b.w, b.h);
    this._ticks();
    c.save(); c.beginPath(); c.rect(b.l, b.t, b.w, b.h); c.clip(); c.lineJoin = 'round'; c.lineCap = 'round';
    if (this.draw) this.draw(this);
    c.restore();
    c.strokeStyle = C.line2; c.lineWidth = 1; c.strokeRect(b.l + .5, b.t + .5, b.w - 1, b.h - 1);
  }
  _ticks() {
    const c = this.c, b = this.b, o = this.o, [x0, x1, y0, y1] = this.v;
    const xt = o.xticks || (o.xlog ? logTicks(x0, x1, b.w / 62) : linTicks(x0, x1, b.w / 68));
    const yt = o.yticks || (o.ylog ? logTicks(y0, y1, b.h / 30) : linTicks(y0, y1, b.h / 46));
    c.lineWidth = 1; c.strokeStyle = C.grid; c.fillStyle = C.ink3;
    const lab = (t, x, y, align) => {
      c.textAlign = align;
      if (t.pow == null) { c.font = `500 12.5px ${FONT_UI}`; c.fillText(t.label, x, y); return; }
      c.font = `500 12.5px ${FONT_UI}`; const w1 = c.measureText('10').width;
      c.font = `500 9.5px ${FONT_UI}`; const e = String(t.pow).replace('-', '−'), w2 = c.measureText(e).width;
      const left = align === 'right' ? x - w1 - w2 : x - (w1 + w2) / 2;
      c.textAlign = 'left'; c.fillText(e, left + w1 + .5, y - 5);
      c.font = `500 12.5px ${FONT_UI}`; c.fillText('10', left, y);
    };
    c.textBaseline = 'top';
    for (const t of xt) { const px = Math.round(this.X(t.v)) + .5; if (px < b.l - 1 || px > b.l + b.w + 1) continue; c.beginPath(); c.moveTo(px, b.t); c.lineTo(px, b.t + b.h); c.stroke(); lab(t, px, b.t + b.h + 7, 'center'); }
    c.textBaseline = 'middle';
    for (const t of yt) { const py = Math.round(this.Y(t.v)) + .5; if (py < b.t - 1 || py > b.t + b.h + 1) continue; c.beginPath(); c.moveTo(b.l, py); c.lineTo(b.l + b.w, py); c.stroke(); lab(t, b.l - 7, py, 'right'); }
  }
  /* --- drawing in data coordinates --- */
  path(pts, o = {}) {
    const c = this.c; c.strokeStyle = o.color || C.ink; c.lineWidth = o.width || 2.2; c.setLineDash(o.dash || []); c.globalAlpha = o.alpha ?? 1;
    c.beginPath(); let pen = false;
    for (const p of pts) {
      const px = this.X(p[0]), py = this.Y(p[1]);
      if (!Number.isFinite(px) || !Number.isFinite(py)) { pen = false; continue; }
      if (pen) c.lineTo(px, py); else { c.moveTo(px, py); pen = true; }
    }
    c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  }
  dots(pts, o = {}) {
    const c = this.c, r = o.r || 3.5; c.globalAlpha = o.alpha ?? 1; c.lineWidth = o.lw || 2;
    for (const p of pts) {
      const px = this.X(p[0]), py = this.Y(p[1]); if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      c.beginPath();
      if (o.shape === 'sq') c.rect(px - r, py - r, 2 * r, 2 * r);
      else if (o.shape === 'x') { c.moveTo(px - r, py - r); c.lineTo(px + r, py + r); c.moveTo(px - r, py + r); c.lineTo(px + r, py - r); }
      else c.arc(px, py, r, 0, 2 * Math.PI);
      if (o.shape !== 'x') { c.fillStyle = o.fill === undefined ? (o.color || C.ink) : o.fill; if (o.fill !== null) c.fill(); }
      if (o.stroke || o.shape === 'x' || o.fill === null) { c.strokeStyle = o.stroke || o.color || C.ink; c.stroke(); }
    }
    c.globalAlpha = 1;
  }
  seg(x0, y0, x1, y1, o = {}) { this.path([[x0, y0], [x1, y1]], o); }
  hline(y, o = {}) { this.seg(this.v[0], y, this.v[1], y, Object.assign({ color: C.ink3, width: 1.2 }, o)); }
  vline(x, o = {}) { this.seg(x, this.v[2], x, this.v[3], Object.assign({ color: C.ink3, width: 1.2 }, o)); }
  fn(f, o = {}) {
    const n = o.n || 240, [x0, x1] = this.v, pts = [];
    for (let i = 0; i <= n; i++) { const x = this.o.xlog ? 10 ** (this.b.tx0 + (this.b.tx1 - this.b.tx0) * i / n) : x0 + (x1 - x0) * i / n; pts.push([x, f(x)]); }
    this.path(pts, o);
  }
  arrow(x0, y0, x1, y1, o = {}) {
    const c = this.c, ax = this.X(x0), ay = this.Y(y0), bx = this.X(x1), by = this.Y(y1), len = Math.hypot(bx - ax, by - ay);
    if (!(len > 1.5)) return;
    const ux = (bx - ax) / len, uy = (by - ay) / len, hs = Math.min(o.head || 10, len * .55), col = o.color || C.ink;
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = o.width || 2.4; c.setLineDash(o.dash || []); c.globalAlpha = o.alpha ?? 1;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx - ux * hs * .8, by - uy * hs * .8); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - ux * hs - uy * hs * .45, by - uy * hs + ux * hs * .45); c.lineTo(bx - ux * hs + uy * hs * .45, by - uy * hs - ux * hs * .45); c.closePath(); c.fill();
    c.globalAlpha = 1;
  }
  /* label made of runs: ['x','m'] italic math, ['2','r'] upright, ['0','sub'] subscript */
  label(x, y, parts, o = {}) {
    const c = this.c, size = o.size || 15; if (typeof parts === 'string') parts = [[parts, o.kind || 'u']];
    const font = k => k === 'm' ? `italic ${size}px KaTeX_Math, "Source Serif 4", serif` : k === 'r' ? `${size}px KaTeX_Main, "Source Serif 4", serif`
      : k === 'sub' ? `${Math.round(size * .72)}px KaTeX_Main, serif` : k === 'b' ? `600 ${size - 1.5}px ${FONT_UI}` : `500 ${size - 1.5}px ${FONT_UI}`;
    let w = 0; for (const [t, k] of parts) { c.font = font(k); w += c.measureText(t).width; }
    let px = this.X(x) + (o.dx || 0), py = this.Y(y) + (o.dy || 0);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    if (o.align === 'center') px -= w / 2; else if (o.align === 'right') px -= w;
    const b = this.b; px = Math.max(b.l + 3, Math.min(b.l + b.w - w - 3, px)); py = Math.max(b.t + size * .6, Math.min(b.t + b.h - 6, py));
    c.textAlign = 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const [t, k] of parts) {
      c.font = font(k); const yy = py + (k === 'sub' ? size * .3 : 0);
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.88)'; c.strokeText(t, px, yy);
      c.fillStyle = o.color || C.ink; c.fillText(t, px, yy); px += c.measureText(t).width;
    }
  }
  contour(key, F, levels, o = {}) {
    const [x0, x1, y0, y1] = this.v, N = o.n || 120, ck = key + '|' + this.v.map(v => v.toFixed(6)).join(',') + '|' + levels.length;
    let segs = this._cc.get(ck);
    if (!segs) {
      const dx = (x1 - x0) / (N - 1), dy = (y1 - y0) / (N - 1), vals = new Float64Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) vals[j * N + i] = F([x0 + i * dx, y0 + j * dy]);
      segs = levels.map(L => marching(vals, N, N, x0, dx, y0, dy, L));
      if (this._cc.size > 8) this._cc.clear();
      this._cc.set(ck, segs);
    }
    const c = this.c; c.strokeStyle = o.color || C.contour; c.lineWidth = o.width || 1.1; c.beginPath();
    for (const s of segs) for (let i = 0; i < s.length; i += 2) { c.moveTo(this.X(s[i][0]), this.Y(s[i][1])); c.lineTo(this.X(s[i + 1][0]), this.Y(s[i + 1][1])); }
    c.stroke();
  }
  star(x, y, o = {}) { // marks a minimum
    const c = this.c, px = this.X(x), py = this.Y(y), r = o.r || 7; c.fillStyle = o.color || C.black; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(px + rr * Math.cos(a), py + rr * Math.sin(a)); }
    c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
  }
}

/* shared pieces for plots of 2-D functions */
function drawField(p, fn) {
  p.contour(fn.id, fn.f, fn.levels);
  if (fn.stat) fn.stat.forEach(s => p.star(s.x[0], s.x[1], { color: s.kind.includes('siod') ? C.ghost : C.black, r: s.kind.includes('glob') ? 7 : 5.5 }));
  else p.star(fn.min[0], fn.min[1]);
}
function drawRun(p, pts, o = {}) {
  p.path(pts, { color: o.color, dash: o.dash, width: o.width || 2.2, alpha: o.alpha });
  if (pts.length <= 140) p.dots(pts, { color: o.color, r: 2.4, alpha: o.alpha });
  if (!o.ghost) { const q = pts[pts.length - 1]; p.dots([q], { color: o.color, r: 5.5, shape: o.shape, stroke: '#fff', lw: 1.5 }); }
}
/* cost history plot: series = [{ys, color, dash}], values floored for the log axis */
function drawCost(p, series, o = {}) {
  const lo = o.lo || 1e-14; let hi = 1, n = 10;
  for (const s of series) { n = Math.max(n, s.ys.length - 1); for (const y of s.ys) if (Number.isFinite(y) && y > hi) hi = y; }
  const kmax = o.kmax || niceStep(n * 1.02 / 5) * 5;
  p.setView(0, Math.max(kmax, n), lo, 10 ** Math.min(300, Math.ceil(Math.log10(hi) + .2)));
  p.draw = q => {
    if (o.level) { q.hline(o.level, { dash: [4, 4] }); }
    for (const s of series) q.path(s.ys.map((y, k) => [k, Math.max(Number.isFinite(y) ? y : 1e300, lo)]), { color: s.color, dash: s.dash, width: s.width || 2.2, alpha: s.alpha });
  };
  p.render();
}
const legend = items => `<div class="legend">${items.map(([kind, col, text]) => `<span><i class="${kind}" style="--c:${col}"></i>${mdi(text)}</span>`).join('')}</div>`;

/* ---------- controls ---------- */
let UID = 0;
function Slider(o) {
  const id = 'f' + (++UID), w = el('div', 'ctl');
  w.innerHTML = `<label for="${id}">${mdi(o.label)}</label><div class="ctl-row"><input id="${id}r" type="range" aria-label="${o.aria || 'suwak'}"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false"></div>${o.hint ? `<small>${mdi(o.hint)}</small>` : ''}`;
  const r = w.querySelector('input[type=range]'), n = w.querySelector('input[type=text]'), log = !!o.log;
  let min = o.min, max = o.max, step = o.step || 0.01, val = o.value;
  const pos = v => (log ? Math.log10(v) : v), unpos = p => (log ? 10 ** p : p);
  const tidy = v => (log ? Number(v.toPrecision(o.sig || 3)) : parseFloat((Math.round(v / step) * step).toPrecision(12)));
  const range = () => { r.min = pos(min); r.max = pos(max); r.step = log ? 'any' : step; };
  const shown = () => String(parseFloat(val.toPrecision(log ? (o.sig || 3) + 1 : 8)));
  const show = () => { r.value = pos(val); n.value = shown(); };
  const api = {
    el: w, oninput: null, get value() { return val; },
    set(v, fire = true) { if (!Number.isFinite(v)) v = val; val = Math.min(max, Math.max(min, v)); show(); if (fire && api.oninput) api.oninput(val); },
    setRange(a, b, st, v) { min = a; max = b; if (st) step = st; range(); api.set(v ?? val, false); },
  };
  r.addEventListener('input', () => { val = Math.min(max, Math.max(min, tidy(unpos(+r.value)))); n.value = shown(); if (api.oninput) api.oninput(val); });
  n.addEventListener('change', () => api.set(parseFloat(n.value.replace(',', '.'))));
  range(); show(); return api;
}
function Chips(o) {
  const w = el('div', 'ctl'), g = el('div', 'chips'); g.setAttribute('role', 'group');
  if (o.label) { w.append(el('span', 'ctl-l', mdi(o.label))); g.setAttribute('aria-label', o.aria || o.label.replace(/[$\\{}]/g, '')); }
  w.append(g); let val = o.value;
  const btns = o.options.map(op => { const b = noTab(el('button', 'chip', mdi(op.label))); b.type = 'button'; b.addEventListener('click', () => api.set(op.v)); g.append(b); return [op.v, b]; });
  const paint = () => btns.forEach(([v, b]) => { b.classList.toggle('on', v === val); b.setAttribute('aria-pressed', String(v === val)); });
  const api = { el: w, onchange: null, get value() { return val; }, set(v, fire = true) { val = v; paint(); if (fire && api.onchange) api.onchange(v); } };
  paint(); return api;
}
function Select(o) {
  const id = 'f' + (++UID), w = el('div', 'ctl');
  w.innerHTML = `<label for="${id}">${mdi(o.label)}</label><select id="${id}">${o.options.map(op => `<option value="${op.v}">${op.label}</option>`).join('')}</select>`;
  const s = w.querySelector('select'); s.value = o.value;
  const api = { el: w, onchange: null, get value() { return s.value; }, set(v, fire = true) { s.value = v; if (fire && api.onchange) api.onchange(v); } };
  s.addEventListener('change', () => api.onchange && api.onchange(s.value));
  return api;
}
function Btn(label, cls, fn) { const b = noTab(el('button', 'btn ' + (cls || ''), label)); b.type = 'button'; b.addEventListener('click', fn); return b; }
function Stats(rows) {
  const dl = el('dl', 'stats'), map = {};
  for (const [id, label, key] of rows) { const d = el('div'); if (key) d.dataset.g = key; d.innerHTML = `<dt>${mdi(label)}</dt><dd>—</dd>`; map[id] = d.lastChild; dl.append(d); }
  return { el: dl, set(vals) { for (const k in vals) { const v = vals[k], dd = map[k]; if (!dd) continue; if (v && typeof v === 'object') { dd.textContent = v.t; dd.className = v.c || ''; } else { dd.textContent = v; dd.className = ''; } } } };
}
function Missions(id, list) {
  const w = el('div', 'missions'), key = 'm:' + id, done = new Set(id ? Store.get(key, []) : []);
  if (id) Store.set('mt:' + id, list.length);
  list.forEach((m, i) => {
    const c = el('article', 'mission' + (done.has(i) ? ' done' : ''));
    c.innerHTML = `<h4><i>Misja ${i + 1}</i><span>${mdi(m.t)}</span><b class="tick" title="Odpowiedź była już otwierana">✓</b></h4><div>${md(m.q)}</div>`;
    if (m.acts) { const row = el('div', 'btns'); m.acts.forEach(([label, fn]) => row.append(Btn(mdi(label), 'sm', fn))); c.append(row); }
    const d = el('details'); d.innerHTML = `<summary>Pokaż odpowiedź</summary><div>${md(m.a)}</div>`; c.append(d);
    d.addEventListener('toggle', () => { if (d.open && id && !done.has(i)) { done.add(i); c.classList.add('done'); Store.set(key, [...done]); } });
    w.append(c);
  });
  return w;
}
function plotCard(title, plot, extra = '') {
  const c = el('section', 'card'); c.innerHTML = `<div class="plot-t">${mdi(title)}</div>`; c.append(plot.el); if (extra) c.insertAdjacentHTML('beforeend', extra); return c;
}

/* ---------- animation loop shared by the labs ---------- */
const RUNNERS = new Set();
function Runner(tick, speed, onState) {
  let raf = 0, on = false, last = 0, acc = 0;
  const loop = t => {
    if (!on) return;
    acc += Math.min((t - last) / 1000, .25); last = t;
    const dt = 1 / speed(); let changed = false, guard = 0;
    while (acc >= dt && on && guard++ < 400) { acc -= dt; if (tick() === false) { api.stop(); } changed = true; }
    if (changed && api.onframe) api.onframe();
    if (on) raf = requestAnimationFrame(loop);
  };
  const api = {
    onframe: null, get on() { return on; },
    start() { if (on) return; on = true; acc = 0; last = performance.now(); raf = requestAnimationFrame(loop); onState && onState(true); },
    stop() { if (!on) return; on = false; cancelAnimationFrame(raf); onState && onState(false); },
    toggle() { on ? api.stop() : api.start(); },
  };
  RUNNERS.add(api); return api;
}
const stopAll = () => RUNNERS.forEach(r => r.stop());
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });

/* ---------- the step-by-step player ----------
   cfg: { intro, params:[{id,label,options,value}], algo:{title,lines[]}, logHead:[...],
          visual(card) -> { draw(state, frame) }, build(params) -> frames[] }
   frame: { group, title, html, line, state, log:[cells], quiz:{prompt, answer, tol, reveal} }
   Layout is kept still on purpose: the buttons sit at a fixed place above the content, one step is shown
   at a time in a panel whose height is reserved for the tallest step, and the results table has a fixed number of rows. */
function Walk(cfg) {
  const root = el('div', 'walk'), top = el('div', 'walk-top'), pv = {};
  if (cfg.intro) {   // one line by default, so that the picture and the steps fit on the first screen
    const d = el('details', 'why'), lead = cfg.intro.trim().split(/\n\s*\n/)[0].replace(/^\*\*Po co\?\*\*\s*/, '');
    d.innerHTML = `<summary><b>Po co ten temat?</b><span class="why-lead">${mdi(lead)}</span><i>rozwiń</i></summary><div class="prose">${md(cfg.intro)}</div>`;
    noTab(d.querySelector('summary')); d.open = !!Store.get('why-open', false);
    d.addEventListener('toggle', () => Store.set('why-open', d.open));
    top.append(d);
  }
  if (cfg.params) {
    const bar = el('div', 'parambar');
    cfg.params.forEach(p => { pv[p.id] = p.value; const ch = Chips(p); ch.onchange = v => { pv[p.id] = v; rebuild(); }; bar.append(ch.el); });
    top.append(bar);
  }
  const grid = el('div', 'walk-grid'), left = el('div', 'walk-left'), right = el('div', 'walk-right');
  const visCard = el('section', 'card'), vis = cfg.visual(visCard);
  let logCard = null;
  if (cfg.logHead) logCard = el('section', 'card');
  const algo = el('section', 'card');
  algo.innerHTML = `<h3 class="card-h">${cfg.algo.title}</h3><ol class="algo">${cfg.algo.lines.map(l => { const ind = l.match(/^ */)[0].length / 4; return `<li class="${ind ? 'in' + ind : ''}"><span>${mdi(l.trim())}</span></li>`; }).join('')}</ol>`;
  const nav = el('div', 'wnav');
  const bPrev = Btn('← Wstecz', '', () => go(pos - 1)), bNext = Btn('Dalej →', 'pri', () => go(pos + 1));
  const bEnd = Btn('Do końca etapu', '', () => { let i = pos; while (i + 1 < frames.length && frames[i + 1].group === frames[pos].group) i++; go(i === pos ? pos + 1 : i); });
  const bReset = Btn('Od początku', 'link', () => go(0)), prog = el('span', 'prog'), bar2 = el('div', 'wbar', '<i></i>');
  nav.append(bPrev, bNext, bEnd, bReset, prog, bar2);
  const stage = el('section', 'card stage');
  stage.innerHTML = `<div class="stage-h"><h3 class="grp"></h3><ol class="pills" aria-label="Kroki tego etapu"></ol></div><div class="stage-in"></div><div class="stage-m" aria-hidden="true"></div>`;
  const grp = stage.querySelector('.grp'), pills = stage.querySelector('.pills'), inner = stage.querySelector('.stage-in'), meter = stage.querySelector('.stage-m');
  left.append(visCard, algo);          // picture and algorithm stay in view; the step and the table of results scroll beside them
  right.append(nav, stage); if (logCard) right.append(logCard);
  grid.append(left, right); root.append(top, grid);

  let frames = [], pos = 0, logRows = 0, measuredW = 0;
  const QUIZ = id => `<form class="quiz"><label for="${id}">…</label><input id="${id}" type="text"><button class="btn sm pri" type="button">Sprawdź</button><span class="fb">&nbsp;</span></form>`;
  const block = (f, n, body) => `<h4 class="stage-t"><span class="step-n">${n}</span><span>${mdi(f.title)}</span></h4><div class="step-b">${body}</div>`;
  /* reserve room for the tallest step, so that nothing below or around the panel moves while stepping */
  function measure() {
    const w = inner.clientWidth; if (w < 50) return;
    measuredW = w; let hmax = 0;
    for (const f of frames) {
      const variants = f.quiz ? [f.html + QUIZ('m'), f.html + f.quiz.reveal + '<p class="fb ok">Zgadza się.</p>'] : [f.html];
      for (const v of variants) { meter.innerHTML = block(f, 1, v); hmax = Math.max(hmax, meter.offsetHeight); }
    }
    meter.innerHTML = ''; inner.style.minHeight = Math.ceil(hmax) + 1 + 'px';   // offsetHeight is rounded: one spare pixel keeps the cards below still
  }
  new ResizeObserver(() => { if (Math.abs(inner.clientWidth - measuredW) > 1) measure(); }).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measure());   // text reflows once the web fonts arrive

  function show() {
    const f = frames[pos]; let g0 = pos, g1 = pos;
    while (g0 > 0 && frames[g0 - 1].group === f.group) g0--;
    while (g1 + 1 < frames.length && frames[g1 + 1].group === f.group) g1++;
    grp.innerHTML = mdi(f.group);
    pills.innerHTML = '';
    for (let i = g0; i <= g1; i++) {
      const b = el('button', 'pill' + (i === pos ? ' on' : i < pos ? ' done' : ''), String(i - g0 + 1)); b.type = 'button';
      b.title = frames[i].title.replace(/[$\\{}]/g, ''); if (i === pos) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', () => go(i)); const li = el('li'); li.append(b); pills.append(li);
    }
    inner.innerHTML = block(f, pos - g0 + 1, f.html + (f.quiz && f._done ? f.quiz.reveal : ''));
    const body = inner.querySelector('.step-b');
    if (f.quiz && !f._done) {
      const q = el('form', 'quiz'), id = 'f' + (++UID);
      q.innerHTML = `<label for="${id}">${mdi(f.quiz.prompt)}</label><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false"><button class="btn sm pri" type="submit">Sprawdź</button><button class="btn sm link" type="button">Pokaż wynik</button><span class="fb" role="status">&nbsp;</span>`;
      const inp = q.querySelector('input'), fb = q.querySelector('.fb');
      q.addEventListener('submit', e => {
        e.preventDefault(); const v = parseFloat(String(inp.value).replace(',', '.'));
        if (!Number.isFinite(v)) { fb.textContent = 'Wpisz liczbę.'; fb.className = 'fb no'; return; }
        if (Math.abs(v - f.quiz.answer) <= (f.quiz.tol || 5e-3) * Math.max(1, Math.abs(f.quiz.answer))) { f._done = true; f._ok = true; show(); }
        else { fb.textContent = f.quiz.hint || 'To jeszcze nie ten wynik. Sprawdź znaki i kolejność działań.'; fb.className = 'fb no'; }
      });
      q.querySelector('button[type=button]').addEventListener('click', () => { f._done = true; show(); });
      body.append(q);
    } else if (f.quiz && f._ok) body.insertAdjacentHTML('beforeend', '<p class="fb ok">Zgadza się.</p>');
    const lines = [].concat(f.line ?? []);
    algo.querySelectorAll('li').forEach((li, i) => li.classList.toggle('on', lines.includes(i)));
    vis.draw(f.state, f);
    if (logCard) {
      const rows = frames.slice(0, pos + 1).filter(x => x.log).map(x => x.log), shown = rows.slice(-logRows), nc = cfg.logHead.length;
      const blank = `<tr class="blank">${'<td>&nbsp;</td>'.repeat(nc)}</tr>`;
      logCard.innerHTML = `<h3 class="card-h">${cfg.logTitle || 'Zapisane wyniki'}</h3><div class="tblw"><table class="tbl"><thead><tr>${cfg.logHead.map(h => `<th>${mdi(h)}</th>`).join('')}</tr></thead><tbody>` +
        shown.map((r, i) => `<tr class="${i === shown.length - 1 ? 'hl' : ''}">${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('') + blank.repeat(logRows - shown.length) + '</tbody></table></div>';
    }
    bPrev.disabled = pos === 0; bNext.disabled = pos === frames.length - 1; bEnd.disabled = pos === frames.length - 1;
    prog.textContent = `krok ${pos + 1} z ${frames.length}`;
    bar2.firstChild.style.width = (100 * (pos + 1) / frames.length).toFixed(1) + '%';
    if (inner.offsetHeight > parseFloat(inner.style.minHeight || 0) + 1) inner.style.minHeight = inner.offsetHeight + 'px';   // never shrink back
  }
  const pkey = 'w:' + (cfg.id || '?'), defaults = JSON.stringify(pv);
  function remember() {
    if (!cfg.id) return;
    const s = Store.get(pkey, {}), std = JSON.stringify(pv) === defaults;
    Store.set(pkey, { n: frames.length, max: Math.max(s.max || 0, pos), pos: std ? pos : (s.pos || 0), done: !!s.done || pos === frames.length - 1 });
  }
  function go(i) { pos = Math.max(0, Math.min(frames.length - 1, i)); show(); remember(); }
  function rebuild(first) {
    frames = cfg.build(pv); logRows = Math.min(8, frames.filter(x => x.log).length); pos = 0;
    if (first && cfg.id) { const s = Store.get(pkey, null); if (s && s.n === frames.length && s.pos > 0 && s.pos < frames.length - 1) pos = s.pos; }   // resume where the student stopped (a finished walkthrough starts again from the top)
    measure(); show();
  }
  root._live = () => (cfg.live ? cfg.live(pv, frames[pos]) : null);
  root.tabIndex = -1;
  root.addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { go(pos + 1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { go(pos - 1); e.preventDefault(); }
  });
  rebuild(true);
  return { el: root };
}

/* topic registry, filled by the t*.js files */
const TOPICS = [];
