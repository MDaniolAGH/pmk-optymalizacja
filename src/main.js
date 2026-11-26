/* =====================================================================
   Menu, routing (#topic, #topic-lab, #topic-test, #porownanie, #bledy) and page chrome
   ===================================================================== */
(function () {
  const app = document.getElementById('app');
  const cache = {};
  const tex = s => mdi(s);
  const EXTRA = [
    { id: 'porownanie', title: 'Porównaj metody', tag: 'Podsumowanie', make: () => ComparePage(),
      menu: 'Cztery metody na jednej funkcji i z jednego punktu startowego: liczba kroków, koszt jednego kroku i sytuacje, w których każda z metod zawodzi.' },
    { id: 'bledy', title: 'Znajdź błąd', tag: 'Diagnozowanie', make: () => BugsPage(),
      menu: 'Pięć przebiegów wygenerowanych przez implementacje z typowymi błędami. Rozpoznaj przyczynę po kształcie trajektorii i wykresie kosztu.' },
  ];
  const INTRO = { id: 'wstep', title: 'Zanim zaczniesz: jak szybko tętno wraca do normy?', short: 'Wstęp', tag: 'Wprowadzenie', make: () => IntroPage(),
    menu: 'Skąd bierze się „mapa kosztu” i po co gradient? Przykład z życia: jak szybko tętno wraca do normy po biegu. Dwa parametry modelu to dwie osie mapy, a błąd dopasowania to jej wysokość.',
    icon: '<path d="M10 62 H112 M14 66 V8"/><path class="a" d="M16 14 C30 44 52 50 108 52"/><circle class="p" cx="22" cy="24" r="3.5"/><circle class="p" cx="36" cy="40" r="3.5"/><circle class="p" cx="56" cy="46" r="3.5"/><circle class="p" cx="78" cy="52" r="3.5"/><circle class="p" cx="100" cy="50" r="3.5"/>' };
  const PARTS = { newton: ['newton-a', 'newton-b'] };   // a topic with two walkthroughs and two sets of missions

  /* what the student has already done in a topic, read from the browser store */
  function progress(t) {
    const ids = PARTS[t.id] || [t.id], ws = ids.map(id => Store.get('w:' + id, null));
    const opened = ids.reduce((a, id) => a + Store.get('m:' + id, []).length, 0), totals = ids.map(id => Store.get('mt:' + id, null));
    const q = Store.get('q:' + t.id, null), first = q && Array.isArray(q.s) ? q.s.filter(a => a.ok && a.t === 1).length : 0, tried = !!(q && Array.isArray(q.s) && q.s.some(a => a.t || a.shown));
    const out = [];
    if (ws.some(Boolean)) { const full = ws.every(s => s && s.done); out.push([full ? 'full' : 'part', 'Krok po kroku: ' + (full ? 'ukończono' : 'w toku')]); }
    if (opened) { const all = totals.every(v => v !== null), n = totals.reduce((a, v) => a + (v || 0), 0); out.push([all && opened >= n ? 'full' : 'part', 'Misje: ' + opened + (all ? ' z ' + n : '')]); }
    if (tried) out.push([first === QUIZ[t.id].length ? 'full' : 'part', `Sprawdź się: ${first} z ${QUIZ[t.id].length}`]);
    return out.length ? `<div class="tprog">${out.map(([c, s]) => `<span class="${c}">${s}</span>`).join('')}</div>` : '';
  }
  function hint(host) {
    if (Store.get('hint-off', false)) return;
    const h = el('p', 'hint', '<span><b>Wskazówka:</b> kliknij dowolny symbol, nazwę wielkości lub opis osi wykresu, aby zobaczyć objaśnienie i bieżącą wartość. Z klawiatury: klawisz Tab, a potem Enter.</span><button type="button" class="btn sm link">Ukryj</button>');
    h.querySelector('button').addEventListener('click', () => { Store.set('hint-off', true); h.remove(); });
    host.append(h);
  }

  function bar(cur) {
    const b = el('header', 'bar');
    b.innerHTML = `<div class="bar-in"><a class="brand" href="#menu" title="Podstawy Metod Komputerowych w Obliczeniach Inżynierskich"><b>PMK</b> | Optymalizacja</a>
      <nav class="nav" aria-label="Tematy"><a href="#${INTRO.id}" class="${cur === INTRO.id ? 'on' : ''}" title="${INTRO.title}"><i>0</i><span>${INTRO.short}</span></a>${TOPICS.map(t => `<a href="#${t.id}" class="${cur === t.id ? 'on' : ''}" title="${t.title}"><i>${t.n}</i><span>${t.short}</span></a>`).join('')}</nav><button type="button" class="btn sm gl-open">Słownik symboli</button></div>`;
    b.querySelector('.gl-open').addEventListener('click', () => Gloss.open('__index', document.body));
    return b;
  }

  function menu() {
    const m = el('main');
    m.innerHTML = `
      <section class="hero">
        <div>
          <div class="eyebrow">Podstawy Metod Komputerowych w Obliczeniach Inżynierskich | Optymalizacja</div>
          <h1>Jak znaleźć minimum funkcji kosztu?</h1>
          <p class="lead">Interaktywne środowisko do samodzielnej nauki metod minimalizacji funkcji kosztu (cost function). Najpierw prześledź każdy algorytm na konkretnych liczbach, a potem sprawdź w eksperymentach, kiedy działa, a kiedy zawodzi.</p>
        </div>
        <div class="how">
          <h2>Jak pracować z każdym tematem</h2>
          <ol>
            <li><span><strong>Krok po kroku.</strong> Jedna iteracja algorytmu rozpisana na konkretnych liczbach. W oznaczonych miejscach oblicz wynik samodzielnie.</span></li>
            <li><span><strong>Eksperymentuj.</strong> Zmieniaj parametry i wykonuj misje: najpierw spróbuj przewidzieć wynik, potem poeksperymentuj.</span></li>
            <li><span><strong>Sprawdź się.</strong> Kilka pytań z natychmiastową odpowiedzią na zakończenie tematu.</span></li>
            <li><span><strong>Pytaj o symbole.</strong> Kliknij dowolny symbol lub nazwę wielkości, aby zobaczyć, co oznacza, jak się ją oblicza i jaką ma teraz wartość.</span></li>
          </ol>
        </div>
      </section>
      <div class="idea"><b>Wspólna idea:</b> lokalnie zastąp funkcję prostszym modelem i przejdź do jego minimum.
        <span>model liniowy <i>→</i> metoda spadku gradientu</span><span>model kwadratowy <i>→</i> metoda Newtona</span><span>${tex(R`$H\approx J^{\top}J$`)} <i>→</i> metoda Gaussa–Newtona</span></div>
      <section class="topics"><article class="topic">
          <span class="topic-n">0</span><svg viewBox="0 0 120 72" aria-hidden="true">${INTRO.icon}</svg>
          <div><h2><a href="#${INTRO.id}">${INTRO.title}</a><span class="tag">${INTRO.tag}</span></h2><p>${INTRO.menu}</p>${Store.get('m:' + INTRO.id, []).length ? `<div class="tprog"><span class="${Store.get('m:' + INTRO.id, []).length >= (Store.get('mt:' + INTRO.id, 99)) ? 'full' : 'part'}">Misje: ${Store.get('m:' + INTRO.id, []).length} z ${Store.get('mt:' + INTRO.id, 4)}</span></div>` : ''}</div>
          <div class="topic-foot"><a class="btn pri sm" href="#${INTRO.id}">Zacznij tutaj</a></div>
        </article>${TOPICS.map(t => `
        <article class="topic">
          <span class="topic-n">${t.n}</span><svg viewBox="0 0 120 72" aria-hidden="true">${t.icon}</svg>
          <div><h2><a href="#${t.id}">${t.title}</a><span class="tag">${t.task}</span></h2><p>${tex(t.menu)}</p>${progress(t)}</div>
          <div class="topic-foot"><a class="btn pri sm" href="#${t.id}">Krok po kroku</a><a class="btn sm" href="#${t.id}-lab">Eksperymentuj</a><a class="btn sm" href="#${t.id}-test">Sprawdź się</a></div>
        </article>`).join('')}
      </section>
      <h2 class="h-sec extras-h">Po przerobieniu tematów</h2>
      <section class="extras">${EXTRA.map(x => `
        <article class="xcard"><div><h3><a href="#${x.id}">${x.title}</a><span class="tag">${x.tag}</span></h3><p>${x.menu}</p>${x.id === 'bledy' && Store.get('bugs', null) ? `<div class="tprog"><span class="part">Rozpoznane: ${Store.get('bugs').s.filter(a => a.ok).length} z ${Store.get('bugs').s.length}</span></div>` : ''}</div><a class="btn sm" href="#${x.id}">Otwórz</a></article>`).join('')}
      </section>
      <p class="clear">Postęp (ukończone kroki, otwarte odpowiedzi do misji i wyniki pytań) jest zapisywany wyłącznie w tej przeglądarce i nigdzie nie jest wysyłany. <button type="button" class="btn sm link">Wyczyść postęp</button></p>`;
    const clr = m.querySelector('.clear button');
    clr.addEventListener('click', () => {
      if (clr.dataset.arm) { Store.clear(); location.hash = '#menu'; location.reload(); return; }
      clr.dataset.arm = '1'; clr.textContent = 'Na pewno? Kliknij ponownie, aby usunąć zapisany postęp';
      setTimeout(() => { delete clr.dataset.arm; clr.textContent = 'Wyczyść postęp'; }, 6000);
    });
    return m;
  }

  function topic(t, tab) {
    const m = el('main'), i = TOPICS.indexOf(t), prev = TOPICS[i - 1], next = TOPICS[i + 1];
    m.dataset.ctx = t.id;
    const head = el('div');
    head.innerHTML = `<div class="thead"><h1>${t.title}</h1><div class="crumb"><a href="#menu">← Wszystkie tematy</a><span>Temat ${t.n} z ${TOPICS.length}</span><span class="tag">${t.task}</span></div></div>
      <nav class="tabs" aria-label="Części tematu">${[['walk', '', 'Krok po kroku'], ['lab', '-lab', 'Eksperymentuj'], ['test', '-test', 'Sprawdź się']].map(([k, suf, label]) => `<a href="#${t.id}${suf}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
    hint(head);
    const key = t.id + ':' + tab;
    if (!cache[key]) cache[key] = tab === 'walk' ? t.walk() : tab === 'lab' ? t.lab() : QuizPage(t.id);
    const pager = el('nav', 'pager'); pager.setAttribute('aria-label', 'Sąsiednie tematy');
    pager.innerHTML = (prev ? `<a class="btn" href="#${prev.id}">← ${prev.n}. ${prev.title}</a>` : `<a class="btn" href="#${INTRO.id}">← ${INTRO.title}</a>`) +
      (tab === 'walk' ? `<a class="btn pri" href="#${t.id}-lab">Dalej: eksperymenty →</a>` : tab === 'lab' ? `<a class="btn pri" href="#${t.id}-test">Dalej: sprawdź się →</a>`
        : next ? `<a class="btn pri" href="#${next.id}">Dalej: ${next.n}. ${next.title} →</a>` : `<a class="btn pri" href="#${EXTRA[0].id}">Dalej: ${EXTRA[0].title} →</a>`);
    m.append(head, cache[key].el, pager);
    return m;
  }

  function extra(x) {
    const m = el('main'), i = EXTRA.indexOf(x), prev = EXTRA[i - 1], next = EXTRA[i + 1], last = TOPICS[TOPICS.length - 1], first = TOPICS[0];
    m.dataset.ctx = x.id;
    const head = el('div');
    head.innerHTML = `<div class="thead xhead"><h1>${x.title}</h1><div class="crumb"><a href="#menu">← Wszystkie tematy</a><span class="tag">${x.tag}</span></div></div>`;
    hint(head);
    if (!cache[x.id]) cache[x.id] = x.make();
    const pager = el('nav', 'pager'); pager.setAttribute('aria-label', 'Sąsiednie strony');
    pager.innerHTML = x === INTRO ? `<a class="btn" href="#menu">← Wszystkie tematy</a><a class="btn pri" href="#${first.id}">Dalej: ${first.n}. ${first.title} →</a>`
      : (prev ? `<a class="btn" href="#${prev.id}">← ${prev.title}</a>` : `<a class="btn" href="#${last.id}">← ${last.n}. ${last.title}</a>`) +
      (next ? `<a class="btn pri" href="#${next.id}">Dalej: ${next.title} →</a>` : `<a class="btn pri" href="#menu">Wróć do spisu tematów</a>`);
    m.append(head, cache[x.id].el, pager);
    return m;
  }

  function route() {
    stopAll();
    const h = decodeURIComponent(location.hash.slice(1)), suf = (h.match(/-(lab|test)$/) || [])[1], id = h.replace(/-(lab|test)$/, ''), t = TOPICS.find(x => x.id === id), x = [INTRO, ...EXTRA].find(e => e.id === h);
    const page = t ? topic(t, suf || 'walk') : x ? extra(x) : menu();
    const foot = el('footer', '', 'Materiały do przedmiotu Podstawy Metod Komputerowych w Obliczeniach Inżynierskich, AGH. Strona działa bez połączenia z internetem. Obliczenia są wykonywane w przeglądarce w arytmetyce podwójnej precyzji; zaokrąglane są wyłącznie wyświetlane liczby.');
    app.replaceChildren(bar(t ? t.id : x ? x.id : ''), page, foot);
    document.title = (t ? `${t.n}. ${t.title} | ` : x ? `${x.title} | ` : '') + 'PMK | Optymalizacja';
    window.scrollTo(0, 0);
  }

  function boot() {
    readColors();
    window.addEventListener('hashchange', route);
    route();
    const again = () => PLOTS.forEach(p => { if (p.el.isConnected) p.render(); });
    if (document.fonts && document.fonts.load) {
      Promise.all(['500 12px "Source Sans 3"', '600 14px "Source Sans 3"', '15px KaTeX_Main', 'italic 15px KaTeX_Math'].map(f => document.fonts.load(f, 'x₀∇α'))).then(again, again);
      document.fonts.ready.then(again);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
