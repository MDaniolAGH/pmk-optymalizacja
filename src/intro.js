/* =====================================================================
   Introduction: from a real-life question to a cost surface over two parameters.
   A runner prepares for a marathon; a line "heart rate = b + a (speed - 10)" is fitted to watch data.
   The data are illustrative (made up), which the page says explicitly.
   ===================================================================== */
function IntroPage() {
  const V = [7, 8, 9, 10, 11, 12, 13, 14], Y = [126, 131, 142, 146, 157, 160, 171, 176];   // speed [km/h], heart rate [beats/min]
  const V0 = 10, TV = 42.195 / 4, HRMAX = 155, ALPHA = 0.02, START = [0, 130], VIEW = [0, 15, 120, 175], MAXK = 400;
  const pred = (a, b, v) => b + a * (v - V0);
  const cost = p => { let s = 0; for (let i = 0; i < V.length; i++) { const r = pred(p[0], p[1], V[i]) - Y[i]; s += r * r; } return s / 2; };
  const grad = p => { let ga = 0, gb = 0; for (let i = 0; i < V.length; i++) { const r = pred(p[0], p[1], V[i]) - Y[i]; ga += r * (V[i] - V0); gb += r; } return [ga, gb]; };
  // exact minimum from the normal equations of the line fit
  const X = V.map(v => v - V0), sxx = X.reduce((s, x) => s + x * x, 0), sx = X.reduce((s, x) => s + x, 0), sxy = X.reduce((s, x, i) => s + x * Y[i], 0), sy = Y.reduce((s, y) => s + y, 0);
  const BEST = M.solve([[sxx, sx], [sx, V.length]], [sxy, sy]), FMIN = cost(BEST);
  const top = Math.max(...[[VIEW[0], VIEW[2]], [VIEW[1], VIEW[2]], [VIEW[0], VIEW[3]], [VIEW[1], VIEW[3]]].map(cost));
  const FN = { id: 'hr-line', f: cost, view: VIEW, fmin: FMIN, min: BEST, axes: [['a', ''], ['b', '']],
    levels: Array.from({ length: 12 }, (_, j) => FMIN + (top - FMIN) * ((j + 1) / 13) ** 2.3) };
  const hms = h => { if (!Number.isFinite(h) || h <= 0 || h > 12) return '—'; const m = Math.round(h * 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };
  const answer = p => { const hr = pred(p[0], p[1], TV), v = p[0] > 0.5 ? V0 + (HRMAX - p[1]) / p[0] : NaN; return { hr, v, time: Number.isFinite(v) && v > 3 && v < 25 ? 42.195 / v : NaN }; };
  const S = { path: [[...START]], k: 0 }, cur = () => S.path[S.path.length - 1];

  const root = el('div', 'intro');
  // ---------- the story
  const story = el('div', 'intro-top');
  story.innerHTML = `<div class="prose">${md(R`**Sytuacja.** Biegaczka przygotowuje się do maratonu i chce go ukończyć w 4 godziny. Wymaga to średniej prędkości $42.195/4\approx10.55$ km/h. Z dotychczasowych długich biegów wie, że przez kilka godzin potrafi utrzymać tętno około $155$ uderzeń na minutę.

**Pytanie.** Czy tempo potrzebne na 4 godziny mieści się w jej możliwościach? Aby odpowiedzieć, trzeba wiedzieć, jakie tętno odpowiada jakiej prędkości.

**Dane.** Zegarek z GPS i czujnik tętna zapisały bieg z narastającą prędkością: osiem odcinków po 1 km, każdy szybszy od poprzedniego. Z każdego odcinka mamy średnią prędkość $v_i$ i średnie tętno $y_i$. Punkty nie leżą dokładnie na jednej prostej, bo każdy pomiar zawiera szum.

**Model.** W tym zakresie wysiłku tętno rośnie w przybliżeniu liniowo z prędkością, więc opisujemy je prostą o dwóch parametrach:

$$\hat{y}=b+a\,(v-10)$$

Parametr $b$ to tętno przy prędkości 10 km/h, a parametr $a$ to przyrost tętna na każdy dodatkowy km/h.

**Co optymalizujemy.** Nie bieg, tylko model: szukamy takiej pary $(a,\ b)$, dla której prosta leży najbliżej pomiarów. Odległość mierzymy resztami $r_i=\hat{y}_i-y_i$ i zbieramy w jedną liczbę, funkcję kosztu (cost function):

$$f(a,\ b)=\tfrac12\sum_{i} r_i^2$$`)}</div>
    <div class="card intro-data"><h3 class="card-h">Dane z zegarka</h3>
      <table class="tbl"><thead><tr><th>Odcinek</th><th>Prędkość ${K('v_i')} [km/h]</th><th>Tętno ${K('y_i')} [ud./min]</th></tr></thead>
      <tbody>${V.map((v, i) => `<tr><td>${i + 1}</td><td>${v}</td><td>${Y[i]}</td></tr>`).join('')}</tbody></table>
      <p class="note">Dane przykładowe, wymyślone na potrzeby tego wprowadzenia.</p></div>`;

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
  const dCard = plotCard('Dane i model <small>czerwone odcinki to reszty</small>', pD,
    legend([['dot', C.black, 'pomiary'], ['line', C.green, R`model $\hat{y}=b+a\,(v-10)$`], ['line', C.red, R`reszty $r_i$`], ['dash', C.ghost, 'tempo na 4 h i tętno 155']]));
  dCard.append(el('p', 'note vnote1', 'Linie przerywane: prędkość potrzebna na 4 godziny (10.55 km/h) i tętno, które biegaczka potrafi utrzymać (155 ud./min).'));
  const mCard = plotCard('', pM);
  const view = ViewSwitch(pM, mCard, {
    t2: 'Mapa kosztu <small>kliknij, aby wybrać parametry</small>', t3: 'Powierzchnia kosztu <small>obróć myszą lub strzałkami</small>',
    n2: 'Każdy punkt mapy to jedna para parametrów, czyli jedna prosta. Poziomice łączą pary o tym samym koszcie.',
    n3: 'Wysokość to koszt w skali spłaszczonej (logarytmicznej), aby dno doliny pozostało czytelne. Parametry wybiera się w widoku poziomic.', redraw: () => draw() });
  mCard.insertAdjacentHTML('beforeend', legend([['line', C.green, 'kolejne kroki'], ['star', C.black, 'najmniejszy koszt']])); mCard.append(view.note);
  const plots = el('div', 'plots'); plots.append(dCard, mCard);
  const stats = Stats([['f', R`Koszt $f(a,\ b)$`, 'f'], ['hr', 'Tętno przy 10.55 km/h', 'yhat'], ['v', 'Prędkość przy tętnie 155', 'speed'], ['t', 'Czas maratonu przy tej prędkości', null], ['k', 'Wykonane kroki', 'kiter']]);
  main.append(status, plots, stats.el);
  lab.append(side, main);

  const done = () => S.k >= MAXK || (S.k > 0 && Math.hypot(...grad(cur())) < 1e-4);
  function setAB(a, b, keep) {                       // a new guess: the path starts again from here
    runner.stop();
    a = Math.max(VIEW[0], Math.min(VIEW[1], a)); b = Math.max(VIEW[2], Math.min(VIEW[3], b));
    S.path = [[a, b]]; S.k = 0; if (!keep) { aS.set(Math.round(a * 1000) / 1000, false); bS.set(Math.round(b * 100) / 100, false); }
    status.className = 'status'; status.textContent = 'Wybrano parametry. Oceń dopasowanie na wykresie danych, a potem wykonaj krok lub uruchom zejście.';
    draw();
  }
  function step() {
    if (done()) return false;
    const p = cur(), g = grad(p), q = [p[0] - ALPHA * g[0], p[1] - ALPHA * g[1]];
    S.path.push(q); S.k++; aS.set(Math.round(q[0] * 1000) / 1000, false); bS.set(Math.round(q[1] * 100) / 100, false);   // the controls show rounded values, the path keeps full precision
    if (done()) { status.textContent = `Gradient zmalał praktycznie do zera po ${S.k} krokach: to dno doliny, czyli najlepiej dopasowana prosta.`; return false; }
    status.textContent = 'Punkt schodzi po mapie kosztu, a prosta zbliża się do pomiarów.';
    return true;
  }
  function draw() {
    const [a, b] = cur(), ans = answer([a, b]);
    pD.setView(6, 15, 110, 190);
    pD.draw = q => {
      q.vline(TV, { dash: [5, 4], color: C.ghost }); q.hline(HRMAX, { dash: [5, 4], color: C.ghost });
      for (let i = 0; i < V.length; i++) q.seg(V[i], Y[i], V[i], pred(a, b, V[i]), { color: C.red, width: 1.8 });
      q.fn(v => pred(a, b, v), { color: C.green, width: 2.6, n: 2 });
      q.dots(V.map((v, i) => [v, Y[i]]), { color: C.black, r: 4.2, stroke: '#fff', lw: 1.2 });
      q.dots([[TV, pred(a, b, TV)]], { fill: '#fff', stroke: C.green, color: C.green, r: 5, lw: 2.2 });
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
    stats.set({ f: num(cost([a, b]), 5), hr: num(ans.hr, 4) + ' ud./min', v: Number.isFinite(ans.v) && ans.v > 3 && ans.v < 25 ? num(ans.v, 4) + ' km/h' : '—', t: hms(ans.time), k: String(S.k) });
    bStep.disabled = done();
  }
  const runner = Runner(step, () => 8, on => { bRun.textContent = on ? '❚❚ Pauza' : '▶ Uruchom'; });
  runner.onframe = draw;
  aS.oninput = bS.oninput = () => setAB(aS.value, bS.value, true);
  pM.pickable((x, y) => setAB(parseFloat(x.toFixed(2)), parseFloat(y.toFixed(1))));
  root._live = () => { const [a, b] = cur(), ans = answer([a, b]); return {
    slope: `$a=${tn(a, 4)}$ ud./min na każdy km/h`, icept: `$b=${tn(b, 5)}$ ud./min`, f: `$f(a,\\ b)=${tn(cost([a, b]), 5)}$`, alpha: `$\\alpha=${ALPHA}$`,
    kiter: `$k=${S.k}$`, yhat: `przy 10.55 km/h: $\\hat{y}=${tn(ans.hr, 4)}$ ud./min`, speed: `tętnu 155 odpowiada $v=${tn(ans.v, 4)}$ km/h`, grad: `$${tv(grad([a, b]), 4)}$` }; };

  // ---------- guided steps
  const fin = answer(BEST);
  const missions = Missions('wstep', [
    { t: 'Zgadnij prostą', q: R`Ustaw suwakami $a$ i $b$ tak, aby prosta przechodziła jak najbliżej pomiarów. **Zastanów się:** po czym poznajesz, że jedna prosta jest lepsza od drugiej?`,
      acts: [['Prosta pozioma', () => setAB(0, 130)], ['Prosta zbyt stroma', () => setAB(12, 150)]],
      a: R`Po długości czerwonych odcinków, czyli reszt $r_i$. Funkcja kosztu $f(a,\ b)$ zbiera je w jedną liczbę: im mniejsza, tym lepsze dopasowanie. Reszty podnosimy do kwadratu, aby dodatnie i ujemne się nie znosiły, a duże błędy liczyły się bardziej niż małe.` },
    { t: 'Jeden punkt mapy to jedna prosta', q: R`Kliknij w kilku miejscach mapy kosztu i obserwuj wykres danych. Potem przełącz mapę na widok „Powierzchnia 3D”. **Zastanów się:** co oznacza położenie punktu na mapie, a co jego wysokość?`,
      acts: [['Poziomice', () => view.set(false)], ['Powierzchnia 3D', () => view.set(true)]],
      a: R`Położenie to para parametrów $(a,\ b)$, a więc jedna konkretna prosta. Wysokość to koszt tej prostej. Powierzchnia nie jest terenem, po którym biegnie biegaczka: to błąd modelu przedstawiony jako funkcja jego parametrów. Dno doliny odpowiada najlepiej dopasowanej prostej.` },
    { t: 'Zejście we mgle', q: R`Zacznij od prostej poziomej i klikaj „Krok” albo uruchom zejście. **Zastanów się:** skąd algorytm wie, w którą stronę zmienić $a$ i $b$, skoro nie „widzi” całej mapy?`,
      acts: [['Prosta pozioma i start', () => { setAB(START[0], START[1]); runner.start(); }]],
      a: R`Zna tylko nachylenie mapy w bieżącym punkcie, czyli gradient $\nabla f$. Przesuwa punkt w kierunku przeciwnym do gradientu, o długość wyznaczoną przez współczynnik uczenia $\alpha$. Przypomina to schodzenie z góry we mgle: czujesz jedynie spadek terenu pod stopami. Zwróć uwagę, że parametr $a$ ustala się po kilku krokach, a $b$ znacznie wolniej: dolina jest w jednym kierunku stroma, a w drugim łagodna. To zjawisko jest tematem dwóch kolejnych rozdziałów.` },
    { t: 'Odpowiedź dla biegaczki', q: R`Doprowadź zejście do końca i odczytaj wyniki pod wykresami. **Zastanów się:** czy plan ukończenia maratonu w 4 godziny jest realny?`,
      acts: [['Najlepsze dopasowanie', () => setAB(BEST[0], BEST[1])]],
      a: R`Najlepsza prosta ma $a\approx${tn(BEST[0], 3)}$ i $b\approx${tn(BEST[1], 4)}$. Przy prędkości $10.55$ km/h model przewiduje tętno około $${tn(fin.hr, 4)}$ ud./min, czyli mniej niż $155$: plan jest realny, z niewielkim zapasem. Tętnu $155$ odpowiada prędkość około $${tn(fin.v, 3)}$ km/h, co dałoby czas około ${hms(fin.time)}. To prognoza przybliżona: model nie uwzględnia zmęczenia, temperatury ani powolnego wzrostu tętna podczas wielogodzinnego biegu.` },
  ]);
  const next = el('div', '', box('nb', 'Co dalej', R`W kolejnych tematach schemat jest ten sam, zmieniają się tylko nazwy. Parametry oznaczamy $x_0$ i $x_1$ (razem: punkt $\mathbf{x}$), a koszt $f(\mathbf{x})$. Każdy temat to inny sposób schodzenia po mapie kosztu: skąd wziąć gradient (temat 1), jak długi zrobić krok (tematy 2 i 4), jak przyspieszyć w wąskiej dolinie (temat 3) i jak wykorzystać krzywiznę (tematy 5 i 6). W tematach 6 i 7 model przestaje być prostą, ale mapa kosztu powstaje dokładnie tak samo.`));
  root.append(story, lab, el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), missions, next);
  setAB(START[0], START[1]);
  return { el: root };
}
