/* =====================================================================
   Self-check quizzes (one per topic), the "compare the methods" page and the "find the bug" page
   ===================================================================== */

/* ---------- a question with immediate feedback (multiple choice or a number) ----------
   q: { q, opts[], ok, why }  or  { q, num, tol, why };  st: { t: tries, ok, shown } kept by the caller */
function Question(q, n, st, onChange, label = 'Pytanie') {
  const c = el('article', 'card qcard');
  c.innerHTML = `<h3><i>${label} ${n}</i></h3><div class="qtext">${md(q.q)}</div><div class="qbody"></div><div class="qfb" role="status"></div>`;
  const body = c.querySelector('.qbody'), fb = c.querySelector('.qfb');
  const solved = () => { fb.className = 'qfb ok'; fb.innerHTML = `<p><strong>${st.shown ? 'Rozwiązanie.' : st.t === 1 ? 'Dobrze, za pierwszym razem.' : 'Dobrze.'}</strong></p>` + md(q.why); };
  if (q.opts) {
    const btns = q.opts.map((o, i) => {
      const b = noTab(el('button', 'qopt', `<i>${'ABCD'[i]}</i><span>${mdi(o)}</span>`)); b.type = 'button';
      b.addEventListener('click', () => {
        if (st.ok) return;
        st.t = (st.t || 0) + 1;
        if (i === q.ok) { st.ok = true; paint(); solved(); } else { (st.bad = st.bad || []).push(i); paint(); fb.className = 'qfb no'; fb.innerHTML = '<p><strong>To nie ta odpowiedź.</strong> Zastanów się jeszcze raz i wybierz inną.</p>'; }
        onChange();
      });
      body.append(b); return b;
    });
    const paint = () => btns.forEach((b, i) => { b.classList.toggle('right', !!st.ok && i === q.ok); b.classList.toggle('wrong', (st.bad || []).includes(i)); b.disabled = !!st.ok || (st.bad || []).includes(i); });
    paint(); if (st.ok) solved();
  } else {
    const id = 'f' + (++UID), f = el('form', 'qnum');
    f.innerHTML = `<label for="${id}">Twój wynik:</label><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false"><button class="btn sm pri" type="submit">Sprawdź</button><button class="btn sm link" type="button" hidden>Pokaż rozwiązanie</button>`;
    const inp = f.querySelector('input'), show = f.querySelector('button[type=button]');
    const lock = () => { inp.disabled = true; f.querySelector('button[type=submit]').disabled = true; show.hidden = true; };
    f.addEventListener('submit', e => {
      e.preventDefault(); if (st.ok || st.shown) return;
      const v = parseFloat(String(inp.value).replace(',', '.'));
      if (!Number.isFinite(v)) { fb.className = 'qfb no'; fb.innerHTML = '<p>Wpisz liczbę.</p>'; return; }
      st.t = (st.t || 0) + 1;
      if (Math.abs(v - q.num) <= (q.tol || 5e-3) * Math.max(1, Math.abs(q.num))) { st.ok = true; st.v = String(inp.value).trim().slice(0, 24); lock(); solved(); }
      else { fb.className = 'qfb no'; fb.innerHTML = '<p><strong>To jeszcze nie ten wynik.</strong> Sprawdź znaki i kolejność działań.</p>'; if (st.t >= 2) show.hidden = false; }
      onChange();
    });
    show.addEventListener('click', () => { st.shown = true; lock(); solved(); onChange(); });
    body.append(f);
    if (st.ok || st.shown) { if (st.v) inp.value = st.v; lock(); solved(); } else if ((st.t || 0) >= 2) show.hidden = false;
  }
  return c;
}

