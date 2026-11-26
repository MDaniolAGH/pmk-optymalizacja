// Assembles the single-file applet: app CSS/JS first (readable), vendor blobs (KaTeX + fonts) last.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const NM = join(here, 'node_modules');   // npm install (exact versions pinned in package.json)
const KDIR = join(NM, 'katex/dist');
const SERIF = join(NM, '@fontsource/source-serif-4/files');
const SANS = join(NM, '@fontsource/source-sans-3/files');
const src = f => readFileSync(join(here, 'src', f), 'utf8');
const b64 = p => readFileSync(p).toString('base64');

// --- KaTeX CSS with only the fonts the applet uses, inlined as data URIs
const keep = /KaTeX_(AMS-Regular|Main-(Regular|Bold|Italic|BoldItalic)|Math-(Italic|BoldItalic)|Size[1-4]-Regular)\.woff2/;
let kcss = readFileSync(join(KDIR, 'katex.min.css'), 'utf8');
kcss = kcss.replace(/@font-face\{[^}]*\}/g, block => {
  const m = block.match(/url\(fonts\/([^)]+\.woff2)\)/);
  if (!m || !keep.test(m[1])) return '';
  const data = b64(join(KDIR, 'fonts', m[1]));
  return block.replace(/src:[^}]*/, `src:url(data:font/woff2;base64,${data}) format("woff2")`);
});

// --- text faces (latin + latin-ext cover Polish)
const RANGE = {
  'latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
};
const faces = [
  ['Source Serif 4', SERIF, 'source-serif-4', 400, 'normal'],
  ['Source Serif 4', SERIF, 'source-serif-4', 400, 'italic'],
  ['Source Serif 4', SERIF, 'source-serif-4', 600, 'normal'],
  ['Source Sans 3', SANS, 'source-sans-3', 400, 'normal'],
  ['Source Sans 3', SANS, 'source-sans-3', 600, 'normal'],
];
let fcss = '';
for (const [fam, dir, slug, w, st] of faces) for (const sub of ['latin', 'latin-ext']) {
  const data = b64(join(dir, `${slug}-${sub}-${w}-${st}.woff2`));
  fcss += `@font-face{font-family:"${fam}";font-style:${st};font-weight:${w};font-display:swap;` +
    `src:url(data:font/woff2;base64,${data}) format("woff2");unicode-range:${RANGE[sub]}}\n`;
}

const kjs = readFileSync(join(KDIR, 'katex.min.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const js = ['math.js', 'core.js', 'plot3d.js', 'gloss.js', 't1_gradient.js', 't2_descent.js', 't3_momentum.js', 't4_armijo.js',
  't5_newton.js', 't6_gaussnewton.js', 't7_pk.js', 'extras.js', 'intro.js', 'main.js'].map(src).join('\n\n');
if (/<\/script/i.test(js)) throw new Error('app JS contains a closing script tag');

const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PMK | Optymalizacja</title>
<!--
  Interaktywne środowisko do samodzielnej nauki metod optymalizacji.
  Przedmiot: Podstawy Metod Komputerowych w Obliczeniach Inżynierskich (PMK), AGH.
  Plik jest samodzielny i działa offline. Układ pliku:
    1) style aplikacji, 2) kod aplikacji, 3) na końcu biblioteki (KaTeX ${'0.16.11'}, fonty) — tej części nie edytuj.
-->
<style>
${src('style.css')}
</style>
</head>
<body>
<div id="app"></div>
<noscript>Ta strona wymaga włączonej obsługi JavaScript.</noscript>
<script>
${js}
</script>

<!-- ================= BIBLIOTEKI (nie edytuj poniżej): KaTeX 0.16.11 (MIT), Source Serif 4 / Source Sans 3 (SIL OFL) ================= -->
<style>
${kcss}
${fcss}</style>
<script>
${kjs}
</script>
</body>
</html>
`;
const out = process.argv[2] || join(here, 'index.html');
writeFileSync(out, html);
console.log('built', out, (html.length / 1024).toFixed(0) + ' KB');
