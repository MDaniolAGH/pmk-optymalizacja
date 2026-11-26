/* =====================================================================
   Closing page: the same descent trains machine-learning models.
   Task: tell walking from jogging from one accelerometer feature of a smartwatch (real data, see ml_data.js).
   Model: logistic regression with two parameters, so the cost can still be drawn as a map.
   Shown on the way: the pipeline signal -> magnitude -> windows -> feature, a choice of four features,
   and the gradient estimated from a small random batch (stochastic gradient descent).
   ===================================================================== */
function MlPage() {
  const TR = WISDM.train, TE = WISDM.test, N = TR.length, Y = TR.map(r => r[4]);
  const START = [0, 2], VIEW = [-1, 7, -3.5, 3.5], MAXK = 400;
  const FEATS = [
    { id: 'sd', name: 'odchylenie standardowe', unit: 'g', lo: 0, axis: R`\text{odchylenie standardowe modułu [g]}`, what: 'jak mocno sygnał waha się wokół średniej' },
    { id: 'range', name: 'rozstęp', unit: 'g', lo: 0, axis: R`\text{rozstęp modułu [g]}`, what: 'różnica między największą a najmniejszą wartością w oknie' },
    { id: 'freq', name: 'częstotliwość dominująca', unit: 'Hz', lo: 0, axis: R`\text{częstotliwość dominująca [Hz]}`, what: 'najsilniejszy rytm w sygnale, między 0.5 a 5 Hz' },
    { id: 'mean', name: 'średnia', unit: 'g', lo: 0.9, axis: R`\text{średnia modułu [g]}`, what: 'przeciętna wartość modułu w oknie' },
  ];
  const sig = u => 1 / (1 + Math.exp(-u));
  /* everything that depends on the chosen feature (standardisation uses the training data only) */
  const PREP = {};
  function prepare(k) {
    if (PREP[k]) return PREP[k];
    const mu = TR.reduce((s, r) => s + r[k], 0) / N, sd = Math.sqrt(TR.reduce((s, r) => s + (r[k] - mu) ** 2, 0) / N), Z = TR.map(r => (r[k] - mu) / sd);
    const cost = p => { let s = 0; for (let i = 0; i < N; i++) { const u = p[0] * Z[i] + p[1]; s += Math.log(1 + Math.exp(Y[i] ? -u : u)); } return s / N; };   // mean cross-entropy
    const grad = (p, idx) => { let a = 0, b = 0; const n = idx ? idx.length : N; for (let j = 0; j < n; j++) { const i = idx ? idx[j] : j, e = sig(p[0] * Z[i] + p[1]) - Y[i]; a += e * Z[i]; b += e; } return [a / n, b / n]; };
    const acc = (p, R) => { let ok = 0; for (const r of R) ok += ((p[0] * (r[k] - mu) / sd + p[1]) > 0) === !!r[4]; return ok / R.length; };
    let best = [0, 0];                               // reference minimum: Newton's method on the full training set
    for (let it = 0; it < 80; it++) {
      let h11 = 0, h12 = 0, h22 = 0; for (let i = 0; i < N; i++) { const s = sig(best[0] * Z[i] + best[1]), q = s * (1 - s); h11 += q * Z[i] * Z[i]; h12 += q * Z[i]; h22 += q; }
      const gr = grad(best), d = M.solve([[h11 / N, h12 / N], [h12 / N, h22 / N]], [-gr[0], -gr[1]]); if (!d) break; best = [best[0] + d[0], best[1] + d[1]];
    }
    const fmin = cost(best), top = Math.max(...[[VIEW[0], VIEW[2]], [VIEW[1], VIEW[2]], [VIEW[0], VIEW[3]], [VIEW[1], VIEW[3]]].map(cost));
    const fn = { id: 'walk-jog-' + FEATS[k].id, f: cost, view: VIEW, fmin, min: best, axes: [['w', ''], ['b', '']], levels: Array.from({ length: 12 }, (_, j) => fmin + (top - fmin) * ((j + 1) / 13) ** 2.3) };
    const hi = Math.max(...TR.map(r => r[k])) * 1.04;
    return (PREP[k] = { k, mu, sd, cost, grad, acc, best, fn, hi, thr: p => (p[0] > 0.05 ? mu - sd * p[1] / p[0] : NaN), prob: (p, x) => sig(p[0] * (x - mu) / sd + p[1]) });
  }
  let D = prepare(0);
  const S = { path: [[...START]], k: 0, seen: 0, batch: null, rng: M.rng(11) }, cur = () => S.path[S.path.length - 1];

  const root = el('div', 'intro');
  const story = el('div', 'intro-top');
  story.innerHTML = `<div class="prose">${md(R`**Zadanie.** Zegarek sportowy ma sam rozpoznać, czy jego właściciel idzie, czy biegnie. Nikt nie podaje mu gotowej reguły: ma ją znaleźć w danych. To jest uczenie maszynowe (machine learning).

**Cecha.** Z każdych 5 sekund sygnału akcelerometru obliczamy jedną liczbę, która ma odróżniać marsz od biegu, na przykład miarę intensywności ruchu ręki. Jak powstaje i jakie cechy są do wyboru, pokazuje przykład pod spodem.

**Model.** Regresja logistyczna (logistic regression) zamienia cechę na prawdopodobieństwo biegu:

$$p=\sigma(w\,z+b),\qquad \sigma(u)=\frac{1}{1+e^{-u}}$$

Tutaj $z$ to cecha po standaryzacji (odjęta średnia, wynik podzielony przez odchylenie standardowe), $w$ to waga, a $b$ to wyraz wolny. Są tylko dwa parametry, więc koszt nadal można narysować jako mapę.

**Koszt.** Etykieta $y_i$ wynosi $1$ dla biegu i $0$ dla marszu. Model jest karany tym mocniej, im pewniej się myli. Tę karę mierzy entropia krzyżowa (cross-entropy):

$$f(w,\ b)=-\frac{1}{n}\sum_{i}\Big[y_i\ln p_i+(1-y_i)\ln(1-p_i)\Big]$$

**Co jest tu nowe.** W uczeniu maszynowym danych jest tak dużo, że gradientu nie oblicza się ze wszystkich naraz. W każdym kroku bierze się małą, losową porcję danych (mini-batch) i z niej szacuje kierunek. To stochastyczny spadek gradientu (stochastic gradient descent, SGD).`)}</div>
    <div class="card intro-data"><h3 class="card-h">Dane: prawdziwe pomiary</h3>
      <dl class="kvs"><div class="kv"><dt>Czujnik</dt><dd>akcelerometr zegarka, 20 Hz</dd></div><div class="kv"><dt>Czynności</dt><dd>marsz i trucht</dd></div><div class="kv"><dt>Okno</dt><dd>5 sekund</dd></div>
        <div class="kv"><dt>Dane uczące</dt><dd>${N} okien, ${WISDM.people[0]} osoby</dd></div><div class="kv"><dt>Dane testowe</dt><dd>${TE.length} okien, ${WISDM.people[1]} innych osób</dd></div></dl>
      <p class="note">Źródło: Weiss, G. (2019). <em>WISDM Smartphone and Smartwatch Activity and Biometrics Dataset</em>. UCI Machine Learning Repository. <a href="https://doi.org/10.24432/C5HK59" rel="noopener">https://doi.org/10.24432/C5HK59</a>. Licencja CC BY 4.0. Z surowych zapisów obliczono cechy i wybrano po 9 okien na osobę i czynność.</p></div>`;

  // ---------- where the points come from: signal -> magnitude -> windows -> one number per window
  const DEMO = WISDM.demo, mag = r => Math.hypot(r[1], r[2], r[3]);
  function featOf(w) {                               // the four features of one window; same definitions as in the data file
    const m = w.map(mag), n = m.length, mu = m.reduce((s, v) => s + v, 0) / n, sd = Math.sqrt(m.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
    const t0 = w[0][0], span = w[n - 1][0] - t0 || 1, xs = w.map((r, i) => [(m[i] - mu) * (0.5 - 0.5 * Math.cos(2 * Math.PI * (r[0] - t0) / span)), r[0] - t0]);
    let best = -1, bf = 0;
    for (let q = 0; q <= 90; q++) { const f = 0.5 + 0.05 * q; let re = 0, im = 0; for (const [x, t] of xs) { re += x * Math.cos(2 * Math.PI * f * t); im += x * Math.sin(2 * Math.PI * f * t); } const pw = re * re + im * im; if (pw > best) { best = pw; bf = f; } }
    return { v: [sd, Math.max(...m) - Math.min(...m), bf, mu], mu, sd };
  }
  const winFeats = seg => [0, 1, 2, 3].map(k => featOf(seg.filter(r => r[0] >= 5 * k && r[0] < 5 * k + 5)));
  const allRaw = DEMO.flatMap(d => [...d.walk, ...d.jog]), RLO = Math.floor(Math.min(...allRaw.map(r => Math.min(r[1], r[2], r[3])))), RHI = Math.ceil(Math.max(...allRaw.map(r => Math.max(r[1], r[2], r[3])))), MHI = Math.ceil(Math.max(...allRaw.map(mag)) * 2) / 2;
  const pipe = el('section', 'card pipe');
  pipe.innerHTML = `<h3 class="pipe-h">Skąd się biorą punkty: od sygnału do jednej liczby</h3><div class="pipe-grid"><div class="prose pipe-steps">${md(R`Model nie dostaje surowego sygnału, tylko liczby, które z niego obliczono. Oto cała droga, na prawdziwym zapisie z tego samego zbioru danych.

**1. Sygnał.** Akcelerometr zegarka mierzy przyspieszenie w trzech osiach, 20 razy na sekundę. Górny wykres pokazuje 20 sekund takiego zapisu.

**2. Moduł.** Z trzech osi obliczamy jedną wartość, długość wektora przyspieszenia: $\lVert\mathbf{a}\rVert=\sqrt{a_x^2+a_y^2+a_z^2}$. Nie zależy ona od tego, jak zegarek jest obrócony na nadgarstku. W bezruchu wynosi $1$ g, bo czujnik mierzy też grawitację.

**3. Okna.** Sygnał dzielimy na okna po 5 sekund, czyli po 100 próbek (pionowe linie na dolnym wykresie).

**4. Cecha.** Z każdego okna zostaje jedna liczba, wypisana nad oknem. Do wyboru są cztery: odchylenie standardowe (${FEATS[0].what}), rozstęp (${FEATS[1].what}), częstotliwość dominująca (${FEATS[2].what}) i średnia (${FEATS[3].what}). Wybrana cecha trafia do modelu poniżej.

**5. Etykieta.** Wiadomo, co osoba robiła podczas nagrania, więc każde okno dostaje etykietę $y_i$: $0$ dla marszu, $1$ dla truchtu.

**6. Zbiór danych.** To samo powtarzamy dla wszystkich osób. Każde okno staje się jednym punktem na wykresie „Dane i model”; cztery okna z tego przykładu są tam zaznaczone kwadratami. Na koniec cechę standaryzujemy, a osoby dzielimy na uczące i testowe.`)}</div><div class="pipe-plots"></div></div>`;
  const who = Chips({ label: 'Osoba', aria: 'osoba', value: 0, options: DEMO.map((d, i) => ({ v: i, label: d.name })) });
  const act = Chips({ label: 'Czynność', aria: 'czynność', value: 'walk', options: [{ v: 'walk', label: 'marsz' }, { v: 'jog', label: 'trucht' }] });
  const feat = Chips({ label: 'Cecha dla modelu', aria: 'cecha dla modelu', value: 0, options: FEATS.map((f, i) => ({ v: i, label: f.name })) });
  const pR = new Plot({ ratio: '1 / 0.4', xlabel: R`t\ [\text{s}]`, ylabel: R`\text{przyspieszenie w trzech osiach [g]}`, aria: 'Surowy sygnał akcelerometru w trzech osiach' });
  const pA = new Plot({ ratio: '1 / 0.4', xlabel: R`t\ [\text{s}]`, ylabel: R`\lVert\mathbf{a}\rVert\ \text{[g]}`, aria: 'Moduł przyspieszenia podzielony na okna z wartością wybranej cechy w każdym oknie' });
  const pctl = el('div', 'pipe-ctl'); pctl.append(who.el, act.el, feat.el);
  const pp = pipe.querySelector('.pipe-plots');
  pp.append(pctl, plotCard('Krok 1: surowy sygnał', pR, legend([['line', C.green, 'oś x'], ['line', C.red, 'oś y'], ['line', C.ink3, 'oś z']])),
    plotCard('Kroki 2–4: moduł, okna i cecha', pA, legend([['line', C.black, 'moduł przyspieszenia'], ['dash', C.green, 'średnia w oknie'], ['sq', C.greenT2, 'średnia ± odchylenie standardowe']])));
  pp.querySelectorAll('.card').forEach(c => c.classList.add('flat'));
  const demoSeg = () => DEMO[who.value][act.value], demoPts = () => winFeats(demoSeg()).map(w => [w.v[D.k], act.value === 'jog' ? 0.93 : 0.07]);
  function drawPipe() {
    const seg = demoSeg(), ws = winFeats(seg), F = FEATS[D.k];
    pR.setView(0, 20, RLO, RHI);
    pR.draw = q => { [[1, C.green], [2, C.red], [3, C.ink3]].forEach(([j, col]) => q.path(seg.map(r => [r[0], r[j]]), { color: col, width: 1.3 })); };
    pR.render();
    pA.setView(0, 20, 0, MHI);
    pA.draw = q => {
      const c = q.c;
      ws.forEach((w, k) => {
        c.fillStyle = C.greenT2; c.globalAlpha = 0.75; c.fillRect(q.X(5 * k), q.Y(w.mu + w.sd), q.X(5 * k + 5) - q.X(5 * k), q.Y(w.mu - w.sd) - q.Y(w.mu + w.sd)); c.globalAlpha = 1;
        q.seg(5 * k, w.mu, 5 * k + 5, w.mu, { color: C.green, dash: [5, 4], width: 1.4 });
      });
      q.path(seg.map(r => [r[0], mag(r)]), { color: C.black, width: 1.3 });
      [5, 10, 15].forEach(t => q.vline(t, { color: C.ink2, width: 1.2 }));
      ws.forEach((w, k) => q.label(5 * k + 2.5, MHI, [[num(w.v[D.k], 3) + ' ' + F.unit, 'b']], { align: 'center', dy: 12, size: 15 }));
    };
    pA.render();
  }

  // ---------- the experiment
  const lab = el('div', 'lab'), side = el('aside', 'lab-side'), main = el('div', 'lab-main');
  const wS = Slider({ label: R`Waga $w$`, aria: 'waga w', min: VIEW[0], max: VIEW[1], step: 0.05, value: START[0] });
  const bS = Slider({ label: R`Wyraz wolny $b$`, aria: 'wyraz wolny b', min: VIEW[2], max: VIEW[3], step: 0.05, value: START[1] });
  const c1 = el('section', 'card'); c1.innerHTML = '<h3 class="card-h">Parametry modelu</h3>'; c1.append(wS.el, bS.el);
  c1.append(el('small', 'fix3', 'Parametry można też wybrać kliknięciem na mapie kosztu (w widoku poziomic).'));
  const batch = Chips({ label: 'Porcja danych w jednym kroku', aria: 'rozmiar porcji danych', value: 0, options: [{ v: 0, label: `wszystkie (${N})` }, { v: 64, label: '64' }, { v: 16, label: '16' }, { v: 1, label: '1' }] });
  const aS = Slider({ label: R`Współczynnik uczenia $\alpha$`, aria: 'współczynnik uczenia alfa', min: 0.1, max: 6, step: 0.1, value: 2 });
  const status = el('p', 'status'); status.setAttribute('role', 'status');
  const bStep = Btn('Krok', '', () => { runner.stop(); step(); draw(); }), bRun = Btn('▶ Uruchom', 'pri', () => { if (done()) setP(START[0], START[1]); runner.toggle(); }), bReset = Btn('Od nowa', '', () => setP(START[0], START[1]));
  const c2 = el('section', 'card'); c2.innerHTML = '<h3 class="card-h">Uczenie</h3>'; c2.append(batch.el, aS.el);
  const row = el('div', 'btns'); row.append(bStep, bRun, bReset); c2.append(row);
  c2.append(el('small', 'fix3', mdi(R`Każdy krok: $(w,\ b)\leftarrow(w,\ b)-\alpha\,\nabla f$, przy czym gradient jest obliczany tylko z wybranej porcji danych.`)));
  side.append(c1, c2);

  const pD = new Plot({ xlabel: FEATS[0].axis, ylabel: 'p', aria: 'Okna pomiarowe marszu i biegu oraz krzywa prawdopodobieństwa biegu' });
  const pM = new Plot({ xlabel: 'w', ylabel: 'b', aria: 'Mapa kosztu w funkcji wagi i wyrazu wolnego' });
  const dCard = plotCard(`Dane i model <small>${N} okien uczących</small>`, pD,
    legend([['dot', C.ink3, 'marsz (u dołu)'], ['dot', C.red, 'bieg (u góry)'], ['line', C.green, R`model: prawdopodobieństwo biegu $p$`], ['dash', C.ghost, 'próg decyzji'], ['ring', C.black, 'bieżąca porcja'], ['sq', C.black, 'okna z przykładu powyżej']]));
  dCard.append(el('p', 'note', 'Punkty rozsunięto w pionie, aby się nie zasłaniały. Na prawo od progu model rozpoznaje bieg, na lewo marsz.'));
  const mCard = plotCard('', pM);
  const view = ViewSwitch(pM, mCard, {
    t2: 'Mapa kosztu <small>kliknij, aby wybrać parametry</small>', t3: 'Powierzchnia kosztu <small>obróć myszą lub strzałkami</small>',
    n2: 'Każdy punkt mapy to jedna para parametrów, czyli jedna krzywa modelu. Mapę narysowano dla wszystkich danych uczących.',
    n3: 'Wysokość to koszt w skali spłaszczonej (logarytmicznej), aby dno doliny pozostało czytelne. Parametry wybiera się w widoku poziomic.', redraw: () => draw() });
  mCard.insertAdjacentHTML('beforeend', legend([['line', C.green, 'kolejne kroki'], ['star', C.black, 'najmniejszy koszt']])); mCard.append(view.note);
  const plots = el('div', 'plots'); plots.append(dCard, mCard);
  const stats = Stats([['f', R`Koszt $f(w,\ b)$`, 'f'], ['a1', 'Trafność: dane uczące', 'accur'], ['a2', 'Trafność: nowe osoby', 'accur'], ['t', 'Próg decyzji', null], ['s', 'Przetworzone próbki', null]]);
  main.append(status, plots, stats.el);
  lab.append(side, main);

  // ---------- floating copy of the data plot, to keep an eye on the points while changing the example above
  const fab = el('div', 'fab');
  fab.innerHTML = `<section class="fab-panel" hidden><div class="fab-h"><b>Dane i model</b><button type="button" class="btn sm link">Zamknij</button></div><p class="note fab-n"></p></section><button type="button" class="btn pri fab-btn" aria-expanded="false">Dane i model</button>`;
  const fPanel = fab.querySelector('.fab-panel'), fBtn = fab.querySelector('.fab-btn'), fNote = fab.querySelector('.fab-n');
  const pMini = new Plot({ ratio: '1 / 0.66', ml: 34, mr: 8, mt: 8, mb: 24, aria: 'Pomniejszony wykres danych i modelu' });
  fPanel.insertBefore(pMini.el, fNote);
  const showMini = on => { fPanel.hidden = !on; fBtn.hidden = on; fBtn.setAttribute('aria-expanded', String(on)); Store.set('ml-mini', on); if (on) draw(); };
  fBtn.addEventListener('click', () => showMini(true)); fPanel.querySelector('button').addEventListener('click', () => showMini(false));
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => fab.classList.toggle('away', e.isIntersecting)), { threshold: 0.35 }).observe(dCard);   // not needed while the full plot is on screen

  const B = () => batch.value || N;
  const done = () => S.k >= MAXK || (batch.value === 0 && S.k > 0 && Math.hypot(...D.grad(cur())) < 1e-3);
  const r2 = x => Math.round(x * 100) / 100;
  function setP(w, b, keep) {                        // a new guess: the path starts again from here
    runner.stop();
    w = Math.max(VIEW[0], Math.min(VIEW[1], w)); b = Math.max(VIEW[2], Math.min(VIEW[3], b));
    S.path = [[w, b]]; S.k = 0; S.seen = 0; S.batch = null; S.rng = M.rng(11); if (!keep) { wS.set(r2(w), false); bS.set(r2(b), false); }
    status.className = 'status'; status.textContent = 'Wybrano parametry. Oceń krzywą modelu na wykresie danych, a potem wykonaj krok lub uruchom uczenie.';
    draw();
  }
  function step() {
    if (done()) return false;
    const n = B(), idx = n === N ? null : Array.from({ length: n }, () => Math.floor(S.rng.u() * N));   // a random batch (drawn with replacement)
    const p = cur(), gr = D.grad(p, idx), a = aS.value, q = [p[0] - a * gr[0], p[1] - a * gr[1]];
    S.path.push(q); S.k++; S.seen += n; S.batch = idx; wS.set(r2(q[0]), false); bS.set(r2(q[1]), false);
    if (done()) {
      status.textContent = S.k >= MAXK ? `Wykonano ${MAXK} kroków. Przy małych porcjach punkt nie zatrzymuje się w minimum, tylko krąży w jego pobliżu.` : `Gradient zmalał praktycznie do zera po ${S.k} krokach: to dno doliny.`;
      return false;
    }
    status.textContent = n === N ? 'Gradient ze wszystkich danych: punkt schodzi po mapie gładko.' : `Gradient z ${n === 1 ? 'jednej próbki' : n + ' losowych próbek'}: kierunek jest przybliżony, więc trajektoria jest poszarpana.`;
    return true;
  }
  const jit = i => ((i * 2654435761 >>> 0) % 1000) / 1000;                       // fixed vertical jitter of a point
  const YJ = TR.map((r, i) => (r[4] ? 0.88 + 0.1 * jit(i) : 0.02 + 0.1 * jit(i)));
  function paintData(q, mini) {                      // the same picture for the card and for the floating copy
    const p = cur(), t = D.thr(p), k = D.k, pts = TR.map((r, i) => [r[k], YJ[i]]), rad = mini ? 1.7 : 2.4;
    q.dots(pts.filter((_, i) => !Y[i]), { color: C.ink3, r: rad, alpha: 0.55 }); q.dots(pts.filter((_, i) => Y[i]), { color: C.red, r: rad, alpha: 0.55 });
    if (Number.isFinite(t) && t > FEATS[k].lo && t < D.hi) q.vline(t, { dash: [5, 4], color: C.ghost, width: 1.4 });
    q.fn(x => D.prob(p, x), { color: C.green, width: mini ? 2.2 : 2.8, n: 200 });
    if (!mini && S.batch && S.batch.length <= 64) q.dots(S.batch.map(i => pts[i]), { fill: null, stroke: C.black, color: C.black, r: 5, lw: 1.6 });
    q.dots(demoPts(), { shape: 'sq', fill: '#fff', stroke: C.black, color: C.black, r: mini ? 4 : 4.5, lw: 2 });   // the four windows of the pipeline example
  }
  function draw() {
    const p = cur(), f = D.cost(p), t = D.thr(p), F = FEATS[D.k];
    pD.setView(F.lo, D.hi, -0.04, 1.04); pD.draw = q => paintData(q, false); pD.render();
    if (!fPanel.hidden) { pMini.setView(F.lo, D.hi, -0.04, 1.04); pMini.draw = q => paintData(q, true); pMini.render(); fNote.textContent = `Cecha: ${F.name} [${F.unit}]. Kwadraty: cztery okna z wybranego przykładu (${DEMO[who.value].name.replace(/ \(.*/, '')}, ${act.value === 'jog' ? 'trucht' : 'marsz'}).`; }
    pM.setView(...VIEW);
    pM.draw = q => {
      q.contour(D.fn.id, D.cost, D.fn.levels); q.star(D.best[0], D.best[1]);
      drawRun(q, S.path, { color: C.green });
      q.dots([S.path[0]], { fill: '#fff', stroke: C.black, color: C.black, r: 4.5 });
    };
    pM.scene = { fn: D.fn, x0: S.path[0], runs: [{ pts: S.path, color: C.green }] };
    pM.render();
    stats.set({ f: num(f, 4), a1: (D.acc(p, TR) * 100).toFixed(1) + '%', a2: (D.acc(p, TE) * 100).toFixed(1) + '%', t: Number.isFinite(t) && t > 0 && t < D.hi * 2 ? num(t, 3) + ' ' + F.unit : '—',
      s: `${S.seen} (${num(S.seen / N, 3)} × cały zbiór)` });
    bStep.disabled = done();
  }
  function useFeature(k) {                           // another feature means another data set, another cost map and another best model
    D = prepare(k); feat.set(k, false);
    pD.el.querySelector('.axx').innerHTML = K(FEATS[k].axis);
    drawPipe(); setP(START[0], START[1]);
  }
  const runner = Runner(step, () => 20, on => { bRun.textContent = on ? '❚❚ Pauza' : '▶ Uruchom'; });
  runner.onframe = draw;
  wS.oninput = bS.oninput = () => setP(wS.value, bS.value, true);
  batch.onchange = () => { runner.stop(); S.batch = null; draw(); };
  who.onchange = act.onchange = () => { drawPipe(); draw(); };
  feat.onchange = k => useFeature(k);
  pM.pickable((x, y) => setP(r2(x), r2(y)));
  root._live = () => { const p = cur(), F = FEATS[D.k]; return {
    wgt: `$w=${tn(p[0], 4)}$`, bias: `$b=${tn(p[1], 4)}$`, f: `$f(w,\\ b)=${tn(D.cost(p), 4)}$`, alpha: `$\\alpha=${tn(aS.value, 3)}$`, nsamp: `$n=${N}$ okien uczących`,
    accur: `dane uczące: ${(D.acc(p, TR) * 100).toFixed(1)}%; nowe osoby: ${(D.acc(p, TE) * 100).toFixed(1)}%`, grad: `ze wszystkich danych: $${tv(D.grad(p), 4)}$`,
    zfeat: `wybrana cecha: ${F.name}; średnia ${num(D.mu, 3)} ${F.unit}, odchylenie standardowe ${num(D.sd, 3)} ${F.unit}`, prob: `próg decyzji ($p=0.5$) wypada teraz przy ${num(D.thr(p), 3)} ${F.unit}` }; };

  const set = (b, a) => { batch.set(b, false); aS.set(a, false); setP(START[0], START[1]); runner.start(); };
  const P0 = prepare(0), all = FEATS.map((F, k) => { const d = prepare(k); return `${F.name}: ${(d.acc(d.best, TR) * 100).toFixed(1)}% i ${(d.acc(d.best, TE) * 100).toFixed(1)}%`; });
  const missions = Missions('ml', [
    { t: 'Co robią parametry', q: R`Zmieniaj suwakami wagę $w$ i wyraz wolny $b$. **Zastanów się:** który parametr przesuwa próg decyzji, a który zmienia stromość krzywej? Co oznacza model z $w=0$?`,
      acts: [['$w=0$, $b=2$', () => setP(0, 2)], ['$w=1$, $b=0$', () => setP(1, 0)], ['$w=6$, $b=0$', () => setP(6, 0)]],
      a: R`Waga $w$ decyduje o stromości krzywej: przy dużym $w$ model jest pewny swojej odpowiedzi tuż obok progu, przy małym waha się w szerokim zakresie. Wyraz wolny $b$ przesuwa próg w lewo lub w prawo. Dla $w=0$ model w ogóle nie patrzy na dane: każdemu oknu przypisuje to samo prawdopodobieństwo. Od takiego modelu zaczyna się uczenie.` },
    { t: 'Gradient ze wszystkich danych', q: R`Wybierz cechę „odchylenie standardowe”, porcję „wszystkie” i uruchom uczenie. **Zastanów się:** ile próbek trzeba przetworzyć, aby dojść do minimum?`,
      acts: [['Wszystkie dane, $\\alpha=2$', () => { useFeature(0); set(0, 2); }]],
      a: R`Trajektoria jest gładka, bo każdy krok korzysta z dokładnego gradientu. Ceną jest liczba obliczeń: każdy krok przetwarza wszystkie ${N} okien, więc kilkadziesiąt kroków to kilkadziesiąt przejść przez cały zbiór. Dla zbioru z milionami próbek jeden krok trwałby bardzo długo.` },
    { t: 'Gradient z małej porcji', q: R`Powtórz uczenie z porcjami po $16$ próbek, a potem po jednej próbce. **Zastanów się:** czy poszarpana trajektoria dojdzie w okolice minimum? Ile próbek przetworzy do tego czasu?`,
      acts: [['Porcje po 16', () => set(16, 2)], ['Porcje po 1', () => set(1, 2)], ['Porcje po 1, $\\alpha=0.5$', () => set(1, 0.5)]],
      a: R`Tak. Kierunek wyznaczony z małej porcji jest tylko przybliżeniem prawdziwego gradientu, ale przeciętnie wskazuje w tę samą stronę. Punkt dociera w pobliże minimum po przetworzeniu znacznie mniejszej liczby próbek niż przy pełnym gradiencie, a potem krąży wokół niego, zamiast się zatrzymać. Rozrzut jest tym większy, im mniejsza porcja i im większy współczynnik uczenia. Dlatego w praktyce współczynnik uczenia zmniejsza się w trakcie uczenia.` },
    { t: 'Czy model działa na nowych osobach', q: R`Dla cechy „odchylenie standardowe” porównaj po zakończeniu uczenia trafność na danych uczących i na osobach, których model nigdy nie widział. **Zastanów się:** dlaczego sprawdzamy model na innych osobach, a nie na innych oknach tych samych osób?`,
      acts: [['Najlepsze dopasowanie', () => { useFeature(0); setP(P0.best[0], P0.best[1]); }]],
      a: R`Najlepszy model stawia próg przy $${tn(P0.thr(P0.best), 3)}$ g i poprawnie rozpoznaje ${(P0.acc(P0.best, TR) * 100).toFixed(1)}% okien uczących oraz ${(P0.acc(P0.best, TE) * 100).toFixed(1)}% okien nowych osób. Okna tej samej osoby są do siebie bardzo podobne, więc test na nich zawyżałby ocenę: model mógłby „rozpoznawać osobę”, a nie czynność. Zegarek ma działać u ludzi, od których nie zebrano danych, dlatego liczy się wynik na nowych osobach. Błędy modelu to głównie energiczny marsz i spokojny trucht.` },
    { t: 'Która cecha jest najlepsza', q: R`Przełączaj cechę (nad wykresami sygnału albo przyciskami poniżej) i za każdym razem ucz model od nowa. Obserwuj, jak zmienia się chmura punktów i mapa kosztu. **Zastanów się:** która cecha najlepiej rozdziela marsz i trucht? Dlaczego częstotliwość, choć skuteczna, zachowuje się inaczej niż pozostałe?`,
      acts: FEATS.map((F, k) => [F.name, () => { useFeature(k); set(0, 2); }]),
      a: R`Trafność najlepszego modelu na danych uczących i na nowych osobach: ${all.join('; ')}. Średnia i rozstęp rozdzielają czynności słabiej: ich zakresy dla marszu i truchtu nakładają się szerzej. Częstotliwość dominująca jest dla truchtu bardzo powtarzalna (około 2.5 do 2.9 Hz), a dla marszu przyjmuje różne wartości: raz dominuje rytm kroków (około 1.9 Hz), raz dwukrotnie wolniejszy rytm wymachu ręki, a czasem składowa powyżej 3.5 Hz. Model z jednym progiem nie potrafi opisać reguły „pomiędzy”, więc te ostatnie okna myli. W praktyce łączy się wiele cech naraz: parametrów jest wtedy więcej niż dwa i mapy kosztu nie da się już narysować, ale uczenie przebiega tak samo.` },
  ]);
  const next = el('div', '', box('nb', 'A sieć neuronowa?', R`Schemat jest ten sam: model z parametrami, funkcja kosztu, gradient i kroki w dół. Różni się skala. Sieć neuronowa ma tysiące lub miliony parametrów zamiast dwóch, więc mapy kosztu nie da się narysować, a jej powierzchnia nie jest wypukła. Gradient oblicza automatyczne różniczkowanie, a kroki wykonują odmiany stochastycznego spadku gradientu: z momentem (temat 3) albo z osobnym skalowaniem kroku dla każdego parametru. Zamiast cech obliczonych ręcznie sieć dostaje zwykle surowy sygnał z czujnika i sama uczy się, co w nim jest istotne.`));
  root.append(story, pipe, lab, el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), missions, next, fab);
  setP(START[0], START[1]); drawPipe();
  if (Store.get('ml-mini', false)) showMini(true);
  return { el: root };
}
