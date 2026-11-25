/* =====================================================================
   TrajLab — shared sandbox for iterative methods on 2-D functions (used by topics 2–5).
   cfg: { fn, fns[], speed, maxSteps, controls(api) -> [controls], methods(api) -> [{name,color,dash,shape,init?,step(st,fn)}],
          onFn(fn, api), info(api) -> html, extraCol:{head, cell(run, fn)}, extra:{title, plot, legend, draw(runs)}, ghost(api) -> label, missions(api) }
   ===================================================================== */
function TrajLab(cfg) {
  const S = { fn: cfg.fn, x0: [...M.F[cfg.fn].start], k: 0 }, TOL = 1e-6, MAXS = cfg.maxSteps || 2000;
  let runs = [], ghosts = [];
  const root = el('div', 'lab'), side = el('aside', 'lab-side'), main = el('div', 'lab-main');
  const sel = Select({ label: '[[f|Funkcja kosztu]]', value: S.fn, options: cfg.fns.map(id => ({ v: id, label: M.F[id].label })) });
  const speed = Slider({ label: 'Szybkość animacji (kroków na sekundę)', aria: 'szybkość animacji', min: 1, max: 120, step: 1, value: cfg.speed || 10 });
  const api = {
    S, get fn() { return M.F[S.fn]; }, get runs() { return runs; },
    reset(keepGhosts = true) { runner.stop(); if (!keepGhosts) ghosts = []; S.k = 0; build(); status.className = 'status'; status.textContent = 'Nowy przebieg. Zastanów się, czego się spodziewasz, a następnie wykonaj krok lub uruchom animację.'; drawAll(); },
    setFn(id, x0) { const nx = [...(x0 || M.F[id].start)]; if (id !== S.fn || nx.some((v, i) => v !== S.x0[i])) ghosts = []; S.fn = id; sel.set(id, false); S.x0 = nx; if (cfg.onFn) cfg.onFn(M.F[id], api); api.reset(); },
    setStart(x) { S.x0 = [...x]; ghosts = []; api.reset(); },
    run() { api.reset(); runner.start(); },
  };
  const ctl = el('section', 'card'); ctl.innerHTML = '<h3 class="card-h">Ustawienia</h3>'; ctl.append(sel.el);
  cfg.controls(api).forEach(c => ctl.append(c.el || c));
  const startInfo = el('small', 'fix3'); ctl.append(startInfo);
  const status = el('p', 'status'); status.setAttribute('role', 'status');
  const bStep = Btn('Krok', '', () => { runner.stop(); advance(); drawAll(); });
  const bRun = Btn('▶ Uruchom', 'pri', () => { if (finished()) api.reset(); runner.toggle(); });
  const bReset = Btn('Od nowa', '', () => api.reset());
  const runCard = el('section', 'card'); runCard.innerHTML = '<h3 class="card-h">Przebieg</h3>';
  const row = el('div', 'btns'); row.append(bStep, bRun, bReset); runCard.append(row);
  if (cfg.ghost) {
    const r2 = el('div', 'btns');
    r2.append(Btn('Zachowaj przebieg do porównania', 'sm', () => { if (S.k === 0) return; runs.forEach(r => ghosts.push({ pts: r.pts.slice(), fs: r.fs.slice(), label: cfg.ghost(api) })); ghosts = ghosts.slice(-3); drawAll(); }),
      Btn('Usuń zachowane przebiegi', 'sm link', () => { ghosts = []; drawAll(); }));
    runCard.append(r2);
  }
  runCard.append(speed.el);
  side.append(ctl, runCard);

  const info = el('div', 'card fbox');
  const pF = new Plot({ equal: true, xlabel: 'x_0', ylabel: 'x_1', aria: 'Poziomice funkcji kosztu z trajektoriami metod' });
  const pC = new Plot({ ylog: true, xlabel: 'k', ylabel: R`f(\mathbf{x}^{(k)})-f^{*}`, aria: 'Historia kosztu w skali logarytmicznej' });
  const lg = el('div'), table = el('div', 'card tblw'), plots = el('div', 'plots' + (cfg.extra ? ' three' : ''));
  const fCard = plotCard('Trajektoria na tle poziomic <small>kliknij, aby wybrać punkt startowy</small>', pF); fCard.append(lg);
  plots.append(fCard, plotCard('Historia kosztu <small>skala logarytmiczna</small>', pC, '<p class="note">Linia przerywana: próg 10⁻⁶. Wartości poniżej 10⁻¹⁴ są rysowane na dolnej krawędzi wykresu.</p>'));
  if (cfg.extra) plots.append(plotCard(cfg.extra.title, cfg.extra.plot, cfg.extra.legend || ''));
  main.append(info, status, plots, table);
  if (cfg.missions) main.append(el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), Missions(cfg.missions(api)));
  root.append(side, main);

  function build() {
    const fn = api.fn;
    runs = cfg.methods(api).map(m => ({ m, st: m.init ? m.init(S.x0, fn) : { x: [...S.x0] }, pts: [[...S.x0]], fs: [fn.f(S.x0) - fn.fmin], hit: fn.f(S.x0) - fn.fmin < TOL ? 0 : null, halted: '' }));
    info.innerHTML = cfg.info ? cfg.info(api) : `<div>${K(fn.tex)}</div>`;
    startInfo.innerHTML = `Punkt startowy: ${K(R`\mathbf{x}^{(0)}=${tv(S.x0, 3)}`)}. Kliknij na wykresie poziomic, aby go zmienić.`;
    lg.innerHTML = legend([...runs.map(r => [r.m.dash ? 'dash' : 'line', r.m.color, r.m.name]), ...ghosts.map(g => ['line', C.ghost, g.label]).filter((v, i, a) => a.findIndex(w => w[2] === v[2]) === i), ['star', C.black, 'minimum']]);
  }
  const settled = r => r.halted || (r.fs.length > 1 && (r.gn < 1e-9 || r.fs[r.fs.length - 1] < 1e-13));
  const finished = () => S.k >= MAXS || runs.every(settled);
  function advance() {
    if (finished()) return false;
    const fn = api.fn; S.k++;
    for (const r of runs) {
      if (r.halted) continue;
      const ns = r.m.step(r.st, fn);
      if (!ns || !M.finite(ns.x) || M.norm(ns.x) > 1e7 || !Number.isFinite(fn.f(ns.x))) { r.halted = 'rozbieżność'; continue; }
      r.st = ns; r.pts.push(ns.x); const f = fn.f(ns.x) - fn.fmin; r.fs.push(f); r.gn = M.norm(fn.g(ns.x));
      if (r.hit === null && f < TOL) r.hit = S.k;
    }
    if (finished()) {
      runner.stop();
      const div = runs.filter(r => r.halted).map(r => r.m.name);
      status.className = 'status' + (div.length ? ' bad' : '');
      status.textContent = div.length ? `Rozbieżność: ${div.join(', ')}. Punkt wyszedł poza zakres obliczeń.` : S.k >= MAXS ? `Osiągnięto limit ${MAXS} kroków. To ograniczenie eksperymentu, a nie kryterium zbieżności.` : 'Koniec: norma gradientu zmalała praktycznie do zera, metody zatrzymały się w punkcie stacjonarnym.';
      return false;
    }
    return true;
  }
  function drawAll() {
    const fn = api.fn;
    pF.setView(...fn.view);
    pF.draw = q => {
      drawField(q, fn);
      ghosts.forEach(g => drawRun(q, g.pts, { color: C.ghost, ghost: true, width: 1.8 }));
      runs.forEach(r => drawRun(q, r.pts, { color: r.m.color, dash: r.m.dash, shape: r.m.shape }));
      q.dots([S.x0], { fill: '#fff', stroke: C.black, color: C.black, r: 4.5 });
    };
    pF.render();
    drawCost(pC, [...ghosts.map(g => ({ ys: g.fs, color: C.ghost, width: 1.8 })), ...runs.map(r => ({ ys: r.fs, color: r.m.color, dash: r.m.dash }))], { level: TOL });
    if (cfg.extra) cfg.extra.draw(runs, api);
    const ex = cfg.extraCol;
    const cols = ex ? [20, 6, 19, 10, 10, 20, 15] : [22, 7, 22, 12, 12, 25];
    table.innerHTML = `<table class="tbl fixedt"><colgroup>${cols.map(c => `<col style="width:${c}%">`).join('')}</colgroup><thead><tr><th>Metoda</th><th>${K('k')}</th><th>${K(R`\mathbf{x}^{(k)}`)}</th><th>${K(R`f-f^{*}`)}</th><th>${K(R`\lVert\nabla f\rVert`)}</th><th data-g="hit">Pierwsze ${K('k')}, dla którego ${K(R`f-f^{*}<10^{-6}`)}</th>${ex ? `<th${ex.g ? ` data-g="${ex.g}"` : ''}>${mdi(ex.head)}</th>` : ''}</tr></thead><tbody>` +
      runs.map(r => { const x = r.pts[r.pts.length - 1]; return `<tr><td style="color:${r.m.color};font-weight:600">${r.m.name}<small class="${r.halted ? 'bad' : ''}">${r.halted || '&nbsp;'}</small></td><td>${r.pts.length - 1}</td><td>${vecs(x, 5)}</td><td>${num(r.fs[r.fs.length - 1], 4)}</td><td>${num(M.norm(fn.g(x)), 4)}</td><td>${r.hit === null ? '—' : r.hit}</td>${ex ? `<td>${ex.cell(r, fn)}</td>` : ''}</tr>`; }).join('') + '</tbody></table>';
    bStep.disabled = finished();
  }
  const runner = Runner(advance, () => speed.value, on => { bRun.textContent = on ? '❚❚ Pauza' : '▶ Uruchom'; });
  runner.onframe = drawAll;
  sel.onchange = v => { ghosts = []; api.setFn(v); };
  pF.pickable((x, y) => { const v = api.fn.view; api.setStart([Math.max(v[0], Math.min(v[1], x)), Math.max(v[2], Math.min(v[3], y))].map(c => parseFloat(c.toFixed(2)))); });
  if (cfg.onFn) cfg.onFn(api.fn, api);
  api.reset();
  return { el: root, api };
}

