/**
 * Gera o roteiro do jogo em espanhol a partir do código em português.
 *
 * Uso:  node i18n/traduzir.js <entrada.js> <saida.js>
 *
 * Como funciona
 * -------------
 * 1. O código do jogo (src/jogo.js) é lido e analisado com o parser `acorn`,
 *    que devolve a árvore sintática com a posição de cada texto.
 * 2. São localizados os textos exibidos ao jogador: strings comuns e
 *    template literals (`...${x}...`) que contêm palavras. Nomes de classes CSS,
 *    medidas ("12px"), chamadas de função etc. são ignorados.
 * 3. Cada texto é procurado nos dicionários de i18n/es/:
 *      - textos.json    → texto em português  → texto em espanhol
 *      - templates.json → template literal    → lista de trocas [trecho_pt, trecho_es]
 *      - extras.json    → strings curtas que a etapa 2 não reconhece como texto
 *                         (rótulos em MAIÚSCULAS, trechos com "px" etc.)
 * 4. As substituições são feitas de trás para frente (da maior posição para a
 *    menor), para que as posições ainda não processadas continuem válidas.
 * 5. As chaves do LocalStorage recebem o sufixo "_es", de modo que partidas e
 *    recordes em espanhol fiquem separados dos em português.
 * 6. O resultado é validado com o parser antes de ser gravado.
 *
 * Como a busca é feita pelo texto (e não pela posição), comentários e mudanças
 * de formatação no código não afetam a tradução.
 */
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const [, , ENTRADA, SAIDA] = process.argv;
if (!ENTRADA || !SAIDA) {
  console.error('Uso: node i18n/traduzir.js <entrada.js> <saida.js>');
  process.exit(1);
}

const DIR = path.join(__dirname, 'es');
const ler = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const textos = ler('textos.json');
const templates = ler('templates.json');
const extras = ler('extras.json');

const js = fs.readFileSync(ENTRADA, 'utf8');
const ast = acorn.parse(js, { ecmaVersion: 2022 });

/* ── Critérios para decidir se uma string é texto do jogo ou código ── */
const pareceTexto = t =>
  /[A-Za-zÀ-ÿ]/.test(t) &&
  (/[À-ÿ]/.test(t) || /\s/.test(t.trim()) || /^[A-ZÀ-Ý][a-zà-ÿ]/.test(t.trim()));
const pareceCodigo = t =>
  /^[#.\[]|px\b|^\w+\(|=>|\bvar\(|rgba?\(|^\s*[a-z-]+:\s*[^ ]+;|^[a-z]+-[a-z-]+$|^[\w-]+\.(png|jpg|svg)$/i.test(t.trim());

/* ── 1. Percorre a árvore e coleta os textos com suas posições ── */
const unidades = [];   // textos reconhecidos (strings e templates)
const unidadesExtra = []; // strings presentes em extras.json

function percorrer(no) {
  if (!no || typeof no.type !== 'string') return;
  if (no.type === 'Literal' && typeof no.value === 'string') {
    const raw = js.slice(no.start, no.end);
    if (pareceTexto(no.value) && !pareceCodigo(no.value))
      unidades.push({ tipo: 'str', start: no.start, end: no.end, raw, texto: no.value });
    if (Object.prototype.hasOwnProperty.call(extras, no.value))
      unidadesExtra.push({ tipo: 'extra', start: no.start, end: no.end, raw, texto: no.value });
  } else if (no.type === 'TemplateLiteral') {
    const raw = js.slice(no.start, no.end);
    const cozido = no.quasis.map(q => q.value.cooked || '').join(' ');
    const semTags = cozido.replace(/<[^>]*>/g, ' ');
    if (pareceTexto(semTags) && /[a-zà-ÿ]{3,}/i.test(semTags.replace(/class|style|div|span|onclick|title/g, '')))
      unidades.push({ tipo: 'tpl', start: no.start, end: no.end, raw, texto: raw.slice(1, -1) });
  }
  for (const k of Object.keys(no)) {
    if (k === 'start' || k === 'end') continue;
    const v = no[k];
    if (Array.isArray(v)) v.forEach(percorrer);
    else if (v && typeof v.type === 'string') percorrer(v);
  }
}
percorrer(ast);

// Textos dentro de um template são traduzidos junto com o template inteiro.
const topo = unidades.filter(u =>
  !unidades.some(o => o !== u && o.tipo === 'tpl' && o.start < u.start && u.end <= o.end));

/* ── 2. Funções auxiliares ── */
// Reescreve a string com o mesmo tipo de aspas do original, escapando o necessário.
function citar(s, aspas) {
  return aspas + s.replace(/\\/g, '\\\\').split(aspas).join('\\' + aspas)
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r') + aspas;
}
// Sequência de tags HTML de um texto: a tradução deve manter as mesmas tags.
const tags = s => (s.match(/<\/?[a-zA-Z][^>]*>/g) || [])
  .map(t => t.replace(/>[^<]*$/, '').replace(/(title|alt)="[^"]*"/g, '')).join('');

/* ── 3. Aplica as traduções, da última posição para a primeira ── */
let saida = js, aplicadas = 0;
const problemas = [];
const todas = [...topo, ...unidadesExtra].sort((a, b) => b.start - a.start);

for (const u of todas) {
  let novo = null;
  if (u.tipo === 'tpl') {
    const trocas = templates[u.texto];
    if (!trocas) continue;
    let raw = u.raw;
    for (const [pt, es] of trocas) {
      if (!raw.includes(pt)) problemas.push('trecho não encontrado no template: ' + pt);
      raw = raw.split(pt).join(es);
    }
    novo = raw;
  } else {
    const es = u.tipo === 'extra' ? extras[u.texto] : textos[u.texto];
    if (es === undefined || es === u.texto) continue;
    if (tags(es) !== tags(u.texto)) problemas.push('tags HTML diferentes em: ' + u.texto.slice(0, 60));
    novo = citar(es, u.raw[0]);
  }
  saida = saida.slice(0, u.start) + novo + saida.slice(u.end);
  aplicadas++;
}

/* ── 4. Partidas e recordes separados por idioma ── */
saida = saida
  .replace(/(['"])fronteira_save\1/g, '$1fronteira_save_es$1')
  .replace(/(['"])fronteira_records\1/g, '$1fronteira_records_es$1');

/* ── 5. Validação ── */
try { acorn.parse(saida, { ecmaVersion: 2022 }); }
catch (e) { problemas.push('o código traduzido não é JavaScript válido: ' + e.message); }

fs.writeFileSync(SAIDA, saida);
console.log(`Tradução: ${aplicadas} textos substituídos, ${problemas.length} problema(s).`);
problemas.slice(0, 20).forEach(p => console.log('  - ' + p));
if (problemas.some(p => p.startsWith('o código traduzido'))) process.exit(1);
