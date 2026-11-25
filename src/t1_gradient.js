/* =====================================================================
   Topic 1 — numerical gradient by central differences
   ===================================================================== */
TOPICS.push({
  id: 'gradient', n: 1, title: 'Gradient numeryczny (numerical gradient)', short: 'Gradient', task: 'Różniczkowanie numeryczne',
  menu: 'Jak obliczyć gradient, znając wyłącznie wartości funkcji? Różnice centralne (central differences) dla kolejnych współrzędnych i dobór kroku $h$.',
  icon: `<path d="M8 50 Q40 6 104 22" /><path d="M8 62 Q44 22 104 40" /><path class="a" d="M52 34 L66 10" /><path class="a" d="M66 10 l-8 4 m8 -4 l1 9" /><circle class="p" cx="52" cy="34" r="4"/>`,

  walk() {
    const fn = M.F.bowl, x = [-3, 4];
    return Walk({
      id: 'gradient', live: pv => ({ hstep: R`$h=${tn(pv.h)}$`, x: R`$\mathbf{x}=(-3,\ 4)$` }),
      intro: R`**Po co?** Każda z omawianych tu metod optymalizacji korzysta z gradientu. W praktyce oblicza go mechanizm automatycznego różniczkowania (autograd), ale warto umieć wyznaczyć go samodzielnie metodą różnic skończonych (finite differences), czyli używając wyłącznie wartości funkcji. To także najprostszy sposób sprawdzenia, czy gradient obliczony inną metodą jest poprawny. Poniżej pełny rachunek dla jednego punktu.

Oznaczenia w tych materiałach: $\mathbf{x}=(x_0,\ x_1)$ to punkt, a $x_0$ i $x_1$ to jego współrzędne, numerowane od zera, tak jak <code>x[0]</code> i <code>x[1]</code> w Pythonie.`,
      params: [{ id: 'h', label: 'Krok różnicowy $h$', value: 0.1, options: [{ v: 0.1, label: '$0.1$ (widoczny na rysunku)' }, { v: 1e-5, label: '$10^{-5}$ (wartość typowa)' }] }],
      algo: {
        title: 'Algorytm: gradient numeryczny metodą różnic centralnych',
        lines: [
          R`grad ← wektor zer o kształcie $\mathbf{x}$`,
          R`**dla każdej** współrzędnej $i$:`,
          R`    $\mathbf{x}^{+}$ ← kopia $\mathbf{x}$ z $x_i+h$, &nbsp; $\mathbf{x}^{-}$ ← kopia $\mathbf{x}$ z $x_i-h$`,
          R`    $f^{+}$ ← $f(\mathbf{x}^{+})$, &nbsp; $f^{-}$ ← $f(\mathbf{x}^{-})$`,
          R`    grad[$i$] ← $(f^{+}-f^{-})\,/\,(2h)$`,
          R`**zwróć** grad`,
        ],
      },
      logTitle: 'Pochodne cząstkowe',
      logHead: ['$i$', R`$f(\mathbf{x}+h\mathbf{e}_i)$`, R`$f(\mathbf{x}-h\mathbf{e}_i)$`, 'grad[$i$]'],
      logEmpty: 'Tabela wypełni się po obliczeniu pierwszej pochodnej cząstkowej.',
      visual(card) {
        const p = new Plot({ equal: true, xlabel: 'x_0', ylabel: 'x_1', aria: 'Poziomice funkcji wokół punktu x z punktami przesuniętymi o plus i minus h' });
        p.setView(-4.25, -1.75, 2.75, 5.25);
        card.innerHTML = `<div class="plot-t">${mdi(R`Otoczenie punktu $\mathbf{x}$ <small>poziomice funkcji $f$</small>`)}</div>`;
        card.append(p.el);
        const note = el('p', 'note fix2'); card.append(note);
        card.insertAdjacentHTML('beforeend', legend([['dot', C.black, 'punkt $\\mathbf{x}$'], ['ring', C.red, 'punkty przesunięte o $\\pm h$'], ['line', C.green, 'gradient']]));
        const lv = Array.from({ length: 22 }, (_, i) => 30 + 5 * i);
        return {
          draw(s) {
            note.textContent = s.h < 0.05 ? 'Przesunięcie o h = 0.00001 jest zbyt małe, by było widoczne: punkty narysowano w powiększeniu.' : '';
            p.draw = q => {
              q.contour('bowlzoom', fn.f, lv);
              const hv = s.h < 0.05 ? 0.12 : s.h;
              for (const a of s.axes) {
                const e = a.i === 0 ? [hv, 0] : [0, hv], on = a.i === s.cur;
                q.seg(x[0] - e[0], x[1] - e[1], x[0] + e[0], x[1] + e[1], { color: C.red, width: 1.6, dash: [4, 4], alpha: on ? 1 : .45 });
                q.dots([[x[0] + e[0], x[1] + e[1]], [x[0] - e[0], x[1] - e[1]]], { color: C.red, fill: '#fff', stroke: C.red, r: 5, alpha: on ? 1 : .5 });
                if (on) {
                  q.label(x[0] + e[0], x[1] + e[1], [['x', 'b'], [' + h·e', 'r'], [String(a.i), 'sub']], { dx: a.i ? 10 : -14, dy: a.i ? -4 : -18, color: C.red, size: 14 });
                  q.label(x[0] - e[0], x[1] - e[1], [['x', 'b'], [' − h·e', 'r'], [String(a.i), 'sub']], { dx: a.i ? 10 : -30, dy: a.i ? 4 : 18, color: C.red, size: 14 });
                }
              }
              if (s.grad) {
                const k = 0.95 / M.norm(s.grad);
                q.arrow(x[0], x[1], x[0] + s.grad[0] * k, x[1] + s.grad[1] * k, { color: C.green, width: 3 });
                q.label(x[0] + s.grad[0] * k, x[1] + s.grad[1] * k, [['∇', 'r'], ['f', 'm']], { dx: 10, dy: 2, color: C.greenD });
              }
              q.dots([x], { color: C.black, r: 5.5, stroke: '#fff', lw: 1.5 });
              q.label(x[0], x[1], [['x', 'b']], { dx: 9, dy: 12 });
            };
            p.render();
          },
        };
      },
      build(pv) {
        const h = pv.h, sig = h < 1e-3 ? 13 : 6, fr = [], G = [], axes = [];
        const st = (cur, grad = null) => ({ h, cur, axes: axes.map(a => ({ ...a })), grad });
        fr.push({
          group: 'Punkt wyjścia', title: 'Czego szukamy?', line: 0, state: st(-1),
          html: md(R`Dana jest funkcja dwóch zmiennych („miska”) oraz punkt $\mathbf{x}$:
$$f(\mathbf{x})=\tfrac12\big[(x_0-2)^2+5\,(x_1+1)^2\big],\qquad \mathbf{x}=(-3,\ 4),\qquad f(\mathbf{x})=${tn(fn.f(x))}$$
Gradient to wektor pochodnych cząstkowych, po jednej na każdą współrzędną:
$$\nabla f(\mathbf{x})=\Big(\frac{\partial f}{\partial x_0},\ \frac{\partial f}{\partial x_1}\Big)$$
Zakładamy, że nie znamy wzorów na pochodne: potrafimy jedynie **obliczać wartości** $f$. Przyjmujemy krok $h=${tn(h)}$.`),
        });
        for (const i of [0, 1]) {
          const xp = [...x], xm = [...x]; xp[i] += h; xm[i] -= h;
          const fp = fn.f(xp), fm = fn.f(xm), d = (fp - fm) / (2 * h); G[i] = d;
          const group = R`Współrzędna $i=${i}$: pochodna cząstkowa $\partial f/\partial x_${i}$`;
          const e = i === 0 ? '(1,\\ 0)' : '(0,\\ 1)', other = 1 - i;
          const shift = s => (i === 0 ? `(-3${s}${tn(h)},\\ 4)` : `(-3,\\ 4${s}${tn(h)})`);
          axes.push({ i });
          fr.push({
            group, title: R`Przesuń punkt o $\pm h$ wzdłuż osi $x_${i}$`, line: [1, 2], state: st(i),
            html: md(R`Zmieniamy **tylko** współrzędną $x_${i}$; współrzędna $x_${other}$ pozostaje bez zmian. Kierunek osi wyznacza wersor $\mathbf{e}_${i}=${e}$.
$$\mathbf{x}+h\,\mathbf{e}_${i}=${shift('+')}=${tv(xp, 8)}$$
$$\mathbf{x}-h\,\mathbf{e}_${i}=${shift('-')}=${tv(xm, 8)}$$`),
          });
          fr.push({
            group, title: 'Oblicz wartości funkcji w obu punktach', line: 3, state: st(i),
            html: md(R`$$f(\mathbf{x}+h\,\mathbf{e}_${i})=${tn(fp, sig)},\qquad f(\mathbf{x}-h\,\mathbf{e}_${i})=${tn(fm, sig)}$$
W punkcie przesuniętym o $+h$ wartość jest ${fp < fm ? 'mniejsza' : 'większa'} niż w punkcie przesuniętym o $-h$, więc wzdłuż osi $x_${i}$ funkcja ${fp < fm ? '**maleje**: pochodna będzie ujemna' : '**rośnie**: pochodna będzie dodatnia'}.`),
          });
          const lhs = R`\begin{aligned}\frac{\partial f}{\partial x_${i}}&\approx\frac{f(\mathbf{x}+h\mathbf{e}_${i})-f(\mathbf{x}-h\mathbf{e}_${i})}{2h}\\[4pt] &=\frac{${tn(fp, sig)}-${tn(fm, sig)}}{2\cdot ${tn(h)}}`;
          const text = R`Różnicę wartości dzielimy przez odległość między punktami, czyli $2h$. Otrzymujemy współczynnik kierunkowy siecznej przechodzącej przez oba punkty.`;
          const done = md(R`$$${lhs}=${tn(d, h < 1e-3 ? 12 : 6)}\end{aligned}$$ Wynik zapisujemy jako <code>grad[${i}]</code>.`);
          fr.push(i === 0
            ? { group, title: 'Iloraz różnicowy centralny (central difference)', line: 4, state: st(i), log: [i, num(fp, sig), num(fm, sig), num(d, h < 1e-3 ? 12 : 6)], html: md(text) + done }
            : { group, title: 'Iloraz różnicowy: Twoja kolej', line: 4, state: st(i), log: [i, num(fp, sig), num(fm, sig), num(d, h < 1e-3 ? 12 : 6)],
              html: md(text + R` $$${lhs}=\ ?\end{aligned}$$`), quiz: { prompt: R`Oblicz $\partial f/\partial x_1$ i wpisz wynik:`, answer: d, tol: 2e-3, reveal: done } });
        }
        const exact = fn.g(x), err = Math.max(Math.abs(G[0] - exact[0]), Math.abs(G[1] - exact[1]));
        fr.push({
          group: 'Wynik', title: 'Złóż gradient i porównaj z wynikiem analitycznym', line: 5, state: st(-1, G),
          html: md(R`$$\nabla f(\mathbf{x})\approx${tv(G, h < 1e-3 ? 12 : 6)}$$
Sprawdzenie ze wzoru analitycznego: $\nabla f(\mathbf{x})=\big(x_0-2,\ 5(x_1+1)\big)=(-5,\ 25)$. ${err === 0 ? 'Wynik jest dokładny.' : R`Największa różnica wynosi $${tn(err, 2)}$: to skutek zaokrągleń w arytmetyce zmiennoprzecinkowej.`}

Na rysunku wektor gradientu jest **prostopadły do poziomicy** i wskazuje kierunek najszybszego wzrostu funkcji. Aby zmniejszać $f$, należy poruszać się w kierunku przeciwnym: $-\nabla f$.`),
        });
        fr.push({
          group: 'Wynik', title: R`Jak dobrać krok $h$?`, line: 4, state: st(-1, G),
          html: box('def', 'Dwa źródła błędu o przeciwstawnych wymaganiach', R`**Błąd obcięcia** (truncation error), wynikający z pominięcia dalszych wyrazów szeregu Taylora, maleje jak $h^2$: im mniejsze $h$, tym lepiej. **Błąd zaokrągleń** (round-off error) rośnie jak $\varepsilon/h$, gdzie $\varepsilon\approx2.2\cdot10^{-16}$ to epsilon maszynowy (machine epsilon): odejmujemy dwie prawie równe liczby, a wynik dzielimy przez bardzo małą liczbę.

Najlepszy kompromis przypada w okolicy $h\approx\varepsilon^{1/3}\approx 6\cdot10^{-6}$. Dlatego typowo przyjmuje się $h=10^{-5}$.`) +
            md(R`Rozważana „miska” jest funkcją kwadratową, a dla takich funkcji różnica centralna nie jest obarczona błędem obcięcia. Dlatego wynik jest poprawny nawet dla $h=0.1$. Dla innych funkcji tak już nie będzie: sprawdź to w zakładce **Eksperymentuj**.`),
        });
        fr.push({
          group: 'Wynik', title: 'Wskazówki do samodzielnej implementacji', line: [1, 2, 4], state: st(-1, G),
          html: box('nb', 'Implementacja', R`Funkcja obliczająca gradient numeryczny powinna działać dla dowolnej liczby współrzędnych: pętla po $i$, a w niej dwie **kopie** $\mathbf{x}$ zmienione tylko na pozycji $i$.

Trzy najczęstsze błędy: modyfikowanie <code>x</code> w miejscu zamiast pracy na kopii, dzielenie przez $h$ zamiast przez $2h$ oraz zwrócenie wyniku o innym kształcie niż <code>x</code>. Prosty test poprawności: dla $f(\mathbf{x})=\sum_i x_i^2$ gradient powinien być równy $2\mathbf{x}$.`),
        });
        return fr;
      },
    });
  },

  lab() {
    const FN = {
      wave: { label: 'Funkcja falista: sin x₀ · cos x₁', tex: R`f(\mathbf{x})=\sin x_0\cdot\cos x_1`, f: x => Math.sin(x[0]) * Math.cos(x[1]), g: x => [Math.cos(x[0]) * Math.cos(x[1]), -Math.sin(x[0]) * Math.sin(x[1])], view: [-4, 4, -4, 4], levels: [-.9, -.7, -.5, -.3, -.1, .1, .3, .5, .7, .9], x: [0.9, 0.7], gref: 1 },
      bowl: { label: 'Funkcja kwadratowa („miska”)', tex: M.F.bowl.tex, f: M.F.bowl.f, g: M.F.bowl.g, view: [-4, 4, -4, 4], levels: M.F.bowl.levels, x: [-1.5, 1.5], gref: 14 },
    };
    const S = { fn: 'wave', x: [...FN.wave.x], h: 0.5 };
    const root = el('div', 'lab'), side = el('aside', 'lab-side'), main = el('div', 'lab-main');
    const sel = Select({ label: 'Funkcja', value: S.fn, options: Object.entries(FN).map(([v, f]) => ({ v, label: f.label })) });
    const hS = Slider({ label: 'Krok różnicowy $h$', aria: 'krok h', min: 1e-15, max: 1, value: S.h, log: true, sig: 2, hint: 'Skala logarytmiczna: od $10^{-15}$ do $1$.' });
    const ctl = el('section', 'card'); ctl.innerHTML = '<h3 class="card-h">Ustawienia</h3>';
    ctl.append(sel.el, hS.el, el('small', '', 'Punkt wybierasz kliknięciem lub przeciąganiem na wykresie poziomic.'));
    side.append(ctl);
    const ftex = el('div', 'card fbox');
    const pA = new Plot({ equal: true, xlabel: 'x_0', ylabel: 'x_1', aria: 'Poziomice funkcji, punkt i strzałki gradientu' });
    const pB = new Plot({ xlog: true, ylog: true, xlabel: 'h', ylabel: R`\text{błąd}`, floor: 1e-18, aria: 'Błąd gradientu numerycznego w funkcji kroku h, skala logarytmiczna' });
    pB.setView(1e-15, 1, 1e-17, 100);
    const stats = Stats([['ex', 'Gradient analityczny', 'grad'], ['ce', 'Różnice centralne', 'cdiff'], ['fw', 'Różnice w przód', 'fdiff'], ['ec', 'Błąd różnic centralnych', 'graderr'], ['ef', 'Błąd różnic w przód', 'graderr']]);
    const plots = el('div', 'plots');
    plots.append(
      plotCard('Poziomice i gradient w punkcie', pA, legend([['line', C.green, 'gradient analityczny'], ['dash', C.red, '[[cdiff|różnice centralne]]'], ['ring', C.red, 'punkty $\\mathbf{x}\\pm h\\mathbf{e}_i$']])),
      plotCard('Błąd gradientu w zależności od kroku $h$', pB, legend([['line', C.red, '[[cdiff|różnice centralne]]'], ['dash', C.black, '[[fdiff|różnice w przód]]'], ['dot', C.green, 'wybrane $h$']]) + '<p class="note">Błąd to największa co do modułu różnica między składowymi gradientu numerycznego i analitycznego. Wartości poniżej 10⁻¹⁷ są rysowane na dolnej krawędzi wykresu.</p>'),
    );
    let curve = [];
    const errOf = (fn, h, kind) => { const g = M.numgrad(fn.f, S.x, h, kind), e = fn.g(S.x); return Math.max(Math.abs(g[0] - e[0]), Math.abs(g[1] - e[1])); };
    function recompute() {
      const fn = FN[S.fn]; curve = [];
      for (let i = 0; i <= 150; i++) { const h = 10 ** (-15 + i / 10); curve.push([h, errOf(fn, h, 'central'), errOf(fn, h, 'forward')]); }
    }
    function update() {
      const fn = FN[S.fn], ex = fn.g(S.x), ce = M.numgrad(fn.f, S.x, S.h), fw = M.numgrad(fn.f, S.x, S.h, 'forward');
      const ec = errOf(fn, S.h, 'central'), ef = errOf(fn, S.h, 'forward');
      ftex.innerHTML = `<div>${K(fn.tex)}</div><div>${K(R`\mathbf{x}=${tv(S.x, 3)},\quad h=${tn(S.h, 2)}`)}</div>`;
      stats.set({ ex: vecs(ex, 6), ce: vecs(ce, 6), fw: vecs(fw, 6), ec: num(ec, 3), ef: num(ef, 3) });
      pA.setView(...fn.view);
      pA.draw = q => {
        q.contour(S.fn, fn.f, fn.levels);
        const k = 1.5 / fn.gref, x = S.x;
        if (S.h > 0.04) { q.seg(x[0] - S.h, x[1], x[0] + S.h, x[1], { color: C.red, width: 1.2, dash: [3, 4] }); q.seg(x[0], x[1] - S.h, x[0], x[1] + S.h, { color: C.red, width: 1.2, dash: [3, 4] }); q.dots([[x[0] + S.h, x[1]], [x[0] - S.h, x[1]], [x[0], x[1] + S.h], [x[0], x[1] - S.h]], { fill: '#fff', stroke: C.red, color: C.red, r: 4 }); }
        q.arrow(x[0], x[1], x[0] + ex[0] * k, x[1] + ex[1] * k, { color: C.green, width: 3.2 });
        q.arrow(x[0], x[1], x[0] + ce[0] * k, x[1] + ce[1] * k, { color: C.red, width: 2, dash: [6, 4] });
        q.dots([x], { color: C.black, r: 5.5, stroke: '#fff', lw: 1.5 });
      };
      pA.render();
      pB.draw = q => {
        q.path(curve.map(c => [c[0], Math.max(c[2], 1e-17)]), { color: C.black, dash: [6, 4], width: 2 });
        q.path(curve.map(c => [c[0], Math.max(c[1], 1e-17)]), { color: C.red, width: 2.4 });
        q.vline(S.h, { color: C.green, dash: [4, 4] });
        q.dots([[S.h, Math.max(ec, 1e-17)], [S.h, Math.max(ef, 1e-17)]], { color: C.green, r: 5, stroke: '#fff', lw: 1.5 });
      };
      pB.render();
    }
    const setFn = v => { S.fn = v; S.x = [...FN[v].x]; sel.set(v, false); recompute(); update(); };
    const setH = v => { S.h = v; hS.set(v, false); update(); };
    sel.onchange = setFn; hS.oninput = v => { S.h = v; update(); };
    pA.pickable((x, y) => { const v = FN[S.fn].view; S.x = [Math.max(v[0], Math.min(v[1], x)), Math.max(v[2], Math.min(v[3], y))]; recompute(); update(); });
    root._live = () => {
      const fn = FN[S.fn], pair = v => `$${tv(v, 6)}$`;
      return { hstep: R`$h=${tn(S.h, 2)}$`, x: `$${tv(S.x, 3)}$`, xcomp: `$${tv(S.x, 3)}$`, f: R`$f(\mathbf{x})=${tn(fn.f(S.x), 5)}$`, grad: 'ze wzoru: ' + pair(fn.g(S.x)),
        cdiff: pair(M.numgrad(fn.f, S.x, S.h)), fdiff: pair(M.numgrad(fn.f, S.x, S.h, 'forward')),
        graderr: `różnice centralne: $${tn(errOf(fn, S.h, 'central'), 3)}$; różnice w przód: $${tn(errOf(fn, S.h, 'forward'), 3)}$` };
    };
    const missions = Missions('gradient', [
      { t: 'Gradient a poziomice', q: R`Wybierz funkcję falistą i przeciągaj punkt po wykresie. **Zastanów się:** pod jakim kątem wektor gradientu przecina poziomice? Co stanie się z jego długością na wierzchołku wzniesienia?`,
        acts: [['Funkcja falista', () => setFn('wave')]],
        a: R`Gradient jest zawsze **prostopadły** do poziomicy i wskazuje kierunek wzrostu funkcji. Jego długość (norma) określa stromość zbocza w danym punkcie. W maksimum, w minimum i w punkcie siodłowym (saddle point) gradient się zeruje: $\nabla f=0$. Są to punkty stacjonarne (stationary points) i właśnie ich szukają wszystkie omawiane tu metody.` },
      { t: 'Za duży krok', q: R`Funkcja falista, punkt poza osiami układu. Ustaw kolejno $h=1$, $0.1$ i $10^{-5}$. **Zastanów się:** dla którego $h$ czerwona strzałka przestanie odbiegać od zielonej?`,
        acts: [['$h=1$', () => { setFn('wave'); setH(1); }], ['$h=0.1$', () => setH(0.1)], ['$h=10^{-5}$', () => setH(1e-5)]],
        a: R`Dla $h=1$ porównujemy wartości w punktach odległych o $2$: to już nie jest nachylenie lokalne. Błąd obcięcia maleje jak $h^2$, więc dziesięciokrotnie mniejszy krok daje stukrotnie mniejszy błąd. Dla $h=0.1$ strzałki są już nieodróżnialne.` },
      { t: 'Za mały krok', q: R`Zmniejszaj $h$ aż do $10^{-13}$. **Zastanów się:** czy błąd będzie dalej malał?`,
        acts: [['$h=10^{-13}$', () => setH(1e-13)], ['$h=10^{-5}$', () => setH(1e-5)]],
        a: R`Nie: rośnie. Wartości $f(\mathbf{x}+h\mathbf{e}_i)$ i $f(\mathbf{x}-h\mathbf{e}_i)$ różnią się dopiero na ostatnich cyfrach znaczących. Przy odejmowaniu wspólne cyfry się znoszą (utrata cyfr znaczących, catastrophic cancellation), a dzielenie przez $2h$ wzmacnia błąd zaokrągleń do rzędu $\varepsilon/h$. Minimum krzywej przypada w okolicy $h\approx10^{-5}$ dla różnic centralnych i $10^{-8}$ dla różnic w przód.` },
      { t: 'Różnice centralne a różnice w przód', q: R`Przyjrzyj się prawej części wykresu błędu (skala podwójnie logarytmiczna). **Zastanów się:** o ile rzędów wielkości maleje błąd każdej z metod, gdy $h$ maleje o jeden rząd?`,
        a: R`Różnice w przód (forward differences): o jeden rząd, ponieważ błąd jest proporcjonalny do $h$ (metoda pierwszego rzędu). Różnice centralne: o dwa rzędy, ponieważ błąd jest proporcjonalny do $h^2$ (metoda drugiego rzędu). Wymaga to $2n$ zamiast $n+1$ obliczeń wartości $f$, ale zysk na dokładności jest bardzo duży. Dlatego zwykle stosuje się różnice centralne.` },
      { t: 'Funkcja kwadratowa: dokładny wynik mimo dużego kroku', q: R`Wybierz funkcję kwadratową i ustaw $h=1$. **Zastanów się:** jak duży będzie błąd różnic centralnych?`,
        acts: [['Funkcja kwadratowa, $h=1$', () => { setFn('bowl'); setH(1); }]],
        a: R`Praktycznie zerowy. Błąd obcięcia różnic centralnych zależy od trzeciej pochodnej, która dla funkcji kwadratowej jest równa zeru. Pozostaje wyłącznie błąd zaokrągleń, dlatego czerwona krzywa ma tu przebieg $\varepsilon/h$ (linia prosta w skali podwójnie logarytmicznej). Różnice w przód są obarczone błędem obcięcia nawet dla funkcji kwadratowej.` },
    ]);
    main.append(ftex, plots, stats.el, el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), missions);
    root.append(side, main);
    recompute(); update();
    return { el: root };
  },
});
