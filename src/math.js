"use strict";
/* =====================================================================
   Numerics (no DOM). Everything the pages compute lives here.
   ===================================================================== */
const R = String.raw;

const M = (() => {
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const scale = (a, s) => a.map(v => v * s);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const norm = a => Math.hypot(...a);
  const finite = a => a.every(Number.isFinite);

  /* Gaussian elimination with partial pivoting; null when (numerically) singular. */
  function solve(A, b) {
    const n = b.length, W = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(W[r][c]) > Math.abs(W[p][c])) p = r;
      if (!(Math.abs(W[p][c]) > 1e-300)) return null;
      [W[c], W[p]] = [W[p], W[c]];
      for (let r = c + 1; r < n; r++) {
        const f = W[r][c] / W[c][c];
        for (let k = c; k <= n; k++) W[r][k] -= f * W[c][k];
      }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = W[i][n];
      for (let k = i + 1; k < n; k++) s -= W[i][k] * x[k];
      x[i] = s / W[i][i];
    }
    return finite(x) ? x : null;
  }
  const JtJ = J => {
    const n = J[0].length, A = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const row of J) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] += row[i] * row[j];
    return A;
  };
  const Jtr = (J, r) => {
    const g = new Array(J[0].length).fill(0);
    J.forEach((row, k) => row.forEach((v, i) => { g[i] += v * r[k]; }));
    return g;
  };
  const half = r => 0.5 * r.reduce((s, v) => s + v * v, 0);
  /* eigenvalues of a symmetric 2x2 matrix, ascending */
  function eig2(A) {
    const t = A[0][0] + A[1][1], d = Math.hypot((A[0][0] - A[1][1]) / 2, A[0][1]);
    return [t / 2 - d, t / 2 + d];
  }

  /* ---------- finite-difference gradients (Zadanie 1) ---------- */
  function numgrad(f, x, h, kind = 'central') {
    const g = new Array(x.length).fill(0), f0 = kind === 'forward' ? f(x) : 0;
    for (let i = 0; i < x.length; i++) {
      const xp = [...x]; xp[i] += h;
      if (kind === 'forward') { g[i] = (f(xp) - f0) / h; continue; }
      const xm = [...x]; xm[i] -= h;
      g[i] = (f(xp) - f(xm)) / (2 * h);
    }
    return g;
  }

  /* ---------- test functions R^2 -> R ---------- */
  const F = {
    bowl: {
      id: 'bowl', label: 'Funkcja kwadratowa („miska”), κ = 5',
      tex: R`f(\mathbf{x})=\tfrac12\big[(x_0-2)^2+5\,(x_1+1)^2\big]`,
      f: x => 0.5 * ((x[0] - 2) ** 2 + 5 * (x[1] + 1) ** 2),
      g: x => [x[0] - 2, 5 * (x[1] + 1)],
      H: () => [[1, 0], [0, 5]],
      min: [2, -1], fmin: 0, eig: [1, 5], view: [-5, 5, -5, 5], start: [-3, 4],
    },
    valley: {
      id: 'valley', label: 'Funkcja o wąskiej dolinie, κ = 100',
      tex: R`f(\mathbf{x})=\tfrac12\big(x_0^2+100\,x_1^2\big)`,
      f: x => 0.5 * (x[0] ** 2 + 100 * x[1] ** 2),
      g: x => [x[0], 100 * x[1]],
      H: () => [[1, 0], [0, 100]],
      min: [0, 0], fmin: 0, eig: [1, 100], view: [-6, 6, -6, 6], start: [5, 5],
    },
    cosh: {
      id: 'cosh', label: 'Funkcja cosh („miska” niekwadratowa)',
      tex: R`f(\mathbf{x})=\cosh(x_0-1)+\cosh(x_1+2)`,
      f: x => Math.cosh(x[0] - 1) + Math.cosh(x[1] + 2),
      g: x => [Math.sinh(x[0] - 1), Math.sinh(x[1] + 2)],
      H: x => [[Math.cosh(x[0] - 1), 0], [0, Math.cosh(x[1] + 2)]],
      min: [1, -2], fmin: 2, eig: null, view: [-4, 6, -7, 3.5], start: [4, 3],
    },
    twin: {
      id: 'twin', label: 'Funkcja niewypukła z dwiema dolinami',
      tex: R`f(\mathbf{x})=x_0^4-3x_0^2+0.4\,x_0+2.2+x_1^2`,
      f: x => x[0] ** 4 - 3 * x[0] ** 2 + 0.4 * x[0] + 2.2 + x[1] ** 2,
      g: x => [4 * x[0] ** 3 - 6 * x[0] + 0.4, 2 * x[1]],
      H: x => [[12 * x[0] ** 2 - 6, 0], [0, 2]],
      min: null, fmin: null, eig: null, view: [-2.4, 2.4, -2.4, 2.4], start: [0.35, 1.9],
    },
  };
  { // stationary points of the two-valley polynomial: roots of 4x^3 - 6x + 0.4
    const root = x => { for (let i = 0; i < 60; i++) x -= (4 * x ** 3 - 6 * x + 0.4) / (12 * x * x - 6); return x; };
    const a = root(-1.3), b = root(0.05), c = root(1.2);
    F.twin.min = [a, 0]; F.twin.fmin = F.twin.f([a, 0]);
    F.twin.stat = [{ x: [a, 0], kind: 'minimum globalne' }, { x: [b, 0], kind: 'punkt siodłowy' }, { x: [c, 0], kind: 'minimum lokalne' }];
  }
  /* contour levels: denser near the minimum */
  for (const fn of Object.values(F)) {
    const [x0, x1, y0, y1] = fn.view;
    const top = Math.max(fn.f([x0, y0]), fn.f([x1, y0]), fn.f([x0, y1]), fn.f([x1, y1]));
    fn.levels = Array.from({ length: 12 }, (_, j) => fn.fmin + (top - fn.fmin) * ((j + 1) / 13) ** 2.3);
  }

  /* ---------- iterations ---------- */
  const gdStep = (fn, x, a) => sub(x, scale(fn.g(x), a));
  /* heavy-ball in the torch.optim.SGD convention: v <- beta v + g ; x <- x - alpha v */
  function hbStep(fn, x, v, a, b) {
    const g = fn.g(x), nv = add(scale(v, b), g);
    return { x: sub(x, scale(nv, a)), v: nv, g };
  }
  function newtonStep(fn, x) {
    const g = fn.g(x), p = solve(fn.H(x), scale(g, -1));
    return p ? { x: add(x, p), p, g } : null;
  }
  /* backtracking line search along p = -grad with the Armijo condition */
  function armijo(fn, x, c1, rho, a0 = 1, maxTrials = 80) {
    const g = fn.g(x), p = scale(g, -1), f0 = fn.f(x), slope = dot(g, p);
    const trials = []; let a = a0;
    for (let i = 0; i < maxTrials; i++) {
      const phi = fn.f(add(x, scale(p, a))), bound = f0 + c1 * a * slope, ok = phi <= bound;
      trials.push({ a, phi, bound, ok });
      if (ok) break;
      a *= rho;
    }
    return { g, p, f0, slope, trials, a, x: add(x, scale(p, a)) };
  }

  /* ---------- 1-D root finding ---------- */
  const G = {
    sqrt2: { id: 'sqrt2', label: 'x² − 2 (pierwiastek √2)', tex: R`g(x)=x^2-2`, g: x => x * x - 2, d: x => 2 * x, root: Math.SQRT2, view: [-0.5, 3.4, -3, 8], x0: 1 },
    cosx: { id: 'cosx', label: 'cos x − x', tex: R`g(x)=\cos x-x`, g: x => Math.cos(x) - x, d: x => -Math.sin(x) - 1, root: 0.7390851332151607, view: [-2.2, 3.2, -3.5, 2.5], x0: 2.6 },
    cubic: { id: 'cubic', label: 'x³ − 2x + 2 (pułapka: cykl)', tex: R`g(x)=x^3-2x+2`, g: x => x ** 3 - 2 * x + 2, d: x => 3 * x * x - 2, root: -1.7692923542386314, view: [-2.6, 2.2, -4, 7], x0: 0 },
    atan: { id: 'atan', label: 'arctg x (pułapka: rozbieżność)', tex: R`g(x)=\operatorname{arctg}x`, g: x => Math.atan(x), d: x => 1 / (1 + x * x), root: 0, view: [-9, 9, -2, 2], x0: 1.5 },
  };
  const newton1 = (fn, x) => x - fn.g(x) / fn.d(x);

  /* ---------- Michaelis–Menten (Zadanie 4); v = notebook data (numpy default_rng(2026), sigma = 4) ---------- */
  const MM_S = [0.02, 0.06, 0.11, 0.22, 0.56, 1.10, 0.02, 0.06, 0.11, 0.22, 0.56, 1.10];
  const MM_V = [47.303701, 103.54293, 126.437683, 169.808439, 192.809589, 199.175453,
    49.228393, 103.795987, 132.952347, 163.321717, 193.136682, 202.402463];
  const MM_TRUE = [212.0, 0.064];
  function mm(s = MM_S, v = MM_V) {
    const model = (th, x) => th[0] * x / (th[1] + x);
    const res = th => s.map((x, i) => model(th, x) - v[i]);
    const jac = th => s.map(x => [x / (th[1] + x), -th[0] * x / (th[1] + x) ** 2]);
    return { s, v, model, res, jac, cost: th => half(res(th)) };
  }
  /* one (damped) Gauss–Newton step; lam > 0 gives Levenberg–Marquardt with Marquardt scaling */
  function gnStep(prob, th, lam = 0) {
    const r = prob.res(th), J = prob.jac(th), A = JtJ(J), b = scale(Jtr(J, r), -1);
    const Ad = A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + lam) : v)));
    const p = solve(Ad, b);
    return { r, J, A, b, p, th: p ? add(th, p) : null };
  }
  /* small seeded generator for the "new noisy data" experiment */
  function rng(seed) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return { u, n: () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u()) };
  }

  /* ---------- theophylline (final task): [weight kg, dose mg/kg, [t, conc] ...] ---------- */
  const THEO = {
    1: [79.6, 4.02, [0, .74], [.25, 2.84], [.57, 6.57], [1.12, 10.5], [2.02, 9.66], [3.82, 8.58], [5.1, 8.36], [7.03, 7.47], [9.05, 6.89], [12.12, 5.94], [24.37, 3.28]],
    2: [72.4, 4.40, [0, 0], [.27, 1.72], [.52, 7.91], [1, 8.31], [1.92, 8.33], [3.5, 6.85], [5.02, 6.08], [7.03, 5.4], [9, 4.55], [12, 3.01], [24.3, .9]],
    3: [70.5, 4.53, [0, 0], [.27, 4.4], [.58, 6.9], [1.02, 8.2], [2.02, 7.8], [3.62, 7.5], [5.08, 6.2], [7.07, 5.3], [9, 4.9], [12.15, 3.7], [24.17, 1.05]],
    4: [72.7, 4.40, [0, 0], [.35, 1.89], [.6, 4.6], [1.07, 8.6], [2.13, 8.38], [3.5, 7.54], [5.02, 6.88], [7.02, 5.78], [9.02, 5.33], [11.98, 4.19], [24.65, 1.15]],
    5: [54.6, 5.86, [0, 0], [.3, 2.02], [.52, 5.63], [1, 11.4], [2.02, 9.33], [3.5, 8.74], [5.02, 7.56], [7.02, 7.09], [9.1, 5.9], [12, 4.37], [24.35, 1.57]],
    6: [80.0, 4.00, [0, 0], [.27, 1.29], [.58, 3.08], [1.15, 6.44], [2.03, 6.32], [3.57, 5.53], [5, 4.94], [7, 4.02], [9.22, 3.46], [12.1, 2.78], [23.85, .92]],
    7: [64.6, 4.95, [0, .15], [.25, .85], [.5, 2.35], [1.02, 5.02], [2.02, 6.58], [3.62, 7.09], [5.08, 6.66], [7.07, 5.25], [9, 4.39], [12, 3.53], [24.35, 1.15]],
    8: [70.5, 4.53, [0, 0], [.25, 3.05], [.52, 3.05], [.98, 7.31], [2.02, 7.56], [3.53, 6.59], [5.05, 5.88], [7.15, 4.73], [9.07, 4.57], [12.1, 3], [24.12, 1.25]],
    9: [86.4, 3.10, [0, 0], [.3, 7.37], [.63, 9.03], [1.05, 7.14], [2.02, 6.33], [3.53, 5.66], [5.02, 5.67], [7.17, 4.24], [8.8, 4.11], [11.6, 3.16], [24.43, 1.12]],
    10: [58.2, 5.50, [0, .24], [.37, 2.89], [.77, 5.22], [1.02, 6.41], [2.05, 7.83], [3.55, 10.21], [5.05, 9.18], [7.08, 8.02], [9.38, 7.14], [12.1, 5.68], [23.7, 2.42]],
    11: [65.0, 4.92, [0, 0], [.25, 4.86], [.5, 7.24], [.98, 8], [1.98, 6.81], [3.6, 5.87], [5.02, 5.22], [7.03, 4.45], [9.03, 3.62], [12.12, 2.69], [24.08, .86]],
    12: [60.5, 5.30, [0, 0], [.25, 1.25], [.5, 3.96], [1, 7.82], [2, 9.72], [3.52, 9.75], [5.07, 8.57], [7.07, 6.59], [9.03, 6.11], [12.05, 4.57], [24.15, 1.17]],
  };
  const PK_START = [Math.log(1.0), Math.log(0.1), Math.log(30.0)];
  /* one-compartment oral model in log-parameters theta = (ln ka, ln ke, ln V) */
  function pk(subject) {
    const [wt, dpk, ...rows] = THEO[subject];
    const t = rows.map(r => r[0]), c = rows.map(r => r[1]), D = dpk * wt;
    const model = (th, tt) => {
      const ka = Math.exp(th[0]), ke = Math.exp(th[1]), V = Math.exp(th[2]);
      return D * ka / (V * (ka - ke)) * (Math.exp(-ke * tt) - Math.exp(-ka * tt));
    };
    const res = th => t.map((tt, i) => model(th, tt) - c[i]);
    const jac = th => { // d r_i / d theta_j = (d C / d p_j) * p_j
      const ka = Math.exp(th[0]), ke = Math.exp(th[1]), V = Math.exp(th[2]), dk = ka - ke, A = D * ka / (V * dk);
      return t.map(tt => {
        const ea = Math.exp(-ka * tt), ee = Math.exp(-ke * tt), E = ee - ea;
        return [ka * (-D * ke / (V * dk * dk) * E + A * tt * ea), ke * (D * ka / (V * dk * dk) * E - A * tt * ee), -A * E];
      });
    };
    const cost = th => half(res(th));
    const grad = th => Jtr(jac(th), res(th));
    const hess = th => { // central differences of the analytic gradient, symmetrised
      const n = th.length, h = 1e-5, H = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let j = 0; j < n; j++) {
        const a = [...th], b = [...th]; a[j] += h; b[j] -= h;
        const ga = grad(a), gb = grad(b);
        for (let i = 0; i < n; i++) H[i][j] = (ga[i] - gb[i]) / (2 * h);
      }
      for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) H[i][j] = H[j][i] = (H[i][j] + H[j][i]) / 2;
      return H;
    };
    return { subject, wt, dpk, D, t, c, model, res, jac, cost, grad, hess };
  }
  /* cost histories of the three methods from the final task */
  function pkRuns(prob, th0, o = {}) {
    const { lr = 3e-4, nGD = 3000, nN = 25 } = o;
    const run = (n, stepFn) => {
      let th = [...th0]; const ths = [th], fs = [prob.cost(th)];
      for (let k = 0; k < n; k++) {
        const nx = stepFn(th);
        if (!nx || !finite(nx) || !Number.isFinite(prob.cost(nx))) break;
        th = nx; ths.push(th); fs.push(prob.cost(th));
      }
      return { ths, fs, th };
    };
    return {
      gd: run(nGD, th => sub(th, scale(prob.grad(th), lr))),
      newton: run(nN, th => { const p = solve(prob.hess(th), scale(prob.grad(th), -1)); return p && add(th, p); }),
      gn: run(nN, th => gnStep(prob, th).th),
    };
  }

  return { add, sub, scale, dot, norm, finite, solve, JtJ, Jtr, half, eig2, numgrad, F, G, gdStep, hbStep, newtonStep,
    armijo, newton1, MM_S, MM_V, MM_TRUE, mm, gnStep, rng, THEO, PK_START, pk, pkRuns };
})();