const QUIZ = {
  gradient: [
    { q: R`Dana jest funkcja $f(\mathbf{x})=x_0^2+3\,x_1$ i punkt $\mathbf{x}=(2,\ 1)$. Oblicz różnicą centralną z krokiem $h=0.5$ przybliżenie pochodnej $\partial f/\partial x_0$.`, num: 4, tol: 1e-3,
      why: R`Przesuwamy tylko $x_0$: $f(2.5,\ 1)=6.25+3=9.25$ oraz $f(1.5,\ 1)=2.25+3=5.25$. Iloraz: $(9.25-5.25)/(2\cdot0.5)=4$. Wynik jest dokładny, bo funkcja jest kwadratowa względem $x_0$.` },
    { q: R`Jak zmienia się błąd obcięcia różnic centralnych, gdy krok $h$ maleje dziesięciokrotnie?`, opts: ['Maleje dziesięciokrotnie.', 'Maleje stukrotnie.', 'Nie zmienia się.', 'Rośnie dziesięciokrotnie.'], ok: 1,
      why: R`Błąd obcięcia różnic centralnych jest proporcjonalny do $h^2$, więc dziesięciokrotnie mniejszy krok daje stukrotnie mniejszy błąd. Dla różnic w przód błąd jest proporcjonalny do $h$.` },
    { q: R`Dlaczego dla bardzo małego kroku, na przykład $h=10^{-13}$, gradient numeryczny staje się niedokładny?`, opts: ['Bo rośnie błąd obcięcia szeregu Taylora.', 'Bo odejmujemy dwie prawie równe liczby, a wynik dzielimy przez bardzo małą liczbę.', 'Bo funkcja przestaje być różniczkowalna.', 'Bo krok jest mniejszy od epsilonu maszynowego.'], ok: 1,
      why: R`Wartości funkcji w obu punktach różnią się dopiero na ostatnich cyfrach znaczących. Odejmowanie je znosi, a dzielenie przez $2h$ wzmacnia błąd zaokrągleń do rzędu $\varepsilon/h$. Błąd obcięcia jest wtedy pomijalny.` },
    { q: R`Ile obliczeń wartości funkcji wymaga gradient numeryczny metodą różnic centralnych dla funkcji $n$ zmiennych?`, opts: ['$n$', '$n+1$', '$2n$', '$n^2$'], ok: 2,
      why: R`Dla każdej z $n$ współrzędnych obliczamy funkcję w dwóch punktach: przesuniętym o $+h$ i o $-h$. Różnice w przód wymagają $n+1$ obliczeń, ale są mniej dokładne.` },
    { q: R`Ile wynosi gradient gładkiej funkcji w punkcie, w którym osiąga ona minimum?`, opts: ['Jest wektorem zerowym.', 'Jest prostopadły do poziomicy i ma długość $1$.', 'Jest równy wartości funkcji w tym punkcie.', 'Wskazuje kierunek najszybszego spadku.'], ok: 0,
      why: R`W minimum funkcja nie rośnie ani nie maleje w żadnym kierunku, więc wszystkie pochodne cząstkowe są równe zeru. Warunek $\nabla f=0$ spełniają też maksima i punkty siodłowe.` },
  ],
  spadek: [
    { q: R`Dana jest funkcja $f(\mathbf{x})=\tfrac12\big(x_0^2+4\,x_1^2\big)$, punkt $\mathbf{x}^{(0)}=(2,\ 1)$ i współczynnik uczenia $\alpha=0.1$. Oblicz współrzędną $x_1$ punktu po jednym kroku metody spadku gradientu.`, num: 0.6, tol: 1e-3,
      why: R`Gradient: $\nabla f=(x_0,\ 4x_1)=(2,\ 4)$. Krok: $-\alpha\nabla f=(-0.2,\ -0.4)$. Nowy punkt: $(1.8,\ 0.6)$, więc $x_1=0.6$.` },
    { q: R`Dla funkcji kwadratowej o krzywiznach $m=1$ i $L=4$ metoda spadku gradientu jest zbieżna, gdy współczynnik uczenia spełnia warunek:`, opts: [R`$\alpha<0.25$`, R`$\alpha<0.5$`, R`$\alpha<1$`, R`$\alpha<2$`], ok: 1,
      why: R`Granica stabilności to $2/L=2/4=0.5$. Decyduje największa krzywizna, bo w tym kierunku mnożnik błędu $1-\alpha L$ najszybciej przekracza $-1$.` },
    { q: R`Dla funkcji z $L=5$ ustawiono $\alpha=0.38$. Mnożnik błędu w kierunku stromym wynosi $1-\alpha L=-0.9$. Co zobaczysz na wykresie trajektorii?`, opts: ['Gładkie zejście do minimum bez przeskoków.', 'Przeskakiwanie na przemian na obie strony doliny, z coraz mniejszym wychyleniem.', 'Przeskakiwanie na obie strony doliny, z coraz większym wychyleniem.', 'Punkt, który nie rusza się z miejsca.'], ok: 1,
      why: R`Ujemny mnożnik oznacza zmianę znaku błędu w każdym kroku, czyli przeskok na drugą stronę doliny. Ponieważ $|-0.9|<1$, wychylenia maleją i metoda jest zbieżna.` },
    { q: R`Co jest główną przyczyną bardzo wolnej zbieżności metody spadku gradientu w wąskiej dolinie?`, opts: ['Zbyt duża liczba zmiennych.', 'Duży wskaźnik uwarunkowania, czyli duża różnica krzywizn w różnych kierunkach.', 'Zbyt mała wartość funkcji kosztu w punkcie startowym.', 'Błędy zaokrągleń w gradiencie.'], ok: 1,
      why: R`Współczynnik uczenia musi być mały ze względu na kierunek stromy ($\alpha<2/L$), a wtedy w kierunku łagodnym błąd maleje w jednym kroku tylko o czynnik $1-\alpha m$, bliski jedynce. Liczba kroków rośnie proporcjonalnie do $\kappa=L/m$.` },
    { q: R`Oblicz optymalny współczynnik uczenia $\alpha^{*}$ dla funkcji kwadratowej o krzywiznach $m=1$ i $L=5$.`, num: 1 / 3, tol: 0.02,
      why: R`$\alpha^{*}=\dfrac{2}{m+L}=\dfrac{2}{6}\approx0.333$. Dla tej wartości oba mnożniki błędu mają ten sam moduł $\tfrac23$.` },
  ],
  moment: [
    { q: R`Bufor prędkości ma wartość $\mathbf{v}=(2,\ -1)$, bieżący gradient to $\mathbf{g}=(1,\ 3)$, a $\beta=0.5$. Oblicz pierwszą składową nowej prędkości.`, num: 2, tol: 1e-3,
      why: R`Nowa prędkość to $\beta\,\mathbf{v}+\mathbf{g}=0.5\cdot(2,\ -1)+(1,\ 3)=(2,\ 2.5)$. Pierwsza składowa wynosi $2$.` },
    { q: R`Czym staje się metoda z momentem dla $\beta=0$?`, opts: ['Metodą Newtona.', 'Zwykłą metodą spadku gradientu.', 'Metodą, która nie wykonuje żadnego kroku.', 'Poszukiwaniem w kierunku.'], ok: 1,
      why: R`Dla $\beta=0$ nowa prędkość jest równa bieżącemu gradientowi, więc krok to $-\alpha\nabla f$, dokładnie jak w metodzie spadku gradientu.` },
    { q: R`Gradient przez wiele kroków ma ten sam kierunek i zwrot. Ile razy dłuższy od kroku zwykłej metody spadku gradientu staje się krok metody z momentem dla $\beta=0.9$?`, opts: ['$1.9$ razy', '$9$ razy', '$10$ razy', '$90$ razy'], ok: 2,
      why: R`Prędkość dąży do $\mathbf{g}/(1-\beta)$. Dla $\beta=0.9$ jest to $10\,\mathbf{g}$, więc krok wydłuża się dziesięciokrotnie.` },
    { q: R`Co się dzieje, gdy współczynnik momentu jest zbyt bliski $1$?`, opts: ['Metoda staje się identyczna ze spadkiem gradientu.', 'Punkt mija minimum i długo wokół niego oscyluje.', 'Prędkość maleje do zera i metoda się zatrzymuje.', 'Znika potrzeba doboru współczynnika uczenia.'], ok: 1,
      why: R`Długa pamięć oznacza dużą bezwładność: punkt przelatuje przez minimum, zawraca i powtarza to wiele razy. Koszt przestaje maleć monotonicznie, a liczba kroków rośnie.` },
    { q: R`Która reguła aktualizacji jest zgodna z konwencją używaną przez <code>torch.optim.SGD</code>?`, opts: [R`$\mathbf{v}\leftarrow\beta\mathbf{v}+\mathbf{g}$, potem $\mathbf{x}\leftarrow\mathbf{x}-\alpha\mathbf{v}$`, R`$\mathbf{v}\leftarrow\beta\mathbf{v}+(1-\beta)\,\mathbf{g}$, potem $\mathbf{x}\leftarrow\mathbf{x}-\alpha\mathbf{v}$`, R`$\mathbf{x}\leftarrow\mathbf{x}-\alpha\mathbf{v}$, potem $\mathbf{v}\leftarrow\beta\mathbf{v}+\mathbf{g}$`, R`$\mathbf{v}\leftarrow\mathbf{g}$, potem $\mathbf{x}\leftarrow\mathbf{x}-\alpha\beta\mathbf{v}$`], ok: 0,
      why: R`Najpierw aktualizujemy prędkość, bez czynnika $(1-\beta)$ przy gradiencie, a dopiero potem punkt. Bufor ma początkowo wartość zerową.` },
  ],
  armijo: [
    { q: R`Co robi metoda z nawrotami po próbie, która nie spełniła warunku Armijo?`, opts: [R`Mnoży długość kroku przez $\rho<1$ i próbuje ponownie.`, 'Zmienia kierunek kroku na przeciwny.', 'Zwiększa długość kroku dwukrotnie.', 'Kończy obliczenia z błędem.'], ok: 0,
      why: R`Kierunek pozostaje ten sam. Zmienia się tylko długość kroku: $\alpha\leftarrow\rho\,\alpha$, aż krok zapewni dostateczny spadek kosztu.` },
    { q: R`W bieżącym punkcie $f(\mathbf{x})=10$, a $\nabla f(\mathbf{x})^{\top}\mathbf{p}=-20$. Dla $c_1=0.1$ oblicz granicę Armijo dla próby o długości $\alpha=0.5$.`, num: 9, tol: 1e-3,
      why: R`Granica to $f+c_1\,\alpha\,\nabla f^{\top}\mathbf{p}=10+0.1\cdot0.5\cdot(-20)=10-1=9$. Krok zostanie zaakceptowany, jeśli koszt po kroku nie przekroczy $9$.` },
    { q: R`Granica Armijo dla badanej próby wynosi $9$, a koszt po wykonaniu kroku wyniósłby $9.5$. Jaka jest decyzja?`, opts: ['Krok zostaje zaakceptowany, bo koszt zmalał z $10$.', 'Krok zostaje odrzucony i skrócony.', 'Krok zostaje wydłużony.', 'Obliczenia się kończą.'], ok: 1,
      why: R`Koszt zmalał, ale za mało: $9.5>9$. Warunek Armijo wymaga spadku proporcjonalnego do długości kroku, a nie jakiegokolwiek spadku.` },
    { q: R`Które zdanie o poszukiwaniu w kierunku jest prawdziwe?`, opts: ['Dobiera długość kroku, ale nie zmienia jego kierunku, więc nie usuwa oscylacji w wąskiej dolinie.', 'Zmienia kierunek kroku tak, by wskazywał minimum.', 'Wymaga znajomości największej krzywizny funkcji.', 'Zawsze znajduje najlepszą możliwą długość kroku.'], ok: 0,
      why: R`Kierunek to nadal antygradient, więc trajektoria wciąż przeskakuje w poprzek doliny. Zaletą jest to, że nie trzeba znać bezpiecznej wartości $\alpha$, a wadą dodatkowe obliczenia funkcji.` },
    { q: R`Jak zmiana współczynnika skracania z $\rho=0.8$ na $\rho=0.2$ wpływa na jedną iterację?`, opts: ['Prób jest mniej, ale zaakceptowany krok bywa znacznie krótszy, niż mógłby być.', 'Prób jest więcej, a zaakceptowany krok jest dłuższy.', 'Nic się nie zmienia, bo liczy się tylko stała $c_1$.', 'Warunek Armijo przestaje być sprawdzany.'], ok: 0,
      why: R`Agresywne skracanie szybko dochodzi do akceptowalnej długości, ale przeskakuje nad dłuższymi krokami, które też byłyby dobre. Ostrożne skracanie znajduje dłuższy krok kosztem większej liczby prób.` },
  ],
  newton: [
    { q: R`Szukamy pierwiastka równania $g(x)=x^2-9=0$ metodą Newtona, startując z $x_0=5$. Oblicz $x_1$.`, num: 3.4, tol: 1e-3,
      why: R`$g(5)=16$, $g'(5)=2\cdot5=10$, więc $x_1=5-16/10=3.4$. Dokładny pierwiastek to $3$.` },
    { q: R`Co w praktyce oznacza zbieżność kwadratowa?`, opts: ['Błąd maleje w każdym kroku o połowę.', 'Liczba poprawnych cyfr mniej więcej podwaja się w każdym kroku.', 'Metoda potrzebuje liczby kroków równej kwadratowi liczby zmiennych.', 'Metoda działa tylko dla funkcji kwadratowych.'], ok: 1,
      why: R`Nowy błąd jest proporcjonalny do kwadratu poprzedniego: z błędu rzędu $10^{-3}$ robi się $10^{-6}$, potem $10^{-12}$. Dotyczy to otoczenia rozwiązania.` },
    { q: R`Ile kroków potrzebuje metoda Newtona, aby znaleźć minimum funkcji kwadratowej?`, opts: ['Jeden, niezależnie od wskaźnika uwarunkowania.', 'Tyle, ile wynosi wskaźnik uwarunkowania.', 'Dwa razy mniej niż metoda spadku gradientu.', 'Nieskończenie wiele.'], ok: 0,
      why: R`Model kwadratowy jest wtedy dokładny, więc przejście do jego minimum jest przejściem do minimum funkcji. Hesjan kompensuje różnice krzywizn.` },
    { q: R`Co może się zdarzyć, gdy hesjan w bieżącym punkcie nie jest dodatnio określony?`, opts: ['Metoda zawsze się zatrzymuje.', 'Krok może prowadzić do punktu siodłowego albo w kierunku wzrostu funkcji.', 'Metoda automatycznie przechodzi w spadek gradientu.', 'Nic: określoność hesjanu nie ma znaczenia.'], ok: 1,
      why: R`Metoda Newtona szuka punktu, w którym $\nabla f=0$, i nie odróżnia minimum od punktu siodłowego ani maksimum. Model kwadratowy bez minimum nie daje sensownego kierunku spadku.` },
    { q: R`Co najbardziej ogranicza stosowanie metody Newtona w zadaniach o bardzo wielu zmiennych?`, opts: ['Konieczność doboru współczynnika uczenia.', R`Koszt wyznaczenia hesjanu o wymiarze $n\times n$ i rozwiązania układu równań.`, 'Wolna, liniowa zbieżność.', 'Brak możliwości obliczenia gradientu.'], ok: 1,
      why: R`Hesjan ma $n^2$ elementów, a rozwiązanie układu równań wymaga rzędu $n^3$ działań. Dla milionów parametrów jest to niewykonalne.` },
  ],
  'gauss-newton': [
    { q: R`Czym metoda Gaussa–Newtona zastępuje hesjan funkcji kosztu?`, opts: [R`Macierzą $J^{\top}J$.`, 'Macierzą jednostkową.', R`Wektorem $J^{\top}\mathbf{r}$.`, 'Hesjanem obliczonym różnicami skończonymi.'], ok: 0,
      why: R`Pełny hesjan to $J^{\top}J$ plus składnik z drugimi pochodnymi reszt. Ten składnik jest mały, gdy reszty są małe, więc się go pomija.` },
    { q: R`Model ma $2$ parametry, a pomiarów jest $12$. Jaki wymiar ma jakobian reszt?`, opts: [R`$2\times2$`, R`$2\times12$`, R`$12\times2$`, R`$12\times12$`], ok: 2,
      why: R`Jakobian ma jeden wiersz dla każdego pomiaru i jedną kolumnę dla każdego parametru. Macierz $J^{\top}J$ ma wtedy wymiar $2\times2$.` },
    { q: R`Wektor reszt wynosi $\mathbf{r}=(1,\ -2,\ 2)$. Oblicz koszt $\tfrac12\lVert\mathbf{r}\rVert^2$.`, num: 4.5, tol: 1e-3,
      why: R`Suma kwadratów: $1+4+4=9$. Połowa tej sumy to $4.5$.` },
    { q: R`Dlaczego dla zaszumionych pomiarów koszt po dopasowaniu nie spada do zera?`, opts: ['Bo algorytm zatrzymał się za wcześnie.', 'Bo żadna gładka krzywa nie przechodzi przez wszystkie zaszumione punkty.', 'Bo jakobian jest źle uwarunkowany.', 'Bo punkt startowy był zbyt daleko.'], ok: 1,
      why: R`Model odtwarza zależność, a nie szum. Reszty pozostają na poziomie porównywalnym z odchyleniem standardowym szumu i to jest wynik poprawny.` },
    { q: R`Co daje tłumienie w metodzie Levenberga–Marquardta, czyli $\lambda>0$?`, opts: ['Krótszy i bezpieczniejszy krok, obrócony w stronę antygradientu.', 'Dłuższy krok i szybszą zbieżność z każdego punktu.', 'Dokładny hesjan zamiast przybliżenia.', 'Mniejszy szum w danych.'], ok: 0,
      why: R`Powiększenie przekątnej macierzy układu skraca krok. Metoda staje się wolniejsza, ale nie wyrzuca parametrów poza sensowny zakres, gdy punkt startowy jest daleko od rozwiązania.` },
  ],
  pk: [
    { q: R`Stała szybkości eliminacji wynosi $k_e=0.1$ 1/h. Oblicz okres półtrwania $t_{1/2}$ w godzinach.`, num: Math.log(2) / 0.1, tol: 0.01,
      why: R`$t_{1/2}=\dfrac{\ln 2}{k_e}=\dfrac{0.693}{0.1}\approx6.93$ h.` },
    { q: R`Dlaczego zmiennymi optymalizacji są logarytmy parametrów, a nie same parametry?`, opts: ['Parametry pozostają dodatnie, a zadanie jest lepiej uwarunkowane.', 'Logarytm przyspiesza obliczenie funkcji wykładniczej.', 'Dzięki temu model staje się liniowy.', 'Bez logarytmów nie da się obliczyć jakobianu.'], ok: 0,
      why: R`Funkcja wykładnicza zawsze daje wartość dodatnią, więc żaden krok nie zrobi ze stałej szybkości liczby ujemnej. Logarytmy sprowadzają też parametry o różnych rzędach wielkości do podobnej skali.` },
    { q: R`Który parametr decyduje o nachyleniu końcowego, opadającego odcinka krzywej stężenia?`, opts: [R`Stała szybkości wchłaniania $k_a$.`, R`Stała szybkości eliminacji $k_e$.`, R`Objętość dystrybucji $V$.`, R`Dawka $D$.`], ok: 1,
      why: R`Po zakończeniu wchłaniania stężenie maleje jak $e^{-k_e t}$. Objętość i dawka skalują krzywą w pionie, a $k_a$ wpływa na jej początek.` },
    { q: R`Dlaczego z pomiarów stężenia po podaniu doustnym można wyznaczyć tylko iloraz $V/F$?`, opts: ['Bo oba parametry występują we wzorze wyłącznie razem.', 'Bo objętość dystrybucji jest zawsze równa $1$.', 'Bo biodostępność zależy od czasu.', 'Bo pomiarów jest za mało.'], ok: 0,
      why: R`Takie parametry nazywamy nieidentyfikowalnymi: każda para o tym samym ilorazie daje identyczną krzywą, więc żadne dane tego typu ich nie rozdzielą.` },
    { q: R`Dla części pacjentów jedna z trzech metod kończy z kosztem wielokrotnie większym od pozostałych. Która i dlaczego?`, opts: ['Metoda Newtona, bo z dala od minimum hesjan nie musi być dodatnio określony.', 'Metoda Gaussa–Newtona, bo pomija część hesjanu.', 'Metoda spadku gradientu, bo ma za mały współczynnik uczenia.', 'Wszystkie trzy, bo dane zawierają szum.'], ok: 0,
      why: R`Krok Newtona może wtedy prowadzić do obszaru, w którym funkcja kosztu jest niemal płaska i gradient zanika. Macierz $J^{\top}J$ jest zawsze dodatnio półokreślona, dlatego metoda Gaussa–Newtona jest tu bezpieczniejsza.` },
  ],
};

