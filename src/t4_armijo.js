/* =====================================================================
   Topic 4 — backtracking line search with the Armijo condition (theory 1.6, intro example 2)
   ===================================================================== */
TOPICS.push({
  id: 'armijo', n: 4, title: 'Poszukiwanie w kierunku (line search) i warunek Armijo', short: 'Dobór kroku', task: 'Dobór długości kroku',
  menu: 'Zamiast zgadywać współczynnik uczenia, dobierz długość kroku automatycznie: skracaj krok, dopóki nie zapewni dostatecznego spadku (sufficient decrease) kosztu.',
  icon: `<path d="M10 12 Q40 76 76 40 T112 10"/><path class="a" d="M10 12 L112 30"/><circle class="p" cx="96" cy="23" r="3"/><circle class="p" cx="62" cy="49" r="4"/>`,

  walk() {
    const fn = M.F.valley, x = [5, 5];
    return Walk({
      id: 'armijo', live: pv => ({ c1: R`$c_1=${tn(pv.c1)}$`, rho: R`$\rho=${tn(pv.rho)}$` }),
      intro: R`**Po co?** W poprzednich tematach współczynnik uczenia $\alpha$ trzeba było dobierać ręcznie: zbyt duży prowadził do rozbieżności, a zbyt mały do bardzo wolnej zbieżności. Poszukiwanie w kierunku (line search) dobiera długość kroku automatycznie, osobno w każdej iteracji. Najprostszy wariant to metoda z nawrotami (backtracking): zaczynamy od długiego kroku i skracamy go, dopóki nie zostanie spełniony warunek Armijo. Poniżej pełny przykład liczbowy.`,
      params: [
        { id: 'c1', label: R`Stała $c_1$`, value: 1e-4, options: [{ v: 1e-4, label: '$10^{-4}$ (wartość typowa)' }, { v: 0.3, label: '$0.3$' }] },
        { id: 'rho', label: R`Współczynnik skracania $\rho$`, value: 0.5, options: [{ v: 0.5, label: '$0.5$ (połowienie)' }, { v: 0.7, label: '$0.7$' }] },
      ],
      algo: {
        title: 'Algorytm: metoda z nawrotami (backtracking) z warunkiem Armijo',
        lines: [
          R`$\mathbf{p}$ ← $-\nabla f(\mathbf{x})$ <span class="cm">(kierunek spadku)</span>`,
          R`$\alpha$ ← $1$`,
          R`**dopóki** $f(\mathbf{x}+\alpha\mathbf{p})>f(\mathbf{x})+c_1\,\alpha\,\nabla f(\mathbf{x})^{\top}\mathbf{p}$:`,
          R`    $\alpha$ ← $\rho\cdot\alpha$ <span class="cm">(krok zbyt długi: skróć)</span>`,
          R`$\mathbf{x}$ ← $\mathbf{x}+\alpha\,\mathbf{p}$ <span class="cm">(krok zaakceptowany)</span>`,
        ],
      },
      logTitle: 'Kolejne próby',
      logHead: [R`$\alpha$`, R`$f(\mathbf{x}+\alpha\mathbf{p})$`, '[[armijo|granica Armijo]]', 'decyzja'],
      logEmpty: 'Tabela wypełni się po pierwszej próbie.',
      visual(card) {
        const p = new Plot({ xlog: true, ylog: true, ratio: '1 / 0.86', xlabel: R`\alpha`, ylabel: R`\varphi(\alpha)`, aria: 'Koszt wzdłuż kierunku spadku w funkcji długości kroku alfa, z granicą Armijo i kolejnymi próbami' });
        card.innerHTML = `<div class="plot-t">${mdi(R`Koszt wzdłuż kierunku spadku <small>$\varphi(\alpha)=f(\mathbf{x}+\alpha\mathbf{p})$, obie osie logarytmiczne</small>`)}</div>`;
        card.append(p.el);
        card.insertAdjacentHTML('beforeend', legend([['line', C.black, '$\\varphi(\\alpha)$'], ['dash', C.green, '[[armijo|granica Armijo]]'], ['ring', C.red, 'próba odrzucona'], ['dot', C.green, 'próba zaakceptowana']]) + '<p class="note">Krok jest akceptowalny tam, gdzie czarna krzywa leży poniżej zielonej granicy.</p>');
        return {
          draw(s) {
            const phi = a => fn.f(M.add(x, M.scale(s.p, a))), bound = a => s.f0 + s.c1 * a * s.slope;
            p.setView(2e-3, 2, 4, 5e7);
            p.draw = q => {
              if (s.showBound) q.fn(a => Math.max(bound(a), 1e-3), { color: C.green, dash: [7, 4], width: 2.2 });
              q.fn(phi, { color: C.black, width: 2.4 });
              q.hline(s.f0, { color: C.ink3, dash: [2, 4], width: 1 });
              q.label(1.6, s.f0, [['f', 'm'], ['(', 'r'], ['x', 'b'], [')', 'r']], { align: 'right', dy: -11, color: C.ink2, size: 14 });
              s.trials.forEach((t, i) => {
                const cur = i === s.trials.length - 1;
                q.dots([[t.a, t.phi]], t.ok ? { color: C.green, r: cur ? 6.5 : 5, stroke: '#fff', lw: 1.5 } : { fill: '#fff', stroke: C.red, color: C.red, r: cur ? 6 : 4.5, lw: cur ? 2.6 : 1.8 });
              });
            };
            p.render();
          },
        };
      },
      build(pv) {
        const { c1, rho } = pv, r = M.armijo(fn, x, c1, rho), fr = [];
        const base = { p: r.p, f0: r.f0, slope: r.slope, c1 };
        fr.push({
          group: 'Przygotowanie', title: 'Punkt, kierunek i pytanie', line: 0, state: { ...base, trials: [], showBound: false },
          html: md(R`Funkcja o wąskiej dolinie: $f(\mathbf{x})=\tfrac12(x_0^2+100\,x_1^2)$. Bieżący punkt to $\mathbf{x}=(5,\ 5)$, w którym $f(\mathbf{x})=${tn(r.f0)}$.
$$\nabla f(\mathbf{x})=(x_0,\ 100\,x_1)=${tv(r.g)},\qquad \mathbf{p}=-\nabla f(\mathbf{x})=${tv(r.p)}$$
Kierunek spadku (descent direction) jest już znany. Pozostaje pytanie: **jak daleko** przesunąć się wzdłuż niego? Wzdłuż kierunku $\mathbf{p}$ koszt zależy tylko od jednej liczby, długości kroku (step size) $\alpha$:
$$\varphi(\alpha)=f(\mathbf{x}+\alpha\,\mathbf{p})$$
Czarna krzywa na wykresie pokazuje, że koszt najpierw maleje, a potem gwałtownie rośnie: przeciwległe zbocze doliny jest strome.`),
        });
        fr.push({
          group: 'Przygotowanie', title: 'Warunek Armijo: dostateczny spadek (sufficient decrease)', line: 2, state: { ...base, trials: [], showBound: true },
          html: md(R`Nie wystarczy, aby koszt po prostu zmalał. Wymagamy, aby zmalał co najmniej o ułamek $c_1$ spadku przewidywanego przez przybliżenie liniowe:
$$f(\mathbf{x}+\alpha\mathbf{p})\ \le\ f(\mathbf{x})+c_1\,\alpha\,\nabla f(\mathbf{x})^{\top}\mathbf{p}$$
Iloczyn $\nabla f(\mathbf{x})^{\top}\mathbf{p}=-(5^2+500^2)=${tn(r.slope, 7)}$ to pochodna funkcji $\varphi$ w zerze (pochodna kierunkowa). Dla $c_1=${tn(c1)}$ prawa strona to
$$\text{granica}(\alpha)=${tn(r.f0)}-${tn(-c1 * r.slope, 6)}\cdot\alpha$$
(zielona linia). ${c1 < 0.01 ? R`Przy tak małym $c_1$ granica leży tuż poniżej poziomu $f(\mathbf{x})$: zaakceptowany zostanie niemal każdy krok zmniejszający koszt.` : R`Przy dużym $c_1$ granica opada stromo: zaakceptowany zostanie tylko krok zapewniający duży spadek kosztu.`}`),
        });
        r.trials.forEach((t, i) => {
          const seen = r.trials.slice(0, i + 1);
          fr.push({
            group: 'Próby: skracanie kroku', title: R`Próba ${i + 1}: $\alpha=${tn(t.a, 4)}$`, line: t.ok ? 2 : [2, 3], state: { ...base, trials: seen, showBound: true },
            log: [num(t.a, 4), num(t.phi, 5), num(t.bound, 6), t.ok ? '<strong style="color:var(--green-d)">zaakceptowana</strong>' : '<span style="color:var(--red)">odrzucona</span>'],
            html: md(R`$$\varphi(${tn(t.a, 4)})=${tn(t.phi, 5)}\qquad\text{granica: }${tn(t.bound, 6)}$$
${t.ok ? R`$${tn(t.phi, 5)}\le${tn(t.bound, 6)}$: warunek **spełniony**. Kończymy skracanie.` : R`$${tn(t.phi, 5)}>${tn(t.bound, 6)}$: krok **zbyt długi**${i === 0 ? R`, koszt wzrósł ponad $${tn(t.phi / r.f0, 2)}$ razy. Punkt znalazł się daleko po przeciwnej stronie doliny` : ''}. Skracamy: $\alpha\leftarrow${tn(rho)}\cdot${tn(t.a, 4)}=${tn(t.a * rho, 4)}$.`}`),
          });
        });
        const last = r.trials[r.trials.length - 1], aStar = M.dot(r.g, r.g) / (r.g[0] ** 2 + 100 * r.g[1] ** 2);
        fr.push({
          group: 'Krok', title: 'Wykonaj krok o zaakceptowanej długości', line: 4, state: { ...base, trials: r.trials, showBound: true },
          html: md(R`$$\mathbf{x}_{\text{nowy}}=\mathbf{x}+\alpha\,\mathbf{p}=(5,\ 5)+${tn(r.a, 4)}\cdot${tv(r.p)}=${tv(r.x, 4)}$$
Koszt: $${tn(r.f0)}\ \to\ ${tn(last.phi, 5)}$ po $${r.trials.length}$ próbach, czyli $${r.trials.length}$ dodatkowych obliczeniach wartości funkcji.`) +
            box('def', 'Krok dostatecznie dobry, niekoniecznie optymalny', R`Najmniejszy koszt wzdłuż tego kierunku uzyskuje się dla $\alpha\approx${tn(aStar, 3)}$. Metoda z nawrotami nie szuka tej wartości: akceptuje **pierwszy** krok zapewniający dostateczny spadek. To celowy kompromis, ponieważ dokładna minimalizacja w kierunku (exact line search) wymagałaby wielu obliczeń wartości $f$, a kierunek i tak zmieni się w następnej iteracji.`),
        });
        fr.push({
          group: 'Krok', title: 'Związek z pozostałymi tematami', line: [1, 2, 3], state: { ...base, trials: r.trials, showBound: true },
          html: md(R`Zauważ, że zaakceptowana wartość $\alpha=${tn(r.a, 4)}$ leży poniżej granicy stabilności $2/L=0.02$ z tematu o metodzie spadku gradientu. Poszukiwanie w kierunku znalazło bezpieczną długość kroku **bez znajomości** $L$.`) +
            box('nb', 'Do przemyślenia', R`Poszukiwanie w kierunku dobiera **długość** kroku, a moment zmienia jego **kierunek**. Czy te pomysły się wykluczają? Porównaj je w zakładce **Eksperymentuj**: przekonasz się, że poszukiwanie w kierunku rozwiązuje problem doboru $\alpha$, ale nie eliminuje oscylacji w wąskiej dolinie.`),
        });
        return fr;
      },
    });
  },

  lab() {
    let cS, rS, aS;
    const RANGE = { valley: [0.0002, 0.03, 0.0002, 0.0198], bowl: [0.005, 0.6, 0.005, 0.1], cosh: [0.01, 1, 0.01, 0.1], twin: [0.005, 0.4, 0.005, 0.05] };
    const pA = new Plot({ ylog: true, xlabel: 'k', ylabel: R`\alpha_k`, aria: 'Długość kroku przyjęta w kolejnych iteracjach' });
    return TrajLab({
      fn: 'valley', fns: ['valley', 'bowl', 'cosh', 'twin'], speed: 30, mid: 'armijo',
      live: api => { const as = api.runs[1] ? api.runs[1].st.as : []; return {
        c1: R`$c_1=${tn(cS.value, 2)}$`, rho: R`$\rho=${tn(rS.value)}$`,
        alpha: R`stały współczynnik: $\alpha=${tn(aS.value, 4)}$; ostatnia długość kroku zaakceptowana przez poszukiwanie w kierunku: ` + (as.length ? R`$\alpha=${tn(as[as.length - 1], 4)}$` : 'jeszcze nie wykonano kroku'),
        evals: api.runs.map(r => r.m.name + ': ' + r.st.ev).join('; ') }; },
      controls(api) {
        cS = Slider({ label: R`Stała $c_1$ w warunku Armijo`, aria: 'stała c1', min: 1e-4, max: 0.9, value: 1e-4, log: true, sig: 2 });
        rS = Slider({ label: R`Współczynnik skracania $\rho$`, aria: 'współczynnik skracania ro', min: 0.1, max: 0.9, step: 0.05, value: 0.5 });
        aS = Slider({ label: R`Stały współczynnik $\alpha$ (metoda porównawcza)`, aria: 'stały współczynnik uczenia', min: 0.0002, max: 0.03, step: 0.0002, value: 0.0198 });
        cS.oninput = rS.oninput = aS.oninput = () => api.reset();
        return [cS, rS, aS];
      },
      onFn(fn) { const r = RANGE[fn.id]; aS.setRange(r[0], r[1], r[2], r[3]); },
      methods: () => [
        { name: 'Stały współczynnik α', color: C.green, init: x => ({ x: [...x], ev: 1, as: [] }), step: (st, fn) => ({ x: M.gdStep(fn, st.x, aS.value), ev: st.ev + 1, as: st.as.concat(aS.value) }) },
        { name: 'Poszukiwanie w kierunku (Armijo)', color: C.red, dash: [7, 4], shape: 'sq', init: x => ({ x: [...x], ev: 1, as: [] }),
          step: (st, fn) => { const r = M.armijo(fn, st.x, cS.value, rS.value); return r.trials[r.trials.length - 1].ok ? { x: r.x, ev: st.ev + r.trials.length, as: st.as.concat(r.a) } : null; } },
      ],
      extraCol: { g: 'evals', head: 'Liczba obliczeń $f$', cell: r => r.st.ev },
      extra: {
        title: 'Zaakceptowana długość kroku $\\alpha_k$', plot: pA,
        legend: legend([['line', C.green, 'stały współczynnik $\\alpha$'], ['dot', C.red, 'poszukiwanie w kierunku']]) + '<p class="note">Poszukiwanie w kierunku dobiera w każdej iteracji inną długość kroku. Liczba obliczeń wartości funkcji w tabeli pokazuje koszt tej operacji.</p>',
        draw(runs) {
          let lo = 1, hi = 1e-6, n = 10;
          runs.forEach(r => { n = Math.max(n, r.st.as.length); r.st.as.forEach(a => { lo = Math.min(lo, a); hi = Math.max(hi, a); }); });
          if (lo > hi) { lo = 1e-3; hi = 1; }
          pA.setView(0, niceStep(n * 1.02 / 5) * 5, lo / 6, hi * 6);
          pA.draw = q => runs.forEach(r => { const pts = r.st.as.map((a, k) => [k, a]); if (r.m.dash) q.dots(pts, { color: r.m.color, r: pts.length < 120 ? 2.6 : 1.7 }); else q.path(pts, { color: r.m.color, width: 2.2 }); });
          pA.render();
        },
      },
      info: api => `<div>${K(api.fn.tex)}</div><div class="note">Poszukiwanie w kierunku rozpoczyna każdą iterację od ${K(R`\alpha=1`)} i mnoży krok przez ${K(R`\rho`)}, dopóki nie zostanie spełniony warunek Armijo.</div>`,
      missions(api) {
        const set = (fn, c1, rho, a, x0) => { api.setFn(fn, x0); cS.set(c1, false); rS.set(rho, false); if (a) aS.set(a, false); api.run(); };
        return [
          { t: 'Bez ręcznego strojenia', q: R`Funkcja o wąskiej dolinie: porównaj stały współczynnik $\alpha=0.0198$ z poszukiwaniem w kierunku dla $c_1=10^{-4}$ i $\rho=0.5$. **Zastanów się:** która metoda wykona mniej kroków do osiągnięcia $f<10^{-6}$? Która wykona mniej obliczeń wartości funkcji?`,
            acts: [['Uruchom', () => set('valley', 1e-4, 0.5, 0.0198)]],
            a: R`Poszukiwanie w kierunku wymaga mniejszej liczby kroków (około $370$ zamiast ponad $500$), ale każdy krok wymaga kilku prób, więc obliczeń wartości $f$ jest kilkakrotnie więcej. Korzyścią nie jest tu szybkość, lecz to, że **nie trzeba znać** bezpiecznej wartości $\alpha$. Oscylacje w poprzek doliny pozostały: poszukiwanie w kierunku nie zmienia kierunku kroku.` },
          { t: 'Jak mocno skracać?', q: R`Porównaj $\rho=0.8$ (skracanie ostrożne) i $\rho=0.2$ (skracanie agresywne). **Zastanów się:** jak zmieni się liczba obliczeń wartości $f$?`,
            acts: [['$\\rho=0.8$', () => set('valley', 1e-4, 0.8)], ['$\\rho=0.2$', () => set('valley', 1e-4, 0.2)]],
            a: R`Dla $\rho=0.8$ krok maleje powoli, więc przejście od $\alpha=1$ do zaakceptowanej wartości wymaga w każdej iteracji kilkunastu prób: obliczeń jest najwięcej. Dla $\rho=0.2$ prób jest niewiele, ale zaakceptowany krok bywa znacznie krótszy od najdłuższego dopuszczalnego. W tym przykładzie okazuje się to korzystne, lecz jest to kwestia przypadku, a nie reguła.` },
          { t: 'Ostrzejszy warunek', q: R`Ustaw $c_1=0.5$, potem $c_1=0.9$. **Zastanów się:** jak zmienią się akceptowane długości kroku i liczba iteracji?`,
            acts: [['$c_1=0.5$', () => set('valley', 0.5, 0.5)], ['$c_1=0.9$', () => set('valley', 0.9, 0.5)]],
            a: R`Spójrz na wykres $\alpha_k$: im większe $c_1$, tym krótsze kroki są akceptowane. Liczba iteracji zmienia się tu nieznacznie (około $300$ zamiast $370$). Dla funkcji kwadratowej warunek dopuszcza kroki nie dłuższe niż $2(1-c_1)$ razy krok optymalny, więc dla $c_1>0.5$ odrzuca nawet krok **optymalny**. Dlatego w praktyce stosuje się małe wartości, typowo $10^{-4}$: warunek ma eliminować wyłącznie kroki wyraźnie złe.` },
          { t: 'Inna funkcja, te same ustawienia', q: R`Wybierz funkcję z dwiema dolinami i ustaw stały współczynnik $\alpha=0.3$. **Zastanów się:** jak zachowa się każda z metod?`,
            acts: [['Dwie doliny, $\\alpha=0.3$', () => set('twin', 1e-4, 0.5, 0.3)], ['Funkcja cosh', () => set('cosh', 1e-4, 0.5, 0.1)]],
            a: R`Stały współczynnik $\alpha=0.3$ jest tu zbyt duży: punkt oscyluje wokół minimum i nie może się ustabilizować. Poszukiwanie w kierunku, z tymi samymi ustawieniami co poprzednio, zbiega bez trudności. To jego główna zaleta: jedna konfiguracja sprawdza się dla funkcji o zupełnie różnej krzywiźnie.` },
        ];
      },
    });
  },
});
