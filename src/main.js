/* =====================================================================
   Menu, routing (#topic or #topic-lab) and page chrome
   ===================================================================== */
(function () {
  const app = document.getElementById('app');
  const cache = {};
  const tex = s => mdi(s);

  function bar(cur) {
    const b = el('header', 'bar');
    b.innerHTML = `<div class="bar-in"><a class="brand" href="#menu" title="Podstawy Metod Komputerowych w Obliczeniach Inżynierskich"><b>PMK</b> · Optymalizacja</a>
      <nav class="nav" aria-label="Tematy">${TOPICS.map(t => `<a href="#${t.id}" class="${cur === t.id ? 'on' : ''}" title="${t.title}"><i>${t.n}</i><span>${t.short}</span></a>`).join('')}</nav><button type="button" class="btn sm gl-open">Słownik symboli</button></div>`;
    b.querySelector('.gl-open').addEventListener('click', () => Gloss.open('__index', document.body));
    return b;
  }

  function menu() {
    const m = el('main');
    m.innerHTML = `
      <section class="hero">
        <div>
          <div class="eyebrow">Podstawy Metod Komputerowych w Obliczeniach Inżynierskich · Optymalizacja</div>
          <h1>Jak znaleźć minimum funkcji kosztu?</h1>
          <p class="lead">Interaktywne środowisko do samodzielnej nauki metod minimalizacji funkcji kosztu (cost function). Najpierw prześledź każdy algorytm na konkretnych liczbach, a potem sprawdź w eksperymentach, kiedy działa, a kiedy zawodzi.</p>
        </div>
        <div class="how">
          <h2>Jak pracować z każdym tematem</h2>
          <ol>
            <li><span><strong>Krok po kroku.</strong> Jedna iteracja algorytmu rozpisana na konkretnych liczbach. W oznaczonych miejscach oblicz wynik samodzielnie.</span></li>
            <li><span><strong>Eksperymentuj.</strong> Zmieniaj parametry i wykonuj misje: najpierw spróbuj przewidzieć wynik, potem poeksperymentuj.</span></li>
            <li><span><strong>Pytaj o symbole.</strong> Kliknij dowolny symbol lub nazwę wielkości, aby zobaczyć, co oznacza, jak się ją oblicza i dlaczego jest ważna.</span></li>
          </ol>
        </div>
      </section>
      <div class="idea"><b>Wspólna idea:</b> lokalnie zastąp funkcję prostszym modelem i przejdź do jego minimum.
        <span>model liniowy <i>→</i> metoda spadku gradientu</span><span>model kwadratowy <i>→</i> metoda Newtona</span><span>${tex(R`$H\approx J^{\top}J$`)} <i>→</i> metoda Gaussa–Newtona</span></div>
      <section class="topics">${TOPICS.map(t => `
        <article class="topic">
          <span class="topic-n">${t.n}</span><svg viewBox="0 0 120 72" aria-hidden="true">${t.icon}</svg>
          <div><h2><a href="#${t.id}">${t.title}</a><span class="tag">${t.task}</span></h2><p>${tex(t.menu)}</p></div>
          <div class="topic-foot"><a class="btn pri sm" href="#${t.id}">Krok po kroku</a><a class="btn sm" href="#${t.id}-lab">Eksperymentuj</a></div>
        </article>`).join('')}
      </section>`;
    return m;
  }

  function topic(t, tab) {
    const m = el('main'), i = TOPICS.indexOf(t), prev = TOPICS[i - 1], next = TOPICS[i + 1];
    m.dataset.ctx = t.id;
    const head = el('div');
    head.innerHTML = `<div class="crumb"><a href="#menu">← Wszystkie tematy</a><span>Temat ${t.n} z ${TOPICS.length}</span><span class="tag">${t.task}</span></div>
      <div class="thead"><h1>${t.title}</h1></div>
      <nav class="tabs" aria-label="Części tematu"><a href="#${t.id}" class="${tab === 'walk' ? 'on' : ''}" ${tab === 'walk' ? 'aria-current="page"' : ''}>Krok po kroku</a><a href="#${t.id}-lab" class="${tab === 'lab' ? 'on' : ''}" ${tab === 'lab' ? 'aria-current="page"' : ''}>Eksperymentuj</a></nav>`;
    head.insertAdjacentHTML('beforeend', '<p class="hint"><b>Wskazówka:</b> kliknij dowolny symbol we wzorze, w tabeli, na osi wykresu lub w nazwie parametru, aby zobaczyć, co oznacza, jak się go oblicza i dlaczego jest ważny.</p>');
    const key = t.id + ':' + tab;
    if (!cache[key]) cache[key] = tab === 'walk' ? t.walk() : t.lab();
    const pager = el('nav', 'pager'); pager.setAttribute('aria-label', 'Sąsiednie tematy');
    pager.innerHTML = (prev ? `<a class="btn" href="#${prev.id}">← ${prev.n}. ${prev.title}</a>` : '<span></span>') +
      (tab === 'walk' ? `<a class="btn pri" href="#${t.id}-lab">Dalej: eksperymenty →</a>` : next ? `<a class="btn pri" href="#${next.id}">Dalej: ${next.n}. ${next.title} →</a>` : `<a class="btn pri" href="#menu">Wróć do spisu tematów</a>`);
    m.append(head, cache[key].el, pager);
    return m;
  }

  function route() {
    stopAll();
    const h = decodeURIComponent(location.hash.slice(1)), lab = /-lab$/.test(h), id = h.replace(/-lab$/, ''), t = TOPICS.find(x => x.id === id);
    const page = t ? topic(t, lab ? 'lab' : 'walk') : menu();
    const foot = el('footer', '', 'Materiały do przedmiotu Podstawy Metod Komputerowych w Obliczeniach Inżynierskich, AGH. Strona działa bez połączenia z internetem. Obliczenia są wykonywane w przeglądarce w arytmetyce podwójnej precyzji; zaokrąglane są wyłącznie wyświetlane liczby.');
    app.replaceChildren(bar(t ? t.id : ''), page, foot);
    document.title = (t ? `${t.n}. ${t.title} · ` : '') + 'PMK · Optymalizacja';
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
