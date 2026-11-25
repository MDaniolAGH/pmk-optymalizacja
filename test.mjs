import { readFileSync } from 'node:fs';
const M = new Function(readFileSync(new URL('./src/math.js', import.meta.url), 'utf8') + '; return M;')();
const close = (a, b, tol, msg) => { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg}: ${a} vs ${b}`); };
// GD on bowl
let x = [-3, 4]; x = M.gdStep(M.F.bowl, x, 0.1); close(x[0], -2.5, 1e-12, 'gd x0'); close(x[1], 1.5, 1e-12, 'gd x1');
// momentum walkthrough numbers
let s = { x: [-3, 4], v: [0, 0] };
s = M.hbStep(M.F.bowl, s.x, s.v, 0.1, 0.5); s = M.hbStep(M.F.bowl, s.x, s.v, 0.1, 0.5);
close(s.x[0], -1.8, 1e-12, 'hb'); close(s.x[1], -1.0, 1e-12, 'hb');
// Zadanie 2: steps to cost < 1e-6
const stepsTo = (fn, a, b) => { let x = [5, 5], v = [0, 0]; for (let k = 0; k <= 5000; k++) { if (fn.f(x) < 1e-6) return k; ({ x, v } = M.hbStep(fn, x, v, a, b)); } return -1; };
console.log('valley steps: momentum', stepsTo(M.F.valley, 0.0198, 0.669), 'GD', stepsTo(M.F.valley, 0.0198, 0));
console.log('valley optimal HB (a=4/121,b=(9/11)^2):', stepsTo(M.F.valley, 4 / 121, (9 / 11) ** 2), ' b=0.9:', stepsTo(M.F.valley, 0.0198, 0.9), ' b=0.99:', stepsTo(M.F.valley, 0.0198, 0.99));
// bowl steps for several alpha
for (const a of [0.05, 0.1, 0.3, 1 / 3, 0.38, 0.39, 0.4, 0.45]) { let x = [-3, 4], k = 0; while (M.F.bowl.f(x) >= 1e-6 && k < 3000 && M.finite(x) && Math.abs(x[1]) < 1e8) { x = M.gdStep(M.F.bowl, x, a); k++; } console.log('bowl alpha', a.toFixed(3), 'steps', k, 'f', M.F.bowl.f(x).toExponential(2)); }
// armijo intro example
const ar = M.armijo(M.F.valley, [5, 5], 1e-4, 0.5); console.log('armijo alpha', ar.a, 'trials', ar.trials.length, 'f', ar.f0, '->', M.F.valley.f(ar.x));
// newton cosh
{ let x = [4, 3]; const e = []; for (let k = 0; k < 8; k++) { x = M.newtonStep(M.F.cosh, x).x; e.push((M.F.cosh.f(x) - 2).toExponential(2)); } console.log('newton cosh', x, e.join(' ')); }
// twin stationary
console.log('twin', M.F.twin.stat.map(s => s.x[0].toFixed(5) + ' f=' + M.F.twin.f(s.x).toFixed(4)).join(' | '));
// newton 1d
{ let x = 1; const o = []; for (let k = 0; k < 6; k++) { x = M.newton1(M.G.sqrt2, x); o.push(Math.abs(x - Math.SQRT2).toExponential(2)); } console.log('sqrt2 errs', o.join(' ')); }
{ let x = 1.5; const o = []; for (let k = 0; k < 5; k++) { x = M.newton1(M.G.atan, x); o.push(x.toFixed(3)); } console.log('atan from 1.5', o.join(' ')); }
// MM Gauss-Newton
{ const P = M.mm(); let th = [150, 0.1]; const cs = [P.cost(th)]; for (let k = 0; k < 10; k++) { th = M.gnStep(P, th).th; cs.push(P.cost(th)); } console.log('MM', th, cs.map(c => c.toFixed(4)).join(' '));
  close(th[0], 214.686795, 1e-4, 'Vmax'); close(th[1], 0.0671951947, 1e-7, 'Km');
  const st = M.gnStep(P, [150, 0.1]); console.log('JtJ', st.A, 'b', st.b, 'p', st.p, 'cond', (() => { const e = M.eig2(st.A); return e[1] / e[0]; })());
  for (const t0 of [[100, 0.3], [300, 0.4], [50, 0.02], [350, 0.01], [100, 0.6], [250, 1.0], [80, 0.35]]) { let t = t0, ok = true, k = 0; for (; k < 30; k++) { const n = M.gnStep(P, t).th; if (!n || !M.finite(n) || Math.abs(n[0]) > 1e6) { ok = false; break; } t = n; } console.log('  start', t0, ok ? 'ok ' + t.map(v => v.toFixed(4)) : 'FAIL at ' + k, ' LM(1):', (() => { let t = t0; for (let k = 0; k < 60; k++) { const n = M.gnStep(P, t, 1).th; if (!n) return 'fail'; t = n; } return t.map(v => v.toFixed(4)); })()); }
}
// PK: jacobian vs finite differences, three methods
{ const P = M.pk(1); const th = M.PK_START; const J = P.jac(th); const g = M.numgrad(P.cost, th, 1e-6); const ga = P.grad(th); ga.forEach((v, i) => close(v, g[i], 1e-5 * Math.max(1, Math.abs(v)), 'pk grad'));
  const r = M.pkRuns(P, th); const e = r.gn.th.map(Math.exp);
  console.log('PK1 GN', e, 'cost', r.gn.fs.at(-1), 't1/2', Math.log(2) / e[1], 'iters', r.gn.fs.length - 1);
  console.log('   newton cost', r.newton.fs.at(-1), 'gd cost', r.gd.fs.at(-1), 'D', P.D);
  console.log('   GN costs', r.gn.fs.slice(0, 12).map(v => v.toFixed(4)).join(' '));
  console.log('   NT costs', r.newton.fs.slice(0, 26).map(v => v.toFixed(3)).join(' '));
  for (let sbj = 1; sbj <= 12; sbj++) { const P = M.pk(sbj), r = M.pkRuns(P, th, { nGD: 3000 }); const e = r.gn.th.map(Math.exp); console.log('   subj', sbj, 'GN', e.map(v => v.toFixed(4)).join(' '), 'cost', r.gn.fs.at(-1).toFixed(4), 'n', r.gn.fs.length - 1, '| NT', r.newton.fs.at(-1).toFixed(4), 'n', r.newton.fs.length - 1, '| GD', r.gd.fs.at(-1).toFixed(4), 't½', (Math.log(2) / e[1]).toFixed(2)); }
}
console.log('OK');
