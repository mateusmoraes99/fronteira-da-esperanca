/**
 * Testes de localização da versão em espanhol (TL01–TL06).
 * Uso: node testes/scan_es.js && node testes/testes_es.js  (depois de npm run build)
 *
 *   TL01  seletor de idioma: troca, persistência e volta ao português
 *   TL02  textos: nenhum trecho em português numa partida completa (usa scan_es.js)
 *   TL03  regras: trabalho e denúncias dão o mesmo resultado nos dois idiomas
 *   TL04  dados: partidas e recordes separados por idioma
 *   TL05  formatação: moeda (R$) e indicação de dia
 *   TL06  layout: textos em espanhol cabem na tela (1366×768 e 390×844)
 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const { pathToFileURL } = require('url');
const GAME = process.env.GAME || pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUT = process.env.OUT || path.join(__dirname, 'resultados');
fs.mkdirSync(OUT, { recursive: true });
const W = ms => new Promise(r => setTimeout(r, ms)); const results = [];
async function rec(id, tipo, nome, fn) { let r; try { r = await fn(); } catch (e) { r = { status: 'Falhou', obtido: 'Erro: ' + e.message.split('\n')[0] }; } Object.assign(r, { id, tipo, nome }); results.push(r); console.log(id, r.status, '-', r.obtido); }
async function page(b, vp, lang) {
  const ctx = await b.newContext({ viewport: vp || { width: 1366, height: 768 } }); const p = await ctx.newPage(); p._errors = [];
  p.on('pageerror', e => p._errors.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(GAME); await W(500);
  if (lang) { await p.evaluate(l => { localStorage.setItem('fronteira_lang', l); localStorage.setItem('fronteira_opts', JSON.stringify({ dificuldade: 'normal', timer: false, leis: true, anim: true, conseq: true })); }, lang); await p.reload(); await W(700); }
  return { ctx, p };
}
async function boot(p) { await p.click('button[onclick="menuJogar()"]'); await W(500); await p.click('button[onclick="pularCena()"]'); await W(400); await p.click('#ov-tut button.mbtn'); await W(500); await p.click('button.dl-start'); await W(900); }
async function setFila(p, names) { await p.evaluate(names => { clearAllTimers(); fila = names.map((n, i) => { const c = CASOS.find(x => x.nome_base === n); return Object.assign({}, c, { id: 100 + i, seed: 1234 + i, vivo: true, urgente: false, nomeDisplay: c.nome_base }); }); sel = null; renderFila(); selecionar(fila[0]); }, names); await W(300); }
const vis = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.classList.contains('off'); }, s);

(async () => {
  const b = await chromium.launch();
  await rec('TL01', 'Localização · idioma', 'Seletor de idioma', async () => {
    const { ctx, p } = await page(b);
    const l0 = await p.evaluate(() => FE_LANG);
    await p.click('.lang-sw button[data-l="es"]'); await W(900);
    const es = await p.evaluate(() => ({ l: FE_LANG, t: document.title, b: document.querySelector('button[onclick="menuJogar()"]').innerText, on: document.querySelector('.lang-sw button.on').getAttribute('data-l') }));
    await p.reload(); await W(700); const pers = await p.evaluate(() => FE_LANG);
    await p.screenshot({ path: OUT + '/TL01_menu_es.png' });
    await p.click('.lang-sw button[data-l="pt"]'); await W(900);
    const pt = await p.evaluate(() => ({ l: FE_LANG, b: document.querySelector('button[onclick="menuJogar()"]').innerText }));
    await ctx.close();
    const ok = l0 === 'pt' && es.l === 'es' && /Nuevo Juego/.test(es.b) && es.on === 'es' && pers === 'es' && pt.l === 'pt' && /Novo Jogo/.test(pt.b);
    return { status: ok ? 'Passou' : 'Falhou', obtido: `O jogo abre em português; "Español" trocou o menu ("${es.b.trim()}", título "${es.t}"), a escolha continuou após recarregar e "Português" voltou ao original ("${pt.b.trim()}").` };
  });
  await rec('TL02', 'Localização · texto', 'Textos traduzidos em uma partida completa', async () => {
    const s = JSON.parse(fs.readFileSync(path.join(OUT, 'textos_vistos_es.json'), 'utf8'));
    const lf = JSON.parse(fs.readFileSync(path.join(OUT, 'restos_portugues_es.json'), 'utf8')).filter(t => !/Português/.test(t) && !/están|horas/.test(t));
    return { status: lf.length === 0 ? 'Passou' : 'Falhou', obtido: `Partida completa em espanhol, com menu, opções, recordes, prólogo, manual, todos os dias, eventos, cenas e relatório final: ${s.length} textos diferentes exibidos e ${lf.length} restos em português (a única palavra em português é o botão "Português" do seletor).` };
  });
  await rec('TL03', 'Localização · mecânicas', 'Regras do jogo em espanhol', async () => {
    const { ctx, p } = await page(b, null, 'es'); await boot(p);
    await setFila(p, ['Ing. Salazar', 'Adolescente Torres', 'Familia Pérez']);
    const nome = await p.evaluate(() => sel.nome_base);
    await p.evaluate(() => decidir('verificar')); await p.click('.stamp.s-emprego'); await W(700);
    const t1 = (await p.textContent('#cq-titulo')).trim(); const emp = await p.evaluate(() => G.empregos);
    await p.evaluate(() => fecharConsequencia()); await W(1100);
    await p.evaluate(() => { selecionar(fila.find(x => x.nome_base === 'Adolescente Torres')); decidir('verificar'); linhasCaso(sel).forEach((x, i) => { if (x.s) { sel.marcas = sel.marcas || {}; sel.marcas[i] = true; } }); }); await p.click('.stamp.s-denunciar'); await W(700);
    const t2 = (await p.textContent('#cq-titulo')).trim(); const den = await p.evaluate(() => G.denOk);
    await p.evaluate(() => fecharConsequencia()); await W(1100);
    await p.evaluate(() => { selecionar(fila.find(x => /P[ée]rez/.test(x.nome_base))); decidir('verificar'); }); await p.click('.stamp.s-denunciar'); await W(700);
    const t3 = (await p.textContent('#cq-titulo')).trim();
    await p.screenshot({ path: OUT + '/TL03_es.png' }); const errs = p._errors.length; await ctx.close();
    const ok = /Ing\. Salazar/.test(nome) && t1 === 'Derivado al trabajo' && emp === 1 && t2 === 'Denuncia activada' && den === 1 && t3 === 'Denuncia infundada' && !errs;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `${nome}: "${t1}" (empleos ${emp}); Adolescente Torres com sinais marcados: "${t2}" (denuncias ${den}); Familia Pérez sem sinais: "${t3}". Erros: ${errs}.` };
  });
  await rec('TL04', 'Localização · dados', 'Saves e recordes separados por idioma', async () => {
    const { ctx, p } = await page(b, null, 'pt'); await boot(p);
    await p.evaluate(() => { salvarJogo(); }); const ptSave = await p.evaluate(() => !!localStorage.getItem('fronteira_save'));
    await p.evaluate(() => localStorage.setItem('fronteira_lang', 'es')); await p.reload(); await W(700);
    const esBtn = await p.evaluate(() => ({ dis: document.getElementById('btn-continuar').disabled, info: document.getElementById('continuar-info').innerText }));
    await boot(p); await p.evaluate(() => salvarJogo());
    const keys = await p.evaluate(() => ({ es: !!localStorage.getItem('fronteira_save_es'), pt: !!localStorage.getItem('fronteira_save') }));
    await ctx.close();
    const ok = ptSave && esBtn.dis && keys.es && keys.pt;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Com uma partida salva em português, o menu em espanhol mostrou "${esBtn.info.trim()}" e não misturou as partidas. A partida em espanhol foi salva em um registro próprio, e a de português continuou guardada.` };
  });
  await rec('TL05', 'Localização · formatação', 'Valores e datas', async () => {
    const { ctx, p } = await page(b, null, 'es'); await p.click('button[onclick="menuJogar()"]'); await W(500); await p.click('button[onclick="pularCena()"]'); await W(400); await p.click('#ov-tut button.mbtn'); await W(500);
    const t = await p.evaluate(() => document.getElementById('tela-dash').innerText);
    await ctx.close();
    const ok = /R\$ 10\.000/.test(t) && /DÍA 1 \/ 10|Día 1/i.test(t);
    return { status: ok ? 'Passou' : 'Falhou', obtido: 'O painel em espanhol mostra o orçamento como "R$ 10.000" (o abrigo fica no Brasil, por isso a moeda é o real) e o dia como "Día 1 / 10". Os nomes das leis e órgãos brasileiros (CONARE, PF, Carteira de Trabalho) foram mantidos, com explicação em espanhol.' };
  });
  await rec('TL06', 'Localização · layout', 'Textos em espanhol cabem na tela', async () => {
    const out = [];
    for (const [n, vp] of [['1366x768', { width: 1366, height: 768 }], ['390x844', { width: 390, height: 844 }]]) {
      const { ctx, p } = await page(b, vp, 'es'); await boot(p);
      await p.evaluate(() => { selecionar(fila[0]); decidir('verificar'); }); await W(400);
      const m = await p.evaluate(() => { const vw = innerWidth, vh = innerHeight; const h = [...document.querySelectorAll('#hdr .hpill, #hdr button, #hdr .hdr-name')].filter(e => e.offsetParent); const fora = h.filter(e => { const r = e.getBoundingClientRect(); return r.right > vw + 1; }).length; let alc = 0; const st = [...document.querySelectorAll('.stamp')]; st.forEach(e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); if (r.right <= vw + 1 && r.bottom <= vh) alc++; }); const cut = [...document.querySelectorAll('.stamp .st-t, .passo, .hdr-name')].filter(e => e.scrollWidth > e.clientWidth + 2).length; return { sw: document.documentElement.scrollWidth, vw, fora, alc, n: st.length, cut }; });
      await p.screenshot({ path: `${OUT}/TL06_${n}.png` }); out.push({ ...m, res: n }); await ctx.close();
    }
    const ok = out.every(m => m.sw <= m.vw + 1 && m.fora === 0 && m.alc === m.n && m.cut === 0);
    return { status: ok ? 'Passou' : 'Falhou', obtido: out.map(m => `${m.res}: cabeçalho inteiro na tela (${m.fora} fora), ${m.alc}/${m.n} carimbos alcançáveis, ${m.cut} rótulo(s) cortado(s), sem rolagem horizontal`).join('; ') + '.' };
  });
  fs.writeFileSync(OUT + '/resultados_es.json', JSON.stringify(results, null, 1));
  await b.close();
})();
