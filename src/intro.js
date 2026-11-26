/* =====================================================================
   Introduction: from a real-life question to a cost surface over two parameters.
   Heart-rate recovery after a run: y(t) = y_inf + (y_0 - y_inf) exp(-t / tau), fitted to one sample per second.
   The model is nonlinear in tau, so there is no formula for the best parameters: a case where an
   iterative, gradient-based search is really needed.
   The data are synthetic (seeded generator below), which the page says explicitly.
   ===================================================================== */
function IntroPage() {
  const Y0 = 172, LEVEL = 120, ALPHA = 2, START = [20, 125], VIEW = [10, 160, 80, 135], MAXK = 600, TMAX = 300;
  // ---------- five minutes after the run, one sample per second; slow wander plus sensor noise
  const g = M.rng(20261), T = [], Y = [];
  for (let t = 0, w = 0; t <= TMAX; t++) { w = 0.9 * w + 0.9 * g.n(); T.push(t); Y.push(Math.round(104 + (Y0 - 104) * Math.exp(-t / 70) + w + 1.6 * g.n())); }
  const N = T.length;
  const pred = (p, t) => p[1] + (Y0 - p[1]) * Math.exp(-t / p[0]);
  const cost = p => { let s = 0; for (let i = 0; i < N; i++) { const r = pred(p, T[i]) - Y[i]; s += r * r; } return s / (2 * N); };
  const grad = p => { let a = 0, b = 0; for (let i = 0; i < N; i++) { const e = Math.exp(-T[i] / p[0]), r = p[1] + (Y0 - p[1]) * e - Y[i]; a += r * (Y0 - p[1]) * e * T[i] / (p[0] * p[0]); b += r * (1 - e); } return [a / N, b / N]; };
  // reference minimum (used for the star on the map): a few Gauss-Newton steps from a sensible guess
  let BEST = [60, 100];
  for (let k = 0; k < 40; k++) {
    let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < N; i++) { const e = Math.exp(-T[i] / BEST[0]), r = BEST[1] + (Y0 - BEST[1]) * e - Y[i], j1 = (Y0 - BEST[1]) * e * T[i] / (BEST[0] * BEST[0]), j2 = 1 - e; a11 += j1 * j1; a12 += j1 * j2; a22 += j2 * j2; b1 -= j1 * r; b2 -= j2 * r; }
    const d = M.solve([[a11, a12], [a12, a22]], [b1, b2]); if (!d) break; BEST = [BEST[0] + d[0], BEST[1] + d[1]];
  }
  const FMIN = cost(BEST), top = Math.max(...[[VIEW[0], VIEW[2]], [VIEW[1], VIEW[2]], [VIEW[0], VIEW[3]], [VIEW[1], VIEW[3]]].map(cost));
  const FN = { id: 'hr-recovery', f: cost, view: VIEW, fmin: FMIN, min: BEST, axes: [['τ', ''], ['y', '∞']],
    levels: Array.from({ length: 12 }, (_, j) => FMIN + (top - FMIN) * ((j + 1) / 13) ** 2.3) };
  const drop1 = p => (Y0 - p[1]) * (1 - Math.exp(-60 / p[0]));                                   // predicted fall of the heart rate in the first minute
  const tLevel = p => (p[1] < LEVEL - 0.5 ? -p[0] * Math.log((LEVEL - p[1]) / (Y0 - p[1])) : NaN);   // time needed to fall to LEVEL
  const secs = t => (Number.isFinite(t) && t >= 0 && t < 3600 ? `${Math.floor(t / 60)} min ${String(Math.round(t % 60)).padStart(2, '0')} s` : '—');
  const S = { path: [[...START]], k: 0 }, cur = () => S.path[S.path.length - 1];

  const root = el('div', 'intro');
  // ---------- the story
  const story = el('div', 'intro-top');
  story.innerHTML = `<div class="prose">${md(R`**Sytuacja.** Po zakończeniu biegu tętno nie wraca do normy od razu, tylko stopniowo opada. Szybkość tego powrotu jest prostym wskaźnikiem wytrenowania: im szybciej tętno opada, tym lepiej. Zegarek sportowy zapisuje tętno co sekundę, więc dane mamy za darmo.

