/* =====================================================================
   Topic 6 — Gauss–Newton for nonlinear least squares, Michaelis–Menten kinetics (Zadanie 4)
   ===================================================================== */
const MM_LEVELS = [60, 90, 150, 300, 600, 1200, 2500, 5000, 10000, 20000, 40000, 80000];
function mmDataPlot(ratio = '1 / 0.66') { return new Plot({ ratio, xlabel: 's', ylabel: 'v', aria: 'Pomiary szybkości reakcji i krzywa modelu Michaelisa-Menten' }).setView(0, 1.2, 0, 260); }
function drawMM(q, P, th, o = {}) {
  if (o.prev) q.fn(s => P.model(o.prev, s), { color: C.ghost, width: 1.6, dash: [5, 4] });
  if (th && M.finite(th)) {
    q.fn(s => P.model(th, s), { color: C.red, width: 2.4 });
    if (o.sticks !== false) P.s.forEach((s, i) => q.seg(s, P.v[i], s, P.model(th, s), { color: C.red, width: 1.3, alpha: .75 }));
    if (th[0] > 0 && th[0] < 260) { q.hline(th[0], { color: C.ink3, dash: [2, 4], width: 1 }); q.label(1.18, th[0], [['V', 'm'], ['max', 'sub']], { align: 'right', dy: -11, color: C.ink2, size: 14 }); }
  }
  q.dots(P.s.map((s, i) => [s, P.v[i]]), { color: C.black, r: 4, stroke: '#fff', lw: 1.2 });
}

