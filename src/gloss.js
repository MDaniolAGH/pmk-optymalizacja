/* =====================================================================
   Glossary: every symbol is clickable and opens an explanation
   (what it is, how it is computed, why it matters).
   1) annot() tags symbols inside TeX with \htmlData{g=key}{...} before KaTeX renders it,
   2) GLOSS holds the explanations, 3) one click handler opens the dialog.
   ===================================================================== */

/* ---------- 1. tagging symbols in TeX ---------- */
const G_ATOM = [   // multi-token symbols, most specific first (sticky regexes)
  [/\\tfrac12\\lVert\\mathbf\{r\}\\rVert\^2/y, 'cost'],
  [/J\^\{\\top\}J/y, 'JtJ'], [/J\^\{\\top\}\\mathbf\{r\}/y, 'Jtr'], [/J_\{ij\}/y, 'jac'],
  [/\\nabla\^2/y, 'hess'], [/\\nabla f/y, 'grad'], [/\\nabla/y, 'nabla'],
  [/f\^\{\*\}/y, 'fstar'], [/\\alpha\^\{\*\}/y, 'alphaopt'], [/\\beta\^\{\*\}/y, 'betaopt'],
  [/\\mathbf\{x\}\^\{\*\}/y, 'xstar'], [/x\^\{\*\}/y, 'xstar'],
  [/V_\{\\max\}/y, 'Vmax'], [/C_\{\\max\}/y, 'Cmax'], [/t_\{\\max\}/y, 'tmax'], [/t_\{1\/2\}/y, 'thalf'],
  [/K_m/y, 'Km'], [/k_a/y, 'ka'], [/k_e/y, 'ke'], [/c_1/y, 'c1'], [/V\/F/y, 'VF'], [/n\\_steps/y, 'nsteps'],
  [/\\mathbf\{e\}_(\{[^{}]*\}|[0-9a-z])/y, 'unitvec'], [/\\mathbf\{e\}/y, 'unitvec'],
  [/\\mathbf\{x\}_\{\\text\{nowy\}\}/y, 'xnew'], [/\\mathbf\{x\}\^\{[+-]\}/y, 'xpm'], [/f\^\{[+-]\}/y, 'fpm'],
  [/\\mathbf\{x\}/y, 'x'], [/\\mathbf\{v\}/y, 'v'], [/\\mathbf\{p\}/y, 'p'], [/\\mathbf\{g\}/y, 'gvec'], [/\\mathbf\{r\}/y, 'r'],
  [/\\boldsymbol\\theta/y, 'theta'], [/\\theta_(\{[^{}]*\}|[0-9a-z])/y, 'thetaj'],
  [/r_i(\^[0-9])?/y, 'ri'], [/s_i/y, 'subs'], [/v_i/y, 'vrate'], [/t_i/y, 'time'], [/c_i/y, 'cmeas'],
  [/x_(\{[^{}]*\}|[0-9a-z])(\^[0-9]|\^\{\([^(){}]*\)\})?/y, 'xcomp'],
  [/g''/y, 'gprime'], [/g'/y, 'gprime'], [/f''/y, 'fprime'], [/f'/y, 'fprime'],
];
const G_CW = { '\\alpha': 'alpha', '\\beta': 'beta', '\\kappa': 'kappa', '\\lambda': 'lambda', '\\rho': 'rho', '\\sigma': 'sigma',
  '\\varphi': 'phi', '\\varepsilon': 'eps', '\\theta': 'thetaj', '\\partial': 'partial', '\\top': 'transpose',
  '\\cosh': 'cosh', '\\sinh': 'cosh', '\\ln': 'ln' };
const G_SKIP = new Set(['\\text', '\\mathrm', '\\operatorname', '\\begin', '\\end', '\\textbf', '\\htmlData']);
const G_LET = { f: 'f', J: 'jac', H: 'hess', L: 'Lip', m: 'mcurv', h: 'hstep', k: 'kiter', i: 'idx', n: 'ndim', x: 'xscal', g: 'gfun',
  s: 'subs', v: 'vrate', t: 'time', C: 'conc', D: 'dose', V: 'vol', F: 'bioav', e: 'euler' };
const G_ITER = /\^\{(\((?:[^(){}]|\{[^{}]*\})*\))\}/y, G_CWRE = /\\([a-zA-Z]+|[\s\S])/y;