**Pytanie.** Jak szybko tętno biegaczki wraca do normy? Odpowiedź ma być liczbą, którą można porównywać z tygodnia na tydzień.

**Model.** Tętno opada szybko na początku i coraz wolniej później. Taki przebieg opisuje zanik wykładniczy o dwóch parametrach:

$$\hat{y}(t)=y_{\infty}+(y_0-y_{\infty})\,e^{-t/\tau}$$

Tętno $y_0=${Y0}$ w chwili zatrzymania znamy z pomiaru. Parametr $y_{\infty}$ to poziom, do którego tętno zmierza, a parametr $\tau$ to stała czasowa: po czasie $\tau$ odległość do tego poziomu maleje do około $37\%$ wartości początkowej.

**Co optymalizujemy.** Szukamy takiej pary $(\tau,\ y_{\infty})$, dla której krzywa leży najbliżej pomiarów. Odległość mierzymy resztami $r_i=\hat{y}(t_i)-y_i$ i zbieramy w jedną liczbę, funkcję kosztu (cost function), czyli połowę średniego kwadratu reszt:

$$f(\tau,\ y_{\infty})=\frac{1}{2n}\sum_{i} r_i^2$$

**Dlaczego potrzebny jest gradient.** Parametr $\tau$ stoi w wykładniku, więc nie istnieje wzór, który od razu podaje najlepsze parametry. Trzeba ich szukać krok po kroku, a kierunek każdego kroku wskazuje gradient.`)}</div>
    <div class="card intro-data"><h3 class="card-h">Dane z zegarka</h3>
      <dl class="kvs"><div class="kv"><dt>Zapis</dt><dd>${TMAX / 60} minut po zatrzymaniu</dd></div><div class="kv"><dt>Częstość</dt><dd>1 pomiar na sekundę</dd></div><div class="kv"><dt>Liczba pomiarów ${K('n')}</dt><dd>${N}</dd></div>
        <div class="kv"><dt>Tętno w chwili zatrzymania ${K('y_0')}</dt><dd>${Y0} ud./min</dd></div><div class="kv"><dt>Tętno po 1 minucie</dt><dd>${Y[60]} ud./min</dd></div><div class="kv"><dt>Tętno po ${TMAX / 60} minutach</dt><dd>${Y[TMAX]} ud./min</dd></div></dl>
      <p class="note">Każdy pomiar jest jednym punktem na wykresie poniżej. Dane są syntetyczne: wygenerowano je na potrzeby tego wprowadzenia tak, aby przypominały zapis z zegarka sportowego (powolne wahania tętna i szum czujnika).</p></div>`;

  // ---------- the experiment
  const lab = el('div', 'lab'), side = el('aside', 'lab-side'), main = el('div', 'lab-main');
  const aS = Slider({ label: R`Stała czasowa $\tau$ [s]`, aria: 'stała czasowa tau', min: VIEW[0], max: VIEW[1], step: 0.5, value: START[0] });
  const bS = Slider({ label: R`Poziom końcowy $y_{\infty}$ [ud./min]`, aria: 'poziom końcowy', min: VIEW[2], max: VIEW[3], step: 0.5, value: START[1] });
  const c1 = el('section', 'card'); c1.innerHTML = '<h3 class="card-h">Parametry modelu</h3>'; c1.append(aS.el, bS.el);
  c1.append(el('small', 'fix3', 'Parametry można też wybrać kliknięciem na mapie kosztu (w widoku poziomic).'));
  const status = el('p', 'status'); status.setAttribute('role', 'status');
  const bStep = Btn('Krok', '', () => { runner.stop(); step(); draw(); }), bRun = Btn('▶ Uruchom', 'pri', () => { if (done()) setP(START[0], START[1]); runner.toggle(); }), bReset = Btn('Od nowa', '', () => setP(START[0], START[1]));
  const c2 = el('section', 'card'); c2.innerHTML = '<h3 class="card-h">Zejście po mapie kosztu</h3>';
  const row = el('div', 'btns'); row.append(bStep, bRun, bReset); c2.append(row);
  c2.append(el('small', 'fix3', mdi(R`Każdy krok przesuwa punkt przeciwnie do gradientu: $(\tau,\ y_{\infty})\leftarrow(\tau,\ y_{\infty})-\alpha\,\nabla f$, ze współczynnikiem uczenia $\alpha=${ALPHA}$.`)));
  side.append(c1, c2);

  const pD = new Plot({ xlabel: R`t\ [\text{s}]`, ylabel: R`y\ [\text{ud./min}]`, aria: 'Pomiary tętna po zakończeniu biegu i dopasowywana krzywa' });
  const pM = new Plot({ xlabel: R`\tau\ [\text{s}]`, ylabel: R`y_{\infty}`, aria: 'Mapa kosztu w funkcji stałej czasowej i poziomu końcowego' });
  const dCard = plotCard(`Dane i model <small>${N} pomiarów, czerwone odcinki to reszty</small>`, pD,
    legend([['dot', C.black, 'pomiary'], ['line', C.green, R`model $\hat{y}(t)$`], ['line', C.red, R`reszty $r_i$`], ['dash', C.ghost, `tętno ${LEVEL}`]]));
  dCard.append(el('p', 'note', `Kółko na linii przerywanej pokazuje chwilę, w której według modelu tętno spada do ${LEVEL} ud./min.`));
  const mCard = plotCard('', pM);
  const view = ViewSwitch(pM, mCard, {
    t2: 'Mapa kosztu <small>kliknij, aby wybrać parametry</small>', t3: 'Powierzchnia kosztu <small>obróć myszą lub strzałkami</small>',
    n2: 'Każdy punkt mapy to jedna para parametrów, czyli jedna krzywa. Poziomice łączą pary o tym samym koszcie.',
    n3: 'Wysokość to koszt w skali spłaszczonej (logarytmicznej), aby dno doliny pozostało czytelne. Parametry wybiera się w widoku poziomic.', redraw: () => draw() });
  mCard.insertAdjacentHTML('beforeend', legend([['line', C.green, 'kolejne kroki'], ['star', C.black, 'najmniejszy koszt']])); mCard.append(view.note);
  const plots = el('div', 'plots'); plots.append(dCard, mCard);
  const stats = Stats([['f', R`Koszt $f(\tau,\ y_{\infty})$`, 'f'], ['rms', 'Typowy błąd modelu', 'rmse'], ['d', 'Spadek tętna w 1. minucie', null], ['t', `Czas spadku do ${LEVEL} ud./min`, null], ['k', 'Wykonane kroki', 'kiter']]);
  main.append(status, plots, stats.el);
  lab.append(side, main);

  const done = () => S.k >= MAXK || (S.k > 0 && Math.hypot(...grad(cur())) < 1e-3);
  const r1 = x => Math.round(x * 10) / 10;          // the controls show rounded values, the path keeps full precision
  function setP(a, b, keep) {                        // a new guess: the path starts again from here
    runner.stop();
    a = Math.max(VIEW[0], Math.min(VIEW[1], a)); b = Math.max(VIEW[2], Math.min(VIEW[3], b));
    S.path = [[a, b]]; S.k = 0; if (!keep) { aS.set(r1(a), false); bS.set(r1(b), false); }
    status.className = 'status'; status.textContent = 'Wybrano parametry. Oceń dopasowanie na wykresie danych, a potem wykonaj krok lub uruchom zejście.';
    draw();
  }
  function step() {
    if (done()) return false;
    const p = cur(), gr = grad(p), q = [Math.max(3, p[0] - ALPHA * gr[0]), p[1] - ALPHA * gr[1]];
    S.path.push(q); S.k++; aS.set(r1(q[0]), false); bS.set(r1(q[1]), false);
    if (done()) { status.textContent = S.k >= MAXK ? `Wykonano ${MAXK} kroków: punkt jest już bardzo blisko dna doliny.` : `Gradient zmalał praktycznie do zera po ${S.k} krokach: to dno doliny, czyli najlepiej dopasowana krzywa.`; return false; }
    status.textContent = 'Punkt schodzi po mapie kosztu, a krzywa zbliża się do pomiarów.';
    return true;
  }
  const DOTS = T.map((t, i) => [t, Y[i]]);
  function draw() {
    const p = cur(), f = cost(p), tl = tLevel(p);
    pD.setView(0, TMAX, 90, 185);
    pD.draw = q => {
      q.hline(LEVEL, { dash: [5, 4], color: C.ghost });
      const c = q.c; c.strokeStyle = C.red; c.globalAlpha = 0.3; c.lineWidth = 1; c.beginPath();   // all residuals in one path
      for (let i = 0; i < N; i++) { c.moveTo(q.X(T[i]), q.Y(Y[i])); c.lineTo(q.X(T[i]), q.Y(pred(p, T[i]))); }
      c.stroke(); c.globalAlpha = 1;
      q.dots(DOTS, { color: C.black, r: 2, alpha: 0.6 });
      q.fn(t => pred(p, t), { color: C.green, width: 2.8, n: 200 });
      if (Number.isFinite(tl) && tl <= TMAX) { q.seg(tl, 90, tl, LEVEL, { dash: [5, 4], color: C.ghost, width: 1.2 }); q.dots([[tl, LEVEL]], { fill: '#fff', stroke: C.green, color: C.green, r: 5, lw: 2.2 }); }
    };
    pD.render();
    pM.setView(...VIEW);
    pM.draw = q => {
      q.contour(FN.id, cost, FN.levels); q.star(BEST[0], BEST[1]);
      drawRun(q, S.path, { color: C.green });
      q.dots([S.path[0]], { fill: '#fff', stroke: C.black, color: C.black, r: 4.5 });
    };
    pM.scene = { fn: FN, x0: S.path[0], runs: [{ pts: S.path, color: C.green }] };
    pM.render();
    stats.set({ f: num(f, 5), rms: num(Math.sqrt(2 * f), 3) + ' ud./min', d: num(drop1(p), 3) + ' ud./min', t: secs(tl), k: String(S.k) });
    bStep.disabled = done();
  }
  const runner = Runner(step, () => 25, on => { bRun.textContent = on ? '❚❚ Pauza' : '▶ Uruchom'; });
  runner.onframe = draw;
  aS.oninput = bS.oninput = () => setP(aS.value, bS.value, true);
  pM.pickable((x, y) => setP(r1(x), r1(y)));
  root._live = () => { const p = cur(), f = cost(p); return {
    tau: `$\\tau=${tn(p[0], 4)}$ s`, yinf: `$y_{\\infty}=${tn(p[1], 5)}$ ud./min`, y0: `$y_0=${Y0}$ ud./min`, f: `$f(\\tau,\\ y_{\\infty})=${tn(f, 5)}$`, alpha: `$\\alpha=${ALPHA}$`, nmeas: `$n=${N}$`,
    kiter: `$k=${S.k}$`, rmse: `$\\sqrt{2f}=${tn(Math.sqrt(2 * f), 3)}$ ud./min`, yhat: `po 60 s: $\\hat{y}=${tn(pred(p, 60), 4)}$ ud./min`, grad: `$${tv(grad(p), 4)}$` }; };

  // ---------- guided steps
  const missions = Missions('wstep', [
    { t: 'Zgadnij krzywą', q: R`Ustaw suwakami $\tau$ i $y_{\infty}$ tak, aby krzywa przechodziła przez środek chmury pomiarów. **Zastanów się:** który parametr zmienia początek krzywej, a który jej koniec? Po czym poznajesz, że jedna krzywa jest lepsza od drugiej?`,
      acts: [['Powrót zbyt szybki', () => setP(15, 105)], ['Powrót zbyt wolny', () => setP(150, 105)], ['Zły poziom końcowy', () => setP(64, 125)]],
      a: R`Stała czasowa $\tau$ decyduje o tym, jak stromo krzywa opada na początku, a $y_{\infty}$ o poziomie, na którym się wypłaszcza. Jakość dopasowania widać po długości czerwonych odcinków, czyli reszt $r_i$. Funkcja kosztu zbiera je w jedną liczbę: im mniejsza, tym lepiej. Reszty podnosimy do kwadratu, aby dodatnie i ujemne się nie znosiły, a duże błędy liczyły się bardziej niż małe.` },
    { t: 'Jeden punkt mapy to jedna krzywa', q: R`Kliknij w kilku miejscach mapy kosztu i obserwuj wykres danych. Potem przełącz mapę na widok „Powierzchnia 3D”. **Zastanów się:** co oznacza położenie punktu na mapie, a co jego wysokość?`,
      acts: [['Poziomice', () => view.set(false)], ['Powierzchnia 3D', () => view.set(true)]],
      a: R`Położenie to para parametrów $(\tau,\ y_{\infty})$, a więc jedna konkretna krzywa. Wysokość to koszt tej krzywej. Powierzchnia nie jest wykresem tętna: to błąd modelu przedstawiony jako funkcja jego parametrów. Dno doliny odpowiada najlepiej dopasowanej krzywej. Dolina jest wydłużona i ukośna, bo oba parametry częściowo się zastępują: nieco dłuższą stałą czasową można skompensować nieco niższym poziomem końcowym.` },
    { t: 'Zejście we mgle', q: R`Wróć do punktu startowego i uruchom zejście. **Zastanów się:** skąd algorytm wie, w którą stronę zmienić parametry, skoro nie „widzi” całej mapy? Dlaczego najpierw porusza się szybko, a potem bardzo powoli?`,
      acts: [['Punkt startowy i start', () => { setP(START[0], START[1]); runner.start(); }]],
      a: R`Zna tylko nachylenie mapy w bieżącym punkcie, czyli gradient $\nabla f$. Przesuwa punkt w kierunku przeciwnym do gradientu, o długość wyznaczoną przez współczynnik uczenia $\alpha$. Przypomina to schodzenie z góry we mgle: czujesz jedynie spadek terenu pod stopami. Na początku zbocze jest strome, więc kroki są długie: punkt szybko schodzi w dolinę, przeskakując przy tym z jednego jej zbocza na drugie (zygzak). Wzdłuż doliny nachylenie jest niewielkie, więc dalsza droga do minimum zajmuje większość kroków. Skąd bierze się zygzak i jak skrócić drogę, pokazują kolejne tematy.` },
    { t: 'Odpowiedź dla biegaczki', q: R`Doprowadź zejście do końca i odczytaj wyniki pod wykresami. **Zastanów się:** jak jedną liczbą opisać szybkość powrotu tętna i jak dokładna jest ta odpowiedź?`,
      acts: [['Najlepsze dopasowanie', () => setP(BEST[0], BEST[1])]],
      a: R`Najlepsza krzywa ma stałą czasową $\tau\approx${tn(BEST[0], 2)}$ s i poziom końcowy $y_{\infty}\approx${tn(BEST[1], 3)}$ ud./min. To $\tau$ jest szukaną liczbą: jeśli po kilku tygodniach treningu zmaleje, tętno wraca do normy szybciej. Według modelu w pierwszej minucie tętno spada o około $${tn(drop1(BEST), 2)}$ uderzeń, a poziom ${LEVEL} ud./min osiąga po około ${secs(tLevel(BEST))}. Typowa reszta wynosi około $${tn(Math.sqrt(2 * FMIN), 2)}$ ud./min. Model jest uproszczeniem: prawdziwy powrót tętna nie musi być dokładnie wykładniczy, a wynik zależy od intensywności biegu i warunków pomiaru.` },
  ]);
  const next = el('div', '', box('nb', 'Co dalej', R`W kolejnych tematach schemat jest ten sam, zmieniają się tylko nazwy. Parametry oznaczamy $x_0$ i $x_1$ (razem: punkt $\mathbf{x}$), a koszt $f(\mathbf{x})$. Każdy temat to inny sposób schodzenia po mapie kosztu: skąd wziąć gradient (temat 1), jak długi zrobić krok (tematy 2 i 4), jak przyspieszyć w wąskiej dolinie (temat 3) i jak wykorzystać krzywiznę (tematy 5 i 6). Metody z tematów 5 i 6 rozwiązują takie zadanie w kilku krokach zamiast w kilkuset.`));
  root.append(story, lab, el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), missions, next);
  setP(START[0], START[1]);
  return { el: root };
}
