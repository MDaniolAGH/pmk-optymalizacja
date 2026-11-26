/* =====================================================================
   3-D view of a function of two variables with trajectories on its surface.
   Plain canvas, no library: orthographic projection, cells painted back to front,
   lines and markers painted together with the cells they lie on, so the surface hides what is behind it.
   plot.three = { az, el }   camera angles (radians);   plot.scene = { fn, runs: [{pts, color, shape, ghost}], x0 }
   The height is f - f* on a flattened (logarithmic) scale: w = ln(1 + t/s) / ln(1 + T/s).
   ===================================================================== */
const P3 = { N: 46, HS: 0.78, AZ: 0.62, EL: 0.74, LOW: [196, 224, 208], HIGH: [247, 248, 247] };

function mesh3(plot, fn) {
  if (plot._m3 && plot._m3.id === fn.id) return plot._m3;
  const N = P3.N, [x0, x1, y0, y1] = fn.view, dx = (x1 - x0) / (N - 1), dy = (y1 - y0) / (N - 1), vals = new Float64Array(N * N);
  let top = -Infinity;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = fn.f([x0 + i * dx, y0 + j * dy]); vals[j * N + i] = v; if (v > top) top = v; }
  const T = top - fn.fmin, s = T / 60, den = Math.log(1 + T / s);
  const w = f => { const t = Math.max(0, f - fn.fmin); return Math.min(1.06, Math.log(1 + t / s) / den) * P3.HS; };
  const W = new Float64Array(N * N); for (let k = 0; k < N * N; k++) W[k] = w(vals[k]);
  const levels = fn.levels.map(L => ({ w: w(L), segs: marching(vals, N, N, x0, dx, y0, dy, L) }));
  return (plot._m3 = { id: fn.id, N, x0, x1, y0, y1, dx, dy, W, w, levels });
}