/* A symbol together with its indices is one unit: x^{(k)}, \alpha_k, p^{\top}, H^{-1}. Powers are not indices. */
const G_SUF = [/\^\{\((?:[^(){}]|\{[^{}]*\})*\)\}/y, /\^\{\*\}/y, /\^\{\\top\}/y, /\^\{-1\}/y, /\^\{[+-]\}/y, /_\{[^{}]*\}/y, /_[0-9a-zA-Z]/y];
const G_RAW = [], G_RAWID = new Map();   // TeX of each clicked unit, shown as the heading of its explanation
const G_OWN = new Set(['fstar', 'alphaopt', 'betaopt', 'xstar', 'unitvec', 'JtJ', 'Jtr', 'thalf', 'Vmax', 'Km', 'ka', 'ke', 'c1', 'tmax', 'Cmax', 'xnew', 'xpm', 'fpm', 'cost', 'VF', 'nsteps', 'gprime', 'fprime']);   // indices are part of the name
function unitMods(key, tex) {
  if (G_OWN.has(key)) return '';
  const m = [];
  if (/\^\{\(/.test(tex)) m.push('iter');
  if (/\^\{\*\}/.test(tex)) m.push('star');
  if (/\^\{\\top\}/.test(tex)) m.push('top');
  if (/\^\{-1\}/.test(tex)) m.push('inv');
  const s = tex.match(/_(?:\{([^{}]*)\}|([0-9a-zA-Z]))/);
  if (s) { const c = s[1] ?? s[2]; if (/^k([+-]\d+)?$/.test(c)) m.push('subk'); else if (/^(i|j|ij|\d+)$/.test(c)) m.push('subi'); }
  return m.join('.');
}
const G_NOTE = {
  iter: R`Indeks górny w nawiasie to **numer iteracji**: wartość tej wielkości po tylu krokach algorytmu. Zapis z literą $k$ oznacza dowolny krok, a z liczbą konkretny. To nie jest potęga.`,
  subk: R`Indeks dolny to **numer iteracji**: wartość tej wielkości w kroku o tym numerze. Numer $0$ oznacza wartość początkową.`,
  subi: R`Indeks dolny to **numer elementu**: współrzędnej wektora, wiersza lub kolumny macierzy albo pomiaru.`,
  star: R`Gwiazdka oznacza wartość **optymalną** albo dokładne rozwiązanie, do którego metoda ma dążyć.`,
  top: R`Znak $\top$ oznacza **transpozycję**: wektor kolumnowy staje się wierszowy, dzięki czemu można go pomnożyć przez inny wektor lub macierz.`,
  inv: R`Wykładnik $-1$ oznacza **macierz odwrotną**. W obliczeniach nie wyznacza się jej jawnie: zamiast tego rozwiązuje się układ równań.`,
};

function annot(src) {
  let out = '', i = 0, brace = false; const n = src.length;
  const withIdx = j => { for (let any = true; any;) { any = false; for (const re of G_SUF) { re.lastIndex = j; if (re.exec(src)) { j = re.lastIndex; any = true; break; } } } return j; };
  const emit = (attr, tex) => { const w = `\\htmlData{${attr}}{${tex}}`; out += brace ? `{${w}}` : w; brace = false; };
  const unit = (key, from, to) => {   // src[from:to] is the base symbol; the indices that follow belong to it
    const end = withIdx(to), tex = src.slice(from, end), mods = unitMods(key, tex);
    let attr = `g=${key}` + (mods ? `,m=${mods}` : '');
    if (end > to || (to - from > 1 && !G_CW[tex])) { const raw = tex.replace(/\^[0-9]$/, ''); let id = G_RAWID.get(raw); if (id == null) { id = G_RAW.push(raw) - 1; G_RAWID.set(raw, id); } attr += `,r=${id}`; }   // heading without a trailing power
    emit(attr, tex); return end;
  };
  const closing = j => { let d = 0; for (; j < n; j++) { if (src[j] === '\\') { j++; continue; } if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return j; } return n - 1; };
  scan: while (i < n) {
    const ch = src[i];
    if (ch === '^') { G_ITER.lastIndex = i; const m = G_ITER.exec(src); if (m) { out += `^{\\htmlData{g=iter}{${m[1]}}}`; i = G_ITER.lastIndex; brace = false; continue; } }
    if (src.startsWith('\\lVert', i)) { const j = src.indexOf('\\rVert', i + 6); if (j > 0) { emit('g=norm', '\\lVert ' + annot(src.slice(i + 6, j)) + '\\rVert'); i = j + 6; continue; } }
    for (const [re, key] of G_ATOM) { re.lastIndex = i; if (re.exec(src)) { i = unit(key, i, re.lastIndex); continue scan; } }
    if (ch === '\\') {
      G_CWRE.lastIndex = i; const cw = G_CWRE.exec(src)[0], at = i; i = G_CWRE.lastIndex;
      if (cw === '\\\\') { out += cw; if (src[i] === '[') { const j = src.indexOf(']', i); out += src.slice(i, j + 1); i = j + 1; } brace = false; continue; }
      if (G_SKIP.has(cw)) { out += cw; while (src[i] === ' ') out += src[i++]; if (src[i] === '{') { const j = closing(i); out += src.slice(i, j + 1); i = j + 1; } brace = false; continue; }
      if (G_CW[cw]) { i = unit(G_CW[cw], at, i); continue; }
      out += cw; brace = /^\\[a-zA-Z]/.test(cw); continue;
    }
    if (G_LET[ch]) { i = unit(G_LET[ch], i, i + 1); continue; }
    out += ch; i++;
    if (ch === '_' || ch === '^') brace = true; else if (ch !== ' ') brace = false;
  }
  return out;
}

/* ---------- 2. explanations ---------- */
const GLOSS = {
  f: { s: R`f(\mathbf{x})`, t: 'Funkcja kosztu (cost function)',
    what: R`Funkcja, którą minimalizujemy. Każdemu punktowi $\mathbf{x}$, czyli zestawowi wartości zmiennych, przypisuje jedną liczbę: miarę tego, jak daleko jesteśmy od celu.`,
    how: [R`Podstaw współrzędne punktu do wzoru funkcji podanego u góry strony.`, R`Wynikiem jest jedna liczba. Im jest mniejsza, tym lepszy punkt.`, R`W zadaniach dopasowania modelu do danych koszt to połowa sumy kwadratów reszt: $\tfrac12\lVert\mathbf{r}\rVert^2$.`],
    why: R`Optymalizacja polega na szukaniu punktu, w którym $f$ przyjmuje najmniejszą wartość. Wykres kosztu w kolejnych iteracjach to podstawowe narzędzie diagnostyczne: jeśli koszt nie maleje, metoda albo jej parametry są źle dobrane.` },
  fstar: { s: R`f^{*}`, t: 'Wartość minimalna funkcji kosztu',
    what: R`Najmniejsza wartość, jaką przyjmuje funkcja kosztu: $f^{*}=f(\mathbf{x}^{*})$, gdzie $\mathbf{x}^{*}$ to punkt minimum.`,
    how: [R`Dla funkcji użytych na tej stronie wartość ta jest znana z góry, na przykład $0$ dla funkcji kwadratowych i $2$ dla funkcji $\cosh$.`, R`W prawdziwych zadaniach zwykle jej nie znamy i możemy ją tylko przybliżać.`],
    why: R`Różnica $f-f^{*}$ mówi, ile jeszcze brakuje do minimum. Na wykresach rysujemy ją w skali logarytmicznej, bo wtedy widać rodzaj zbieżności: linia prosta oznacza zbieżność liniową, a krzywa opadająca coraz bardziej stromo oznacza zbieżność kwadratową.` },
  cost: { s: R`\tfrac12\lVert\mathbf{r}\rVert^2`, t: 'Koszt w zadaniu najmniejszych kwadratów',
    what: R`Połowa sumy kwadratów reszt. Jedna liczba, która ocenia, jak dobrze model pasuje do wszystkich pomiarów jednocześnie.`,
    how: [R`Dla każdego pomiaru oblicz resztę: wartość modelu minus wartość zmierzona, $r_i$.`, R`Każdą resztę podnieś do kwadratu i wszystkie kwadraty zsumuj. Otrzymasz $\lVert\mathbf{r}\rVert^2$, czyli kwadrat normy wektora reszt.`, R`Wynik pomnóż przez $\tfrac12$.`],
    why: R`Koszt równy zeru oznaczałby, że krzywa przechodzi dokładnie przez wszystkie punkty. Podnoszenie do kwadratu sprawia, że duże odchyłki są karane znacznie mocniej niż małe, a znak reszty nie ma znaczenia. Czynnik $\tfrac12$ nie zmienia położenia minimum, ale upraszcza wzór na gradient do postaci $J^{\top}\mathbf{r}$. Gdy dane zawierają szum, koszt nie spada do zera: zatrzymuje się na poziomie wyznaczonym przez wielkość szumu.` },
  costnow: { s: R`f`, t: 'Koszt bieżący',
    what: R`Wartość funkcji kosztu dla aktualnych ustawień parametrów, czyli $\tfrac12\lVert\mathbf{r}\rVert^2$ obliczone dla krzywej, którą widzisz na wykresie.`,
    how: [R`Dla bieżących parametrów oblicz wartość modelu w każdym punkcie pomiarowym.`, R`Odejmij pomiary, podnieś różnice do kwadratu, zsumuj i pomnóż przez $\tfrac12$.`],
    why: R`To liczba, którą starasz się zmniejszyć, przesuwając suwaki lub wykonując kroki algorytmu. Porównaj ją z kosztem najlepszego dopasowania: im bliżej, tym lepszy wynik.` },
  bestcost: { s: R`f^{*}`, t: 'Koszt najlepszego dopasowania',
    what: R`Najmniejszy koszt, jaki da się uzyskać dla wybranego pacjenta. Odpowiada parametrom wyznaczonym metodą Gaussa–Newtona.`,
    how: [R`Uruchom metodę Gaussa–Newtona z domyślnego punktu startowego i poczekaj, aż poprawki staną się pomijalnie małe.`, R`Koszt w punkcie końcowym to koszt najlepszego dopasowania.`],
    why: R`Jest punktem odniesienia dla Twoich prób. Nie jest równy zeru, bo pomiary zawierają szum, a model jest uproszczeniem rzeczywistości.` },
  grad: { s: R`\nabla f`, t: 'Gradient',
    what: R`Wektor pochodnych cząstkowych funkcji kosztu. Wskazuje kierunek, w którym funkcja rośnie najszybciej, a jego długość mówi, jak stromo jest w danym punkcie.`,
    how: [R`Oblicz pochodną funkcji względem każdej zmiennej osobno, traktując pozostałe jak stałe.`, R`Zbierz wyniki w wektor: tyle składowych, ile zmiennych.`, R`W programie robi to zwykle mechanizm automatycznego różniczkowania (autograd). Można go też wyznaczyć numerycznie, różnicami centralnymi.`],
    why: R`Kierunek przeciwny do gradientu to kierunek najszybszego spadku, dlatego wszystkie omawiane tu metody zaczynają od jego obliczenia. W minimum gradient jest wektorem zerowym, więc mała norma gradientu sygnalizuje, że jesteśmy blisko rozwiązania.` },
  nabla: { s: R`\nabla`, t: 'Operator nabla',
    what: R`Symbol oznaczający różniczkowanie względem wszystkich zmiennych naraz. Zapis $\nabla f$ to gradient funkcji $f$, a $\nabla^2 f$ to jej hesjan.`,
    how: [R`Sam operator niczego nie oblicza: mówi, co zrobić z funkcją, która stoi za nim.`, R`$\nabla f$ oznacza „oblicz wszystkie pochodne cząstkowe pierwszego rzędu i ustaw je w wektor”.`],
    why: R`Pozwala krótko zapisać wzory, które inaczej wymagałyby wypisywania każdej pochodnej z osobna.` },
  partial: { s: R`\partial`, t: 'Pochodna cząstkowa',
    what: R`Symbol pochodnej względem jednej, wybranej zmiennej. Zapis $\partial f/\partial x_0$ mówi, jak szybko zmienia się $f$, gdy zmieniamy tylko $x_0$, a pozostałe zmienne pozostają bez zmian.`,
    how: [R`Analitycznie: różniczkuj wzór funkcji względem wybranej zmiennej, traktując pozostałe jak stałe.`, R`Numerycznie: przesuń tylko tę jedną zmienną o $+h$ i $-h$, oblicz różnicę wartości funkcji i podziel przez $2h$.`],
    why: R`Pochodne cząstkowe są składowymi gradientu, jakobianu i hesjanu, czyli wszystkich obiektów, z których korzystają metody optymalizacji.` },
  norm: { s: R`\lVert\mathbf{a}\rVert`, t: 'Norma, czyli długość wektora',
    what: R`Jedna nieujemna liczba, która mierzy wielkość całego wektora. Dla wektora na płaszczyźnie jest to zwykła długość strzałki.`,
    how: [R`Każdą składową wektora podnieś do kwadratu.`, R`Zsumuj kwadraty.`, R`Wyciągnij pierwiastek kwadratowy z sumy.`],
    why: R`Pozwala ocenić wektor jedną liczbą. Norma gradientu mówi, jak stromo jest w bieżącym punkcie, i służy jako kryterium zakończenia obliczeń. Norma poprawki mówi, jak długi krok wykonała metoda. Norma wektora reszt mierzy łączny błąd dopasowania modelu.` },
  x: { s: R`\mathbf{x}`, t: 'Punkt, czyli wektor zmiennych',
    what: R`Aktualne położenie w przestrzeni zmiennych. Na tej stronie jest to para liczb $(x_0,\ x_1)$, czyli punkt na płaszczyźnie.`,
    how: [R`Punkt startowy wybierasz samodzielnie, na przykład kliknięciem na wykresie poziomic.`, R`Każdy kolejny punkt wyznacza algorytm na podstawie poprzedniego.`],
    why: R`To właśnie tego szukamy: punktu, w którym funkcja kosztu jest najmniejsza. Ciąg kolejnych punktów tworzy trajektorię metody widoczną na wykresie.` },
  xstar: { s: R`\mathbf{x}^{*}`, t: 'Rozwiązanie: punkt minimum lub pierwiastek',
    what: R`Gwiazdka oznacza wartość dokładną, do której metoda ma dążyć: punkt minimum funkcji kosztu albo pierwiastek równania.`,
    how: [R`Dla przykładów z tej strony rozwiązanie jest znane z góry i zaznaczone gwiazdką na wykresie.`, R`W praktyce nie jest znane: po to właśnie uruchamiamy algorytm.`],
    why: R`Znajomość rozwiązania pozwala mierzyć błąd, czyli odległość bieżącego przybliżenia od celu, i dzięki temu badać szybkość zbieżności metod.` },
  xcomp: { s: R`x_0,\ x_1`, t: 'Współrzędne punktu',
    what: R`Pojedyncze liczby, z których składa się punkt $\mathbf{x}$. Numerujemy je od zera, tak jak elementy tablicy w Pythonie: <code>x[0]</code>, <code>x[1]</code>.`,
    how: [R`Odczytaj je z wykresu: $x_0$ na osi poziomej, $x_1$ na osi pionowej.`, R`Zapis $x_i$ oznacza współrzędną o numerze $i$.`],
    why: R`Funkcja kosztu zależy od każdej współrzędnej inaczej. Tam, gdzie zależność jest silna, dolina jest stroma; tam, gdzie słaba, łagodna. Ta różnica decyduje o zachowaniu metod.` },
  xk: { s: R`x_k`, t: 'Kolejne przybliżenie pierwiastka',
    what: R`Liczba, która przybliża szukany pierwiastek równania po $k$ krokach metody Newtona. $x_0$ to przybliżenie początkowe.`,
    how: [R`Oblicz wartość funkcji $g(x_k)$ i pochodnej $g'(x_k)$.`, R`Wyznacz miejsce zerowe stycznej: $x_{k+1}=x_k-g(x_k)/g'(x_k)$.`],
    why: R`Jeśli punkt startowy leży dostatecznie blisko pierwiastka, ciąg przybliżeń zbiega do niego bardzo szybko: liczba poprawnych cyfr podwaja się w każdym kroku.` },
  xscal: { s: R`x`, t: 'Zmienna, czyli argument funkcji',
    what: R`Liczba, od której zależy wartość funkcji. W zadaniu szukania pierwiastka jest to niewiadoma równania $g(x)=0$.`,
    how: [R`Podstaw wybraną wartość do wzoru funkcji.`, R`Algorytm zmienia ją krok po kroku, aż równanie będzie spełnione z żądaną dokładnością.`],
    why: R`Cała metoda polega na poprawianiu tej jednej liczby.` },
  xnew: { s: R`\mathbf{x}_{\text{nowy}}`, t: 'Nowy punkt po wykonaniu kroku',
    what: R`Punkt obliczony w bieżącej iteracji, zanim stanie się punktem wyjściowym następnej.`,
    how: [R`Od bieżącego punktu odejmij gradient pomnożony przez współczynnik uczenia: $\mathbf{x}-\alpha\,\nabla f$.`, R`W kodzie wykonaj to w bloku <code>torch.no_grad()</code>, a wynik zamień na nowy liść grafu obliczeń.`],
    why: R`Rozdzielenie „starego” i „nowego” punktu chroni przed częstym błędem: użyciem częściowo zaktualizowanego punktu do obliczenia pozostałych współrzędnych.` },
  iter: { s: R`\mathbf{x}^{(k)}`, t: 'Numer iteracji w indeksie górnym',
    what: R`Liczba w nawiasie u góry to numer kroku, a nie potęga. Zapis $\mathbf{x}^{(3)}$ oznacza punkt po trzech krokach algorytmu.`,
    how: [R`Punkt startowy ma numer $(0)$.`, R`Każdy wykonany krok zwiększa numer o jeden.`],
    why: R`Dzięki nawiasowi numer kroku nie myli się z numerem współrzędnej, który stoi w indeksie dolnym. W literaturze ten sam ciąg punktów zapisuje się często jako $x_k$.` },
  kiter: { s: R`k`, t: 'Numer iteracji',
    what: R`Licznik wykonanych kroków algorytmu. Start odpowiada $k=0$.`,
    how: [R`Zwiększ licznik o jeden po każdym pełnym kroku metody.`],
    why: R`Liczba iteracji potrzebna do osiągnięcia zadanej dokładności to podstawowa miara szybkości metody. Na jej podstawie porównujemy algorytmy.` },
  hit: { s: R`k`, t: 'Pierwsza iteracja z małym kosztem',
    what: R`Numer pierwszego kroku, po którym koszt ponad minimum spadł poniżej progu: $f-f^{*}<10^{-6}$.`,
    how: [R`Po każdym kroku oblicz $f-f^{*}$.`, R`Zapisz numer kroku, w którym po raz pierwszy wartość ta jest mniejsza od $10^{-6}$.`, R`Kreska oznacza, że próg nie został jeszcze osiągnięty.`],
    why: R`To wygodna liczba do porównywania metod i ustawień: mniej kroków oznacza szybszą zbieżność. Uwaga: osiągnięcie progu nie gwarantuje, że koszt później nie wzrośnie.` },
  alpha: { s: R`\alpha`, t: 'Współczynnik uczenia (learning rate), długość kroku (step size)',
    what: R`Dodatnia liczba, przez którą mnożymy kierunek kroku. W metodzie spadku gradientu nowy punkt to $\mathbf{x}-\alpha\,\nabla f$. Bywa też nazywana tempem uczenia.`,
    how: [R`W metodzie spadku gradientu i w metodzie z momentem ustalasz ją samodzielnie i nie zmienia się w trakcie obliczeń.`, R`Rzeczywista długość kroku to $\alpha$ razy norma gradientu, więc na stromym zboczu ten sam współczynnik daje dłuższy krok.`, R`W poszukiwaniu w kierunku algorytm dobiera $\alpha$ sam, osobno w każdej iteracji: zaczyna od $1$ i skraca krok, aż koszt dostatecznie spadnie.`],
    why: R`To najważniejszy parametr metod gradientowych. Zbyt mała wartość daje bardzo wolną zbieżność, zbyt duża prowadzi do oscylacji, a powyżej granicy $2/L$ do rozbieżności.` },
  alphaopt: { s: R`\alpha^{*}`, t: 'Optymalny współczynnik uczenia',
    what: R`Wartość współczynnika uczenia, dla której metoda zbiega najszybciej dla danej funkcji kwadratowej.`,
    how: [R`Dla metody spadku gradientu: $\alpha^{*}=\dfrac{2}{m+L}$, gdzie $m$ i $L$ to najmniejsza i największa krzywizna.`, R`Dla metody z momentem: $\alpha^{*}=\dfrac{4}{(\sqrt{L}+\sqrt{m})^2}$.`],
    why: R`Pokazuje, że najszybsza zbieżność nie wypada tuż pod granicą stabilności. Dla tej wartości błąd w kierunku stromym i w kierunku łagodnym maleje w tym samym tempie.` },
  kappa: { s: R`\kappa`, t: 'Wskaźnik uwarunkowania (condition number)',
    what: R`Stosunek największej krzywizny do najmniejszej: $\kappa=L/m$. Nazywany też liczbą warunkową. Dla macierzy jest to stosunek jej największej wartości własnej do najmniejszej.`,
    how: [R`Wyznacz największą i najmniejszą wartość własną hesjanu albo macierzy $J^{\top}J$.`, R`Podziel pierwszą przez drugą.`],
    why: R`Mówi, jak bardzo wydłużona jest dolina funkcji kosztu. Dla $\kappa=1$ poziomice są okręgami i metoda spadku gradientu trafia w minimum bez trudu. Im większe $\kappa$, tym węższa dolina, wolniejsza zbieżność spadku gradientu i większa wrażliwość rozwiązania układu równań na błędy zaokrągleń.` },
  Lip: { s: R`L`, t: 'Największa krzywizna, stała Lipschitza gradientu',
    what: R`Największa wartość własna hesjanu, czyli krzywizna funkcji w kierunku, w którym dolina jest najbardziej stroma.`,
    how: [R`Dla funkcji kwadratowej odczytaj ją ze wzoru: to największy współczynnik przy kwadracie zmiennej.`, R`Dla funkcji kwadratowej („miski”) jest to $L=5$, a dla funkcji o wąskiej dolinie $L=100$.`],
    why: R`Wyznacza granicę stabilności metody spadku gradientu: współczynnik uczenia musi spełniać $\alpha<2/L$. Im większe $L$, tym mniejszy krok jest dopuszczalny.` },
  mcurv: { s: R`m`, t: 'Najmniejsza krzywizna',
    what: R`Najmniejsza wartość własna hesjanu, czyli krzywizna funkcji w kierunku, w którym dolina jest najbardziej łagodna.`,
    how: [R`Dla funkcji kwadratowej odczytaj ją ze wzoru: to najmniejszy współczynnik przy kwadracie zmiennej. Dla obu funkcji kwadratowych z tej strony jest to $m=1$.`],
    why: R`Decyduje o tym, jak wolno maleje błąd w kierunku łagodnym: w jednym kroku spadku gradientu mnoży się on przez $1-\alpha m$. Razem z $L$ tworzy wskaźnik uwarunkowania $\kappa=L/m$.` },
  hstep: { s: R`h`, t: 'Krok różnicowy',
    what: R`Mała liczba, o którą przesuwamy argument funkcji, aby numerycznie oszacować pochodną.`,
    how: [R`Wybierz wartość $h$, typowo $10^{-5}$.`, R`Oblicz wartości funkcji w punktach przesuniętych o $+h$ i $-h$ wzdłuż jednej osi.`, R`Różnicę tych wartości podziel przez $2h$.`],
    why: R`Od wyboru $h$ zależy dokładność gradientu. Zbyt duży krok daje błąd obcięcia, który maleje jak $h^2$. Zbyt mały krok wzmacnia błąd zaokrągleń, który rośnie jak $\varepsilon/h$. Najlepszy kompromis wypada w okolicy $10^{-5}$.` },
  eps: { s: R`\varepsilon`, t: 'Epsilon maszynowy (machine epsilon)',
    what: R`Względna dokładność liczb zmiennoprzecinkowych. Dla liczb podwójnej precyzji wynosi około $2.2\cdot10^{-16}$, co odpowiada mniej więcej szesnastu cyfrom znaczącym.`,
    how: [R`To najmniejsza liczba, dla której komputer odróżnia $1+\varepsilon$ od $1$.`, R`W NumPy: <code>np.finfo(float).eps</code>.`],
    why: R`Wyznacza granicę dokładności wszystkich obliczeń. Gdy odejmujemy dwie prawie równe liczby, a wynik dzielimy przez małe $h$, błąd tej wielkości zostaje wielokrotnie wzmocniony.` },
  unitvec: { s: R`\mathbf{e}_i`, t: 'Wersor osi',
    what: R`Wektor jednostkowy wskazujący kierunek jednej osi: ma jedynkę na pozycji $i$ i zera na pozostałych. Na płaszczyźnie $\mathbf{e}_0=(1,\ 0)$, $\mathbf{e}_1=(0,\ 1)$.`,
    how: [R`Utwórz wektor zer o tym samym kształcie co $\mathbf{x}$.`, R`Wpisz jedynkę na pozycji $i$.`],
    why: R`Zapis $\mathbf{x}+h\,\mathbf{e}_i$ oznacza zwięźle „zwiększ tylko współrzędną numer $i$ o $h$”. Tak właśnie liczy się pochodną cząstkową.` },
  xpm: { s: R`\mathbf{x}^{+},\ \mathbf{x}^{-}`, t: 'Punkty przesunięte o krok różnicowy',
    what: R`Dwie kopie punktu $\mathbf{x}$, w których jedną współrzędną zwiększono albo zmniejszono o $h$.`,
    how: [R`Skopiuj punkt $\mathbf{x}$.`, R`W jednej kopii dodaj $h$ do współrzędnej numer $i$, w drugiej odejmij.`],
    why: R`Wartości funkcji w tych dwóch punktach wystarczają do oszacowania pochodnej cząstkowej. Praca na kopiach chroni przed przypadkową zmianą oryginalnego punktu.` },
  fpm: { s: R`f^{+},\ f^{-}`, t: 'Wartości funkcji w punktach przesuniętych',
    what: R`Wartości funkcji kosztu obliczone w punktach $\mathbf{x}^{+}$ i $\mathbf{x}^{-}$.`,
    how: [R`Podstaw każdy z dwóch przesuniętych punktów do funkcji.`],
    why: R`Ich różnica podzielona przez $2h$ to iloraz różnicowy centralny, czyli przybliżenie pochodnej cząstkowej.` },
  cdiff: { s: R`\dfrac{f(\mathbf{x}+h\mathbf{e}_i)-f(\mathbf{x}-h\mathbf{e}_i)}{2h}`, t: 'Różnice centralne (central differences)',
    what: R`Przybliżenie pochodnej cząstkowej zbudowane z wartości funkcji w dwóch punktach położonych symetrycznie po obu stronach $\mathbf{x}$.`,
    how: [R`Oblicz wartość funkcji w punkcie przesuniętym o $+h$ i w punkcie przesuniętym o $-h$.`, R`Odejmij drugą wartość od pierwszej.`, R`Podziel przez odległość między punktami, czyli $2h$.`, R`Powtórz dla każdej współrzędnej.`],
    why: R`Błąd tej metody maleje jak $h^2$, czyli znacznie szybciej niż dla różnic w przód. Dlatego jest to metoda stosowana najczęściej.` },
  fdiff: { s: R`\dfrac{f(\mathbf{x}+h\mathbf{e}_i)-f(\mathbf{x})}{h}`, t: 'Różnice w przód (forward differences)',
    what: R`Prostsze przybliżenie pochodnej cząstkowej: korzysta z wartości funkcji w punkcie $\mathbf{x}$ i w jednym punkcie przesuniętym.`,
    how: [R`Oblicz wartość funkcji w punkcie $\mathbf{x}$ oraz w punkcie przesuniętym o $+h$.`, R`Różnicę podziel przez $h$.`],
    why: R`Wymaga mniej obliczeń funkcji, ale jej błąd maleje tylko jak $h$. Pokazujemy ją dla porównania, żeby było widać, ile daje symetria różnic centralnych.` },
  graderr: { s: R`\max_i\,|\,\cdot\,|`, t: 'Błąd gradientu numerycznego',
    what: R`Największa co do modułu różnica między składową gradientu obliczonego numerycznie a składową gradientu ze wzoru analitycznego.`,
    how: [R`Oblicz gradient numerycznie dla wybranego $h$.`, R`Oblicz gradient ze wzoru.`, R`Odejmij odpowiadające sobie składowe i weź największą wartość bezwzględną.`],
    why: R`Pokazuje, ile cyfr gradientu numerycznego jest wiarygodnych. Na wykresie widać dwa źródła błędu: po prawej dominuje błąd obcięcia, po lewej błąd zaokrągleń.` },
  beta: { s: R`\beta`, t: 'Współczynnik momentu (momentum coefficient)',
    what: R`Liczba z przedziału od $0$ do $1$. Określa, jaka część poprzedniej prędkości przechodzi do następnego kroku.`,
    how: [R`Ustalasz ją samodzielnie; typowa wartość to $0.9$.`, R`W każdym kroku nowa prędkość to $\beta$ razy poprzednia prędkość plus bieżący gradient.`],
    why: R`Dla $\beta=0$ metoda jest zwykłym spadkiem gradientu. Większe wartości dają dłuższą pamięć: gdy gradient ma stały kierunek, efektywny krok wydłuża się $1/(1-\beta)$ razy. Zbyt duże $\beta$ powoduje, że punkt mija minimum i długo wokół niego oscyluje.` },
  betaopt: { s: R`\beta^{*}`, t: 'Optymalny współczynnik momentu',
    what: R`Wartość współczynnika momentu, która dla funkcji kwadratowej daje najszybszą zbieżność.`,
    how: [R`Oblicz wskaźnik uwarunkowania $\kappa=L/m$.`, R`Podstaw do wzoru $\beta^{*}=\Big(\dfrac{\sqrt{\kappa}-1}{\sqrt{\kappa}+1}\Big)^2$.`],
    why: R`Dla źle uwarunkowanych zadań wychodzi blisko jedynki. Przy takim doborze liczba kroków rośnie jak $\sqrt{\kappa}$, a nie jak $\kappa$.` },
  v: { s: R`\mathbf{v}`, t: 'Prędkość, czyli bufor momentu (velocity buffer)',
    what: R`Wektor, w którym metoda z momentem gromadzi informację o poprzednich gradientach. Jest ważoną sumą wszystkich dotychczasowych gradientów, w której starsze mają coraz mniejszą wagę.`,
    how: [R`Na początku ustaw prędkość na wektor zerowy.`, R`W każdym kroku pomnóż ją przez $\beta$ i dodaj bieżący gradient.`, R`Przesuń punkt o $-\alpha$ razy nowa prędkość.`],
    why: R`W kierunku stromym kolejne gradienty mają przeciwne znaki, więc w sumie się znoszą i oscylacje gasną. W kierunku łagodnym mają ten sam znak, więc się dodają i ruch przyspiesza.` },
  gvec: { s: R`\mathbf{g}`, t: 'Gradient w bieżącym punkcie',
    what: R`Skrócone oznaczenie gradientu funkcji kosztu obliczonego w punkcie, w którym aktualnie jesteśmy: $\mathbf{g}=\nabla f(\mathbf{x})$.`,
    how: [R`Podstaw współrzędne bieżącego punktu do wzoru na gradient albo wywołaj automatyczne różniczkowanie.`],
    why: R`Każda metoda zaczyna iterację od tego wektora. Różnią się tym, co z nim robią dalej: mnożą przez współczynnik uczenia, dodają do prędkości albo przekształcają za pomocą hesjanu.` },
  p: { s: R`\mathbf{p}`, t: 'Kierunek kroku, poprawka',
    what: R`Wektor, o który przesuwamy bieżący punkt lub wektor parametrów. Nowy punkt to stary punkt plus $\mathbf{p}$, ewentualnie pomnożone przez długość kroku $\alpha$.`,
    how: [R`Poszukiwanie w kierunku: $\mathbf{p}=-\nabla f$, czyli kierunek najszybszego spadku.`, R`Metoda Newtona: rozwiąż układ równań $H\,\mathbf{p}=-\nabla f$.`, R`Metoda Gaussa–Newtona: rozwiąż układ równań normalnych z macierzą $J^{\top}J$ i prawą stroną $-J^{\top}\mathbf{r}$.`],
    why: R`Sposób wyznaczania tego wektora jest tym, co odróżnia od siebie metody optymalizacji. Gdy jego norma maleje do zera, metoda osiągnęła zbieżność.` },
  phi: { s: R`\varphi(\alpha)`, t: 'Koszt wzdłuż kierunku kroku',
    what: R`Funkcja jednej zmiennej, która mówi, ile wyniesie koszt, jeśli z bieżącego punktu przesuniemy się o $\alpha$ wzdłuż kierunku $\mathbf{p}$: $\varphi(\alpha)=f(\mathbf{x}+\alpha\,\mathbf{p})$.`,
    how: [R`Ustal punkt $\mathbf{x}$ i kierunek $\mathbf{p}$.`, R`Dla wybranego $\alpha$ oblicz punkt $\mathbf{x}+\alpha\,\mathbf{p}$ i wartość funkcji kosztu w tym punkcie.`],
    why: R`Sprowadza pytanie „jak długi krok wykonać” do badania zwykłej funkcji jednej zmiennej, którą można narysować i przeanalizować.` },
  c1: { s: R`c_1`, t: 'Stała w warunku Armijo',
    what: R`Liczba z przedziału od $0$ do $1$. Określa, jaką część spadku kosztu przewidywanego przez przybliżenie liniowe krok musi faktycznie zapewnić.`,
    how: [R`Ustalasz ją samodzielnie; typowa wartość to $10^{-4}$.`, R`Krok o długości $\alpha$ jest akceptowany, gdy koszt po kroku nie przekracza $f+c_1\,\alpha\,\nabla f^{\top}\mathbf{p}$.`],
    why: R`Mała wartość sprawia, że akceptowany jest niemal każdy krok zmniejszający koszt, więc odrzucane są tylko kroki wyraźnie złe. Duża wartość wymusza krótkie, ostrożne kroki.` },
  armijo: { s: R`f+c_1\,\alpha\,\nabla f^{\top}\mathbf{p}`, t: 'Granica w warunku Armijo',
    what: R`Największy koszt, jaki może dać krok o długości $\alpha$, aby został zaakceptowany. Na wykresie jest to zielona linia.`,
    how: [R`Oblicz iloczyn skalarny gradientu i kierunku kroku. Dla kierunku spadku jest ujemny.`, R`Pomnóż go przez $c_1$ i przez badaną długość kroku $\alpha$.`, R`Dodaj do bieżącej wartości funkcji kosztu.`],
    why: R`Zapewnia dostateczny spadek (sufficient decrease): nie wystarczy, że koszt zmaleje, musi zmaleć proporcjonalnie do długości kroku. Dzięki temu metoda nie zatrzyma się na krokach, które prawie nic nie dają.` },
  rho: { s: R`\rho`, t: 'Współczynnik skracania kroku',
    what: R`Liczba z przedziału od $0$ do $1$, przez którą mnożymy długość kroku po każdej odrzuconej próbie.`,
    how: [R`Ustalasz ją samodzielnie; często $0.5$, czyli połowienie kroku.`, R`Po każdej próbie, która nie spełnia warunku Armijo, nowa długość kroku to $\rho$ razy poprzednia.`],
    why: R`Wartość bliska $1$ skraca krok ostrożnie: znajduje długi dopuszczalny krok, ale wymaga wielu prób. Wartość bliska $0$ skraca agresywnie: prób jest mało, ale zaakceptowany krok bywa dużo krótszy, niż mógłby być.` },
  evals: { s: R`f`, t: 'Liczba obliczeń wartości funkcji',
    what: R`Ile razy od początku przebiegu trzeba było obliczyć wartość funkcji kosztu.`,
    how: [R`Metoda ze stałym współczynnikiem oblicza funkcję raz na krok.`, R`Poszukiwanie w kierunku oblicza ją przy każdej próbie długości kroku, czyli kilka albo kilkanaście razy na krok.`],
    why: R`W prawdziwych zadaniach obliczenie funkcji kosztu bywa najdroższą operacją. Liczba iteracji nie mówi więc wszystkiego o koszcie metody: trzeba też wiedzieć, ile pracy wymaga jedna iteracja.` },
  hess: { s: R`H`, t: 'Hesjan (Hessian), macierz Hessego',
    what: R`Macierz drugich pochodnych cząstkowych funkcji kosztu. Opisuje krzywiznę funkcji w każdym kierunku.`,
    how: [R`Element w wierszu $i$ i kolumnie $j$ to druga pochodna funkcji względem zmiennych o numerach $i$ oraz $j$.`, R`Dla $n$ zmiennych jest to symetryczna macierz o wymiarze $n\times n$.`, R`W PyTorch oblicza ją funkcja <code>torch.autograd.functional.hessian</code>.`],
    why: R`Metoda Newtona dzieli gradient przez krzywiznę, dzięki czemu wykonuje krótszy krok w kierunku stromym i dłuższy w łagodnym. Hesjan decyduje też o rodzaju punktu stacjonarnego: gdy jest dodatnio określony, punkt jest minimum.` },
  hesskind: { s: R`H`, t: 'Określoność hesjanu w bieżącym punkcie',
    what: R`Informacja o znakach wartości własnych hesjanu, czyli o tym, czy funkcja w otoczeniu punktu zakrzywia się w górę we wszystkich kierunkach.`,
    how: [R`Oblicz wartości własne hesjanu w bieżącym punkcie.`, R`Wszystkie dodatnie: hesjan dodatnio określony. Różne znaki: nieokreślony. Wszystkie ujemne: ujemnie określony.`],
    why: R`Gdy hesjan jest dodatnio określony, model kwadratowy ma minimum i krok Newtona prowadzi w dół. Gdy jest nieokreślony, punkt stacjonarny jest punktem siodłowym, a krok Newtona może prowadzić w kierunku wzrostu funkcji.` },
  jac: { s: R`J`, t: 'Jakobian reszt (Jacobian)',
    what: R`Macierz pierwszych pochodnych reszt względem parametrów modelu. Ma tyle wierszy, ile jest pomiarów, i tyle kolumn, ile jest parametrów.`,
    how: [R`Element $J_{ij}$ to pochodna reszty numer $i$ względem parametru numer $j$.`, R`W PyTorch całą macierz zwraca funkcja <code>torch.autograd.functional.jacobian</code>.`],
    why: R`Mówi, jak każda reszta zareaguje na małą zmianę każdego parametru. Z jakobianu powstaje gradient kosztu $J^{\top}\mathbf{r}$ oraz przybliżenie hesjanu $J^{\top}J$, czyli wszystko, czego potrzebuje metoda Gaussa–Newtona.` },
  JtJ: { s: R`J^{\top}J`, t: 'Przybliżenie hesjanu w metodzie Gaussa–Newtona',
    what: R`Kwadratowa macierz, która w metodzie Gaussa–Newtona zastępuje hesjan funkcji kosztu.`,
    how: [R`Oblicz jakobian reszt.`, R`Pomnóż jego transpozycję przez niego samego. Dla $n$ parametrów wynik ma wymiar $n\times n$.`],
    why: R`Pozwala wykonać krok podobny do kroku Newtona bez obliczania drugich pochodnych. Jest zawsze dodatnio półokreślona, więc krok nie prowadzi w kierunku wzrostu kosztu. Jej wskaźnik uwarunkowania decyduje o tym, jak wiarygodne jest rozwiązanie układu równań.` },
  Jtr: { s: R`J^{\top}\mathbf{r}`, t: 'Gradient kosztu w zadaniu najmniejszych kwadratów',
    what: R`Wektor, który jest gradientem funkcji kosztu $\tfrac12\lVert\mathbf{r}\rVert^2$ względem parametrów.`,
    how: [R`Oblicz jakobian reszt i wektor reszt.`, R`Pomnóż transpozycję jakobianu przez wektor reszt.`],
    why: R`Ze znakiem minus tworzy prawą stronę układu równań normalnych. W minimum jest wektorem zerowym.` },
  r: { s: R`\mathbf{r}`, t: 'Wektor reszt (residuals)',
    what: R`Zbiór różnic między wartościami modelu a pomiarami, po jednej dla każdego pomiaru.`,
    how: [R`Dla bieżących parametrów oblicz wartość modelu w każdym punkcie pomiarowym.`, R`Od każdej wartości modelu odejmij odpowiadający jej pomiar.`],
    why: R`Pokazuje, gdzie i jak bardzo model się myli. Dodatnia reszta oznacza, że krzywa leży nad punktem pomiarowym, ujemna, że pod nim. Z reszt powstaje funkcja kosztu.` },
  ri: { s: R`r_i`, t: 'Reszta pojedynczego pomiaru',
    what: R`Różnica między wartością modelu a wartością zmierzoną dla pomiaru numer $i$. Na wykresie jest to długość pionowego odcinka między krzywą a punktem.`,
    how: [R`Oblicz wartość modelu dla argumentu, przy którym wykonano pomiar.`, R`Odejmij wartość zmierzoną.`],
    why: R`Pojedyncze reszty pozwalają ocenić, czy model myli się losowo, czy systematycznie, na przykład zawsze w tę samą stronę.` },
  theta: { s: R`\boldsymbol\theta`, t: 'Wektor parametrów modelu',
    what: R`Wszystkie parametry modelu zebrane w jeden wektor. Dla równania Michaelisa–Menten jest to $(V_{\max},\ K_m)$, a dla modelu farmakokinetycznego logarytmy trzech parametrów.`,
    how: [R`Wartości początkowe podajesz samodzielnie.`, R`W każdej iteracji algorytm dodaje do wektora parametrów poprawkę $\mathbf{p}$.`],
    why: R`To niewiadome zadania dopasowania. Znalezienie parametrów, dla których koszt jest najmniejszy, oznacza dopasowanie modelu do danych.` },
  thetaj: { s: R`\theta_j`, t: 'Pojedynczy parametr modelu',
    what: R`Jedna ze składowych wektora parametrów. W zadaniu farmakokinetycznym $\theta_0$, $\theta_1$ i $\theta_2$ to logarytmy naturalne $k_a$, $k_e$ i $V$.`,
    how: [R`Aby wrócić do parametru w jednostkach pierwotnych, oblicz funkcję wykładniczą: na przykład $k_e=e^{\theta_1}$.`],
    why: R`Praca na logarytmach gwarantuje, że parametry pozostają dodatnie, i poprawia uwarunkowanie zadania, bo wszystkie zmienne mają podobny rząd wielkości.` },
  lambda: { s: R`\lambda`, t: 'Współczynnik tłumienia (damping)',
    what: R`Nieujemna liczba, która w metodzie Levenberga–Marquardta powiększa przekątną macierzy $J^{\top}J$ przed rozwiązaniem układu równań.`,
    how: [R`Dla $\lambda=0$ otrzymujesz zwykłą metodę Gaussa–Newtona.`, R`Dla $\lambda>0$ każdy element przekątnej macierzy $J^{\top}J$ jest mnożony przez $1+\lambda$.`],
    why: R`Większe tłumienie skraca krok i obraca go w stronę kierunku najszybszego spadku. Metoda staje się wolniejsza, ale bezpieczniejsza: z odległego punktu startowego nie wyrzuca parametrów poza sensowny zakres.` },
  sigma: { s: R`\sigma`, t: 'Odchylenie standardowe szumu pomiarowego',
    what: R`Miara typowej wielkości losowego błędu, który dodano do każdego pomiaru.`,
    how: [R`Do dokładnej wartości modelu dodawana jest liczba losowa o rozkładzie normalnym ze średnią $0$ i odchyleniem standardowym $\sigma$.`],
    why: R`Szum ogranicza jakość dopasowania niezależnie od algorytmu. Im większe $\sigma$, tym wyższy koszt końcowy i tym bardziej oszacowane parametry różnią się od prawdziwych.` },
  cond: { s: R`\kappa(J^{\top}J)`, t: 'Wskaźnik uwarunkowania macierzy układu',
    what: R`Stosunek największej wartości własnej macierzy $J^{\top}J$ do najmniejszej.`,
    how: [R`Oblicz macierz $J^{\top}J$ dla bieżących parametrów.`, R`Wyznacz jej wartości własne i podziel największą przez najmniejszą.`],
    why: R`Duża wartość oznacza, że układ równań jest źle uwarunkowany: małe zaburzenia danych mocno zmieniają rozwiązanie, a dolina funkcji kosztu jest długa i wąska.` },
  digits: { s: R`-\log_{10}|x_k-x^{*}|`, t: 'Liczba poprawnych cyfr',
    what: R`Przybliżona liczba cyfr znaczących, które w bieżącym przybliżeniu zgadzają się z dokładnym rozwiązaniem.`,
    how: [R`Oblicz błąd: wartość bezwzględną różnicy między przybliżeniem a rozwiązaniem.`, R`Weź logarytm dziesiętny błędu i zmień znak. Część całkowita to liczba poprawnych cyfr.`],
    why: R`Najprościej pokazuje rodzaj zbieżności. Gdy liczba poprawnych cyfr podwaja się w każdym kroku, zbieżność jest kwadratowa. Gdy przybywa ich stała liczba, zbieżność jest liniowa.` },
  cconst: { s: R`C`, t: 'Stała w oszacowaniu zbieżności kwadratowej',
    what: R`Liczba, która łączy błąd w kolejnym kroku z kwadratem błędu w kroku bieżącym.`,
    how: [R`Dla metody Newtona w jednym wymiarze wynosi w przybliżeniu $g''/(2g')$, gdzie pochodne są obliczone w pierwiastku.`],
    why: R`Jej wartość nie zmienia charakteru zbieżności, tylko to, jak blisko rozwiązania trzeba być, żeby szybka faza się zaczęła.` },
  gfun: { s: R`g(x)`, t: 'Funkcja, której pierwiastka szukamy',
    what: R`Lewa strona równania $g(x)=0$. Szukamy takiego $x$, dla którego jej wartość jest równa zeru.`,
    how: [R`Podstaw bieżące przybliżenie do wzoru funkcji.`],
    why: R`Wartość funkcji w bieżącym przybliżeniu mówi, jak daleko jesteśmy od spełnienia równania. Minimalizacja też jest takim zadaniem: szukamy pierwiastka pochodnej funkcji kosztu.` },
  gprime: { s: R`g'(x)`, t: 'Pochodna funkcji',
    what: R`Współczynnik kierunkowy stycznej do wykresu funkcji w danym punkcie. Dwa primy oznaczają drugą pochodną.`,
    how: [R`Analitycznie: zróżniczkuj wzór funkcji.`, R`W PyTorch: po wywołaniu <code>g(x).backward()</code> wartość pochodnej jest dostępna w <code>x.grad</code>.`],
    why: R`Metoda Newtona dzieli przez tę wartość. Gdy pochodna jest bliska zeru, styczna jest prawie pozioma i kolejne przybliżenie wypada bardzo daleko.` },
  fprime: { s: R`f'(x),\ f''(x)`, t: 'Pierwsza i druga pochodna funkcji kosztu',
    what: R`Pierwsza pochodna to nachylenie funkcji, druga to jej krzywizna. W jednym wymiarze zastępują gradient i hesjan.`,
    how: [R`Zróżniczkuj wzór funkcji raz albo dwa razy.`],
    why: R`W minimum pierwsza pochodna jest równa zeru, a druga jest dodatnia. Metoda Newtona dla minimalizacji dzieli pierwszą pochodną przez drugą.` },
  nsteps: { s: R`n\_steps`, t: 'Liczba kroków do wykonania',
    what: R`Liczba iteracji, które algorytm ma wykonać.`,
    how: [R`Podajesz go przy wywołaniu funkcji.`, R`Funkcja zwraca o jeden wynik więcej, bo dołącza punkt startowy.`],
    why: R`W przykładach na tej stronie nie stosujemy kryterium zatrzymania: metoda wykonuje dokładnie zadaną liczbę kroków, co ułatwia porównywanie wyników.` },
  ndim: { s: R`n`, t: 'Liczba zmiennych',
    what: R`Wymiar zadania: liczba współrzędnych punktu albo liczba parametrów modelu.`,
    how: [R`Policz niewiadome. W przykładach na płaszczyźnie $n=2$.`],
    why: R`Od wymiaru zależy koszt obliczeń. Gradient ma $n$ składowych, hesjan $n\times n$ elementów, a rozwiązanie układu równań wymaga rzędu $n^3$ działań.` },
  idx: { s: R`i`, t: 'Indeks',
    what: R`Numer kolejnego elementu: współrzędnej punktu albo pomiaru.`,
    how: [R`Współrzędne numerujemy od zera, tak jak elementy tablicy w Pythonie.`],
    why: R`Pozwala zapisać jednym wzorem operację wykonywaną dla wszystkich elementów po kolei.` },
  transpose: { s: R`J^{\top}`, t: 'Transpozycja',
    what: R`Operacja zamieniająca wiersze macierzy z kolumnami. Wektor kolumnowy zamienia w wierszowy.`,
    how: [R`Element z wiersza $i$ i kolumny $j$ przenieś do wiersza $j$ i kolumny $i$.`],
    why: R`Pozwala zapisać iloczyn skalarny dwóch wektorów oraz iloczyny takie jak $J^{\top}J$, w których wymiary macierzy muszą do siebie pasować.` },
  cosh: { s: R`\cosh u,\ \sinh u`, t: 'Funkcje hiperboliczne',
    what: R`Cosinus i sinus hiperboliczny: $\cosh u=\tfrac12(e^{u}+e^{-u})$, $\sinh u=\tfrac12(e^{u}-e^{-u})$.`,
    how: [R`Pochodną cosinusa hiperbolicznego jest sinus hiperboliczny, a pochodną sinusa cosinus.`, R`W PyTorch: <code>torch.cosh</code>, <code>torch.sinh</code>.`],
    why: R`Funkcja kosztu zbudowana z cosinusów hiperbolicznych ma kształt „miski”, ale nie jest kwadratowa: daleko od minimum rośnie wykładniczo. Dzięki temu widać, jak metoda Newtona zachowuje się, gdy model kwadratowy jest tylko przybliżeniem.` },
  ln: { s: R`\ln`, t: 'Logarytm naturalny',
    what: R`Logarytm o podstawie $e$, funkcja odwrotna do funkcji wykładniczej.`,
    how: [R`W PyTorch: <code>torch.log</code>. Operacją odwrotną jest <code>torch.exp</code>.`],
    why: R`W modelu farmakokinetycznym optymalizujemy logarytmy parametrów, a okres półtrwania zawiera $\ln 2$, bo opisuje czas, po którym wielkość malejąca wykładniczo zmniejsza się o połowę.` },
  euler: { s: R`e`, t: 'Liczba Eulera',
    what: R`Stała matematyczna równa w przybliżeniu $2.718$, podstawa logarytmu naturalnego.`,
    how: [R`Wyrażenie $e^{-kt}$ opisuje zanik wykładniczy: w równych odstępach czasu wielkość maleje o ten sam ułamek.`],
    why: R`Procesy wchłaniania i eliminacji leku przebiegają wykładniczo, dlatego model stężenia leku jest zbudowany z dwóch takich składników.` },
  Vmax: { s: R`V_{\max}`, t: 'Szybkość maksymalna reakcji',
    what: R`Parametr równania Michaelisa–Menten: największa szybkość reakcji enzymatycznej, osiągana, gdy enzym jest całkowicie wysycony substratem.`,
    how: [R`Na wykresie jest to poziom, do którego krzywa zbliża się dla dużych stężeń substratu.`, R`Dokładną wartość wyznacza dopasowanie modelu do pomiarów.`],
    why: R`Opisuje wydajność enzymu. W jakobianie pochodna reszty względem tego parametru jest największa dla dużych stężeń, więc to pomiary przy dużych stężeniach decydują o jego oszacowaniu.` },
  Km: { s: R`K_m`, t: 'Stała Michaelisa',
    what: R`Parametr równania Michaelisa–Menten: stężenie substratu, przy którym szybkość reakcji wynosi połowę szybkości maksymalnej.`,
    how: [R`Na wykresie odczytaj stężenie, dla którego krzywa osiąga połowę wysokości $V_{\max}$.`, R`Dokładną wartość wyznacza dopasowanie modelu do pomiarów.`],
    why: R`Opisuje powinowactwo enzymu do substratu: im mniejsza wartość, tym szybciej enzym się wysyca. O jej oszacowaniu decydują pomiary przy małych stężeniach, dlatego jest szczególnie wrażliwa na szum.` },
  subs: { s: R`s`, t: 'Stężenie substratu',
    what: R`Zmienna niezależna w równaniu Michaelisa–Menten: stężenie substancji, na którą działa enzym. Wartości $s_i$ to stężenia, przy których wykonano pomiary.`,
    how: [R`Są to dane wejściowe doświadczenia: sześć stężeń, każde zmierzone dwukrotnie.`],
    why: R`Od rozmieszczenia stężeń zależy, jak dobrze da się wyznaczyć parametry. Pomiary przy małych stężeniach niosą informację o $K_m$, a przy dużych o $V_{\max}$.` },
  vrate: { s: R`v`, t: 'Szybkość reakcji enzymatycznej',
    what: R`Zmienna zależna w równaniu Michaelisa–Menten. Wartości $v_i$ to zmierzone szybkości reakcji.`,
    how: [R`Model: $v(s)=\dfrac{V_{\max}\,s}{K_m+s}$.`, R`Pomiary zawierają szum, więc nie leżą dokładnie na krzywej.`],
    why: R`To dane, do których dopasowujemy model. Różnice między modelem a pomiarami tworzą wektor reszt.` },
  ka: { s: R`k_a`, t: 'Stała szybkości wchłaniania (absorption rate constant)',
    what: R`Parametr modelu farmakokinetycznego: opisuje, jak szybko lek przechodzi z przewodu pokarmowego do krwi. Jednostka: 1/h.`,
    how: [R`Wyznacza się ją przez dopasowanie modelu do pomiarów stężenia.`, R`Optymalizowany jest jej logarytm, a wartość odzyskuje się funkcją wykładniczą.`],
    why: R`Decyduje o początkowej części krzywej: większa wartość oznacza szybsze narastanie stężenia oraz wcześniejsze i wyższe maksimum.` },
  ke: { s: R`k_e`, t: 'Stała szybkości eliminacji (elimination rate constant)',
    what: R`Parametr modelu farmakokinetycznego: opisuje, jak szybko organizm usuwa lek. Jednostka: 1/h.`,
    how: [R`Wyznacza się ją przez dopasowanie modelu do pomiarów stężenia.`, R`Decydują o niej głównie późne pomiary, z fazy, w której stężenie już tylko maleje.`],
    why: R`Decyduje o nachyleniu końcowej części krzywej i bezpośrednio wyznacza okres półtrwania leku: $t_{1/2}=\ln 2/k_e$.` },
  vol: { s: R`V`, t: 'Objętość dystrybucji (volume of distribution)',
    what: R`Parametr modelu farmakokinetycznego: umowna objętość, w której lek musiałby się równomiernie rozprowadzić, aby dać obserwowane stężenie we krwi. Jednostka: litr.`,
    how: [R`Wyznacza się ją przez dopasowanie modelu do pomiarów stężenia.`, R`Z samych stężeń da się wyznaczyć tylko iloraz $V/F$.`],
    why: R`Skaluje całą krzywą w pionie: dwukrotnie większa objętość oznacza dwukrotnie mniejsze stężenia przy tej samej dawce.` },
  VF: { s: R`V/F`, t: 'Pozorna objętość dystrybucji',
    what: R`Iloraz objętości dystrybucji i biodostępności. To jedyna kombinacja tych dwóch wielkości, którą można wyznaczyć z pomiarów stężenia po podaniu doustnym.`,
    how: [R`Przyjmujemy $F=1$, więc oszacowana wartość $V$ jest w rzeczywistości ilorazem $V/F$.`],
    why: R`To przykład parametrów nieidentyfikowalnych (non-identifiable): we wzorze występują tylko razem, więc żadne dane nie pozwolą ich rozdzielić.` },
  bioav: { s: R`F`, t: 'Biodostępność (bioavailability)',
    what: R`Ułamek podanej dawki, który dociera do krążenia ogólnego w niezmienionej postaci. Przyjmuje wartości od $0$ do $1$.`,
    how: [R`Wyznaczenie jej wymaga porównania z podaniem dożylnym, którego w tych danych nie ma.`, R`Tutaj przyjmujemy $F=1$.`],
    why: R`Występuje we wzorze zawsze razem z objętością dystrybucji, dlatego nie da się jej oszacować osobno.` },
  dose: { s: R`D`, t: 'Dawka leku',
    what: R`Całkowita ilość podanego leku w miligramach.`,
    how: [R`Pomnóż dawkę na kilogram masy ciała przez masę ciała pacjenta.`],
    why: R`Jest znaną stałą w modelu, a nie parametrem do oszacowania. Stężenie leku jest do niej wprost proporcjonalne.` },
  conc: { s: R`C(t)`, t: 'Stężenie leku w surowicy',
    what: R`Wartość modelu farmakokinetycznego: przewidywane stężenie leku po czasie $t$ od podania. Jednostka: mg/L.`,
    how: [R`Odtwórz parametry z ich logarytmów.`, R`Podstaw je razem z dawką i czasem do wzoru modelu jednokompartmentowego.`],
    why: R`To wielkość, którą porównujemy z pomiarami. Jej przebieg decyduje o tym, czy lek działa skutecznie i bezpiecznie.` },
  cmeas: { s: R`c_i`, t: 'Zmierzone stężenie leku',
    what: R`Wynik pomiaru stężenia leku w surowicy pacjenta w chwili $t_i$.`,
    how: [R`Są to dane kliniczne: jedenaście pomiarów w ciągu doby dla każdego pacjenta.`],
    why: R`Do tych wartości dopasowujemy model. Różnica między modelem a pomiarem to reszta.` },
  time: { s: R`t`, t: 'Czas od podania leku',
    what: R`Zmienna niezależna modelu farmakokinetycznego, w godzinach. Wartości $t_i$ to chwile, w których pobrano próbki.`,
    how: [R`Są to dane doświadczenia.`],
    why: R`Gęste pomiary na początku opisują wchłanianie, a rzadkie późne pomiary opisują eliminację.` },
  thalf: { s: R`t_{1/2}`, t: 'Biologiczny okres półtrwania (half-life)',
    what: R`Czas, po którym stężenie leku w fazie eliminacji maleje o połowę.`,
    how: [R`Odtwórz stałą eliminacji z jej logarytmu.`, R`Oblicz $t_{1/2}=\dfrac{\ln 2}{k_e}$.`],
    why: R`To wielkość o bezpośrednim znaczeniu klinicznym: od niej zależy, jak często trzeba podawać lek. Jest końcowym wynikiem obliczeń i pokazuje, po co w ogóle dopasowujemy model.` },
  tmax: { s: R`t_{\max}`, t: 'Czas osiągnięcia stężenia maksymalnego',
    what: R`Chwila, w której stężenie leku według modelu jest największe.`,
    how: [R`Oblicz $t_{\max}=\dfrac{\ln(k_a/k_e)}{k_a-k_e}$.`],
    why: R`Mówi, kiedy lek działa najsilniej. Zależy od obu stałych szybkości, więc reaguje na zmianę każdej z nich.` },
  Cmax: { s: R`C_{\max}`, t: 'Stężenie maksymalne',
    what: R`Największe stężenie leku przewidywane przez model.`,
    how: [R`Wyznacz czas osiągnięcia maksimum.`, R`Podstaw go do wzoru modelu.`],
    why: R`Zbyt wysokie stężenie maksymalne może być toksyczne. Dla teofiliny różnica między stężeniem skutecznym a toksycznym jest niewielka, dlatego dokładny model ma znaczenie.` },
};
/* the same symbol can mean something else on some pages */
const GLOSS_CTX = { newton1: { xcomp: 'xk', conc: 'cconst' }, newton: { conc: 'cconst' } };

/* ---------- 3. the dialog ---------- */
const Gloss = (() => {
  let dlg, body, back, stack = [], ctx = [];
  const resolve = key => { for (const c of ctx) if (GLOSS_CTX[c] && GLOSS_CTX[c][key]) return GLOSS_CTX[c][key]; return key; };
  function build() {
    dlg = el('dialog', 'gloss'); dlg.setAttribute('aria-labelledby', 'gloss-title');
    dlg.innerHTML = `<div class="gl-bar"><button type="button" class="btn sm link gl-back">← Poprzednie hasło</button><button type="button" class="btn sm gl-index">Wszystkie hasła</button><button type="button" class="btn sm pri gl-close">Zamknij</button></div><div class="gl-body"></div>`;
    body = dlg.querySelector('.gl-body'); back = dlg.querySelector('.gl-back');
    dlg.querySelector('.gl-close').addEventListener('click', () => dlg.close());
    dlg.querySelector('.gl-index').addEventListener('click', () => show({ key: '__index' }, true));
    back.addEventListener('click', () => { stack.pop(); show(stack.pop(), true); });   // entries: { key, mods, raw }
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }
  function show(entry, push) {
    const key = entry.key;
    if (push) stack.push(entry);
    back.hidden = stack.length < 2;
    if (key === '__index' || key.startsWith('__pick:')) {
      const all = key === '__index';
      const items = all ? Object.entries(GLOSS).sort((a, b) => a[1].t.localeCompare(b[1].t, 'pl')) : key.slice(7).split(',').map(k => [k, GLOSS[k]]);
      body.innerHTML = (all ? `<h2 id="gloss-title">Słownik symboli i pojęć</h2><p class="note">Wybierz hasło. Na każdej stronie możesz też kliknąć dowolny symbol we wzorze, w tabeli lub na wykresie.</p>`
        : `<h2 id="gloss-title">Symbole w tym wzorze</h2><p class="note">Wybierz symbol, który chcesz objaśnić.</p>`) + `<div class="gl-list">${items.map(([k, g]) => `<button type="button" class="gl-item" data-key="${k}"><span>${K(g.s)}</span>${g.t}</button>`).join('')}</div>`;
      body.querySelectorAll('.gl-item').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); show({ key: b.dataset.key }, true); }));
    } else {
      const g = GLOSS[key];
      let mods = (entry.mods || '').split('.').filter(m => G_NOTE[m]);
      if (key === 'xk') mods = mods.map(m => (m === 'subi' ? 'subk' : m));   // on the root-finding pages the subscript counts iterations
      mods = [...new Set(mods)];
      body.innerHTML = `<div class="gl-sym">${K(entry.raw || g.s, true)}</div><h2 id="gloss-title">${g.t}</h2>
        <section><h3>Co to jest?</h3>${md(g.what)}</section>
        ${mods.length ? `<section><h3>Indeksy w tym zapisie</h3>${mods.map(m => md(G_NOTE[m])).join('')}</section>` : ''}
        <section><h3>Jak się to oblicza?</h3><ol>${g.how.map(h => `<li>${mdi(h)}</li>`).join('')}</ol></section>
        <section><h3>Dlaczego to ważne?</h3>${md(g.why)}</section>
        <p class="note">Symbole w tym objaśnieniu też są klikalne.</p>`;
    }
    body.scrollTop = 0;
  }
  function context(from) { ctx = []; for (let n = from; n; n = n.parentElement && n.parentElement.closest('[data-ctx]')) { if (n.dataset && n.dataset.ctx) ctx.push(n.dataset.ctx); if (!n.parentElement) break; } }
  function open(key, from) {
    if (!dlg) build();
    if (!dlg.open) { stack = []; context(from); }
    key = key === '__index' ? key : resolve(key);
    if (key !== '__index' && !GLOSS[key]) return;
    const ds = (from && from.dataset) || {};
    show({ key, mods: ds.m || '', raw: ds.r != null ? G_RAW[+ds.r] : null }, true);
    if (!dlg.open) dlg.showModal();
  }
  function pick(keys, from) {   // several symbols to choose from
    if (!dlg) build();
    if (!dlg.open) { stack = []; context(from); }
    const ks = [...new Set(keys.map(resolve))].filter(k => GLOSS[k]); if (!ks.length) return;
    if (ks.length === 1) { open(ks[0], from); return; }
    show({ key: '__pick:' + ks.join(',') }, true);
    if (!dlg.open) dlg.showModal();
  }
  document.addEventListener('click', e => {
    const t = e.target; if (!(t instanceof Element)) return;
    if (t.closest('button, a, input, select, summary')) return;
    let n = t.closest('[data-g]');
    if (!n) {   // a near miss inside a formula: take the closest symbol, or offer the list of symbols of this formula
      const fm = t.closest('.katex, .dm');
      if (fm) {
        const tagged = [...fm.querySelectorAll('[data-g]')]; let best = null, bd = 1e9;
        for (const s of tagged) { const r = s.getBoundingClientRect(), dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom), d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = s; } }
        if (best && bd <= 18) n = best;
        else if (tagged.length) { e.preventDefault(); pick([...new Set(tagged.map(s => s.dataset.g))], fm); return; }
      }
    }
    if (!n) { const host = t.closest('dt, th, .stats > div, .ctl > label, .ctl-l, .plot-t, .ax, .legend > span'); if (host) n = host.matches('[data-g]') ? host : host.querySelector('[data-g]'); }
    if (!n || !n.dataset.g) return;
    e.preventDefault(); open(n.dataset.g, n);
  });
  return { open };
})();