TOPICS.push({
  id: 'gauss-newton', n: 6, title: 'Metoda Gaussa–Newtona', short: 'Gauss–Newton', task: 'Dopasowanie modelu do danych',
  menu: 'Dopasowanie modelu nieliniowego do pomiarów, czyli nieliniowe zadanie najmniejszych kwadratów (nonlinear least squares). Każdy krok to jedno liniowe zadanie najmniejszych kwadratów.',
  icon: `<path d="M8 62 H112 M8 62 V8"/><path class="a" d="M8 62 C22 20 50 16 110 14"/><circle class="p" cx="18" cy="42" r="3"/><circle class="p" cx="34" cy="26" r="3"/><circle class="p" cx="58" cy="22" r="3"/><circle class="p" cx="92" cy="12" r="3"/>`,

  walk() {
    const P = M.mm();
    return Walk({
      intro: R`**Po co?** Dopasowanie modelu do danych to minimalizacja sumy kwadratów **reszt** (residuals), czyli różnic między wartościami modelu a pomiarami. Ta szczególna postać funkcji kosztu pozwala zbudować krok Newtona bez obliczania hesjanu: wystarczy jakobian (Jacobian) reszt, czyli macierz ich pierwszych pochodnych. Poniżej metoda Gaussa–Newtona krok po kroku na przykładowych danych: $12$ pomiarach szybkości reakcji enzymatycznej.`,
      params: [{ id: 's', label: R`Punkt startowy $(V_{\max},\ K_m)$`, value: 'a', options: [{ v: 'a', label: '$(150,\\ 0.1)$' }, { v: 'b', label: '$(280,\\ 0.03)$' }] }],
      algo: {
        title: 'Algorytm: metoda Gaussa–Newtona',
        lines: [
          R`$\boldsymbol\theta$ ← punkt startowy`,
          R`**powtórz** zadaną liczbę razy:`,
          R`    $\mathbf{r}$ ← wektor reszt <span class="cm">(<code>residual_fn(theta)</code>)</span>`,
          R`    $J$ ← jakobian reszt <span class="cm">(<code>jacobian(residual_fn, theta)</code>)</span>`,
          R`    $\mathbf{p}$ ← rozwiązanie $J^{\top}J\,\mathbf{p}=-J^{\top}\mathbf{r}$ <span class="cm">(<code>torch.linalg.solve</code>)</span>`,
          R`    $\boldsymbol\theta$ ← $\boldsymbol\theta+\mathbf{p}$`,
          R`    zapisz $\boldsymbol\theta$ oraz koszt $\tfrac12\lVert\mathbf{r}\rVert^2$`,
          R`**zwróć** trajektorię parametrów i historię kosztu`,
        ],
      },
      logTitle: 'Historia dopasowania',
      logHead: ['$k$', R`$V_{\max}$`, '$K_m$', R`koszt $\tfrac12\lVert\mathbf{r}\rVert^2$`],
      visual(card) {
        const pD = mmDataPlot('1 / 0.5'), pP = new Plot({ ratio: '1 / 0.46', xlabel: R`V_{\max}`, ylabel: 'K_m', aria: 'Poziomice kosztu w przestrzeni parametrów z trajektorią metody' }).setView(100, 320, 0, 0.16);
        card.innerHTML = `<div class="plot-t">${mdi(R`Dane i model <small>pionowe odcinki: reszty $r_i$</small>`)}</div>`;
        card.append(pD.el);
        card.insertAdjacentHTML('beforeend', legend([['dot', C.black, 'pomiary'], ['line', C.red, 'model dla bieżących parametrów'], ['dash', C.ghost, 'model przed krokiem']]) + `<div class="plot-t" style="margin-top:14px">${mdi(R`Koszt w przestrzeni parametrów <small>poziomice $\tfrac12\lVert\mathbf{r}\rVert^2$</small>`)}</div>`);
        card.append(pP.el);
        return {
          draw(s) {
            pD.draw = q => drawMM(q, P, s.th, { prev: s.prev });
            pD.render();
            pP.draw = q => {
              q.contour('mm', P.cost, MM_LEVELS, { n: 110 });
              drawRun(q, s.path, { color: C.red, shape: 'sq' });
              if (s.cand) { const a = s.path[s.path.length - 1]; q.arrow(a[0], a[1], s.cand[0], s.cand[1], { color: C.red, width: 2, dash: [6, 4] }); q.dots([s.cand], { fill: '#fff', stroke: C.red, color: C.red, r: 4.5 }); }
              q.star(214.6868, 0.0671952);
            };
            pP.render();
          },
        };
      },
      build(pv) {
        let th = pv.s === 'a' ? [150, 0.1] : [280, 0.03];
        const fr = [], path = [[...th]], c0 = P.cost(th);
        const tbl = (head, rows) => `<div class="tblw"><table class="tbl tight"><thead><tr>${head.map(h => `<th>${mdi(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        fr.push({
          group: 'Punkt wyjścia', title: 'Model, dane i reszty', line: 0, state: { th: [...th], path: [[...th]] }, log: [0, num(th[0], 6), num(th[1], 4), num(c0, 6)],
          html: md(R`Równanie Michaelisa–Menten opisuje szybkość reakcji enzymatycznej $v$ w funkcji stężenia substratu $s$:
$$v(s)=\frac{V_{\max}\,s}{K_m+s}$$
$V_{\max}$ to szybkość maksymalna (poziom nasycenia enzymu), a $K_m$ to stała Michaelisa: stężenie substratu, przy którym szybkość osiąga połowę $V_{\max}$. Parametry zapisujemy jako wektor $\boldsymbol\theta=(V_{\max},\ K_m)$.

Dla każdego pomiaru $(s_i,\ v_i)$ obliczamy **resztę**, czyli różnicę między wartością modelu a pomiarem. Funkcja kosztu to połowa sumy kwadratów reszt:
$$r_i(\boldsymbol\theta)=\frac{V_{\max}\,s_i}{K_m+s_i}-v_i,\qquad f(\boldsymbol\theta)=\tfrac12\sum_{i=1}^{12}r_i^2$$
Punkt startowy: $\boldsymbol\theta^{(0)}=${tv(th)}$. Czerwona krzywa wyraźnie odbiega od punktów pomiarowych: koszt wynosi $${tn(c0, 6)}$.`),
        });
        for (let k = 0; k < 6; k++) {
          const st = M.gnStep(P, th), nth = st.th, cur = path.map(q => [...q]), cN = P.cost(nth), cO = P.cost(th);
          if (k < 2) {
            const group = R`Iteracja ${k + 1}: z $\boldsymbol\theta^{(${k})}$ do $\boldsymbol\theta^{(${k + 1})}$`;
            fr.push({
              group, title: 'Reszty: jak duże są błędy modelu?', line: 2, state: { th: [...th], path: cur },
              html: md(R`Dla $\boldsymbol\theta^{(${k})}=${tv(th, 5)}$ podstawiamy każde $s_i$ do modelu i od wyniku odejmujemy pomiar:`) +
                tbl(['$i$', '$s_i$', 'pomiar $v_i$', 'model', 'reszta $r_i$'], P.s.map((s, i) => [i + 1, num(s), num(P.v[i], 5), num(P.model(th, s), 5), num(st.r[i], 4)])) +
                md(R`Koszt: $\tfrac12\lVert\mathbf{r}\rVert^2=${tn(cO, 6)}$. ${st.r.every(v => v < 0) ? 'Wszystkie reszty są ujemne: krzywa modelu leży poniżej punktów pomiarowych, więc $V_{\\max}$ jest zbyt małe.' : ''}`),
            });
            fr.push({
              group, title: 'Jakobian: wrażliwość reszt na parametry', line: 3, state: { th: [...th], path: cur },
              html: md(R`Jakobian $J$ ma jeden wiersz dla każdego pomiaru i jedną kolumnę dla każdego parametru. Element $J_{ij}$ określa, jak zmienia się reszta $r_i$ przy małej zmianie parametru $\theta_j$:
$$\frac{\partial r_i}{\partial V_{\max}}=\frac{s_i}{K_m+s_i},\qquad \frac{\partial r_i}{\partial K_m}=-\frac{V_{\max}\,s_i}{(K_m+s_i)^2}$$`) +
                tbl(['$i$', R`$\partial r_i/\partial V_{\max}$`, R`$\partial r_i/\partial K_m$`], st.J.slice(0, 6).map((r, i) => [i + 1, num(r[0], 4), num(r[1], 5)])) +
                md(R`Wiersze $7$–$12$ są takie same jak $1$–$6$ (stężenia się powtarzają). ${k === 0 ? R`W PyTorch nie trzeba wyprowadzać tych wzorów: całą macierz $12\times2$ zwróci <code>jacobian(residual_fn, theta)</code>.` : ''}`),
            });
            fr.push({
              group, title: 'Układ równań normalnych (normal equations)', line: 4, state: { th: [...th], path: cur },
              html: md(R`Z jakobianu i wektora reszt budujemy układ $2\times2$:
$$J^{\top}J=${tm(st.A, 5)},\qquad -J^{\top}\mathbf{r}=\begin{bmatrix}${tn(st.b[0], 5)}\\${tn(st.b[1], 6)}\end{bmatrix}$$
${k === 0 ? R`Skąd bierze się ten układ? Gradient funkcji kosztu to $\nabla f=J^{\top}\mathbf{r}$, a hesjan to $J^{\top}J$ plus składnik zawierający drugie pochodne reszt. **Przybliżenie Gaussa–Newtona** polega na pominięciu tego składnika: $H\approx J^{\top}J$. Układ równań Newtona $H\mathbf{p}=-\nabla f$ przyjmuje wtedy postać $J^{\top}J\,\mathbf{p}=-J^{\top}\mathbf{r}$.` : R`Te same wzory, nowe liczby: $J$ i $\mathbf{r}$ zależą od bieżących parametrów, więc w każdej iteracji obliczamy je ponownie.`}`),
            });
            const eq = R`\mathbf{p}=\big(J^{\top}J\big)^{-1}\big(-J^{\top}\mathbf{r}\big)`;
            const full = md(R`$$${eq}=${tv(st.p, 5)}$$`);
            const txt = k === 0 ? R`Jest to dokładnie układ równań normalnych **liniowego** zadania najmniejszych kwadratów $\min_{\mathbf{p}}\lVert J\,\mathbf{p}+\mathbf{r}\rVert^2$. Jego rozwiązaniem jest poprawka parametrów:` : R`Rozwiązaniem układu jest poprawka:`;
            fr.push({ group, title: R`Poprawka $\mathbf{p}$`, line: 4, state: { th: [...th], path: cur, cand: nth }, html: md(txt) + full });
            path.push([...nth]);
            const uL = R`\boldsymbol\theta^{(${k + 1})}`, u1 = R`\boldsymbol\theta^{(${k})}+\mathbf{p}`, u2 = R`${tv(th, 5)}+${tv(st.p, 5)}`;
            const ufull = md(R`$$${al(uL, u1, u2, tv(nth, 5))}$$ Koszt: $${tn(cO, 6)}\ \to\ ${tn(cN, 6)}$.`);
            fr.push(k === 1
              ? { group, title: 'Krok i nowy koszt: Twoja kolej', line: [5, 6], state: { th: [...nth], prev: [...th], path: path.map(q => [...q]) }, log: [k + 1, num(nth[0], 6), num(nth[1], 4), num(cN, 6)], html: md(R`$$${al(uL, u1, u2, R`\big(\ ?\ ,\ ${tn(nth[1], 5)}\big)`)}$$`), quiz: { prompt: R`Oblicz nową wartość $V_{\max}$:`, answer: nth[0], tol: 1e-3, reveal: ufull } }
              : { group, title: 'Krok i nowy koszt', line: [5, 6], state: { th: [...nth], prev: [...th], path: path.map(q => [...q]) }, log: [k + 1, num(nth[0], 6), num(nth[1], 4), num(cN, 6)], html: ufull + md(R`Po jednym kroku krzywa przebiega już blisko punktów pomiarowych. Szara linia przerywana pokazuje model przed wykonaniem kroku.`) });
          } else {
            path.push([...nth]);
            fr.push({
              group: 'Kolejne iteracje', title: R`Iteracja ${k + 1}`, line: [2, 3, 4, 5, 6], state: { th: [...nth], prev: [...th], path: path.map(q => [...q]) }, log: [k + 1, num(nth[0], 6), num(nth[1], 4), num(cN, 6)],
              html: md(R`$$\begin{aligned}\mathbf{p}&=${tv(st.p, 3)}\\ \boldsymbol\theta^{(${k + 1})}&=${tv(nth, 7)}\\ \text{koszt}&=${tn(cN, 7)}\end{aligned}$$
${M.norm(st.p) < 1e-3 ? R`Poprawka jest już pomijalnie mała: metoda osiągnęła zbieżność.` : R`Poprawki maleją z kroku na krok.`}`),
            });
          }
          th = nth;
        }
        const rms = Math.sqrt(2 * P.cost(th) / 12);
        fr.push({
          group: 'Wniosek', title: 'Dlaczego koszt nie zmalał do zera?', line: 6, state: { th: [...th], path: path.map(q => [...q]) },
          html: md(R`Wynik: $V_{\max}=${tn(th[0], 6)}$, $K_m=${tn(th[1], 4)}$. Dane wygenerowano dla wartości $212$ i $0.064$, a następnie dodano szum pomiarowy o odchyleniu standardowym $4$.

Koszt ustabilizował się na poziomie $${tn(P.cost(th), 5)}$, ponieważ żadna gładka krzywa nie przechodzi przez wszystkie zaszumione punkty. Typowa wielkość reszty to $\sqrt{2f/12}\approx${tn(rms, 3)}$, czyli wartość porównywalna z poziomem szumu. Model odtwarza zależność, a nie szum: tak właśnie powinno być.`) +
            box('def', 'Dlaczego to przybliżenie działa?', R`Pominięty składnik hesjanu ma postać $\sum_i r_i\,\nabla^2 r_i$: jest mały, gdy **reszty są małe**, czyli gdy model dobrze pasuje do danych. Dlatego w pobliżu rozwiązania metoda Gaussa–Newtona zbiega niemal tak szybko jak pełna metoda Newtona, choć wymaga tylko pierwszych pochodnych.`),
        });
        fr.push({
          group: 'Wniosek', title: 'Wskazówki do samodzielnej implementacji', line: [2, 3, 4], state: { th: [...th], path: path.map(q => [...q]) },
          html: box('nb', 'Implementacja', R`Wynik warto porównać z funkcją biblioteczną <code>scipy.optimize.least_squares</code>. Dla tych danych i punktu startowego $(150,\ 0.1)$ poprawna implementacja daje $V_{\max}\approx214.687$ i $K_m\approx0.06720$.

Zwróć uwagę na wymiary: jakobian jest macierzą $12\times2$, wektor reszt ma długość $12$, a rozwiązywany układ ma wymiar $2\times2$.`) +
            box('warn', 'Niekorzystny punkt startowy', R`Metoda Gaussa–Newtona nie ma współczynnika uczenia ani żadnych zabezpieczeń. Z odległego punktu startowego krok może przenieść $K_m$ poniżej zera, a wtedy model traci sens fizyczny. Rozwiązaniem jest tłumienie (damping) w metodzie Levenberga–Marquardta: $(J^{\top}J+\lambda I)\,\mathbf{p}=-J^{\top}\mathbf{r}$. Wypróbuj je w zakładce **Eksperymentuj**.`),
        });
        return fr;
      },
    });
  },

  lab() {
    const S = { th0: [150, 0.1], sigma: 4, seed: 0, lam: 0 };
    let P = M.mm(), path, costs, halted, best;
    const root = el('div', 'lab'), side = el('aside', 'lab-side'), main = el('div', 'lab-main');
    const sig = Chips({ label: 'Dane', value: 'nb', options: [{ v: 'nb', label: 'przykładowe ($\\sigma=4$)' }, { v: 0, label: 'bez szumu' }, { v: 12, label: 'szum $\\sigma=12$' }, { v: 25, label: 'szum $\\sigma=25$' }] });
    const lamS = Slider({ label: R`Współczynnik tłumienia $\lambda$ (metoda Levenberga–Marquardta)`, aria: 'tłumienie lambda', min: 0, max: 10, step: 0.05, value: 0, hint: R`$\lambda=0$ odpowiada metodzie Gaussa–Newtona bez tłumienia.` });
    const speed = Slider({ label: 'Szybkość animacji (kroków na sekundę)', aria: 'szybkość animacji', min: 1, max: 20, step: 1, value: 2 });
    const startInfo = el('small', 'fix3');
    const ctl = el('section', 'card'); ctl.innerHTML = '<h3 class="card-h">Ustawienia</h3>'; ctl.append(sig.el, lamS.el, startInfo);
    const status = el('p', 'status'); status.setAttribute('role', 'status');
    const bStep = Btn('Krok', '', () => { runner.stop(); step(); draw(); }), bRun = Btn('▶ Uruchom', 'pri', () => { if (done()) reset(); runner.toggle(); }), bReset = Btn('Od nowa', '', () => reset());
    const run = el('section', 'card'); run.innerHTML = '<h3 class="card-h">Przebieg</h3>'; const row = el('div', 'btns'); row.append(bStep, bRun, bReset);
    run.append(row, Btn('Wylosuj nowe pomiary', 'sm', () => { S.seed++; if (sig.value === 'nb') sig.set(12, false); makeData(); reset(); }), speed.el);
    side.append(ctl, run);
    const pD = mmDataPlot(), pP = new Plot({ ratio: '1 / 0.66', xlabel: R`V_{\max}`, ylabel: 'K_m', aria: 'Poziomice kosztu w przestrzeni parametrów' }).setView(40, 420, 0, 0.5);
    const pC = new Plot({ ylog: true, ratio: '1 / 0.66', xlabel: 'k', ylabel: R`\tfrac12\lVert\mathbf{r}\rVert^2`, aria: 'Historia kosztu' });
    const stats = Stats([['k', 'Iteracja $k$'], ['v', R`$V_{\max}$`], ['km', '$K_m$'], ['c', R`Koszt $\tfrac12\lVert\mathbf{r}\rVert^2$`], ['p', R`Norma poprawki $\lVert\mathbf{p}\rVert$`], ['cond', R`Wskaźnik uwarunkowania $\kappa(J^{\top}J)$`, 'cond']]);
    const plots = el('div', 'plots three');
    plots.append(plotCard('Dane i dopasowanie', pD, legend([['dot', C.black, 'pomiary'], ['line', C.red, 'model'], ['dash', C.ghost, 'model przed krokiem']])),
      plotCard('Przestrzeń parametrów <small>kliknij, aby wybrać punkt startowy</small>', pP, legend([['line', C.red, 'trajektoria'], ['star', C.black, 'najlepsze dopasowanie']])),
      plotCard('Historia kosztu', pC));
    const info = el('div', 'card fbox');
    function makeData() {
      if (sig.value === 'nb') { P = M.mm(); return; }
      const g = M.rng(2026 + 97 * S.seed + 13 * sig.value), v = M.MM_S.map(s => M.MM_TRUE[0] * s / (M.MM_TRUE[1] + s) + sig.value * g.n());
      P = M.mm(M.MM_S, v);
    }
    function fitBest() { let t = [...M.MM_TRUE]; for (let i = 0; i < 60; i++) { const n = M.gnStep(P, t, 0.5).th; if (!n || !M.finite(n)) break; t = n; } return t; }
    function reset() { runner.stop(); path = [[...S.th0]]; costs = [P.cost(S.th0)]; halted = ''; best = fitBest(); status.className = 'status'; status.textContent = 'Nowy przebieg. Zastanów się, czego się spodziewasz, a następnie wykonaj krok.'; draw(); }
    const done = () => !!halted || path.length > 60 || (path.length > 1 && M.norm(M.sub(path[path.length - 1], path[path.length - 2])) < 1e-9);
    function step() {
      if (done()) return false;
      const th = path[path.length - 1], st = M.gnStep(P, th, lamS.value);
      if (!st.th || !M.finite(st.th) || Math.abs(st.th[0]) > 1e6 || Math.abs(st.th[1]) > 1e4 || !Number.isFinite(P.cost(st.th))) { halted = 'Metoda jest rozbieżna: parametry wyszły poza sensowny zakres.'; }
      else { path.push(st.th); costs.push(P.cost(st.th)); if (st.th[1] <= 0) halted = 'K_m przyjęło wartość ujemną: model traci sens fizyczny (dzielenie przez zero dla s = −K_m).'; }
      if (done()) { runner.stop(); status.className = 'status' + (halted ? ' bad' : ''); status.textContent = halted || (path.length > 60 ? 'Osiągnięto limit 60 kroków.' : `Zbieżność po ${path.length - 1} krokach: poprawka jest już pomijalnie mała.`); return false; }
      return true;
    }
    function draw() {
      const th = path[path.length - 1], prev = path.length > 1 ? path[path.length - 2] : null, st = M.gnStep(P, th, lamS.value), e = M.eig2(st.A);
      info.innerHTML = `<div>${K(R`v(s)=\frac{V_{\max}\,s}{K_m+s},\qquad \big(J^{\top}J+\lambda\,\mathrm{diag}(J^{\top}J)\big)\,\mathbf{p}=-J^{\top}\mathbf{r}`)}</div><div class="note">Najlepsze dopasowanie dla tych danych: ${K(R`V_{\max}=${tn(best[0], 6)},\ K_m=${tn(best[1], 4)}`)}, koszt ${num(P.cost(best), 5)}.</div>`;
      startInfo.innerHTML = `Punkt startowy: ${K(R`\boldsymbol\theta^{(0)}=${tv(S.th0, 3)}`)}. Kliknij na wykresie przestrzeni parametrów, aby go zmienić.`;
      pD.draw = q => drawMM(q, P, th, { prev }); pD.render();
      pP.draw = q => { q.contour('mm' + S.seed + sig.value, P.cost, MM_LEVELS, { n: 110 }); q.hline(0, { color: C.red, width: 1 }); drawRun(q, path, { color: C.red, shape: 'sq' }); q.dots([S.th0], { fill: '#fff', stroke: C.black, color: C.black, r: 4.5 }); q.star(best[0], best[1]); };
      pP.render();
      drawCost(pC, [{ ys: costs, color: C.red }], { lo: 1, kmax: 10 });
      stats.set({ k: path.length - 1, v: num(th[0], 6), km: { t: num(th[1], 4), c: th[1] <= 0 ? 'bad' : '' }, c: num(costs[costs.length - 1], 6), p: st.p ? num(M.norm(st.p), 3) : '—', cond: num(e[1] / e[0], 3) });
      bStep.disabled = done();
    }
    const runner = Runner(step, () => speed.value, on => { bRun.textContent = on ? '❚❚ Pauza' : '▶ Uruchom'; });
    runner.onframe = draw;
    sig.onchange = () => { makeData(); reset(); }; lamS.oninput = () => reset();
    pP.pickable((x, y) => { S.th0 = [parseFloat(Math.max(45, Math.min(415, x)).toFixed(0)), parseFloat(Math.max(0.005, Math.min(0.495, y)).toFixed(3))]; reset(); });
    const set = (th0, lam, data) => { if (data !== undefined) { sig.set(data, false); makeData(); } S.th0 = th0; lamS.set(lam, false); reset(); runner.start(); };
    main.append(info, status, plots, stats.el, el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), Missions([
      { t: 'Przykład podstawowy', q: R`Dane przykładowe, punkt startowy $(150,\ 0.1)$, $\lambda=0$. **Zastanów się:** ile kroków wystarczy, aby krzywa dopasowała się do punktów pomiarowych? Porównaj to z tysiącami kroków metody spadku gradientu.`,
        acts: [['Uruchom przykład', () => set([150, 0.1], 0, 'nb')]],
        a: R`Od czterech do pięciu kroków. Wynik: $V_{\max}\approx214.687$, $K_m\approx0.06720$, koszt około $52.69$. Takie same wartości zwraca funkcja biblioteczna <code>scipy.optimize.least_squares</code>.` },
      { t: 'Niekorzystny punkt startowy', q: R`Ustaw punkt startowy $(300,\ 0.4)$, daleko od rozwiązania. **Zastanów się:** czy metoda Gaussa–Newtona bez tłumienia ($\lambda=0$) będzie zbieżna? A z tłumieniem $\lambda=1$?`,
        acts: [['Start $(300,\\ 0.4)$, $\\lambda=0$', () => set([300, 0.4], 0, 'nb')], ['Ten sam punkt, $\\lambda=1$', () => set([300, 0.4], 1, 'nb')]],
        a: R`Bez tłumienia pierwszy krok jest zbyt długi i przenosi $K_m$ poniżej zera: linearyzacja reszt, na której opiera się krok, daleko od rozwiązania przestaje dobrze przybliżać model. Tłumienie skraca krok i obraca go w stronę antygradientu. Metoda wykonuje więcej kroków, ale osiąga rozwiązanie. To idea metody Levenberga–Marquardta, spokrewnionej z regresją grzbietową (ridge regression).` },
      { t: 'Szum pomiarowy', q: R`Wybierz dane bez szumu, a potem z szumem $\sigma=12$ i $\sigma=25$ (punkt startowy $(150,\ 0.1)$). **Zastanów się:** jak zmienią się końcowy koszt i dopasowane parametry? Kliknij kilkakrotnie „Wylosuj nowe pomiary”.`,
        acts: [['Bez szumu', () => set([150, 0.1], 0, 0)], ['$\\sigma=12$', () => set([150, 0.1], 0, 12)], ['$\\sigma=25$', () => set([150, 0.1], 0, 25)]],
        a: R`Bez szumu koszt maleje praktycznie do zera, a metoda odtwarza prawdziwe wartości $212$ i $0.064$. Dla danych zaszumionych koszt stabilizuje się na wysokim poziomie (średnio około $5\sigma^2$), a oszacowania parametrów są przy każdym losowaniu nieco inne. Dla $\sigma=25$ zdarza się nawet, że metoda Gaussa–Newtona bez tłumienia jest rozbieżna: zastosuj wtedy $\lambda>0$. Szczególnie niepewne jest oszacowanie $K_m$, które zależy głównie od kilku pomiarów przy małych stężeniach. To motyw przewodni kursu: o jakości wyniku decyduje nie tylko algorytm, lecz także szum w danych.` },
      { t: 'Uwarunkowanie zadania', q: R`Spójrz na ostatnie pole z wartościami pod wykresami: $\kappa(J^{\top}J)$. **Zastanów się:** czy ten układ równań jest dobrze uwarunkowany? Skąd bierze się taka wartość?`,
        acts: [['Dane przykładowe', () => set([150, 0.1], 0, 'nb')]],
        a: R`Wskaźnik uwarunkowania (condition number) jest rzędu $10^5$–$10^6$, czyli układ jest źle uwarunkowany. Przyczyna: parametry różnią się o kilka rzędów wielkości ($V_{\max}\sim200$, $K_m\sim0.07$), więc ta sama zmiana o $0.01$ jest dla jednego z nich niezauważalna, a dla drugiego bardzo duża. Widać to również na poziomicach: dolina funkcji kosztu jest długa i wąska. Metoda spadku gradientu byłaby tu praktycznie nieskuteczna. W temacie o farmakokinetyce ten sam problem rozwiązuje przejście na **logarytmy parametrów**.` },
    ]));
    root.append(side, main); makeData(); reset();
    return { el: root };
  },
});
