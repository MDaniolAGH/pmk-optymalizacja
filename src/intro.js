/* =====================================================================
   Introduction: from a real-life question to a cost surface over two parameters.
   A runner trains by heart rate and wants the pace that gives a target heart rate.
   A line "heart rate = b + a (speed - 10)" is fitted to one-minute averages from her watch.
   The data are synthetic (seeded generator below), which the page says explicitly.
   ===================================================================== */
function IntroPage() {
  const V0 = 10, TARGET = 145, ALPHA = 0.3, START = [0, 132], VIEW = [0, 15, 125, 170], MAXK = 400;
  // ---------- eight runs, thirty one-minute averages each (after the warm-up)
  const RUNS = [['Spokojny', 8.6, 0], ['Spokojny', 9.1, 0], ['Spokojny', 9.4, 0], ['Długi', 8.9, 0], ['W drugim zakresie', 10.6, 0], ['W drugim zakresie', 11.2, 0], ['Z narastającą prędkością', 8.5, 0.15], ['Tempowy', 12.3, 0]];
  const g = M.rng(20260), V = [], Y = [], LOG = [];
  RUNS.forEach(([kind, base, ramp]) => {
    const day = 2.2 * g.n(); let sv = 0, sy = 0;                      // day-to-day shift of the heart rate
    for (let k = 0; k < 30; k++) {
      const v = Math.round((base + ramp * k + 0.32 * g.n()) * 10) / 10, y = Math.round(148 + 7.2 * (v - V0) + day + 3.6 * g.n());
      V.push(v); Y.push(y); sv += v; sy += y;
    }
    LOG.push([kind, sv / 30, sy / 30]);
  });
  const N = V.length;
  const pred = (a, b, v) => b + a * (v - V0);
  const cost = p => { let s = 0; for (let i = 0; i < N; i++) { const r = pred(p[0], p[1], V[i]) - Y[i]; s += r * r; } return s / (2 * N); };
  const grad = p => { let ga = 0, gb = 0; for (let i = 0; i < N; i++) { const r = pred(p[0], p[1], V[i]) - Y[i]; ga += r * (V[i] - V0); gb += r; } return [ga / N, gb / N]; };
  // exact minimum from the normal equations of the line fit
  const X = V.map(v => v - V0), sxx = X.reduce((s, x) => s + x * x, 0), sx = X.reduce((s, x) => s + x, 0), sxy = X.reduce((s, x, i) => s + x * Y[i], 0), sy = Y.reduce((s, y) => s + y, 0);
  const BEST = M.solve([[sxx, sx], [sx, N]], [sxy, sy]), FMIN = cost(BEST);
  const top = Math.max(...[[VIEW[0], VIEW[2]], [VIEW[1], VIEW[2]], [VIEW[0], VIEW[3]], [VIEW[1], VIEW[3]]].map(cost));
  const FN = { id: 'hr-line', f: cost, view: VIEW, fmin: FMIN, min: BEST, axes: [['a', ''], ['b', '']],
    levels: Array.from({ length: 12 }, (_, j) => FMIN + (top - FMIN) * ((j + 1) / 13) ** 2.3) };
  const pace = v => { if (!Number.isFinite(v) || v < 4 || v > 25) return '—'; const s = Math.round(3600 / v); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min/km`; };
  const vAt = p => (p[0] > 0.5 ? V0 + (TARGET - p[1]) / p[0] : NaN);          // speed that gives the target heart rate
  const S = { path: [[...START]], k: 0 }, cur = () => S.path[S.path.length - 1];

  const root = el('div', 'intro');
  // ---------- the story
  const story = el('div', 'intro-top');
  story.innerHTML = `<div class="prose">${md(R`**Sytuacja.** Biegaczka trenuje „na tętno”: plan zakłada długie, spokojne biegi przy tętnie około $145$ uderzeń na minutę. Tętno reaguje na zmianę tempa z opóźnieniem, więc wygodniej jest znać prędkość, która temu tętnu odpowiada, i jej się trzymać.

**Pytanie.** Z jaką prędkością biec, aby tętno wynosiło około $145$?

**Dane.** Zegarek z GPS i czujnik tętna zapisały osiem biegów z ostatnich tygodni. Z każdego biegu wzięto $30$ jednominutowych odcinków po rozgrzewce: średnią prędkość $v_i$ i średnie tętno $y_i$. Razem jest $n=${N}$ pomiarów. Punkty nie leżą na jednej prostej: teren, wiatr, zmęczenie i szum czujników dają rozrzut.

**Model.** W tym zakresie wysiłku tętno rośnie w przybliżeniu liniowo z prędkością, więc opisujemy je prostą o dwóch parametrach:

$$\hat{y}=b+a\,(v-10)$$

Parametr $b$ to tętno przy prędkości 10 km/h, a parametr $a$ to przyrost tętna na każdy dodatkowy km/h.

**Co optymalizujemy.** Nie bieg, tylko model: szukamy takiej pary $(a,\ b)$, dla której prosta leży najbliżej pomiarów. Odległość mierzymy resztami $r_i=\hat{y}_i-y_i$ i zbieramy w jedną liczbę, funkcję kosztu (cost function), czyli połowę średniego kwadratu reszt:

$$f(a,\ b)=\frac{1}{2n}\sum_{i} r_i^2$$`)}</div>
    <div class="card intro-data"><h3 class="card-h">Dziennik biegów z zegarka</h3>
      <table class="tbl"><thead><tr><th>Bieg</th><th>Odcinków</th><th>Średnia prędkość [km/h]</th><th>Średnie tętno [ud./min]</th></tr></thead>
      <tbody>${LOG.map(([kind, v, y], i) => `<tr><td>${i + 1}. ${kind}</td><td>30</td><td>${v.toFixed(1)}</td><td>${Math.round(y)}</td></tr>`).join('')}</tbody></table>
      <p class="note">Każdy z ${N} jednominutowych odcinków jest jednym punktem na wykresie poniżej. Dane są syntetyczne: wygenerowano je na potrzeby tego wprowadzenia tak, aby przypominały zapis z zegarka sportowego.</p></div>`;

  // ---------- the experiment
  const lab = el('div', 'lab'), side = el('aside', 'lab-side'), main = el('div', 'lab-main');
  const aS = Slider({ label: R`Parametr $a$: przyrost tętna na każdy km/h`, aria: 'parametr a', min: VIEW[0], max: VIEW[1], step: 0.05, value: START[0] });
  const bS = Slider({ label: R`Parametr $b$: tętno przy 10 km/h`, aria: 'parametr b', min: VIEW[2], max: VIEW[3], step: 0.5, value: START[1] });
  const c1 = el('section', 'card'); c1.innerHTML = '<h3 class="card-h">Parametry modelu</h3>'; c1.append(aS.el, bS.el);
  c1.append(el('small', 'fix3', 'Parametry można też wybrać kliknięciem na mapie kosztu (w widoku poziomic).'));
  const status = el('p', 'status'); status.setAttribute('role', 'status');
  const bStep = Btn('Krok', '', () => { runner.stop(); step(); draw(); }), bRun = Btn('▶ Uruchom', 'pri', () => { if (done()) setAB(START[0], START[1]); runner.toggle(); }), bReset = Btn('Od nowa', '', () => setAB(START[0], START[1]));
  const c2 = el('section', 'card'); c2.innerHTML = '<h3 class="card-h">Zejście po mapie kosztu</h3>';
  const row = el('div', 'btns'); row.append(bStep, bRun, bReset); c2.append(row);
  c2.append(el('small', 'fix3', mdi(R`Każdy krok przesuwa punkt przeciwnie do gradientu: $(a,\ b)\leftarrow(a,\ b)-\alpha\,\nabla f$, ze współczynnikiem uczenia $\alpha=${ALPHA}$.`)));
  side.append(c1, c2);

  const pD = new Plot({ xlabel: R`v\ [\text{km/h}]`, ylabel: R`y\ [\text{ud./min}]`, aria: 'Pomiary tętna w funkcji prędkości i dopasowywana prosta' });
  const pM = new Plot({ xlabel: 'a', ylabel: 'b', aria: 'Mapa kosztu w funkcji parametrów a i b' });
  const dCard = plotCard(`Dane i model <small>${N} pomiarów, czerwone odcinki to reszty</small>`, pD,
    legend([['dot', C.black, 'pomiary'], ['line', C.green, R`model $\hat{y}=b+a\,(v-10)$`], ['line', C.red, R`reszty $r_i$`], ['dash', C.ghost, 'tętno docelowe 145']]));
  dCard.append(el('p', 'note', 'Kółko na linii przerywanej pokazuje prędkość, przy której model przewiduje tętno 145 ud./min.'));
  const mCard = plotCard('', pM);
  const view = ViewSwitch(pM, mCard, {
    t2: 'Mapa kosztu <small>kliknij, aby wybrać parametry</small>', t3: 'Powierzchnia kosztu <small>obróć myszą lub strzałkami</small>',
    n2: 'Każdy punkt mapy to jedna para parametrów, czyli jedna prosta. Poziomice łączą pary o tym samym koszcie.',
    n3: 'Wysokość to koszt w skali spłaszczonej (logarytmicznej), aby dno doliny pozostało czytelne. Parametry wybiera się w widoku poziomic.', redraw: () => draw() });
  mCard.insertAdjacentHTML('beforeend', legend([['line', C.green, 'kolejne kroki'], ['star', C.black, 'najmniejszy koszt']])); mCard.append(view.note);
  const plots = el('div', 'plots'); plots.append(dCard, mCard);
  const stats = Stats([['f', R`Koszt $f(a,\ b)$`, 'f'], ['rms', 'Typowy błąd modelu', 'rmse'], ['v', 'Prędkość przy tętnie 145', 'speed'], ['p', 'Tempo przy tętnie 145', null], ['k', 'Wykonane kroki', 'kiter']]);
  main.append(status, plots, stats.el);
  lab.append(side, main);

  const done = () => S.k >= MAXK || (S.k > 0 && Math.hypot(...grad(cur())) < 1e-4);
  const r3 = x => Math.round(x * 1000) / 1000, r2 = x => Math.round(x * 100) / 100;   // the controls show rounded values, the path keeps full precision
  function setAB(a, b, keep) {                       // a new guess: the path starts again from here
    runner.stop();
    a = Math.max(VIEW[0], Math.min(VIEW[1], a)); b = Math.max(VIEW[2], Math.min(VIEW[3], b));
    S.path = [[a, b]]; S.k = 0; if (!keep) { aS.set(r3(a), false); bS.set(r2(b), false); }
    status.className = 'status'; status.textContent = 'Wybrano parametry. Oceń dopasowanie na wykresie danych, a potem wykonaj krok lub uruchom zejście.';
    draw();
  }
  function step() {
    if (done()) return false;
    const p = cur(), gr = grad(p), q = [p[0] - ALPHA * gr[0], p[1] - ALPHA * gr[1]];
    S.path.push(q); S.k++; aS.set(r3(q[0]), false); bS.set(r2(q[1]), false);
    if (done()) { status.textContent = `Gradient zmalał praktycznie do zera po ${S.k} krokach: to dno doliny, czyli najlepiej dopasowana prosta.`; return false; }
    status.textContent = 'Punkt schodzi po mapie kosztu, a prosta zbliża się do pomiarów.';
    return true;
  }
  const DOTS = V.map((v, i) => [v, Y[i]]);
  function draw() {
    const [a, b] = cur(), f = cost([a, b]), v = vAt([a, b]);
    pD.setView(7, 14, 112, 188);
    pD.draw = q => {
      q.hline(TARGET, { dash: [5, 4], color: C.ghost });
      const c = q.c; c.strokeStyle = C.red; c.globalAlpha = 0.3; c.lineWidth = 1; c.beginPath();   // all residuals in one path
      for (let i = 0; i < N; i++) { c.moveTo(q.X(V[i]), q.Y(Y[i])); c.lineTo(q.X(V[i]), q.Y(pred(a, b, V[i]))); }
      c.stroke(); c.globalAlpha = 1;
      q.dots(DOTS, { color: C.black, r: 2.3, alpha: 0.6 });
      q.fn(x => pred(a, b, x), { color: C.green, width: 2.8, n: 2 });
      if (Number.isFinite(v)) { q.seg(v, 112, v, TARGET, { dash: [5, 4], color: C.ghost, width: 1.2 }); q.dots([[v, TARGET]], { fill: '#fff', stroke: C.green, color: C.green, r: 5, lw: 2.2 }); }
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
    stats.set({ f: num(f, 5), rms: num(Math.sqrt(2 * f), 3) + ' ud./min', v: Number.isFinite(v) && v > 4 && v < 25 ? num(v, 4) + ' km/h' : '—', p: pace(v), k: String(S.k) });
    bStep.disabled = done();
  }
  const runner = Runner(step, () => 6, on => { bRun.textContent = on ? '❚❚ Pauza' : '▶ Uruchom'; });
  runner.onframe = draw;
  aS.oninput = bS.oninput = () => setAB(aS.value, bS.value, true);
  pM.pickable((x, y) => setAB(parseFloat(x.toFixed(2)), parseFloat(y.toFixed(1))));
  root._live = () => { const p = cur(), f = cost(p), v = vAt(p); return {
    slope: `$a=${tn(p[0], 4)}$ ud./min na każdy km/h`, icept: `$b=${tn(p[1], 5)}$ ud./min`, f: `$f(a,\\ b)=${tn(f, 5)}$`, alpha: `$\\alpha=${ALPHA}$`, nmeas: `$n=${N}$`,
    kiter: `$k=${S.k}$`, rmse: `$\\sqrt{2f}=${tn(Math.sqrt(2 * f), 3)}$ ud./min`, yhat: `przy 10 km/h: $\\hat{y}=${tn(p[1], 5)}$ ud./min`, speed: `tętnu 145 odpowiada $v=${tn(v, 4)}$ km/h`, grad: `$${tv(grad(p), 4)}$` }; };

  // ---------- guided steps
  const vb = vAt(BEST), rms = Math.sqrt(2 * FMIN);
  const missions = Missions('wstep', [
    { t: 'Zgadnij prostą', q: R`Ustaw suwakami $a$ i $b$ tak, aby prosta przechodziła przez środek chmury pomiarów. **Zastanów się:** po czym poznajesz, że jedna prosta jest lepsza od drugiej?`,
      acts: [['Prosta pozioma', () => setAB(0, 132)], ['Prosta zbyt stroma', () => setAB(13, 150)]],
      a: R`Po długości czerwonych odcinków, czyli reszt $r_i$. Funkcja kosztu $f(a,\ b)$ zbiera je w jedną liczbę: im mniejsza, tym lepsze dopasowanie. Reszty podnosimy do kwadratu, aby dodatnie i ujemne się nie znosiły, a duże błędy liczyły się bardziej niż małe. Dzielenie przez liczbę pomiarów sprawia, że koszt nie zależy od tego, ile danych zebrano.` },
    { t: 'Jeden punkt mapy to jedna prosta', q: R`Kliknij w kilku miejscach mapy kosztu i obserwuj wykres danych. Potem przełącz mapę na widok „Powierzchnia 3D”. **Zastanów się:** co oznacza położenie punktu na mapie, a co jego wysokość?`,
      acts: [['Poziomice', () => view.set(false)], ['Powierzchnia 3D', () => view.set(true)]],
      a: R`Położenie to para parametrów $(a,\ b)$, a więc jedna konkretna prosta. Wysokość to koszt tej prostej. Powierzchnia nie jest terenem, po którym biegnie biegaczka: to błąd modelu przedstawiony jako funkcja jego parametrów. Dno doliny odpowiada najlepiej dopasowanej prostej.` },
    { t: 'Zejście we mgle', q: R`Zacznij od prostej poziomej i klikaj „Krok” albo uruchom zejście. **Zastanów się:** skąd algorytm wie, w którą stronę zmienić $a$ i $b$, skoro nie „widzi” całej mapy? Dlaczego kolejne kroki są coraz krótsze?`,
      acts: [['Prosta pozioma i start', () => { setAB(START[0], START[1]); runner.start(); }]],
      a: R`Zna tylko nachylenie mapy w bieżącym punkcie, czyli gradient $\nabla f$. Przesuwa punkt w kierunku przeciwnym do gradientu, o długość wyznaczoną przez współczynnik uczenia $\alpha$. Przypomina to schodzenie z góry we mgle: czujesz jedynie spadek terenu pod stopami. Kroki skracają się same, bo im bliżej dna doliny, tym mniejsze nachylenie, a więc mniejszy gradient. Na dnie gradient jest równy zeru i punkt się zatrzymuje.` },
    { t: 'Odpowiedź dla biegaczki', q: R`Doprowadź zejście do końca i odczytaj wyniki pod wykresami. **Zastanów się:** z jaką prędkością powinna biec i jak dokładna jest ta odpowiedź?`,
      acts: [['Najlepsze dopasowanie', () => setAB(BEST[0], BEST[1])]],
      a: R`Najlepsza prosta ma $a\approx${tn(BEST[0], 3)}$ i $b\approx${tn(BEST[1], 4)}$. Tętnu $145$ odpowiada prędkość około $${tn(vb, 3)}$ km/h, czyli tempo około ${pace(vb)}. Typowa reszta wynosi około $${tn(rms, 2)}$ uderzenia na minutę, więc w pojedynczej minucie biegu tętno może odbiegać od przewidywanego o kilka uderzeń. Model jest uproszczeniem: nie uwzględnia zmęczenia, temperatury ani ukształtowania terenu.` },
  ]);
  const next = el('div', '', box('nb', 'Co dalej', R`W kolejnych tematach schemat jest ten sam, zmieniają się tylko nazwy. Parametry oznaczamy $x_0$ i $x_1$ (razem: punkt $\mathbf{x}$), a koszt $f(\mathbf{x})$. Każdy temat to inny sposób schodzenia po mapie kosztu: skąd wziąć gradient (temat 1), jak długi zrobić krok (tematy 2 i 4), jak przyspieszyć w wąskiej dolinie (temat 3) i jak wykorzystać krzywiznę (tematy 5 i 6). W tematach 6 i 7 model przestaje być prostą, ale mapa kosztu powstaje dokładnie tak samo.`));
  root.append(story, lab, el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), missions, next);
  setAB(START[0], START[1]);
  return { el: root };
}
