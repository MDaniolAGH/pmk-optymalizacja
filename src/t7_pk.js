/* =====================================================================
   Topic 7 — final task: one-compartment pharmacokinetic model fitted to theophylline data
   ===================================================================== */
function pkPlot(ratio = '1 / 0.6') { return new Plot({ ratio, xlabel: R`t\ [\mathrm{h}]`, ylabel: R`C\ [\mathrm{mg/L}]`, aria: 'Stężenie teofiliny w czasie: pomiary i krzywa modelu' }).setView(0, 25.5, 0, 12.5); }
function drawPK(q, P, th, o = {}) {
  if (o.prev) q.fn(t => P.model(o.prev, t), { color: C.ghost, width: 1.6, dash: [5, 4], n: 300 });
  if (th && M.finite(th)) {
    q.fn(t => P.model(th, t), { color: C.red, width: 2.4, n: 300 });
    if (o.sticks !== false) P.t.forEach((t, i) => q.seg(t, P.c[i], t, P.model(th, t), { color: C.red, width: 1.3, alpha: .75 }));
  }
  q.dots(P.t.map((t, i) => [t, P.c[i]]), { color: C.black, r: 4, stroke: '#fff', lw: 1.2 });
}
function pkCompare(p, r, upto) { // cost vs iteration, log–log, like the figure in the notebook
  const all = [r.gd.fs, r.newton.fs, r.gn.fs].flat().filter(Number.isFinite), lo = Math.min(...all), hi = Math.max(...all);
  p.setView(1, 4000, lo * 0.7, Math.min(hi, lo * 3000) * 1.6);
  p.draw = q => {
    const ser = (fs, o) => { const pts = fs.map((f, k) => [k + 1, f]); q.path(pts, o); if (pts.length < 40) q.dots(pts, { color: o.color, r: 2.6, shape: o.shape }); };
    if (upto == null) { ser(r.gd.fs, { color: C.green, width: 2.2 }); ser(r.newton.fs, { color: C.black, width: 2, dash: [6, 4], shape: 'sq' }); }
    ser(upto == null ? r.gn.fs : r.gn.fs.slice(0, upto + 1), { color: C.red, width: 2.2 });
  };
  p.render();
}