function QuizPage(id) {
  const qs = QUIZ[id], key = 'q:' + id, root = el('div', 'quiz-page');
  let st = Store.get(key, null); if (!st || !Array.isArray(st.s) || st.s.length !== qs.length) st = { s: qs.map(() => ({})) };
  const head = el('div', 'card qhead'), list = el('div', 'qlist');
  const score = () => {
    const first = st.s.filter(a => a.ok && a.t === 1).length, done = st.s.filter(a => a.ok || a.shown).length;
    head.querySelector('.qscore').innerHTML = `Poprawnie za pierwszym razem: <b>${first} z ${qs.length}</b> &nbsp;|&nbsp; rozwiązane: <b>${done} z ${qs.length}</b>`;
  };
  const save = () => { Store.set(key, { s: st.s, n: qs.length }); score(); };
  const render = () => { list.replaceChildren(...qs.map((q, i) => Question(q, i + 1, st.s[i], save))); score(); };
  head.innerHTML = `<div><h3 class="card-h">Sprawdź się</h3><p class="qscore"></p><p class="note">Odpowiedź sprawdzana jest od razu. Do wyniku liczą się odpowiedzi poprawne za pierwszym razem, ale każde pytanie możesz poprawiać do skutku.</p></div>`;
  head.append(Btn('Zacznij od nowa', 'sm', () => { st = { s: qs.map(() => ({})) }; Store.set(key, { s: st.s, n: qs.length }); render(); }));
  root.append(head, list); render();
  return { el: root };
}

