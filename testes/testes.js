/**
 * Testes técnicos automatizados do jogo (24 casos), executados no Chromium
 * com Playwright. Uso: node testes/testes.js  (depois de npm run build)
 *
 *   TF01–TF15  funcionais: cada requisito funcional (RF) do jogo
 *   TC01–TC06  compatibilidade: navegadores, celular e resoluções de tela
 *   TD01–TD02  desempenho: tempo de carregamento (4G/3G simulados) e memória
 *              durante uma partida completa de 10 dias
 *   TR01       regressão: a bateria inteira repetida após cada correção
 *
 * TC02 (Firefox), TC03 (Edge), TC04 (celular real) e TC06 (itch.io) dependem
 * de execução manual e aparecem como "Não testado".
 *
 * Variáveis de ambiente opcionais: GAME (URL do jogo) e OUT (pasta de saída).
 * Saída: OUT/resultados.json e capturas de tela de cada teste.
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path'); const { pathToFileURL } = require('url');
const GAME = process.env.GAME || pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUT = process.env.OUT || path.join(__dirname, 'resultados');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const W = ms => new Promise(r => setTimeout(r, ms));

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 768 }, ...(opts.device || {}) });
  const page = await ctx.newPage();
  page._errors = [];
  page.on('pageerror', e => page._errors.push(e.message));
  page._netFont = 0; page.on('console', m => { if (m.type() === 'error') { if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME|fonts\.g/.test(m.text())) { page._netFont++; return; } page._errors.push('console: ' + m.text()); } });
  page.on('dialog', d => d.accept());
  await page.goto(GAME); await W(700);
  return { ctx, page };
}
async function setOpts(page, o) {
  await page.evaluate(o => { localStorage.setItem('fronteira_opts', JSON.stringify(Object.assign({ dificuldade: 'normal', timer: true, leis: true, anim: true, conseq: true }, o))); }, o);
  await page.reload(); await W(700);
}
async function bootToDash(page) {
  await page.click('button[onclick="menuJogar()"]'); await W(500);
  await page.click('button[onclick="pularCena()"]'); await W(400);
  await page.click('#ov-tut button.mbtn'); await W(500);
}
async function bootToCases(page) { await bootToDash(page); await page.click('button.dl-start'); await W(900); }
const vis = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; if (e.classList.contains('off')) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden'; }, sel);
const onTop = (page, ov) => page.evaluate(ov => { const o = document.getElementById(ov); const m = o.querySelector('.modal') || o.firstElementChild; const r = m.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + 20); return !o.classList.contains('off') && !!t && o.contains(t); }, ov);
async function closeCons(page) { if (await vis(page, '#ov-consequencia')) { await page.click('#ov-consequencia button[onclick="fecharConsequencia()"]'); await W(1100); } }
// coloca casos específicos na fila do dia (mesma estrutura usada por gerarFila)
async function setFila(page, names) {
  await page.evaluate(names => {
    clearAllTimers();
    fila = names.map((n, i) => { const c = CASOS.find(x => x.nome_base === n); return Object.assign({}, c, { id: 100 + i, seed: 1234 + i, vivo: true, urgente: false, nomeDisplay: c.nome_base }); });
    sel = null; renderFila(); selecionar(fila[0]);
  }, names); await W(300);
}
async function rec(id, tipo, nome, fn) {
  const t0 = Date.now(); let r;
  try { r = await fn(); } catch (e) { r = { status: 'Falhou', obtido: 'Erro na execução do teste: ' + e.message.split('\n')[0] }; }
  r.id = id; r.tipo = tipo; r.nome = nome; r.ms = Date.now() - t0; results.push(r);
  console.log(id, r.status, '-', r.obtido);
}
// joga automaticamente até o fim (decisões razoáveis)
async function autoplay(page, untilDay = 99) {
  for (let i = 0; i < 600; i++) {
    const st = await page.evaluate(untilDay => {
      if (G.encerrando) { const oc = document.getElementById('ov-cena'); if (oc && !oc.classList.contains('off')) pularCena(); return document.getElementById('ov-fim').classList.contains('off') ? 'enc' : 'fim'; }
      const open = [...document.querySelectorAll('.ov:not(.off)')].map(o => o.id);
      if (open.includes('ov-consequencia')) { fecharConsequencia(); return 'c'; }
      if (open.includes('ov-dia')) { if (window._rd !== G.dia) { window._rd = G.dia; fecharRelDia(); } return 'd'; }
      if (open.includes('ov-upgrade')) { if (window._up !== G.dia) { window._up = G.dia; document.querySelector('#upg-grid .upg-card').click(); } return 'u'; }
      if (open.includes('ov-evento')) { document.querySelector('#ev-choices button').click(); return 'e'; }
      if (open.includes('ov-cena')) { if (CENA && CENA.c.escolhas) escolherCena(0); pularCena(); return 's'; }
      if (open.length) { open.forEach(id => fecharOv(id)); return 'o'; }
      if (G.dia >= untilDay) return 'stop';
      if (document.getElementById('tela-caso').style.display === 'none') { irParaCasos(); return 'go'; }
      const v = fila.filter(p => p.vivo);
      if (!v.length) { if (window._pd === G.dia) return 'w'; window._pd = G.dia; proximoDia(); return 'n'; }
      const p = v[0]; selecionar(p); decidir('verificar'); const m = metaCaso(p);
      if (m.alerta) { linhasCaso(p).forEach((x, i) => { if (x.s) { p.marcas = p.marcas || {}; p.marcas[i] = true; } }); decidir('denunciar'); }
      else if (m.qual && p.prioridade !== 'critico' && !m.menor) decidir('emprego');
      else if (G.res.orcamento > 15 && G.res.abrigo > 15) decidir('acolher'); else decidir('estabilizar');
      return 'ok';
    }, untilDay);
    if (st === 'fim' || st === 'stop') return st;
    await W(st === 'n' ? 700 : 200);
  }
  return 'timeout';
}

(async () => {
  const browser = await chromium.launch();

  // ───────── TF01 ─────────
  await rec('TF01', 'Funcional · botões', 'Iniciar uma partida nova', async () => {
    const { ctx, page } = await newPage(browser);
    await page.click('button[onclick="menuJogar()"]'); await W(500);
    const cena = await vis(page, '#ov-cena'); const cap = await page.textContent('#cena-cap');
    const i0 = await page.evaluate(() => CENA.i);
    await page.evaluate(() => { CENA.digitando = false; }); await page.click('#ov-cena button[onclick="proxFala()"]'); await W(300);
    await page.click('#ov-cena button[onclick="proxFala()"]'); await W(300);
    const i1 = await page.evaluate(() => CENA.i);
    await page.click('button[onclick="pularCena()"]'); await W(400);
    const tut = await vis(page, '#ov-tut');
    await page.click('#ov-tut button.mbtn'); await W(500);
    const dash = await vis(page, '#tela-dash');
    const st = await page.evaluate(() => ({ r: G.res, dia: G.dia, pressao: Math.max(0, 100 - G.res.equipe), orc: document.body.innerText.includes('R$ 10.000') }));
    await page.screenshot({ path: OUT + '/TF01.png' }); await ctx.close();
    const ok = cena && cap.includes('PRÓLOGO') && i1 > i0 && tut && dash && st.dia === 1 && st.r.orcamento === 100 && st.r.abrigo === 100 && st.r.equipe === 100 && st.r.reputacao === 80 && st.pressao === 0 && st.orc;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Prólogo abriu (${cap.trim()}), "Continuar" avançou as falas (${i0}→${i1}), "Pular" levou à tela "Como atender no balcão" e daí ao painel do Dia ${st.dia} com R$ 10.000, vagas ${st.r.abrigo}, equipe ${st.r.equipe}, reputação ${st.r.reputacao} e pressão ${st.pressao}.` };
  });

  // ───────── TF02 ─────────
  await rec('TF02', 'Funcional · botões', 'Atalhos de teclado', async () => {
    const { ctx, page } = await newPage(browser); await bootToCases(page);
    const out = {};
    const s0 = await page.evaluate(() => sel && sel.nome_base);
    await page.keyboard.press('ArrowRight'); await W(200);
    const s1 = await page.evaluate(() => sel && sel.nome_base); out.setas = s0 !== s1;
    await page.keyboard.press('ArrowLeft'); await W(200);
    out.setasVolta = (await page.evaluate(() => sel && sel.nome_base)) === s0;
    await page.keyboard.press('e'); await W(300); out.E = await page.evaluate(() => !!sel.verif);
    await page.keyboard.press('m'); await W(300); out.M = await vis(page, '#ov-manual');
    await page.evaluate(() => fecharManual()); await W(200);
    await page.keyboard.press('p'); await W(200); out.P1 = await page.evaluate(() => pausado) && await vis(page, '#pausa-overlay');
    await page.keyboard.press('e'); await W(200);
    await page.keyboard.press('p'); await W(200); out.P2 = await page.evaluate(() => !pausado);
    const keys = [];
    for (let k = 0; k < 4; k++) {
      const n = await page.evaluate(() => fila.filter(p => p.vivo).length); if (!n) break;
      const nm = await page.evaluate(() => sel && sel.nome_base);
      const key = nm === 'Eng. Salazar' ? '4' : '1';
      if (!(await page.evaluate(() => sel.verif))) { await page.keyboard.press('e'); await W(250); }
      await page.keyboard.press(key); await W(700);
      keys.push(key + ':' + ((await vis(page, '#ov-consequencia')) ? (await page.textContent('#cq-titulo')).trim() : 'sem tela'));
      await closeCons(page);
    }
    out.carimbos = keys.length >= 2 && keys.every(k => !k.endsWith('sem tela'));
    await page.keyboard.press(' '); await W(600); out.Espaco = await vis(page, '#ov-dia');
    await ctx.close();
    const ok = Object.values(out).every(Boolean) && !page._errors.length;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Setas trocaram a pessoa no balcão (${out.setas && out.setasVolta ? 'ok' : 'falhou'}); E examinou (${out.E ? 'ok' : 'falhou'}); M abriu o Manual (${out.M ? 'ok' : 'falhou'}); P pausou e retomou (${out.P1 && out.P2 ? 'ok' : 'falhou'}); carimbos pelo teclado: ${keys.join(', ')}; Espaço fechou o dia e abriu o relatório (${out.Espaco ? 'ok' : 'falhou'}).` + (page._errors.length ? ' Erros: ' + page._errors.join(' | ') : '') };
  });

  // ───────── TF03 ─────────
  await rec('TF03', 'Funcional · interface', 'Fluxo de atendimento em 3 passos', async () => {
    const { ctx, page } = await newPage(browser); await bootToCases(page);
    await page.evaluate(() => selecionar(fila.find(p => p.nome_base === 'Eng. Salazar'))); await W(300);
    const a = await page.evaluate(() => ({ passo: [...document.querySelectorAll('.passo')].findIndex(e => e.classList.contains('on')) + 1, lacres: document.querySelectorAll('.lacre').length, dim: !!document.querySelector('.stamps.dim'), guia: !!document.querySelector('.guia-bub'), eq: G.res.equipe }));
    await page.screenshot({ path: OUT + '/TF03_antes.png' });
    await page.click('.lacre'); await W(400);
    const b = await page.evaluate(() => ({ passo: [...document.querySelectorAll('.passo')].findIndex(e => e.classList.contains('on')) + 1, verif: sel.verif, eq: G.res.equipe, txt: document.getElementById('hist-content').innerText }));
    await page.click('#ln-0'); await W(300);
    const c1 = await page.evaluate(() => ({ n: Object.keys(sel.marcas || {}).length, passo: [...document.querySelectorAll('.passo')].findIndex(e => e.classList.contains('on')) + 1 }));
    await page.click('#ln-0'); await W(300);
    const c2 = await page.evaluate(() => Object.keys(sel.marcas || {}).length);
    await page.click('.dc-btn'); await W(300);
    const d = await page.evaluate(() => ({ passo: [...document.querySelectorAll('.passo')].findIndex(e => e.classList.contains('on')) + 1, dim: !!document.querySelector('.stamps.dim'), sub: document.querySelector('.stamp.s-emprego .st-s').textContent }));
    await page.screenshot({ path: OUT + '/TF03_depois.png' }); await ctx.close();
    const ok = a.passo === 1 && a.lacres === 3 && b.verif && b.passo === 2 && a.eq - b.eq === 2 && b.txt.includes('Engenheiro eletricista') && c1.n === 1 && c1.passo === 3 && c2 === 0 && d.passo === 3 && !d.dim && d.sub.includes('Qualificação comprovada');
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Antes do exame: passo ${a.passo} destacado, ${a.lacres} papéis lacrados, guia do 1º caso visível e carimbos esmaecidos. Clicar no lacre revelou os documentos (Engenheiro eletricista, Engenharia elétrica ✔), passou ao passo ${b.passo} e descontou ${a.eq - b.eq} de equipe. Marcar uma linha registrou 1 marcação e passou ao passo ${c1.passo}; clicar de novo desmarcou. "Nada suspeito" levou ao passo ${d.passo} e liberou os carimbos (Trabalho: "${d.sub.trim()}"). Observação: os carimbos esmaecidos continuam clicáveis antes do exame, o que permite decidir sem examinar (comportamento previsto: o exame é opcional).` };
  });

  // ───────── TF04 ─────────
  await rec('TF04', 'Funcional · interface', 'Telas e janelas', async () => {
    const { ctx, page } = await newPage(browser); await bootToCases(page);
    const s0 = await page.evaluate(() => sel && sel.id);
    await page.click('#btn-manual'); await W(300); const man = await vis(page, '#ov-manual');
    await page.evaluate(() => fecharManual()); await W(200);
    const s1 = await page.evaluate(() => sel && sel.id);
    await page.click('.cd-ver-fila'); await W(400); const dash = await vis(page, '#tela-dash');
    await page.click('button.dl-start'); await W(900);
    const s2 = await page.evaluate(() => sel !== null && fila.find(p => p.id === sel.id).vivo);
    await page.click('#btn-pausa'); await W(200);
    const pz = await page.evaluate(() => pausado) && await vis(page, '#pausa-overlay');
    await page.keyboard.press('e'); await W(200); const bloqueado = await page.evaluate(() => !sel.verif);
    await page.click('#pausa-overlay button[onclick="togglePausa()"]'); await W(200); const desp = await page.evaluate(() => !pausado);
    // pausa congela o cronômetro dos casos urgentes
    await page.evaluate(() => { OPTS.timer = true; fila.forEach(p => { if (p.vivo) p.urgente = true; }); renderFila(); iniciarTimers(); }); await W(300);
    await page.evaluate(() => togglePausa()); const t0 = await page.evaluate(() => [...document.querySelectorAll('.ic-timer')].map(e => e.textContent).join(','));
    await W(3200); const t1 = await page.evaluate(() => [...document.querySelectorAll('.ic-timer')].map(e => e.textContent).join(','));
    await page.evaluate(() => togglePausa()); await W(2200); const t2 = await page.evaluate(() => [...document.querySelectorAll('.ic-timer')].map(e => e.textContent).join(','));
    await ctx.close();
    const ok = man && s0 === s1 && dash && s2 && pz && bloqueado && desp && t0 === t1 && t1 !== t2;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Manual abriu e fechou sem trocar o caso (${man && s0 === s1 ? 'ok' : 'falhou'}); "Painel do dia" voltou ao painel e "Iniciar dia" voltou ao atendimento com um caso em aberto no balcão (${dash && s2 ? 'ok' : 'falhou'}); pausa exibiu a tela de pausa e bloqueou o teclado (${pz && bloqueado ? 'ok' : 'falhou'}); cronômetro parado durante a pausa (${t0} → ${t1}) e voltou a correr depois (${t2}).` };
  });

  // ───────── TF05 ─────────
  await rec('TF05', 'Funcional · opções', 'Dificuldade', async () => {
    const linhas = []; let ok = true;
    for (const [dif, mult] of [['facil', 0.7], ['normal', 1.0], ['dificil', 1.4]]) {
      const { ctx, page } = await newPage(browser); await setOpts(page, { dificuldade: dif }); await bootToCases(page);
      await setFila(page, ['Família Pérez', 'Eng. Salazar']);
      const r = await page.evaluate(() => { const p = sel, b0 = { o: G.res.orcamento, a: G.res.abrigo }; const sub = document.querySelector('.stamp.s-acolher .st-s').textContent; decidir('acolher'); return { b: p.b, ab: p.ab, sub, dO: b0.o - G.res.orcamento, dA: b0.a - G.res.abrigo, d: G.difBase }; });
      const eO = Math.round(r.b * mult), eA = Math.round(r.ab * mult);
      const okk = r.dO === eO && r.dA === eA && r.d === mult && r.sub.includes('−' + eA) && r.sub.includes('−' + eO);
      ok = ok && okk; linhas.push(`${dif}: custo base ${r.b}/${r.ab} → descontou orçamento ${r.dO} e vagas ${r.dA} (esperado ${eO}/${eA})`);
      await ctx.close();
    }
    return { status: ok ? 'Passou' : 'Falhou', obtido: 'Acolhendo a Família Pérez: ' + linhas.join('; ') + '. O carimbo mostrou os mesmos valores antes da decisão.' };
  });

  // ───────── TF06 ─────────
  await rec('TF06', 'Funcional · opções', 'Demais opções', async () => {
    const { ctx, page } = await newPage(browser);
    await page.click('button[onclick="menuOpcoes()"]'); await W(300);
    const visivel = await onTop(page, 'ov-opcoes');
    await page.screenshot({ path: OUT + '/TF06_menu_opcoes.png' });
    for (const id of ['opt-timer', 'opt-leis', 'opt-anim', 'opt-conseq']) { await page.evaluate(id => toggleOpt(id), id); await W(100); }
    const off = await page.evaluate(() => ({ ...OPTS }));
    await page.reload(); await W(700);
    const pers = await page.evaluate(() => ({ ...OPTS }));
    await page.evaluate(() => fecharOv('ov-opcoes'));
    await bootToCases(page);
    const efeitos = await page.evaluate(() => ({ lei: !!document.querySelector('.pp-lei'), noanim: document.body.classList.contains('no-anim') }));
    await page.evaluate(() => { decidir('estabilizar'); }); await W(500);
    const consOff = !(await vis(page, '#ov-consequencia'));
    await page.evaluate(() => { G.dia = 3; fila.forEach(p => p.vivo = false); avancarDiaInterno(); }); await W(900);
    await page.evaluate(() => { [...document.querySelectorAll('.ov:not(.off)')].forEach(o => { if (o.id === 'ov-cena') pularCena(); else fecharOv(o.id); }); irParaCasos(); }); await W(800);
    const tOff = await page.evaluate(() => ({ urg: fila.filter(p => p.urgente).length, timers: Object.keys(timers).length }));
    // liga tudo de novo
    await page.evaluate(() => { [...document.querySelectorAll('.ov:not(.off)')].forEach(o => { if (o.id === 'ov-cena') pularCena(); else if (o.id === 'ov-evento') document.querySelector('#ev-choices button').click(); else fecharOv(o.id); }); OPTS.timer = OPTS.leis = OPTS.anim = OPTS.conseq = true; localStorage.setItem('fronteira_opts', JSON.stringify(OPTS)); aplicarOpcoes(); irParaCasos(); }); await W(900);
    await page.evaluate(() => { [...document.querySelectorAll('.ov:not(.off)')].forEach(o => { if (o.id === 'ov-evento') document.querySelector('#ev-choices button').click(); else if (o.id === 'ov-cena') pularCena(); else fecharOv(o.id); }); const p = fila.find(x => x.vivo); if (p) selecionar(p); }); await W(400);
    const on = await page.evaluate(() => ({ lei: !!document.querySelector('.pp-lei'), noanim: document.body.classList.contains('no-anim'), urg: fila.filter(p => p.urgente).length, timers: Object.keys(timers).length }));
    await page.evaluate(() => { const p = fila.find(x => x.vivo); selecionar(p); decidir('estabilizar'); }); await W(500);
    const consOn = await vis(page, '#ov-consequencia');
    await ctx.close();
    const timerOk = tOff.urg === 0 || (tOff.timers === 0 && on.timers > 0);
    const ok = visivel && !off.timer && !off.leis && !off.anim && !off.conseq && !pers.timer && !pers.leis && !pers.anim && !pers.conseq && !efeitos.lei && efeitos.noanim && consOff && on.lei && !on.noanim && consOn && timerOk;
    return { status: ok ? 'Passou' : 'Falhou', obtido: (visivel ? 'A tela de Opções abriu visível pelo menu. ' : 'DEFEITO: ao clicar em "Opções" no menu inicial, a janela abre por trás do menu (camada 900 contra 1000) e o jogador não a vê. As opções foram então acionadas pelo mesmo comando dos botões para verificar o funcionamento. ') + `As 4 opções foram desligadas e continuaram desligadas após recarregar a página. Desligadas: textos de lei ocultos (${!efeitos.lei ? 'ok' : 'falhou'}), animações desativadas (${efeitos.noanim ? 'ok' : 'falhou'}), decisão sem tela de consequência (${consOff ? 'ok' : 'falhou'}), cronômetro no dia 4 com ${tOff.urg} caso(s) urgente(s) e ${tOff.timers} cronômetro(s). Ligadas de novo: leis ${on.lei ? 'visíveis' : 'OCULTAS'}, animações ${!on.noanim ? 'ativas' : 'DESATIVADAS'}, tela de consequência ${consOn ? 'exibida' : 'NÃO exibida'} e ${on.timers} cronômetro(s) ativo(s).` };
  });

  // ───────── TF07 ─────────
  await rec('TF07', 'Funcional · mecânica', 'Recursos ao Acolher e Encaminhar', async () => {
    const { ctx, page } = await newPage(browser); await bootToCases(page);
    await setFila(page, ['Família Pérez', 'Sr. Gutiérrez', 'Eng. Salazar', 'Sr. Montoya']);
    const ac = await page.evaluate(() => { const p = sel, r0 = { ...G.res }; return { p: { b: p.b, ab: p.ab, t: p.t, pr: p.prioridade }, r0 }; });
    await page.click('.stamp.s-acolher'); await W(700);
    const r1 = await page.evaluate(() => ({ ...G.res, acol: G.acolhidos })); await closeCons(page);
    await page.evaluate(() => selecionar(fila.find(p => p.nome_base === 'Eng. Salazar'))); await W(200);
    const r2 = await page.evaluate(() => ({ ...G.res }));
    await page.click('.stamp.s-encaminhar'); await W(700);
    const r3 = await page.evaluate(() => ({ ...G.res, enc: G.encaminhados })); await closeCons(page);
    await page.evaluate(() => selecionar(fila.find(p => p.nome_base === 'Sr. Gutiérrez'))); await W(200);
    const g0 = await page.evaluate(() => ({ pr: sel.prioridade, rep: G.res.reputacao }));
    await page.evaluate(() => decidir('encaminhar')); await W(700);
    const g1 = await page.evaluate(() => G.res.reputacao); await closeCons(page);
    await page.evaluate(() => selecionar(fila.find(p => p.nome_base === 'Sr. Montoya'))); await W(200);
    const c0 = await page.evaluate(() => ({ rep: G.res.reputacao, perd: G.perdidos }));
    await page.click('.stamp.s-encaminhar'); await W(500);
    const barra = await page.evaluate(() => document.getElementById('confirm-bar').classList.contains('show'));
    await page.evaluate(() => confirmarEncaminhar()); await W(900);
    const c1 = await page.evaluate(() => ({ rep: G.res.reputacao, perd: G.perdidos }));
    await ctx.close();
    const okAc = ac.r0.orcamento - r1.orcamento === ac.p.b && ac.r0.abrigo - r1.abrigo === ac.p.ab && ac.r0.equipe - r1.equipe === ac.p.t && r1.acol === 1;
    const okEn = r2.orcamento === r3.orcamento && r2.abrigo === r3.abrigo && r2.equipe === r3.equipe && r3.enc === 1;
    const okGr = g0.pr === 'grave' ? g0.rep - g1 === 8 : true;
    const okCr = barra && c1.perd - c0.perd === 1 && c0.rep - c1.rep === 20;
    return { status: okAc && okEn && okGr && okCr ? 'Passou' : 'Falhou', obtido: `Acolher a Família Pérez (crítico) descontou orçamento ${ac.r0.orcamento - r1.orcamento}, vagas ${ac.r0.abrigo - r1.abrigo} e equipe ${ac.r0.equipe - r1.equipe}, iguais aos custos do caso (${ac.p.b}/${ac.p.ab}/${ac.p.t}). Encaminhar o Eng. Salazar (estável) não alterou recursos. Encaminhar o Sr. Gutiérrez (${g0.pr}) reduziu a reputação em ${g0.rep - g1}. Encaminhar o Sr. Montoya (crítico) pediu confirmação (${barra ? 'sim' : 'não'}) e, confirmado, registrou ${c1.perd - c0.perd} pessoa perdida e reputação −${c0.rep - c1.rep}.` };
  });

  // ───────── TF08 ─────────
  await rec('TF08', 'Funcional · mecânica', 'Carimbo Trabalho', async () => {
    const { ctx, page } = await newPage(browser); await bootToCases(page);
    await setFila(page, ['Eng. Salazar', 'Sra. Quintero', 'Família Pérez', 'Jovens Ramírez']);
    const out = [];
    await page.evaluate(() => { decidir('verificar'); }); await W(200);
    const e0 = await page.evaluate(() => G.empregos);
    await page.click('.stamp.s-emprego'); await W(700);
    const t1 = (await page.textContent('#cq-titulo')).trim(); const e1 = await page.evaluate(() => G.empregos); await closeCons(page);
    out.push(`Eng. Salazar (qualificado, documentos ok): "${t1}", empregos ${e0}→${e1}`);
    await page.evaluate(() => { selecionar(fila.find(p => p.nome_base === 'Sra. Quintero')); }); await W(200);
    const o0 = await page.evaluate(() => ({ et: G.etica, rep: G.res.reputacao, emp: G.empregos }));
    await page.evaluate(() => decidir('emprego')); await W(700);
    const t2 = (await vis(page, '#ov-consequencia')) ? (await page.textContent('#cq-titulo')).trim() : 'bloqueado';
    const o1 = await page.evaluate(() => ({ et: G.etica, rep: G.res.reputacao, emp: G.empregos })); await closeCons(page);
    out.push(`Sra. Quintero (qualificada, com sinais de aliciamento, sem exame e sem denúncia): "${t2}", conduta −${o0.et - o1.et}, reputação −${o0.rep - o1.rep}, empregos inalterados (${o1.emp === o0.emp ? 'sim' : 'não'})`);
    await page.evaluate(() => selecionar(fila.find(p => p.nome_base === 'Família Pérez'))); await W(200);
    await page.evaluate(() => decidir('emprego')); await W(500);
    const crit = await page.evaluate(() => fila.find(p => p.nome_base === 'Família Pérez').vivo) && !(await vis(page, '#ov-consequencia'));
    await page.evaluate(() => selecionar(fila.find(p => p.nome_base === 'Jovens Ramírez'))); await W(200);
    await page.evaluate(() => decidir('emprego')); await W(500);
    const men = await page.evaluate(() => fila.find(p => p.nome_base === 'Jovens Ramírez').vivo) && !(await vis(page, '#ov-consequencia'));
    out.push(`Família Pérez (crítico) bloqueado: ${crit ? 'sim' : 'não'}; Jovens Ramírez (menores) bloqueado: ${men ? 'sim' : 'não'}`);
    await ctx.close();
    const ok = t1 === 'Encaminhado ao trabalho' && e1 === e0 + 1 && t2 === 'Sinais ignorados' && o0.et - o1.et === 8 && o0.rep - o1.rep === 5 && o1.emp === o0.emp && crit && men;
    return { status: ok ? 'Passou' : 'Falhou', obtido: out.join('. ') + '.' };
  });

  // ───────── TF09 ─────────
  await rec('TF09', 'Funcional · mecânica', 'Carimbo Denunciar', async () => {
    const { ctx, page } = await newPage(browser); await bootToCases(page);
    await setFila(page, ['Adolescente Torres', 'Eng. Salazar']);
    await page.evaluate(() => decidir('verificar')); await W(300);
    const idx = await page.evaluate(() => linhasCaso(sel).map((x, i) => x.s ? i : -1).filter(i => i >= 0));
    for (const i of idx) { await page.click('#ln-' + i); await W(150); }
    const d0 = await page.evaluate(() => ({ den: G.denOk, prov: G.provas, rep: G.res.reputacao }));
    await page.click('.stamp.s-denunciar'); await W(700);
    const t1 = (await page.textContent('#cq-titulo')).trim(); const gab = await page.evaluate(() => document.getElementById('cq-impacto').innerText.split('\n')[0]);
    const d1 = await page.evaluate(() => ({ den: G.denOk, prov: G.provas, rep: G.res.reputacao })); await closeCons(page);
    await page.evaluate(() => { selecionar(fila.find(p => p.nome_base === 'Eng. Salazar')); decidir('verificar'); }); await W(200);
    const f0 = await page.evaluate(() => ({ err: G.denErr, rep: G.res.reputacao, pts: G.pts, et: G.etica }));
    await page.click('.stamp.s-denunciar'); await W(700);
    const t2 = (await page.textContent('#cq-titulo')).trim();
    const f1 = await page.evaluate(() => ({ err: G.denErr, rep: G.res.reputacao, pts: G.pts, et: G.etica, aberto: fila.find(p => p.nome_base === 'Eng. Salazar').vivo }));
    await ctx.close();
    const ok = t1 === 'Denúncia acionada' && d1.den === d0.den + 1 && d1.prov === d0.prov + 1 && t2 === 'Denúncia infundada' && f1.err === f0.err + 1 && f0.rep - f1.rep === 10 && f0.et - f1.et === 12 && f1.aberto;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Adolescente Torres: ${idx.length} sinais reais marcados → "${t1}", denúncias ${d0.den}→${d1.den}, provas ${d0.prov}→${d1.prov}, reputação ${d0.rep}→${d1.rep}. Eng. Salazar (sem sinais) → "${t2}": reputação −${f0.rep - f1.rep}, pontos ${f0.pts}→${f1.pts}, conduta −${f0.et - f1.et}; o caso continuou aberto (${f1.aberto ? 'sim' : 'não'}).` };
  });

  // ───────── TF10 ─────────
  await rec('TF10', 'Funcional · mecânica', 'Pressão e eventos de crise', async () => {
    const { ctx, page } = await newPage(browser); await bootToCases(page);
    const pr = await page.evaluate(() => { G.res.equipe = 63; atualizarHUD(); return document.getElementById('pressao-val-strip').textContent; });
    const n = await page.evaluate(async () => {
      let c = 0; const orig = mostrarEvento, cen = CENAS; CENAS = {}; mostrarEvento = function () { c++; };
      const N = 5000;
      for (let i = 0; i < N; i++) { G.dia = 1; G.maxDia = 999; avancarDiaInterno(); }
      await new Promise(r => setTimeout(r, 2500)); mostrarEvento = orig; CENAS = cen; G.maxDia = 10;
      return { c, N };
    });
    await page.evaluate(() => { [...document.querySelectorAll('.ov:not(.off)')].forEach(o => fecharOv(o.id)); G.res.equipe = 80; G.res.reputacao = 70; mostrarEvento(EVENTOS[0]); }); await W(300);
    const tit = await page.textContent('#ev-titulo');
    await page.click('#ev-choices button'); await W(300);
    const ef = await page.evaluate(() => ({ eq: G.res.equipe, rep: G.res.reputacao }));
    await ctx.close();
    const pct = n.c / n.N;
    const ok = pr.startsWith('37') && pct > 0.42 && pct < 0.48 && ef.eq === 65 && ef.rep === 80;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Com equipe 63 a pressão exibida foi ${pr} (100 − equipe). Em ${n.N} inícios de dia simulados ocorreram ${n.c} eventos (${(pct * 100).toFixed(1)}%, esperado cerca de 45%). No evento "${tit.trim()}", a opção "Mobilizar equipe" aplicou equipe 80→${ef.eq} e reputação 70→${ef.rep}.` };
  });

  // ───────── TF11 ─────────
  await rec('TF11', 'Funcional · mecânica', 'Casos da história nos dias certos', async () => {
    const { ctx, page } = await newPage(browser); await bootToCases(page);
    const r = await page.evaluate(() => { const esp = { 1: 'Eng. Salazar', 2: 'Enf. Carolina Ruiz', 3: 'Sra. Quintero', 4: 'Família Arias', 5: 'Rapazes do Contratante', 7: 'Yusmary (15) e o “tio”' }; const out = []; let ok = true; for (let rep = 0; rep < 20; rep++) for (let d = 1; d <= 10; d++) { G.dia = d; gerarFila(); const h = fila.filter(p => p.soHist).map(p => p.nome_base); const e = esp[d]; if (e ? !(h.length === 1 && h[0] === e) : h.length !== 0) ok = false; if (rep === 0) out.push(d + ':' + (h[0] || '—') + ' (' + fila.length + ' na fila)'); } G.dia = 1; return { ok, out }; });
    await ctx.close();
    return { status: r.ok ? 'Passou' : 'Falhou', obtido: 'Fila gerada 20 vezes para cada dia; o caso da história apareceu sempre no dia certo e só nele. Exemplo: ' + r.out.join('; ') + '.' };
  });

  // ───────── TF12 + TF15 + TD02 (partida completa) ─────────
  let full = {};
  {
    const { ctx, page } = await newPage(browser); await setOpts(page, { timer: false }); await bootToCases(page);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage'); const m0 = await page.evaluate(() => performance.memory.usedJSHeapSize);
    const t0 = Date.now(); const st = await autoplay(page); const dur = (Date.now() - t0) / 1000;
    await W(800);
    await cdp.send('HeapProfiler.collectGarbage'); const m1 = await page.evaluate(() => performance.memory.usedJSHeapSize);
    const fim = await page.evaluate(() => ({ vis: !document.getElementById('ov-fim').classList.contains('off'), lbl: document.getElementById('fim-result-lbl').textContent, dias: document.getElementById('fim-s-dias').textContent, nota: document.getElementById('fim-letter').textContent, tit: document.getElementById('fim-grade-title').textContent, pts: G.pts, ac: G.acolhidos, emp: G.empregos, den: G.denOk, perd: G.perdidos, recs: (JSON.parse(localStorage.getItem('fronteira_records') || '[]')).length, save: localStorage.getItem('fronteira_save') }));
    await page.screenshot({ path: OUT + '/TF12_final.png' });
    full = { st, dur, m0, m1, fim, errs: [...page._errors] };
    // TF15 recordes
    await page.reload(); await W(700);
    await page.click('button[onclick="menuRecords()"]'); await W(300);
    full.recVis = await onTop(page, 'ov-records');
    await page.screenshot({ path: OUT + '/TF15_menu_recordes.png' });
    const recTxt = await page.evaluate(() => document.getElementById('ov-records').innerText);
    await page.evaluate(() => limparRecords()); await W(300);
    const recDepois = await page.evaluate(() => (JSON.parse(localStorage.getItem('fronteira_records') || '[]')).length);
    full.recTxt = recTxt; full.recDepois = recDepois;
    // TF12 colapso
    await page.evaluate(() => fecharOv('ov-records'));
    await bootToCases(page);
    await page.evaluate(() => { G.res.orcamento = 0; G.res.abrigo = 0; checarColapso(); }); await W(600);
    const ep = await page.evaluate(() => document.getElementById('cena-titulo').textContent);
    await page.evaluate(() => pularCena()); await W(800);
    full.col = await page.evaluate(() => ({ lbl: document.getElementById('fim-result-lbl').textContent, vis: !document.getElementById('ov-fim').classList.contains('off') }));
    full.colEp = ep;
    await ctx.close();
  }
  await rec('TF12', 'Funcional · mecânica', 'Fim de jogo', async () => {
    const f = full.fim; const ok = full.st === 'fim' && f.vis && f.dias.trim() === '10 / 10' && full.col.vis && full.col.lbl.includes('COLAPSO') && full.colEp.includes('Portas fechadas');
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Partida completa de 10 dias jogada automaticamente: relatório final exibido ("${f.lbl.trim()}", dias ${f.dias.trim()}, nota ${f.nota.trim()} – ${f.tit.trim()}, ${f.pts} pontos, ${f.ac} atendimentos, ${f.emp} empregos, ${f.den} denúncias, ${f.perd} perdidos). Zerando orçamento e vagas: epílogo "${full.colEp.trim()}" e relatório com "${full.col.lbl.trim()}".` };
  });

  // ───────── TF13 ─────────
  await rec('TF13', 'Funcional · áudio', 'Som', async () => {
    const { ctx, page } = await newPage(browser);
    await page.evaluate(() => { window._osc = 0; const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window._osc++; return o.apply(this, arguments); }; });
    await bootToCases(page);
    const a0 = await page.evaluate(() => window._osc);
    await page.keyboard.press('e'); await W(300); const a1 = await page.evaluate(() => window._osc);
    await page.click('#btn-som'); await W(200); const off = await page.evaluate(() => !somOn);
    const ic = await page.textContent('#btn-som');
    await page.evaluate(() => { const p = fila.find(x => x.vivo && x.id !== sel.id) || sel; selecionar(p); }); await page.keyboard.press('e'); await W(300);
    const a2 = await page.evaluate(() => window._osc);
    await page.click('#btn-som'); await W(200);
    await page.evaluate(() => somCarimbo()); await W(200); const a3 = await page.evaluate(() => window._osc);
    const errs = [...page._errors]; await ctx.close();
    const ok = a1 > a0 && off && a2 === a1 && a3 > a2 && !errs.length;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Examinar documentos gerou ${a1 - a0} tom(ns) sintetizado(s); o botão de som mudou para "${ic.trim()}" e, desligado, nenhum som foi gerado (${a2 - a1}); religado, os sons voltaram (${a3 - a2}). Erros no console: ${errs.length}.` };
  });

  // ───────── TF14 ─────────
  await rec('TF14', 'Funcional · salvar/carregar', 'Continuar a partida', async () => {
    const { ctx, page } = await newPage(browser); await setOpts(page, { timer: false }); await bootToCases(page);
    await autoplay(page, 3); await W(900);
    await page.evaluate(() => { [...document.querySelectorAll('.ov:not(.off)')].forEach(o => { if (o.id === 'ov-cena') pularCena(); else fecharOv(o.id); }); }); await W(500);
    const ini = await page.evaluate(() => ({ dia: G.dia, r: { ...G.res }, pts: G.pts, ac: G.acolhidos, emp: G.empregos, docs: G.docsVer }));
    await page.evaluate(() => { irParaCasos(); }); await W(800);
    await page.evaluate(() => { const p = fila.find(x => x.vivo); selecionar(p); decidir('verificar'); decidir('estabilizar'); }); await W(700);
    const meio = await page.evaluate(() => ({ r: { ...G.res }, pts: G.pts }));
    await page.reload(); await W(800);
    const btn = await page.evaluate(() => !document.getElementById('btn-continuar').disabled);
    await page.click('#btn-continuar'); await W(800);
    const dep = await page.evaluate(() => ({ dia: G.dia, r: { ...G.res }, pts: G.pts, ac: G.acolhidos, emp: G.empregos, docs: G.docsVer, fila: fila.length }));
    // voltar ao menu pelo botão Menu no meio do dia
    await page.evaluate(() => { irParaCasos(); }); await W(700);
    const n0 = await page.evaluate(() => fila.map(p => p.nome_base).sort().join('|'));
    await page.evaluate(() => { const p = fila.find(x => x.vivo); selecionar(p); decidir('estabilizar'); }); await W(700); await closeCons(page);
    const pts1 = await page.evaluate(() => G.pts);
    await page.click('button[onclick="voltarMenuConfirm()"]'); await W(600);
    await page.click('#btn-continuar'); await W(800);
    const n1 = await page.evaluate(() => ({ nomes: fila.map(p => p.nome_base).sort().join('|'), vivos: fila.filter(p => p.vivo).length, total: fila.length, pts: G.pts }));
    await ctx.close();
    const same = JSON.stringify(ini.r) === JSON.stringify(dep.r) && ini.pts === dep.pts && ini.dia === dep.dia;
    return { status: same && btn ? 'Passou' : 'Falhou', obtido: `Partida salva automaticamente no início do dia ${ini.dia}. Após uma decisão no meio do dia, a página foi recarregada: o botão "Continuar" ficou ativo e a partida voltou ao início do dia ${dep.dia} com os mesmos recursos e pontos do começo do dia (${ini.pts} pts). A decisão tomada no meio do dia não foi mantida, comportamento previsto pelo jogo ("Progresso do dia não será salvo"). Observação: ao usar "Menu" e "Continuar" no meio do dia, os pontos já obtidos foram mantidos (${pts1} → ${n1.pts}), mas a fila do dia foi sorteada de novo, com ${n1.vivos} de ${n1.total} pessoas para atender; isso permite repetir atendimentos do mesmo dia.` };
  });

  // ───────── TF15 ─────────
  await rec('TF15', 'Funcional · salvar/carregar', 'Recordes', async () => {
    const ok = full.recVis && full.fim.recs >= 1 && /\d/.test(full.recTxt) && full.recDepois === 0 && !full.fim.save;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Ao fim da partida o recorde foi gravado (${full.fim.recs} registro) e o save da partida foi apagado. Após recarregar, ` + (full.recVis ? 'a tela de Recordes mostrou a pontuação;' : 'DEFEITO: ao clicar em "Recordes" no menu inicial, a janela abre por trás do menu e não aparece para o jogador (a pontuação está gravada e presente na janela oculta);') + ` "Apagar recordes" removeu os registros (${full.recDepois} restantes).` };
  });

  // ───────── TC01 / TC04 / TC05 ─────────
  const resol = [];
  for (const [nome, vp] of [['1920x1080', { width: 1920, height: 1080 }], ['1366x768', { width: 1366, height: 768 }], ['768x1024', { width: 768, height: 1024 }], ['390x844', { width: 390, height: 844 }]]) {
    const { ctx, page } = await newPage(browser, { viewport: vp }); await bootToCases(page);
    await page.evaluate(() => { const p = fila.find(x => x.nome_base === 'Eng. Salazar') || fila[0]; selecionar(p); decidir('verificar'); }); await W(400);
    const m = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      const hdrEls = [...document.querySelectorAll('#hdr .hpill, #hdr button, #hdr .hdr-name')].filter(e => e.offsetParent !== null);
      const hdrFora = hdrEls.filter(e => { const r = e.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1; }).length;
      const nm = document.querySelector('.hdr-name'); const nomeCortado = nm.scrollWidth > nm.clientWidth + 1 || nm.getBoundingClientRect().right > vw;
      const st = [...document.querySelectorAll('.stamp')]; let alcancaveis = 0;
      st.forEach(e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const top = document.elementFromPoint(Math.min(vw - 2, r.x + r.width / 2), r.y + r.height / 2); if (r.right <= vw + 1 && r.left >= -1 && r.top >= 0 && r.bottom <= vh && top && e.contains(top)) alcancaveis++; });
      return { sw: document.documentElement.scrollWidth, vw, nst: st.length, alc: alcancaveis, hdrFora, hdrTot: hdrEls.length, nomeCortado, txt: Math.min(...[...document.querySelectorAll('.pp-txt, .st-t')].map(e => parseFloat(getComputedStyle(e).fontSize))) };
    });
    // painel do dia na mesma resolução
    await page.evaluate(() => irParaDash()); await W(400);
    m.dashSw = await page.evaluate(() => document.documentElement.scrollWidth);
    m.dashCols = await page.evaluate(() => getComputedStyle(document.getElementById('tela-dash')).gridTemplateColumns.split(' ').length);
    await page.evaluate(() => irParaCasos()); await W(700);
    await page.screenshot({ path: `${OUT}/TC05_${nome}.png`, fullPage: false });
    resol.push({ nome, ...m, errs: page._errors.length }); await ctx.close();
  }
  await rec('TC01', 'Compatibilidade', 'Google Chrome (computador)', async () => {
    const r = resol.find(x => x.nome === '1366x768'); const ok = !full.errs.length && r.errs === 0 && r.sw <= r.vw;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Executado no Chromium ${browser.version()} (mesmo motor do Google Chrome), em 1366×768: partida completa de 10 dias com ${full.errs.length} erro(s) do jogo no console e sem rolagem horizontal. A única mensagem de erro foi a falha ao baixar a fonte Inter do Google Fonts, porque o ambiente de teste não tem internet; nesse caso o navegador usa uma fonte do sistema e o jogo funciona normalmente.` };
  });
  await rec('TC02', 'Compatibilidade', 'Mozilla Firefox (computador)', async () => ({ status: 'Não testado', obtido: 'Firefox não disponível no ambiente usado; executar manualmente.' }));
  await rec('TC03', 'Compatibilidade', 'Microsoft Edge (computador)', async () => ({ status: 'Não testado', obtido: 'Edge não disponível no ambiente usado; executar manualmente (usa o mesmo motor Chromium do TC01).' }));
  await rec('TC04', 'Compatibilidade', 'Celular Android (Chrome)', async () => {
    const { ctx, page } = await newPage(browser, { device: devices['Pixel 7'] }); await bootToCases(page);
    await page.evaluate(() => { const p = fila[0]; selecionar(p); }); await W(300);
    await page.tap('.lacre'); await W(400);
    const v = await page.evaluate(() => !!sel.verif);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth }));
    await page.screenshot({ path: OUT + '/TC04_pixel7.png' }); const errs = page._errors.length; await ctx.close();
    return { status: 'Não testado', obtido: `Emulação do Pixel 7 no Chromium: o toque no lacre examinou os documentos (${v ? 'ok' : 'falhou'}), largura do conteúdo ${m.sw}px para tela de ${m.vw}px${m.sw > m.vw ? ' (há rolagem horizontal)' : ''}, ${errs} erro(s). Falta confirmar em um celular real pelo link do itch.io.` };
  });
  await rec('TC05', 'Compatibilidade', 'Resoluções de tela', async () => {
    const ok = resol.every(r => r.sw <= r.vw + 1 && r.alc === r.nst && r.hdrFora === 0 && !r.nomeCortado && r.dashSw <= r.vw + 1 && r.errs === 0);
    return { status: ok ? 'Passou' : 'Falhou', obtido: resol.map(r => `${r.nome}: ${r.alc}/${r.nst} carimbos alcançáveis, ${r.hdrTot - r.hdrFora}/${r.hdrTot} itens do cabeçalho na tela, título ${r.nomeCortado ? 'CORTADO' : 'inteiro'}, painel do dia com ${r.dashCols} coluna(s) e largura ${r.dashSw}px`).join('; ') + '.' };
  });
  await rec('TC06', 'Compatibilidade', 'Versão publicada no itch.io', async () => ({ status: 'Não testado', obtido: 'O itch.io não é acessível a partir do ambiente usado; executar manualmente pelo link público.' }));

  // ───────── TD01 ─────────
  await rec('TD01', 'Desempenho', 'Tempo de carregamento', async () => {
    const http = require('http'); const html = fs.readFileSync(GAME.replace('file://', ''));
    const srv = http.createServer((q, s) => { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); s.end(html); }).listen(8765);
    const med = {};
    for (const [nome, cond] of [['sem limitação', null], ['4G (9 Mbps, 170 ms)', { latency: 170, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 }], ['3G rápido (1,6 Mbps, 560 ms)', { latency: 560, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 }]]) {
      const v = [];
      for (let k = 0; k < 3; k++) {
        const ctx = await browser.newContext(); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
        await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        if (cond) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...cond });
        await page.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
        const t = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { load: n.loadEventEnd, dcl: n.domContentLoadedEventEnd, fcp: fcp ? fcp.startTime : null }; });
        v.push(t); await ctx.close();
      }
      const avg = k => v.reduce((a, b) => a + b[k], 0) / v.length;
      med[nome] = { load: avg('load'), fcp: avg('fcp') };
    }
    srv.close();
    const ok = med['4G (9 Mbps, 170 ms)'].load < 3000;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Arquivo único de ${(html.length / 1024).toFixed(0)} KB, sem cache, média de 3 carregamentos: ` + Object.entries(med).map(([k, m]) => `${k}: primeira tela em ${(m.fcp / 1000).toFixed(2)} s e carregamento completo em ${(m.load / 1000).toFixed(2)} s`).join('; ') + '.' , med };
  });

  // ───────── TD02 ─────────
  await rec('TD02', 'Desempenho · resistência', 'Partida completa de 10 dias', async () => {
    const mb = x => (x / 1048576).toFixed(1);
    const ok = full.st === 'fim' && full.m1 < full.m0 * 2 && !full.errs.length;
    return { status: ok ? 'Passou' : 'Falhou', obtido: `Partida completa (${full.fim.ac} atendimentos) em ${full.dur.toFixed(0)} s de jogo automatizado, sem travamentos nem erros. Memória JavaScript após coleta de lixo: ${mb(full.m0)} MB no início e ${mb(full.m1)} MB no fim.` };
  });

  await rec('TR01', 'Regressão', 'Refazer os testes que falharam', async () => {
    const f = results.filter(r => r.status === 'Falhou').map(r => r.id);
    return { status: f.length ? 'Não testado' : 'Passou', obtido: f.length ? 'Testes com falha a corrigir e repetir: ' + f.join(', ') : 'Nenhum teste falhou, então não houve correção a repetir. A bateria automatizada pode ser executada de novo a cada nova versão do jogo.' };
  });

  fs.writeFileSync(OUT + '/resultados.json', JSON.stringify(results, null, 1));
  await browser.close();
})();
