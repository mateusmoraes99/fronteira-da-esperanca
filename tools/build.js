/**
 * Monta o jogo em um único arquivo HTML (index.html), pronto para o navegador,
 * o GitHub Pages ou o itch.io.
 *
 * Uso:  npm run build        (ou: node tools/build.js)
 *
 * Etapas
 * ------
 * 1. Gera o roteiro em espanhol (build/jogo.es.js) a partir de src/jogo.js,
 *    usando i18n/traduzir.js.
 * 2. Lê o modelo src/index.template.html e preenche os marcadores:
 *      {{JOGO_PT}}       → código do jogo em português (src/jogo.js)
 *      {{JOGO_ES}}       → código do jogo em espanhol  (build/jogo.es.js)
 *      {{INTERFACE_ES}}  → dicionário dos textos fixos da página (i18n/es/interface.json)
 *      {{asset:arquivo}} → imagem de src/assets/ embutida em base64
 * 3. Grava index.html na raiz do repositório e build/fronteira-da-esperanca-itchio.zip.
 *
 * Os dois roteiros ficam no HTML como <script type="text/plain">, ou seja,
 * não são executados automaticamente. O carregador no fim da página lê o idioma
 * salvo no LocalStorage e executa apenas o roteiro escolhido.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
const BUILD = path.join(RAIZ, 'build');
fs.mkdirSync(BUILD, { recursive: true });

/* 1. Tradução para o espanhol */
const jogoPt = path.join(SRC, 'jogo.js');
const jogoEs = path.join(BUILD, 'jogo.es.js');
execFileSync(process.execPath, [path.join(RAIZ, 'i18n', 'traduzir.js'), jogoPt, jogoEs], { stdio: 'inherit' });

/* 2. Preenchimento do modelo */
const ler = f => fs.readFileSync(f, 'utf8');
const pt = ler(jogoPt);
const es = ler(jogoEs);
// Um roteiro que contivesse "</script" fecharia a tag antes da hora.
for (const [nome, cod] of [['português', pt], ['espanhol', es]])
  if (/<\/script/i.test(cod)) throw new Error(`O roteiro em ${nome} contém "</script".`);

const interfaceEs = JSON.stringify(JSON.parse(ler(path.join(RAIZ, 'i18n', 'es', 'interface.json'))));
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

let html = ler(path.join(SRC, 'index.template.html'));
// As substituições usam função para que caracteres como "$&" no código não sejam interpretados.
html = html
  .replace('{{JOGO_PT}}', () => pt)
  .replace('{{JOGO_ES}}', () => es)
  .replace('{{INTERFACE_ES}}', () => interfaceEs)
  .replace(/\{\{asset:([\w.-]+)\}\}/g, (_, arq) => {
    const dados = fs.readFileSync(path.join(SRC, 'assets', arq));
    return `data:${mime[path.extname(arq)]};base64,${dados.toString('base64')}`;
  });

const restante = html.match(/\{\{[A-Z_]+\}\}|\{\{asset:[^}]+\}\}/);
if (restante) throw new Error('Marcador não preenchido: ' + restante[0]);

/* 3. Saída */
const destino = path.join(RAIZ, 'index.html');
fs.writeFileSync(destino, html);
console.log(`index.html gerado (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB).`);

// Pacote para o itch.io: um zip com o index.html na raiz.
try {
  const zip = path.join(BUILD, 'fronteira-da-esperanca-itchio.zip');
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-q', '-j', zip, destino]);
  console.log('Pacote do itch.io: build/fronteira-da-esperanca-itchio.zip');
} catch (e) {
  console.log('Comando "zip" não encontrado: o pacote do itch.io não foi gerado (o index.html está pronto).');
}