/* ---------- compare the methods on one function ---------- */
function ComparePage() {
  let aS, bS;
  const RANGE = { valley: [0.0002, 0.04, 0.0002, 0.0198], bowl: [0.005, 0.8, 0.005, 0.1], cosh: [0.01, 1, 0.01, 0.1], twin: [0.005, 0.3, 0.005, 0.05] };
  const need = t => `<span class="wrap">${t}</span>`;
  const wrap = el('div');
  wrap.append(el('div', 'prose', md(R`Wszystkie cztery metody startują z tego samego punktu i minimalizują tę samą funkcję. Metoda spadku gradientu i metoda z momentem używają wspólnego współczynnika uczenia $\alpha$; poszukiwanie w kierunku dobiera długość kroku samo, a metoda Newtona nie ma współczynnika uczenia. Porównuj liczbę kroków, ale też to, czego każda metoda potrzebuje w jednym kroku.`)));
  const lab = TrajLab({
    fn: 'valley', fns: ['valley', 'bowl', 'cosh', 'twin'], speed: 120, maxSteps: 1000, mid: 'porownanie',
    live: () => ({ alpha: R`spadek gradientu i moment: $\alpha=${tn(aS.value, 4)}$`, beta: R`$\beta=${tn(bS.value, 4)}$` }),
    controls(api) {
      aS = Slider({ label: R`Współczynnik uczenia $\alpha$ (spadek gradientu i moment)`, aria: 'współczynnik uczenia alfa', min: 0.0002, max: 0.04, step: 0.0002, value: 0.0198 });
      bS = Slider({ label: R`Współczynnik momentu $\beta$`, aria: 'współczynnik momentu beta', min: 0, max: 0.99, step: 0.001, value: 0.669 });
      aS.oninput = bS.oninput = () => api.reset();
      return [aS, bS];
    },
    onFn(fn) { const r = RANGE[fn.id]; aS.setRange(r[0], r[1], r[2], r[3]); },
    methods: () => [
      { name: 'Spadek gradientu', color: C.green, needs: need('gradient'), step: (st, fn) => ({ x: M.gdStep(fn, st.x, aS.value) }) },
      { name: 'Metoda z momentem', color: C.red, dash: [7, 4], shape: 'sq', needs: need('gradient i bufor prędkości'), init: x => ({ x: [...x], v: [0, 0] }), step: (st, fn) => M.hbStep(fn, st.x, st.v, aS.value, bS.value) },
      { name: 'Poszukiwanie w kierunku', color: C.ink3, dash: [2, 4], needs: need('gradient i kilka obliczeń funkcji'), step: (st, fn) => { const r = M.armijo(fn, st.x, 1e-4, 0.5); return r.trials[r.trials.length - 1].ok ? { x: r.x } : null; } },
      { name: 'Metoda Newtona', color: C.black, dash: [10, 3, 2, 3], shape: 'sq', needs: need('gradient, hesjan i rozwiązanie układu równań'), step: (st, fn) => { const r = M.newtonStep(fn, st.x); return r && { x: r.x }; } },
    ],
    extraCol: { head: 'Wymaga w każdym kroku', cell: r => r.m.needs },
    info: api => `<div>${K(api.fn.tex)}</div><div class="note">Poszukiwanie w kierunku: warunek Armijo ze stałą ${K(R`c_1=10^{-4}`)} i skracaniem ${K(R`\rho=0.5`)}.</div>`,
    missions(api) {
      const set = (fn, a, b, x0) => { api.setFn(fn, x0); aS.set(a, false); bS.set(b, false); api.run(); };
      return [
        { t: 'Wąska dolina', q: R`Funkcja o wąskiej dolinie ($\kappa=100$), $\alpha=0.0198$, $\beta=0.669$. **Zastanów się:** w jakiej kolejności metody osiągną próg $f-f^{*}<10^{-6}$?`,
          acts: [['Uruchom', () => set('valley', 0.0198, 0.669)]],
          a: R`Metoda Newtona: $1$ krok. Metoda z momentem: około $115$. Poszukiwanie w kierunku: około $370$. Spadek gradientu: około $520$. Kolejność odpowiada ilości informacji o funkcji, z której metoda korzysta: krzywizna, pamięć poprzednich gradientów, wartości funkcji wzdłuż kierunku, sam gradient.` },
        { t: 'Funkcja niekwadratowa', q: R`Funkcja $\cosh$, $\alpha=0.1$, $\beta=0.5$, punkt startowy $(4,\ 3)$. **Zastanów się:** czy kolejność będzie taka sama jak w wąskiej dolinie? Czy wszystkie metody będą zbieżne?`,
          acts: [['Uruchom', () => set('cosh', 0.1, 0.5, [4, 3])]],
          a: R`Nie. Poszukiwanie w kierunku potrzebuje $5$ kroków, metoda Newtona $7$, spadek gradientu około $70$, a metoda z momentem **rozbiega się**. Daleko od minimum ta funkcja rośnie wykładniczo: stały współczynnik uczenia, bezpieczny dla zwykłego spadku, okazuje się za duży po dodaniu momentu. Poszukiwanie w kierunku dopasowuje długość kroku do lokalnej stromości i dlatego wygrywa.` },
        { t: 'Funkcja niewypukła', q: R`Funkcja z dwiema dolinami, punkt startowy $(0.35,\ 1.9)$, $\alpha=0.05$, $\beta=0.5$. **Zastanów się:** która metoda znajdzie minimum globalne?`,
          acts: [['Uruchom', () => set('twin', 0.05, 0.5, [0.35, 1.9])], ['Start z drugiej strony', () => set('twin', 0.05, 0.5, [-0.4, 1.9])]],
          a: R`Żadna. Spadek gradientu, metoda z momentem i poszukiwanie w kierunku kończą w minimum lokalnym, a metoda Newtona w punkcie siodłowym. Po starcie z drugiej strony trzy pierwsze metody znajdują minimum globalne, a metoda Newtona znów trafia w punkt siodłowy. Wszystkie te metody są **lokalne**: o wyniku decyduje punkt startowy.` },
      ];
    },
  });
  wrap.append(lab.el);
  return { el: wrap };
}

