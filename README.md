# PMK · Optymalizacja

Interaktywne środowisko do samodzielnej nauki metod minimalizacji funkcji kosztu.
Materiały do przedmiotu **Podstawy Metod Komputerowych w Obliczeniach Inżynierskich** (AGH).

**Strona:** https://mdaniolagh.github.io/pmk-optymalizacja/

## Zawartość

Siedem tematów, każdy w dwóch częściach: „Krok po kroku” (jedna iteracja algorytmu rozpisana
na liczbach) oraz „Eksperymentuj” (interaktywne eksperymenty z misjami).

1. Gradient numeryczny (różnice skończone)
2. Metoda spadku gradientu
3. Metoda z momentem
4. Poszukiwanie w kierunku i warunek Armijo
5. Metoda Newtona
6. Metoda Gaussa–Newtona
7. Farmakokinetyka teofiliny (studium przypadku)

Każdy symbol na stronie można kliknąć, aby zobaczyć objaśnienie: co oznacza, jak się go oblicza
i dlaczego jest ważny.

## Budowanie

Strona to jeden samodzielny plik `index.html`, który działa także bez połączenia z internetem.
Powstaje z plików w katalogu `src/`:

```sh
npm install      # KaTeX i fonty (wersje przypięte w package.json)
npm test         # testy obliczeń numerycznych
npm run build    # składa index.html
```

| Plik | Zawartość |
|---|---|
| `src/math.js` | obliczenia numeryczne (bez interfejsu) |
| `src/core.js` | wykresy, kontrolki, odtwarzacz „krok po kroku” |
| `src/gloss.js` | słownik symboli i okno objaśnień |
| `src/t1_…` – `src/t7_…` | treść i eksperymenty poszczególnych tematów |
| `src/main.js` | strona główna i nawigacja |
| `src/style.css` | wygląd |

## Dane i biblioteki

- Dane teofiliny: zbiór `Theoph` (Boeckmann, Sheiner, Beal), rozpowszechniany z językiem R, domena publiczna.
- [KaTeX](https://katex.org) 0.16.11, licencja MIT.
- Fonty Source Serif 4 i Source Sans 3, licencja SIL Open Font License 1.1.
