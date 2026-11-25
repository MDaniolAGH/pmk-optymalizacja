/* =====================================================================
   Topic 3 — momentum (heavy-ball), torch.optim.SGD convention (Zadanie 2)
   ===================================================================== */
TOPICS.push({
  id: 'moment', n: 3, title: 'Metoda z momentem (momentum)', short: 'Moment', task: 'Metoda pierwszego rzędu',
  menu: 'Bufor prędkości przechowuje informację o poprzednich gradientach: tłumi oscylacje i przyspiesza ruch wzdłuż doliny. Porównanie ze zwykłą metodą spadku gradientu, krok po kroku.',
  icon: `<ellipse cx="62" cy="34" rx="48" ry="20"/><ellipse cx="62" cy="34" rx="28" ry="10"/><path class="a" d="M12 14 C30 54 44 20 62 34"/><circle class="p" cx="62" cy="34" r="3.5"/><circle class="p" cx="12" cy="14" r="3"/>`,

  walk() {
    const fn = M.F.bowl, x0 = [-3, 4], a = 0.1;
    return Walk({
      intro: R`**Po co?** Zwykła metoda spadku gradientu w każdym kroku „zapomina” o dotychczasowym przebiegu. Metoda z momentem (momentum), nazywana też metodą ciężkiej kuli (heavy-ball method), dodaje jej pamięć: bufor prędkości (velocity buffer) $\mathbf{v}$, w którym kumulują się kolejne gradienty. Poniższa reguła jest zapisana w tej samej konwencji co <code>torch.optim.SGD</code>.

Poniżej ta sama funkcja i ten sam punkt startowy co w poprzednim temacie ($\alpha=0.1$), co ułatwia porównanie obu metod.`,
      params: [{ id: 'b', label: R`Współczynnik momentu $\beta$`, value: 0.5, options: [{ v: 0, label: '$0$ (bez pamięci)' }, { v: 0.5, label: '$0.5$' }, { v: 0.9, label: '$0.9$ (wartość typowa)' }] }],
      algo: {
        title: 'Algorytm: metoda z momentem',
        lines: [
          R`$\mathbf{x}$ ← punkt startowy, &nbsp; $\mathbf{v}$ ← wektor zer`,
          R`**powtórz** zadaną liczbę razy:`,
          R`    $\mathbf{g}$ ← $\nabla f(\mathbf{x})$ <span class="cm">(automatyczne różniczkowanie)</span>`,
          R`    $\mathbf{v}$ ← $\beta\cdot\mathbf{v}+\mathbf{g}$ <span class="cm">(poprzednia prędkość + nowy gradient)</span>`,
          R`    $\mathbf{x}$ ← $\mathbf{x}-\alpha\cdot\mathbf{v}$ <span class="cm">(w bloku <code>no_grad</code>, potem nowy liść grafu)</span>`,
          R`    zapisz $\mathbf{x}$ oraz $f(\mathbf{x})$`,
          R`**zwróć** trajektorię i historię kosztu`,
        ],
      },
      logTitle: 'Metoda z momentem a zwykły spadek gradientu',
      logHead: ['$k$', R`$\mathbf{x}^{(k)}$ z momentem`, '$f$ z momentem', '$f$ bez momentu'],
      visual(card) {
        const p = new Plot({ equal: true, xlabel: 'x_0', ylabel: 'x_1', aria: 'Poziomice funkcji kwadratowej z trajektoriami metody z momentem i bez momentu' });
        card.innerHTML = `<div class="plot-t">${mdi(R`Ta sama funkcja, dwie metody <small>strzałki: składowe kroku</small>`)}</div>`;
        card.append(p.el);
        card.insertAdjacentHTML('beforeend', legend([['line', C.red, 'z momentem'], ['line', C.green, 'zwykły spadek gradientu'], ['dash', C.black, 'składowa momentu $-\\alpha\\beta\\mathbf{v}$'], ['dash', C.ghost, 'nowy gradient $-\\alpha\\mathbf{g}$']]));
        return {
          draw(s) {
            const far = s.pts.concat(s.gd).some(q => Math.abs(q[0]) > 4.9 || Math.abs(q[1]) > 4.9);
            p.setView(...(far ? [-7, 7, -7, 7] : fn.view));
            p.draw = q => {
              drawField(q, fn);
              drawRun(q, s.gd, { color: C.green, width: 1.8, alpha: .8 });
              drawRun(q, s.pts, { color: C.red, shape: 'sq' });
              const x = s.pts[s.pts.length - 1];
              if (s.mem) {
                const m = M.add(x, s.mem);
                q.arrow(x[0], x[1], m[0], m[1], { color: C.black, width: 2, dash: [5, 4] });
                if (s.gs) q.arrow(m[0], m[1], m[0] + s.gs[0], m[1] + s.gs[1], { color: C.ghost, width: 2.2, dash: [5, 4] });
              } else if (s.gs) q.arrow(x[0], x[1], x[0] + s.gs[0], x[1] + s.gs[1], { color: C.ghost, width: 2.2, dash: [5, 4] });
              if (s.to) q.dots([s.to], { fill: '#fff', stroke: C.red, color: C.red, r: 4.5, shape: 'sq' });
            };
            p.render();
          },
        };
      },
      build(pv) {
        const b = pv.b, fr = [], pts = [[...x0]], gd = [[...x0]], NIT = 4;
        let x = [...x0], v = [0, 0], xg = [...x0];
        fr.push({
          group: 'Punkt wyjścia', title: 'Dwie zmienne stanu zamiast jednej', line: 0, state: { pts: [[...x]], gd: [[...x]] }, log: [0, vecs(x), num(fn.f(x)), num(fn.f(x))],
          html: md(R`Oprócz punktu $\mathbf{x}$ przechowujemy teraz **prędkość** $\mathbf{v}$. Reguła aktualizacji w jednym kroku:
$$\mathbf{v}^{(k)}=\beta\,\mathbf{v}^{(k-1)}+\nabla f(\mathbf{x}^{(k)}),\qquad \mathbf{x}^{(k+1)}=\mathbf{x}^{(k)}-\alpha\,\mathbf{v}^{(k)}$$
Punkt startowy: $\mathbf{x}^{(0)}=(-3,\ 4)$, prędkość początkowa **zerowa**, $\alpha=0.1$, $\beta=${tn(b)}$.

Współczynnik momentu (momentum coefficient) $\beta\in[0,1)$ określa, jaka część poprzedniej prędkości przechodzi do następnego kroku. ${b === 0 ? R`Dla $\beta=0$ pamięci nie ma: przekonasz się, że metoda pokrywa się wtedy ze zwykłym spadkiem gradientu.` : ''}`),
        });
        for (let k = 0; k < NIT; k++) {
          const g = fn.g(x), mem = M.scale(v, b), nv = M.add(mem, g), xn = M.sub(x, M.scale(nv, a)), xgn = M.gdStep(fn, xg, a);
          const group = R`Iteracja ${k + 1}: z $\mathbf{x}^{(${k})}$ do $\mathbf{x}^{(${k + 1})}$`, cur = pts.map(q => [...q]), gcur = gd.map(q => [...q]);
          const vprev = k === 0 ? R`\mathbf{0}` : R`\mathbf{v}^{(${k - 1})}`;
          const zeroG = g.findIndex(c => Math.abs(c) < 1e-9);
          fr.push({
            group, title: 'Gradient w bieżącym punkcie', line: 2, state: { pts: cur, gd: gcur, gs: M.scale(g, -a) },
            html: md(R`Wzór na gradient tej funkcji to $\nabla f(\mathbf{x})=\big(x_0-2,\ 5\,(x_1+1)\big)$ (wyprowadzenie znajdziesz w temacie o metodzie spadku gradientu). Podstawiamy współrzędne bieżącego punktu $\mathbf{x}^{(${k})}=${tv(x)}$:
$$${al(R`\mathbf{g}=\nabla f(\mathbf{x}^{(${k})})`, R`\big(x_0-2,\ \ 5\,(x_1+1)\big)`, R`\big(${tp(x[0])}-2,\ \ 5\cdot(${tn(x[1])}+1)\big)`, tv(g))}$$
${k === 0 ? 'Ten krok jest taki sam jak w zwykłym spadku gradientu.' : zeroG >= 0 ? R`Zwróć uwagę: składowa gradientu w kierunku $x_${zeroG}$ jest **zerowa**. Zwykła metoda spadku gradientu nie wykonałaby w tym kierunku żadnego ruchu.` : R`Szara strzałka pokazuje krok, jaki z tego punktu wykonałaby zwykła metoda spadku gradientu.`}`),
          });
          const vL = R`\mathbf{v}^{(${k})}`, v1 = R`\beta\,${vprev}+\mathbf{g}`, v2 = R`${tn(b)}\cdot${tv(v)}+${tv(g)}`;
          const vfull = md(R`$$${al(vL, v1, v2, tv(nv))}$$`);
          const vtext = k === 0 ? R`Bufor ma początkowo wartość zerową, więc w pierwszym kroku prędkość jest równa gradientowi.` : R`Do nowego gradientu dodajemy poprzednią prędkość pomnożoną przez $\beta$. Jeśli oba wektory mają podobny zwrot, prędkość **rośnie**; jeśli przeciwny, częściowo się **znoszą**.`;
          fr.push(k === 1 && b > 0
            ? { group, title: 'Nowa prędkość: Twoja kolej', line: 3, state: { pts: cur, gd: gcur, mem: M.scale(mem, -a), gs: M.scale(g, -a) }, html: md(vtext + R` $$${al(vL, v1, v2, R`\big(\ ?\ ,\ ${tn(nv[1])}\big)`)}$$`), quiz: { prompt: R`Oblicz pierwszą składową $\mathbf{v}^{(1)}$:`, answer: nv[0], reveal: vfull } }
            : { group, title: 'Nowa prędkość: poprzednia prędkość plus gradient', line: 3, state: { pts: cur, gd: gcur, mem: M.scale(mem, -a), gs: M.scale(g, -a) }, html: md(vtext) + vfull });
          pts.push([...xn]); gd.push([...xgn]);
          const after = pts.map(q => [...q]), gafter = gd.map(q => [...q]);
          fr.push({
            group, title: 'Krok wyznaczony przez prędkość', line: 4, state: { pts: cur, gd: gcur, mem: M.scale(mem, -a), gs: M.scale(g, -a), to: xn },
            html: md(R`$$${al(R`\mathbf{x}^{(${k + 1})}`, R`\mathbf{x}^{(${k})}-\alpha\,\mathbf{v}^{(${k})}`, R`${tv(x)}-0.1\cdot${tv(nv)}`, tv(xn))}$$
${zeroG >= 0 && k > 0 && b > 0 ? R`Mimo zerowego gradientu w $x_${zeroG}$ punkt przemieszcza się w tym kierunku: działa **bezwładność** nagromadzona w buforze prędkości. Podobnie ciężka kula nie zatrzymuje się na dnie doliny, lecz przetacza się na jej drugą stronę.` : R`Na rysunku krok jest sumą dwóch wektorów: składowej momentu z poprzednich kroków (czarna strzałka) i nowego gradientu (szara strzałka).`}`),
          });
          const fh = fn.f(xn), fg = fn.f(xgn);
          fr.push({
            group, title: 'Koszt i porównanie', line: 5, state: { pts: after, gd: gafter }, log: [k + 1, vecs(xn), num(fh), num(fg)],
            html: md(R`$$f(\mathbf{x}^{(${k + 1})})=${tn(fh)}$$ Zwykła metoda spadku gradientu po tej samej liczbie kroków daje koszt $${tn(fg)}$.
${Math.abs(fh - fg) < 1e-12 ? 'Na razie obie metody znajdują się w tym samym punkcie.' : fh < fg ? 'Metoda z momentem jest obecnie **bliżej** minimum.' : 'Obecnie metoda z momentem jest **dalej** od minimum: bezwładność przeniosła punkt zbyt daleko. Sprawdź, co stanie się w kolejnych krokach.'}`),
          });
          x = xn; v = nv; xg = xgn;
        }
        fr.push({
          group: 'Wniosek', title: 'Co daje pamięć?', line: 3, state: { pts: pts.map(q => [...q]), gd: gd.map(q => [...q]) },
          html: md(R`Prędkość to ważona suma wszystkich dotychczasowych gradientów: $\mathbf{v}^{(k)}=\mathbf{g}^{(k)}+\beta\,\mathbf{g}^{(k-1)}+\beta^2\,\mathbf{g}^{(k-2)}+\dots$

W kierunku **stromym** kolejne gradienty mają przeciwne znaki (oscylacje), więc w sumie się znoszą. W kierunku **łagodnym** mają ten sam znak, więc się kumulują.`) +
            box('def', 'Jaki jest zysk?', R`Gdy gradient przez wiele kroków zachowuje ten sam kierunek i zwrot, prędkość dąży do $\dfrac{\mathbf{g}}{1-\beta}$. Dla $\beta=0.9$ efektywny krok wzdłuż doliny jest **dziesięciokrotnie dłuższy** niż w zwykłej metodzie spadku gradientu. Dla funkcji kwadratowej odpowiednio dobrany współczynnik momentu sprawia, że liczba kroków rośnie proporcjonalnie do $\sqrt{\kappa}$, a nie do $\kappa$.`),
        });
        fr.push({
          group: 'Wniosek', title: 'Wskazówki do samodzielnej implementacji', line: [0, 3, 4], state: { pts: pts.map(q => [...q]), gd: gd.map(q => [...q]) },
          html: box('nb', 'Implementacja', R`Wynik własnej implementacji warto porównać z <code>torch.optim.SGD(lr, momentum=beta)</code>: trajektorie powinny się pokrywać. Istotny jest każdy szczegół konwencji: bufor ma początkowo wartość **zerową**, najpierw aktualizujesz $\mathbf{v}$, potem $\mathbf{x}$, a gradient **nie jest** mnożony przez $(1-\beta)$.

Dobrym przykładem testowym jest funkcja o wąskiej dolinie $f(\mathbf{x})=\tfrac12(x_0^2+100\,x_1^2)$ z $\alpha=0.0198$ i $\beta=0.669$. Zobacz ją w zakładce **Eksperymentuj**.`) +
            box('warn', 'Ta sama pułapka automatycznego różniczkowania', R`Bufor $\mathbf{v}$ przechowuj jako zwykły tensor, bez śledzenia gradientu, a $\mathbf{x}$ po każdym kroku odtwarzaj jako nowy liść grafu obliczeń, tak jak w metodzie spadku gradientu.`),
        });
        return fr;
      },
    });
  },

  lab() {
    let aS, bS;
    const RANGE = { valley: [0.0002, 0.04, 0.0002, 0.0198], bowl: [0.005, 0.8, 0.005, 0.1], cosh: [0.01, 1, 0.01, 0.1], twin: [0.005, 0.3, 0.005, 0.05] };
    return TrajLab({
      fn: 'valley', fns: ['valley', 'bowl', 'cosh', 'twin'], speed: 30,
      controls(api) {
        aS = Slider({ label: R`Współczynnik uczenia $\alpha$ (wspólny)`, aria: 'współczynnik uczenia alfa', min: 0.0002, max: 0.04, step: 0.0002, value: 0.0198 });
        bS = Slider({ label: R`Współczynnik momentu $\beta$`, aria: 'współczynnik momentu beta', min: 0, max: 0.99, step: 0.001, value: 0.669, hint: R`Dla $\beta=0$ obie metody są identyczne.` });
        aS.oninput = bS.oninput = () => api.reset();
        return [aS, bS];
      },
      onFn(fn) { const r = RANGE[fn.id]; aS.setRange(r[0], r[1], r[2], r[3]); },
      methods: () => [
        { name: 'Zwykły spadek gradientu', color: C.green, step: (st, fn) => ({ x: M.gdStep(fn, st.x, aS.value) }) },
        { name: 'Metoda z momentem', color: C.red, dash: [7, 4], shape: 'sq', init: x => ({ x: [...x], v: [0, 0] }), step: (st, fn) => M.hbStep(fn, st.x, st.v, aS.value, bS.value) },
      ],
      info(api) {
        const fn = api.fn;
        if (!fn.eig) return `<div>${K(fn.tex)}</div><div class="note">Funkcja niekwadratowa: wzory na optymalne ${K(R`\alpha`)} i ${K(R`\beta`)} nie mają tu zastosowania.</div>`;
        const [m, L] = fn.eig, k = L / m, bo = ((Math.sqrt(k) - 1) / (Math.sqrt(k) + 1)) ** 2, ao = 4 / (Math.sqrt(L) + Math.sqrt(m)) ** 2;
        return `<div>${K(fn.tex)}</div>
        <div class="note kvs"><span>Granice stabilności:</span><span class="kv">spadek gradientu ${K(R`\alpha<\tfrac{2}{L}`)} = <b>${(2 / L).toFixed(4)}</b></span><span class="kv">z momentem ${K(R`\alpha<\tfrac{2(1+\beta)}{L}`)} = <b>${(2 * (1 + bS.value) / L).toFixed(4)}</b></span></div>
        <div class="note kvs"><span>Wartości optymalne dla funkcji kwadratowej:</span><span>${K(R`\beta^{*}=\big(\tfrac{\sqrt\kappa-1}{\sqrt\kappa+1}\big)^{2}=${tn(bo, 3)}`)}</span><span>${K(R`\alpha^{*}=\tfrac{4}{(\sqrt L+\sqrt m)^{2}}=${tn(ao, 3)}`)}</span></div>`;
      },
      missions(api) {
        const set = (fn, a, b, x0) => { api.setFn(fn, x0); aS.set(a, false); bS.set(b, false); api.run(); };
        return [
          { t: 'Przykład podstawowy', q: R`Funkcja o wąskiej dolinie ($\kappa=100$), $\alpha=0.0198$, $\beta=0.669$, punkt startowy $(5,\,5)$. **Zastanów się:** ilu kroków potrzebuje każda z metod, aby uzyskać $f<10^{-6}$? Zapisz obie liczby przed uruchomieniem.`,
            acts: [['Uruchom przykład', () => set('valley', 0.0198, 0.669)]],
            a: R`Metoda z momentem: około $115$ kroków. Zwykła metoda spadku gradientu: ponad $500$. Takie same liczby powinna dać poprawna własna implementacja. Zwróć też uwagę na trajektorie: zielona przez cały czas oscyluje w poprzek doliny, a czerwona szybko tłumi oscylacje.` },
          { t: 'Bez pamięci', q: R`Ustaw $\beta=0$. **Zastanów się:** czym będą się różnić obie trajektorie?`,
            acts: [['$\\beta=0$', () => set('valley', 0.0198, 0)]],
            a: R`Niczym: pokrywają się dokładnie. Dla $\beta=0$ reguła $\mathbf{v}=\beta\mathbf{v}+\mathbf{g}$ sprowadza się do $\mathbf{v}=\mathbf{g}$. To dobry test poprawności własnej implementacji.` },
          { t: 'Zbyt duży współczynnik momentu', q: R`Zwiększ $\beta$ do $0.9$, a potem do $0.99$ (przy tym samym $\alpha$). **Zastanów się:** czy większy współczynnik momentu zawsze oznacza szybszą zbieżność?`,
            acts: [['$\\beta=0.9$', () => set('valley', 0.0198, 0.9)], ['$\\beta=0.99$', () => set('valley', 0.0198, 0.99)]],
            a: R`Nie. Dla $\beta=0.9$ potrzeba już około $166$ kroków, a dla $0.99$ około $1700$: punkt mija minimum i długo wokół niego oscyluje. Koszt przestaje maleć monotonicznie. Współczynniki $\alpha$ i $\beta$ należy dobierać **łącznie**.` },
          { t: 'Powyżej granicy stabilności spadku gradientu', q: R`Ustaw $\alpha=0.033$ i $\beta=0.669$. Ta wartość $\alpha$ przekracza $2/L=0.02$. **Zastanów się:** jak zachowa się każda z metod?`,
            acts: [['$\\alpha=0.033$', () => set('valley', 0.033, 0.669)]],
            a: R`Zwykła metoda spadku gradientu jest rozbieżna, a metoda z momentem zbiega jeszcze szybciej niż poprzednio (około $70$ kroków). Moment rozszerza zakres stabilnych wartości współczynnika uczenia do $\alpha<2(1+\beta)/L$, a wybrane wartości $\alpha$ i $\beta$ są dla tej funkcji bliskie optymalnym.` },
          { t: 'Czy moment pozwala opuścić minimum lokalne?', q: R`Funkcja z dwiema dolinami, punkt startowy $(2,\,0.5)$ po stronie minimum lokalnego, $\alpha=0.05$. Porównaj $\beta=0.8$ i $\beta=0.9$. **Zastanów się:** czy metoda z momentem przejdzie do głębszej doliny?`,
            acts: [['$\\beta=0.8$', () => set('twin', 0.05, 0.8, [2, 0.5])], ['$\\beta=0.9$', () => set('twin', 0.05, 0.9, [2, 0.5])]],
            a: R`Dla $\beta=0.8$ tak: bezwładność przenosi punkt ponad barierą do minimum globalnego. Dla $\beta=0.9$ punkt kończy jednak ponownie w dolinie minimum lokalnego. Moment **może** ułatwić opuszczenie płytkiego minimum lokalnego, ale niczego nie gwarantuje, a wynik zależy od parametrów w sposób trudny do przewidzenia.` },
        ];
      },
    });
  },
});