/* ---------- find the bug ---------- */
function BugsPage() {
  const fn = M.F.bowl, x0 = [-3, 4];
  const gd = (a, n) => { let x = [...x0]; const p = [x]; for (let k = 0; k < n; k++) { x = M.gdStep(fn, x, a); p.push(x); } return p; };
  const OPT = {
    sign: R`Krok ma zły znak: punkt przesuwa się zgodnie z gradientem zamiast przeciwnie do niego.`,
    accum: R`Gradienty z kolejnych kroków się sumują, bo po kroku nie odtworzono punktu jako nowego liścia grafu obliczeń.`,
    stale: R`Gradient jest obliczany zawsze w punkcie startowym, a nie w bieżącym.`,
    big: R`Kod jest poprawny, ale współczynnik uczenia przekracza granicę stabilności $2/L$.`,
    damp: R`W regule momentu gradient pomnożono przez $(1-\beta)$, czego nie ma w przyjętej konwencji.`,
    small: R`Kod jest poprawny, ale współczynnik uczenia jest zbyt mały.`,
  };
  const CASES = [
    { set: R`Metoda spadku gradientu, $\alpha=0.02$, $12$ kroków.`, view: [-9, 9, -3, 15], opts: ['big', 'sign', 'accum', 'stale'], ok: 'sign',
      ref: gd(0.02, 12), bug: (() => { let x = [...x0]; const p = [x]; for (let k = 0; k < 12; k++) { x = M.add(x, M.scale(fn.g(x), 0.02)); p.push(x); } return p; })(),
      why: R`Koszt rośnie od pierwszego kroku, a punkt oddala się od minimum po jednej stronie doliny, bez przeskakiwania. Przy zbyt dużym współczynniku uczenia punkt przeskakiwałby na przemian na obie strony. Poprawka: $\mathbf{x}\leftarrow\mathbf{x}-\alpha\,\nabla f$, ze znakiem minus.` },
    { set: R`Metoda spadku gradientu, $\alpha=0.1$, $40$ kroków.`, view: [-8, 8, -8, 8], opts: ['damp', 'accum', 'big', 'sign'], ok: 'accum',
      ref: gd(0.1, 40), bug: (() => { let x = [...x0], acc = [0, 0]; const p = [x]; for (let k = 0; k < 40; k++) { acc = M.add(acc, fn.g(x)); x = M.sub(x, M.scale(acc, 0.1)); p.push(x); } return p; })(),
      why: R`Pierwszy krok jest poprawny, ale kolejne są coraz dłuższe: punkt mija minimum i krąży wokół niego, a koszt oscyluje, zamiast maleć. Tak działa sumowanie gradientów w <code>x.grad</code>: to pamięć bez żadnego tłumienia, jak moment z $\beta=1$. Poprawka: po każdym kroku odtwórz $\mathbf{x}$ jako nowy liść grafu obliczeń albo wyzeruj gradient.` },
    { set: R`Metoda spadku gradientu, $\alpha=0.03$, $12$ kroków.`, view: [-6.5, 6.5, -6.5, 6.5], opts: ['small', 'sign', 'stale', 'accum'], ok: 'stale',
      ref: gd(0.03, 12), bug: (() => { let x = [...x0]; const g0 = fn.g(x0), p = [x]; for (let k = 0; k < 12; k++) { x = M.sub(x, M.scale(g0, 0.03)); p.push(x); } return p; })(),
      why: R`Wszystkie kroki są identyczne: mają tę samą długość i ten sam kierunek, więc punkty leżą na prostej w równych odstępach. Koszt najpierw maleje, a potem rośnie, bo punkt mija dno doliny i idzie dalej. Poprawka: obliczaj gradient w **bieżącym** punkcie w każdej iteracji.` },
    { set: R`Metoda z momentem, $\alpha=0.05$, $\beta=0.6$, $60$ kroków. Przebieg wzorcowy to <code>torch.optim.SGD</code> z tymi samymi ustawieniami.`, view: [-5.6, 5.6, -5.6, 5.6], opts: ['small', 'damp', 'accum', 'stale'], ok: 'damp',
      ref: (() => { let x = [...x0], v = [0, 0]; const p = [x]; for (let k = 0; k < 60; k++) { ({ x, v } = M.hbStep(fn, x, v, 0.05, 0.6)); p.push(x); } return p; })(),
      bug: (() => { let x = [...x0], v = [0, 0]; const p = [x]; for (let k = 0; k < 60; k++) { v = M.add(M.scale(v, 0.6), M.scale(fn.g(x), 0.4)); x = M.sub(x, M.scale(v, 0.05)); p.push(x); } return p; })(),
      why: R`Trajektoria jest gładka i zmierza do minimum, ale wyraźnie wolniej niż wzorcowa. Czynnik $(1-\beta)=0.4$ zmniejsza każdy gradient, co działa jak dwuipółkrotnie mniejszy współczynnik uczenia. Sam zbyt mały współczynnik dałby podobny obraz, ale tutaj $\alpha$ jest takie samo jak w przebiegu wzorcowym. Poprawka: $\mathbf{v}\leftarrow\beta\,\mathbf{v}+\mathbf{g}$.` },
    { set: R`Metoda spadku gradientu, $14$ kroków. Przebieg wzorcowy: $\alpha=0.1$. Przebieg badany: ten sam kod, inne ustawienia.`, view: [-12, 12, -12, 12], opts: ['sign', 'accum', 'big', 'damp'], ok: 'big',
      ref: gd(0.1, 14), bug: gd(0.41, 14),
      why: R`Punkt przeskakuje na przemian na obie strony doliny, a każde wychylenie jest większe od poprzedniego. Przy złym znaku kroku punkt oddalałby się po jednej stronie. Mnożnik błędu w kierunku stromym wynosi $1-5\cdot0.41=-1.05$: moduł większy od $1$ oznacza rozbieżność. To nie jest błąd w kodzie: wystarczy $\alpha<2/L=0.4$.` },
  ];
  const key = 'bugs'; let st = Store.get(key, null); if (!st || !Array.isArray(st.s) || st.s.length !== CASES.length) st = { s: CASES.map(() => ({})) };
  let cur = 0, showRef = true;
  const root = el('div', 'bugs'), nav = el('div', 'wnav'), grid = el('div', 'walk-grid bug-grid'), left = el('div', 'walk-left'), right = el('div', 'walk-right');
  root.append(el('div', 'prose', md(R`Każdy przypadek pokazuje przebieg wygenerowany przez implementację z jednym błędem (kolor czerwony) na tle przebiegu wzorcowego (szary). Na podstawie kształtu trajektorii i wykresu kosztu rozpoznaj przyczynę. To ta sama umiejętność, której potrzebujesz, gdy własny kod „nie zbiega”.`)));
  const pills = el('ol', 'pills'), bPrev = Btn('← Wstecz', '', () => go(cur - 1)), bNext = Btn('Dalej →', 'pri', () => go(cur + 1)), prog = el('span', 'prog');
  nav.append(bPrev, bNext, pills, prog);
  const pF = new Plot({ equal: true, ratio: '1 / 0.52', xlabel: 'x_0', ylabel: 'x_1', aria: 'Trajektoria implementacji z błędem na tle przebiegu wzorcowego' });   // both plots fit on a laptop screen
  const pC = new Plot({ ylog: true, ratio: '1 / 0.36', xlabel: 'k', ylabel: R`f(\mathbf{x}^{(k)})`, aria: 'Historia kosztu implementacji z błędem i przebiegu wzorcowego' });
  const chk = el('label', 'chk', '<input type="checkbox" checked> Pokaż przebieg wzorcowy');
  chk.querySelector('input').addEventListener('change', e => { showRef = e.target.checked; draw(); });
  const fCard = plotCard('Trajektoria na tle poziomic', pF), lgRow = el('div', 'lg-row', legend([['line', C.red, 'implementacja badana'], ['dash', C.ghost, 'przebieg wzorcowy'], ['star', C.black, 'minimum']]));
  lgRow.append(chk); fCard.append(lgRow);
  left.append(fCard, plotCard('Historia kosztu <small>skala logarytmiczna</small>', pC));
  const qHost = el('div', 'bug-q');
  right.append(nav, qHost); grid.append(left, right); root.append(grid);
  function draw() {
    const c = CASES[cur], top = Math.max(...[[c.view[0], c.view[2]], [c.view[1], c.view[2]], [c.view[0], c.view[3]], [c.view[1], c.view[3]]].map(fn.f));
    const lv = Array.from({ length: 14 }, (_, j) => top * ((j + 1) / 15) ** 2.3);
    pF.setView(...c.view);
    pF.draw = q => {
      q.contour('bug' + cur, fn.f, lv); q.star(fn.min[0], fn.min[1]);
      if (showRef) drawRun(q, c.ref, { color: C.ghost, dash: [6, 4], ghost: true, width: 2 });
      drawRun(q, c.bug, { color: C.red, shape: 'sq' });
      q.dots([x0], { fill: '#fff', stroke: C.black, color: C.black, r: 4.5 });
    };
    pF.render();
    drawCost(pC, (showRef ? [{ ys: c.ref.map(fn.f), color: C.ghost, dash: [6, 4] }] : []).concat([{ ys: c.bug.map(fn.f), color: C.red }]), { lo: 1e-3 });
  }
  function paint() {
    pills.innerHTML = '';
    CASES.forEach((_, j) => { const b = el('button', 'pill' + (j === cur ? ' on' : st.s[j].ok ? ' done' : ''), String(j + 1)); b.type = 'button'; b.title = 'Przypadek ' + (j + 1); b.addEventListener('click', () => go(j)); const li = el('li'); li.append(b); pills.append(li); });
    bPrev.disabled = cur === 0; bNext.disabled = cur === CASES.length - 1;
    prog.textContent = `rozpoznane: ${st.s.filter(a => a.ok).length} z ${CASES.length}`;
  }
  function go(i) {
    cur = Math.max(0, Math.min(CASES.length - 1, i));
    const c = CASES[cur];
    qHost.replaceChildren(Question({ q: c.set + R` Co jest przyczyną tego, co widać na wykresach?`, opts: c.opts.map(k => OPT[k]), ok: c.opts.indexOf(c.ok), why: c.why }, cur + 1, st.s[cur], () => { Store.set(key, { s: st.s, n: CASES.length }); paint(); }, 'Przypadek'));
    paint(); draw();
  }
  go(0);
  return { el: root };
}
