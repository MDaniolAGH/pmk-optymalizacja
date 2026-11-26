# PMK | Optymalizacja

Interaktywne środowisko do samodzielnej nauki metod minimalizacji funkcji kosztu.
Materiały do przedmiotu **Podstawy Metod Komputerowych w Obliczeniach Inżynierskich** (AGH).

**Strona:** https://mdaniolagh.github.io/pmk-optymalizacja/

## Zawartość

Siedem tematów, każdy w trzech częściach: „Krok po kroku” (jedna iteracja algorytmu rozpisana
na liczbach), „Eksperymentuj” (interaktywne eksperymenty z misjami) oraz „Sprawdź się” (kilka pytań
z natychmiastową odpowiedzią).

1. Gradient numeryczny (różnice skończone)
2. Metoda spadku gradientu
3. Metoda z momentem
4. Poszukiwanie w kierunku i warunek Armijo
5. Metoda Newtona
6. Metoda Gaussa–Newtona
7. Farmakokinetyka teofiliny (studium przypadku)

Dwie strony podsumowujące: „Porównaj metody” (cztery metody na jednej funkcji) oraz „Znajdź błąd”
(rozpoznawanie typowych błędów implementacji po kształcie trajektorii).

Każdy symbol na stronie można kliknąć, aby zobaczyć objaśnienie: co oznacza, jak się go oblicza,
dlaczego jest ważny i jaką ma w danej chwili wartość. Postęp nauki jest zapisywany wyłącznie
w przeglądarce użytkownika (`localStorage`); strona niczego nie wysyła.

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
| `src/plot3d.js` | widok 3D powierzchni funkcji (własny rzut na canvasie, bez bibliotek) |
| `src/gloss.js` | słownik symboli i okno objaśnień |
| `src/t1_…` – `src/t7_…` | treść i eksperymenty poszczególnych tematów |
| `src/extras.js` | pytania „Sprawdź się”, strony „Porównaj metody” i „Znajdź błąd” |
| `src/main.js` | strona główna i nawigacja |
| `src/style.css` | wygląd |

## Dane i biblioteki

- Dane teofiliny: zbiór `Theoph` (Boeckmann, Sheiner, Beal), rozpowszechniany z językiem R, domena publiczna.
- [KaTeX](https://katex.org) 0.16.11, licencja MIT.
- Fonty Source Serif 4 i Source Sans 3, licencja SIL Open Font License 1.1.
