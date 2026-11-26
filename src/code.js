/* =====================================================================
   "How to write an algorithm in Python": gradient descent taken from its description to a program.
   The listing shown here is the one checked with NumPy; the outputs quoted in the texts come from real runs.
   ===================================================================== */
const PY_KW = new Set(['def', 'for', 'in', 'if', 'break', 'return', 'import', 'as', 'assert', 'while', 'not', 'and', 'or', 'else', 'True', 'False', 'None']);
const pyEsc = s => s.replace(/[&<>*$\[]/g, c => `&#${c.charCodeAt(0)};`);   // also the characters the mini-markup would interpret
function pyLine(s) {
  let out = '';
  for (const m of s.matchAll(/(#.*$)|('[^']*'|"[^"]*")|([A-Za-z_]\w*)|(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([^\w#'"]+)/g)) {
    out += m[1] ? `<span class="cm">${pyEsc(m[1])}</span>` : m[2] ? `<span class="st">${pyEsc(m[2])}</span>` : m[3] && PY_KW.has(m[3]) ? `<span class="kw">${m[3]}</span>` : pyEsc(m[0]);
  }
  return out;
}
/* a listing without line breaks in its HTML, so that it can be embedded in the mini-markup texts */
const pyBlock = (lines, o = {}) => `<div class="code ${o.cls || ''}"${o.label ? ` role="group" aria-label="${o.label}"` : ''}>${lines.map((l, i) => `<span class="cl" data-l="${(o.start || 1) + i}">${o.plain ? pyEsc(l) : pyLine(l)}</span>`).join('')}</div>`;
const pyOut = lines => pyBlock(lines, { cls: 'out nonum', plain: true, label: 'Wynik programu' });

function CodePage() {
  const FUNC = [
    'import numpy as np',
    '',
    'def gradient_descent(grad, x0, alpha, tol=1e-6, max_steps=1000):',
    '    x = np.array(x0, dtype=float)',
    '    path = [x.copy()]',
    '    for k in range(max_steps):',
    '        g = grad(x)',
    '        if np.linalg.norm(g) < tol:',
    '            break',
    '        x = x - alpha * g',
    '        path.append(x.copy())',
    '    return x, np.array(path)',
  ];
  const root = el('div', 'intro kod');

  /* ---------- 1. what is what ---------- */
  const top = el('div', 'intro-top kod-top');
  const SYM = [
    [R`\nabla f`, 'grad', 'funkcja: przyjmuje punkt, zwraca wektor o tej samej długości'],
    [R`\mathbf{x}^{(0)}`, 'x0', 'lista albo tablica liczb'],
    [R`\mathbf{x}`, 'x', 'tablica NumPy typu <code>float</code>, bieżący punkt'],
    [R`\alpha`, 'alpha', 'liczba typu <code>float</code>'],
    [R`\varepsilon`, 'tol', 'liczba typu <code>float</code>'],
    [R`k`, 'k', 'liczba całkowita, numer obiegu pętli'],
    [R`\nabla f(\mathbf{x})`, 'g', 'tablica NumPy, gradient w bieżącym punkcie'],
    [R`\mathbf{x}^{(0)},\ \mathbf{x}^{(1)},\ \dots`, 'path', 'lista punktów, na końcu tablica dwuwymiarowa'],
  ];
  top.append(el('div', 'prose', md(R`Opis algorytmu mówi, **co** obliczyć. Program musi dodatkowo rozstrzygnąć to, o czym opis milczy: jakiego typu są dane, gdzie przechowywać wyniki, kiedy przerwać obliczenia i co zwrócić. Na tej stronie przechodzimy tę drogę dla metody spadku gradientu, w czterech etapach:

<ol><li>ustal, czym w programie jest każdy symbol z opisu,</li><li>zapisz kroki algorytmu wiersz po wierszu,</li><li>prześledź wykonanie programu na liczbach,</li><li>sprawdź wynik na przykładzie, który da się policzyć ręcznie.</li></ol>

Gradient jest tu gotową funkcją zapisaną ze wzoru. Gdy oblicza go mechanizm automatycznego różniczkowania, zmienia się sposób uzyskania gradientu, a szkielet programu pozostaje taki sam.`)));
  const symCard = el('section', 'card');
  symCard.innerHTML = `<h3 class="card-h">Etap 1: symbole i zmienne</h3><div class="tblw"><table class="tbl kod-sym"><thead><tr><th>W opisie</th><th>W programie</th><th>Czym jest</th></tr></thead><tbody>${SYM.map(([s, v, d]) => `<tr><td>${K(s)}</td><td><code>${v}</code></td><td>${d}</td></tr>`).join('')}</tbody></table></div>`;
  top.append(symCard);

  /* ---------- 2. description and program side by side ---------- */
  const STEPS = [
    R`**Dane:** funkcja obliczająca gradient $\nabla f$, punkt startowy $\mathbf{x}^{(0)}$, współczynnik uczenia $\alpha$, tolerancja $\varepsilon$, największa liczba kroków`,
    R`$\mathbf{x}$ ← $\mathbf{x}^{(0)}$`,
    R`zapisz punkt startowy w historii`,
    R`**powtarzaj**, najwyżej zadaną liczbę razy:`,
    R`    oblicz gradient $\nabla f(\mathbf{x})$ w bieżącym punkcie`,
    R`    **jeżeli** $\lVert\nabla f(\mathbf{x})\rVert<\varepsilon$: zakończ powtarzanie`,
    R`    $\mathbf{x}$ ← $\mathbf{x}-\alpha\,\nabla f(\mathbf{x})$`,
    R`    zapisz $\mathbf{x}$ w historii`,
    R`**zwróć** $\mathbf{x}$ i historię`,
  ];
  const ITEMS = [
    { step: null, lines: [1], t: 'Biblioteka do działań na wektorach',
      b: R`Opis algorytmu nie mówi, czym w programie jest wektor. Tutaj jest nim tablica NumPy (<code>np.ndarray</code>): wyrażenie <code>x - alpha * g</code> wykonuje działanie na wszystkich współrzędnych jednocześnie, bez pętli po indeksach.` },
    { step: 0, lines: [3], t: 'Dane wejściowe stają się parametrami funkcji',
      b: R`Każda wielkość wymieniona w danych dostaje nazwę. Parametr <code>grad</code> jest **funkcją**: w Pythonie funkcję można przekazać jako argument i wywołać wewnątrz innej funkcji. Parametry, które rzadko się zmienia (<code>tol</code>, <code>max_steps</code>), mają wartości domyślne, więc w wywołaniu można je pominąć.` },
    { step: 1, lines: [4], t: 'Kopia punktu startowego i liczby zmiennoprzecinkowe',
      b: R`Ten wiersz robi dwie rzeczy, o których opis milczy. Tworzy **kopię**, więc dane wołającego pozostają nietknięte. Ustala też typ <code>float</code>: z listy <code>[-3, 4]</code> powstałaby bez tego tablica liczb całkowitych, w której nie da się zapisać wyniku kroku.` },
    { step: 2, lines: [5], t: 'Historia jako lista',
      b: R`Liczba punktów nie jest znana z góry, bo pętla może skończyć się wcześniej. Dlatego historię zbiera lista, do której łatwo dopisywać elementy. Zapisywana jest kopia (<code>x.copy()</code>), a nie sama tablica <code>x</code>.` },
    { step: 3, lines: [6], t: 'Pętla o ograniczonej liczbie obiegów',
      b: R`„Powtarzaj” zapisujemy jako pętlę <code>for</code> o największej dopuszczalnej liczbie obiegów, a nie jako <code>while True</code>. To zabezpieczenie: dla funkcji i punktu startowego z tematu 2 oraz $\alpha=0.45$ kryterium stopu nigdy nie zostaje spełnione, a po tysiącu obiegów współrzędna $x_1$ jest rzędu $10^{97}$.` },
    { step: 4, lines: [7], t: 'Gradient obliczany raz na obieg',
      b: R`Gradient jest potrzebny dwukrotnie: w kryterium stopu (wiersz 8) i w kroku (wiersz 10). Zapisany w zmiennej <code>g</code>, jest obliczany tylko raz. Wywołanie stoi **wewnątrz** pętli, więc za każdym razem dotyczy bieżącego punktu.` },
    { step: 5, lines: [8, 9], t: 'Kryterium stopu musi być jedną liczbą',
      b: R`Gradient jest wektorem, a instrukcja <code>if</code> wymaga jednej wartości logicznej. Dlatego porównujemy **normę** gradientu, czyli jego długość. Porównujemy ją z małą liczbą, a nie z zerem, bo w arytmetyce zmiennoprzecinkowej gradient prawie nigdy nie jest dokładnie zerowy. Instrukcja <code>break</code> przerywa pętlę.` },
    { step: 6, lines: [10], t: 'Wzór na krok zapisany znak po znaku',
      b: R`To jedyny wiersz, który jest dosłownym zapisem wzoru $\mathbf{x}\leftarrow\mathbf{x}-\alpha\,\nabla f(\mathbf{x})$. Strzałce „←” odpowiada w Pythonie znak <code>=</code>: prawa strona jest obliczana ze starego punktu, a potem nazwa <code>x</code> zaczyna oznaczać nowy punkt.` },
    { step: 7, lines: [11], t: 'Nowy punkt trafia do historii',
      b: R`Po każdym kroku lista wydłuża się o jeden element. Po $k$ krokach ma ich $k+1$, bo zawiera również punkt startowy.` },
    { step: 8, lines: [12], t: 'Wynik: punkt końcowy i trajektoria',
      b: R`Lista tablic zostaje zamieniona na jedną tablicę dwuwymiarową: wiersz odpowiada numerowi kroku, a kolumna numerowi współrzędnej. Dzięki temu <code>path[:, 0]</code> to wszystkie wartości $x_0$, gotowe do narysowania. Funkcja zwraca dwie wartości naraz, jako krotkę (tuple).` },
  ];
  const mapCard = el('section', 'card');
  mapCard.innerHTML = `<h3 class="card-h">Kliknij krok algorytmu albo wiersz programu</h3><div class="kod-map">
    <ol class="algo pick">${STEPS.map((l, i) => `<li class="${/^ {4}/.test(l) ? 'in1' : ''}"><button type="button" data-step="${i}">${mdi(l.trim())}</button></li>`).join('')}</ol>
    ${pyBlock(FUNC, { cls: 'pick', label: 'Program: metoda spadku gradientu' })}
    <div class="kod-why" aria-live="polite">${ITEMS.map(it => `<div><h4>${it.t}</h4>${md(it.b)}</div>`).join('')}</div></div>`;
  noTab(mapCard.querySelector('.algo'));
  const stepBtns = [...mapCard.querySelectorAll('.algo button')], mapLines = [...mapCard.querySelectorAll('.code .cl')], whys = [...mapCard.querySelectorAll('.kod-why > div')];
  function pickItem(i) {
    const it = ITEMS[i];
    stepBtns.forEach((b, j) => { const on = j === it.step; b.parentNode.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    mapLines.forEach((l, j) => l.classList.toggle('on', it.lines.includes(j + 1)));
    whys.forEach((w, j) => w.classList.toggle('on', j === i));
  }
  stepBtns.forEach((b, j) => b.addEventListener('click', () => pickItem(ITEMS.findIndex(it => it.step === j))));
  mapLines.forEach((l, j) => { const i = ITEMS.findIndex(it => it.lines.includes(j + 1)); if (i < 0) l.classList.add('void'); else l.addEventListener('click', () => pickItem(i)); });
  pickItem(7);

  /* ---------- 3. the program executed line by line ---------- */
  const TAIL = ['', 'def grad_f(x):', '    return np.array([x[0] - 2, 5 * (x[1] + 1)])', ''];
  const CALL = { a: 'x_min, path = gradient_descent(grad_f, [-3, 4], 0.1, max_steps=3)', b: 'x_min, path = gradient_descent(grad_f, [2.0004, -1], 0.1, tol=1e-3)' };
  const NCALL = FUNC.length + TAIL.length + 1;
  const pf = v => (Number.isInteger(v) ? v.toFixed(1) : String(parseFloat(v.toPrecision(6))));          // a float the way Python shows it
  const pv2 = v => '[' + v.map(pf).join(', ') + ']';
  const VARS = [['x', 'x'], ['path', 'path'], ['k', 'k'], ['g', 'g'], ['norm', 'np.linalg.norm(g)']];
  const walk = Walk({
    id: 'kod',
    params: [{ id: 's', label: 'Wywołanie funkcji', value: 'a', options: [{ v: 'a', label: 'trzy obiegi pętli' }, { v: 'b', label: 'start tuż przy minimum' }] }],
    logTitle: 'Punkty zapisane w <code>path</code>',
    logHead: ['numer punktu', '<code>x[0]</code>', '<code>x[1]</code>'],
    visual(card) {
      card.innerHTML = `<h3 class="card-h">Program i wartości zmiennych</h3>${pyBlock(FUNC.concat(TAIL, [CALL.a]), { label: 'Wykonywany program' })}
        <div class="tblw"><table class="tbl kod-vars"><thead><tr><th>Zmienna w funkcji</th><th>Wartość po wykonaniu wiersza</th></tr></thead><tbody>${VARS.map(([, name]) => `<tr><td><code>${name}</code></td><td>—</td></tr>`).join('')}</tbody></table></div>`;
      const lines = [...card.querySelectorAll('.cl')], rows = [...card.querySelectorAll('tbody tr')];
      return {
        draw(s) {
          lines[NCALL - 1].innerHTML = pyLine(s.call);
          lines.forEach((l, j) => { l.classList.toggle('on', s.line.includes(j + 1)); l.classList.toggle('sub', s.sub.includes(j + 1)); });
          VARS.forEach(([key], j) => {
            const v = s.vars[key], td = rows[j].lastChild;
            td.textContent = v == null ? '—' : key === 'path' ? (typeof v === 'number' ? `lista, liczba elementów: ${v}` : `tablica o kształcie (${v.join(', ')})`) : Array.isArray(v) ? pv2(v) : key === 'k' ? String(v) : pf(v);
            rows[j].classList.toggle('hl', s.ch.includes(key));
          });
        },
      };
    },
    build(pv) {
      const B = pv.s === 'b', a = 0.1, tol = B ? 1e-3 : 1e-6, maxSteps = B ? 1000 : 3, start = B ? [2.0004, -1] : [-3, 4];
      const grad = x => [x[0] - 2, 5 * (x[1] + 1)], fr = [], V = { x: null, path: null, k: null, g: null, norm: null };
      const st = (line, ch = [], sub = []) => ({ call: CALL[pv.s], line: [].concat(line), sub, ch, vars: Object.assign({}, V, { x: V.x && [...V.x], g: V.g && [...V.g] }) });
      const tolS = B ? '0.001' : '1e-06';
      fr.push({ group: 'Wywołanie funkcji', title: 'Argumenty trafiają do parametrów', state: st(NCALL, [], [3]),
        html: md(R`Wykonanie zaczyna się w wierszu ${NCALL}. Wartości z wywołania są przypisywane parametrom z wiersza 3 w kolejności ich zapisania: <code>grad = grad_f</code>, <code>x0 = ${B ? '[2.0004, -1]' : '[-3, 4]'}</code>, <code>alpha = 0.1</code>.

${B ? R`Parametr <code>tol</code> podano razem z nazwą, więc otrzymuje wartość <code>1e-3</code>. Parametru <code>max_steps</code> w wywołaniu nie ma: przyjmuje wartość domyślną <code>1000</code>.` : R`Parametr <code>max_steps</code> podano razem z nazwą, więc otrzymuje wartość <code>3</code>. Parametru <code>tol</code> w wywołaniu nie ma: przyjmuje wartość domyślną <code>1e-6</code>.`}`) });
      V.x = [...start];
      fr.push({ group: 'Wywołanie funkcji', title: 'Punkt startowy jako tablica liczb zmiennoprzecinkowych', state: st(4, ['x']),
        html: md(R`Z listy <code>${B ? '[2.0004, -1]' : '[-3, 4]'}</code> powstaje **nowa** tablica NumPy. Spójrz na tabelę zmiennych: ${B ? R`liczba całkowita <code>-1</code> jest teraz zapisana jako <code>-1.0</code>.` : R`liczby całkowite stały się zmiennoprzecinkowe (<code>-3.0</code>, <code>4.0</code>).`} Bez <code>dtype=float</code> ${B ? 'typ tablicy zależałby od tego, jak wołający zapisał liczby' : 'tablica przechowywałaby liczby całkowite'}.`) });
      V.path = 1;
      fr.push({ group: 'Wywołanie funkcji', title: 'Historia zaczyna się od punktu startowego', state: st(5, ['path']), log: [0, pf(V.x[0]), pf(V.x[1])],
        html: md(R`Lista <code>path</code> ma na razie jeden element: kopię punktu startowego. Dzięki temu zwrócona trajektoria zawiera także punkt, z którego algorytm wyruszył.`) });
      let stopped = false;
      for (let k = 0; k < maxSteps && !stopped; k++) {
        const group = `Obieg pętli dla k = ${k}`, x = [...V.x], g = grad(x), nrm = Math.hypot(g[0], g[1]), xn = [x[0] - a * g[0], x[1] - a * g[1]];
        V.k = k;
        fr.push({ group, title: 'Licznik pętli', state: st(6, ['k']),
          html: md(k === 0 ? R`Wyrażenie <code>range(${maxSteps})</code> wytwarza kolejno liczby całkowite od <code>0</code> do <code>${maxSteps - 1}</code>. Zmienna <code>k</code> przyjmuje pierwszą z nich. Numeracja od zera zgadza się z zapisem $\mathbf{x}^{(0)}$ dla punktu startowego.` : R`Zmienna <code>k</code> przyjmuje kolejną wartość z <code>range(${maxSteps})</code>, czyli <code>${k}</code>. Wszystkie pozostałe zmienne zachowały wartości z poprzedniego obiegu.`) });
        V.g = g; V.norm = nrm;
        fr.push({ group, title: 'Gradient w bieżącym punkcie', state: st(7, ['g', 'norm'], [14, 15]),
          html: md(R`Wywołanie <code>grad(x)</code> uruchamia funkcję <code>grad_f</code> (wiersze 14 i 15) dla bieżącego punktu:
$$\nabla f(\mathbf{x})=\big(x_0-2,\ \ 5\,(x_1+1)\big)=\big(${tp(x[0])}-2,\ \ 5\cdot(${tn(x[1])}+1)\big)=${tv(g)}$$
Wynik zostaje zapamiętany w zmiennej <code>g</code>.`) });
        stopped = nrm < tol;
        fr.push({ group, title: 'Kryterium stopu', state: st(8, ['norm']),
          html: md(R`Funkcja <code>np.linalg.norm</code> oblicza długość wektora:
$$\lVert\nabla f(\mathbf{x})\rVert=\sqrt{${tp(g[0])}^2+${tp(g[1])}^2}=${tn(nrm, 6)}$$
Warunek <code>${pf(nrm)} &lt; ${tolS}</code> jest ${stopped ? '**prawdziwy**, więc jako następny wykona się wiersz 9.' : '**fałszywy**, więc wiersz 9 zostaje pominięty.'}`) });
        if (stopped) {
          fr.push({ group, title: 'Wyjście z pętli', state: st(9),
            html: md(R`Instrukcja <code>break</code> kończy pętlę natychmiast. Wiersze 10 i 11 nie są wykonywane: punkt się nie zmienia, a historia nadal ma jeden element.`) });
          break;
        }
        const eq = R`\mathbf{x}-\alpha\,\nabla f(\mathbf{x})&=${tv(x)}-${tn(a)}\cdot${tv(g)}`;
        const full = md(R`$$\begin{aligned}${eq}\\&=${tv(xn)}\end{aligned}$$ ${k === 0 ? R`Prawa strona tworzy **nową** tablicę, a nazwa <code>x</code> zaczyna ją oznaczać. Tablica zapisana wcześniej w <code>path</code> pozostaje bez zmian.` : R`Obie współrzędne są obliczane jednocześnie, z tego samego gradientu.`}`);
        if (k === 1) {
          fr.push({ group, title: 'Krok: Twoja kolej', state: st(10), quiz: { prompt: R`Oblicz nową wartość <code>x[0]</code> i wpisz wynik:`, answer: xn[0], reveal: full },
            html: md(R`$$\begin{aligned}${eq}\\&=\big(\ ?\ ,\ ${tn(xn[1])}\big)\end{aligned}$$`) });
          V.x = xn;
        } else {
          V.x = xn;
          fr.push({ group, title: 'Krok w kierunku przeciwnym do gradientu', state: st(10, ['x']), html: full });
        }
        V.path += 1;
        fr.push({ group, title: 'Zapis punktu w historii', state: st(11, k === 1 ? ['x', 'path'] : ['path']), log: [k + 1, pf(xn[0]), pf(xn[1])],
          html: md(R`Do listy trafia kopia nowego punktu <code>${pv2(xn)}</code>. Lista ma teraz ${V.path} elementy.` + (k === 0 ? R` Kopia chroni historię przed późniejszymi zmianami tablicy <code>x</code>; co dzieje się bez niej, pokazuje druga z typowych pomyłek u dołu strony.` : '')) });
      }
      const n = V.path;
      if (!stopped) fr.push({ group: 'Zakończenie', title: 'Pętla wyczerpała liczbę obiegów', state: st(6),
        html: md(R`Wyrażenie <code>range(${maxSteps})</code> nie ma już kolejnej wartości, więc pętla się kończy, chociaż kryterium stopu ani razu nie było spełnione. Zmienna <code>k</code> zachowuje ostatnią wartość, <code>${maxSteps - 1}</code>.`) });
      V.path = [n, 2];
      fr.push({ group: 'Zakończenie', title: 'Zwracane wartości', state: st(12, ['path']),
        html: md(n > 1 ? R`Lista ${n} tablic o długości $2$ zostaje zamieniona na jedną tablicę o kształcie <code>(${n}, 2)</code>: wiersz to numer punktu, a kolumna to numer współrzędnej. Funkcja zwraca dwie wartości jednocześnie.` : R`Lista zawiera jedną tablicę o długości $2$, więc powstaje tablica o kształcie <code>(1, 2)</code>. Funkcja zwraca dwie wartości jednocześnie.`) });
      fr.push({ group: 'Zakończenie', title: 'Wynik u wołającego', state: st(NCALL),
        html: md(R`Zwrócone wartości trafiają do zmiennych z lewej strony wiersza ${NCALL}: <code>x_min</code> ma wartość <code>${pv2(V.x)}</code>, a <code>path.shape</code> to <code>(${n}, 2)</code>.`) +
          (B ? box('warn', 'Na co uważać', R`Punkt startowy spełniał kryterium stopu, więc funkcja nie wykonała żadnego kroku. Kod, który po wywołaniu sięga do <code>path[1]</code> albo rysuje odcinki trajektorii, musi być przygotowany na historię z jednym punktem.`)
            : box('warn', 'Na co uważać', R`To **nie jest** minimum $(2,\,-1)$: trzy kroki to za mało, a funkcja sama tego nie zgłasza. Jeżeli <code>len(path) - 1</code> jest równe <code>max_steps</code>, pętla skończyła się bez spełnienia kryterium stopu. Z domyślnym <code>max_steps=1000</code> ta sama funkcja kończy po $147$ krokach, gdy norma gradientu spada poniżej $10^{-6}$.`)) });
      return fr;
    },
  });
  walk.el.classList.add('kod-walk');

  /* ---------- 4. a test that can be checked by hand ---------- */
  const test = el('section', 'card kod-test');
  test.innerHTML = `<div class="prose">${md(R`Program, który kończy się bez komunikatu o błędzie, nie musi liczyć poprawnie. Najprostszy sprawdzian to funkcja, dla której wynik znasz bez komputera. Dla $f(\mathbf{x})=\tfrac12\lVert\mathbf{x}\rVert^2$ gradient jest równy samemu punktowi: $\nabla f(\mathbf{x})=\mathbf{x}$. Przy $\alpha=0.5$ każdy krok zmniejsza więc punkt o połowę:
$$\mathbf{x}-0.5\,\mathbf{x}=0.5\,\mathbf{x}$$
Z punktu $(8,\,-4)$ algorytm powinien przejść kolejno do $(4,\,-2)$, $(2,\,-1)$ i $(1,\,-0.5)$. Pierwsze dwie asercje sprawdzają kształt tablicy i te wartości. Wyniki zmiennoprzecinkowe porównuje się z tolerancją (<code>np.allclose</code>), a nie operatorem <code>==</code>.

Dwie ostatnie asercje sprawdzają kryterium stopu. Długość punktu startowego wynosi $\sqrt{80}\approx 8.94$ i po każdym kroku maleje o połowę. Poniżej $10^{-6}$ spada pierwszy raz po $24$ krokach ($8.94/2^{24}\approx 5.3\cdot10^{-7}$), więc historia ma $25$ punktów.`)}</div>` +
    pyBlock(['def grad_test(x):', '    return x', '', 'x_min, path = gradient_descent(grad_test, [8, -4], 0.5, max_steps=3)', 'assert path.shape == (4, 2)', 'assert np.allclose(path, [[8, -4], [4, -2], [2, -1], [1, -0.5]])', '',
      'x_min, path = gradient_descent(grad_test, [8, -4], 0.5)', 'assert len(path) == 25', 'assert np.linalg.norm(x_min) < 1e-6'], { label: 'Test funkcji gradient_descent' });

  /* ---------- 5. typical mistakes (every output below was produced by running the fragment) ---------- */
  const slips = Missions('kod', [
    { t: 'Tablica liczb całkowitych',
      q: R`Punkt startowy to lista <code>[-3, 4]</code>, a pierwszy wiersz funkcji nie ustala typu:

${pyBlock(['x = np.array(x0)', 'for k in range(max_steps):', '    x -= alpha * grad(x)'], { cls: 'nonum' })}

**Zastanów się:** jakiego typu są elementy tablicy <code>x</code> i czy da się w niej zapisać wynik pierwszego kroku, czyli $(-2.5,\ 1.5)$?`,
      a: R`Program zatrzymuje się w pierwszym obiegu pętli z komunikatem:

${pyOut(["UFuncTypeError: Cannot cast ufunc 'subtract' output from dtype('float64') to dtype('int64') with casting rule 'same_kind'"])}

Z listy liczb całkowitych powstaje tablica typu całkowitego, a operator <code>-=</code> zapisuje wynik w tej samej tablicy. Poprawka: <code>np.array(x0, dtype=float)</code>. Groźniejszy jest wariant bez komunikatu: przypisanie <code>x[0] = 2.7</code> do takiej tablicy zapisuje w niej <code>2</code>.` },
    { t: 'Historia, w której wszystkie punkty są jednakowe',
      q: R`Funkcja z tematu 2, punkt startowy $(-3,\,4)$, $\alpha=0.1$, trzy kroki:

${pyBlock(['path = [x]', 'for k in range(max_steps):', '    x -= alpha * grad(x)', '    path.append(x)'], { cls: 'nonum' })}

**Zastanów się:** ile różnych punktów zawiera zwrócona historia?`,
      a: R`Jeden. Wszystkie cztery wiersze są równe punktowi końcowemu:

${pyOut(['[[-1.645 -0.375]', ' [-1.645 -0.375]', ' [-1.645 -0.375]', ' [-1.645 -0.375]]'])}

Operator <code>-=</code> zmienia tablicę **w miejscu**, a lista przechowuje cztery odwołania do tej samej tablicy. Program nie zgłasza błędu: widać to dopiero na wykresie, na którym trajektoria jest jednym punktem. Poprawka: <code>path.append(x.copy())</code>.` },
    { t: 'Funkcja zmienia dane wołającego',
      q: R`Wołający przechowuje punkt startowy w tablicy <code>start = np.array([-3.0, 4.0])</code> i przekazuje ją do funkcji:

${pyBlock(['x = np.asarray(x0, dtype=float)', 'for k in range(max_steps):', '    x -= alpha * grad(x)'], { cls: 'nonum' })}

**Zastanów się:** jaką wartość ma <code>start</code> po powrocie z funkcji?`,
      a: R`Po trzech krokach z $\alpha=0.1$ tablica <code>start</code> zawiera punkt końcowy:

${pyOut(['[-1.645 -0.375]'])}

Funkcja <code>np.asarray</code> nie tworzy kopii, gdy dostaje tablicę o właściwym typie. Nazwy <code>x</code> i <code>start</code> oznaczają więc tę samą tablicę, a operator <code>-=</code> zmienia ją w miejscu. Kolejne uruchomienie „z tego samego punktu” zaczyna się już gdzie indziej. Poprawka: <code>np.array(x0, dtype=float)</code>, które zawsze tworzy kopię.` },
    { t: 'Kryterium stopu na wektorze',
      q: R`Normę gradientu pominięto:

${pyBlock(['g = grad(x)', 'if g < tol:', '    break'], { cls: 'nonum' })}

**Zastanów się:** co jest wynikiem porównania <code>g &lt; tol</code>, gdy <code>g</code> ma dwie współrzędne?`,
      a: R`Tablica dwóch wartości logicznych, po jednej dla każdej współrzędnej. Instrukcja <code>if</code> wymaga jednej wartości, więc program kończy się komunikatem:

${pyOut(['ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()'])}

Podpowiedź z komunikatu prowadzi do kolejnego błędu: warunek <code>(g &lt; tol).all()</code> jest spełniony dla każdego gradientu o ujemnych współrzędnych, niezależnie od ich wielkości. Poprawka: jedna liczba, czyli <code>np.linalg.norm(g) &lt; tol</code>.` },
  ], 'Pomyłka');

  const next = el('div', 'prose', box('def', 'Ten sam szkielet w pozostałych metodach', R`Przygotowanie, pętla, kryterium stopu, zapis historii i zwrot wyniku wyglądają tak samo w każdej metodzie z tej strony. Zmienia się wiersz 10, czyli reguła kroku: metoda z momentem dodaje zmienną pamiętaną między obiegami, warunek Armijo dobiera długość kroku w dodatkowej pętli, a metoda Newtona rozwiązuje układ równań. Zmienia się też wiersz 7, gdy gradient oblicza mechanizm automatycznego różniczkowania.

Jak rozpoznać błąd w programie po kształcie trajektorii, pokazuje strona <a href="#bledy">Znajdź błąd</a>.`));

  root.append(top, el('h3', 'h-sec', 'Etap 2: opis algorytmu i program obok siebie'), mapCard, el('h3', 'h-sec', 'Etap 3: wykonanie programu wiersz po wierszu'), walk.el,
    el('h3', 'h-sec', 'Etap 4: sprawdzenie na przykładzie, który policzysz ręcznie'), test, el('h3', 'h-sec', 'Typowe pomyłki: zastanów się, co się stanie, zanim otworzysz odpowiedź'), slips, next);
  return { el: root };
}