/* =====================================================================
   Topic 2 — gradient descent and the step-size condition (Zadanie 1, part 2)
   ===================================================================== */
TOPICS.push({
  id: 'spadek', n: 2, title: 'Metoda spadku gradientu (gradient descent)', short: 'Spadek gradientu', task: 'Metoda pierwszego rzędu',
  menu: 'Jedna iteracja rozpisana na liczbach, a następnie trzy charakterystyczne przypadki: zbieżność, oscylacje i rozbieżność. Skąd bierze się warunek stabilności $\\alpha<2/L$?',
  icon: `<ellipse cx="62" cy="34" rx="46" ry="24"/><ellipse cx="62" cy="34" rx="28" ry="14"/><ellipse cx="62" cy="34" rx="11" ry="5"/><path class="a" d="M14 16 L32 46 L44 24 L54 40 L60 32"/><circle class="p" cx="62" cy="34" r="3.5"/>`,

  walk() {
    const fn = M.F.bowl, x0 = [-3, 4];
    return Walk({
      intro: R`**Po co?** Metoda spadku gradientu (gradient descent), w polskiej literaturze nazywana też metodą gradientu prostego, to najprostszy algorytm minimalizacji i punkt wyjścia dla wszystkich pozostałych. Jest to pętla powtarzająca jedną operację: krok w kierunku przeciwnym do gradientu. Prześledź tę operację na liczbach, zanim zapiszesz ją w kodzie.

Numer iteracji zapisujemy w indeksie górnym, w nawiasie: $\mathbf{x}^{(k)}$ oznacza punkt po $k$ krokach. Dzięki temu nie myli się on z numerem współrzędnej ($x_0$, $x_1$). W literaturze ten sam wzór zapisuje się często jako $x_{k+1}=x_k-\alpha\,\nabla f(x_k)$. Liczba $\alpha$ to współczynnik uczenia (learning rate), nazywany też tempem uczenia; w teorii optymalizacji mówi się o długości kroku (step size).`,
      params: [{ id: 'a', label: R`Współczynnik uczenia $\alpha$`, value: 0.1, options: [{ v: 0.05, label: '$0.05$' }, { v: 0.1, label: '$0.1$' }, { v: 0.38, label: '$0.38$' }, { v: 0.45, label: '$0.45$' }] }],
      algo: {
        title: 'Algorytm: metoda spadku gradientu (w nawiasach: zapis w PyTorch)',
        lines: [
          R`$\mathbf{x}$ ← punkt startowy <span class="cm">(liść grafu obliczeń: <code>requires_grad=True</code>)</span>`,
          R`**powtórz** zadaną liczbę razy:`,
          R`    oblicz $f(\mathbf{x})$ i gradient <span class="cm">(<code>f(x).backward()</code> wypełnia <code>x.grad</code>)</span>`,
          R`    $\mathbf{x}_{\text{nowy}}$ ← $\mathbf{x}-\alpha\cdot\nabla f(\mathbf{x})$ <span class="cm">(w bloku <code>torch.no_grad()</code>)</span>`,
          R`    $\mathbf{x}$ ← nowy liść grafu utworzony z $\mathbf{x}_{\text{nowy}}$ <span class="cm">(<code>detach</code>, <code>clone</code>, <code>requires_grad_</code>)</span>`,
          R`    zapisz $\mathbf{x}$ oraz $f(\mathbf{x})$`,
          R`**zwróć** trajektorię i historię kosztu`,
        ],
      },
      logTitle: 'Trajektoria i historia kosztu',
      logHead: ['$k$', '$x_0^{(k)}$', '$x_1^{(k)}$', R`$f(\mathbf{x}^{(k)})$`],
      visual(card) {
        const p = new Plot({ equal: true, xlabel: 'x_0', ylabel: 'x_1', aria: 'Poziomice funkcji kwadratowej z trajektorią metody spadku gradientu' });
        card.innerHTML = `<div class="plot-t">${mdi(R`Funkcja kwadratowa („miska”) <small>poziomice $f$, gwiazdka: minimum $(2,\,-1)$</small>`)}</div>`;
        card.append(p.el);
        card.insertAdjacentHTML('beforeend', legend([['line', C.green, 'trajektoria'], ['line', C.ghost, 'kierunek gradientu $\\nabla f$'], ['dash', C.red, 'planowany krok $-\\alpha\\nabla f$']]));
        return {
          draw(s) {
            const far = s.pts.some(q => Math.abs(q[0]) > 5.5 || Math.abs(q[1]) > 5.5);
            p.setView(...(far ? [-7, 7, -7, 7] : fn.view));
            p.draw = q => {
              drawField(q, fn);
              drawRun(q, s.pts, { color: C.green });
              const x = s.pts[s.pts.length - 1];
              if (s.g) { const k = 1.3 / M.norm(s.g); q.arrow(x[0], x[1], x[0] + s.g[0] * k, x[1] + s.g[1] * k, { color: C.ghost, width: 2.6 }); q.label(x[0] + s.g[0] * k, x[1] + s.g[1] * k, [['∇', 'r'], ['f', 'm']], { dx: 8, dy: -6, color: C.ink2 }); }
              if (s.to) { q.arrow(x[0], x[1], s.to[0], s.to[1], { color: C.red, width: 2.4, dash: [6, 4] }); q.dots([s.to], { fill: '#fff', stroke: C.red, color: C.red, r: 4.5 }); }
            };
            p.render();
          },
        };
      },
      build(pv) {
        const a = pv.a, fr = [], pts = [[...x0]], NIT = 4;
        let x = [...x0];
        fr.push({
          group: 'Punkt wyjścia', title: 'Funkcja, punkt startowy i współczynnik uczenia', line: 0, state: { pts: [[...x]] }, log: [0, num(x[0]), num(x[1]), num(fn.f(x))],
          html: md(R`Minimalizujemy funkcję kwadratową („miskę”):
$$f(\mathbf{x})=\tfrac12\big[(x_0-2)^2+5\,(x_1+1)^2\big]$$
Punkt startowy: $\mathbf{x}^{(0)}=(-3,\ 4)$, wartość funkcji kosztu $f(\mathbf{x}^{(0)})=${tn(fn.f(x))}$, współczynnik uczenia $\alpha=${tn(a)}$.

Minimum znajduje się w punkcie $(2,\,-1)$, ale algorytm tego nie wie. W każdym kroku zna wyłącznie wartość funkcji i gradient **w bieżącym punkcie**.`),
        });
        fr.push({
          group: 'Punkt wyjścia', title: 'Wzór na gradient: pochodne cząstkowe', line: 2, state: { pts: [[...x]] },
          html: md(R`Gradient to wektor pochodnych cząstkowych, po jednej dla każdej zmiennej:
$$\nabla f(\mathbf{x})=\Big(\frac{\partial f}{\partial x_0},\ \frac{\partial f}{\partial x_1}\Big)$$
**Pochodna względem $x_0$.** Zmienną $x_1$ traktujemy jak stałą, więc składnik $5\,(x_1+1)^2$ ma pochodną równą zeru. Pozostaje $\tfrac12(x_0-2)^2$, a pochodną kwadratu jest podwojona podstawa:
$$\frac{\partial f}{\partial x_0}=\tfrac12\cdot 2\,(x_0-2)=x_0-2$$
**Pochodna względem $x_1$.** Teraz stałą jest $x_0$, więc znika pierwszy składnik:
$$\frac{\partial f}{\partial x_1}=\tfrac12\cdot 5\cdot 2\,(x_1+1)=5\,(x_1+1)$$
Otrzymujemy wzór, z którego korzystamy w każdej iteracji:
$$\nabla f(\mathbf{x})=\big(x_0-2,\ \ 5\,(x_1+1)\big)$$`),
        });
        for (let k = 0; k < NIT; k++) {
          const g = fn.g(x), d = M.scale(g, -a), xn = M.add(x, d), f0 = fn.f(x), f1 = fn.f(xn);
          const group = R`Iteracja ${k + 1}: z $\mathbf{x}^{(${k})}$ do $\mathbf{x}^{(${k + 1})}$`, cur = pts.map(q => [...q]);
          fr.push({
            group, title: 'Gradient w bieżącym punkcie', line: 2, state: { pts: cur, g },
            html: md(R`Bieżący punkt: $\mathbf{x}^{(${k})}=${tv(x)}$, czyli $x_0=${tn(x[0])}$ oraz $x_1=${tn(x[1])}$. Podstawiamy te wartości do wzorów na pochodne cząstkowe:
$$\begin{aligned}\frac{\partial f}{\partial x_0}&=x_0-2&&=${tp(x[0])}-2&&=${tn(g[0])}\\[3pt] \frac{\partial f}{\partial x_1}&=5\,(x_1+1)&&=5\cdot(${tn(x[1])}+1)&&=${tn(g[1])}\end{aligned}$$
Obie pochodne tworzą gradient w bieżącym punkcie:
$$\nabla f(\mathbf{x}^{(${k})})=\Big(\frac{\partial f}{\partial x_0},\ \frac{\partial f}{\partial x_1}\Big)=${tv(g)}$$
${k === 0 ? R`Gradient wskazuje kierunek **najszybszego wzrostu** funkcji (szara strzałka, prostopadła do poziomicy). W programie tę operację wykonuje zwykle mechanizm automatycznego różniczkowania (autograd).` : R`Norma gradientu: $\lVert\nabla f\rVert=${tn(M.norm(g), 4)}$. ${M.norm(g) < M.norm(fn.g(pts[pts.length - 2] || x)) ? 'Jest mniejsza niż w poprzednim kroku: zbocze staje się łagodniejsze.' : 'Jest większa niż w poprzednim kroku: oddalamy się od minimum.'}`}`),
          });
          fr.push({
            group, title: R`Krok: w kierunku przeciwnym do gradientu, przeskalowany przez $\alpha$`, line: 3, state: { pts: cur, g, to: xn },
            html: md(R`$$-\alpha\,\nabla f(\mathbf{x}^{(${k})})=-${tn(a)}\cdot${tv(g)}=${tv(d)}$$
${k === 0 ? R`Sam współczynnik $\alpha$ nie jest długością kroku. Długość kroku wynosi $\alpha\cdot\lVert\nabla f\rVert$: na stromym zboczu ten sam współczynnik daje długi krok, a w pobliżu minimum krótki.` : R`Długość kroku: $\alpha\cdot\lVert\nabla f\rVert=${tn(a * M.norm(g), 4)}$.`}`),
          });
          const eqL = R`\mathbf{x}^{(${k + 1})}`, eq1 = R`\mathbf{x}^{(${k})}-\alpha\,\nabla f(\mathbf{x}^{(${k})})`, eq2 = R`${tv(x)}+${tv(d)}`;
          pts.push([...xn]);
          const after = pts.map(q => [...q]);
          const full = md(R`$$${al(eqL, eq1, eq2, tv(xn))}$$ Obie współrzędne aktualizujemy **jednocześnie**, na podstawie tego samego gradientu.`);
          fr.push(k === 1
            ? { group, title: 'Nowy punkt: Twoja kolej', line: [3, 4], state: { pts: cur, g, to: xn }, html: md(R`$$${al(eqL, eq1, eq2, R`\big(\ ?\ ,\ ${tn(xn[1])}\big)`)}$$`), quiz: { prompt: R`Oblicz $x_0^{(2)}$ i wpisz wynik:`, answer: xn[0], reveal: full } }
            : { group, title: 'Nowy punkt', line: [3, 4], state: { pts: after }, html: full });
          fr.push({
            group, title: 'Czy koszt zmalał? Zapisz wynik', line: 5, state: { pts: after }, log: [k + 1, num(xn[0]), num(xn[1]), num(f1)],
            html: md(R`$$f(\mathbf{x}^{(${k + 1})})=\tfrac12\big[(${tn(xn[0])}-2)^2+5\,(${tn(xn[1])}+1)^2\big]=${tn(f1)}$$
Koszt ${f1 < f0 ? '**zmalał**' : '**wzrósł**'}: $${tn(f0)}\ \to\ ${tn(f1)}$. ${f1 < f0 ? '' : 'To sygnał ostrzegawczy: krok jest zbyt długi.'} Punkt i wartość kosztu dopisujemy do historii.` +
              (k === 0 ? '\n\n' + R`W kodzie trzeba pamiętać o jeszcze jednej rzeczy: po aktualizacji należy odtworzyć $\mathbf{x}$ jako **nowy liść** grafu obliczeń (leaf tensor). W przeciwnym razie PyTorch będzie sumował nowe gradienty z poprzednimi.` : '')),
          });
          x = xn;
        }
        const m0 = 1 - a, m1 = 1 - 5 * a;
        const verdict = Math.abs(m1) > 1 ? R`$|${tn(m1)}|>1$: błąd w kierunku $x_1$ **rośnie** co do modułu w każdym kroku. To rozbieżność.` : m1 < 0 ? R`Mnożnik $${tn(m1)}$ jest ujemny: błąd w $x_1$ w każdym kroku **zmienia znak**, czyli punkt przeskakuje na przeciwną stronę doliny. To oscylacje („zygzak”). Ponieważ $|${tn(m1)}|<1$, ich amplituda maleje i metoda jest zbieżna.` : R`Oba mnożniki leżą między $0$ a $1$: błąd maleje monotonicznie, bez oscylacji.`;
        fr.push({
          group: 'Wniosek', title: R`Rola współczynnika $\alpha$: mnożniki błędu`, line: 3, state: { pts: pts.map(q => [...q]) },
          html: md(R`Spójrz na tabelę: odległość od minimum zmienia się w każdym kroku o **stały czynnik**. Dla tej funkcji wynika to wprost ze wzoru. Po odjęciu współrzędnych minimum $(2,-1)$ otrzymujemy:
$$x_0-2\ \leftarrow\ (1-\alpha)\,(x_0-2),\qquad x_1+1\ \leftarrow\ (1-5\alpha)\,(x_1+1)$$
Dla $\alpha=${tn(a)}$ mnożniki wynoszą $${tn(m0)}$ oraz $${tn(m1)}$. ${verdict}`) +
            box('def', 'Warunek stabilności', R`Błąd maleje tylko wtedy, gdy moduł każdego mnożnika jest mniejszy od $1$. Najtrudniej spełnić ten warunek dla **największej** krzywizny $L$, czyli stałej Lipschitza gradientu (tutaj $L=5$):
$$|1-\alpha L|<1\quad\Longleftrightarrow\quad 0<\alpha<\frac{2}{L}=0.4$$`),
        });
        fr.push({
          group: 'Wniosek', title: 'Wskazówki do samodzielnej implementacji', line: [2, 3, 4, 5], state: { pts: pts.map(q => [...q]) },
          html: box('nb', 'Implementacja', R`Wypróbuj swoją implementację dla $\alpha=0.05$ (zbieżność monotoniczna), $0.38$ (oscylacje) i $0.45$ (rozbieżność). Zmień $\alpha$ u góry strony i sprawdź, czy potrafisz wyjaśnić każde z tych trzech zachowań.

Wygodnie jest zwracać **wszystkie** punkty, łącznie z punktem startowym, oraz odpowiadające im wartości kosztu: z takich danych łatwo narysować trajektorię i historię kosztu.`) +
            box('warn', 'Pułapka automatycznego różniczkowania', R`Jeśli nie odtworzysz $\mathbf{x}$ jako nowego liścia grafu obliczeń, gradienty z kolejnych kroków będą się **kumulować** w <code>x.grad</code>, a trajektoria odbiegnie od oczekiwanej. To najczęstsza przyczyna błędu w implementacji tej metody.`),
        });
        return fr;
      },
    });
  },

  lab() {
    let aS;
    const RANGE = { bowl: [0.005, 0.6, 0.005, 0.05], valley: [0.0002, 0.03, 0.0002, 0.0198], cosh: [0.01, 1, 0.01, 0.1], twin: [0.005, 0.3, 0.005, 0.05] };
    const lab = TrajLab({
      fn: 'bowl', fns: ['bowl', 'valley', 'cosh', 'twin'], speed: 10,
      controls(api) {
        aS = Slider({ label: R`Współczynnik uczenia $\alpha$`, aria: 'współczynnik uczenia alfa', min: 0.005, max: 0.6, step: 0.005, value: 0.05 });
        aS.oninput = () => api.reset();
        return [aS];
      },
      onFn(fn) { const r = RANGE[fn.id]; aS.setRange(r[0], r[1], r[2], r[3]); },
      methods: () => [{ name: 'Spadek gradientu', color: C.green, step: (st, fn) => ({ x: M.gdStep(fn, st.x, aS.value) }) }],
      ghost: () => `zachowany przebieg: α = ${num(aS.value, 4)}`,
      info(api) {
        const fn = api.fn, a = aS.value;
        if (!fn.eig) return `<div>${K(fn.tex)}</div><div class="note">Ta funkcja nie jest kwadratowa: krzywizna zależy od punktu, więc nie istnieje jedna granica ${K(R`2/L`)} wspólna dla całej płaszczyzny.</div>`;
        const [m, L] = fn.eig, top = 2.6 / L, pct = v => (100 * Math.min(v, top) / top).toFixed(2) + '%';
        const m0 = 1 - a * m, m1 = 1 - a * L, fx = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(3);
        return `<div>${K(fn.tex)}</div>
        <div class="note kvs"><span>Mnożniki błędu w jednym kroku:</span><span class="kv">${K(R`1-\alpha m`)} = <b>${fx(m0)}</b></span><span class="kv">${K(R`1-\alpha L`)} = <b>${fx(m1)}</b></span><span>Optymalny współczynnik: ${K(R`\alpha^{*}=\tfrac{2}{m+L}=${tn(2 / (m + L), 3)}`)}</span></div>
        <div class="gauge" aria-label="Położenie alfa względem granicy stabilności">
          <div class="gauge-bar"><span style="width:${pct(1 / L)};background:${C.greenT2}">monotonicznie</span><span style="width:${pct(1 / L)};background:${C.greyT}">oscylacje</span><span style="flex:1;background:${C.redT2}">rozbieżność</span><i style="left:${pct(a)}"></i></div>
          <div class="gauge-l"><span style="left:${pct(1 / L)}">${K(R`1/L=${tn(1 / L, 3)}`)}</span><span style="left:${pct(2 / L)}">${K(R`2/L=${tn(2 / L, 3)}`)}</span></div>
        </div>`;
      },
      missions(api) {
        const set = (fn, a, x0) => { api.setFn(fn, x0); aS.set(a, false); api.run(); };
        return [
          { t: R`Trzy charakterystyczne wartości $\alpha$`, q: R`Funkcja kwadratowa („miska”), punkt startowy $(-3,\,4)$. **Zastanów się**, co stanie się dla $\alpha=0.05$, $0.38$ i $0.45$: czy koszt będzie malał i jak będzie przebiegać trajektoria? Po każdym przebiegu kliknij „Zachowaj przebieg do porównania”, aby zestawić wszystkie trzy.`,
            acts: [['$\\alpha=0.05$', () => set('bowl', 0.05)], ['$\\alpha=0.38$', () => set('bowl', 0.38)], ['$\\alpha=0.45$', () => set('bowl', 0.45)]],
            a: R`$0.05$: zbieżność monotoniczna (mnożniki $0.95$ i $0.75$). $0.38$: mnożnik w kierunku stromym wynosi $1-5\cdot0.38=-0.9$, więc punkt przeskakuje na przemian na obie strony doliny, za każdym razem bliżej jej dna. $0.45$: mnożnik $-1.25$, czyli każde kolejne wychylenie jest o $25\%$ większe. To trzy podstawowe zachowania metody spadku gradientu.` },
          { t: 'Dokładnie na granicy stabilności', q: R`Ustaw $\alpha=0.40$. **Zastanów się:** zbieżność, rozbieżność czy jeszcze coś innego?`,
            acts: [['$\\alpha=0.40$', () => set('bowl', 0.4)], ['$\\alpha=0.39$', () => set('bowl', 0.39)], ['$\\alpha=0.41$', () => set('bowl', 0.41)]],
            a: R`Mnożnik w kierunku stromym wynosi dokładnie $-1$: współrzędna $x_1$ bez końca przeskakuje między dwiema wartościami, a koszt przestaje maleć. Tuż poniżej granicy ($0.39$) metoda jest zbieżna, ale bardzo wolno, a tuż powyżej ($0.41$) powoli się rozbiega.` },
          { t: 'Optymalny współczynnik uczenia', q: R`Znajdź $\alpha$, dla którego liczba kroków do $f<10^{-6}$ (ostatnia kolumna tabeli) jest najmniejsza. **Zastanów się:** czy będzie to wartość tuż poniżej granicy $0.4$?`,
            acts: [['$\\alpha=1/3$', () => set('bowl', 0.333)], ['$\\alpha=0.2$', () => set('bowl', 0.2)]],
            a: R`Nie. Zbieżność jest najszybsza dla $\alpha^{*}=\frac{2}{m+L}=\frac13$ (około $23$ kroków): wtedy oba mnożniki mają ten sam moduł $\frac{\kappa-1}{\kappa+1}=\frac23$. Większe $\alpha$ przyspiesza zbieżność w kierunku łagodnym, ale pogarsza ją w kierunku stromym.` },
          { t: 'Wąska dolina', q: R`Wybierz funkcję o wąskiej dolinie ($\kappa=100$) i $\alpha=0.0198$. **Zastanów się:** ilu kroków potrzeba teraz, aby uzyskać $f<10^{-6}$: dziesiątek czy setek?`,
            acts: [['Wąska dolina, $\\alpha=0.0198$', () => set('valley', 0.0198)]],
            a: R`Ponad $500$. Granica stabilności zmalała do $2/L=0.02$, więc współczynnik uczenia musi być bardzo mały, a wtedy w kierunku łagodnym błąd maleje zaledwie o $2\%$ na krok. Im większy wskaźnik uwarunkowania (condition number) $\kappa=L/m$, nazywany też liczbą warunkową, tym wolniejsza zbieżność metody spadku gradientu. Rozwiązanie: metoda z momentem (następny temat).` },
          { t: 'Dwie doliny', q: R`Funkcja niewypukła (non-convex), $\alpha=0.05$. Uruchom metodę z kilku punktów startowych po lewej i po prawej stronie. **Zastanów się:** czy metoda zawsze znajdzie głębszą dolinę?`,
            acts: [['Start z prawej strony', () => set('twin', 0.05, [0.35, 1.9])], ['Start z lewej strony', () => set('twin', 0.05, [-0.4, 1.9])]],
            a: R`Nie. Metoda spadku gradientu schodzi do tej doliny, w której rozpoczęła obliczenia. Startując z prawej strony, kończy w minimum **lokalnym**, a wykres kosztu stabilizuje się na stałym poziomie, zamiast maleć do zera. Dla funkcji niewypukłych wynik zależy od punktu startowego.` },
        ];
      },
    });
    return lab;
  },
});
