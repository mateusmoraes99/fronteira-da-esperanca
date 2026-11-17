/**
 * Varredura da versão em espanhol: joga uma partida completa (menu, opções,
 * recordes, prólogo, manual, os 10 dias, eventos, cenas e relatório final) e
 * coleta todos os textos exibidos na tela. Depois procura palavras típicas do
 * português que tenham ficado sem tradução.
 * Saída (usada pelo teste TL02):
 *   resultados/textos_vistos_es.json   todos os textos diferentes exibidos
 *   resultados/restos_portugues_es.json textos suspeitos de estar em português
 */
const {chromium}=require('playwright');const fs=require('fs');
const path = require('path'); const { pathToFileURL } = require('url');
const GAME = process.env.GAME || pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUT = process.env.OUT || path.join(__dirname, 'resultados');
fs.mkdirSync(OUT,{recursive:true});
const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:768}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto(GAME);await W(500);
await p.evaluate(()=>{localStorage.setItem('fronteira_lang','es');localStorage.setItem('fronteira_opts',JSON.stringify({dificuldade:'normal',timer:false,leis:true,anim:true,conseq:true}));});await p.reload();await W(800);
const seen=new Set();const grab=async()=>{const t=await p.evaluate(()=>{const out=[];document.querySelectorAll('body *').forEach(e=>{if(e.children.length===0||e.childNodes.length){[...e.childNodes].forEach(n=>{if(n.nodeType===3&&n.nodeValue.trim())out.push(n.nodeValue.trim());});}});['title'].forEach(a=>document.querySelectorAll('['+a+']').forEach(e=>out.push(e.getAttribute(a))));return out;});t.forEach(x=>seen.add(x));};
await grab();
// abre janelas do menu
for(const f of ['menuOpcoes()','menuRecords()']){await p.evaluate(f);await W(300);await grab();await p.evaluate(()=>document.querySelectorAll('.ov:not(.off)').forEach(o=>fecharOv(o.id)));}
await p.click('button[onclick="menuJogar()"]');await W(400);
// percorre o prólogo
for(let i=0;i<20;i++){await grab();const open=await p.evaluate(()=>!document.getElementById('ov-cena').classList.contains('off'));if(!open)break;await p.evaluate(()=>{CENA.digitando=false;proxFala();});await W(150);}
await grab();await p.evaluate(()=>{const b=document.querySelector('#ov-tut button.mbtn');if(b)b.click();});await W(400);await grab();
await p.evaluate(()=>abrirManual());await W(200);await grab();await p.evaluate(()=>fecharManual());
// joga a partida inteira com decisões variadas
const acts=['acolher','estabilizar','encaminhar','emprego','denunciar'];let k=0;
for(let i=0;i<900;i++){const st=await p.evaluate(()=>{
  if(G.encerrando){const oc=document.getElementById('ov-cena');if(oc&&!oc.classList.contains('off')){CENA.digitando=false;if(CENA.c.escolhas&&CENA.i>=CENA.c.falas.length-1)escolherCena(0);else proxFala();return 'cena';}return document.getElementById('ov-fim').classList.contains('off')?'enc':'fim';}
  const open=[...document.querySelectorAll('.ov:not(.off)')].map(o=>o.id);
  if(open.includes('ov-consequencia')){fecharConsequencia();return 'c';}
  if(open.includes('ov-dia')){if(window._rd!==G.dia){window._rd=G.dia;fecharRelDia();}return 'd';}
  if(open.includes('ov-upgrade')){if(window._up!==G.dia){window._up=G.dia;document.querySelector('#upg-grid .upg-card').click();}return 'u';}
  if(open.includes('ov-evento')){document.querySelector('#ev-choices button').click();return 'e';}
  if(open.includes('ov-cena')){CENA.digitando=false;if(CENA.c.escolhas&&CENA.i>=CENA.c.falas.length-1){escolherCena(G.dia===8?2:0);}else proxFala();return 's';}
  if(open.length){open.forEach(id=>fecharOv(id));return 'o';}
  if(document.getElementById('tela-caso').style.display==='none'){irParaCasos();return 'go';}
  const v=fila.filter(p=>p.vivo);if(!v.length){if(window._pd===G.dia)return 'w';window._pd=G.dia;proximoDia();return 'n';}
  return 'case';});
  await grab();
  if(st==='fim'){break;}
  if(st==='case'){const a=acts[k++%acts.length];await p.evaluate(a=>{const p=fila.find(x=>x.vivo);selecionar(p);if(Math.random()<.7)decidir('verificar');const m=metaCaso(p);linhasCaso(p).forEach((x,i)=>{if(x.s||Math.random()<.2){p.marcas=p.marcas||{};p.marcas[i]=true;}});decidir(a);if(fila.find(x=>x===p&&x.vivo)){if(document.getElementById('confirm-bar').classList.contains('show'))confirmarEncaminhar();else decidir('estabilizar');}},a);await W(120);await grab();}
  await W(st==='n'?600:150);
}
await grab();await p.screenshot({path:path.join(OUT,'es_final.png')});
const pt=/[ãõçêâô]|ÇÃO|\b(você|Você|não|Não|ACOLHER|ENCAMINHAR|TRABALHO|ASSISTÊNCIA|CARIMB|abrigo|Abrigo|pessoa|Pessoa|Orçamento|Equipe|Vagas|Pressão|Denúncia|Encaminh|Acolh|conferi|Conferi|Caderno|também|está|muito|ainda|então|obrigado|aqui|Fechar|Voltar|Jogar|Recordes|Opções|Dia \d|DIA \d|dias|horas)\b/;
const hits=[...seen].filter(t=>pt.test(t)&&!/Carteira de Trabalho|Maria da Penha|Ligue 180|Disque 100|São|Operação Acolhida/.test(t));
fs.writeFileSync(path.join(OUT,'textos_vistos_es.json'),JSON.stringify([...seen]));fs.writeFileSync(path.join(OUT,'restos_portugues_es.json'),JSON.stringify(hits,null,1));
console.log('textos vistos',seen.size,'suspeitos de português',hits.length,'erros',errs.length,errs.slice(0,3));
hits.slice(0,80).forEach(h=>console.log(' •',h.slice(0,160)));
await b.close();})();