TOPICS.push({
  id: 'pk', n: 7, title: 'Farmakokinetyka teofiliny', short: 'Farmakokinetyka', task: 'Studium przypadku',
  menu: 'Wszystkie metody zastosowane do rzeczywistych danych klinicznych: model stężenia leku w surowicy, estymacja parametrów i biologiczny okres półtrwania (half-life).',
  icon: `<path d="M8 62 H112 M8 62 V8"/><path class="a" d="M8 62 C16 4 30 12 46 22 S92 50 112 54"/><circle class="p" cx="16" cy="34" r="3"/><circle class="p" cx="30" cy="14" r="3"/><circle class="p" cx="58" cy="30" r="3"/><circle class="p" cx="96" cy="50" r="3"/>`,

  walk() {
    const P = M.pk(1), th0 = M.PK_START, runs = M.pkRuns(P, th0), fit = runs.gn.th, e = v => v.map(Math.exp);
    return Walk({
      id: 'pk',
      intro: R`**Po co?** To studium przypadku łączy wszystkie poprzednie tematy: budujemy model i funkcję reszt, a parametry wyznaczamy poznanymi metodami. Poniżej pełny tok postępowania dla pacjenta nr 1: od surowych pomiarów do okresu półtrwania leku.`,
      algo: {
        title: 'Plan obliczeń',
        lines: [
          R`wczytaj dane pacjenta: czasy $t_i$, stężenia $c_i$, dawka $D$`,
          R`model: $k_a,\ k_e,\ V$ ← $e^{\theta}$, oblicz $C(t)$`,
          R`reszty: $r_i$ ← $C(t_i)-c_i$`,
          R`koszt ← $\tfrac12\sum_i r_i^2$`,
          R`minimalizuj koszt: metoda spadku gradientu, Newtona, Gaussa–Newtona`,
          R`okres półtrwania: $t_{1/2}$ ← $\ln 2\,/\,k_e$`,
        ],
      },
      logTitle: 'Dopasowanie metodą Gaussa–Newtona',
      logHead: ['$k$', R`$k_a$ [1/h]`, R`$k_e$ [1/h]`, R`$V/F$ [L]`, '[[costnow|koszt]]'],
      logEmpty: 'Tabela wypełni się po rozpoczęciu dopasowania.',
      visual(card) {
        const pD = pkPlot('1 / 0.5'), pC = new Plot({ xlog: true, ylog: true, ratio: '1 / 0.42', xlabel: R`\text{iteracja}`, ylabel: R`\tfrac12\lVert\mathbf{r}\rVert^2`, aria: 'Koszt w funkcji numeru iteracji dla trzech metod' });
        card.innerHTML = `<div class="plot-t">${mdi(R`Pacjent 1: stężenie teofiliny w surowicy <small>dawka $D=320$ mg</small>`)}</div>`;
        card.append(pD.el);
        card.insertAdjacentHTML('beforeend', legend([['dot', C.black, 'pomiary'], ['line', C.red, 'model'], ['dash', C.ghost, 'model przed krokiem']]) + `<div class="plot-t" style="margin-top:14px">Koszt w kolejnych iteracjach <small>obie osie logarytmiczne</small></div>`);
        card.append(pC.el);
        card.insertAdjacentHTML('beforeend', legend([['line', C.red, 'metoda Gaussa–Newtona'], ['dash', C.black, 'metoda Newtona'], ['line', C.green, 'spadek gradientu']]));
        return {
          draw(s) {
            pD.draw = q => { drawPK(q, P, s.th, { prev: s.prev, sticks: s.sticks }); if (s.half) { const ke = Math.exp(s.th[1]), t1 = 12, c1 = P.model(s.th, t1), t2 = t1 + Math.log(2) / ke; q.seg(t1, c1, t2, c1, { color: C.black, width: 1.4, dash: [3, 3] }); q.seg(t2, c1, t2, c1 / 2, { color: C.black, width: 1.4, dash: [3, 3] }); q.label((t1 + t2) / 2, c1, [['t', 'm'], ['1/2', 'sub']], { align: 'center', dy: -12 }); } };
            pD.render();
            pkCompare(pC, runs, s.all ? null : (s.k ?? 0));
          },
        };
      },
      build() {
        const fr = [], [ka0, ke0, V0] = e(th0), c0 = P.cost(th0);
        const g = 'Dane i model';
        fr.push({
          group: g, title: 'Pomiary', line: 0, state: { th: null, k: 0 },
          html: md(R`Pacjentowi o masie ciała $79.6$ kg podano doustnie teofilinę w dawce $4.02$ mg/kg, czyli łącznie $D=4.02\cdot79.6=${tn(P.D, 4)}$ mg. W ciągu doby stężenie leku w surowicy zmierzono $11$ razy.

Przebieg jest typowy dla leku podanego doustnie: stężenie szybko **rośnie** w fazie wchłaniania z przewodu pokarmowego, a następnie powoli **maleje** w fazie eliminacji. Potrzebny jest model opisujący oba procesy.`),
        });
        fr.push({
          group: g, title: 'Model jednokompartmentowy (one-compartment model)', line: 1, state: { th: [...th0], k: 0, sticks: false },
          html: md(R`$$C(t)=\frac{D\,k_a}{V\,(k_a-k_e)}\Big(e^{-k_e t}-e^{-k_a t}\Big)$$
Model ma trzy parametry: $k_a$ to stała szybkości **wchłaniania** (absorption rate constant), która decyduje o szybkości narastania krzywej; $k_e$ to stała szybkości **eliminacji** (elimination rate constant), która decyduje o nachyleniu końcowego odcinka krzywej; $V$ to objętość dystrybucji (volume of distribution), która skaluje całą krzywą w pionie.

Czerwona krzywa to model dla przykładowych wartości startowych: $k_a=1$, $k_e=0.1$, $V=30$. Kształt krzywej jest poprawny, ale faza eliminacji przebiega zbyt szybko.`) +
            box('def', 'Dlaczego V/F?', R`Biodostępność (bioavailability) $F$, czyli ułamek dawki docierający do krążenia ogólnego, występuje we wzorze zawsze łącznie z $V$. Na podstawie samych stężeń nie da się wyznaczyć tych wielkości osobno: są **nieidentyfikowalne** (non-identifiable). Przyjmujemy $F=1$ i estymujemy iloraz $V/F$.`),
        });
        fr.push({
          group: g, title: 'Optymalizujemy logarytmy parametrów', line: 1, state: { th: [...th0], k: 0, sticks: false },
          html: md(R`Zmiennymi optymalizacji nie są $(k_a,\ k_e,\ V)$, lecz ich logarytmy:
$$\boldsymbol\theta=(\ln k_a,\ \ln k_e,\ \ln V)=(\ln 1,\ \ln 0.1,\ \ln 30)=${tv(th0, 4)}$$
a model najpierw odtwarza parametry: $k_a=e^{\theta_0}$, $k_e=e^{\theta_1}$, $V=e^{\theta_2}$. Daje to dwie korzyści: parametry **zawsze** pozostają dodatnie, a zadanie jest znacznie **lepiej uwarunkowane**, ponieważ wszystkie trzy zmienne mają podobny rząd wielkości. To ten sam problem skalowania, który w poprzednim temacie prowadził do $\kappa(J^{\top}J)\sim10^{5}$.`),
        });
        fr.push({
          group: g, title: 'Reszty i koszt w punkcie startowym', line: [2, 3], state: { th: [...th0], k: 0 }, log: [0, num(ka0, 4), num(ke0, 4), num(V0, 4), num(c0, 5)],
          html: md(R`Dla każdego pomiaru obliczamy resztę $r_i=C(t_i)-c_i$ (pionowe odcinki na wykresie) i sumujemy ich kwadraty:
$$f(\boldsymbol\theta^{(0)})=\tfrac12\sum_{i=1}^{11}r_i^2=${tn(c0, 5)}$$
Kontrola poprawności modelu: dla $t=0$ oba składniki wykładnicze są równe $1$, więc $C(0)=0$. Warto sprawdzić tę własność w swojej implementacji przed rozpoczęciem dopasowania.`),
        });
        let th = [...th0];
        for (let k = 0; k < 7; k++) {
          const st = M.gnStep(P, th), nth = st.th, [a, b, v] = e(nth), cN = P.cost(nth);
          fr.push({
            group: 'Dopasowanie: Gauss–Newton', title: R`Iteracja ${k + 1}`, line: 4, state: { th: [...nth], prev: [...th], k: k + 1 }, log: [k + 1, num(a, 4), num(b, 4), num(v, 4), num(cN, 5)],
            html: (k === 0 ? md(R`Jakobian reszt ma teraz wymiar $11\times3$ (jedenaście pomiarów, trzy parametry), więc układ równań normalnych ma wymiar $3\times3$:
$$J^{\top}J=${tm(st.A, 4)},\qquad -J^{\top}\mathbf{r}=${tv(st.b, 4)}$$`) : '') +
              md(R`$$\begin{aligned}\mathbf{p}&=${tv(st.p, 3)}\\ \boldsymbol\theta^{(${k + 1})}&=${tv(nth, 4)}\end{aligned}$$
W jednostkach pierwotnych: $k_a=${tn(a, 4)}$, $k_e=${tn(b, 4)}$, $V/F=${tn(v, 4)}$. Koszt: $${tn(P.cost(th), 5)}\ \to\ ${tn(cN, 5)}$.${k === 0 ? ' Już pierwszy krok zmniejsza koszt ponad czterokrotnie.' : k === 6 ? ' Trzecia cyfra znacząca przestała się zmieniać: uznajemy dopasowanie za zakończone.' : ''}`),
          });
          th = nth;
        }
        const [ka, ke, V] = e(fit), th12 = Math.log(2) / ke, done = { th: [...fit], k: 7 };
        const hl = md(R`$$t_{1/2}=\frac{\ln 2}{k_e}=\frac{0.6931}{${tn(ke, 4)}}=${tn(th12, 4)}\ \text{h}$$ Po tym czasie stężenie w fazie eliminacji maleje o połowę (zaznaczono to na wykresie).`);
        fr.push({
          group: 'Wynik', title: 'Okres półtrwania: Twoja kolej', line: 5, state: { ...done, half: true },
          html: md(R`Oszacowane parametry: $k_a=${tn(ka, 4)}$ 1/h, $k_e=${tn(ke, 4)}$ 1/h, $V/F=${tn(V, 4)}$ L. W fazie eliminacji stężenie maleje wykładniczo, jak $e^{-k_e t}$. Biologiczny okres półtrwania (half-life) to czas, po którym stężenie maleje o połowę: $t_{1/2}=\ln 2/k_e$.`),
          quiz: { prompt: R`Oblicz $t_{1/2}$ w godzinach:`, answer: th12, tol: 1e-2, reveal: hl },
        });
        const first = fs => fs.findIndex(f => f < runs.gn.fs[runs.gn.fs.length - 1] * 1.001);
        fr.push({
          group: 'Wynik', title: 'Trzy metody, jedno minimum', line: 4, state: { ...done, all: true },
          html: md(R`Ten sam model dopasowano trzema metodami z tego samego punktu startowego. Dolny wykres pokazuje koszt w kolejnych iteracjach. Wszystkie trzy osiągają ten sam koszt $${tn(runs.gn.fs[runs.gn.fs.length - 1], 5)}$, ale z zupełnie różną szybkością. Liczba iteracji potrzebna do zbliżenia się do minimum na $0.1\%$:`) +
            `<div class="tblw"><table class="tbl"><thead><tr><th>Metoda</th><th>Liczba iteracji</th><th>Wymagane w każdym kroku</th></tr></thead><tbody>
            <tr><td>Metoda spadku gradientu (${K(R`\alpha=3\cdot10^{-4}`)})</td><td>${first(runs.gd.fs)}</td><td>gradient</td></tr>
            <tr><td>Metoda Newtona</td><td>${first(runs.newton.fs)}</td><td>gradient, hesjan, rozwiązanie układu ${K(R`3\times3`)}</td></tr>
            <tr><td>Metoda Gaussa–Newtona</td><td>${first(runs.gn.fs)}</td><td>jakobian reszt, rozwiązanie układu ${K(R`3\times3`)}</td></tr></tbody></table></div>` +
            md(R`To ten sam wniosek co w poprzednich tematach, tym razem na rzeczywistych danych: metody wykorzystujące informację o krzywiźnie potrzebują kilku kroków tam, gdzie metoda spadku gradientu potrzebuje około tysiąca.`),
        });
        fr.push({
          group: 'Wynik', title: 'Wskazówki do samodzielnej implementacji', line: [1, 2], state: { ...done, all: true },
          html: box('nb', 'Implementacja', R`Wystarczą dwie krótkie funkcje: model i reszty. W funkcji modelu najpierw przekształć $\boldsymbol\theta$ w dodatnie parametry funkcją <code>torch.exp</code>, a następnie zapisz wzór na $C(t)$ za pomocą operacji na tensorach, aby mechanizm automatycznego różniczkowania (autograd) mógł obliczyć jakobian i hesjan. Funkcja reszt zwraca różnicę między modelem a pomiarami.

Wyniki dla pacjenta 1, z którymi możesz porównać swoje: $k_a\approx${tn(ka, 4)}$, $k_e\approx${tn(ke, 3)}$, $V/F\approx${tn(V, 4)}$ L, $t_{1/2}\approx${tn(th12, 3)}$ h.`) +
            box('warn', 'Typowe błędy', R`Zamiana kolejności składników wykładniczych (stężenia są wtedy ujemne), użycie <code>np.exp</code> zamiast <code>torch.exp</code> (przerwanie grafu obliczeń, przez co automatyczne różniczkowanie nie działa) oraz pominięcie faktu, że $\boldsymbol\theta$ zawiera **logarytmy**: okres półtrwania oblicza się z $k_e=e^{\theta_1}$, a nie z $\theta_1$.`),
        });
        return fr;
      },
    });
  },

  lab() {
    let P = M.pk(1), th = [...M.PK_START], hist, cmp, ref;
    const root = el('div', 'lab'), side = el('aside', 'lab-side'), main = el('div', 'lab-main');
    const sel = Select({ label: 'Pacjent', value: 1, options: Array.from({ length: 12 }, (_, i) => ({ v: i + 1, label: `Pacjent ${i + 1}` })) });
    const mk = (label, aria, min, max, v) => Slider({ label, aria, min, max, value: v, log: true, sig: 3 });
    const kaS = mk(R`Stała szybkości wchłaniania $k_a$ [1/h]`, 'stała wchłaniania', 0.1, 12, 1), keS = mk(R`Stała szybkości eliminacji $k_e$ [1/h]`, 'stała eliminacji', 0.01, 1, 0.1), vS = mk(R`Objętość dystrybucji $V/F$ [L]`, 'objętość dystrybucji', 5, 120, 30);
    const ctl = el('section', 'card'); ctl.innerHTML = '<h3 class="card-h">Model</h3>'; ctl.append(sel.el, kaS.el, keS.el, vS.el, el('small', '', 'Suwaki mają skalę logarytmiczną, ponieważ optymalizowane są logarytmy parametrów.'));
    const status = el('p', 'status'); status.setAttribute('role', 'status');
    const act = el('section', 'card'); act.innerHTML = '<h3 class="card-h">Kroki algorytmów</h3>';
    const row = el('div', 'btns');
    row.append(Btn('Krok Gaussa–Newtona', 'pri sm', () => algo('gn')), Btn('Krok Newtona', 'sm', () => algo('nt')), Btn('100 kroków spadku gradientu', 'sm', () => algo('gd')), Btn('Domyślny punkt startowy', 'sm link', () => setTheta(M.PK_START, true)));
    act.append(row, el('small', '', 'Każdy przycisk rozpoczyna obliczenia od bieżących ustawień suwaków.'));
    side.append(ctl, act);
    const pD = pkPlot(), pH = new Plot({ ylog: true, ratio: '1 / 0.6', xlabel: R`\text{krok}`, ylabel: R`\tfrac12\lVert\mathbf{r}\rVert^2`, aria: 'Koszt po kolejnych działaniach' });
    const pC = new Plot({ xlog: true, ylog: true, ratio: '1 / 0.6', xlabel: R`\text{iteracja}`, ylabel: R`\tfrac12\lVert\mathbf{r}\rVert^2`, aria: 'Porównanie trzech metod z domyślnego punktu startowego' });
    const stats = Stats([['c', 'Koszt bieżący', 'costnow'], ['best', 'Koszt najlepszego dopasowania', 'bestcost'], ['half', R`Okres półtrwania $t_{1/2}$`], ['tmax', R`Czas osiągnięcia stężenia maksymalnego $t_{\max}$`], ['cmax', R`Stężenie maksymalne $C_{\max}$`]]);
    const info = el('div', 'card fbox'), cmpT = el('div', 'tblw');
    const plots = el('div', 'plots three');
    const cCard = plotCard('Trzy metody z domyślnego punktu startowego <small>skala podwójnie logarytmiczna</small>', pC, legend([['line', C.red, 'metoda Gaussa–Newtona'], ['dash', C.black, 'metoda Newtona'], ['line', C.green, 'spadek gradientu']]));
    plots.append(plotCard('Pomiary i model <small>odcinki: reszty</small>', pD, legend([['dot', C.black, 'pomiary'], ['line', C.red, 'model'], ['dash', C.ghost, 'model przed ostatnim krokiem']])),
      plotCard('Koszt po kolejnych działaniach', pH, '<p class="note">Każda zmiana położenia suwaka i każdy krok algorytmu dodaje punkt do wykresu.</p>'), cCard);
    cCard.append(cmpT);
    let prev = null;
    const sync = () => { const [a, b, v] = th.map(Math.exp); kaS.set(a, false); keS.set(b, false); vS.set(v, false); };
    function setTheta(t, fresh) { prev = null; th = [...t]; sync(); if (fresh) hist = []; hist.push(P.cost(th)); status.className = 'status'; status.textContent = fresh ? 'Domyślne parametry startowe: k_a = 1, k_e = 0.1, V = 30.' : ''; draw(); }
    function algo(kind) {
      const before = [...th]; let nx = th;
      if (kind === 'gd') { for (let i = 0; i < 100; i++) { const n = M.sub(nx, M.scale(P.grad(nx), 3e-4)); if (!M.finite(n) || !Number.isFinite(P.cost(n))) { nx = null; break; } nx = n; } }
      else if (kind === 'nt') { const p = M.solve(P.hess(th), M.scale(P.grad(th), -1)); nx = p && M.add(th, p); }
      else nx = M.gnStep(P, th).th;
      if (!nx || !M.finite(nx) || !Number.isFinite(P.cost(nx)) || nx.some(v => Math.abs(v) > 40)) { status.className = 'status bad'; status.textContent = 'Ten krok przeniósł parametry poza sensowny zakres. Skoryguj je suwakami albo wróć do domyślnego punktu startowego.'; return; }
      const c0 = P.cost(before), c1 = P.cost(nx); prev = before; th = nx; sync(); hist.push(c1);
      const name = { gn: 'Krok Gaussa–Newtona', nt: 'Krok Newtona', gd: '100 kroków spadku gradientu' }[kind];
      status.className = 'status' + (c1 > c0 * 1.0001 ? ' bad' : ''); status.textContent = `${name}: koszt ${num(c0, 5)} → ${num(c1, 5)}${c1 > c0 * 1.0001 ? ' (wzrósł!)' : ''}.`;
      draw();
    }
    function load(id) {
      P = M.pk(+id); cmp = M.pkRuns(P, M.PK_START); ref = cmp.gn.th;
      const lastC = r => r.fs[r.fs.length - 1], hl = r => Math.log(2) / Math.exp(r.th[1]), bestC = lastC(cmp.gn);
      const cell = r => (lastC(r) > bestC * 1.01 ? `<span style="color:var(--red)">${num(lastC(r), 5)}</span>` : num(lastC(r), 5));
      cmpT.innerHTML = `<table class="tbl tight"><thead><tr><th>Metoda</th><th>Liczba kroków</th><th>Koszt końcowy</th><th>${K('t_{1/2}')} [h]</th></tr></thead><tbody>
        <tr><td>Metoda Gaussa–Newtona</td><td>${cmp.gn.fs.length - 1}</td><td>${cell(cmp.gn)}</td><td>${num(hl(cmp.gn), 4)}</td></tr>
        <tr><td>Metoda Newtona</td><td>${cmp.newton.fs.length - 1}</td><td>${cell(cmp.newton)}</td><td>${lastC(cmp.newton) > bestC * 1.01 ? '—' : num(hl(cmp.newton), 4)}</td></tr>
        <tr><td>Metoda spadku gradientu</td><td>${cmp.gd.fs.length - 1}</td><td>${cell(cmp.gd)}</td><td>${num(hl(cmp.gd), 4)}</td></tr></tbody></table>`;
      info.innerHTML = `<div>${K(R`C(t)=\frac{D\,k_a}{V\,(k_a-k_e)}\big(e^{-k_e t}-e^{-k_a t}\big)`)}</div><div class="note">Pacjent ${id}: masa ciała ${P.wt} kg, dawka ${K(R`D=${tn(P.dpk)}\cdot${tn(P.wt)}=${tn(P.D, 4)}`)} mg, ${P.t.length} pomiarów.</div>`;
      pkCompare(pC, cmp, null);
      setTheta(M.PK_START, true);
    }
    function draw() {
      const [a, b] = th.map(Math.exp), c = P.cost(th), tm = Math.log(a / b) / (a - b), best = cmp.gn.fs[cmp.gn.fs.length - 1];
      pD.draw = q => drawPK(q, P, th, { prev }); pD.render();
      const ys = hist.slice(-80); pH.setView(0, Math.max(10, ys.length - 1), best * 0.6, Math.max(...ys, best * 4) * 1.5);
      pH.draw = q => { q.hline(best, { color: C.green, dash: [4, 4] }); const pts = ys.map((y, k) => [k, y]); q.path(pts, { color: C.black, width: 2 }); q.dots(pts, { color: C.black, r: 3 }); };
      pH.render();
      stats.set({ c: { t: num(c, 5), c: c < best * 1.01 ? 'good' : '' }, best: num(best, 5), half: num(Math.log(2) / b, 4) + ' h', tmax: Number.isFinite(tm) ? num(tm, 3) + ' h' : '—', cmax: Number.isFinite(tm) ? num(P.model(th, tm), 4) + ' mg/L' : '—' });
    }
    const manual = () => { prev = null; th = [Math.log(kaS.value), Math.log(keS.value), Math.log(vS.value)]; hist.push(P.cost(th)); status.className = 'status'; status.textContent = ''; draw(); };
    kaS.oninput = keS.oninput = vS.oninput = manual; sel.onchange = v => load(v);
    const pick = id => { sel.set(id, false); load(id); };
    root._live = () => {
      const [a, b, v] = th.map(Math.exp), tm = Math.log(a / b) / (a - b), c = `$${tn(P.cost(th), 5)}$`, vol = R`$V/F=${tn(v, 4)}$ L`;
      return { ka: R`$k_a=${tn(a, 4)}$ 1/h`, ke: R`$k_e=${tn(b, 4)}$ 1/h`, vol, VF: vol, costnow: c, cost: c, f: c, bestcost: `$${tn(cmp.gn.fs[cmp.gn.fs.length - 1], 5)}$`,
        thalf: R`$t_{1/2}=\ln 2/k_e=${tn(Math.log(2) / b, 4)}$ h`, tmax: R`$t_{\max}=${tn(tm, 3)}$ h`, Cmax: R`$C_{\max}=${tn(P.model(th, tm), 4)}$ mg/L`,
        dose: R`$D=${tn(P.D, 4)}$ mg`, theta: `$${tv(th, 4)}$`, thetaj: `$${tv(th, 4)}$` };
    };
    main.append(info, status, plots, stats.el, el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), Missions('pk', [
      { t: 'Wpływ poszczególnych parametrów', q: R`Zmieniaj położenie tylko **jednego** suwaka naraz. Przed każdą zmianą **zastanów się**, która część krzywej się zmieni: faza narastania, maksimum czy faza eliminacji?`,
        acts: [['Domyślny punkt startowy', () => setTheta(M.PK_START, true)]],
        a: R`Stała $k_a$ wpływa na początek krzywej: większa wartość oznacza szybsze narastanie oraz wcześniejsze i wyższe maksimum, natomiast faza eliminacji prawie się nie zmienia. Stała $k_e$ wpływa na fazę eliminacji: większa wartość oznacza szybszy spadek stężenia i krótszy okres półtrwania. Objętość $V$ skaluje całą krzywą w pionie: dwukrotnie większa objętość dystrybucji oznacza dwukrotnie mniejsze stężenia.` },
      { t: 'Dopasuj ręcznie, potem algorytmem', q: R`Zacznij od domyślnego punktu startowego i, używając wyłącznie suwaków, zmniejsz koszt poniżej $3$. Ilu zmian to wymagało? **Zastanów się:** ile kroków metody Gaussa–Newtona wystarczy z tego samego punktu startowego?`,
        acts: [['Domyślny punkt startowy', () => setTheta(M.PK_START, true)]],
        a: R`Od trzech do czterech kroków. Ręcznie zmieniasz jeden parametr naraz i oceniasz dopasowanie wzrokowo. Algorytm zmienia wszystkie trzy parametry jednocześnie, a z jakobianu wie, jak każda reszta zareaguje na zmianę każdego z nich. Ręczne dopasowanie ma jednak wartość: dobry punkt startowy ma kluczowe znaczenie dla każdej metody.` },
      { t: 'Tysiąc kroków a cztery kroki', q: R`Spójrz na trzeci wykres i tabelę pod nim (pacjent 1). **Spróbuj wyjaśnić:** dlaczego metoda spadku gradientu potrzebuje około tysiąca iteracji, skoro porusza się w kierunku najszybszego spadku?`,
        acts: [['Pacjent 1', () => pick(1)], ['100 kroków spadku gradientu', () => algo('gd')]],
        a: R`Antygradient jest kierunkiem najszybszego spadku tylko **lokalnie**. Dolina funkcji kosztu jest wydłużona (różne krzywizny w różnych kierunkach), więc współczynnik uczenia musi być mały ze względu na kierunek stromy, a wtedy postęp wzdłuż kierunku łagodnego jest powolny. Metody Newtona i Gaussa–Newtona skalują krok zgodnie z krzywizną i nie podlegają temu ograniczeniu.` },
      { t: 'Kiedy metoda Newtona zawodzi', q: R`Wybierz pacjenta 7 i spójrz na tabelę porównawczą. **Zastanów się:** czy wszystkie trzy metody osiągną ten sam koszt?`,
        acts: [['Pacjent 7', () => pick(7)], ['Pacjent 11', () => pick(11)], ['Krok Newtona', () => algo('nt')]],
        a: R`Nie. Metody Gaussa–Newtona i spadku gradientu znajdują dobre dopasowanie, a metoda Newtona kończy z kosztem ponad stukrotnie większym. Z dala od minimum pełny hesjan nie musi być dodatnio określony, a krok Newtona może prowadzić do obszaru, w którym funkcja kosztu jest niemal płaska i gradient zanika. Macierz $J^{\top}J$ jest zawsze dodatnio półokreślona, dlatego metoda Gaussa–Newtona jest tu bezpieczniejsza. Klikaj „Krok Newtona”, zaczynając od domyślnego punktu startowego, i obserwuj koszt.` },
      { t: 'Okres półtrwania u różnych pacjentów', q: R`Wybieraj kolejnych pacjentów i notuj wartości $t_{1/2}$ z tabeli porównawczej. **Zastanów się:** czy u wszystkich eliminacja leku przebiega z tą samą szybkością?`,
        acts: [['Pacjent 1', () => pick(1)], ['Pacjent 12', () => pick(12)], ['Pacjent 10', () => pick(10)]],
        a: R`Nie: okres półtrwania wynosi od około $6.5$ do $13$ godzin. To rzeczywista zmienność międzyosobnicza i powód, dla którego dawkowanie teofiliny ustala się indywidualnie. Zwróć uwagę, że $t_{1/2}$ zależy wyłącznie od $k_e$, czyli od nachylenia końcowego odcinka krzywej: decydują o nim głównie późne pomiary.` },
    ]));
    root.append(side, main); load(1);
    return { el: root };
  },
});