function render3(plot, cw, ch) {
  const c = plot.c, sc = plot.scene, fn = sc.fn, m = mesh3(plot, fn), N = m.N, { az, el } = plot.three;
  const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
  const R2 = Math.SQRT2, padX = 26, padT = 18, padB = 44, HT = P3.HS * 1.06;   // HT: the highest point the surface can reach
  const S = Math.min((cw - 2 * padX) / (2 * R2), (ch - padT - padB) / (2 * R2 * se + HT * ce));
  const cx = cw / 2, cy = padT + (ch - padT - padB) / 2 + S * (HT * ce) / 2;
  const U = x => (x - m.x0) / (m.x1 - m.x0) * 2 - 1, V = y => (y - m.y0) / (m.y1 - m.y0) * 2 - 1;
  const depth = (u, v) => u * sa + v * ca;                       // larger = farther from the viewer
  const PX = (u, v) => cx + S * (u * ca - v * sa), PY = (u, v, w) => cy - S * ((u * sa + v * ca) * se + w * ce);
  c.fillStyle = C.paper; c.fillRect(0, 0, cw, ch);
  c.lineJoin = 'round'; c.lineCap = 'round';

  // projected grid nodes
  const gx = new Float64Array(N * N), gy = new Float64Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const u = i / (N - 1) * 2 - 1, v = j / (N - 1) * 2 - 1, k = j * N + i; gx[k] = PX(u, v); gy[k] = PY(u, v, m.W[k]); }

  // things lying on the surface: contour pieces, trajectory pieces, markers; each knows its depth
  const dec = [], inside = p => p[0] >= m.x0 && p[0] <= m.x1 && p[1] >= m.y0 && p[1] <= m.y1 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  for (const L of m.levels) for (let i = 0; i < L.segs.length; i += 2) {
    const a = L.segs[i], b = L.segs[i + 1], ua = U(a[0]), va = V(a[1]), ub = U(b[0]), vb = V(b[1]);
    dec.push({ d: depth((ua + ub) / 2, (va + vb) / 2), k: 0, x0: PX(ua, va), y0: PY(ua, va, L.w), x1: PX(ub, vb), y1: PY(ub, vb, L.w) });
  }
  const lift = 0.006, at = p => { const u = U(p[0]), v = V(p[1]); return [PX(u, v), PY(u, v, m.w(fn.f(p)) + lift), depth(u, v)]; };
  const xray = [];                                               // the same lines again, faint, so hidden parts stay traceable
  for (const r of sc.runs) {
    const pts = r.pts, line = [];
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k], b = pts[k + 1]; if (!Number.isFinite(a[0] + a[1] + b[0] + b[1])) continue;
      const n = Math.max(1, Math.min(60, Math.ceil(Math.max(Math.abs(U(b[0]) - U(a[0])), Math.abs(V(b[1]) - V(a[1]))) * (N - 1) / 2)));
      let prev = null;
      for (let q = 0; q <= n; q++) {
        const p = [a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n], cur = inside(p) ? at(p) : null;
        if (prev && cur) { dec.push({ d: (prev[2] + cur[2]) / 2, k: 1, x0: prev[0], y0: prev[1], x1: cur[0], y1: cur[1], col: r.color, lw: r.ghost ? 1.8 : 2.4 }); line.push(prev[0], prev[1], cur[0], cur[1]); }
        prev = cur;
      }
    }
    xray.push({ col: r.color, line });
    if (!r.ghost && pts.length <= 140) for (const p of pts) if (inside(p)) { const q = at(p); dec.push({ d: q[2], k: 2, x: q[0], y: q[1], r: 2.3, fill: r.color }); }
    if (!r.ghost) { const p = pts[pts.length - 1]; if (inside(p)) { const q = at(p); dec.push({ d: q[2] - 0.02, k: 2, x: q[0], y: q[1], r: 5.5, fill: r.color, stroke: '#fff', sq: r.shape === 'sq' }); } }
  }
  const stat = fn.stat ? fn.stat.map(s => ({ x: s.x, col: s.kind.includes('siod') ? C.ghost : C.black, r: s.kind.includes('glob') ? 7 : 5.5 })) : [{ x: fn.min, col: C.black, r: 7 }];
  for (const s of stat) if (inside(s.x)) { const q = at(s.x); dec.push({ d: q[2] - 0.02, k: 3, x: q[0], y: q[1], r: s.r, fill: s.col }); }
  if (inside(sc.x0)) { const q = at(sc.x0); dec.push({ d: q[2] - 0.03, k: 2, x: q[0], y: q[1], r: 4.5, fill: '#fff', stroke: C.black }); }
  dec.sort((a, b) => b.d - a.d);

  const star = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); };
  const paint = d => {
    if (d.k === 0) { c.strokeStyle = 'rgba(71,81,75,.42)'; c.lineWidth = 1; c.beginPath(); c.moveTo(d.x0, d.y0); c.lineTo(d.x1, d.y1); c.stroke(); }
    else if (d.k === 1) { c.strokeStyle = d.col; c.lineWidth = d.lw; c.beginPath(); c.moveTo(d.x0, d.y0); c.lineTo(d.x1, d.y1); c.stroke(); }
    else if (d.k === 2) { c.fillStyle = d.fill; c.beginPath(); if (d.sq) c.rect(d.x - d.r, d.y - d.r, 2 * d.r, 2 * d.r); else c.arc(d.x, d.y, d.r, 0, 2 * Math.PI); c.fill(); if (d.stroke) { c.strokeStyle = d.stroke; c.lineWidth = 1.5; c.stroke(); } }
    else star(d.x, d.y, d.r, d.fill);
  };

  // cells, far to near; a decal is painted a little after its own cell so that neighbouring cells do not cut it
  const cells = []; for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) cells.push(j * N + i);
  const cd = k => { const i = k % N, j = (k - i) / N; return depth((i + .5) / (N - 1) * 2 - 1, (j + .5) / (N - 1) * 2 - 1); };
  const cdepth = new Float64Array(N * N); for (const k of cells) cdepth[k] = cd(k);
  cells.sort((a, b) => cdepth[b] - cdepth[a]);
  const lag = 3.2 / (N - 1), h = 2 / (N - 1), lx = -0.45, ly = -0.5, lz = 0.74;
  let di = 0;
  for (const k of cells) {
    while (di < dec.length && dec[di].d > cdepth[k] + lag) paint(dec[di++]);
    const a = k, b = k + 1, d2 = k + N, e = k + N + 1;
    const wm = (m.W[a] + m.W[b] + m.W[d2] + m.W[e]) / 4 / P3.HS, nx = -(m.W[b] - m.W[a] + m.W[e] - m.W[d2]) / (2 * h), ny = -(m.W[d2] - m.W[a] + m.W[e] - m.W[b]) / (2 * h);
    const sh = 0.74 + 0.26 * Math.max(0, (nx * lx + ny * ly + lz) / Math.hypot(nx, ny, 1)), t = Math.min(1, wm);
    const col = `rgb(${P3.LOW.map((lo, q) => Math.round((lo + (P3.HIGH[q] - lo) * t) * sh)).join(',')})`;
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(gx[a], gy[a]); c.lineTo(gx[b], gy[b]); c.lineTo(gx[e], gy[e]); c.lineTo(gx[d2], gy[d2]); c.closePath(); c.fill(); c.stroke();
  }
  while (di < dec.length) paint(dec[di++]);

  // faint copy of every trajectory on top: the part hidden behind a wall can still be followed
  c.globalAlpha = 0.22; c.lineWidth = 1.3;
  for (const r of xray) { c.strokeStyle = r.col; c.beginPath(); for (let i = 0; i < r.line.length; i += 4) { c.moveTo(r.line[i], r.line[i + 1]); c.lineTo(r.line[i + 2], r.line[i + 3]); } c.stroke(); }
  c.globalAlpha = 1;

  // the two walls facing the viewer, with the axes along their lower edges
  const near = [];                                                // [fixed coordinate, value, runs along]
  near.push(ca > 0 ? ['v', -1] : ['v', 1]); near.push(sa > 0 ? ['u', -1] : ['u', 1]);
  near.sort((p, q) => depth(q[0] === 'u' ? q[1] : 0, q[0] === 'v' ? q[1] : 0) - depth(p[0] === 'u' ? p[1] : 0, p[0] === 'v' ? p[1] : 0));
  c.font = `500 12px ${FONT_UI}`; c.textBaseline = 'top';
  for (const [fix, val] of near) {
    const node = q => (fix === 'v' ? (val < 0 ? 0 : N - 1) * N + q : q * N + (val < 0 ? 0 : N - 1)), uv = q => { const t = q / (N - 1) * 2 - 1; return fix === 'v' ? [t, val] : [val, t]; };
    c.beginPath();
    for (let q = 0; q < N; q++) { const k = node(q); if (q) c.lineTo(gx[k], gy[k]); else c.moveTo(gx[k], gy[k]); }
    for (let q = N - 1; q >= 0; q--) { const [u, v] = uv(q); c.lineTo(PX(u, v), PY(u, v, 0)); }
    c.closePath(); c.fillStyle = '#E3E8E5'; c.fill(); c.strokeStyle = C.line2; c.lineWidth = 1; c.stroke();
    const lo = fix === 'v' ? m.x0 : m.y0, hi = fix === 'v' ? m.x1 : m.y1, ticks = linTicks(lo, hi, 5);
    c.fillStyle = C.ink3; c.strokeStyle = C.line2; c.textAlign = 'center';
    for (const t of ticks) {
      const tt = (t.v - lo) / (hi - lo) * 2 - 1, [u, v] = fix === 'v' ? [tt, val] : [val, tt], px = PX(u, v), py = PY(u, v, 0);
      c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + 4); c.stroke(); c.fillText(t.label, px, py + 6);
    }
    // axis name at the end of the edge that is away from the nearest corner
    const ends = [uv(0), uv(N - 1)].sort((p, q) => depth(q[0], q[1]) - depth(p[0], p[1])), far = ends[0];
    const nx2 = PX(far[0], far[1]), ny2 = PY(far[0], far[1], 0) + 22, name = fix === 'v' ? '0' : '1';
    c.fillStyle = C.ink2; c.font = `italic 15px KaTeX_Math, "Source Serif 4", serif`; c.fillText('x', nx2 - 3, ny2);
    c.font = `10.5px KaTeX_Main, serif`; c.fillText(name, nx2 + 5, ny2 + 7); c.font = `500 12px ${FONT_UI}`;
  }
}
