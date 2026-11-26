/* =====================================================================
   Closing page: the same descent trains machine-learning models.
   Task: tell walking from jogging from one accelerometer feature of a smartwatch (real data, see ml_data.js).
   Model: logistic regression with two parameters, so the cost can still be drawn as a map.
   New idea: the gradient estimated from a small random batch (stochastic gradient descent).
   ===================================================================== */
function MlPage() {
  const TR = WISDM.train, TE = WISDM.test, N = TR.length;
  const MU = TR.reduce((s, r) => s + r[0], 0) / N, SD = Math.sqrt(TR.reduce((s, r) => s + (r[0] - MU) ** 2, 0) / N);   // standardisation uses the training data only
  const Z = TR.map(r => (r[0] - MU) / SD), Y = TR.map(r => r[1]);
  const START = [0, 2], VIEW = [-1, 7, -3.5, 3.5], MAXK = 400;
  const sig = u => 1 / (1 + Math.exp(-u));
  const cost = p => { let s = 0; for (let i = 0; i < N; i++) { const u = p[0] * Z[i] + p[1]; s += Math.log(1 + Math.exp(Y[i] ? -u : u)); } return s / N; };   // mean cross-entropy
  const grad = (p, idx) => { let a = 0, b = 0; const n = idx ? idx.length : N; for (let j = 0; j < n; j++) { const i = idx ? idx[j] : j, e = sig(p[0] * Z[i] + p[1]) - Y[i]; a += e * Z[i]; b += e; } return [a / n, b / n]; };
  const acc = (p, R) => { let ok = 0; for (const r of R) ok += ((p[0] * (r[0] - MU) / SD + p[1]) > 0) === !!r[1]; return ok / R.length; };
  let BEST = [0, 0];                                 // reference minimum: Newton's method on the full training set
  for (let k = 0; k < 60; k++) {
    let h11 = 0, h12 = 0, h22 = 0; for (let i = 0; i < N; i++) { const s = sig(BEST[0] * Z[i] + BEST[1]), q = s * (1 - s); h11 += q * Z[i] * Z[i]; h12 += q * Z[i]; h22 += q; }
    const gr = grad(BEST), d = M.solve([[h11 / N, h12 / N], [h12 / N, h22 / N]], [-gr[0], -gr[1]]); if (!d) break; BEST = [BEST[0] + d[0], BEST[1] + d[1]];
  }
  const FMIN = cost(BEST), top = Math.max(...[[VIEW[0], VIEW[2]], [VIEW[1], VIEW[2]], [VIEW[0], VIEW[3]], [VIEW[1], VIEW[3]]].map(cost));
  const FN = { id: 'walk-jog', f: cost, view: VIEW, fmin: FMIN, min: BEST, axes: [['w', ''], ['b', '']],
    levels: Array.from({ length: 12 }, (_, j) => FMIN + (top - FMIN) * ((j + 1) / 13) ** 2.3) };
  const thr = p => (p[0] > 0.05 ? MU - SD * p[1] / p[0] : NaN);                 // feature value at which p = 0.5
  const S = { path: [[...START]], k: 0, seen: 0, batch: null, rng: M.rng(11) }, cur = () => S.path[S.path.length - 1];

  const root = el('div', 'intro');
  const story = el('div', 'intro-top');
  story.innerHTML = `<div class="prose">${md(R`**Zadanie.** Zegarek sportowy ma sam rozpoznać, czy jego właściciel idzie, czy biegnie. Nikt nie podaje mu gotowej reguły: ma ją znaleźć w danych. To jest uczenie maszynowe (machine learning).

**Cecha.** Z każdych 5 sekund sygnału akcelerometru obliczamy jedną liczbę: odchylenie standardowe wartości przyspieszenia, czyli miarę intensywności ruchu ręki, wyrażoną w jednostkach przyspieszenia ziemskiego (g). Podczas biegu jest zwykle większa niż podczas marszu, ale zakresy częściowo się pokrywają.

**Model.** Regresja logistyczna (logistic regression) zamienia cechę na prawdopodobieństwo biegu:

$$p=\sigma(w\,z+b),\qquad \sigma(u)=\frac{1}{1+e^{-u}}$$

Tutaj $z$ to cecha po standaryzacji (odjęta średnia, wynik podzielony przez odchylenie standardowe), $w$ to waga, a $b$ to wyraz wolny. Są tylko dwa parametry, więc koszt nadal można narysować jako mapę.

**Koszt.** Etykieta $y_i$ wynosi $1$ dla biegu i $0$ dla marszu. Model jest karany tym mocniej, im pewniej się myli. Tę karę mierzy entropia krzyżowa (cross-entropy):

$$f(w,\ b)=-\frac{1}{n}\sum_{i}\Big[y_i\ln p_i+(1-y_i)\ln(1-p_i)\Big]$$

**Co jest tu nowe.** W uczeniu maszynowym danych jest tak dużo, że gradientu nie oblicza się ze wszystkich naraz. W każdym kroku bierze się małą, losową porcję danych (mini-batch) i z niej szacuje kierunek. To stochastyczny spadek gradientu (stochastic gradient descent, SGD).`)}</div>
    <div class="card intro-data"><h3 class="card-h">Dane: prawdziwe pomiary</h3>
      <dl class="kvs"><div class="kv"><dt>Czujnik</dt><dd>akcelerometr zegarka, 20 Hz</dd></div><div class="kv"><dt>Czynności</dt><dd>marsz i trucht</dd></div><div class="kv"><dt>Okno</dt><dd>5 sekund</dd></div>
        <div class="kv"><dt>Dane uczące</dt><dd>${N} okien, ${WISDM.people[0]} osoby</dd></div><div class="kv"><dt>Dane testowe</dt><dd>${TE.length} okien, ${WISDM.people[1]} innych osób</dd></div></dl>
      <p class="note">Źródło: Weiss, G. (2019). <em>WISDM Smartphone and Smartwatch Activity and Biometrics Dataset</em>. UCI Machine Learning Repository. <a href="https://doi.org/10.24432/C5HK59" rel="noopener">https://doi.org/10.24432/C5HK59</a>. Licencja CC BY 4.0. Z surowych zapisów obliczono cechę i wybrano po 9 okien na osobę i czynność.</p></div>`;

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

  const pD = new Plot({ xlabel: R`\text{intensywność ruchu ręki [g]}`, ylabel: 'p', aria: 'Okna pomiarowe marszu i biegu oraz krzywa prawdopodobieństwa biegu' });
  const pM = new Plot({ xlabel: 'w', ylabel: 'b', aria: 'Mapa kosztu w funkcji wagi i wyrazu wolnego' });
  const dCard = plotCard(`Dane i model <small>${N} okien uczących</small>`, pD,
    legend([['dot', C.ink3, 'marsz (u dołu)'], ['dot', C.red, 'bieg (u góry)'], ['line', C.green, R`model: prawdopodobieństwo biegu $p$`], ['dash', C.ghost, 'próg decyzji'], ['ring', C.black, 'bieżąca porcja']]));
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

  const B = () => batch.value || N;
  const done = () => S.k >= MAXK || (batch.value === 0 && S.k > 0 && Math.hypot(...grad(cur())) < 1e-3);
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
    const p = cur(), gr = grad(p, idx), a = aS.value, q = [p[0] - a * gr[0], p[1] - a * gr[1]];
    S.path.push(q); S.k++; S.seen += n; S.batch = idx; wS.set(r2(q[0]), false); bS.set(r2(q[1]), false);
    if (done()) {
      status.textContent = S.k >= MAXK ? `Wykonano ${MAXK} kroków. Przy małych porcjach punkt nie zatrzymuje się w minimum, tylko krąży w jego pobliżu.` : `Gradient zmalał praktycznie do zera po ${S.k} krokach: to dno doliny.`;
      return false;
    }
    status.textContent = n === N ? 'Gradient ze wszystkich danych: punkt schodzi po mapie gładko.' : `Gradient z ${n === 1 ? 'jednej próbki' : n + ' losowych próbek'}: kierunek jest przybliżony, więc trajektoria jest poszarpana.`;
    return true;
  }
  const jit = i => ((i * 2654435761 >>> 0) % 1000) / 1000;                       // fixed vertical jitter of a point
  const PW = TR.map((r, i) => [r[0], r[1] ? 0.88 + 0.1 * jit(i) : 0.02 + 0.1 * jit(i)]), walk = PW.filter((_, i) => !Y[i]), jog = PW.filter((_, i) => Y[i]);
  function draw() {
    const p = cur(), f = cost(p), t = thr(p);
    pD.setView(0, 2.1, -0.04, 1.04);
    pD.draw = q => {
      q.dots(walk, { color: C.ink3, r: 2.4, alpha: 0.55 }); q.dots(jog, { color: C.red, r: 2.4, alpha: 0.55 });
      if (Number.isFinite(t) && t > 0 && t < 2.1) q.vline(t, { dash: [5, 4], color: C.ghost, width: 1.4 });
      q.fn(x => sig(p[0] * (x - MU) / SD + p[1]), { color: C.green, width: 2.8, n: 200 });
      if (S.batch && S.batch.length <= 64) q.dots(S.batch.map(i => PW[i]), { fill: null, stroke: C.black, color: C.black, r: 5, lw: 1.6 });
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
    stats.set({ f: num(f, 4), a1: (acc(p, TR) * 100).toFixed(1) + '%', a2: (acc(p, TE) * 100).toFixed(1) + '%', t: Number.isFinite(t) && t > 0 && t < 3 ? num(t, 3) + ' g' : '—',
      s: `${S.seen} (${num(S.seen / N, 3)} × cały zbiór)` });
    bStep.disabled = done();
  }
  const runner = Runner(step, () => 20, on => { bRun.textContent = on ? '❚❚ Pauza' : '▶ Uruchom'; });
  runner.onframe = draw;
  wS.oninput = bS.oninput = () => setP(wS.value, bS.value, true);
  batch.onchange = () => { runner.stop(); S.batch = null; draw(); };
  pM.pickable((x, y) => setP(r2(x), r2(y)));
  root._live = () => { const p = cur(); return {
    wgt: `$w=${tn(p[0], 4)}$`, bias: `$b=${tn(p[1], 4)}$`, f: `$f(w,\\ b)=${tn(cost(p), 4)}$`, alpha: `$\\alpha=${tn(aS.value, 3)}$`, nsamp: `$n=${N}$ okien uczących`,
    accur: `dane uczące: ${(acc(p, TR) * 100).toFixed(1)}%; nowe osoby: ${(acc(p, TE) * 100).toFixed(1)}%`, grad: `ze wszystkich danych: $${tv(grad(p), 4)}$`,
    zfeat: `średnia cechy: ${num(MU, 3)} g; odchylenie standardowe: ${num(SD, 3)} g`, prob: `dla okna o intensywności 0.5 g: $p=${tn(sig(p[0] * (0.5 - MU) / SD + p[1]), 3)}$` }; };

  const set = (b, a) => { batch.set(b, false); aS.set(a, false); setP(START[0], START[1]); runner.start(); };
  const tb = thr(BEST);
  const missions = Missions('ml', [
    { t: 'Co robią parametry', q: R`Zmieniaj suwakami wagę $w$ i wyraz wolny $b$. **Zastanów się:** który parametr przesuwa próg decyzji, a który zmienia stromość krzywej? Co oznacza model z $w=0$?`,
      acts: [['$w=0$, $b=2$', () => setP(0, 2)], ['$w=1$, $b=0$', () => setP(1, 0)], ['$w=6$, $b=0$', () => setP(6, 0)]],
      a: R`Waga $w$ decyduje o stromości krzywej: przy dużym $w$ model jest pewny swojej odpowiedzi tuż obok progu, przy małym waha się w szerokim zakresie. Wyraz wolny $b$ przesuwa próg w lewo lub w prawo. Dla $w=0$ model w ogóle nie patrzy na dane: każdemu oknu przypisuje to samo prawdopodobieństwo. Od takiego modelu zaczyna się uczenie.` },
    { t: 'Gradient ze wszystkich danych', q: R`Wybierz porcję „wszystkie” i uruchom uczenie. **Zastanów się:** ile próbek trzeba przetworzyć, aby dojść do minimum?`,
      acts: [['Wszystkie dane, $\\alpha=2$', () => set(0, 2)]],
      a: R`Trajektoria jest gładka, bo każdy krok korzysta z dokładnego gradientu. Ceną jest liczba obliczeń: każdy krok przetwarza wszystkie ${N} okien, więc kilkadziesiąt kroków to kilkadziesiąt przejść przez cały zbiór. Dla zbioru z milionami próbek jeden krok trwałby bardzo długo.` },
    { t: 'Gradient z małej porcji', q: R`Powtórz uczenie z porcjami po $16$ próbek, a potem po jednej próbce. **Zastanów się:** czy poszarpana trajektoria dojdzie w okolice minimum? Ile próbek przetworzy do tego czasu?`,
      acts: [['Porcje po 16', () => set(16, 2)], ['Porcje po 1', () => set(1, 2)], ['Porcje po 1, $\\alpha=0.5$', () => set(1, 0.5)]],
      a: R`Tak. Kierunek wyznaczony z małej porcji jest tylko przybliżeniem prawdziwego gradientu, ale przeciętnie wskazuje w tę samą stronę. Punkt dociera w pobliże minimum po przetworzeniu znacznie mniejszej liczby próbek niż przy pełnym gradiencie, a potem krąży wokół niego, zamiast się zatrzymać. Rozrzut jest tym większy, im mniejsza porcja i im większy współczynnik uczenia. Dlatego w praktyce współczynnik uczenia zmniejsza się w trakcie uczenia.` },
    { t: 'Czy model działa na nowych osobach', q: R`Po zakończeniu uczenia porównaj trafność na danych uczących i na osobach, których model nigdy nie widział. **Zastanów się:** dlaczego sprawdzamy model na innych osobach, a nie na innych oknach tych samych osób?`,
      acts: [['Najlepsze dopasowanie', () => setP(BEST[0], BEST[1])]],
      a: R`Najlepszy model stawia próg przy intensywności około $${tn(tb, 3)}$ g i poprawnie rozpoznaje ${(acc(BEST, TR) * 100).toFixed(1)}% okien uczących oraz ${(acc(BEST, TE) * 100).toFixed(1)}% okien nowych osób. Okna tej samej osoby są do siebie bardzo podobne, więc test na nich zawyżałby ocenę: model mógłby „rozpoznawać osobę”, a nie czynność. Zegarek ma działać u ludzi, od których nie zebrano danych, dlatego liczy się wynik na nowych osobach. Błędy modelu to głównie energiczny marsz i spokojny trucht: jedna cecha nie wystarcza, by je rozróżnić.` },
  ]);
  const next = el('div', '', box('nb', 'A sieć neuronowa?', R`Schemat jest ten sam: model z parametrami, funkcja kosztu, gradient i kroki w dół. Różni się skala. Sieć neuronowa ma tysiące lub miliony parametrów zamiast dwóch, więc mapy kosztu nie da się narysować, a jej powierzchnia nie jest wypukła. Gradient oblicza automatyczne różniczkowanie, a kroki wykonują odmiany stochastycznego spadku gradientu: z momentem (temat 3) albo z osobnym skalowaniem kroku dla każdego parametru. Zamiast jednej cechy obliczonej ręcznie sieć dostaje zwykle surowy sygnał z czujnika i sama uczy się, co w nim jest istotne.`));
  root.append(story, lab, el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), missions, next);
  setP(START[0], START[1]);
  return { el: root };
}
