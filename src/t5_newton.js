/* =====================================================================
   Topic 5 — Newton's method: 1-D root finding and n-D minimisation
   ===================================================================== */
function switcher(label, options, builders) {
  const wrap = el('div'), host = el('div'), cache = {};
  const ch = Chips({ label, value: options[0].v, options });
  const show = v => { if (!cache[v]) cache[v] = builders[v](); stopAll(); host.replaceChildren(cache[v].el); };
  ch.onchange = show; ch.el.style.marginBottom = '16px';
  wrap.append(ch.el, host); show(options[0].v);
  return { el: wrap };
}
const ctxWalk = (ctx, cfg) => { const w = Walk(cfg); w.el.dataset.ctx = ctx; return w; };
const digits = err => (err === 0 ? 16 : Math.max(0, Math.min(16, Math.floor(-Math.log10(err)))));

TOPICS.push({
  id: 'newton', n: 5, title: 'Metoda Newtona', short: 'Metoda Newtona', task: 'Metoda drugiego rzędu',
  menu: 'Styczna zamiast krzywej, model kwadratowy zamiast funkcji. Dlaczego liczba poprawnych cyfr podwaja się w każdym kroku (zbieżność kwadratowa, quadratic convergence) i kiedy metoda zawodzi.',
  icon: `<path d="M8 60 H112"/><path d="M14 66 Q60 60 104 6"/><path class="a" d="M52 66 L100 8"/><circle class="p" cx="92" cy="18" r="3.5"/><circle class="p" cx="57" cy="60" r="3.5"/>`,

  walk() {
    return switcher('Wariant metody', [{ v: 'a', label: 'A. Pierwiastek równania (1D)' }, { v: 'b', label: 'B. Minimum funkcji (2D)' }], { a: () => this.walkRoot(), b: () => this.walkMin() });
  },

  walkRoot() {
    const fn = M.G.sqrt2, root = fn.root;
    return ctxWalk('newton1', {
      id: 'newton-a',
      intro: R`**Po co?** Metoda Newtona, nazywana też metodą stycznych, wyznacza pierwiastek równania $g(x)=0$. Idea: równanie nieliniowe trudno rozwiązać wprost, ale liniowe łatwo. Zastępujemy więc krzywą jej **styczną** i wyznaczamy miejsce zerowe stycznej. Klasyczny przykład: $g(x)=x^2-2$, którego pierwiastkiem jest $\sqrt2$.`,
      params: [{ id: 'x0', label: 'Punkt startowy $x_0$', value: 1, options: [{ v: 1, label: '$1$' }, { v: 3, label: '$3$' }, { v: 0.3, label: '$0.3$' }] }],
      algo: {
        title: 'Algorytm: metoda Newtona dla równania g(x) = 0',
        lines: [
          R`$x$ ← $x_0$ <span class="cm">(liść grafu obliczeń: <code>requires_grad=True</code>)</span>`,
          R`**powtórz** zadaną liczbę razy:`,
          R`    oblicz $g(x)$ i $g'(x)$ <span class="cm">(<code>g(x).backward()</code> wypełnia <code>x.grad</code>)</span>`,
          R`    $x$ ← $x-g(x)\,/\,g'(x)$ <span class="cm">(w bloku <code>no_grad</code>, potem nowy liść grafu)</span>`,
          R`    zapisz $x$`,
          R`**zwróć** tablicę kolejnych przybliżeń`,
        ],
      },
      logTitle: 'Kolejne przybliżenia',
      logHead: ['$k$', '$x_k$', R`$|x_k-\sqrt2|$`, '[[digits|poprawne cyfry]]'],
      visual(card) {
        const p = new Plot({ ratio: '1 / 0.84', xlabel: 'x', ylabel: 'g(x)', aria: 'Wykres funkcji g ze styczną w bieżącym punkcie' });
        card.innerHTML = `<div class="plot-t">${mdi(R`$g(x)=x^2-2$ i styczna w bieżącym punkcie`)}</div>`;
        card.append(p.el);
        const note = el('p', 'note'); card.append(note);
        card.insertAdjacentHTML('beforeend', legend([['line', C.black, '$g(x)$'], ['dash', C.red, 'styczna'], ['dot', C.red, 'bieżące przybliżenie $x_k$'], ['ring', C.green, 'miejsce zerowe stycznej']]));
        return {
          draw(s) {
            const xs = s.xs, x = xs[xs.length - 1], err = Math.abs(x - root), zoom = s.zoom && err < 0.2;
            const hw = Math.max(3.2 * err, 0.004);
            if (zoom) p.setView(root - hw, root + hw, fn.g(root - hw), fn.g(root + hw));
            else { const hi = Math.max(3.4, ...xs.map(v => v * 1.08)); p.setView(-0.4, hi, -3, Math.max(8, fn.g(hi))); }
            note.textContent = zoom ? `Powiększenie wokół pierwiastka: szerokość okna ${num(2 * hw, 2)}.` : '\u00a0';   // the line is always there, so the card keeps its height
            p.draw = q => {
              q.hline(0, { color: C.ink3 });
              q.fn(fn.g, { color: C.black, width: 2.4 });
              q.dots(xs.slice(0, -1).map(v => [v, 0]), { color: C.ghost, r: 3 });
              if (s.tan) { const d = fn.d(x), g = fn.g(x); q.fn(t => g + d * (t - x), { color: C.red, dash: [7, 4], width: 2, n: 2 }); }
              q.seg(x, 0, x, fn.g(x), { color: C.red, width: 1.2, dash: [2, 3] });
              q.dots([[x, fn.g(x)]], { color: C.red, r: 5.5, stroke: '#fff', lw: 1.5 });
              if (s.next != null) { q.dots([[s.next, 0]], { fill: '#fff', stroke: C.green, color: C.green, r: 5.5, lw: 2.4 }); }
              q.star(root, 0, { r: 6 });
            };
            p.render();
          },
        };
      },
      build(pv) {
        const fr = [], xs = [pv.x0]; let x = pv.x0;
        const row = (k, v) => [k, v.toFixed(15), num(Math.abs(v - root), 3), digits(Math.abs(v - root))];
        fr.push({
          group: 'Punkt wyjścia', title: 'Równanie i przybliżenie początkowe', line: 0, state: { xs: [x] }, log: row(0, x),
          html: md(R`Szukamy $x$, dla którego $g(x)=x^2-2=0$. Dokładne rozwiązanie to $\sqrt2=1.41421356237\ldots$ (gwiazdka na osi). Zakładamy, że go nie znamy.

Zaczynamy od $x_0=${tn(x)}$. Wartość $g(x_0)=${tn(fn.g(x))}$ nie jest równa zeru, więc przybliżenie trzeba poprawić.`),
        });
        for (let k = 0; k < 6; k++) {
          const g = fn.g(x), d = fn.d(x), xn = x - g / d, group = R`Iteracja ${k + 1}: z $x_{${k}}$ do $x_{${k + 1}}$`, cur = [...xs];
          if (k < 2) {
            fr.push({
              group, title: 'Wartość funkcji i pochodnej w bieżącym punkcie', line: 2, state: { xs: cur, zoom: k > 1 },
              html: md(R`$$g(x_{${k}})=${tp(x, 8)}^2-2=${tn(g, 8)},\qquad g'(x_{${k}})=2\cdot${tn(x, 8)}=${tn(d, 8)}$$
${k === 0 ? R`Pochodna to współczynnik kierunkowy stycznej. W PyTorch obliczy ją mechanizm automatycznego różniczkowania (autograd): po wywołaniu <code>g(x).backward()</code> wartość $g'(x)$ jest dostępna w <code>x.grad</code>.` : 'Te same dwa obliczenia, tylko w nowym punkcie.'}`),
            });
            const eq = R`x_{${k + 1}}=x_{${k}}-\frac{g(x_{${k}})}{g'(x_{${k}})}=${tn(x, 8)}-\frac{${tn(g, 8)}}{${tn(d, 8)}}`;
            const full = md(R`$$${eq}=${tn(xn, 10)}$$`);
            const txt = R`Styczna w punkcie $x_{${k}}$ ma równanie $y=g(x_{${k}})+g'(x_{${k}})\,(x-x_{${k}})$. Przyrównujemy ją do zera i wyznaczamy $x$:`;
            fr.push(k === 1
              ? { group, title: 'Miejsce zerowe stycznej: Twoja kolej', line: 3, state: { xs: cur, tan: true }, html: md(txt + R` $$${eq}=\ ?$$`), quiz: { prompt: R`Oblicz $x_2$ (co najmniej 4 cyfry po przecinku):`, answer: xn, tol: 2e-4, reveal: full } }
              : { group, title: 'Styczna i jej miejsce zerowe', line: 3, state: { xs: cur, tan: true, next: xn }, html: md(txt) + full + md(R`Zielone kółko na osi to nowe przybliżenie. Leży wyraźnie bliżej gwiazdki niż punkt wyjściowy.`) });
            xs.push(xn);
            fr.push({
              group, title: 'Jak daleko do rozwiązania?', line: 4, state: { xs: [...xs] }, log: row(k + 1, xn),
              html: md(R`$$|x_{${k + 1}}-\sqrt2|=${tn(Math.abs(xn - root), 3)}$$ Liczba poprawnych cyfr znaczących: około $${digits(Math.abs(xn - root))}$. Zapisujemy $x_{${k + 1}}$ i powtarzamy obliczenia.`),
            });
          } else {
            xs.push(xn);
            fr.push({
              group: 'Kolejne iteracje', title: R`Iteracja ${k + 1}`, line: [2, 3, 4], state: { xs: [...xs], zoom: true }, log: row(k + 1, xn),
              html: md(R`$$x_{${k + 1}}=${tn(x, 12)}-\frac{${tn(g, 4)}}{${tn(d, 8)}}=${xn.toFixed(15)}$$ Błąd: $${tn(Math.abs(xn - root), 3)}$${Math.abs(xn - root) < 1e-15 ? ', czyli zero w granicach dokładności arytmetyki zmiennoprzecinkowej' : ''}. ${k === 2 ? 'Wykres pokazuje teraz powiększenie: w tej skali krzywa jest niemal nieodróżnialna od swojej stycznej, dlatego miejsce zerowe stycznej tak dobrze przybliża pierwiastek.' : ''}`),
            });
          }
          x = xn;
        }
        fr.push({
          group: 'Wniosek', title: 'Zbieżność kwadratowa (quadratic convergence)', line: 3, state: { xs: [...xs], zoom: true },
          html: md(R`Spójrz na kolumnę błędu w tabeli. Każdy błąd jest w przybliżeniu **kwadratem** poprzedniego (pomnożonym przez stałą):
$$|x_{k+1}-x^{*}|\ \approx\ C\,|x_k-x^{*}|^2,\qquad\text{tutaj } C=\frac{g''}{2\,g'}=\frac{1}{2\sqrt2}\approx0.35$$
W praktyce oznacza to, że liczba poprawnych cyfr **podwaja się** w każdym kroku. Dla porównania: metoda zbieżna liniowo (linear convergence) zyskuje w każdym kroku stałą liczbę cyfr.`) +
            box('warn', 'Kiedy metoda zawodzi?', R`We wzorze występuje dzielenie przez $g'(x_k)$. Gdy styczna jest niemal pozioma, nowe przybliżenie wypada bardzo daleko. Metoda Newtona jest zbieżna lokalnie: szybka **w pobliżu** rozwiązania, a z dala od niego może wpaść w cykl albo się rozbiec. Przykłady znajdziesz w zakładce **Eksperymentuj**.`),
        });
        fr.push({
          group: 'Wniosek', title: 'Od pierwiastków do minimów', line: [2, 3], state: { xs: [...xs], zoom: true },
          html: md(R`W minimum funkcji $f$ pochodna jest równa zeru, więc **minimalizacja sprowadza się do wyznaczenia pierwiastka pochodnej**. Po podstawieniu $g=f'$ do wzoru Newtona otrzymujemy:
$$x_{k+1}=x_k-\frac{f'(x_k)}{f''(x_k)}$$
W przypadku wielowymiarowym pochodną zastępuje gradient, drugą pochodną hesjan (Hessian), a dzielenie zastępuje rozwiązanie układu równań liniowych. To wariant B.`) +
            box('nb', 'Implementacja', R`Prosty test: dla $g(x)=x^2-2$ i $x_0=1$ osiem kroków powinno dać $\sqrt2$ z błędem mniejszym niż $10^{-10}$. Wygodnie jest zwracać wszystkie kolejne przybliżenia, łącznie z punktem startowym: widać wtedy, jak szybko maleje błąd.`),
        });
        return fr;
      },
    });
  },

  walkMin() {
    const fn = M.F.cosh, x0 = [4, 3], aGD = 0.1;
    return Walk({
      id: 'newton-b',
      intro: R`**Po co?** Metoda spadku gradientu wykorzystuje tylko nachylenie funkcji. Metoda Newtona wykorzystuje także jej **krzywiznę**: w bieżącym punkcie buduje model kwadratowy funkcji (rozwinięcie Taylora drugiego rzędu) i przechodzi bezpośrednio do jego minimum. Poniżej te operacje wykonano krok po kroku dla funkcji zbudowanej z cosinusów hiperbolicznych.`,
      algo: {
        title: 'Algorytm: metoda Newtona dla minimalizacji',
        lines: [
          R`$\mathbf{x}$ ← punkt startowy <span class="cm">(zwykły tensor <code>float64</code>)</span>`,
          R`**powtórz** zadaną liczbę razy:`,
          R`    $\mathbf{g}$ ← gradient <span class="cm">(<code>jacobian(f, x)</code>)</span>`,
          R`    $H$ ← hesjan <span class="cm">(<code>hessian(f, x)</code>)</span>`,
          R`    $\mathbf{p}$ ← rozwiązanie układu $H\,\mathbf{p}=-\mathbf{g}$ <span class="cm">(<code>torch.linalg.solve</code>)</span>`,
          R`    $\mathbf{x}$ ← $\mathbf{x}+\mathbf{p}$`,
          R`    zapisz $\mathbf{x}$ oraz $f(\mathbf{x})$`,
          R`**zwróć** trajektorię i historię kosztu`,
        ],
      },
      logTitle: 'Metoda Newtona a spadek gradientu',
      logHead: ['$k$', R`$\mathbf{x}^{(k)}$ (Newton)`, R`$f-f^{*}$ (Newton)`, R`$f-f^{*}$ (spadek, $\alpha=0.1$)`],
      visual(card) {
        const p = new Plot({ equal: true, xlabel: 'x_0', ylabel: 'x_1', aria: 'Poziomice funkcji cosh z trajektorią metody Newtona i modelem kwadratowym' });
        card.innerHTML = `<div class="plot-t">${mdi(R`Funkcja $\cosh$ <small>gwiazdka: minimum $(1,\,-2)$</small>`)}</div>`;
        card.append(p.el);
        card.insertAdjacentHTML('beforeend', legend([['line', C.red, 'metoda Newtona'], ['line', C.green, 'spadek gradientu'], ['dash', C.black, 'poziomica modelu kwadratowego'], ['ring', C.black, 'minimum modelu']]));
        return {
          draw(s) {
            p.setView(...fn.view);
            p.draw = q => {
              drawField(q, fn);
              drawRun(q, s.gd, { color: C.green, width: 1.8, alpha: .8 });
              drawRun(q, s.pts, { color: C.red, shape: 'sq' });
              if (s.model) {
                const { c, h } = s.model, x = s.pts[s.pts.length - 1], lev = 0.5 * (h[0] * (x[0] - c[0]) ** 2 + h[1] * (x[1] - c[1]) ** 2), el2 = [];
                for (let i = 0; i <= 90; i++) { const t = i / 90 * 2 * Math.PI; el2.push([c[0] + Math.sqrt(2 * lev / h[0]) * Math.cos(t), c[1] + Math.sqrt(2 * lev / h[1]) * Math.sin(t)]); }
                q.path(el2, { color: C.black, dash: [5, 4], width: 1.6 });
                q.dots([c], { fill: '#fff', stroke: C.black, color: C.black, r: 5 });
                if (s.arrow) q.arrow(x[0], x[1], c[0], c[1], { color: C.red, width: 2.2, dash: [6, 4] });
              }
              if (s.g) { const x = s.pts[s.pts.length - 1], k = 1.5 / M.norm(s.g); q.arrow(x[0], x[1], x[0] - s.g[0] * k, x[1] - s.g[1] * k, { color: C.ghost, width: 2.4 }); q.label(x[0] - s.g[0] * k, x[1] - s.g[1] * k, [['−∇', 'r'], ['f', 'm']], { dx: -34, dy: -12, color: C.ink2 }); }
            };
            p.render();
          },
        };
      },
      build() {
        const fr = [], pts = [[...x0]], gd = [[...x0]]; let x = [...x0], xg = [...x0];
        const row = (k, v, w) => [k, vecs(v, 6), num(fn.f(v) - 2, 3), num(fn.f(w) - 2, 3)];
        fr.push({
          group: 'Punkt wyjścia', title: 'Funkcja i idea metody', line: 0, state: { pts: [[...x]], gd: [[...x]] }, log: row(0, x, xg),
          html: md(R`$$f(\mathbf{x})=\cosh(x_0-1)+\cosh(x_1+2),\qquad \mathbf{x}^{(0)}=(4,\ 3),\qquad f(\mathbf{x}^{(0)})=${tn(fn.f(x), 5)}$$
Minimum znajduje się w punkcie $(1,\,-2)$ i wynosi $f^{*}=2$. Ta funkcja **nie** jest kwadratowa: z dala od minimum rośnie wykładniczo.

W każdym kroku przybliżamy $f$ wokół bieżącego punktu wielomianem drugiego stopnia:
$$f(\mathbf{x}+\mathbf{p})\approx f(\mathbf{x})+\nabla f(\mathbf{x})^{\top}\mathbf{p}+\tfrac12\,\mathbf{p}^{\top}H(\mathbf{x})\,\mathbf{p}$$
i wybieramy takie $\mathbf{p}$, które minimalizuje prawą stronę.`),
        });
        for (let k = 0; k < 7; k++) {
          const g = fn.g(x), H = fn.H(x), st = M.newtonStep(fn, x), xn = st.x, xgn = M.gdStep(fn, xg, aGD), cur = pts.map(q => [...q]), gcur = gd.map(q => [...q]);
          const model = { c: xn, h: [H[0][0], H[1][1]] };
          if (k < 2) {
            const group = R`Iteracja ${k + 1}: z $\mathbf{x}^{(${k})}$ do $\mathbf{x}^{(${k + 1})}$`;
            fr.push({
              group, title: 'Gradient: nachylenie', line: 2, state: { pts: cur, gd: gcur, g },
              html: md(R`Pochodną funkcji $\cosh u$ jest $\sinh u$, więc pochodne cząstkowe to $\partial f/\partial x_0=\sinh(x_0-1)$ oraz $\partial f/\partial x_1=\sinh(x_1+2)$. Podstawiamy współrzędne punktu $\mathbf{x}^{(${k})}=${tv(x, 5)}$:
$$${al(R`\mathbf{g}=\nabla f(\mathbf{x}^{(${k})})`, R`\big(\sinh(x_0-1),\ \sinh(x_1+2)\big)`, R`\big(\sinh ${tn(x[0] - 1, 5)},\ \sinh ${tn(x[1] + 2, 5)}\big)`, tv(g, 5))}$$
${k === 0 ? 'Tylko tą informacją dysponuje metoda spadku gradientu. Szara strzałka pokazuje jej kierunek: zauważ, że **nie** wskazuje on minimum.' : ''}`),
            });
            fr.push({
              group, title: 'Hesjan: krzywizna', line: 3, state: { pts: cur, gd: gcur, model },
              html: md(R`Hesjan (Hessian), czyli macierz Hessego, to macierz drugich pochodnych cząstkowych. Różniczkujemy gradient jeszcze raz: pochodną $\sinh u$ jest $\cosh u$, a pochodne mieszane są równe zeru, bo każdy składnik funkcji zależy tylko od jednej zmiennej. Hesjan jest więc diagonalny:
$$H(\mathbf{x}^{(${k})})=\begin{bmatrix}\cosh(x_0-1)&0\\0&\cosh(x_1+2)\end{bmatrix}=${tm(H, 5)}$$
${k === 0 ? R`Krzywizna w kierunku $x_1$ jest około $${tn(H[1][1] / H[0][0], 2)}$ razy większa niż w kierunku $x_0$. Elipsa narysowana linią przerywaną to poziomica modelu kwadratowego zbudowanego z $\mathbf{g}$ i $H$, a okrąg oznacza jego minimum.` : 'Im bliżej minimum, tym lepiej model kwadratowy przybliża funkcję.'}`),
            });
            const pL = R`\mathbf{p}=-H^{-1}\mathbf{g}`, p1 = R`\Big(-\frac{${tn(g[0], 5)}}{${tn(H[0][0], 5)}},\ -\frac{${tn(g[1], 5)}}{${tn(H[1][1], 5)}}\Big)`;
            const full = md(R`$$${al(pL, p1, tv(st.p, 5))}$$`);
            const txt = R`Minimum modelu spełnia **układ równań Newtona** $H\,\mathbf{p}=-\mathbf{g}$. Tutaj $H$ jest diagonalny, więc każde równanie rozwiązujemy osobno. W przypadku ogólnym układ rozwiąże <code>torch.linalg.solve</code>.`;
            fr.push(k === 1
              ? { group, title: 'Układ równań Newtona: Twoja kolej', line: 4, state: { pts: cur, gd: gcur, model, arrow: true }, html: md(txt + R` $$${al(pL, p1, R`\big(\ ?\ ,\ ${tn(st.p[1], 5)}\big)`)}$$`), quiz: { prompt: R`Oblicz pierwszą składową $\mathbf{p}$:`, answer: st.p[0], tol: 2e-3, reveal: full } }
              : { group, title: 'Układ równań Newtona', line: 4, state: { pts: cur, gd: gcur, model, arrow: true }, html: md(txt) + full + md(R`Każda składowa gradientu została podzielona przez odpowiadającą jej krzywiznę: w kierunku stromym krok jest krótszy, a w łagodnym dłuższy. Dlatego krok Newtona jest skierowany bliżej minimum niż antygradient.`) });
            pts.push([...xn]); gd.push([...xgn]);
            fr.push({
              group, title: 'Krok i nowy koszt', line: [5, 6], state: { pts: pts.map(q => [...q]), gd: gd.map(q => [...q]) }, log: row(k + 1, xn, xgn),
              html: md(R`$$${al(R`\mathbf{x}^{(${k + 1})}`, R`\mathbf{x}^{(${k})}+\mathbf{p}`, R`${tv(x, 5)}+${tv(st.p, 5)}`, tv(xn, 5))}$$
Nadwyżka kosztu ponad minimum: $f-f^{*}=${tn(fn.f(x) - 2, 4)}\ \to\ ${tn(fn.f(xn) - 2, 4)}$. Nie ma tu współczynnika uczenia: długość kroku wynika z krzywizny.`),
            });
          } else {
            pts.push([...xn]); gd.push([...xgn]);
            fr.push({
              group: 'Kolejne iteracje', title: R`Iteracja ${k + 1}`, line: [2, 3, 4, 5], state: { pts: pts.map(q => [...q]), gd: gd.map(q => [...q]) }, log: row(k + 1, xn, xgn),
              html: md(R`$$\begin{aligned}\mathbf{p}&=${tv(st.p, 4)}\\ \mathbf{x}^{(${k + 1})}&=${tv(xn, 8)}\\ f-f^{*}&=${tn(fn.f(xn) - 2, 3)}\end{aligned}$$
${k === 2 ? 'Z dala od minimum postęp jest umiarkowany: model kwadratowy słabo przybliża funkcję rosnącą wykładniczo.' : k === 4 ? 'Teraz rozpoczyna się faza szybkiej zbieżności: zobacz w tabeli, jak maleje błąd.' : ''}`),
            });
          }
          x = xn; xg = xgn;
        }
        fr.push({
          group: 'Wniosek', title: 'Dwie fazy zbieżności', line: 4, state: { pts: pts.map(q => [...q]), gd: gd.map(q => [...q]) },
          html: md(R`W tabeli widać dwie fazy. Z dala od minimum koszt maleje powoli. W pobliżu minimum każdy błąd jest w przybliżeniu **kwadratem** poprzedniego: $\lVert\mathbf{x}^{(k+1)}-\mathbf{x}^{*}\rVert\le C\,\lVert\mathbf{x}^{(k)}-\mathbf{x}^{*}\rVert^2$. Metoda spadku gradientu zmniejsza w tym czasie błąd o stały ułamek w każdym kroku (zbieżność liniowa).`) +
            box('def', 'Koszt szybkiej zbieżności', R`Hesjan ma $n\times n$ elementów, a rozwiązanie układu równań wymaga rzędu $n^3$ działań. Dla dwóch parametrów to koszt pomijalny, ale dla miliona parametrów sieci neuronowej jest to bariera nie do pokonania. Dla funkcji **kwadratowej** model jest dokładny, więc metoda Newtona osiąga minimum w jednym kroku.`) +
            box('nb', 'Implementacja', R`Prosty test: z punktu $(4,\,3)$ osiem kroków powinno doprowadzić do $(1,\,-2)$ z dokładnością $10^{-6}$. W PyTorch gradient i hesjan obliczysz funkcjami <code>jacobian</code> i <code>hessian</code> z modułu <code>torch.autograd.functional</code>: nie potrzebujesz wtedy <code>requires_grad</code> ani odtwarzania liścia grafu.`),
        });
        return fr;
      },
    });
  },

  lab() {
    return switcher('Wariant eksperymentu', [{ v: 'a', label: 'A. Pierwiastek równania (1D)' }, { v: 'b', label: 'B. Minimum funkcji (2D)' }], { a: () => this.labRoot(), b: () => this.labMin() });
  },

  labRoot() {
    const S = { fn: 'sqrt2', xs: [1] };
    const root = el('div', 'lab'), side = el('aside', 'lab-side'), main = el('div', 'lab-main');
    root.dataset.ctx = 'newton1';
    const sel = Select({ label: 'Równanie $g(x)=0$', value: S.fn, options: Object.values(M.G).map(g => ({ v: g.id, label: g.label })) });
    const xS = Slider({ label: 'Punkt startowy $x_0$', aria: 'punkt startowy', min: -0.5, max: 3.4, step: 0.01, value: 1, hint: 'Możesz też kliknąć na wykresie.' });
    const ctl = el('section', 'card'); ctl.innerHTML = '<h3 class="card-h">Ustawienia</h3>'; ctl.append(sel.el, xS.el);
    const status = el('p', 'status'); status.setAttribute('role', 'status');
    const bStep = Btn('Krok', 'pri', () => { step(); draw(); }), b5 = Btn('5 kroków', '', () => { for (let i = 0; i < 5; i++) step(); draw(); }), bReset = Btn('Od nowa', '', () => reset());
    const run = el('section', 'card'); run.innerHTML = '<h3 class="card-h">Przebieg</h3>'; const row = el('div', 'btns'); row.append(bStep, b5, bReset); run.append(row);
    side.append(ctl, run);
    const info = el('div', 'card fbox');
    const p = new Plot({ ratio: '1 / 0.62', xlabel: 'x', ylabel: 'g(x)', aria: 'Wykres funkcji g ze stycznymi z kolejnych iteracji' });
    const table = el('div', 'card tblw fixh');
    main.append(info, status, plotCard('Funkcja i styczne z kolejnych kroków <small>kliknij, aby wybrać $x_0$</small>', p, legend([['line', C.black, '$g(x)$'], ['dash', C.red, 'styczna z ostatniego kroku'], ['dash', C.ghost, 'wcześniejsze styczne'], ['dot', C.red, 'bieżące przybliżenie $x_k$']])), table);
    const G = () => M.G[S.fn];
    function reset(x0) { if (x0 != null) xS.set(x0, false); S.xs = [xS.value]; status.className = 'status'; status.textContent = 'Zastanów się, czego się spodziewasz, i wykonaj pierwszy krok.'; draw(); }
    function step() {
      const g = G(), x = S.xs[S.xs.length - 1]; if (S.xs.length > 60 || !Number.isFinite(x) || Math.abs(x) > 1e8) return;
      const xn = M.newton1(g, x); S.xs.push(xn);
      const n = S.xs.length;
      if (!Number.isFinite(xn) || Math.abs(xn) > 1e8) { status.className = 'status bad'; status.textContent = 'Rozbieżność: kolejne przybliżenia oddalają się do nieskończoności.'; }
      else if (Math.abs(xn - g.root) < 1e-12) { status.className = 'status'; status.textContent = `Zbieżność po ${n - 1} krokach: błąd poniżej 10⁻¹².`; }
      else if (n >= 5 && Math.abs(xn - S.xs[n - 3]) < 1e-9 && Math.abs(xn - S.xs[n - 2]) > 1e-3) { status.className = 'status bad'; status.textContent = 'Cykl: metoda przeskakuje na przemian między tymi samymi punktami i nie jest zbieżna.'; }
      else if (Math.abs(xn - g.root) > Math.abs(x - g.root) * 1.5) { status.className = 'status bad'; status.textContent = 'Ten krok oddalił przybliżenie od pierwiastka.'; }
      else { status.className = 'status'; status.textContent = 'Krok wykonany.'; }
    }
    function draw() {
      const g = G(); info.innerHTML = `<div>${K(g.tex)}</div><div class="note">Pierwiastek: ${K(R`x^{*}=${g.root.toFixed(10)}`)}</div>`;
      p.setView(...g.view);
      p.draw = q => {
        q.hline(0, { color: C.ink3 }); q.fn(g.g, { color: C.black, width: 2.4 });
        const n = S.xs.length;
        S.xs.forEach((x, i) => { if (i === n - 1 || !Number.isFinite(x)) return; const last = i === n - 2, gx = g.g(x), d = g.d(x); q.fn(t => gx + d * (t - x), { color: last ? C.red : C.ghost, dash: [6, 4], width: last ? 2 : 1.3, n: 2, alpha: last ? 1 : .8 }); q.seg(x, 0, x, gx, { color: last ? C.red : C.ghost, width: 1, dash: [2, 3] }); q.dots([[x, gx]], { color: last ? C.red : C.ghost, r: 3.5 }); });
        const x = S.xs[n - 1];
        if (Number.isFinite(x)) { q.seg(x, 0, x, g.g(x), { color: C.red, width: 1.2, dash: [2, 3] }); q.dots([[x, 0]], { color: C.red, r: 5.5, stroke: '#fff', lw: 1.5 }); }
        q.star(g.root, 0, { r: 6 });
      };
      p.render();
      const rows = S.xs.map((x, k) => [k, x, g.g(x), Math.abs(x - g.root)]).slice(-12);
      table.innerHTML = `<table class="tbl"><thead><tr><th>${K('k')}</th><th>${K('x_k')}</th><th>${K('g(x_k)')}</th><th>${K(R`|x_k-x^{*}|`)}</th><th data-g="digits">poprawne cyfry</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${Number.isFinite(r[1]) ? (Math.abs(r[1]) < 1e4 ? r[1].toFixed(12) : num(r[1], 6)) : '—'}</td><td>${num(r[2], 4)}</td><td>${num(r[3], 3)}</td><td>${Number.isFinite(r[3]) ? digits(r[3]) : '—'}</td></tr>`).join('')}</tbody></table>`;
    }
    const setFn = (id, x0) => { S.fn = id; sel.set(id, false); const g = G(); xS.setRange(g.view[0], g.view[1], 0.01, x0 ?? g.x0); reset(); };
    sel.onchange = v => setFn(v); xS.oninput = () => reset();
    p.pickable(x => { const v = G().view; reset(parseFloat(Math.max(v[0], Math.min(v[1], x)).toFixed(2))); });
    root._live = () => {
      const g = G(), k = S.xs.length - 1, x = S.xs[k], v = R`$x_{${k}}=${tn(x, 10)}$`;
      return { xk: v, xcomp: v, xscal: v, kiter: `$k=${k}$`, gfun: R`$g(x_{${k}})=${tn(g.g(x), 5)}$`, gprime: R`$g'(x_{${k}})=${tn(g.d(x), 5)}$`,
        xstar: R`$x^{*}=${g.root.toFixed(10)}$`, abs: R`$|x_{${k}}-x^{*}|=${tn(Math.abs(x - g.root), 3)}$`, digits: 'około ' + digits(Math.abs(x - g.root)) };
    };
    main.append(el('h3', 'h-sec', 'Misje: najpierw spróbuj przewidzieć, potem poeksperymentuj'), Missions('newton-a', [
      { t: 'Ile kroków do dziesięciu poprawnych cyfr?', q: R`Równanie $x^2-2=0$, punkt startowy $x_0=1$. **Zastanów się:** po ilu krokach przybliżenie będzie miało $10$ poprawnych cyfr: po pięciu czy po dwudziestu?`,
        acts: [['Ustaw $x_0=1$', () => setFn('sqrt2', 1)]],
        a: R`Po czterech. Liczba poprawnych cyfr rośnie w przybliżeniu następująco: $0,\ 1,\ 2,\ 5,\ 11,\ 16$. Na tym polega zbieżność kwadratowa: liczba poprawnych cyfr mniej więcej podwaja się w każdym kroku.` },
        { t: 'Styczna prawie pozioma', q: R`To samo równanie, ale punkt startowy $x_0=0.05$, tuż obok punktu, w którym $g'(x)=0$. **Zastanów się:** gdzie znajdzie się $x_1$?`,
        acts: [['Ustaw $x_0=0.05$', () => setFn('sqrt2', 0.05)]],
        a: R`Bardzo daleko: $x_1\approx20$. Niemal pozioma styczna przecina oś daleko od punktu styczności. Metoda ostatecznie jest zbieżna (z dala od pierwiastka każdy krok w przybliżeniu zmniejsza $x$ o połowę), ale traci na to kilka iteracji.` },
      { t: 'Pułapka: cykl', q: R`Równanie $x^3-2x+2=0$, punkt startowy $x_0=0$. **Zastanów się:** jak zachowa się metoda Newtona? Wykonaj kilka pojedynczych kroków.`,
        acts: [['Start $x_0=0$', () => setFn('cubic', 0)], ['Start $x_0=-2.2$', () => setFn('cubic', -2.2)]],
        a: R`Wpada w cykl: $0\to1\to0\to1\dots$ i nigdy nie osiągnie pierwiastka $-1.769$. Styczna w punkcie $0$ prowadzi do $1$, a styczna w punkcie $1$ z powrotem do $0$. Z punktu startowego $-2.2$, położonego bliżej pierwiastka, ta sama metoda zbiega w kilku krokach.` },
      { t: 'Pułapka: rozbieżność', q: R`Równanie $\operatorname{arctg}x=0$ ma pierwiastek w zerze. Porównaj punkty startowe $x_0=1.3$ i $x_0=1.5$. **Zastanów się:** czy tak niewielka zmiana punktu startowego może zmienić wynik?`,
        acts: [['Start $x_0=1.3$', () => setFn('atan', 1.3)], ['Start $x_0=1.5$', () => setFn('atan', 1.5)]],
        a: R`Może. Z punktu $1.3$ metoda zbiega, a z punktu $1.5$ każde kolejne przybliżenie leży dalej od zera i po jego przeciwnej stronie. Granica przebiega w pobliżu $|x_0|\approx1.39$. Wniosek: zbieżność metody Newtona jest gwarantowana tylko **lokalnie**, dlatego metoda wymaga dobrego punktu startowego.` },
    ]));
    root.append(side, main); reset();
    return { el: root };
  },

  labMin() {
    let aS;
    const RANGE = { cosh: [0.01, 1, 0.01, 0.1], bowl: [0.005, 0.6, 0.005, 0.1], valley: [0.0002, 0.03, 0.0002, 0.0198], twin: [0.005, 0.3, 0.005, 0.05] };
    const kind = (r, fn) => { const e = M.eig2(fn.H(r.pts[r.pts.length - 1])); return e[0] > 1e-9 ? 'dodatnio określony' : e[1] < -1e-9 ? '<span style="color:var(--red)">ujemnie określony</span>' : '<span style="color:var(--red)">nieokreślony</span>'; };
    return TrajLab({
      fn: 'cosh', fns: ['cosh', 'bowl', 'valley', 'twin'], speed: 3, maxSteps: 2000, mid: 'newton-b',
      live: () => ({ alpha: R`spadek gradientu: $\alpha=${tn(aS.value, 4)}$; metoda Newtona nie ma współczynnika uczenia` }),
      controls(api) {
        aS = Slider({ label: R`Współczynnik uczenia $\alpha$ (spadek gradientu)`, aria: 'współczynnik uczenia alfa', min: 0.01, max: 1, step: 0.01, value: 0.1, hint: 'Metoda Newtona nie ma współczynnika uczenia.' });
        aS.oninput = () => api.reset();
        return [aS];
      },
      onFn(fn) { const r = RANGE[fn.id]; aS.setRange(r[0], r[1], r[2], r[3]); },
      methods: () => [
        { name: 'Spadek gradientu', color: C.green, step: (st, fn) => ({ x: M.gdStep(fn, st.x, aS.value) }) },
        { name: 'Metoda Newtona', color: C.red, dash: [7, 4], shape: 'sq', step: (st, fn) => { const r = M.newtonStep(fn, st.x); return r && { x: r.x }; } },
      ],
      extraCol: { g: 'hesskind', head: 'Hesjan w bieżącym punkcie', cell: kind },
      info: api => `<div>${K(api.fn.tex)}</div><div class="note">Krok Newtona: ${K(R`H\,\mathbf{p}=-\nabla f,\ \ \mathbf{x}\leftarrow\mathbf{x}+\mathbf{p}`)}. Animacja jest celowo powolna, aby widoczne były pojedyncze kroki.</div>`,
      missions(api) {
        const set = (fn, x0, a) => { api.setFn(fn, x0); if (a) aS.set(a, false); api.run(); };
        return [
          { t: 'Przykład podstawowy', q: R`Funkcja $\cosh$, punkt startowy $(4,\,3)$, metoda spadku gradientu z $\alpha=0.1$. **Zastanów się:** ilu kroków potrzebuje każda z metod, aby uzyskać $f-f^{*}<10^{-6}$? Jaki kształt będą miały obie krzywe na wykresie kosztu?`,
            acts: [['Uruchom przykład', () => set('cosh', [4, 3], 0.1)]],
            a: R`Metoda Newtona: $7$ kroków. Metoda spadku gradientu: około $70$. Ważniejszy od samych liczb jest **kształt** krzywych w skali logarytmicznej: dla spadku gradientu jest to linia prosta (stały ułamek błędu w każdym kroku, zbieżność liniowa), a dla metody Newtona krzywa opadająca coraz bardziej stromo (zbieżność kwadratowa).` },
          { t: 'Funkcja kwadratowa', q: R`Wybierz funkcję o wąskiej dolinie ($\kappa=100$), dla której metoda spadku gradientu potrzebowała ponad $500$ kroków. **Zastanów się:** ilu kroków potrzebuje metoda Newtona?`,
            acts: [['Wąska dolina', () => set('valley')], ['Funkcja kwadratowa („miska”)', () => set('bowl')]],
            a: R`Jednego. Dla funkcji kwadratowej model kwadratowy **jest** tą funkcją, więc przejście do minimum modelu oznacza przejście do minimum funkcji. Wskaźnik uwarunkowania (condition number) $\kappa$, który tak spowalniał metodę spadku gradientu, nie ma tu znaczenia: hesjan kompensuje różnice krzywizn.` },
          { t: 'Hesjan nieokreślony', q: R`Funkcja z dwiema dolinami, punkt startowy $(0.35,\ 1.9)$. **Zastanów się:** do jakiego punktu zbiegnie metoda Newtona? Zwróć uwagę na ostatnią kolumnę tabeli.`,
            acts: [['Start $(0.35,\\,1.9)$', () => set('twin', [0.35, 1.9], 0.05)], ['Start $(0.6,\\,1)$', () => set('twin', [0.6, 1], 0.05)]],
            a: R`Do **punktu siodłowego** (saddle point) na grzbiecie między dolinami (szara gwiazdka). Metoda Newtona szuka punktu stacjonarnego, czyli takiego, w którym $\nabla f=0$, i nie odróżnia minimum od punktu siodłowego ani od maksimum. Gdy hesjan nie jest dodatnio określony, model kwadratowy nie ma minimum, a krok może prowadzić w kierunku wzrostu funkcji. Z punktu $(0.6,\,1)$ metoda Newtona przechodzi z kolei do doliny po przeciwnej stronie.` },
        ];
      },
    });
  },
});
