/* ═══════════════════════════════════════════════════════════════════════
   FRONTEIRA DA ESPERANÇA — código do jogo
   Jogo sério de gestão humanitária sobre a migração venezuelana em Roraima.
   TCC · Ciência da Computação · UFRR · Mateus Moraes de Moura
   Orientador: Prof. Dr. Luciano Ferreira Silva

   COMO ESTE ARQUIVO ESTÁ ORGANIZADO
   ---------------------------------
   O jogo foi construído em versões sucessivas (v12 → v21). Em vez de
   reescrever as funções antigas, cada versão nova as ESTENDE com o padrão:

       var _base = funcao;              // guarda a versão anterior
       funcao = function(){             // redefine
         _base();                       // reaproveita o comportamento antigo
         ...                            // e acrescenta o novo
       };

   Por isso uma mesma função (ex.: decidir, renderDetalhe, gabarito) pode
   aparecer mais de uma vez: a última definição é a que vale, e ela chama as
   anteriores. Os blocos, em ordem:

     1. Retratos simples, dados dos casos, melhorias e eventos  (CASOS, UPGRADES, EVENTOS)
     2. Estado da partida, fila de atendimento e regras básicas (G, gerarFila, decidir)
     3. Salvamento, recordes e opções                           (LocalStorage)
     4. Controlador v14: sons, HUD, painel do dia, fim de jogo
     5. v16: história do novato e o "Caderno" (examinar, trabalho, denúncia)
     6. v16: motor de cenas e roteiro em 10 capítulos
     7. v17: balcão de atendimento (documentos, marcação de sinais, carimbos)
     8. v18/v19: retratos semirrealistas em SVG gerados por código
     9. v20: guia do primeiro caso e resumo da conferência

   Recursos do abrigo (0 a 100%): orçamento, vagas (abrigo), equipe e
   reputação. A partida dura 10 dias ou termina antes se os recursos colapsarem.

   O roteiro em espanhol é gerado automaticamente a partir deste arquivo
   (ver i18n/traduzir.js); este é o único código-fonte do jogo.
═══════════════════════════════════════════════════════════════════════ */

// ── AVATAR VENEZUELANO (SVG local) ───────────────────────────
// Tons de pele latinos — predominantemente moreno/mulato/mestiço
const SK=['#C8956C','#B8784A','#D4A070','#C07848','#A86030','#E0B090','#C89060','#906040','#D4956A','#B87050'];
// Cabelos escuros predominantes (venezuelanos têm maioria de cabelos escuros)
const HR=['#0a0500','#1a0800','#2a1200','#3a1a00','#1a0a00','#0d0600','#251000','#160800'];
// Roupas: cores vibrantes latinoamericanas + roupas de viagem desgastadas
const SH_M=['#1a3a6a','#8b1a1a','#1a6a2a','#4a3a1a','#6a4a1a','#2a4a2a','#3a2a4a','#5a3a1a','#1a4a5a','#6a2a1a'];
const SH_F=['#c0392b','#8e44ad','#16a085','#d35400','#2980b9','#c0392b','#27ae60','#e74c3c','#8e44ad','#f39c12'];
// Acessórios de viagem
const BAGS=['mochila','sacola','sem'];
// Cidades venezuelanas de origem
const CIDADES=['Caracas','Maracaibo','Valencia','Barquisimeto','Mérida','Maracay','Barcelona','Maturín','Bolívar','Porlamar'];

// Gerador pseudoaleatório determinístico: a mesma semente (seed) sempre gera
// o mesmo número. Usado para que cada pessoa tenha sempre a mesma aparência,
// cidade de origem e ordem de declarações.
function rng(s,n){let x=Math.sin(s*9301+n*49297)*233280;return x-Math.floor(x);}

// Avatar da primeira versão (mantido por compatibilidade).
// O retrato exibido hoje é gerado por retrato() — ver bloco v18/v19.
function avatar(s,w,h){
  const sk = SK[Math.floor(rng(s,1)*SK.length)];
  const hr = HR[Math.floor(rng(s,2)*HR.length)];
  const fem = rng(s,4) > .45; // ligeiramente mais mulheres (contexto migratório)
  const sh = fem ? SH_F[Math.floor(rng(s,3)*SH_F.length)] : SH_M[Math.floor(rng(s,3)*SH_M.length)];
  const ec = '#3a2010'; // olhos castanhos (predominante em venezuelanos)
  const cx=50, hy=40;
  const cansado = rng(s,8) > .5; // expressão cansada de viagem

  // Cabelo feminino: varia entre liso longo, preso, curto
  const femHairStyle = Math.floor(rng(s,9)*3);
  let hair;
  if(fem){
    if(femHairStyle===0){
      // Liso longo
      hair=`<ellipse cx="${cx}" cy="${hy-10}" rx="24" ry="28" fill="${hr}"/>
      <rect x="${cx-24}" y="${hy-5}" width="9" height="45" rx="4" fill="${hr}"/>
      <rect x="${cx+15}" y="${hy-5}" width="9" height="45" rx="4" fill="${hr}"/>`;
    } else if(femHairStyle===1){
      // Preso (coque)
      hair=`<ellipse cx="${cx}" cy="${hy-14}" rx="23" ry="20" fill="${hr}"/>
      <ellipse cx="${cx}" cy="${hy-28}" rx="10" ry="8" fill="${hr}"/>
      <circle cx="${cx}" cy="${hy-34}" r="6" fill="${hr}"/>`;
    } else {
      // Curto ondulado
      hair=`<ellipse cx="${cx}" cy="${hy-10}" rx="24" ry="22" fill="${hr}"/>
      <ellipse cx="${cx-18}" cy="${hy-2}" rx="8" ry="6" fill="${hr}"/>
      <ellipse cx="${cx+18}" cy="${hy-2}" rx="8" ry="6" fill="${hr}"/>`;
    }
  } else {
    const mHairStyle = Math.floor(rng(s,9)*3);
    if(mHairStyle===0){
      // Curto liso
      hair=`<ellipse cx="${cx}" cy="${hy-14}" rx="22" ry="17" fill="${hr}"/>`;
    } else if(mHairStyle===1){
      // Raspado nas laterais
      hair=`<ellipse cx="${cx}" cy="${hy-16}" rx="18" ry="14" fill="${hr}"/>
      <rect x="${cx-22}" y="${hy-20}" width="6" height="12" rx="3" fill="${hr}" opacity=".4"/>
      <rect x="${cx+16}" y="${hy-20}" width="6" height="12" rx="3" fill="${hr}" opacity=".4"/>`;
    } else {
      // Ondulado com volume
      hair=`<ellipse cx="${cx}" cy="${hy-12}" rx="23" ry="19" fill="${hr}"/>
      <ellipse cx="${cx-14}" cy="${hy-14}" rx="10" ry="8" fill="${hr}"/>
      <ellipse cx="${cx+14}" cy="${hy-14}" rx="10" ry="8" fill="${hr}"/>`;
    }
  }

  // Barba fina (homens, 40% chance)
  const barba = !fem && rng(s,5) > .6
    ? `<ellipse cx="${cx}" cy="${hy+14}" rx="13" ry="7" fill="${hr}" opacity=".5"/>
       <ellipse cx="${cx-8}" cy="${hy+10}" rx="5" ry="4" fill="${hr}" opacity=".4"/>
       <ellipse cx="${cx+8}" cy="${hy+10}" rx="5" ry="4" fill="${hr}" opacity=".4"/>` : '';

  // Bigode (homens, 25% chance)  
  const bigode = !fem && rng(s,6) > .75
    ? `<ellipse cx="${cx}" cy="${hy+8}" rx="9" ry="3.5" fill="${hr}" opacity=".6"/>` : '';

  // Expressão: boca cansada ou neutra
  const boca = cansado
    ? `<path d="M${cx-5} ${hy+14} Q${cx} ${hy+13} ${cx+5} ${hy+14}" stroke="#5a3020" stroke-width="1.5" fill="none" opacity=".7"/>`
    : `<path d="M${cx-5} ${hy+14} Q${cx} ${hy+17} ${cx+5} ${hy+14}" stroke="#5a3020" stroke-width="1.5" fill="none" opacity=".6"/>`;

  // Sobrancelhas expressivas
  const sobrancelha = cansado
    ? `<path d="M${cx-13} ${hy-10} Q${cx-9} ${hy-13} ${cx-5} ${hy-10}" stroke="${hr}" stroke-width="2" fill="none"/>
       <path d="M${cx+5} ${hy-10} Q${cx+9} ${hy-13} ${cx+13} ${hy-10}" stroke="${hr}" stroke-width="2" fill="none"/>`
    : `<path d="M${cx-13} ${hy-11} Q${cx-9} ${hy-14} ${cx-5} ${hy-11}" stroke="${hr}" stroke-width="1.8" fill="none"/>
       <path d="M${cx+5} ${hy-11} Q${cx+9} ${hy-14} ${cx+13} ${hy-11}" stroke="${hr}" stroke-width="1.8" fill="none"/>`;

  // Roupa: camisa com detalhe de botões ou blusa
  const roupa = fem
    ? `<ellipse cx="${cx}" cy="${hy+30}" rx="21" ry="13" fill="${sh}"/>
       <rect x="${cx-21}" y="${hy+29}" width="42" height="55" rx="3" fill="${sh}"/>
       <ellipse cx="${cx-11}" cy="${hy+6}" rx="3.5" ry="6.5" fill="${sk}"/>
       <ellipse cx="${cx+11}" cy="${hy+6}" rx="3.5" ry="6.5" fill="${sk}"/>`
    : `<ellipse cx="${cx}" cy="${hy+30}" rx="21" ry="13" fill="${sh}"/>
       <rect x="${cx-21}" y="${hy+29}" width="42" height="55" rx="3" fill="${sh}"/>
       <line x1="${cx}" y1="${hy+29}" x2="${cx}" y2="140" stroke="rgba(255,255,255,.15)" stroke-width="1.5"/>
       <circle cx="${cx}" cy="${hy+34}" r="1.5" fill="rgba(255,255,255,.3)"/>
       <circle cx="${cx}" cy="${hy+42}" r="1.5" fill="rgba(255,255,255,.3)"/>
       <circle cx="${cx}" cy="${hy+50}" r="1.5" fill="rgba(255,255,255,.3)"/>
       <ellipse cx="${cx-11}" cy="${hy+6}" rx="3.5" ry="6.5" fill="${sk}"/>
       <ellipse cx="${cx+11}" cy="${hy+6}" rx="3.5" ry="6.5" fill="${sk}"/>`;

  // Mochila de viagem (60% chance — contexto migratório)
  const temMochila = rng(s,10) > .4;
  const mochila = temMochila
    ? `<rect x="${cx+14}" y="${hy+22}" width="14" height="22" rx="3" fill="#7a5a30" opacity=".9"/>
       <rect x="${cx+15}" y="${hy+23}" width="12" height="8" rx="2" fill="#8a6a40"/>
       <line x1="${cx+16}" y1="${hy+22}" x2="${cx+16}" y2="${hy+20}" stroke="#5a4020" stroke-width="2"/>
       <line x1="${cx+24}" y1="${hy+22}" x2="${cx+24}" y2="${hy+20}" stroke="#5a4020" stroke-width="2"/>`
    : '';

  // Mini bandeira da Venezuela no peito (sempre presente)
  const bandeira = `
    <rect x="${cx-7}" y="${hy+30}" width="14" height="10" rx="1" fill="#CF142B"/>
    <rect x="${cx-7}" y="${hy+33.3}" width="14" height="3.4" fill="#00247D"/>
    <rect x="${cx-7}" y="${hy+36.7}" width="14" height="3.3" fill="#F4C300"/>
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="${w}" height="${h}">
    ${hair}
    <ellipse cx="${cx}" cy="${hy}" rx="22" ry="26" fill="${sk}"/>
    ${sobrancelha}
    <ellipse cx="${cx-9}" cy="${hy-2}" rx="4.5" ry="5" fill="white"/>
    <ellipse cx="${cx+9}" cy="${hy-2}" rx="4.5" ry="5" fill="white"/>
    <circle cx="${cx-9}" cy="${hy-2}" r="2.8" fill="${ec}"/>
    <circle cx="${cx+9}" cy="${hy-2}" r="2.8" fill="${ec}"/>
    <circle cx="${cx-8}" cy="${hy-3}" r=".9" fill="rgba(255,255,255,.8)"/>
    <circle cx="${cx+10}" cy="${hy-3}" r=".9" fill="rgba(255,255,255,.8)"/>
    ${boca}
    ${barba}
    ${bigode}
    <ellipse cx="${cx}" cy="${hy+19}" rx="9" ry="6" fill="${sk}"/>
    ${roupa}
    ${bandeira}
    ${mochila}
  </svg>`;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Cidade de origem baseada no seed
// Cidade venezuelana de origem, escolhida pela semente da pessoa.
function cidadeOrigem(seed) {
  const cidades = ['Caracas','Maracaibo','Valencia','Barquisimeto','Mérida','Maracay','Barcelona','Maturín','Ciudad Bolívar','Porlamar','Cumaná','San Cristóbal'];
  return cidades[Math.floor(rng(seed, 11) * cidades.length)];
}

// ── CASOS (contextualizados em Roraima/Venezuela) ─────────────
/* ── CASOS DE ATENDIMENTO ────────────────────────────────────
   Cada objeto é uma pessoa (ou família) que chega ao abrigo.
     nome_base      nome exibido e chave para META, CASO_LINHAS e PERFIL
     prioridade     'critico' | 'grave' | 'moderado' | 'estavel'
     historia       relato lido no balcão
     lei            base legal mostrada ao jogador
     dilema         o conflito da decisão (dica)
     consequencias  texto para acolher / estabilizar (Assistência) / encaminhar
     b, ab, t       custo de Acolher em orçamento, vagas e equipe (%)
     pts            pontos base do caso
     soHist, dia    casos da história: aparecem só no dia indicado
   ─────────────────────────────────────────────────────────── */
const CASOS=[
  {
    nome_base:'Família Pérez',prioridade:'critico',
    historia:'Diego Pérez, 34, chegou com esposa e dois filhos após 14 dias a pé desde Pacaraima. Abandonou Caracas após ameaças de grupos armados. A filha de 6 anos apresenta sinais de desidratação severa.',
    lei:'Lei 9.474/1997 (Lei do Refúgio) — Art. 1º: refugiado é quem sofreu grave violação de direitos humanos. Resolução Normativa CONARE nº 32/2023 — aceleração de análise para grupos vulneráveis.',
    dilema:'Diego tem documentos venezuelanos mas sem visto brasileiro. A lei permite atendimento independente de documentação, mas a burocracia interna do abrigo exige registro. Atender ou aguardar triagem?',
    consequencias:{acolher:'A família recebe acolhimento. A criança se recupera. Diego consegue emprego em Boa Vista 3 semanas depois.',estabilizar:'Assistência básica prestada. A criança melhora, mas a família dorme na rua por mais 4 dias.',encaminhar:'Sem encaminhamento efetivo — família não encontra o serviço indicado. Criança agrava quadro.'},
    b:9,ab:9,t:7,pts:55,flag:'🇻🇪'
  },
  {
    nome_base:'Sr. Montoya',prioridade:'critico',
    historia:'Carlos Montoya, 58, professor universitário de Mérida. Diabético sem acesso a insulina há 3 semanas. Veio sozinho, perdeu contato com a família durante a viagem.',
    lei:'Res. CONARE nº 36/2024 — prioridade para idosos e portadores de doenças crônicas. Art. 196 CF/88 — saúde como direito universal.',
    dilema:'O posto de saúde está lotado. Encaminhar significa fila de 6h. Acolher no abrigo permite acesso à insulina do estoque da ONG — mas esgotaria 80% do estoque para o mês.',
    consequencias:{acolher:'Sr. Montoya recebe insulina e estabiliza. Relata sua história que vira notícia local, aumentando doações.',estabilizar:'Assistência parcial. Carlos aguarda na fila e recebe insulina tarde — complicação evitada por pouco.',encaminhar:'Encaminhado para UPA já superlotada. Carlos entra em coma hiperglicêmico. Situação crítica.'},
    b:10,ab:8,t:6,pts:58,flag:'🇻🇪'
  },
  {
    nome_base:'Jovens Ramírez',prioridade:'critico',
    historia:'Três irmãos: Ana (16), Pablo (14) e Lúcia (8). Desacompanhados. Mãe morreu durante a travessia. Pai permaneceu na Venezuela. Encontrados por voluntários na rodoviária de Boa Vista.',
    lei:'ECA Art. 98 — crianças em risco devem ser acolhidas imediatamente. Res. CONARE — menores desacompanhados têm proteção especial. ACNUR recomenda acolhimento imediato.',
    dilema:'O abrigo está no limite de capacidade. Acolher os três irmãos significa recusar a próxima família que chegar. Separar os irmãos libera mais vagas, mas pode traumatizar ainda mais as crianças.',
    consequencias:{acolher:'Os três irmãos ficam juntos. Ana começa a estudar. Caso vira referência de boas práticas do ACNUR.',estabilizar:'Assistência prestada mas sem vaga. ONG parceira acolhe os menores com algum atraso.',encaminhar:'Crianças passam a noite em abrigo emergencial improvisado. Equipe do Conselho Tutelar acionada.'},
    b:9,ab:10,t:8,pts:60,flag:'🇻🇪'
  },
  {
    nome_base:'Dra. Vásquez',prioridade:'grave',
    historia:'María Vásquez, 41, médica pediatra de Maracaibo. Veio com diploma mas sem revalidação. Quer trabalhar voluntariamente no abrigo enquanto aguarda processo.',
    lei:'CFM Res. 2.330/2023 — médico estrangeiro pode atuar com autorização temporária em regiões de escassez. Lei 13.445/2017 — Art. 14: visto temporário para trabalho.',
    dilema:'Aceitar sua ajuda voluntária sem documentação pode criar problemas legais para a ONG. Mas o abrigo está sem médico há 3 dias. O risco jurídico versus a necessidade imediata.',
    consequencias:{acolher:'María atende 12 crianças no dia. Processo de revalidação acelerado. Continua voluntária por 2 meses.',estabilizar:'Orientada mas não autorizada a atender. Faz triagem informal. Situação ambígua para a ONG.',encaminhar:'Encaminhada ao CFM. Burocracia leva meses. Abrigo continua sem médico.'},
    b:7,ab:5,t:5,pts:38,flag:'🇻🇪'
  },
  {
    nome_base:'Sr. Gutiérrez',prioridade:'grave',
    historia:'Ramón Gutiérrez, 45, ex-policial de Caracas. Afirma ter sido perseguido pelo governo após se recusar a participar de repressão a manifestantes. Sem comprovação documental.',
    lei:'Lei 9.474/97 Art. 1º, III — perseguição por opinião política justifica refúgio. ACNUR Handbook — testemunho é prova válida quando documentos são inacessíveis.',
    dilema:'Sem documentos que comprovem perseguição política, o caso é juridicamente frágil. Mas negar pode enviar alguém de volta a um risco real. Benefício da dúvida ou protocolo estrito?',
    consequencias:{acolher:'Ramón é acolhido. Semanas depois, carta de perseguição de grupo político venezuelano confirma sua história.',estabilizar:'Assistência básica enquanto analisa. Ramón fica em situação irregular por 60 dias.',encaminhar:'Encaminhado ao CONARE. Aguarda 8 meses. Retorna à Venezuela por desespero.'},
    b:6,ab:5,t:4,pts:35,flag:'🇻🇪'
  },
  {
    nome_base:'Família Flores',prioridade:'grave',
    historia:'Esperanza Flores, 29, com filho de 2 anos e grávida de 7 meses. Marido ficou preso na fronteira após confusão com documentos. Ela veio em frente para buscar ajuda.',
    lei:'Lei 13.445/17 Art. 37 — proteção especial a gestantes. Protocolo MS 2024 — pré-natal garantido independente de status migratório. Portaria Interministerial nº 5/2017.',
    dilema:'Esperanza precisa de pré-natal urgente e o marido está retido. Ajudar significa usar recursos de abrigo e também acionar advogado voluntário para a situação do marido — custo alto.',
    consequencias:{acolher:'Esperanza recebe pré-natal. Marido liberado em 5 dias com intervenção jurídica. Família reunida.',estabilizar:'Pré-natal garantido, mas marido continua retido por falta de acompanhamento jurídico.',encaminhar:'Encaminhada a UBS. Marido permanece retido por semanas. Esperanza entra em trabalho de parto prematuramente.'},
    b:8,ab:7,t:5,pts:42,flag:'🇻🇪'
  },
  {
    nome_base:'Adolescente Torres',prioridade:'moderado',
    historia:'Jhonny Torres, 17, viajou sozinho de Bolívar. Diz ter 18 para evitar processos de tutela. Comportamento evasivo, marcas no corpo sugerem possível situação de violência.',
    lei:'ECA Art. 7º — criança tem direito à proteção contra violência. Res. CONARE — menores têm proteção independente de declaração de idade. Protocolo de identificação de vítimas de tráfico.',
    dilema:'Se Jhonny é menor, o Conselho Tutelar deve ser acionado — mas isso pode afastá-lo do sistema de proteção se ele tiver trauma institucional. Questionar a idade pode quebrar a confiança.',
    consequencias:{acolher:'Acolhido sem questionar. Psicóloga voluntária estabelece vínculo. Jhonny revela ter 16 anos e situação de tráfico.',estabilizar:'Assistência prestada com distância. Jhonny some no dia seguinte.',encaminhar:'Encaminhado a albergue geral. Sem acompanhamento especializado. Caso encerrado sem resolução.'},
    b:5,ab:5,t:4,pts:28,flag:'🇻🇪'
  },
  {
    nome_base:'Casal Hernández',prioridade:'moderado',
    historia:'Luis e Carmen Hernández, 52 e 48, professores aposentados de Valencia. Chegaram com documentos em ordem. Querem regularizar situação mas não sabem por onde começar.',
    lei:'Lei 13.445/17 — visto humanitário para venezuelanos. Portaria MJSP nº 666/2021 — simplificação do processo para venezuelanos. Resolução Normativa CNIg nº 1/2017.',
    dilema:'O casal tem condições de se virar, mas sem orientação adequada pode cair em armadilhas de intermediários ilegais que cobram por serviços gratuitos. Vale alocar um técnico para orientação?',
    consequencias:{acolher:'Orientação jurídica prestada. Casal regulariza situação em 2 semanas. Passam a ajudar como voluntários.',estabilizar:'Orientação básica. Casal tenta sozinho, perde tempo, mas eventualmente regulariza em 2 meses.',encaminhar:'Caem em mãos de "despachante" que cobra R$800 por serviço gratuito.'},
    b:4,ab:3,t:3,pts:22,flag:'🇻🇪'
  },
  {
    nome_base:'Sr. Pedraza',prioridade:'estavel',
    historia:'Héctor Pedraza, 33, mecânico de Maracaibo. Chegou há 3 dias, está dormindo na rua. Tem habilidade profissional mas sem documentos para trabalhar formalmente.',
    lei:'Res. CNIg nº 1/2017 — autorização de trabalho para venezuelanos. Portaria MJSP nº 666/2021 — emissão de Carteira de Trabalho para refugiados.',
    dilema:'Héctor não precisa de abrigo urgente, mas sem documentação de trabalho, ficará preso na informalidade. Investir tempo de equipe nisso agora libera uma vaga de abrigo mais tarde.',
    consequencias:{acolher:'Orientado e encaminhado ao SINE. Consegue emprego formal em 3 semanas. Deixa de usar serviços do abrigo.',estabilizar:'Recebe lista de serviços. Demora 2 meses para regularizar por conta própria.',encaminhar:'Fica na informalidade. Renda baixa e irregular. Volta a pedir assistência em 1 mês.'},
    b:3,ab:3,t:2,pts:18,flag:'🇻🇪'
  },
  {
    nome_base:'Sra. Mendoza',prioridade:'estavel',
    historia:'Patricia Mendoza, 38, cozinheira de Caracas. Chegou há 1 semana com irmã já estabelecida em Boa Vista. Precisa apenas de orientação para regularização.',
    lei:'Portaria MJSP nº 666/2021 — processo simplificado. Art. 30 Lei 13.445/17 — residência por vínculo familiar.',
    dilema:'O caso é simples e Patricia tem apoio da irmã. Mas ela relata que várias amigas estão em situação mais grave e não sabem onde buscar ajuda. Orientá-la a trazer as amigas aumenta a demanda.',
    consequencias:{acolher:'Patricia regularizada rapidamente. Traz 4 amigas que também recebem ajuda.',estabilizar:'Orientação básica. Patricia se resolve, amigas continuam sem apoio.',encaminhar:'Resolve sozinha com a irmã. Sem impacto coletivo.'},
    b:2,ab:2,t:1,pts:12,flag:'🇻🇪'
  },
  {
    nome_base:'Família Rivas',prioridade:'estavel',
    historia:'Roberto Rivas, 40, com esposa e três filhos adolescentes. Chegaram em situação estável, com algum dinheiro economizado. Buscam orientação sobre escola para os filhos.',
    lei:'Art. 205 CF/88 — educação é direito de todos. Lei 9.394/96 — LDB garante matrícula a crianças estrangeiras. Res. CNE/CEB nº 1/2012.',
    dilema:'Escola pública tem vagas, mas diretor local está relutante em aceitar as crianças por pressão de pais brasileiros. Intervir diretamente pode criar conflito com a gestão escolar local.',
    consequencias:{acolher:'Intervenção junto à escola. Crianças matriculadas. Diretor recebe capacitação sobre direitos.',estabilizar:'Carta de orientação fornecida. Família tenta negociar, consegue matrícula com dificuldade.',encaminhar:'Família busca apoio na Defensoria. Processo lento. Crianças perdem 1 mês de aula.'},
    b:2,ab:2,t:1,pts:10,flag:'🇻🇪'
  },

  {
    nome_base:'Bebê Valentina',prioridade:'critico',
    historia:'Uma mulher desconhecida deixou uma bebê de 3 meses na entrada do abrigo com bilhete: "Me chamo Valentina. Minha mãe não consegue me cuidar. Por favor." Bebê em boa saúde, mas precisando de leite e fraldas urgente.',
    lei:'ECA Art. 7º e 19 — criança tem direito à vida e convivência familiar. Resolução CONARE — menores abandonados recebem proteção imediata. Conselho Tutelar deve ser acionado em até 24h.',
    dilema:'Acolher significa assumir responsabilidade legal pela criança até o Conselho Tutelar agir. Encaminhar diretamente pode expô-la a riscos no percurso. Cada hora conta.',
    consequencias:{acolher:'Valentina é acolhida. Mãe localizada 2 dias depois — estava em crise psicológica. Recebe apoio e reencontra a filha.',estabilizar:'Assistência de primeiros cuidados prestada. Conselho Tutelar acionado. Bebê aguarda em segurança.',encaminhar:'Transferida para UPA. Sistema lento. Bebê fica sem cuidado específico por horas.'},
    b:11,ab:9,t:8,pts:65,flag:'🇻🇪'
  },
  {
    nome_base:'Prof. Castillo',prioridade:'grave',
    historia:'Eduardo Castillo, 62, ex-reitor de universidade em Valencia. Chegou com sua esposa Lidia, 60, que tem Alzheimer em estágio inicial. Eduardo é cuidador integral. Ambos vieram para ficar perto do filho estabelecido em Manaus — mas o filho sumiu.',
    lei:'Res. CONARE nº 36/2024 — prioridade para idosos. Art. 230 CF/88 — proteção ao idoso. Estatuto do Idoso Art. 3º — proteção integral.',
    dilema:'O abrigo não tem estrutura de cuidado para Alzheimer. Acolher significa improviso. Encaminhar para serviço geriátrico sobrecarrega o SUS local. Contatar o filho ausente consome tempo da equipe.',
    consequencias:{acolher:'Casal acolhido. Filho localizado em 3 dias — havia trocado de número. Família reunida em Manaus.',estabilizar:'Assistência básica. Lidia fica desorientada no ambiente novo. Eduardo exausto.',encaminhar:'Encaminhados ao CRAS. Fila de 3 semanas. Eduardo cuida sozinho sem apoio.'},
    b:7,ab:8,t:6,pts:40,flag:'🇻🇪'
  },
  {
    nome_base:'Grupo Artistas',prioridade:'moderado',
    historia:'Cinco músicos de uma banda de rock de Caracas. Jovens entre 22 e 28 anos, saudáveis, com equipamentos. Querem trabalhar com música em Boa Vista mas não sabem como regularizar sua situação artística.',
    lei:'Lei 13.445/17 Art. 14 — visto temporário para trabalho artístico. Portaria MJSP nº 666/2021. Convenção da UNESCO sobre diversidade cultural.',
    dilema:'O grupo não está em situação de vulnerabilidade imediata, mas sem orientação pode cair na informalidade ou ser explorado por promotores locais. Dedicar atenção a eles agora libera recursos no futuro.',
    consequencias:{acolher:'Orientados e regularizados. Fazem show beneficente para o abrigo. Arrecadam doações extras.',estabilizar:'Orientação básica. Se viram parcialmente, trabalham informalmente por 2 meses.',encaminhar:'Caem nas mãos de empresário que leva 60% dos cachês. Exploração disfarçada.'},
    b:3,ab:2,t:3,pts:20,flag:'🇻🇪'
  },
  {
    nome_base:'Sra. Ochoa',prioridade:'critico',
    historia:'Luisa Ochoa, 44, com sinais claros de violência doméstica — hematomas no rosto e braços. Veio com o agressor, que afirma ser seu marido e diz que ela "caiu". Ela não fala, olha para o chão.',
    lei:'Lei 11.340/2006 (Maria da Penha) — aplicável a estrangeiras em território brasileiro. Art. 226 CF/88. Protocolo de atendimento a vítimas de violência — isolamento imediato do agressor.',
    dilema:'O agressor está presente e agressivo. Separar Luisa imediatamente pode provocar reação violenta no local. Mas não agir a deixa em perigo. Cada minuto importa.',
    consequencias:{acolher:'Luisa separada com discrição. Aciona-se a delegacia da mulher. Ela revela situação de cárcere privado de 2 anos.',estabilizar:'Assistência prestada com o agressor presente. Luisa não consegue falar a verdade. Situação continua.',encaminhar:'Encaminhados juntos. Situação de violência continua sem interrupção.'},
    b:9,ab:8,t:10,pts:62,flag:'🇻🇪'
  },
  {
    nome_base:'Família Suárez',prioridade:'critico',
    historia:'Carmen Suárez, 32, chegou com três filhos pequenos (2, 5 e 7 anos) após o marido ser preso em Caracas por participar de protesto. Ela atravessou a fronteira à noite com as crianças e foi encontrada desorientada perto da rodovia BR-174.',
    lei:'ACNUR Diretrizes de Proteção — mulheres chefes de família em situação de risco merecem atenção prioritária. ECA Art. 98 — crianças em risco devem ser imediatamente acolhidas.',
    dilema:'Carmen está em estado de choque e as crianças com fome. O abrigo feminino está lotado. Usar vagas do abrigo misto pode expor as crianças a situações inadequadas, mas não atender é inadmissível.',
    consequencias:{acolher:'Família acolhida em espaço separado improviado. Crianças recebem alimentação. Carmen começa acompanhamento psicológico.',estabilizar:'Alimentação fornecida, mas família dorme em área comum. Crianças choram a noite toda.',encaminhar:'Referenciada para abrigo municipal já no limite. Família passa 3 dias sem atenção especializada.'},
    b:10,ab:10,t:8,pts:62,flag:'🇻🇪'
  },
  {
    nome_base:'Sr. Bolivar',prioridade:'grave',
    historia:'Ernesto Bolívar, 55, jornalista independente de Caracas. Chegou com pen-drives contendo documentação de violações de direitos humanos pelo governo venezuelano. Teme ser perseguido e quer solicitar refúgio político.',
    lei:'Lei 9.474/97 Art. 1º, I — perseguição por opinião política e atividade jornalística. Convenção sobre o Estatuto dos Refugiados (1951) — Art. 1º.',
    dilema:'Os pen-drives podem colocar o abrigo em risco caso agentes venezuelanos monitorem a fronteira. Mas as evidências são valiosas para organizações de direitos humanos. Receber ou orientar a entrar em contato com ONGs especializadas?',
    consequencias:{acolher:'Ernesto acolhido. Material encaminhado para ACNUR com seu consentimento. Refúgio concedido em 2 meses.',estabilizar:'Assistência básica. Ernesto mantém os pen-drives, fica em situação irregular por semanas.',encaminhar:'Ernesto vai a outra cidade buscar ajuda. No caminho, é abordado e o material destruído.'},
    b:6,ab:5,t:5,pts:38,flag:'🇻🇪'
  },
  {
    nome_base:'Grupo Wayuu',prioridade:'moderado',
    historia:'Família indígena Wayuu — avó (68), filha (35) e netos (8 e 11). Vieram da região de Maicao. Falam pouco português e espanhol; sua língua principal é o wayuunaiki. Buscam comunidade Wayuu já estabelecida em Roraima.',
    lei:'Constituição Federal Art. 231 — proteção aos povos indígenas. Lei 13.445/17 — proteção especial a grupos vulneráveis. Convenção 169 OIT — direitos dos povos indígenas.',
    dilema:'O atendimento sem intérprete Wayuu é ineficaz e pode traumatizar a família. Esperar por um intérprete demora 2 dias. Atender sem comunicação adequada ou buscar apoio da FUNAI antes?',
    consequencias:{acolher:'FUNAI acionada, intérprete voluntário encontrado em 1 dia. Família reencontra comunidade Wayuu em Pacaraima.',estabilizar:'Atendimento precário com gestos e espanhol básico. Família fica desorientada, mas segura.',encaminhar:'Encaminhados ao CRAS sem intérprete. Família não consegue comunicar suas necessidades. Voltam sozinhos.'},
    b:4,ab:4,t:6,pts:28,flag:'🇻🇪'
  },
  {
    nome_base:'Jovem Díaz',prioridade:'estavel',
    historia:'Gabriela Díaz, 22, estudante de engenharia de Mérida. Veio sozinha, com laptop e documentos acadêmicos. Quer transferir seus créditos para a UFRR e solicitar bolsa para continuar os estudos.',
    lei:'Lei 9.394/96 (LDB) — Art. 48 — revalidação de diplomas estrangeiros. Resolução CNE/CES nº 3/2016 — acesso ao ensino superior por refugiados. Portaria UFRR sobre mobilidade acadêmica.',
    dilema:'Gabriela não precisa de abrigo, mas precisa de orientação jurídica e académica detalhada que consome tempo de equipe. Dar atenção plena agora pode ajudar outras jovens a buscar o mesmo caminho.',
    consequencias:{acolher:'Orientada completamente. Gabriela ingressa na UFRR com aproveitamento de 60% dos créditos. Torna-se embaixadora do programa.',estabilizar:'Orientação básica. Gabriela passa 3 meses navegando a burocracia sozinha.',encaminhar:'Encaminhada à Diretoria Acadêmica da UFRR sem apoio. Processo trava por documentação.'},
    b:2,ab:2,t:3,pts:15,flag:'🇻🇪'
  },
  /* ═══ CASOS DA HISTÓRIA (v16) — aparecem em dias fixos ═══ */
  {
    nome_base:"Eng. Salazar",prioridade:"estavel",soHist:true,dia:1,
    historia:"Rafael Salazar, 36, engenheiro eletricista de Valencia. Chegou há duas semanas com o protocolo de refúgio na mão e um currículo impresso. Fala português básico e diz uma frase por dia: “Eu não vim pedir esmola, vim trabalhar.”",
    lei:"Lei 9.474/1997, Art. 21, §1º — o protocolo de refúgio autoriza a emissão da Carteira de Trabalho provisória. Lei 13.445/2017 (Lei de Migração) — acesso ao trabalho e igualdade de tratamento.",
    dilema:"Acolher ocupa uma vaga de que outra família pode precisar. Já um profissional qualificado e com documentos em dia consegue se sustentar em poucas semanas, se alguém o conectar a uma vaga.",
    consequencias:{acolher:"Rafael fica no abrigo por duas semanas, estuda português à noite e acaba conseguindo um emprego por conta própria. Funcionou, mas ocupou uma vaga por mais tempo que o necessário.",estabilizar:"Recebe alimentação e orientação básica. Rafael segue procurando emprego sozinho, sem apoio para chegar às vagas.",encaminhar:"Encaminhado ao SINE sem acompanhamento. Rafael volta três vezes por falta de informação sobre os documentos."},
    b:3,ab:3,t:2,pts:20,flag:"🇻🇪"
  },
  {
    nome_base:"Enf. Carolina Ruiz",prioridade:"moderado",soHist:true,dia:2,
    historia:"Carolina Ruiz, 31, enfermeira de Barquisimeto, com dez anos de hospital. Pegou o ônibus até Boa Vista com o diploma na bolsa e uma carta de recomendação. O protocolo de refúgio venceu faz um mês e ela tem medo de ser multada.",
    lei:"Lei 9.474/1997, Art. 21 — o protocolo deve ser renovado junto à Polícia Federal. Lei 13.445/2017, Art. 3º — a irregularidade documental não pode impedir o acesso a direitos básicos.",
    dilema:"Sem protocolo válido, nenhuma clínica vai contratá-la. Por outro lado, ela tem uma qualificação rara em Boa Vista. Resolver o documento primeiro ou procurar a vaga já?",
    consequencias:{acolher:"Carolina ganha um teto e ajuda a equipe de saúde do abrigo, mas o protocolo continua vencido por mais uma semana.",estabilizar:"Recebe orientação e kit de higiene. Continua com o protocolo vencido e o medo de ser multada.",encaminhar:"Encaminhada à PF sem acompanhamento. Perde a vez na fila e volta ao abrigo sem solução."},
    b:4,ab:3,t:3,pts:28,flag:"🇻🇪"
  },
  {
    nome_base:"Sra. Quintero",prioridade:"grave",soHist:true,dia:3,
    historia:"Marisol Quintero, 27, mãe solo de uma menina de 4 anos. Mostra no celular uma conversa de WhatsApp: um “Sr. Barrios” oferece trabalho de doméstica em Manaus, com salário em dólar e passagem paga. Ela está animada, mas não sabe dizer o endereço nem o nome da família que a contrataria.",
    lei:"Lei 13.344/2016 — define o tráfico de pessoas, inclusive pelo aliciamento com falsa oferta de emprego. Protocolo de Palermo (ONU, 2000) — a vítima não é criminalizada e tem direito à proteção.",
    dilema:"Ela é adulta e quer ir. Mas as ofertas muito vantajosas, sem contrato e com exigência de segredo costumam ser armadilhas. Respeitar a escolha ou intervir?",
    consequencias:{acolher:"Marisol fica no abrigo e agradece, mas ainda conversa com o “Sr. Barrios” por mensagem.",estabilizar:"Recebe alimentação e uma conversa de orientação. Quem decide é ela, e ela segue em contato com o aliciador.",encaminhar:"Encaminhada ao CRAS sem alerta sobre a oferta. Marisol aceita o convite na semana seguinte."},
    b:4,ab:4,t:4,pts:40,flag:"🇻🇪"
  },
  {
    nome_base:"Família Arias",prioridade:"moderado",soHist:true,dia:4,
    historia:"Gustavo Arias, 39, eletricista de Maracay, chegou sozinho com os filhos Mateo (9) e Sofía (5). Os dois dormem agarrados a ele. Um voluntário cochichou: “Pai sozinho com duas crianças calmas demais... não parece certo.” Gustavo mostra certidões de nascimento e um vídeo da esposa, que ficou cuidando da avó doente e chega em duas semanas.",
    lei:"Convenção de 1951, Art. 3º — não discriminação por país de origem. Lei 13.445/2017, Art. 3º — repúdio à xenofobia. Lei 9.474/1997 — proteção à unidade familiar.",
    dilema:"Desconfiar de todo pai sozinho é preconceito. Ignorar sinais reais é negligência. A diferença está nos fatos conferidos, e não na impressão.",
    consequencias:{acolher:"A família é acolhida. Duas semanas depois a mãe chega e a família se reúne no abrigo. Gustavo vira voluntário da manutenção elétrica.",estabilizar:"Gustavo recebe apoio básico e agradece. Dorme pouco, mas conta com a equipe.",encaminhar:"Encaminhados a outro abrigo, a família perde dois dias de acolhida e a confiança na equipe."},
    b:4,ab:4,t:3,pts:25,flag:"🇻🇪"
  },
  {
    nome_base:"Rapazes do Contratante",prioridade:"grave",soHist:true,dia:5,
    historia:"Quatro rapazes entre 19 e 24 anos chegaram juntos de um ônibus fretado. Dizem que já têm emprego em uma obra “do outro lado do estado” e que só param no abrigo para tomar banho. Um deles tem o celular tomado e olha o tempo todo para um carro estacionado do outro lado da rua.",
    lei:"Código Penal, Art. 149 — reduzir alguém a condição análoga à de escravo, inclusive por dívida contraída. Lei 13.344/2016 — tráfico de pessoas para trabalho forçado.",
    dilema:"Eles dizem que estão bem e querem ir. Mas se estiverem endividados e sem documentos, a “liberdade” é só aparente. Aceitar a versão deles ou investigar?",
    consequencias:{acolher:"Os rapazes tomam banho, comem, dormem uma noite e seguem viagem na manhã seguinte, no mesmo ônibus.",estabilizar:"Recebem alimentação e uma conversa rápida. Nenhum quer falar sobre o contratante.",encaminhar:"Encaminhados a outro serviço, eles somem antes de chegar."},
    b:5,ab:5,t:4,pts:42,flag:"🇻🇪"
  },
  {
    nome_base:"Yusmary (15) e o “tio”",prioridade:"critico",soHist:true,dia:7,
    historia:"Yusmary tem 15 anos. Chegou de mãos dadas com um homem que se apresenta como “tio”, mas ele não sabe a data de nascimento dela. A menina só responde depois de olhar para ele. O homem diz que vai levá-la “para um trabalho” e se irrita quando a equipe tenta falar com ela a sós.",
    lei:"ECA, Art. 98 e Art. 5º — crianças e adolescentes em risco devem ser protegidos com prioridade absoluta. Lei 13.344/2016. Convenção sobre os Direitos da Criança (ONU), Art. 3º — interesse superior da criança.",
    dilema:"O homem tem um documento que diz ser parente dela. Mas os fatos não batem. Separar a menina dele sem prova pode machucar. Deixá-la ir pode ser irreversível.",
    consequencias:{acolher:"Yusmary é acolhida no abrigo, mas o “tio” volta à noite com um papel assinado e a leva embora.",estabilizar:"Recebe água, comida e um cobertor. Antes do amanhecer, o homem a leva.",encaminhar:"Encaminhada sem acompanhamento, Yusmary desaparece do registro do abrigo."},
    b:6,ab:6,t:6,pts:60,flag:"🇻🇪"
  }

];

// Melhorias: a cada 2 dias o jogador escolhe 1 entre 3 sorteadas
// (ver mostrarUpgrade). Cada uma altera os recursos ou uma regra do dia.
const UPGRADES=[
  {icon:'💰',nome:'Captação de Recursos',desc:'Orçamento +25%',apply:G=>{G.res.orcamento=Math.min(100,G.res.orcamento+25);}},
  {icon:'🏠',nome:'Expansão do Abrigo',desc:'Capacidade de abrigo +25%',apply:G=>{G.res.abrigo=Math.min(100,G.res.abrigo+25);}},
  {icon:'👥',nome:'Voluntários Novos',desc:'Equipe +25%',apply:G=>{G.res.equipe=Math.min(100,G.res.equipe+25);}},
  {icon:'📺',nome:'Reportagem Positiva',desc:'Reputação +20% e orçamento +10%',apply:G=>{G.res.reputacao=Math.min(100,G.res.reputacao+20);G.res.orcamento=Math.min(100,G.res.orcamento+10);}},
  {icon:'⚡',nome:'Protocolo Ágil',desc:'Próximo acolhimento custa 30% menos',apply:G=>{G.desconto=(G.difBase||1)*.7;}},
  {icon:'🚐',nome:'Van de Apoio',desc:'Encaminhar não perde casos críticos (1x)',apply:G=>{G.encSalvo=true;}},
  {icon:'🤝',nome:'ONG Parceira',desc:'Assistência recupera 5% de abrigo',apply:G=>{G.assistBonus=true;}},
  {icon:'🏅',nome:'Equipe Especializada',desc:'Acolher dá +20 pontos extras',apply:G=>{G.bonusPts=20;}},
  {icon:'⚖️',nome:'Assessoria Jurídica',desc:'Dilemas legais não afetam reputação',apply:G=>{G.shieldLegal=true;}},
  {icon:'🔋',nome:'Força-tarefa',desc:'Equipe não se desgasta neste dia',apply:G=>{G.semDesgaste=true;}},
];

// Eventos de crise: ao começar um dia há 45% de chance de um deles aparecer.
// Cada opção (choices) aplica efeitos diferentes nos recursos (fx).
const EVENTOS=[
  {titulo:'🌧️ Chuva Torrencial',desc:'Tempestade fecha a rodovia BR-174. Família vulnerável fica presa do lado venezuelano por 2 dias.',choices:[
    {txt:'Mobilizar equipe na fronteira',fx:G=>{G.res.equipe=Math.max(0,G.res.equipe-15);G.res.reputacao=Math.min(100,G.res.reputacao+10);notif('Equipe -15, reputação +10.','warn');}},
    {txt:'Aguardar reabertura da via',fx:G=>{G.res.reputacao=Math.max(0,G.res.reputacao-8);notif('Família aguarda. Reputação -8.','warn');}},
  ]},
  {titulo:'📦 Doação da ACNUR',desc:'ACNUR aprovou uma doação emergencial de suprimentos para o abrigo.',choices:[
    {txt:'Aceitar e redistribuir',fx:G=>{G.res.orcamento=Math.min(100,G.res.orcamento+20);G.res.abrigo=Math.min(100,G.res.abrigo+15);notif('Orçamento +20, Abrigo +15!','good');}},
  ]},
  {titulo:'📰 Reportagem Negativa',desc:'Jornal local publicou matéria questionando o custo do abrigo para "recursos públicos". Pressão política.',choices:[
    {txt:'Dar entrevista com dados reais',fx:G=>{G.res.reputacao=Math.min(100,G.res.reputacao+12);notif('Reputação +12. Transparência funciona!','good');}},
    {txt:'Ignorar a reportagem',fx:G=>{G.res.reputacao=Math.max(0,G.res.reputacao-12);notif('Reputação -12. Silêncio foi mal interpretado.','err');}},
  ]},
  {titulo:'✊ Protesto Local',desc:'Moradores do bairro fizeram protesto contra a instalação do abrigo. Situação tensa.',choices:[
    {txt:'Promover reunião comunitária aberta',fx:G=>{G.res.equipe=Math.max(0,G.res.equipe-10);G.res.reputacao=Math.min(100,G.res.reputacao+15);notif('Diálogo: equipe -10, reputação +15.','warn');}},
    {txt:'Acionar segurança e isolar o abrigo',fx:G=>{G.res.orcamento=Math.max(0,G.res.orcamento-12);G.res.reputacao=Math.max(0,G.res.reputacao-10);notif('Escalou o conflito.','err');}},
  ]},

  {titulo:'🔥 Incêndio no Galpão',desc:'Um incêndio destruiu 30% da área de armazenamento de suprimentos. Sem vítimas, mas os recursos materiais foram comprometidos.',choices:[
    {txt:'Acionar bombeiros e reorganizar espaço',fx:G=>{G.res.abrigo=Math.max(0,G.res.abrigo-20);G.res.equipe=Math.max(0,G.res.equipe-10);notif('Abrigo -20, equipe -10. Tragédia controlada.','err');}},
    {txt:'Pedir ajuda emergencial à prefeitura',fx:G=>{G.res.orcamento=Math.max(0,G.res.orcamento-10);G.res.reputacao=Math.min(100,G.res.reputacao+8);notif('Orçamento -10, reputação +8.','warn');}},
  ]},
  {titulo:'🌟 Visita da ONU',desc:'Representantes do ACNUR visitarão o abrigo amanhã para avaliação. Uma boa impressão pode garantir financiamento.',choices:[
    {txt:'Preparar apresentação e organizar o espaço',fx:G=>{G.res.equipe=Math.max(0,G.res.equipe-8);G.res.reputacao=Math.min(100,G.res.reputacao+20);G.res.orcamento=Math.min(100,G.res.orcamento+15);notif('Visita um sucesso! Reputação +20, orçamento +15.','good');}},
    {txt:'Continuar a rotina normalmente',fx:G=>{notif('Visita sem impacto especial.','ok');}},
  ]},
  {titulo:'😷 Surto de Gripe',desc:'Vários imigrantes e funcionários estão doentes. A capacidade operacional cai temporariamente.',choices:[
    {txt:'Isolar área e chamar equipe médica voluntária',fx:G=>{G.res.orcamento=Math.max(0,G.res.orcamento-15);G.res.equipe=Math.min(100,G.res.equipe+10);notif('Surto controlado. Orçamento -15, equipe +10.','warn');}},
    {txt:'Aguardar a melhora natural',fx:G=>{G.res.equipe=Math.max(0,G.res.equipe-20);notif('Sem intervenção — equipe -20.','err');}},
  ]},
  {titulo:'📱 Viral nas Redes',desc:'Um vídeo de um acolhimento emocionante viralizou e o abrigo virou destaque positivo nas redes sociais.',choices:[
    {txt:'Aproveitar e lançar campanha de doações',fx:G=>{G.res.orcamento=Math.min(100,G.res.orcamento+20);G.res.reputacao=Math.min(100,G.res.reputacao+15);notif('Campanha! Orçamento +20, reputação +15!','good');}},
  ]},

  {titulo:'🤲 Voluntários Espontâneos',desc:'Grupo de estudantes universitários quer ajudar voluntariamente no fim de semana.',choices:[
    {txt:'Aceitar e capacitar rapidamente',fx:G=>{G.res.equipe=Math.min(100,G.res.equipe+18);notif('Equipe +18! Voluntários integrados.','good');}},
    {txt:'Agradecer mas declinar por falta de estrutura',fx:G=>{notif('Sem impacto nos recursos.','ok');}},
  ]},
  {titulo:'🏛️ Recurso Federal',desc:'Governo federal liberou verba emergencial para estados de fronteira.',choices:[
    {txt:'Solicitar formalmente',fx:G=>{G.res.orcamento=Math.min(100,G.res.orcamento+25);notif('Orçamento +25!','good');}},
  ]},
];

// ── ESTADO DO JOGO ────────────────────────────────────────────
// G     → estado completo da partida (dia, recursos, pontos, contadores); é o que vai para o save
// sel   → pessoa atendida no balcão neste momento
// fila  → pessoas do dia (cada uma é uma cópia de CASOS com id, seed e vivo)
// timers→ contagens regressivas dos casos urgentes
let G={};let sel=null;let fila=[];let timers={};let pendConsequencia=null;

function iniciarJogo(){iniciarJogoReal();}

// Quantas pessoas chegam por dia: a demanda cresce ao longo da partida.
function tamanhoFila(){
  if(G.dia<=2)return 2;if(G.dia<=4)return 3;if(G.dia<=6)return 4;return 5+Math.floor(Math.random()*2);
}

// Monta a fila do dia: primeiro os casos fixos da história daquele dia,
// depois casos sorteados até completar o tamanho da fila.
// A partir do dia 4, casos críticos ficam "urgentes" (com cronômetro).
function gerarFila(){
  fila=[];
  const n=tamanhoFila();
  const forc=CASOS.filter(c=>c.soHist&&c.dia===G.dia);
  const rest=[...CASOS].filter(c=>!c.soHist).sort(()=>Math.random()-.5).slice(0,Math.max(0,n-forc.length));
  const pool=[...forc,...rest].sort(()=>Math.random()-.5);
  pool.forEach((c,i)=>{
    const seed=Math.floor(Math.random()*9999);
    const urgente=G.dia>=4&&c.prioridade==='critico';
    fila.push({...c,id:i,seed,vivo:true,urgente,nomeDisplay:c.nome_base});
  });
}

// Cronômetro de 30 s para casos urgentes. O tempo pausa quando há janela aberta
// ou o jogo está pausado. Se zerar, a pessoa é perdida (perderImigrante).
function iniciarTimers(){
  if(!OPTS.timer)return;
  fila.filter(p=>p.urgente&&p.vivo&&!timers[p.id]).forEach(p=>{
    let t=30;
    const el=document.getElementById('pt-'+p.id);
    if(el)el.textContent=t+'s';
    timers[p.id]=setInterval(()=>{
      if(pausado||document.querySelector('.ov:not(.off)')||document.getElementById('tela-caso').style.display==='none')return;
      t--;
      const e=document.getElementById('pt-'+p.id);
      if(e){e.textContent=t+'s';if(t<=5)e.style.background='rgba(200,0,0,.95)';}
      if(t<=5&&t>0)somTick();
      if(t<=0){clearInterval(timers[p.id]);delete timers[p.id];perderImigrante(p.id);}
    },1000);
  });
}
function clearAllTimers(){Object.values(timers).forEach(clearInterval);timers={};}
function clearTimer(id){if(timers[id]){clearInterval(timers[id]);delete timers[id];}}

// ── RENDER ────────────────────────────────────────────────────
// Versão original da lista de casos (redefinida pelo controlador v14).
function renderFila(){
  const el=document.getElementById('fila-cards');
  if(!el)return;
  el.innerHTML='';
  const vivos=fila.filter(p=>p.vivo);
  if(vivos.length===0){
    el.innerHTML='<div class="fila-empty-msg">✅ Fila vazia — avance para o próximo dia!</div>';
    const bn=document.getElementById('btn-next');if(bn)bn.disabled=false;
    atualizarProgresso();return;
  }
  const bn=document.getElementById('btn-next');if(bn)bn.disabled=true;
  vivos.forEach(p=>{
    const d=document.createElement('div');
    d.className='icard '+p.prioridade+(sel&&sel.id===p.id?' sel':'')+(p.urgente?' urgente':'');
    d.id='icard-'+p.id;
    const cidade_curta=cidadeOrigem(p.seed).substring(0,8);
    d.innerHTML='<img class="ic-img" src="'+retrato(p,80,108)+'"><div class="ic-ov"></div><div class="ic-dot"></div>'
      +(p.urgente?'<div class="ic-timer" id="pt-'+p.id+'">⏱</div>':'')
      +'<div style="position:absolute;top:4px;right:4px;z-index:5;background:rgba(0,0,0,.7);border-radius:2px;overflow:hidden;display:flex;flex-direction:column;width:13px;">'
      +'<div style="background:#CF142B;height:3px;"></div><div style="background:#00247D;height:3px;"></div><div style="background:#F4C300;height:3px;"></div></div>'
      +'<div style="position:absolute;bottom:13px;left:0;right:0;text-align:center;z-index:3;font-size:7px;color:rgba(255,255,255,.55);">'+cidade_curta+'</div>'
      +'<div class="ic-name">'+(p.soHist?'★ ':'')+p.nomeDisplay+'</div>';
    d.onclick=()=>selecionar(p);
    el.appendChild(d);
  });
  atualizarProgresso();
  atualizarNavFila();
}

function selecionar(p){sel=p;renderFila();renderDetalhe();habilitarBtns();}

function renderDetalhe(){
  const fichaEl=document.getElementById('ficha-content');
  const histEl=document.getElementById('hist-content');
  const decEl=document.getElementById('dec-content');
  if(!sel){
    if(fichaEl)fichaEl.innerHTML='<div style="padding:28px 14px;text-align:center;color:var(--muted);font-size:12px;line-height:2;"><div style="font-size:30px;margin-bottom:8px;">👆</div>Selecione um imigrante<br>na fila acima</div>';
    if(histEl)histEl.innerHTML='<div style="padding:28px 18px;text-align:center;color:var(--muted);font-size:12px;line-height:2;"><div style="font-size:30px;margin-bottom:8px;">📋</div>História do Caso<br>aparecerá aqui</div>';
    if(decEl)decEl.innerHTML='<div style="padding:18px 13px;color:var(--muted);font-size:11px;text-align:center;line-height:1.8;">Selecione um caso<br>para ver as opções.</div>';
    return;
  }
  const prMap={critico:'SITUAÇÃO CRÍTICA',grave:'CASO GRAVE',moderado:'MODERADO',estavel:'ESTÁVEL'};
  const vuln={critico:'Alta (Crítica)',grave:'Alta',moderado:'Moderada',estavel:'Baixa'};
  const vColor={critico:'var(--red)',grave:'var(--amber)',moderado:'var(--green)',estavel:'var(--blue)'};
  const estado={critico:'😰 Em desespero',grave:'😟 Preocupado',moderado:'😕 Ansioso',estavel:'😐 Resignado'};
  const diasV={critico:'10–20 dias a pé',grave:'7–14 dias',moderado:'3–7 dias',estavel:'1–3 dias'};
  const cl=sel.prioridade;
  const bd=Math.round(sel.b*G.desconto),ab=Math.round(sel.ab*G.desconto);
  const pts=sel.pts+(sel.prioridade==='critico'?G.bonusPts:0);
  const cidade=cidadeOrigem(sel.seed);
  const temMochila=rng(sel.seed,10)>.4;
  const profissoes=['Professor(a)','Médico(a)','Engenheiro(a)','Trabalhador informal','Comerciante','Artista','Estudante'];
  const prof=profissoes[Math.floor(rng(sel.seed,20)*profissoes.length)];

  if(fichaEl) fichaEl.innerHTML=
    '<div class="c-avatar-wrap">'
    +'<img src="'+retrato(sel,98,118)+'">'
    +'<div class="c-ven-badge">🇻🇪 Venezuela</div>'
    +'<div class="c-name">'+sel.nomeDisplay+'</div>'
    +'<div class="c-origem">'+cidade+'</div>'
    +'<div class="c-chips"><span class="chip '+cl+'">'+prMap[sel.prioridade]+'</span></div>'
    +'</div>'
    +'<div class="c-sec"><h4>SITUAÇÃO LEGAL</h4>'
    +'<div class="c-row"><span class="c-lbl">Status</span><span class="c-val">Solicitante de refúgio</span></div>'
    +'<div class="c-row"><span class="c-lbl">Profissão</span><span class="c-val">'+prof+'</span></div>'
    +'<div class="c-row"><span class="c-lbl">Documento</span><span class="c-val">'+(rng(sel.seed,11)>.5?'Protocolo Refúgio':'Sem documentação')+'</span></div>'
    +'<div class="c-row"><span class="c-lbl">Família</span><span class="c-val">'+(temMochila?'Com dependentes':'Sozinho/a')+'</span></div>'
    +'</div>'
    +'<div class="c-sec"><h4>NÍVEL DE VULNERABILIDADE</h4>'
    +'<div class="vuln-pill" style="background:'+vColor[sel.prioridade]+'1a;border:1px solid '+vColor[sel.prioridade]+'44;color:'+vColor[sel.prioridade]+';">'+vuln[sel.prioridade]+'</div>'
    +'<div style="margin-top:6px;font-size:10px;color:var(--muted);line-height:1.5;">'+estado[sel.prioridade]+' · '+diasV[sel.prioridade]+'</div>'
    +'</div>'
    +(sel.urgente?'<div class="urgente-box">⏱ CASO URGENTE — Timer ativo!</div>':'')
    +'<div class="c-sec" style="border-bottom:none;"><div class="dica-box">💡 DICA: Analise a situação com cuidado. Recursos são limitados.</div></div>';

  if(histEl) histEl.innerHTML=
    '<div class="c-hist-sec"><h3>HISTÓRIA DO CASO</h3><div class="c-quote">'+sel.historia+'</div></div>'
    +'<div class="c-hist-sec"><h3>LEGISLAÇÃO APLICÁVEL</h3><div class="lei-box">'+sel.lei+'</div></div>'
    +'<div class="c-hist-sec"><h3>DILEMA MORAL</h3><div class="dil-box">'+sel.dilema+'</div></div>';

  if(decEl) decEl.innerHTML=
    '<div style="padding:7px 12px;font-size:8px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid var(--border);">Escolha a melhor ação</div>'
    +'<div class="c-dec-body">'
    +'<div class="dec-opt acolher"><div class="dec-opt-top"><span class="dec-opt-icon">🏠</span><span class="dec-opt-title">Acolher</span></div>'
    +'<div class="dec-opt-desc">Receber no abrigo com acomodação completa.</div>'
    +'<div class="dec-impacts"><div class="dec-impact"><span class="lbl">Reputação</span><span class="pos">+15</span></div>'
    +'<div class="dec-impact"><span class="lbl">Vagas</span><span class="neg">-'+ab+'%</span></div>'
    +'<div class="dec-impact"><span class="lbl">Pressão</span><span class="neg">+10</span></div></div></div>'
    +'<div class="dec-opt assistencia"><div class="dec-opt-top"><span class="dec-opt-icon">🩺</span><span class="dec-opt-title">Assistência Básica</span></div>'
    +'<div class="dec-opt-desc">Oferecer alimentação, higiene e apoio temporário.</div>'
    +'<div class="dec-impacts"><div class="dec-impact"><span class="lbl">Orçamento</span><span class="neg">-'+Math.round(bd/2)+'%</span></div>'
    +'<div class="dec-impact"><span class="lbl">Pontos</span><span class="pos">+'+Math.round(pts*.5)+'</span></div>'
    +'<div class="dec-impact"><span class="lbl">Pressão</span><span class="neu">—</span></div></div></div>'
    +'<div class="dec-opt encaminhar"><div class="dec-opt-top"><span class="dec-opt-icon">➡️</span><span class="dec-opt-title">Encaminhar</span></div>'
    +'<div class="dec-opt-desc">Encaminhar para outro serviço ou instituição parceira.</div>'
    +'<div class="dec-impacts"><div class="dec-impact"><span class="lbl">Orçamento</span><span class="pos">R$ 0</span></div>'
    +'<div class="dec-impact"><span class="lbl">Reputação</span><span class="neg">-1</span></div>'
    +'<div class="dec-impact"><span class="lbl">'+(sel.prioridade==='critico'?'⚠️ Risco':'Risco')+'</span>'
    +'<span class="'+(sel.prioridade==='critico'?'neg':'neu')+'">'+(sel.prioridade==='critico'?'Pode se perder!':'Baixo')+'</span></div></div></div>'
    +'</div>';

  const h=document.getElementById('act-hint');
  if(h){
    if(sel.prioridade==='critico'){h.textContent='⚠️ Situação crítica!';h.style.color='var(--red)';}
    else if(sel.prioridade==='grave'){h.textContent='Caso grave — assistência é o mínimo.';h.style.color='var(--amber)';}
    else{h.textContent='Não urgente — encaminhar é adequado.';h.style.color='var(--muted)';}
  }
}

function renderCombo(){
  const n=Math.min(G.combo,5);
  for(let i=0;i<5;i++){const p=document.getElementById('pip'+i);if(p)p.className='combo-pip'+(i<n?' lit':'');}
  const msg=document.getElementById('combo-msg');
  if(G.combo>=5)msg.textContent='🔥 COMBO x2 — Pontos dobrados!';
  else if(G.combo>=3)msg.textContent='⚡ Combo x1.5!';
  else if(G.combo>=2)msg.textContent='✨ Combo!';
  else msg.textContent='';
}

// ── DECISÃO ───────────────────────────────────────────────────
/* ── REGRA BÁSICA DAS DECISÕES ───────────────────────────────
   acolher     → paga o custo inteiro (b, ab, t) e ganha os pontos inteiros;
                 aumenta o combo (3 seguidos = x1,5; 5 seguidos = x2)
   estabilizar → "Assistência": metade do custo e metade dos pontos
   encaminhar  → sem custo e sem pontos; se o caso for crítico, a pessoa é
                 perdida (pede confirmação antes) e a reputação cai 20
   As ações "verificar", "emprego" e "denunciar" são tratadas em
   decidirNova (v16), e o gancho mais abaixo soma os efeitos de conduta.
   ─────────────────────────────────────────────────────────── */
function decidir(acao,forcar){
  if(!sel)return;
  if(acao==='encaminhar'&&sel.prioridade==='critico'&&!G.encSalvo&&!forcar){var cb=document.getElementById('confirm-bar');if(cb)cb.classList.add('show');return;}
  cancelarConfirm();
  const p=sel;clearTimer(p.id);
  const r=G.res,d=G.desconto;
  let pts=p.pts+(p.prioridade==='critico'?G.bonusPts:0);
  const mult=G.combo>=5?2:G.combo>=3?1.5:1;

  if(acao==='acolher'){
    r.orcamento=Math.max(0,r.orcamento-Math.round(p.b*d));
    r.abrigo=Math.max(0,r.abrigo-Math.round(p.ab*d));
    if(!G.semDesgaste)r.equipe=Math.max(0,r.equipe-Math.round(p.t*d));
    pts=Math.round(pts*mult);
    G.pts+=pts;G.acolhidos++;
    if(p.prioridade==='critico'){G.critSalvos++;r.reputacao=Math.min(100,r.reputacao+5);}
    G.combo=Math.min(G.combo+1,5);G.maxCombo=Math.max(G.maxCombo,G.combo);
    if(G.combo>=2){somCombo(G.combo);mostrarStreakBadge(G.combo);}
    G.desconto=G.difBase||1;
    somAcolher();animCard(p.id,'salvo');popPts('+'+pts+(mult>1?` (x${mult})`:''));
    mostrarConsequencia(p,'acolher',pts);
  } else if(acao==='estabilizar'){
    const h=.5*d;
    r.orcamento=Math.max(0,r.orcamento-Math.round(p.b*h));
    r.abrigo=Math.max(0,r.abrigo-Math.round(p.ab*h));
    if(!G.semDesgaste)r.equipe=Math.max(0,r.equipe-Math.round(p.t*h));
    if(G.assistBonus)r.abrigo=Math.min(100,r.abrigo+5);
    pts=Math.round(pts*.5*mult);G.pts+=pts;G.acolhidos++;
    if(p.prioridade==='critico'){r.reputacao=Math.max(0,r.reputacao-5);G.combo=0;}
    else G.combo=Math.max(0,G.combo);
    somEstabilizar();animCard(p.id,'salvo');popPts('+'+pts);
    mostrarConsequencia(p,'estabilizar',pts);
  } else {
    G.encaminhados++;somEncaminhar();
    if(p.prioridade==='critico'&&!G.encSalvo){
      G.perdidos++;r.reputacao=Math.max(0,r.reputacao-20);G.combo=0;
      p.vivo=false;flashMorte();shake();
      notif(p.nomeDisplay+' — situação crítica sem acolhimento.','err');
      G.desconto=G.difBase||1;sel=null;
      setTimeout(()=>{renderFila();renderDetalhe();atualizarHUD();checarColapso();},650);
      desabilitarBtns();document.getElementById('act-hint').textContent='Selecione o próximo caso';document.getElementById('act-hint').style.color='var(--muted)';
      renderCombo();return;
    }
    if(G.encSalvo&&p.prioridade==='critico')G.encSalvo=false;
    if(p.prioridade==='grave')r.reputacao=Math.max(0,r.reputacao-(G.shieldLegal?0:8));
    G.combo=Math.max(0,G.combo-1);
    G.desconto=G.difBase||1;
    sel=null;p.vivo=false;
    pendConsequencia={p:p,acao:acao};
    desabilitarBtns();
    renderCombo();
    mostrarConsequencia(p,'encaminhar',0);return;
  }
  G.desconto=G.difBase||1;
  sel=null;p.vivo=false;
  pendConsequencia={p,acao};
  desabilitarBtns();
  document.getElementById('act-hint').textContent='Selecione o próximo caso';
  document.getElementById('act-hint').style.color='var(--muted)';
  renderCombo();
}

// Janela que mostra o resultado da decisão (texto de p.consequencias).
function mostrarConsequencia(p,acao,pts){
  if(!OPTS.conseq){notif(p.nomeDisplay+(acao==='acolher'?' acolhido(a)':acao==='estabilizar'?' recebeu assistência':' encaminhado(a)')+(pts>0?' · +'+pts+' pts':''),acao==='acolher'?'good':'ok');setTimeout(fecharConsequencia,50);return;}
  const icons={acolher:'✅',estabilizar:'🤝',encaminhar:'➡️'};
  const titulos={acolher:'Acolhido!',estabilizar:'Assistência Prestada',encaminhar:'Encaminhado'};
  const cq=p.consequencias[acao];
  const tipo=acao==='acolher'?'bom':acao==='encaminhar'&&p.prioridade==='critico'?'ruim':'neutro';
  document.getElementById('cq-icon').textContent=icons[acao];
  document.getElementById('cq-titulo').textContent=titulos[acao];
  document.getElementById('cq-desc').innerHTML=p.nomeDisplay+' <span style="font-size:11px;color:var(--muted);">· de '+cidadeOrigem(p.seed)+'</span>';
  document.getElementById('cq-impacto').innerHTML=`<div class="consequence-card ${tipo}">${cq}</div>${pts>0?`<div style="text-align:center;margin-top:8px;font-size:18px;font-weight:700;color:var(--gold)">+${pts} pontos</div>`:''}`;
  abrirOv('ov-consequencia');
}

function fecharConsequencia(){
  fecharOv('ov-consequencia');
  const p=pendConsequencia?pendConsequencia.p:null;
  pendConsequencia=null;
  if(p){
    const card=document.getElementById('icard-'+p.id);
    if(card){card.classList.add('morrendo');setTimeout(()=>renderFila(),400);}else renderFila();
  }else renderFila();
  renderDetalhe();atualizarHUD();checarColapso();
}

// Caso crítico que não foi atendido a tempo.
function perderImigrante(id){
  const p=fila.find(x=>x.id===id);if(!p||!p.vivo)return;
  p.vivo=false;G.perdidos++;G.res.reputacao=Math.max(0,G.res.reputacao-18);G.combo=0;
  animCard(id,'morrendo');flashMorte();shake();somPerda();
  notif('⚠️ '+p.nomeDisplay+' aguardou demais e se perdeu no sistema.','err');
  if(sel&&sel.id===id){sel=null;renderDetalhe();desabilitarBtns();}
  setTimeout(()=>{renderFila();atualizarHUD();checarColapso();renderCombo();},650);
}


// ── PRÓXIMO DIA ───────────────────────────────────────────────
function proximoDia(){
  clearAllTimers();
  if(fila.filter(p=>p.vivo).length>0)return;
  somDia();
  if(G.dia%2===0){mostrarUpgrade();return;}
  avancarDiaInterno();
}

function avancarDia(){avancarDiaInterno();}

function mostrarUpgrade(){
  const pool=[...UPGRADES].sort(()=>Math.random()-.5).slice(0,3);
  document.getElementById('upg-sub').textContent=`Dia ${G.dia} concluído! Você tem ${G.acolhidos} pessoas acolhidas. Escolha um recurso:`;
  const grid=document.getElementById('upg-grid');grid.innerHTML='';
  pool.forEach(u=>{
    const d=document.createElement('div');d.className='upg-card';
    d.innerHTML=`<div class="upg-icon">${u.icon}</div><div class="upg-nome">${u.nome}</div><div class="upg-desc">${u.desc}</div>`;
    // fix: use upg-name not upg-nome in HTML
    d.querySelector('.upg-nome').style.cssText='font-size:13px;font-weight:700;margin-bottom:4px;';
    d.onclick=()=>{u.apply(G);G.upgrades.push(u.nome);fecharOv('ov-upgrade');somUpgrade();notif('Recurso: '+u.nome+'!','good');avancarDiaInterno();};
    grid.appendChild(d);
  });
  abrirOv('ov-upgrade');
}

function mostrarEvento(ev){
  document.getElementById('ev-titulo').textContent=ev.titulo;
  document.getElementById('ev-desc').textContent=ev.desc;
  const ch=document.getElementById('ev-choices');ch.innerHTML='';
  ev.choices.forEach((c,i)=>{
    const b=document.createElement('button');b.className='ev-btn'+(i===0?' main':'');b.textContent=c.txt;
    b.onclick=()=>{c.fx(G);fecharOv('ov-evento');atualizarHUD();};
    ch.appendChild(b);
  });
  abrirOv('ov-evento');
}

// ── FIM DE JOGO ───────────────────────────────────────────────
// Encerra a partida se algum recurso essencial chegar a zero.
function checarColapso(){
  if(G.res.orcamento<=0&&G.res.abrigo<=0){encerrarJogoV14(true);return;}
  if(G.res.orcamento<=0&&!G._wOrc){G._wOrc=true;showBanner('🔴 Orçamento esgotado! Só assistência básica disponível.');flashMorte();}
  if(G.res.abrigo<=0&&!G._wAbr){G._wAbr=true;showBanner('🔴 Abrigo lotado! Novos acolhimentos impossíveis.');flashMorte();}
  if(G.res.equipe<=10&&!G._wEq){G._wEq=true;showBanner('⚠️ Equipe exausta! Capacidade de atendimento reduzida.');}
  if(G.res.reputacao<=20&&!G._wRep){G._wRep=true;showBanner('⚠️ Reputação crítica! Doadores podem retirar apoio.');}
}
function encerrarJogo(col){encerrarJogoV14(col);}

function atualizarHUD(){
  const e=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  if(!G)return;
  e('s-dia',G.dia);e('s-acolhidos',G.acolhidos);e('s-pts',G.pts);
  const lp=document.getElementById('s-perdidos');
  if(lp){lp.textContent=G.perdidos;lp.className='sp-val'+(G.perdidos>=3?' danger':G.perdidos>=1?' warn':'');}
  if(!G.res)return;
  const r=G.res;
  const bf=document.getElementById('badge-fase');
  if(bf)bf.textContent='Dia '+(G.dia||1)+(G.dia>=7?' 🔴':G.dia>=4?' ⚠️':'');
  const fl=document.getElementById('fila-lbl');
  if(fl)fl.textContent='Fila de Atendimento'+(G.dia>=4?' — casos com timer':'');
  const pressao=Math.max(0,100-r.equipe);
  const pf=document.getElementById('pressao-fill-strip');
  if(pf){pf.style.width=pressao+'%';pf.style.background=pressao>70?'var(--red)':pressao>40?'var(--amber)':'var(--green)';}
  const pv=document.getElementById('pressao-val-strip');if(pv)pv.textContent=Math.round(pressao)+'%';
  // legacy compat
  ['orcamento','abrigo','equipe','reputacao'].forEach(k=>{
    const v=Math.round(r[k]);
    const f=document.getElementById('rf-'+k);if(f){f.style.width=v+'%';}
    const rv=document.getElementById('rv-'+k);if(rv)rv.textContent=v+'%';
  });
}

function abrirOv(id){document.getElementById(id).classList.remove('off');}
function fecharOv(id){document.getElementById(id).classList.add('off');}

// window.onload movido para o fim do arquivo

// ── SAVE / LOAD ───────────────────────────────────────────────
// ── SALVAMENTO ──
// A partida é salva no LocalStorage do navegador ao fim de cada dia.
// Na versão em espanhol a chave vira "fronteira_save_es" (i18n/traduzir.js).
function salvarJogo(){
  try{
    const save={G,timestamp:Date.now(),versao:'1.0'};
    localStorage.setItem('fronteira_save',JSON.stringify(save));
  }catch(e){}
}

function carregarJogo(){
  try{
    const raw=localStorage.getItem('fronteira_save');
    if(!raw)return null;
    const save=JSON.parse(raw);
    return save;
  }catch(e){return null;}
}

function verificarSave(){
  const save=carregarJogo();
  const btn=document.getElementById('btn-continuar');
  const info=document.getElementById('continuar-info');
  if(save&&save.G&&!save.G.gameOver){
    btn.disabled=false;
    const d=new Date(save.timestamp);
    info.textContent=`Dia ${save.G.dia} · ${save.G.pts}pts`;
  } else {
    btn.disabled=true;
    info.textContent='Sem save';
  }
}

// ── RECORDS ───────────────────────────────────────────────────
// Guarda as 5 melhores pontuações (chave "fronteira_records").
function salvarRecord(pts,grade,titulo,dias,acolhidos,perdidos,encaminhados=0){
  try{
    const raw=localStorage.getItem('fronteira_records');
    let records=raw?JSON.parse(raw):[];
    records.push({pts,grade,titulo,dias,acolhidos,perdidos,encaminhados,data:Date.now()});
    records.sort((a,b)=>b.pts-a.pts);
    records=records.slice(0,5);
    localStorage.setItem('fronteira_records',JSON.stringify(records));
  }catch(e){}
}

function carregarRecords(){
  try{
    const raw=localStorage.getItem('fronteira_records');
    return raw?JSON.parse(raw):[];
  }catch(e){return [];}
}

function limparRecords(){
  if(confirm('Apagar todos os recordes?')){
    localStorage.removeItem('fronteira_records');
    renderRecords();
    notif('Recordes apagados.','ok');
  }
}

function renderRecords(){
  const records=carregarRecords();
  const el=document.getElementById('records-list');
  if(records.length===0){
    el.innerHTML='<div class="no-records" style="text-align:center;padding:24px;color:var(--muted);">Nenhum recorde ainda.<br>Complete uma partida para aparecer aqui!</div>';
    return;
  }
  const rankIcons=['🥇','🥈','🥉','4º','5º'];
  const rankCls=['gold','silver','bronze','',''];
  const gradeColors={S:'#c8940a',A:'#1a6e3a',B:'#1a4a8a',C:'#7a5a1a',D:'#8a2020'};
  el.innerHTML=records.map((r,i)=>{
    const encaminhados=(r.encaminhados||0);
    const total=r.acolhidos+r.perdidos+encaminhados;
    const pctAcolhidos=total>0?Math.round(r.acolhidos/total*100):0;
    const data=new Date(r.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});
    const cor=gradeColors[r.grade]||'#888';
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid #e2e8f0;${i===0?'background:rgba(200,148,10,.08);border-radius:8px;':''}">
      <div style="font-size:22px;width:32px;text-align:center;">${rankIcons[i]}</div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-size:18px;font-weight:700;color:${cor}">${r.grade}</span>
          <span style="font-size:13px;font-weight:600;">${r.pts.toLocaleString('pt-BR')} pts</span>
          <span style="font-size:11px;color:var(--muted);background:#f1f5f9;padding:2px 8px;border-radius:4px;">${r.titulo}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;">
          <div style="font-size:10px;text-align:center;background:rgba(26,110,58,.15);border-radius:4px;padding:4px;">
            <div style="color:#4aaa70;font-size:13px;font-weight:700;">${r.acolhidos}</div>
            <div style="color:var(--muted);">acolhidos</div>
          </div>
          <div style="font-size:10px;text-align:center;background:rgba(180,40,40,.15);border-radius:4px;padding:4px;">
            <div style="color:#e06060;font-size:13px;font-weight:700;">${r.perdidos}</div>
            <div style="color:var(--muted);">perdidos</div>
          </div>
          <div style="font-size:10px;text-align:center;background:#f1f5f9;border-radius:4px;padding:4px;">
            <div style="color:#475569;font-size:13px;font-weight:700;">${encaminhados}</div>
            <div style="color:var(--muted);">encaminh.</div>
          </div>
          <div style="font-size:10px;text-align:center;background:rgba(30,80,160,.15);border-radius:4px;padding:4px;">
            <div style="color:#6090e0;font-size:13px;font-weight:700;">D${r.dias}</div>
            <div style="color:var(--muted);">${data}</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── OPÇÕES ────────────────────────────────────────────────────
// Opções do menu: dificuldade, cronômetro dos casos urgentes, mostrar leis,
// animações e janela de consequência.
let OPTS={dificuldade:'normal',timer:true,leis:true,anim:true,conseq:true};

function carregarOpcoes(){
  try{
    const raw=localStorage.getItem('fronteira_opts');
    if(raw)OPTS={...OPTS,...JSON.parse(raw)};
  }catch(e){}
  aplicarOpcoes();
}

function salvarOpcoes(){
  OPTS.dificuldade=document.getElementById('opt-dificuldade').value;
  try{localStorage.setItem('fronteira_opts',JSON.stringify(OPTS));}catch(e){}
}

function aplicarOpcoes(){
  document.getElementById('opt-dificuldade').value=OPTS.dificuldade;
  ['timer','leis','anim','conseq'].forEach(k=>{
    const el=document.getElementById('opt-'+k);
    if(el){el.className='opt-toggle'+(OPTS[k]?' on':'');}
  });
  // Aplicar opt-leis: esconder/mostrar legislação
  const lei=document.getElementById('bloco-lei');
  if(lei)lei.style.display=OPTS.leis?'':'none';
  // Aplicar opt-anim: desativar flash e shake via CSS
  document.body.classList.toggle('no-anim',!OPTS.anim);
  // Aplicar dificuldade nos custos
}

function toggleOpt(id){
  const key=id.replace('opt-','');
  OPTS[key]=!OPTS[key];
  const el=document.getElementById(id);
  el.className='opt-toggle'+(OPTS[key]?' on':'');
  salvarOpcoes();
}

function apagarSave(){
  if(confirm('Apagar o save atual?')){
    localStorage.removeItem('fronteira_save');
    verificarSave();
    notif('Save apagado.','ok');
  }
}

// ── NAVEGAÇÃO DE MENU ─────────────────────────────────────────
function abrirMenu(){
  clearAllTimers();
  document.getElementById('tela-menu').classList.remove('off');
  verificarSave();
}

function voltarMenu(){
  if(!confirm('Voltar ao menu? O progresso do dia atual não será salvo.'))return;
  clearAllTimers();
  salvarJogo();
  document.getElementById('tela-menu').classList.remove('off');
  verificarSave();
}


function menuContinuar(){
  const save=carregarJogo();
  if(!save||!save.G)return;
  G=Object.assign(novoEstadoHist(),save.G);
  sel=null;fila=[];timers={};
  document.getElementById('tela-menu').classList.add('off');
  renderFila();renderDetalhe();atualizarHUD();desabilitarBtns();
  renderCombo();
  document.getElementById('btn-next').disabled=fila.filter(p=>p.vivo).length>0;
  notif('Jogo carregado — Dia '+G.dia,'good');
  setTimeout(iniciarTimers,600);
}

function menuRecords(){
  renderRecords();
  abrirOv('ov-records');
}

function menuOpcoes(){
  aplicarOpcoes();
  const bc=document.getElementById('opt-som-cfg');
  if(bc)bc.className='opt-toggle'+(somOn?' on':'');
  abrirOv('ov-opcoes');
}


// ═══════════════════════════════════════════════════
// CONTROLADOR v12 — TELAS FIÉIS ÀS IMAGENS
// ═══════════════════════════════════════════════════

// Estado de tela atual
let telaAtual = 'menu'; // 'menu' | 'dash' | 'caso'

function mostrarEl(id, disp='flex'){const e=document.getElementById(id);if(e)e.style.display=disp;}
function ocultarEl(id){const e=document.getElementById(id);if(e)e.style.display='none';}


// ── SOM (Web Audio API) ──────────────────────────────────────
function getACtx(){
  if(!somOn)return null;
  if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}
  if(audioCtx.state==='suspended')audioCtx.resume();
  return audioCtx;
}
function tone(freq,dur,type,vol,delay){
  type=type||'sine';vol=vol||0.12;delay=delay||0;
  var ctx=getACtx();if(!ctx)return;
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.connect(g);g.connect(ctx.destination);
  o.type=type;o.frequency.setValueAtTime(freq,ctx.currentTime+delay);
  g.gain.setValueAtTime(0,ctx.currentTime+delay);
  g.gain.linearRampToValueAtTime(vol,ctx.currentTime+delay+0.01);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+dur);
  o.start(ctx.currentTime+delay);o.stop(ctx.currentTime+delay+dur+0.05);
}


// ── OVERRIDE SELECIONAR ───────────────────────────────────────
var _selecionarBase=selecionar;


/* A partir daqui, o "controlador v14" redefine várias funções do bloco acima
   (renderFila, renderDetalhe, atualizarHUD, proximoDia...). Quando a mesma
   função aparece de novo, vale a definição mais recente. */
// ════════════════ CONTROLADOR v14 ════════════════
var audioCtx=null,somOn=true,pausado=false,_nt;
function getACtx(){if(!somOn)return null;if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}
function tone(freq,dur,type,vol,delay){type=type||'sine';vol=vol||0.12;delay=delay||0;var ctx=getACtx();if(!ctx)return;var o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type=type;o.frequency.setValueAtTime(freq,ctx.currentTime+delay);g.gain.setValueAtTime(0,ctx.currentTime+delay);g.gain.linearRampToValueAtTime(vol,ctx.currentTime+delay+0.01);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+dur);o.start(ctx.currentTime+delay);o.stop(ctx.currentTime+delay+dur+0.05);}
// Efeitos sonoros gerados na hora pela Web Audio API (sem arquivos de áudio):
// tone(frequência, duração, forma de onda, volume, atraso).
function somAcolher(){tone(330,.12,'sine',.12,0);tone(415,.12,'sine',.12,.08);tone(495,.18,'sine',.14,.16);}
function somEstabilizar(){tone(280,.15,'sine',.10,0);tone(350,.15,'sine',.10,.1);}
function somEncaminhar(){tone(300,.12,'sine',.10,0);tone(240,.20,'sine',.08,.1);}
function somPerda(){tone(180,.08,'sawtooth',.08,0);tone(120,.35,'sine',.12,.06);}
function somCombo(n){var m=[[440,554,659],[440,554,659,880],[440,554,659,880,1108],[523,659,784,1047,1319]][Math.min(n-2,3)]||[440];m.forEach(function(f,i){tone(f,.10,'sine',.12,i*.07);});}
function somUpgrade(){tone(523,.10,'sine',.13,0);tone(659,.10,'sine',.13,.09);tone(784,.10,'sine',.13,.18);tone(1047,.25,'sine',.15,.27);}
function somTick(){tone(880,.04,'square',.06);}
function somCrise(){tone(220,.08,'sawtooth',.10,0);tone(196,.08,'sawtooth',.10,.1);}
function somDia(){tone(392,.12,'sine',.10,0);tone(523,.20,'sine',.12,.12);}
function somMenu(){tone(440,.08,'sine',.08);}
function toggleSom(){somOn=!somOn;var b=document.getElementById('btn-som');if(b)b.textContent=somOn?'🔊':'🔇';notif(somOn?'Som ativado':'Som desativado','ok');}
function toggleOptSom(){toggleSom();var t=document.getElementById('opt-som-cfg');if(t)t.className='opt-toggle'+(somOn?' on':'');}
function togglePausa(){pausado=!pausado;var ov=document.getElementById('pausa-overlay');var btn=document.getElementById('btn-pausa');if(pausado){ov.classList.remove('off');if(btn)btn.textContent='▶ Continuar';}else{ov.classList.add('off');if(btn)btn.textContent='⏸ Pausa';}}
// Aviso rápido no canto da tela. Tipos: 'ok', 'good', 'warn', 'err'.
function notif(m,t){t=t||'ok';var e=document.getElementById('notif');if(!e)return;e.textContent=m;e.className='show '+t;clearTimeout(_nt);_nt=setTimeout(function(){e.classList.remove('show');},3000);}
function flashMorte(){var f=document.getElementById('death-flash');if(f){f.classList.add('show');setTimeout(function(){f.classList.remove('show');},350);}}
function shake(){document.body.classList.add('shaking');setTimeout(function(){document.body.classList.remove('shaking');},450);}
function showBanner(t){var b=document.getElementById('boss-banner');if(b){b.textContent=t;b.classList.add('show');setTimeout(function(){b.classList.remove('show');},3500);}}
function popPts(t){var d=document.createElement('div');d.className='score-pop';d.textContent=t;d.style.cssText='left:'+(30+Math.random()*30)+'%;top:'+(20+Math.random()*30)+'%;position:fixed;';document.body.appendChild(d);setTimeout(function(){d.remove();},1000);}
function animCard(id,cls){var c=document.getElementById('icard-'+id);if(c)c.classList.add(cls);}
function mostrarStreakBadge(n){var m={2:'✨ Combo!',3:'⚡ Triple!',4:'🔥 Incrível!',5:'💥 MÁXIMO!'};if(!m[n])return;var b=document.getElementById('streak-badge');b.textContent=m[n];b.classList.add('show');setTimeout(function(){b.classList.remove('show');},900);}
function toggleKbdHint(){document.getElementById('kbd-hint').classList.toggle('show');}
function navegarFila(dir){var vivos=fila.filter(function(p){return p.vivo;});if(!vivos.length)return;var idx=sel?vivos.findIndex(function(p){return p.id===sel.id;}):-1;var next=idx+dir;if(next<0)next=vivos.length-1;if(next>=vivos.length)next=0;selecionar(vivos[next]);var card=document.getElementById('icard-'+vivos[next].id);if(card)card.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});}
function atualizarNavFila(){var vivos=fila.filter(function(p){return p.vivo;});var idx=sel?vivos.findIndex(function(p){return p.id===sel.id;}):-1;var txt=document.getElementById('fila-idx');if(txt)txt.textContent=vivos.length>0?(idx+1)+'/'+vivos.length:'—';var prev=document.getElementById('nav-prev');var nxt=document.getElementById('nav-next');if(prev)prev.disabled=vivos.length<=1;if(nxt)nxt.disabled=vivos.length<=1;}
document.addEventListener('keydown',function(e){if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if(document.querySelector('.ov:not(.off)'))return;if(pausado&&e.key!=='p'&&e.key!=='P')return;if(e.key===' '){e.preventDefault();var b3=document.getElementById('btn-next');if(b3&&!b3.disabled)proximoDia();}if(e.key==='ArrowLeft')navegarFila(-1);if(e.key==='ArrowRight')navegarFila(1);if(e.key==='p'||e.key==='P')togglePausa();});
function cancelarConfirm(){var bar=document.getElementById('confirm-bar');if(bar)bar.classList.remove('show');}
function confirmarEncaminhar(){cancelarConfirm();decidir('encaminhar',true);}
// Decide se o botão "Ajudar" vai Acolher ou dar Assistência, conforme os recursos.
function calcularModoAjuda(){if(!sel)return null;return(G.res.orcamento-Math.round(sel.b*G.desconto)>=0)&&(G.res.abrigo-Math.round(sel.ab*G.desconto)>=0)?'acolher':'estabilizar';}
function decidirAjudar(){var m=calcularModoAjuda();if(m)decidir(m);}
function atualizarBtnAjudar(){var btn=document.getElementById('btn-ajudar');if(!btn||!sel)return;var m=calcularModoAjuda();btn.classList.remove('modo-acolher','modo-assist');var icon=document.getElementById('btn-ajudar-icon'),sub=document.getElementById('btn-ajudar-sub'),tip=document.getElementById('btn-ajudar-tooltip');if(m==='acolher'){btn.classList.add('modo-acolher');if(icon)icon.textContent='🏠';if(sub)sub.textContent='Integrar ao abrigo';if(tip)tip.innerHTML='Recursos suficientes.<br>Vai acolher completamente.';}else{btn.classList.add('modo-assist');if(icon)icon.textContent='🤝';if(sub)sub.textContent='Apoio básico';if(tip)tip.innerHTML='Recursos escassos.<br>Assistência parcial.';}}
function atualizarBtnEnc(){var btn=document.getElementById('btn-encaminhar');if(!btn)return;if(sel&&sel.prioridade==='critico')btn.classList.add('critico-sel');else btn.classList.remove('critico-sel');}
habilitarBtns=function(){var ba=document.getElementById('btn-ajudar');if(ba)ba.disabled=!sel;var be=document.getElementById('btn-encaminhar');if(be)be.disabled=!sel;atualizarBtnEnc();if(sel)atualizarBtnAjudar();};
desabilitarBtns=function(){['btn-ajudar','btn-encaminhar'].forEach(function(id){var e=document.getElementById(id);if(e){e.disabled=true;e.classList.remove('critico-sel','modo-acolher','modo-assist');}});var icon=document.getElementById('btn-ajudar-icon');if(icon)icon.textContent='🤝';var sub=document.getElementById('btn-ajudar-sub');if(sub)sub.textContent='Calcular melhor apoio';};
var _selBase=selecionar;selecionar=function(p){_selBase(p);atualizarNavFila();atualizarBtnEnc();atualizarBtnAjudar();};

function atualizarProgresso(){var pc=document.getElementById('prog-casos'),pt=document.getElementById('prog-texto');if(!pc||!G)return;pc.innerHTML='';fila.forEach(function(p){var dot=document.createElement('div');dot.className='prog-dot '+(p.vivo?p.prioridade:'concluido');pc.appendChild(dot);});var tot=fila.length,vivos=fila.filter(function(p){return p.vivo;}).length;if(pt)pt.textContent=(tot-vivos)+'/'+tot;}

renderFila=function(){
  var el=document.getElementById('fila-cards');if(!el)return;el.innerHTML='';
  var vivos=fila.filter(function(p){return p.vivo;});
  if(vivos.length===0){el.innerHTML='<div class="fila-empty-msg">✅ Fila vazia — avance para o próximo dia!</div>';var bn=document.getElementById('btn-next');if(bn)bn.disabled=false;atualizarProgresso();return;}
  var bn=document.getElementById('btn-next');if(bn)bn.disabled=true;
  vivos.forEach(function(p){
    var d=document.createElement('div');
    d.className='icard '+p.prioridade+(sel&&sel.id===p.id?' sel':'')+(p.urgente?' urgente':'');
    d.id='icard-'+p.id;
    var cc=cidadeOrigem(p.seed).substring(0,8);
    d.innerHTML='<img class="ic-img" src="'+retrato(p,80,106)+'"><div class="ic-ov"></div><div class="ic-dot"></div>'+(p.urgente?'<div class="ic-timer" id="pt-'+p.id+'">⏱</div>':'')+'<div style="position:absolute;top:4px;right:4px;z-index:5;background:rgba(0,0,0,.7);border-radius:2px;overflow:hidden;display:flex;flex-direction:column;width:12px;"><div style="background:#CF142B;height:3px;"></div><div style="background:#00247D;height:3px;"></div><div style="background:#F4C300;height:3px;"></div></div><div style="position:absolute;bottom:12px;left:0;right:0;text-align:center;z-index:3;font-size:7px;color:rgba(255,255,255,.5);">'+cc+'</div><div class="ic-name">'+(p.soHist?'★ ':'')+p.nomeDisplay+'</div>';
    d.onclick=function(){selecionar(p);};
    el.appendChild(d);
  });
  atualizarProgresso();atualizarNavFila();
};

renderDetalhe=function(){
  var fichaEl=document.getElementById('ficha-content'),histEl=document.getElementById('hist-content'),decEl=document.getElementById('dec-content');
  if(!sel){
    if(fichaEl)fichaEl.innerHTML='<div style="padding:28px 14px;text-align:center;color:rgba(255,255,255,.35);font-size:12px;line-height:2;"><div style="font-size:30px;margin-bottom:8px;">👆</div>Selecione um imigrante<br>na fila acima</div>';
    if(histEl)histEl.innerHTML='<div style="padding:28px 18px;text-align:center;color:var(--txt-light);font-size:12px;line-height:2;"><div style="font-size:30px;margin-bottom:8px;">📋</div>História do Caso<br>aparecerá aqui</div>';
    if(decEl)decEl.innerHTML='<div style="padding:18px 13px;color:var(--txt-light);font-size:11px;text-align:center;line-height:1.8;">Selecione um caso<br>para ver as opções.</div>';
    return;
  }
  var prMap={critico:'SITUAÇÃO CRÍTICA',grave:'CASO GRAVE',moderado:'MODERADO',estavel:'ESTÁVEL'};
  var vColor={critico:'critico',grave:'grave',moderado:'moderado',estavel:'estavel'};
  var vulnLabel={critico:'Alto (Crítico)',grave:'Alto',moderado:'Moderado',estavel:'Baixo'};
  var estadoLabel={critico:'😰 Em desespero',grave:'😟 Preocupado',moderado:'😕 Ansioso',estavel:'😐 Resignado'};
  var diasLabel={critico:'10–20 dias a pé',grave:'7–14 dias',moderado:'3–7 dias',estavel:'1–3 dias'};
  var bd=Math.round(sel.b*G.desconto),ab=Math.round(sel.ab*G.desconto);
  var pts=sel.pts+(sel.prioridade==='critico'?G.bonusPts:0);
  var cidade=cidadeOrigem(sel.seed),mochila=rng(sel.seed,10)>.4;
  var profs=['Professor(a)','Médico(a)','Engenheiro(a)','Trabalhador informal','Comerciante','Artista','Estudante'];
  var prof=profs[Math.floor(rng(sel.seed,20)*profs.length)];

  if(fichaEl)fichaEl.innerHTML=
    '<div class="cf-avatar-area"><div class="cf-photo-wrap"><img class="cf-photo" src="'+retrato(sel,100,120)+'"><div class="cf-ven">🇻🇪 Venezuela</div></div>'
    +'<div class="cf-name">'+sel.nomeDisplay+'</div><div class="cf-origem">'+cidade+'</div>'
    +'<div class="cf-chips"><span class="chip '+vColor[sel.prioridade]+'">'+prMap[sel.prioridade]+'</span></div></div>'
    +'<div class="cf-sec"><h4>SITUAÇÃO LEGAL</h4>'
    +'<div class="cf-row"><span class="cf-lbl">Status</span><span class="cf-val">Solicitante de refúgio</span></div>'
    +'<div class="cf-row"><span class="cf-lbl">Profissão</span><span class="cf-val">'+metaCaso(sel).prof+'</span></div>'
    +'<div class="cf-row"><span class="cf-lbl">Qualificação</span><span class="cf-val">'+linhaQual(sel)+'</span></div>'
    +'<div class="cf-row"><span class="cf-lbl">Documento</span><span class="cf-val">'+linhaDoc(sel)+'</span></div>'
    +'<div class="cf-row"><span class="cf-lbl">Família</span><span class="cf-val">'+(mochila?'Com dependentes':'Sozinho/a')+'</span></div></div>'
    +'<div class="cf-sec"><h4>NÍVEL DE VULNERABILIDADE</h4>'
    +'<div class="vuln-pill '+vColor[sel.prioridade]+'">🔴 '+vulnLabel[sel.prioridade]+'</div>'
    +'<div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,.4);line-height:1.5;">'+estadoLabel[sel.prioridade]+' · '+diasLabel[sel.prioridade]+'</div></div>'
    +(sel.urgente?'<div class="urgente-box">⏱ CASO URGENTE — Timer ativo!</div>':'')
    +'<div class="cf-sec" style="border-bottom:none;"><div class="dica-azul">💡 DICA: Analise a situação com cuidado. Recursos são limitados.</div></div>'
    +'<div class="cf-footer-note">DICA: Analise cuidadosamente a situação e os impactos de cada decisão. Seus recursos são limitados e a diferença.</div>';

  if(histEl)histEl.innerHTML=blocoConferencia(sel)
    +'<div class="ch-sec historia"><h3>HISTÓRIA DO CASO</h3><div class="ch-quote-wrap"><span class="ch-quote-mark">"</span><div class="ch-quote-text">'+sel.historia+'</div></div></div>'
    +(OPTS.leis?'<div class="ch-sec lei"><h3>LEGISLAÇÃO APLICÁVEL</h3><div class="lei-box">'+sel.lei+'</div></div>':'')
    +'<div class="ch-sec dilema"><h3>DILEMA MORAL</h3><div class="dil-box">'+sel.dilema+'</div></div>';

  if(decEl)decEl.innerHTML=
    '<div style="padding:7px 12px;font-size:8px;color:var(--txt-muted);font-weight:700;text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid var(--border);">Escolha a melhor ação para este caso</div>'
    +'<div class="cd-body">'
    +'<div class="dec-opt acolher"><div class="dec-opt-top"><div class="dec-opt-icon-wrap">🏠</div><span class="dec-opt-title">Acolher</span></div>'
    +'<div class="dec-opt-desc">Receber a família no abrigo com acomodação completa.</div>'
    +'<div class="dec-impacts"><div class="dec-impact"><span class="lbl">Reputação</span><span class="pos">+15</span></div>'
    +'<div class="dec-impact"><span class="lbl">Vagas</span><span class="neg">-'+ab+'%</span></div>'
    +'<div class="dec-impact"><span class="lbl">Pressão</span><span class="neg">+10</span></div></div></div>'
    +'<div class="dec-opt assistencia"><div class="dec-opt-top"><div class="dec-opt-icon-wrap">🤝</div><span class="dec-opt-title">Assistência Básica</span></div>'
    +'<div class="dec-opt-desc">Oferecer alimentação, higiene e apoio por alguns dias.</div>'
    +'<div class="dec-impacts"><div class="dec-impact"><span class="lbl">Orçamento</span><span class="neg">-'+Math.round(bd/2)+'%</span></div>'
    +'<div class="dec-impact"><span class="lbl">Pontos</span><span class="pos">+'+Math.round(pts*.5)+'</span></div>'
    +'<div class="dec-impact"><span class="lbl">Pressão</span><span class="neu">—</span></div></div></div>'
    +'<div class="dec-opt encaminhar"><div class="dec-opt-top"><div class="dec-opt-icon-wrap">➡️</div><span class="dec-opt-title">Encaminhar</span></div>'
    +'<div class="dec-opt-desc">Encaminhar para outro serviço ou instituição parceira.</div>'
    +'<div class="dec-impacts"><div class="dec-impact"><span class="lbl">Orçamento</span><span class="pos">R$ 0</span></div>'
    +'<div class="dec-impact"><span class="lbl">Reputação</span><span class="neg">-1</span></div>'
    +'<div class="dec-impact"><span class="lbl">'+(sel.prioridade==='critico'?'⚠️ Risco':'Risco')+'</span><span class="'+(sel.prioridade==='critico'?'neg':'neu')+'">'+(sel.prioridade==='critico'?'Pode se perder!':'Baixo')+'</span></div></div></div>'
    +cardFerramentas(sel)
    +'</div>'
    +'<button class="cd-ver-fila" onclick="irParaDash()">👤 Ver Relatório do Abrigo</button>';

  var h=document.getElementById('act-hint');
  if(h){if(sel.prioridade==='critico'){h.textContent='⚠️ Situação crítica!';h.style.color='#ef4444';}else if(sel.prioridade==='grave'){h.textContent='Caso grave — assistência é o mínimo.';h.style.color='#f59e0b';}else{h.textContent='Não urgente — encaminhar é adequado.';h.style.color='var(--txt-light)';}}
};

renderCombo=function(){var n=Math.min(G.combo,5);for(var i=0;i<5;i++){var p=document.getElementById('pip'+i);if(p)p.className='cpip'+(i<n?' lit':'');}var msg=document.getElementById('combo-msg');if(!msg)return;if(G.combo>=5)msg.textContent='🔥 x2!';else if(G.combo>=3)msg.textContent='⚡ x1.5!';else if(G.combo>=2)msg.textContent='✨';else msg.textContent='';};

atualizarHUD=function(){
  function el(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
  if(!G)return;
  el('s-dia',G.dia+' / 10');
  el('s-pts',Math.round(G.res?G.res.reputacao:50)+' / 100');
  var pressao=G.res?Math.max(0,100-G.res.equipe):0;
  el('s-pressao-hdr',Math.round(pressao)+' / 100');
  var lp=document.getElementById('s-perdidos');if(lp){lp.textContent=G.perdidos;lp.className='hpill-val'+(G.perdidos>=3?' danger':G.perdidos>=1?' warn':'');}
  var bf=document.getElementById('badge-fase');if(bf)bf.textContent='Dia '+G.dia+(G.dia>=7?' 🔴':G.dia>=4?' ⚠️':'');
  var fl=document.getElementById('fila-lbl');if(fl)fl.textContent='Fila de Atendimento'+(G.dia>=4?' — com timer':'');
  var pf=document.getElementById('pressao-fill-strip');if(pf){pf.style.width=Math.round(pressao)+'%';pf.style.background=pressao>70?'#ef4444':pressao>40?'#f59e0b':'#22c55e';}
  var pv=document.getElementById('pressao-val-strip');if(pv)pv.textContent=Math.round(pressao)+'%';
};

// Painel do dia (tela entre o fim de um dia e o próximo atendimento).
function atualizarDash(){
  if(!G||!G.res)return;
  var r=G.res,d=G.dia||1;
  function el(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
  var titulos=['Um novo dia começa no abrigo.','A fila cresce. Novas histórias chegam.','Recursos escassos, demandas crescentes.','Casos urgentes — timers ativados!','A pressão aumenta. Mantenha o foco.','Fase crítica — cada vaga conta.','Os últimos dias. Seu legado está em jogo.'];
  var dicas=['Priorize os casos mais vulneráveis e mantenha seus recursos equilibrados. Cada decisão importa!','Casos críticos têm timer a partir do Dia 4. Decida rapidamente!','Mantenha sua reputação alta para garantir doações e parcerias.','Upgrades a cada 2 dias — escolha melhorias estratégicas.','Encaminhar casos críticos pode custar vidas. Use com cautela.'];
  var quotes=['A empatia é o primeiro passo para transformar realidades.','Cada pessoa que passa pela fronteira carrega uma história de resistência.','Gerir com humanidade é também um ato político.','A dignidade humana não tem fronteiras.'];
  var pressao=Math.max(0,100-r.equipe);
  var nF=fila.length;
  el('dash-dia-num',d);
  el('d-tag','INFORMAÇÕES DO DIA · DIA '+d+' / 10');
  el('d-titulo',titulos[Math.min(d-1,titulos.length-1)]);
  el('d-sub',d===1?'Novas histórias, novos desafios.':d>=8?'O abrigo chega à reta final.':'Continue tomando boas decisões.');
  el('d-orc','R$ '+Math.round(r.orcamento*100).toLocaleString('pt-BR'));
  el('d-vagas',Math.round(r.abrigo)+' / 100');
  el('d-rep',Math.round(r.reputacao)+' / 100');
  el('d-pressao',Math.round(pressao)+' / 100');
  el('d-fila-num',nF);
  el('d-fila-sub','Existem '+nF+' pessoa'+(nF!==1?'s':'')+' aguardando atendimento. Analise cada caso com atenção.');
  el('d-dica',dicas[d%dicas.length]);
  el('d-quote',quotes[d%quotes.length]);
  var recs=[['dr-orc',r.orcamento,'#16a34a','dr-orc-val','R$ '+Math.round(r.orcamento*100).toLocaleString('pt-BR')+' / R$ 10.000'],['dr-ab',r.abrigo,'#2563eb','dr-ab-val',Math.round(r.abrigo)+' / 100'],['dr-eq',r.equipe,'#d97706','dr-eq-val',Math.round(r.equipe)+' / 100'],['dr-rep',r.reputacao,'#7c3aed','dr-rep-val',Math.round(r.reputacao)+' / 100']];
  recs.forEach(function(x){var f=document.getElementById(x[0]);if(f){f.style.width=Math.round(x[1])+'%';f.style.background=x[1]<20?'#dc2626':x[1]<40?'#f59e0b':x[2];}el(x[3],x[4]);});
  var dpf=document.getElementById('dr-pressao');if(dpf){dpf.style.width=Math.round(pressao)+'%';dpf.style.background=pressao>70?'#dc2626':pressao>40?'#f59e0b':'#22c55e';}
  var bu=document.getElementById('d-btn-upg');if(bu)bu.style.display=(G.dia%2===0&&G.dia>1)?'flex':'none';
}

function mostrarEl(id,d){var e=document.getElementById(id);if(e)e.style.display=d||'flex';}
function ocultarEl(id){var e=document.getElementById(id);if(e)e.style.display='none';}
// Navegação entre as três telas: menu, painel do dia e balcão de atendimento.
function irParaDash(){ocultarEl('tela-caso');ocultarEl('fila-strip');ocultarEl('info-strip');ocultarEl('acoes');mostrarEl('tela-dash','grid');mostrarEl('hdr');atualizarDash();atualizarHUD();}
function irParaCasos(){ocultarEl('tela-dash');mostrarEl('fila-strip','block');mostrarEl('info-strip');mostrarEl('tela-caso','grid');mostrarEl('acoes','block');mostrarEl('hdr');renderFila();renderDetalhe();renderCombo();atualizarProgresso();setTimeout(iniciarTimers,300);}
function irParaMenu(){['hdr','tela-dash','tela-caso','fila-strip','info-strip','acoes'].forEach(ocultarEl);document.getElementById('tela-menu').classList.remove('off');verificarSave();}

// Estado inicial: dia 1 de 10, orçamento/vagas/equipe em 100% e reputação em 80%.
function iniciarJogoReal(){G={dia:1,maxDia:10,res:{orcamento:100,abrigo:100,equipe:100,reputacao:80},acolhidos:0,perdidos:0,encaminhados:0,pts:0,combo:0,maxCombo:0,critSalvos:0,_wOrc:false,_wAbr:false,_wEq:false,_wRep:false,desconto:1,difBase:1,encSalvo:false,assistBonus:false,bonusPts:0,shieldLegal:false,semDesgaste:false,upgrades:[],decisoesConsecutivas:0,gameOver:false};G.difBase=OPTS.dificuldade==='facil'?0.7:OPTS.dificuldade==='dificil'?1.4:1.0;G.desconto=G.difBase;Object.assign(G,novoEstadoHist());sel=null;fila=[];clearAllTimers();gerarFila();desabilitarBtns();var bn=document.getElementById('btn-next');if(bn)bn.disabled=true;renderCombo();salvarJogo();irParaDash();}
iniciarJogo=iniciarJogoReal;

// Fim do dia: só avança com a fila vazia. Nos dias pares, antes de avançar,
// o jogador escolhe uma melhoria.
proximoDia=function(){clearAllTimers();if(fila.filter(function(p){return p.vivo;}).length>0)return;somDia();if(G.dia%2===0){mostrarUpgrade();return;}avancarDiaInterno();};
// Novo dia: desgaste natural da equipe (-4 a +1) e das vagas (-3), avisos
// dos dias 4 e 7, nova fila, salvamento automático, cena da história do dia
// e, depois dela, 45% de chance de um evento de crise.
function avancarDiaInterno(){G.dia++;G.semDesgaste=false;if(G.dia>G.maxDia){encerrarJogoV14();return;}G.res.equipe=Math.min(100,Math.max(0,G.res.equipe-4+Math.floor(Math.random()*6)));G.res.abrigo=Math.max(0,G.res.abrigo-3);if(G.dia===4)showBanner('⚠️ DIA 4 — Timers ativos nos casos críticos!');if(G.dia===7)showBanner('🔴 FASE CRÍTICA — Alta demanda e recursos escassos!');gerarFila();sel=null;desabilitarBtns();var bn=document.getElementById('btn-next');if(bn)bn.disabled=true;atualizarHUD();checarColapso();salvarJogo();irParaDash();setTimeout(function(){var depois=function(){if(Math.random()<.45)mostrarEvento(EVENTOS[Math.floor(Math.random()*EVENTOS.length)]);};var c=CENAS[G.dia];if(c)mostrarCena(c,depois);else depois();},400);}
avancarDia=avancarDiaInterno;

mostrarUpgrade=function(){var pool=[].concat(UPGRADES).sort(function(){return Math.random()-.5;}).slice(0,3);document.getElementById('upg-sub').textContent='Dia '+G.dia+' concluído! '+G.acolhidos+' pessoas acolhidas. Escolha um recurso:';var grid=document.getElementById('upg-grid');grid.innerHTML='';pool.forEach(function(u){var d=document.createElement('div');d.className='upg-card';d.innerHTML='<div class="upg-icon">'+u.icon+'</div><div class="upg-name">'+u.nome+'</div><div class="upg-desc">'+u.desc+'</div>';d.onclick=function(){u.apply(G);G.upgrades.push(u.nome);fecharOv('ov-upgrade');somUpgrade();notif('Recurso: '+u.nome+'!','good');avancarDiaInterno();};grid.appendChild(d);});abrirOv('ov-upgrade');};

/* ── FIM DE JOGO E NOTA ──
   O desempenho combina pontos e conduta:
     pct = min(1, pontos / máximo_esperado) × (0,55 + 0,45 × min(1, conduta/70))
   Notas: S ≥ 55% · A ≥ 40% · B ≥ 28% · C ≥ 18% · D abaixo disso.
   Também registra o recorde e apaga o save da partida encerrada. */
function encerrarJogoV14(col){col=col||false;clearAllTimers();var mx=CASOS.reduce(function(a,c){return a+c.pts;},0)*G.maxDia*.35;var pct=Math.min(1,G.pts/Math.max(1,mx*1.1))*(0.55+0.45*Math.min(1,(G.etica==null?50:G.etica)/70));var grade,titulo;if(pct>=.55){grade='S';titulo='Gestor Humanitário Exemplar';}else if(pct>=.40){grade='A';titulo='Coordenador Dedicado';}else if(pct>=.28){grade='B';titulo='Gestor em Desenvolvimento';}else if(pct>=.18){grade='C';titulo='Atuação Insuficiente';}else{grade='D';titulo='Sistema em Colapso';}salvarRecord(G.pts,grade,titulo,G.dia-1,G.acolhidos,G.perdidos,G.encaminhados);try{localStorage.removeItem('fronteira_save');}catch(e){}
  var v=!col&&G.perdidos<3&&G.pts>=80;
  var gC={S:'#d97706',A:'#16a34a',B:'#2563eb',C:'#d97706',D:'#dc2626'}[grade]||'#2563eb';
  var gBg={S:'#fffbeb',A:'#f0fdf4',B:'#eff6ff',C:'#fffbeb',D:'#fef2f2'}[grade]||'#eff6ff';
  var total=G.acolhidos+(G.encaminhados||0)+G.perdidos;
  var pFinal=Math.round(Math.max(0,100-G.res.equipe));
  var aval={S:'Gestão exemplar! Você equilibrou recursos e empatia com maestria, salvando praticamente todos os casos.',A:'Ótima gestão! Demonstrou compromisso humanitário na maioria dos casos.',B:'Sua gestão foi boa. Você conseguiu ajudar muitas pessoas, mas ainda há espaço para melhorias na distribuição dos recursos e na redução da pressão operacional.',C:'Gestão regular. Muitos casos poderiam ter sido atendidos com melhor planejamento de recursos.',D:'A gestão precisa melhorar significativamente. O sistema entrou em colapso por falta de planejamento.'};
  var refs=['Roraima concentra a maior rota de migração venezuelana do Brasil. Entre 2017 e 2023, mais de 700 mil venezuelanos entraram pelo estado.','A Lei 9.474/1997 garante refúgio a quem sofreu violação de direitos humanos.','Estudos de Martins et al. (2025) mostram que simulações de dilemas migratórios aumentam a empatia com populações vulneráveis.','Este jogo compartilha a premissa de Papers, Please: colocar o jogador na posição de quem decide sobre vidas reais.'];
  function s(id,v2){var e=document.getElementById(id);if(e)e.textContent=v2;}
  var rl=document.getElementById('fim-result-lbl');if(rl){rl.textContent=v?'PARABÉNS!':col?'COLAPSO':'MISSÃO ENCERRADA';rl.className='fim-result-title '+(v?'ok':col?'bad':'mid');}
  s('fim-result-sub',v?'Você completou os 10 dias de gestão do abrigo.':'A gestão foi encerrada antes do prazo.');
  var fc=document.getElementById('fim-circle');if(fc){fc.style.borderColor=gC;fc.style.background=gBg;}
  var fl=document.getElementById('fim-letter');if(fl){fl.textContent=grade;fl.style.color=gC;}
  s('fim-grade-title',titulo);
  s('fim-s-dias',(G.dia-1)+' / '+G.maxDia);
  s('fim-s-atendidos',total);
  s('fim-s-rep',Math.round(G.res.reputacao)+' / 100');
  s('fim-s-recursos','R$ '+Math.round(G.res.orcamento*100).toLocaleString('pt-BR'));
  s('fim-s-eventos',G.acolhidos+' acol. · '+(G.encaminhados||0)+' enc.');
  var sp=document.getElementById('fim-s-pressao');if(sp){sp.textContent=pFinal+' / 100';sp.style.color=pFinal>60?'#dc2626':pFinal>30?'#d97706':'#16a34a';}
  s('fim-ref',aval[grade]||aval['B']);
  s('fim-ref-edu',refs[Math.floor(Math.random()*refs.length)]);
  s('fim-pts',G.pts+' pts');s('fim-grade','Nota '+grade);
  abrirOv('ov-fim');
}
encerrarJogo=function(col){encerrarJogoV14(col);};

// Botões do menu inicial.
function menuJogar(){somMenu();document.getElementById('tela-menu').classList.add('off');mostrarCena(CENA_PROLOGO,function(){abrirOv('ov-tut');});}
function menuContinuar(){var save=carregarJogo();if(!save||!save.G)return;G=Object.assign(novoEstadoHist(),save.G);sel=null;fila=[];timers={};document.getElementById('tela-menu').classList.add('off');gerarFila();atualizarHUD();desabilitarBtns();var bn=document.getElementById('btn-next');if(bn)bn.disabled=true;notif('Jogo carregado — Dia '+G.dia,'good');irParaDash();}
function menuRecords(){renderRecords();abrirOv('ov-records');}
function menuOpcoes(){aplicarOpcoes();var t=document.getElementById('opt-som-cfg');if(t)t.className='opt-toggle'+(somOn?' on':'');abrirOv('ov-opcoes');}
function voltarMenuConfirm(){if(!confirm('Voltar ao menu? Progresso do dia não será salvo.'))return;clearAllTimers();salvarJogo();irParaMenu();}
voltarMenu=voltarMenuConfirm;
function abrirMenu(){irParaMenu();}

// Ao abrir a página: carrega opções, verifica se há partida salva e mostra o menu.
window.onload=function(){carregarOpcoes();verificarSave();['hdr','tela-dash','fila-strip','info-strip','tela-caso','acoes'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='none';});document.getElementById('tela-menu').classList.remove('off');};

/* ═══════════════════════════════════════════════════════════════
   v16 · HISTÓRIA DO NOVATO + CADERNO (conferir, trabalho, denúncia)
═══════════════════════════════════════════════════════════════ */
// Contadores acrescentados na v16: documentos examinados, empregos,
// denúncias certas/erradas e o indicador de conduta (etica, 0 a 100, começa em 50).
function novoEstadoHist(){return {docsVer:0,empregos:0,denOk:0,denErr:0,provas:0,etica:50,suborno:false,recusouSuborno:false,encerrando:false};}
function clamp100(v){return Math.max(0,Math.min(100,v));}
function gid(i){return document.getElementById(i);}

// Situação documental possível de cada pessoa, como aparece após o exame.
var DOC_LBL={
  ok:"Protocolo de refúgio válido",
  vencido:"Protocolo VENCIDO (renovar na PF)",
  sem:"Sem documento brasileiro (só cédula venezuelana)",
  inconsistente:"Dados INCONSISTENTES entre os documentos",
  retido:"Documentos RETIDOS por terceiro"
};

// Princípios humanitários e legais exibidos depois de cada decisão,
// explicando por que ela foi adequada ou não.
var PRINC={
  acolhida:"Dignidade e acolhida humanitária (Lei 13.445/2017, Art. 3º): quem chega recebe abrigo, comida e atenção sem distinção.",
  minimo:"Assistência mínima garantida (ACNUR): mesmo sem vaga, ninguém fica sem alimentação, higiene e informação.",
  refer:"Encaminhamento responsável (ACNUR): encaminhar é garantir que a pessoa chegue ao serviço, e não apenas indicar um endereço.",
  naoDevol:"Não-devolução (Convenção de 1951, Art. 33): ninguém pode ser enviado a um lugar onde corre risco de vida.",
  crianca:"Interesse superior da criança (Convenção sobre os Direitos da Criança, Art. 3º): em qualquer decisão, a proteção do menor vem primeiro.",
  naoDiscr:"Não discriminação (Convenção de 1951, Art. 3º): o atendimento não pode depender de raça, religião ou país de origem. Suspeita sem fato é preconceito.",
  palermo:"Protocolo de Palermo (ONU, 2000) e Lei 13.344/2016: tráfico de pessoas é crime e a vítima nunca é punida. Convenção de 1951, Art. 31: refugiado não é penalizado por entrada irregular.",
  trabalho:"Autonomia e integração local (ACNUR): trabalho digno é uma solução duradoura. O protocolo de refúgio autoriza a Carteira de Trabalho (Lei 9.474/1997, Art. 21, §1º).",
  sigilo:"Confidencialidade (ACNUR): os dados de solicitantes de refúgio só saem do abrigo com consentimento ou por ordem de autoridade competente."
};

/* ── Metadados de cada caso (profissão, qualificação, documento, alertas) ── */
// Para cada caso: profissão, qualificação comprovável, situação do documento,
// vaga de trabalho possível e, se houver, um alerta de exploração (tráfico,
// trabalho escravo) com os sinais que o jogador precisa perceber.
//   menor:true → menor de idade (trabalho bloqueado)
//   falso:true → caso que parece suspeito mas não tem crime (testa preconceito)
var META={
  "Família Pérez":{prof:"Trabalhador informal",doc:"sem"},
  "Sr. Montoya":{prof:"Professor universitário",qual:"Docência superior",doc:"ok"},
  "Jovens Ramírez":{prof:"Estudantes",doc:"sem",menor:true},
  "Dra. Vásquez":{prof:"Médica pediatra",qual:"Medicina (diploma sem revalidação)",doc:"ok",vaga:"Atua como voluntária no posto de saúde do abrigo e, depois da revalidação do diploma, assume vaga na rede pública de Boa Vista."},
  "Sr. Gutiérrez":{prof:"Ex-policial",qual:"Segurança (exige curso local)",doc:"sem",vaga:"Faz o curso de vigilante e assume a portaria de um condomínio."},
  "Família Flores":{prof:"Costureira",qual:"Costura",doc:"sem",vaga:"Passa a costurar em casa para uma cooperativa, sem precisar se deslocar durante a gravidez."},
  "Adolescente Torres":{prof:"Estudante",doc:"inconsistente",menor:true,alerta:{
    tipo:"Exploração de adolescente",
    sinais:["Declara 18 anos, mas a certidão de nascimento indica 17","Marcas antigas nos braços; desvia o olhar ao falar de “quem pagou a viagem”","Guarda no bolso um cartão: “R. Barrios — oportunidades”"],
    orgao:"o Conselho Tutelar e a Polícia Federal",rede:true,
    final:"Jhonny foi protegido pela rede e contou que devia a viagem a um agenciador, que o levaria a uma obra em Manaus. O relato virou peça-chave na investigação.",
    ignorado:"Na madrugada, um homem de camisa social esperou Jhonny no portão. Ele foi embora sem se despedir."}},
  "Casal Hernández":{prof:"Professores aposentados",qual:"Docência",doc:"ok",vaga:"Passam a dar reforço escolar e aulas de espanhol em uma ONG parceira."},
  "Sr. Pedraza":{prof:"Mecânico",qual:"Mecânica automotiva",doc:"sem",vaga:"Entra como mecânico em uma oficina de Boa Vista, com carteira assinada."},
  "Sra. Mendoza":{prof:"Cozinheira",qual:"Culinária",doc:"ok",vaga:"Contratada como cozinheira em um restaurante de Boa Vista, com carteira assinada."},
  "Família Rivas":{prof:"Comerciante",qual:"Comércio",doc:"ok",vaga:"Abre uma banca na feira com microcrédito de uma ONG parceira."},
  "Bebê Valentina":{prof:"Bebê",doc:"sem",menor:true},
  "Prof. Castillo":{prof:"Ex-reitor universitário",qual:"Gestão acadêmica",doc:"ok",vaga:"Aceita consultoria acadêmica remota, que pode fazer em casa enquanto cuida de Lidia."},
  "Grupo Artistas":{prof:"Músicos",qual:"Música",doc:"vencido",vaga:"Fecha contrato para tocar em eventos culturais da prefeitura, como microempreendedores."},
  "Sra. Ochoa":{prof:"Do lar",doc:"retido",alerta:{
    tipo:"Violência doméstica",
    sinais:["Hematomas em estágios diferentes de cicatrização","O acompanhante responde por ela e não a deixa falar sozinha","Os documentos dela estão em poder dele"],
    orgao:"a Delegacia da Mulher e o Ligue 180 (medida protetiva, Lei Maria da Penha)",rede:false,
    final:"Luisa foi atendida a sós, aceitou a medida protetiva e foi para uma casa de acolhimento sigilosa. O agressor foi afastado.",
    ignorado:"Luisa voltou com o companheiro na mesma noite, sem dizer uma palavra."}},
  "Família Suárez":{prof:"Do lar",doc:"sem"},
  "Sr. Bolivar":{prof:"Jornalista",qual:"Jornalismo",doc:"ok",vaga:"Passa a escrever para um portal comunitário, sob pseudônimo, para proteger a família que ficou."},
  "Grupo Wayuu":{prof:"Artesãs",qual:"Artesanato Wayuu",doc:"sem",vaga:"Vendem mochilas wayuu em feiras de artesanato, com apoio de uma ONG."},
  "Jovem Díaz":{prof:"Estudante de engenharia",qual:"Engenharia (graduação em curso)",doc:"ok",vaga:"Consegue estágio em um laboratório da UFRR."},
  "Eng. Salazar":{prof:"Engenheiro eletricista",qual:"Engenharia elétrica",doc:"ok",vaga:"Uma concessionária de energia de Boa Vista abriu vaga pelo SINE. Rafael começa em 15 dias, com carteira assinada."},
  "Enf. Carolina Ruiz":{prof:"Enfermeira",qual:"Enfermagem",doc:"vencido",vaga:"Entra como auxiliar em uma clínica de Boa Vista enquanto cuida da revalidação do diploma."},
  "Sra. Quintero":{prof:"Cozinheira",qual:"Culinária",doc:"ok",alerta:{
    tipo:"Aliciamento por falsa oferta de emprego",
    sinais:["Oferta de “doméstica em Manaus” com salário em dólar e sem contrato escrito","O contratante pede que ela entregue a cédula e o protocolo “para adiantar a papelada”","Exigiu segredo: “não conte a ninguém do abrigo”"],
    orgao:"a Polícia Federal e o Ministério Público do Trabalho",rede:true,
    final:"A conversa de WhatsApp virou prova. Marisol foi orientada, encaminhada a uma vaga real pelo SINE e hoje trabalha em uma cozinha de Boa Vista.",
    ignorado:"Marisol aceitou o convite dois dias depois. O abrigo nunca mais teve notícias dela."}},
  "Família Arias":{prof:"Eletricista",qual:"Eletricista predial",doc:"ok",falso:true,vaga:"Gustavo é contratado como eletricista por uma empresa de manutenção. A família se reúne quando a mãe chega."},
  "Rapazes do Contratante":{prof:"Pedreiros",qual:"Construção civil",doc:"retido",alerta:{
    tipo:"Trabalho análogo ao de escravo (servidão por dívida)",
    sinais:["Dívida de R$ 4.000 pela viagem, descontada do salário","Os documentos estão guardados pelo “contratante”","Um deles tem o celular tomado e é vigiado de fora"],
    orgao:"a Polícia Federal e o Ministério Público do Trabalho",rede:true,
    final:"Os quatro rapazes foram retirados do ônibus, tiveram seus documentos devolvidos e foram encaminhados a vagas com carteira assinada.",
    ignorado:"Os rapazes retomaram a viagem na manhã seguinte, no mesmo ônibus fretado."}},
  "Yusmary (15) e o “tio”":{prof:"Estudante",doc:"inconsistente",menor:true,alerta:{
    tipo:"Suspeita de tráfico de adolescente",
    sinais:["O documento do “tio” tem sobrenome diferente do da menina","Ele não sabe a data de nascimento dela, e ela só responde depois de olhá-lo","Recusa deixá-la a sós com a equipe"],
    orgao:"o Conselho Tutelar, a Polícia Federal e o Disque 100",rede:true,
    final:"Yusmary foi ouvida a sós com a psicóloga, confirmou que não conhecia o homem e foi acolhida por uma casa de proteção. O “tio” foi detido para depoimento.",
    ignorado:"O “tio” voltou à noite com um papel assinado e levou Yusmary embora."}}
};

// Metadados do caso; casos sem entrada em META recebem valores sorteados pela semente.
function metaCaso(p){
  if(p._m)return p._m;
  var b=META[p.nome_base]||{};
  var profs=["Professor(a)","Médico(a)","Engenheiro(a)","Trabalhador informal","Comerciante","Artista","Estudante"];
  var m={prof:b.prof,qual:b.qual||null,doc:b.doc,alerta:b.alerta||null,menor:!!b.menor,vaga:b.vaga||null,falso:!!b.falso};
  if(!m.prof)m.prof=profs[Math.floor(rng(p.seed,20)*profs.length)];
  if(!m.doc)m.doc=rng(p.seed,11)>.5?"ok":"sem";
  p._m=m;return m;
}

/* ── Ficha: linhas e seção de alertas ── */
function linhaQual(p){var m=metaCaso(p);if(m.qual)return p.verif?m.qual+" ✔":"Declarada · não conferida";return p.verif?"Não comprovada":"—";}
function linhaDoc(p){var m=metaCaso(p);return p.verif?DOC_LBL[m.doc]:"❓ Não conferido";}
function blocoConferencia(p){
  var m=metaCaso(p);
  if(!p.verif)return '<div class="conf-box pend">🔎 <b>Documentos ainda não conferidos.</b> Aperte <b>3</b> para revelar a situação real: documento, qualificação e sinais de risco.</div>';
  if(m.alerta){
    var li=m.alerta.sinais.map(function(s){return "<li>"+s+"</li>";}).join("");
    return '<div class="conf-box alerta"><div class="conf-t">⚠️ RESULTADO DA CONFERÊNCIA · SINAIS DE ALERTA</div><div class="conf-tipo">'+m.alerta.tipo+'</div><ul>'+li+'</ul><div class="conf-acao">🚨 Acione a denúncia (tecla 5): protege a vítima e responsabiliza quem explora. Ela é a vítima, e não a culpada.</div></div>';
  }
  if(m.falso)return '<div class="conf-box ok">✔ <b>Conferência:</b> documentos e relato coerentes. Nenhum sinal de risco, então não há o que denunciar.</div>';
  return '<div class="conf-box ok">✔ <b>Conferência:</b> '+DOC_LBL[m.doc]+(m.qual?" · qualificação comprovada":"")+". Sem sinais de risco.</div>";
}

/* ── Card "Caderno do Novato" no painel de decisão ── */
function cardFerramentas(p){
  var m=metaCaso(p),h='<div class="dec-opt tools"><div class="dec-opt-top"><div class="dec-opt-icon-wrap">📓</div><span class="dec-opt-title">Caderno do Novato</span></div>';
  if(!p.verif){
    h+='<div class="dec-opt-desc">📄 <b>Confira os documentos</b> (tecla 3) antes de decidir. Revela a situação legal, a qualificação real e eventuais sinais de risco.</div>';
  }else if(m.alerta){
    h+='<div class="dec-opt-desc">🚨 <b>'+m.alerta.tipo+'.</b> Acione a denúncia (tecla 5): protege a vítima e responsabiliza quem a explora.</div>';
  }else if(m.falso){
    h+='<div class="dec-opt-desc">✔ Tudo coerente: <b>não há o que denunciar</b>. Ajude normalmente e evite o preconceito.</div>';
  }else if(p.prioridade==="critico"){
    h+='<div class="dec-opt-desc">Caso crítico: proteja a vida e a saúde primeiro. O trabalho vem depois.</div>';
  }else if(m.menor){
    h+='<div class="dec-opt-desc">Menor de idade: proteção integral (ECA). Trabalho não é opção.</div>';
  }else if(m.qual){
    h+='<div class="dec-opt-desc">💼 Há qualificação: <b>orientar para o trabalho</b> (tecla 4) rende mais pontos e poupa vagas.'+(m.doc!=="ok"?" Documento irregular: a orientação inclui regularizar antes.":"")+'</div>';
  }else{
    h+='<div class="dec-opt-desc">Sem qualificação comprovada. O trabalho só renderá um curso ou vagas simples.</div>';
  }
  return h+'</div>';
}

/* ── Sons ── */
function somConferir(){tone(520,.06,"sine",.08,0);tone(660,.08,"sine",.08,.07);}
function somDenuncia(){tone(440,.10,"square",.07,0);tone(587,.10,"square",.07,.1);tone(784,.22,"sine",.12,.2);}
function somTrabalho(){tone(392,.10,"sine",.11,0);tone(523,.10,"sine",.11,.09);tone(659,.20,"sine",.13,.18);}

/* ── Consequência das novas ações ── */
// Janela de consequência das ações da v16 (trabalho e denúncia).
function consNova(p,icon,titulo,texto,pts,tipo,princ,resolve){
  pendConsequencia=resolve?{p:p,acao:"nova"}:null;
  if(!OPTS.conseq){
    notif(p.nomeDisplay+" · "+titulo+(pts>0?" · +"+pts+" pts":""),tipo==="bom"?"good":tipo==="ruim"?"err":"ok");
    setTimeout(fecharConsequencia,50);return;
  }
  gid("cq-icon").textContent=icon;
  gid("cq-titulo").textContent=titulo;
  gid("cq-desc").innerHTML=p.nomeDisplay+' <span style="font-size:11px;color:var(--muted);">· de '+cidadeOrigem(p.seed)+"</span>";
  gid("cq-impacto").innerHTML='<div class="consequence-card '+tipo+'">'+texto+"</div>"
    +(pts>0?'<div style="text-align:center;margin-top:8px;font-size:18px;font-weight:700;color:var(--gold)">+'+pts+" pontos</div>":"")
    +(princ?'<div class="princ-box">📘 '+princ+"</div>":"")+gabarito(p);
  abrirOv("ov-consequencia");
}
function resolverCaso(p){
  clearTimer(p.id);p.vivo=false;sel=null;G.desconto=G.difBase||1;
  desabilitarBtns();
  var h=gid("act-hint");if(h){h.textContent="Selecione o próximo caso";h.style.color="var(--muted)";}
  renderCombo();animCard(p.id,"salvo");
}

/* ── AÇÕES DO CADERNO (v16) ──
   verificar → examina os documentos: custa 2 de equipe e dá +1 de conduta
   emprego   → "Trabalho": bloqueado para casos críticos e menores. Pontos =
               pts × 1,5 se tem qualificação (× 0,7 se não) × fator do documento
               (válido 1 · vencido 0,8 · sem 0,7; sem exame 0,7 ou 0,35)
   denunciar → certo se houver sinais reais marcados (+pontos, +conduta);
               sem fundamento vira "denúncia infundada" (−conduta, −reputação) */
function decidirNova(acao){
  if(!sel)return;
  var p=sel,m=metaCaso(p),r=G.res,d=G.desconto;
  var mult=G.combo>=5?2:G.combo>=3?1.5:1;

  /* 📄 CONFERIR DOCUMENTOS (não resolve o caso) */
  if(acao==="verificar"){
    if(p.verif){notif("Os documentos deste caso já foram conferidos.","ok");return;}
    p.verif=true;G.docsVer++;
    if(!G.semDesgaste)r.equipe=Math.max(0,r.equipe-2);
    G.etica=clamp100(G.etica+1);
    somConferir();
    notif("🔎 Documentos examinados. Leia as declarações e marque o que não bate.","ok");
    renderDetalhe();atualizarHUD();atualizarBtnsTool();
    return;
  }

  /* 💼 ORIENTAR PARA O TRABALHO */
  if(acao==="emprego"){
    if(p.prioridade==="critico"){notif("Situação crítica: proteja a vida e a saúde primeiro. O trabalho vem depois.","warn");return;}
    if(m.menor){notif("Menor de idade: proteção integral (ECA). Trabalho não é opção.","warn");return;}
    if(m.alerta&&qualMarcas(p).a>=1&&!p.denunciado){notif("Você marcou sinais de risco: proteja primeiro (🚨 Denunciar).","warn");return;}
    var cust=p.prioridade==="grave"?.3:p.prioridade==="moderado"?.15:0;
    r.orcamento=Math.max(0,r.orcamento-Math.round(p.b*cust*d));
    r.abrigo=Math.max(0,r.abrigo-Math.round(p.ab*cust*d));
    if(!G.semDesgaste)r.equipe=Math.max(0,r.equipe-3);

    if(m.alerta&&!p.denunciado){   /* não conferiu e não viu os sinais */
      G.etica=clamp100(G.etica-8);r.reputacao=Math.max(0,r.reputacao-5);G.combo=0;
      G.encaminhados++;
      somPerda();resolverCaso(p);
      consNova(p,"⚠️","Sinais ignorados","Você indicou uma vaga sem conferir os documentos e não percebeu os sinais de risco. "+m.alerta.ignorado,0,"ruim",PRINC.palermo,true);
      atualizarHUD();return;
    }
    var qual=!!m.qual,docMult;
    if(p.verif)docMult=m.doc==="ok"?1:m.doc==="vencido"?.8:.7;
    else docMult=m.doc==="ok"?.7:.35;
    var pts=Math.round(p.pts*(qual?1.5:.7)*docMult*mult);
    G.pts+=pts;G.acolhidos++;
    var nota;
    if(p.verif)nota=m.doc==="ok"?"Documentos em dia: contratação rápida.":m.doc==="vencido"?"Você renovou o protocolo na Polícia Federal antes da vaga; a contratação saiu com uma semana de atraso.":"Você encaminhou à PF e à emissão da Carteira de Trabalho provisória antes da vaga; a contratação demorou.";
    else nota=m.doc==="ok"?"Deu certo porque os documentos estavam em dia, mas conferir antes evita surpresas.":"Faltou conferir os documentos: o empregador exigiu CPF e Carteira de Trabalho e a vaga foi perdida.";
    var tipo,titulo,icon,texto;
    if(qual&&docMult>=.7){
      tipo="bom";titulo="Encaminhado ao trabalho";icon="💼";
      texto=(m.vaga||p.nomeDisplay+" é encaminhado(a) a uma vaga compatível com a sua formação.")+" "+nota;
      G.empregos++;r.reputacao=Math.min(100,r.reputacao+4);r.orcamento=Math.min(100,r.orcamento+3);
      G.etica=clamp100(G.etica+4);G.combo=Math.min(G.combo+1,5);G.maxCombo=Math.max(G.maxCombo,G.combo);
      if(G.combo>=2){somCombo(G.combo);mostrarStreakBadge(G.combo);}
      somTrabalho();
    }else{
      tipo="neutro";titulo=qual?"Vaga perdida":"Capacitação indicada";icon=qual?"📉":"📚";
      texto=qual?nota:p.nomeDisplay+" não tem qualificação comprovada. Foi orientado(a) a cursos gratuitos e vagas simples. "+nota;
      G.combo=Math.max(0,G.combo-1);somEstabilizar();
    }
    resolverCaso(p);popPts("+"+pts);
    consNova(p,icon,titulo,texto,pts,tipo,PRINC.trabalho,true);
    atualizarHUD();return;
  }

  /* 🚨 ACIONAR DENÚNCIA */
  if(acao==="denunciar"){
    if(!m.alerta){   /* denúncia infundada: o caso continua aberto */
      G.denErr++;r.reputacao=Math.max(0,r.reputacao-10);G.etica=clamp100(G.etica-12);
      G.pts=Math.max(0,G.pts-15);G.combo=0;renderCombo();
      var tx=p.verif
        ?(m.falso?"Você conferiu e os documentos estavam coerentes, mas denunciou assim mesmo. A PF arquivou o caso e a família perdeu a confiança no abrigo."
                  :"A conferência não mostrou sinais de risco. A PF arquivou a denúncia: sem fatos, suspeita é preconceito.")
        :"Você denunciou sem conferir nada. A PF arquivou por falta de base e a pessoa ficou exposta e assustada.";
      somPerda();
      consNova(p,"⚠️","Denúncia infundada",tx+" (−10 reputação, −15 pontos)",0,"ruim",PRINC.naoDiscr,false);
      atualizarHUD();return;
    }
    p.denunciado=true;
    r.orcamento=Math.max(0,r.orcamento-Math.round(p.b*.3*d));
    r.abrigo=Math.max(0,r.abrigo-Math.round(p.ab*.4*d));
    if(!G.semDesgaste)r.equipe=Math.max(0,r.equipe-4);
    var qm=qualMarcas(p),forte=p.verif&&qm.a>=Math.min(2,qm.tot);var pD=Math.round(p.pts*1.4*(forte?1:.5)*Math.max(.4,1-.15*qm.f)*mult);
    G.pts+=pD;G.acolhidos++;G.denOk++;
    if(forte&&m.alerta.rede)G.provas++;
    if(p.prioridade==="critico"){G.critSalvos++;}
    r.reputacao=Math.min(100,r.reputacao+(p.prioridade==="critico"?10:8));
    G.etica=clamp100(G.etica+(forte?12:6)-3*qm.f);
    G.combo=Math.min(G.combo+1,5);G.maxCombo=Math.max(G.maxCombo,G.combo);
    if(G.combo>=2){somCombo(G.combo);mostrarStreakBadge(G.combo);}
    somDenuncia();resolverCaso(p);popPts("+"+pD);
    var tD="Você acionou "+m.alerta.orgao+". "+m.alerta.final+(forte?" Você marcou os sinais certos e o dossiê ficou sólido.":" Você marcou poucos sinais reais, então a denúncia ficou frágil e a PF pediu complementação.");
    consNova(p,"🚨","Denúncia acionada",tD,pD,"bom",PRINC.palermo,true);
    atualizarHUD();return;
  }
}

/* ── Gancho das decisões antigas (acolher, assistência, encaminhar) ── */
// Gancho sobre acolher/assistência/encaminhar: se o caso tinha sinais de
// exploração e o jogador não denunciou, perde conduta e reputação. Também
// acrescenta o princípio humanitário e o gabarito da conferência.
var _decidirBase=decidir;
decidir=function(acao,forcar){
  if(acao==="verificar"||acao==="emprego"||acao==="denunciar"){return decidirNova(acao);}
  var p=sel;
  if(!p)return _decidirBase(acao,forcar);
  var m=metaCaso(p),wasVerif=!!p.verif;
  _decidirBase(acao,forcar);
  if(p.vivo)return;   /* a barra de confirmação interrompeu ou nada foi decidido */
  var extra="",r=G.res;
  if(m.alerta&&!p.denunciado){
    G.etica=clamp100(G.etica-8);r.reputacao=Math.max(0,r.reputacao-5);
    if(p.prioridade==="critico"&&acao!=="encaminhar"){G.perdidos++;r.reputacao=Math.max(0,r.reputacao-5);flashMorte();}
    extra+='<div class="story-warn">⚠️ <b>Sinais ignorados.</b> '+m.alerta.ignorado+" Faltou acionar a rede de proteção (🚨).</div>";
  }else if(m.falso&&wasVerif){
    G.etica=clamp100(G.etica+4);
  }
  if(wasVerif)G.etica=clamp100(G.etica+1);
  var pr=m.falso?PRINC.naoDiscr:m.alerta?PRINC.palermo:m.menor?PRINC.crianca:acao==="acolher"?PRINC.acolhida:acao==="estabilizar"?PRINC.minimo:(p.prioridade==="critico"?PRINC.naoDevol:PRINC.refer);
  extra+='<div class="princ-box">📘 '+pr+"</div>"+gabarito(p);
  var cq=gid("cq-impacto"),ov=gid("ov-consequencia");
  if(cq&&ov&&!ov.classList.contains("off"))cq.insertAdjacentHTML("beforeend",extra);
  atualizarHUD();
};

/* ── Botões do Caderno ── */
function atualizarBtnsTool(){
  var b1=gid("btn-conferir"),b2=gid("btn-trabalho"),b3=gid("btn-denunciar");
  if(!b1||!b2||!b3)return;
  var on=!!sel;
  b1.disabled=b2.disabled=b3.disabled=!on;
  var s1=gid("btn-conferir-sub"),s2=gid("btn-trabalho-sub"),s3=gid("btn-denunciar-sub");
  if(!on){b1.classList.remove("feito");s1.textContent="Situação real";s2.textContent="Qualificação";s3.textContent="Proteger vítima";return;}
  var m=metaCaso(sel);
  b1.classList.toggle("feito",!!sel.verif);
  s1.textContent=sel.verif?"✔ Conferido":"Situação real";
  s2.textContent=sel.verif?(sel.prioridade==="critico"?"Priorize a saúde":m.menor?"Menor de idade":m.qual?"Qualificação ✔":"Sem qualificação"):"Qualificação";
  s3.textContent=sel.verif?(m.alerta?"Há sinais ⚠️":"Sem sinais"):"Proteger vítima";
}
var _habBase=habilitarBtns;
habilitarBtns=function(){_habBase();atualizarBtnsTool();};
var _desBase=desabilitarBtns;
desabilitarBtns=function(){_desBase();atualizarBtnsTool();};

/* ═══════════════════ MOTOR DE CENAS ═══════════════════ */
/* Personagens que falam nas cenas da história.
   Cada cena: {cap, titulo, local, falas:[{q: personagem, t: texto}], escolhas}. */
var SPK={
  helena:{n:"Helena Duarte",c:"Coordenadora do abrigo",e:"👩‍💼",cor:"#38bdf8"},
  luz:{n:"Luz Marina",c:"Voluntária e intérprete",e:"👩‍🏫",cor:"#4ade80"},
  moreira:{n:"Agente Moreira",c:"Polícia Federal",e:"👮",cor:"#94a3b8"},
  ramiro:{n:"Ramiro Barrios",c:"“Agenciador de empregos”",e:"🕴️",cor:"#f87171"},
  voce:{n:"Você",c:"Técnico(a) de acolhimento · novato(a)",e:"🙋",cor:"#c4b5fd"},
  narr:{n:"",c:"",e:"📖",cor:"#fbbf24"}
};
var CENA=null,_cenaTimer=null;

// Abre uma cena com efeito de digitação; ao terminar chama fim().
function mostrarCena(c,fim){
  if(typeof c==="function")c=c();
  if(!c){if(fim)fim();return;}
  CENA={c:c,i:0,fim:fim||null,digitando:false,txt:""};
  gid("cena-cap").textContent=c.cap||"";
  gid("cena-titulo").textContent=c.titulo||"";
  gid("cena-local").textContent=c.local?"📍 "+c.local:"";
  abrirOv("ov-cena");
  renderFala();
}
function renderFala(){
  var c=CENA.c,f=c.falas[CENA.i],sp=SPK[f.q]||SPK.narr;
  var t=typeof f.t==="function"?f.t():f.t;
  var box=gid("cena-stage");
  box.style.setProperty("--spk",sp.cor);
  gid("cena-avatar").textContent=sp.e;
  gid("cena-nome").textContent=sp.n;
  gid("cena-cargo").textContent=sp.c;
  var te=gid("cena-texto");te.className="cena-texto"+(f.q==="narr"?" narr":"");
  var pr="";for(var i=0;i<c.falas.length;i++)pr+="<i"+(i<=CENA.i?' class="on"':"")+"></i>";
  gid("cena-prog").innerHTML=pr;
  var ac=gid("cena-acoes"),ult=CENA.i===c.falas.length-1;
  if(ult&&c.escolhas){
    ac.innerHTML=c.escolhas.map(function(e,k){return '<button class="mbtn cena-esc" onclick="escolherCena('+k+')">'+e.txt+"</button>";}).join("");
  }else{
    ac.innerHTML='<button class="mbtn" onclick="proxFala()">'+(ult?"Fechar ✔":"Continuar ▶")+"</button>";
  }
  clearInterval(_cenaTimer);CENA.digitando=true;CENA.txt=t;
  var n=0;te.textContent="";
  _cenaTimer=setInterval(function(){n+=2;te.textContent=t.slice(0,n);if(n>=t.length){clearInterval(_cenaTimer);CENA.digitando=false;}},16);
}
function proxFala(){
  if(!CENA)return;
  if(CENA.digitando){clearInterval(_cenaTimer);gid("cena-texto").textContent=CENA.txt;CENA.digitando=false;return;}
  var c=CENA.c;
  if(CENA.i<c.falas.length-1){CENA.i++;renderFala();return;}
  if(c.escolhas)return;
  fecharCena();
}
function fecharCena(){
  clearInterval(_cenaTimer);
  var fim=CENA&&CENA.fim;CENA=null;fecharOv("ov-cena");
  if(fim)setTimeout(fim,60);
}
function pularCena(){
  if(!CENA)return;
  if(CENA.c.escolhas){CENA.i=CENA.c.falas.length-1;renderFala();return;}
  fecharCena();
}
// Escolhas dentro das cenas (ex.: aceitar ou recusar o suborno de Ramiro).
function escolherCena(k){
  var c=CENA.c,e=c.escolhas[k],ret=e.fx();
  CENA.c={cap:c.cap,titulo:c.titulo,local:c.local,falas:[{q:"narr",t:ret}]};
  CENA.i=0;renderFala();atualizarHUD();
}
document.addEventListener("keydown",function(e){
  var oc=gid("ov-cena");
  if(oc&&!oc.classList.contains("off")){
    if(e.key==="ArrowRight"||((e.key===" "||e.key==="Enter")&&!(document.activeElement&&document.activeElement.tagName==="BUTTON"))){e.preventDefault();proxFala();}
    return;
  }
  if(document.querySelector(".ov:not(.off)")||pausado)return;
  var k=e.key.toLowerCase();
  if(k==="m"){e.preventDefault();abrirManual();return;}
  if(!sel)return;
  var acs={"1":"acolher","2":"estabilizar","3":"encaminhar","4":"emprego","5":"denunciar"};
  if(acs[k]){e.preventDefault();carimbar(acs[k]);}
  if(k==="e"){e.preventDefault();decidir("verificar");}
});

/* ═══════════════════ ROTEIRO ═══════════════════ */
// A narrativa: um capítulo por dia. CENAS[dia] guarda a cena que abre cada dia.
var CAPITULOS=["O primeiro dia","A voluntária","O homem do portão","Nem todo mundo é suspeito","O nome repetido","O agente da PF","A fase crítica","A oferta","A operação","Ponto final"];
var CENAS={};
var CENA_PROLOGO={cap:"PRÓLOGO",titulo:"Primeiro dia no Abrigo Esperança",local:"Boa Vista · Roraima · 6h40",falas:[
  {q:"narr",t:"Boa Vista, Roraima. Segunda-feira, 6h40. O calor já pesa e a fila em frente ao Abrigo Esperança dá a volta no quarteirão. Você acaba de ser contratado(a) como técnico(a) de acolhimento. Hoje é o seu primeiro dia."},
  {q:"helena",t:"Você deve ser o(a) novato(a). Eu sou Helena Duarte, coordeno o abrigo em parceria com o ACNUR e a Operação Acolhida. Respire fundo: ninguém aprende isso em sala de aula."},
  {q:"voce",t:"Por onde eu começo?"},
  {q:"helena",t:"Pelas regras que valem para quem cruza aquela porta: atendimento sem discriminação, ninguém devolvido a um lugar onde corre perigo, sigilo sobre o que as pessoas contam, famílias juntas e a criança sempre em primeiro lugar. São as normas da ONU e da lei brasileira que seguimos."},
  {q:"voce",t:"E se os recursos não derem para todos?"},
  {q:"helena",t:"Não vão dar. Por isso você vai aprender a escolher bem. Pegue o seu Caderno do Novato: além de acolher e encaminhar, você tem três ferramentas."},
  {q:"helena",t:"📄 Conferir documentos: veja o que a pessoa realmente tem antes de decidir. 💼 Orientar para o trabalho: quem tem qualificação e papéis em dia precisa de autonomia, não de caridade. 🚨 Acionar denúncia: quando alguém está sendo explorado. Denunciamos quem explora, nunca quem foge."},
  {q:"helena",t:"Vamos ao primeiro atendimento. Hoje deve ser tranquilo... acho."}
]};
CENAS[2]={cap:"CAPÍTULO 2",titulo:CAPITULOS[1],local:"Abrigo Esperança · sala da coordenação",falas:[
  {q:"helena",t:"Sobreviveu ao primeiro dia! Esta é a Luz, que vai trabalhar com você."},
  {q:"luz",t:"Prazer! Sou Luz Marina, venezuelana, professora de Mérida. Traduzo e aviso quando algo não bate. Aqui, muita gente chega com a história inteira dentro de uma mochila."},
  {q:"luz",t:function(){return G.docsVer>0?"Vi que você já conferiu documentos. Ótimo. O protocolo de refúgio vence, e sem papel em dia a vaga de emprego some.":"Um conselho de quem já viu muita coisa: confira os documentos antes de decidir. O protocolo de refúgio vence, e sem papel em dia a vaga de emprego some.";}},
  {q:"helena",t:"O protocolo também autoriza a Carteira de Trabalho provisória (Lei 9.474/1997). Quem pode e quer trabalhar deve ser orientado a isso: é dignidade para a pessoa e vaga livre para quem não tem outra saída."}
]};
CENAS[3]={cap:"CAPÍTULO 3",titulo:CAPITULOS[2],local:"Portão do abrigo · fim da tarde",falas:[
  {q:"narr",t:"Do outro lado da grade, um homem de camisa social bem passada distribui cartões para quem espera na fila."},
  {q:"ramiro",t:"Boa tarde, amigos! Ramiro Barrios, agência de empregos. Salário em dólar, passagem paga, sem burocracia. Só preciso dos seus documentos para adiantar tudo."},
  {q:"luz",t:"“Sem burocracia” e ainda quer os documentos... Não gostei nada disso."},
  {q:"helena",t:"Ele não cometeu crime nenhum até agora. Estar no portão não é crime. Mas fique atento(a) aos sinais clássicos do aliciamento: contrato só de boca, documento retido, dívida pela viagem, “não conte a ninguém”."},
  {q:"helena",t:"Quando um desses sinais aparecer e você confirmar nos documentos, acione a denúncia. O tráfico de pessoas é crime (Lei 13.344/2016) e a vítima nunca é punida."}
]};
CENAS[4]={cap:"CAPÍTULO 4",titulo:CAPITULOS[3],local:"Corredor do abrigo",falas:[
  {q:"luz",t:"Hoje cedo um voluntário já cochichou que um pai sozinho com dois filhos “não parece certo”."},
  {q:"helena",t:"Desconfiar de todo mundo também é discriminar. A Convenção de 1951 proíbe a distinção por país de origem. Sinal de risco é fato, como documento retido, dívida ou medo. Não é preconceito."},
  {q:"luz",t:"Confira antes de julgar. Uma denúncia sem base machuca quem já sofreu demais e quebra a confiança no abrigo."},
  {q:"helena",t:"E lembre-se do sigilo: o que a pessoa conta aqui não sai sem motivo legal."}
]};
CENAS[5]={cap:"CAPÍTULO 5",titulo:CAPITULOS[4],local:"Sala da coordenação · hora do café",falas:[
  {q:"narr",t:"Na hora do café, Luz e Helena comparam anotações."},
  {q:"luz",t:"O nome “Barrios” apareceu na conversa de WhatsApp de duas pessoas diferentes. Sempre com a mesma promessa: dólar, passagem paga, sem contrato."},
  {q:"helena",t:function(){return G.denOk>0?"Você já fez "+G.denOk+" denúncia(s) fundamentada(s). Continue registrando: um caso é um relato, vários viram um padrão.":"Ninguém denunciou ainda. Registrar os sinais é o que transforma desconfiança em prova. Uma ficha conferida vale mais que mil suspeitas.";}},
  {q:"narr",t:"Você anota o nome no Caderno do Novato e o sublinha duas vezes."}
]};
CENAS[6]={cap:"CAPÍTULO 6",titulo:CAPITULOS[5],local:"Recepção do abrigo",falas:[
  {q:"moreira",t:"Agente Moreira, Polícia Federal. A Helena falou bem de você."},
  {q:"moreira",t:"Vou ser direto: só consigo abrir inquérito com denúncia consistente, com nome, relato e documentos conferidos. Suspeita solta não sustenta investigação."},
  {q:"moreira",t:function(){return "Até agora, o abrigo me entregou "+G.provas+" ficha(s) com prova documentada ligada ao aliciador. "+(G.provas>=2?"Está ficando sério.":"Preciso de mais.");}},
  {q:"helena",t:"Fique de olho nos próximos dias. Se aparecer algo, confira os documentos primeiro e denuncie com base."}
]};
CENAS[7]={cap:"CAPÍTULO 7",titulo:CAPITULOS[6],local:"Abrigo Esperança · manhã",falas:[
  {q:"narr",t:"A fila dobrou. A equipe está no limite e o calor não dá trégua. Helena te olha, cansada, e fala baixo."},
  {q:"helena",t:"A parte difícil começa agora. Priorize quem não pode esperar, cuide de quem está cuidando e não esqueça das suas ferramentas. Hoje pode chegar alguém de quem a rede precisa."}
]};
CENAS[8]={cap:"CAPÍTULO 8",titulo:CAPITULOS[7],local:"Portão do abrigo · noite",falas:[
  {q:"narr",t:"Um carro escuro para na porta. Ramiro desce com um envelope na mão."},
  {q:"ramiro",t:"Boa noite, colega! Soube que o abrigo anda apertado. Trouxe uma doação de R$ 5.000, sem papelada. Só peço que vocês parem de fazer tantas perguntas sobre os meus clientes."},
  {q:"luz",t:"Isso é suborno. Dinheiro agora, silêncio depois."}
],escolhas:[
  {txt:"Recusar e anotar a placa do carro",fx:function(){G.provas++;G.recusouSuborno=true;G.etica=clamp100(G.etica+6);G.res.reputacao=Math.min(100,G.res.reputacao+5);G.res.equipe=Math.max(0,G.res.equipe-5);return "Você recusa o envelope e anota a placa. Ramiro sorri sem humor e vai embora. A equipe passa a noite em alerta, mas o seu nome está no caderno da PF. (+1 prova, conduta +6, reputação +5, equipe −5)";}},
  {txt:"Chamar a Helena para tratar do assunto",fx:function(){G.provas++;G.etica=clamp100(G.etica+3);G.res.equipe=Math.max(0,G.res.equipe-3);return "Helena chega, recusa a doação e liga para o Agente Moreira diante do próprio Ramiro, que desaparece na noite. (+1 prova, conduta +3, equipe −3)";}},
  {txt:"Aceitar a doação e seguir em frente",fx:function(){G.suborno=true;G.res.orcamento=Math.min(100,G.res.orcamento+30);G.etica=clamp100(G.etica-18);return "O envelope pesa no bolso. O abrigo respira por alguns dias, mas você sabe o que acabou de fazer. (Orçamento +30, conduta −18)";}}
]};
CENAS[9]=function(){
  var f;
  if(G.suborno){
    f=[{q:"narr",t:"Madrugada, na rodoviária de Boa Vista. As viaturas chegam e o ônibus fretado já não está lá."},
       {q:"moreira",t:"Chegamos tarde. Alguém avisou a rede. Barrios sumiu antes de a gente chegar."},
       {q:"helena",t:"Não vou perguntar de onde veio o aviso. Mas você vai se lembrar disso por muito tempo."}];
  }else if(G.provas>=3){
    f=[{q:"narr",t:"Madrugada, na rodoviária de Boa Vista. A Polícia Federal fecha as saídas enquanto o ônibus fretado ainda está com as portas abertas."},
       {q:"moreira",t:"Operação concluída. Prendemos Barrios e dois comparsas e resgatamos 11 pessoas que seriam levadas para trabalho forçado."},
       {q:"moreira",t:"Sem as denúncias documentadas do abrigo, o juiz não teria autorizado o mandado. Bom trabalho."},
       {q:"luz",t:"Você viu a cara dele quando percebeu que tinha sido o caderno de um novato que o derrubou?"}];
  }else if(G.provas>=1){
    f=[{q:"narr",t:"Madrugada, na rodoviária de Boa Vista. A PF consegue interceptar o ônibus, mas o homem que esperava por ele já não está lá."},
       {q:"moreira",t:"Pegamos dois intermediários, mas Barrios escapou. Com mais provas documentadas teria sido completo. Vou manter o inquérito aberto."},
       {q:"helena",t:"Foi um passo importante. Falta a próxima ficha conferida."}];
  }else{
    f=[{q:"narr",t:"Madrugada. O abrigo recebe uma ligação da PF."},
       {q:"moreira",t:"Sem provas documentadas, não consegui o mandado. Barrios segue solto, oferecendo vagas no portão de outro abrigo."},
       {q:"helena",t:"O que a gente não registra não existe para a Justiça. Ainda temos um dia."}];
  }
  return {cap:"CAPÍTULO 9",titulo:CAPITULOS[8],local:"Rodoviária de Boa Vista · madrugada",falas:f};
};
// Cena final, que muda conforme a partida: colapso, conduta, denúncias e suborno.
function epilogo(col){
  var f,cap="EPÍLOGO",tit,loc="Abrigo Esperança · dia 10";
  if(col){
    tit="Portas fechadas";
    f=[{q:"narr",t:"O abrigo chegou ao limite. Sem recursos, sem equipe e com a reputação em ruínas, a prefeitura determinou o fechamento temporário das portas."},
       {q:"helena",t:"Isso não foi só culpa sua. Mas aprenda: gestão sem cuidado com a equipe e com as pessoas não se sustenta. Vamos reabrir, e você vai estar lá."}];
  }else if(G.provas>=3&&!G.suborno&&G.denErr===0&&G.etica>=70){
    tit="Guardião(ã) da Fronteira";
    f=[{q:"narr",t:"Dez dias depois, a fila em frente ao abrigo ainda dá a volta no quarteirão. Mas agora você sabe ler o que ela carrega."},
       {q:"helena",t:"Você chegou como novato(a). Hoje não é mais. Acolheu, orientou, conferiu e denunciou sem nunca punir quem fugia. É assim que a norma vira prática."},
       {q:"luz",t:"Sabe quantas pessoas saíram daqui com emprego? "+G.empregos+". E "+G.denOk+" saíram protegidas de quem as explorava."},
       {q:"moreira",t:"Se todo abrigo tivesse uma equipe assim, o aliciador não teria onde trabalhar."},
       {q:"narr",t:"Você fecha o Caderno do Novato. Na capa, Helena escreveu a lápis: “Colega”."}];
  }else if(G.etica>=50&&!G.suborno){
    tit="Aprendiz dedicado(a)";
    f=[{q:"narr",t:"Dez dias depois, o abrigo segue de pé. Mais cheio, mais cansado e um pouco mais sábio."},
       {q:"helena",t:"Você errou aqui e ali, como todo mundo, mas aprendeu. A norma não é um papel na parede. É o que você escolhe quando ninguém está olhando."},
       {q:"luz",t:G.empregos+" pessoa(s) saíram daqui com trabalho e "+G.denOk+" denúncia(s) fundamentada(s) foram feitas. Nada mal para um começo."},
       {q:"narr",t:"Você guarda o Caderno do Novato no bolso. Amanhã tem fila de novo."}];
  }else{
    tit="Lições duras";
    f=[{q:"narr",t:"Dez dias depois, o abrigo segue aberto. Mas algumas escolhas pesaram mais do que você imaginava."},
       {q:"helena",t:G.suborno?"Aquele envelope vai me dar uma conversa séria com você. A norma que seguimos não tem preço.":"Alguns erros pesam mais que outros. Perdemos gente que a gente podia ter protegido."},
       {q:"luz",t:"Ainda dá tempo de fazer diferente. O abrigo tem outro dia amanhã."}];
  }
  return {cap:cap,titulo:tit,local:loc,falas:f};
}

/* ── Encerramento com epílogo ── */
var _encerrarBase=encerrarJogoV14;
encerrarJogoV14=function(col){
  if(G.encerrando)return;
  G.encerrando=true;clearAllTimers();
  mostrarCena(epilogo(col),function(){
    _encerrarBase(col);
    var e=gid("fim-s-eventos");if(e)e.textContent=G.acolhidos+" acol. · "+G.empregos+" emp. · "+G.denOk+" den.";
  });
};

/* ── Dashboard: capítulos, caderno e dicas ── */
var DICAS_V16=[
  "Helena: “Confira os documentos antes de decidir. Custa pouco e evita erros caros.”",
  "Helena: “Quem tem qualificação e papéis em dia precisa de autonomia: oriente para o trabalho.”",
  "Luz: “Denunciamos quem explora, nunca quem foge. Convenção de 1951, Art. 31.”",
  "Helena: “Desconfiar de todo mundo também é discriminar. Procure fatos, não preconceito.”",
  "Agente Moreira: “Denúncia sem prova documentada não sustenta inquérito.”"
];
var _atualizarDashBase=atualizarDash;
atualizarDash=function(){
  _atualizarDashBase();
  if(!G||!G.res)return;
  function el(id,v){var e=gid(id);if(e)e.textContent=v;}
  var d=G.dia||1;
  el("d-tag","CAPÍTULO "+d+" · DIA "+d+" / 10");
  el("d-titulo",CAPITULOS[Math.min(d-1,CAPITULOS.length-1)]);
  el("d-dica",DICAS_V16[d%DICAS_V16.length]);
  var nF=fila.filter(function(p){return p.vivo;}).length;
  el("d-fila-num",nF);
  el("d-fila-sub","Existem "+nF+" pessoa"+(nF!==1?"s":"")+" aguardando atendimento"+(fila.some(function(p){return p.soHist;})?" · ★ caso da história hoje":"")+".");
  el("cad-docs",G.docsVer||0);el("cad-emp",G.empregos||0);el("cad-den",G.denOk||0);el("cad-pro",G.provas||0);
  var et=Math.round(G.etica==null?50:G.etica);
  el("cad-etica-val",et+" / 100");
  var f=gid("cad-etica");if(f){f.style.width=et+"%";f.style.background=et<30?"#dc2626":et<50?"#f59e0b":"#0891b2";}
};


/* ═══════════════════════════════════════════════════════════════
   v17 · BALCÃO DE ATENDIMENTO (estilo Papers, Please)
   1 pessoa por vez · examinar documentos · marcar sinais · carimbar
═══════════════════════════════════════════════════════════════ */
// Declarações que NÃO são sinal de crime (pobreza, sotaque, nervosismo).
// Aparecem misturadas aos sinais reais: marcar uma delas é um erro.
var DECOYS=["Fala pouco português","Chegou sem dinheiro","Está nervoso(a) e cansado(a)","Viaja com poucos pertences","Dormiu na rodoviária","Não tem endereço fixo no Brasil","Pede ajuda para ligar para a família","Tem sotaque forte e fala baixo"];
var DOC_SHOW={ok:"Protocolo de refúgio válido",vencido:"Protocolo de refúgio vencido",sem:"Sem protocolo (só a cédula)",inconsistente:"Protocolo apresentado",retido:"Não apresentou: diz que outra pessoa guarda"};
// Declarações escritas à mão para os casos da história. s:true = sinal real de risco.
var CASO_LINHAS={
  "Família Arias":[
    {t:"Pai viaja sozinho com os dois filhos",s:false},
    {t:"A mãe ficou na Venezuela cuidando da avó doente",s:false},
    {t:"As crianças dormem agarradas ao pai",s:false},
    {t:"Apresentou as certidões de nascimento dos filhos",s:false},
    {t:"Mostrou um vídeo da esposa confirmando a viagem",s:false}
  ]
};

// Declarações que aparecem no papel "Declarações e mensagens":
// sinais reais do alerta + 3 distrações + a origem, embaralhados pela semente.
function linhasCaso(p){
  if(p._ln)return p._ln;
  var m=metaCaso(p),L=[];
  if(CASO_LINHAS[p.nome_base]){
    L=CASO_LINHAS[p.nome_base].map(function(x){return {t:x.t,s:x.s};});
  }else{
    if(m.alerta)m.alerta.sinais.forEach(function(s){L.push({t:s,s:true});});
    var idx=DECOYS.map(function(d,i){return i;}).sort(function(a,b){return rng(p.seed,a+50)-rng(p.seed,b+50);});
    for(var k=0;k<3;k++)L.push({t:DECOYS[idx[k]],s:false});
    L.push({t:"Veio de "+cidadeOrigem(p.seed)+(rng(p.seed,12)>.5?", de ônibus":", em parte a pé"),s:false});
  }
  var ord=L.map(function(x,i){return i;}).sort(function(a,b){return rng(p.seed,a+100)-rng(p.seed,b+100);});
  p._ln=ord.map(function(i){return L[i];});
  return p._ln;
}
// Conta as marcações: a = sinais reais marcados, f = marcações erradas, tot = sinais reais.
function qualMarcas(p){
  var L=linhasCaso(p),mk=p.marcas||{},a=0,f=0,tot=0;
  L.forEach(function(x,i){if(x.s)tot++;if(mk[i]){if(x.s)a++;else f++;}});
  return {a:a,f:f,tot:tot};
}
function nMarcas(p){return Object.keys(p.marcas||{}).length;}
// Gabarito da conferência mostrado após a decisão.
function gabarito(p){
  var L=linhasCaso(p),mk=p.marcas||{},li=[];
  L.forEach(function(x,i){
    if(x.s&&mk[i])li.push('<li class="g-ok">✔ <b>Sinal marcado:</b> '+x.t+"</li>");
    else if(x.s)li.push('<li class="g-miss">➖ <b>Sinal que passou batido:</b> '+x.t+"</li>");
    else if(mk[i])li.push('<li class="g-err">✖ <b>Não é sinal de crime:</b> '+x.t+"</li>");
  });
  if(!li.length)return "";
  return '<div class="gab"><div class="gab-t">📑 GABARITO DA CONFERÊNCIA</div><ul>'+li.join("")+"</ul></div>";
}

/* ── Coluna esquerda: a pessoa no balcão ── */
// O balcão tem três colunas: a pessoa (esquerda), os documentos (centro) e os carimbos (direita).
function pessoaHTML(p,m){
  var prMap={critico:"SITUAÇÃO CRÍTICA",grave:"CASO GRAVE",moderado:"MODERADO",estavel:"ESTÁVEL"};
  var estado={critico:"😰 Em desespero",grave:"😟 Preocupado(a)",moderado:"😕 Ansioso(a)",estavel:"😐 Resignado(a)"};
  var dias={critico:"10–20 dias a pé",grave:"7–14 dias",moderado:"3–7 dias",estavel:"1–3 dias"};
  var cl=p.prioridade;
  return '<div class="cf-avatar-area"><div class="cf-photo-wrap"><img class="cf-photo" src="'+retrato(p,100,120)+'"><div class="cf-ven">🇻🇪 Venezuela</div></div>'
    +'<div class="cf-name">'+p.nomeDisplay+'</div><div class="cf-origem">'+cidadeOrigem(p.seed)+'</div>'
    +'<div class="cf-chips"><span class="chip '+cl+'">'+prMap[cl]+"</span></div></div>"
    +'<div class="cf-sec"><h4>NO BALCÃO</h4>'
    +'<div class="cf-row"><span class="cf-lbl">Estado</span><span class="cf-val">'+estado[cl]+"</span></div>"
    +'<div class="cf-row"><span class="cf-lbl">Viagem</span><span class="cf-val">'+dias[cl]+"</span></div>"
    +'<div class="cf-row"><span class="cf-lbl">Família</span><span class="cf-val">'+(rng(p.seed,10)>.4?"Com dependentes":"Sozinho(a)")+"</span></div></div>"
    +(p.urgente?'<div class="urgente-box">⏱ CASO URGENTE — Timer ativo!</div>':"")
    +(p.soHist?'<div class="cf-sec" style="border-bottom:none;"><div class="dica-azul">★ Caso da história de hoje.</div></div>':"");
}

/* ── Coluna central: a mesa com os documentos ── */
function mesaHTML(p,m){
  var ex=!!p.verif,mk=p.marcas||{};
  var passo=!ex?1:(nMarcas(p)?3:2);
  var h='<div class="passos">'+[["1","Examinar documentos"],["2","Marcar o que não bate"],["3","Carimbar a decisão"]].map(function(x,i){
    return '<span class="passo'+(passo===i+1?" on":"")+(passo>i+1?" ok":"")+'"><b>'+x[0]+"</b>"+x[1]+"</span>";
  }).join("<i>›</i>")+'<span class="passos-man" onclick="abrirManual()">📖 Manual [M]</span></div>';
  h+='<div class="mesa">';
  h+='<div class="papel p-relato"><div class="pp-t">📋 RELATO DA RECEPÇÃO</div><div class="pp-txt">'+p.historia+"</div>"
    +(OPTS.leis?'<div class="pp-lei">⚖️ '+p.lei+"</div>":"")
    +'<div class="pp-dil">❓ '+p.dilema+"</div></div>";
  var lacre='<div class="lacre" onclick="decidir(\'verificar\')">🔒 LACRADO<small>Clique para examinar · −2 equipe [E]</small></div>';
  var sk='<div class="sk"></div><div class="sk"></div><div class="sk s"></div>';
  /* identificação */
  h+='<div class="papel p-id'+(ex?"":" lac")+'"><div class="pp-t">🪪 IDENTIFICAÇÃO</div>';
  if(ex){
    h+='<div class="pp-row"><span>Nome</span><b>'+p.nomeDisplay+"</b></div>"
      +'<div class="pp-row"><span>Origem</span><b>'+cidadeOrigem(p.seed)+"</b></div>"
      +'<div class="pp-row"><span>Documento</span><b>'+DOC_SHOW[m.doc]+"</b></div>"
      +'<div class="pp-row"><span>Situação</span><b>Solicitante de refúgio</b></div>';
  }else h+=sk+lacre;
  h+="</div>";
  /* qualificação */
  h+='<div class="papel p-qual'+(ex?"":" lac")+'"><div class="pp-t">🎓 QUALIFICAÇÃO</div>';
  if(ex){
    h+='<div class="pp-row"><span>Profissão</span><b>'+m.prof+"</b></div>"
      +'<div class="pp-row"><span>Comprovação</span><b>'+(m.qual?m.qual+" ✔":"Sem comprovação")+"</b></div>"
      +'<div class="pp-row"><span>Pode trabalhar agora?</span><b>'+(m.doc==="ok"?"Sim, documentos em dia":m.doc==="vencido"?"Após renovar o protocolo":"Após regularizar documentos")+"</b></div>";
  }else h+=sk+lacre;
  h+="</div>";
  /* declarações (marcáveis) */
  h+='<div class="papel p-decl'+(ex?"":" lac")+'"><div class="pp-t">📝 DECLARAÇÕES E MENSAGENS</div>';
  if(ex){
    h+='<div class="pp-dica">Clique nas linhas que parecem <b>sinais de risco</b>. Pobreza, sotaque e nervosismo não são crime.</div>';
    linhasCaso(p).forEach(function(x,i){
      h+='<div class="ln'+(mk[i]?" mk":"")+'" id="ln-'+i+'" onclick="marcarLinha('+i+')">'+x.t+"</div>";
    });
  }else h+=sk+sk+lacre;
  h+="</div></div>";
  return h;
}
// Liga/desliga a marcação de uma declaração como suspeita.
function marcarLinha(i){
  if(!sel||!sel.verif)return;
  sel.marcas=sel.marcas||{};
  if(sel.marcas[i])delete sel.marcas[i];else sel.marcas[i]=true;
  somConferir();
  var ch=document.querySelector("#tela-caso .ch"),sc=ch?ch.scrollTop:0;
  renderDetalhe();
  if(ch)ch.scrollTop=sc;
}

/* ── Coluna direita: recursos + carimbos ── */
function stampHTML(acao,icon,label,key,sub,bloq){
  return '<button class="stamp s-'+acao+(bloq?" bloq":"")+'" onclick="carimbar(\''+acao+'\')"><span class="st-ic">'+icon+'</span><span class="st-b"><span class="st-t">'+label+'</span><span class="st-s">'+sub+'</span></span><kbd>'+key+"</kbd></button>";
}
// Os 5 carimbos (Acolher, Assistência, Encaminhar, Trabalho, Denunciar) com o
// custo de cada um e o motivo quando estão bloqueados.
function carimbosHTML(p,m){
  var r=G.res,d=G.desconto;
  var b=Math.round(p.b*d),ab=Math.round(p.ab*d);
  var okAc=(r.orcamento-b>=0)&&(r.abrigo-ab>=0);
  var crit=p.prioridade==="critico";
  function bar(l,v,c){return '<div class="rb"><span>'+l+'</span><div class="rb-t"><div class="rb-f" style="width:'+Math.round(v)+"%;background:"+(v<20?"#dc2626":v<40?"#f59e0b":c)+'"></div></div><b>'+Math.round(v)+"</b></div>";}
  var h='<div class="rb-box">'+bar("💰",r.orcamento,"#16a34a")+bar("🏠",r.abrigo,"#2563eb")+bar("👥",r.equipe,"#d97706")+bar("⭐",r.reputacao,"#7c3aed")+"</div>";
  h+='<div class="st-ttl">DECIDA COM UM CARIMBO</div><div class="stamps">';
  h+=stampHTML("acolher","🏠","ACOLHER","1",okAc?"Vagas −"+ab+" · Orçamento −"+b:"⚠️ Sem recursos suficientes",!okAc);
  h+=stampHTML("estabilizar","🩺","ASSISTÊNCIA","2","Comida e higiene · Orçamento −"+Math.round(b/2),false);
  h+=stampHTML("encaminhar","➡️","ENCAMINHAR","3",crit?"⚠️ Críticos podem se perder":"Sem custo · outro serviço",false);
  h+=stampHTML("emprego","💼","TRABALHO","4",crit?"Crítico: priorize a saúde":m.menor?"Menor de idade: proteção":p.verif?(m.qual?"Qualificação comprovada ✔":"Sem qualificação comprovada"):"Examine antes para saber",crit||m.menor);
  h+=stampHTML("denunciar","🚨","DENUNCIAR","5",!p.verif?"Examine e marque os sinais":nMarcas(p)?nMarcas(p)+" linha(s) marcada(s)":"Marque os sinais antes",false);
  h+='</div><button class="cd-ver-fila" onclick="irParaDash()">📊 Painel do dia</button>';
  return h;
}
function somCarimbo(){tone(150,.07,"square",.12,0);tone(90,.14,"sine",.15,.03);}
// Clique em um carimbo: animação e som, depois aplica a decisão.
function carimbar(acao){
  if(!sel)return;
  var b=document.querySelector(".stamp.s-"+acao);
  if(acao==="acolher"){
    var r=G.res,d=G.desconto;
    if(r.orcamento-Math.round(sel.b*d)<0||r.abrigo-Math.round(sel.ab*d)<0){notif("Sem recursos para acolher. Use Assistência ou outra saída.","warn");return;}
  }
  if(b&&!b.classList.contains("bloq")){somCarimbo();b.classList.add("bater");}
  setTimeout(function(){if(b)b.classList.remove("bater");if(sel)decidir(acao);},170);
}

/* ── Nova renderização do detalhe ── */
renderDetalhe=function(){
  var fi=gid("ficha-content"),hi=gid("hist-content"),de=gid("dec-content");
  var hint=gid("act-hint"),bm=gid("btn-manual");
  if(bm)bm.classList.toggle("pulse",!!G&&G.dia<=1);
  if(!sel){
    var vivos=fila.filter(function(p){return p.vivo;}).length;
    if(fi)fi.innerHTML='<div style="padding:28px 14px;text-align:center;color:rgba(255,255,255,.4);font-size:12px;line-height:2;"><div style="font-size:30px;margin-bottom:8px;">🪑</div>Balcão vazio</div>';
    if(hi)hi.innerHTML=vivos?'<div style="padding:60px 24px;text-align:center;color:#6b6350;font-size:14px;">Chamando a próxima pessoa...</div>'
      :'<div style="padding:60px 24px;text-align:center;color:#6b6350;"><div style="font-size:42px;margin-bottom:10px;">✅</div><div style="font-size:16px;font-weight:700;margin-bottom:6px;">Fila vazia</div><div style="font-size:13px;margin-bottom:16px;">Todos foram atendidos hoje.</div><button class="mbtn" onclick="proximoDia()">Fechar o dia →</button></div>';
    if(de)de.innerHTML=G&&G.res?carimbosHTML({b:0,ab:0,t:0,prioridade:"estavel",verif:false},{}).replace(/onclick="carimbar\('[a-z]+'\)"/g,"disabled").replace(/class="stamp /g,'class="stamp off '):"";
    if(hint){hint.textContent=vivos?"Chamando a próxima pessoa...":"Fila vazia: feche o dia";hint.style.color="var(--txt-light)";}
    return;
  }
  var p=sel,m=metaCaso(p);
  if(fi)fi.innerHTML=pessoaHTML(p,m);
  if(hi)hi.innerHTML=mesaHTML(p,m);
  if(de)de.innerHTML=carimbosHTML(p,m);
  if(hint){
    hint.textContent=!p.verif?"Passo 1: examine os documentos (E)":nMarcas(p)?"Passo 3: carimbe a sua decisão (teclas 1 a 5)":"Passo 2: marque o que não bate · depois carimbe";
    hint.style.color=p.prioridade==="critico"?"var(--red)":"var(--txt-light)";
  }
};

/* ── Chamada automática da próxima pessoa ── */
// Chama automaticamente a próxima pessoa, por ordem de prioridade.
function autoSelecionar(){
  if(sel&&sel.vivo)return;
  if(document.querySelector(".ov:not(.off)"))return;
  var tc=gid("tela-caso");if(!tc||tc.style.display==="none")return;
  var ord={critico:0,grave:1,moderado:2,estavel:3};
  var v=fila.filter(function(p){return p.vivo;}).sort(function(a,b){return ord[a.prioridade]-ord[b.prioridade];});
  if(v.length)selecionar(v[0]);else renderDetalhe();
}
var _irCasosBase=irParaCasos;
irParaCasos=function(){_irCasosBase();snapDia();setTimeout(autoSelecionar,380);};
var _fcBase=fecharConsequencia;
fecharConsequencia=function(){_fcBase();setTimeout(autoSelecionar,480);};
var _perdBase=perderImigrante;
perderImigrante=function(id){_perdBase(id);setTimeout(autoSelecionar,800);};
var _decidirV16=decidir;
decidir=function(acao,forcar){var r=_decidirV16(acao,forcar);setTimeout(autoSelecionar,900);return r;};

/* ── Manual do abrigo ── */
function abrirManual(){abrirOv("ov-manual");}
function fecharManual(){fecharOv("ov-manual");}

/* ── Relatório de fim de dia ── */
// Fotografia dos números no início do dia, para calcular o relatório de fim de dia.
function snapDia(){
  if(!G||!G.res||G._snapDia===G.dia)return;
  G._snapDia=G.dia;
  G._snap={pts:G.pts,ac:G.acolhidos,emp:G.empregos||0,den:G.denOk||0,err:G.denErr||0,perd:G.perdidos,orc:G.res.orcamento,ab:G.res.abrigo,eq:G.res.equipe,rep:G.res.reputacao,et:G.etica==null?50:G.etica};
}
function mostrarRelDia(){
  var s=G._snap;if(!s){G._relDia=true;proximoDia();return;}
  function dl(v,suf,inv){var x=Math.round(v);if(x===0)return '<b>0'+(suf||"")+"</b>";var bom=inv?x<0:x>0;return '<b class="'+(bom?"pos":"neg")+'">'+(x>0?"+":"")+x+(suf||"")+"</b>";}
  var r=G.res,ac=G.acolhidos-s.ac,emp=(G.empregos||0)-s.emp,den=(G.denOk||0)-s.den,err=(G.denErr||0)-s.err,perd=G.perdidos-s.perd;
  var rows=[["👥 Pessoas atendidas",'<b>'+ac+"</b>"],["💼 Encaminhadas ao trabalho",'<b>'+emp+"</b>"],["🚨 Denúncias com base",'<b>'+den+"</b>"],
    ["⚠️ Denúncias infundadas",err?'<b class="neg">'+err+"</b>":"<b>0</b>"],["💔 Casos perdidos",perd?'<b class="neg">'+perd+"</b>":"<b>0</b>"],
    ["⭐ Pontos do dia",dl(G.pts-s.pts,"")],["💰 Orçamento",dl(r.orcamento-s.orc,"%")],["🏠 Vagas",dl(r.abrigo-s.ab,"%")],["👥 Equipe",dl(r.equipe-s.eq,"%")],["⭐ Reputação",dl(r.reputacao-s.rep,"")],["🧭 Conduta",dl((G.etica==null?50:G.etica)-s.et,"")]];
  var msg=err>0?"Denúncia sem base fere a confiança. Releia o Manual (tecla M): sinais de risco são fatos, e não impressões."
    :perd>0?"Casos críticos não podem esperar. Examine rápido e carimbe."
    :den>0?"Boa conferência! Denunciar com base protege quem foge de quem explora."
    :"Dia fechado sem grandes erros. Siga conferindo os documentos antes de decidir.";
  gid("dia-ttl").textContent="📋 Fim do dia "+G.dia;
  gid("dia-body").innerHTML=rows.map(function(x){return '<div class="rd-row"><span>'+x[0]+"</span>"+x[1]+"</div>";}).join("")+'<div class="rd-msg"><b>Helena:</b> “'+msg+"”</div>";
  abrirOv("ov-dia");
}
function fecharRelDia(){fecharOv("ov-dia");G._relDia=true;proximoDia();}
var _proxBase=proximoDia;
proximoDia=function(){
  if(fila.filter(function(p){return p.vivo;}).length>0)return;
  if(!G._relDia){mostrarRelDia();return;}
  G._relDia=false;_proxBase();
};


/* ═══════════════════════════════════════════════════════════════
   v18 · RETRATOS SEMIRREALISTAS (SVG procedural com sombreamento)
   Cada caso tem um perfil: gênero, idade, tom de pele, cabelo, roupa.
═══════════════════════════════════════════════════════════════ */
// Aparência fixa dos personagens: g (gênero), age (idade), pele (0 a 3),
// cabelo, roupa, acessórios e humor. Os outros casos usam perfilAuto(seed).
var PERFIL={
  "Família Pérez":{g:"m",age:34,pele:2,barba:"leve",roupa:"camisa",mochila:true,humor:"cansado",cabelo:"curto"},
  "Sr. Montoya":{g:"m",age:58,pele:1,oculos:true,roupa:"camisa",cabelo:"rarefeito"},
  "Jovens Ramírez":{g:"f",age:16,pele:2,cabelo:"longo",roupa:"moletom",humor:"cansado"},
  "Dra. Vásquez":{g:"f",age:41,pele:1,cabelo:"preso",roupa:"blusa"},
  "Sr. Gutiérrez":{g:"m",age:45,pele:2,bigode:true,cabelo:"curto",roupa:"camiseta"},
  "Família Flores":{g:"f",age:29,pele:2,cabelo:"longo",roupa:"blusa",humor:"cansado"},
  "Adolescente Torres":{g:"m",age:17,pele:3,cabelo:"curto",roupa:"moletom",humor:"assustado"},
  "Casal Hernández":{g:"f",age:50,pele:0,cabelo:"curto_f",roupa:"blusa"},
  "Sr. Pedraza":{g:"m",age:33,pele:3,barba:"cheia",cabelo:"curto",roupa:"camiseta"},
  "Sra. Mendoza":{g:"f",age:38,pele:2,cabelo:"preso",roupa:"blusa"},
  "Família Rivas":{g:"m",age:40,pele:1,cabelo:"lateral",roupa:"polo"},
  "Bebê Valentina":{g:"f",age:.3,pele:1,roupa:"manta",cabelo:"nenhum"},
  "Prof. Castillo":{g:"m",age:62,pele:0,oculos:true,cabelo:"rarefeito",roupa:"camisa"},
  "Grupo Artistas":{g:"m",age:25,pele:2,cabelo:"ondulado",roupa:"jaqueta",barba:"leve"},
  "Sra. Ochoa":{g:"f",age:44,pele:2,cabelo:"longo",roupa:"blusa",humor:"assustado"},
  "Família Suárez":{g:"f",age:32,pele:1,cabelo:"preso",roupa:"blusa",mochila:true,humor:"cansado"},
  "Sr. Bolivar":{g:"m",age:55,pele:1,oculos:true,cabelo:"lateral",roupa:"camisa",bigode:true},
  "Grupo Wayuu":{g:"f",age:68,pele:3,cabelo:"lenco",roupa:"manta_wayuu"},
  "Jovem Díaz":{g:"f",age:22,pele:1,cabelo:"longo",roupa:"moletom",mochila:true},
  "Eng. Salazar":{g:"m",age:36,pele:1,cabelo:"lateral",roupa:"polo",barba:"leve"},
  "Enf. Carolina Ruiz":{g:"f",age:31,pele:2,cabelo:"preso",roupa:"camiseta"},
  "Sra. Quintero":{g:"f",age:27,pele:2,cabelo:"longo",roupa:"blusa"},
  "Família Arias":{g:"m",age:39,pele:2,cabelo:"curto",roupa:"camiseta",barba:"leve"},
  "Rapazes do Contratante":{g:"m",age:22,pele:3,cabelo:"curto",roupa:"camiseta",humor:"assustado"},
  "Yusmary (15) e o “tio”":{g:"f",age:15,pele:2,cabelo:"longo",roupa:"moletom",humor:"assustado"}
};
var PELES=[
  {b:"#dcae8a",s:"#a8795a",h:"#efcdb0"},   /* clara */
  {b:"#c99169",s:"#946245",h:"#e0b08a"},   /* trigueira */
  {b:"#b27a54",s:"#7e4f32",h:"#cf9a72"},   /* morena */
  {b:"#8a5a3c",s:"#5a3622",h:"#a8754f"},   /* morena escura */
  {b:"#6a412b",s:"#40251a",h:"#855a40"}    /* negra */
];
var CABELOS=["#120a06","#1c110a","#2a1a10","#3a2515","#0d0806"];
var ROUPAS_M=["#4a5568","#3d4a3a","#5b4636","#2f3e55","#6b3a32","#55575c"];
var ROUPAS_F=["#7a3b4b","#3f5a6a","#5d4b6b","#8a6a3a","#3e6455","#6b4a3a"];

function hex2rgb(h){h=h.replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];}
function mixHex(a,b,t){var x=hex2rgb(a),y=hex2rgb(b);return "#"+[0,1,2].map(function(i){var v=Math.round(x[i]+(y[i]-x[i])*t);return ("0"+v.toString(16)).slice(-2);}).join("");}
function perfilAuto(seed){
  var fem=rng(seed,4)>.45;
  return {g:fem?"f":"m",age:20+Math.floor(rng(seed,7)*40),pele:Math.floor(rng(seed,1)*4),cabelo:fem?(rng(seed,9)>.5?"longo":"preso"):"curto",roupa:"camiseta",mochila:rng(seed,10)>.4};
}

var _cacheRet={};
// Gera o retrato em SVG e guarda em cache como data URI.
function retrato(p,w,h){
  var key=p.nome_base+"|"+p.seed+"|"+w+"x"+h;
  if(_cacheRet[key])return _cacheRet[key];
  var uri="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(retratoSVG(p,w,h));
  _cacheRet[key]=uri;return uri;
}

// Desenha o rosto por partes: cabeça, olhos, nariz, boca, cabelo, barba e roupa.
function retratoSVG(p,w,h){
  var P=PERFIL[p.nome_base]||perfilAuto(p.seed),s=p.seed;
  function R(n){return rng(s,n+300);}
  var fem=P.g==="f",age=P.age,baby=age<2,kid=age<13&&!baby,teen=age>=13&&age<19;
  var sk=PELES[P.pele==null?2:P.pele];
  var cx=100;
  /* proporções do rosto */
  var W=fem?37:41,top=58,chin=160,eyeY=104,browY=92,noseY=130,mouthY=146;
  if(teen){W-=2;chin-=2;}
  if(kid){W=36;top=68;chin=160;eyeY=112;browY=101;noseY=135;mouthY=148;}
  if(baby){W=40;top=70;chin=164;eyeY=114;browY=104;noseY=138;mouthY=150;}
  W+=Math.round((R(1)-.5)*4);
  var Wj=W*(fem?.72:.84)*(age>55?1.02:1);
  var eyeScale=baby?1.2:kid?1.15:1;
  /* cores */
  var hairBase=CABELOS[Math.floor(R(2)*CABELOS.length)];
  var grey=Math.max(0,Math.min(1,(age-42)/28));
  var hairC=mixHex(hairBase,"#b8b4ae",grey*.85);
  var hairHi=mixHex(hairC,"#ffffff",.22),hairLo=mixHex(hairC,"#000000",.45);
  var irisPick=R(3);
  var iris=irisPick>.93?"#5f6b3a":irisPick>.82?"#7a5a2b":"#4a2b17";
  var lipC=fem?mixHex(sk.b,"#8a2f3a",.38):mixHex(sk.b,"#6a3028",.32);
  var cloth=(fem?ROUPAS_F:ROUPAS_M)[Math.floor(R(4)*6)];
  var humor=P.humor||(R(5)>.55?"cansado":"neutro");
  var bgPick=Math.floor(R(6)*3);
  var bg=[["#c9bfa8","#7d7461"],["#9fb0b8","#56656e"],["#cdb48f","#7b6446"]][bgPick];
  var gid_="g"+s;
  var d=[];
  /* defs */
  d.push('<defs>'
   +'<radialGradient id="bg" cx=".5" cy=".38" r=".85"><stop offset="0" stop-color="'+bg[0]+'"/><stop offset="1" stop-color="'+bg[1]+'"/></radialGradient>'
   +'<linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+sk.h+'"/><stop offset=".5" stop-color="'+sk.b+'"/><stop offset="1" stop-color="'+sk.s+'"/></linearGradient>'
   +'<radialGradient id="skinR" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="'+sk.h+'"/><stop offset=".55" stop-color="'+sk.b+'"/><stop offset="1" stop-color="'+sk.s+'"/></radialGradient>'
   +'<linearGradient id="neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+mixHex(sk.s,"#000",.35)+'"/><stop offset=".4" stop-color="'+sk.s+'"/><stop offset="1" stop-color="'+sk.b+'"/></linearGradient>'
   +'<linearGradient id="hair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+hairHi+'"/><stop offset=".45" stop-color="'+hairC+'"/><stop offset="1" stop-color="'+hairLo+'"/></linearGradient>'
   +'<linearGradient id="cl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+mixHex(cloth,"#fff",.16)+'"/><stop offset=".6" stop-color="'+cloth+'"/><stop offset="1" stop-color="'+mixHex(cloth,"#000",.4)+'"/></linearGradient>'
   +'<radialGradient id="iris" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="'+mixHex(iris,"#fff",.25)+'"/><stop offset=".7" stop-color="'+iris+'"/><stop offset="1" stop-color="'+mixHex(iris,"#000",.6)+'"/></radialGradient>'
   +'<linearGradient id="sc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2efe6"/><stop offset="1" stop-color="#cfc6b6"/></linearGradient>'
   +'<radialGradient id="vg" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></radialGradient>'
   +'<radialGradient id="bm2" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>'
   +'<filter id="b1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>'
   +'<filter id="b2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4.5"/></filter>'
   +'<filter id="b05" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".55"/></filter>'
   +'<filter id="bgb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>'
   +'<filter id="stub" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="'+(s%97)+'" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -3.9" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/><feGaussianBlur stdDeviation=".25"/></filter>'
   +'<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="'+(s%53)+'"/><feColorMatrix type="saturate" values="0"/></filter>'
   +'<mask id="bmask"><ellipse cx="100" cy="'+(chin-18)+'" rx="'+(W+6)+'" ry="38" fill="url(#bm2)"/></mask>'
   +'<clipPath id="headclip"><path d="'+headPath(cx,W,Wj,top,chin)+'"/></clipPath>'
   +'</defs>');
  /* fundo desfocado */
  d.push('<rect width="200" height="240" fill="url(#bg)"/>');
  d.push('<g filter="url(#bgb)" opacity=".55"><rect x="-10" y="30" width="60" height="150" fill="'+mixHex(bg[1],"#fff",.25)+'"/><rect x="150" y="10" width="70" height="120" fill="'+mixHex(bg[0],"#000",.18)+'"/><circle cx="160" cy="170" r="26" fill="'+mixHex(bg[0],"#fff",.3)+'"/></g>');
  /* cabelo de trás */
  d.push(cabeloTras(P,cx,W,top,hairC,hairLo));
  /* corpo e roupa */
  d.push(corpo(P,fem,age,baby,kid,cx,sk,cloth,R));
  /* pescoço */
  if(!baby){
    var nw=fem?15:18;if(kid)nw=13;
    d.push('<path d="M'+(cx-nw)+' 140 L'+(cx-nw-1)+' 188 Q'+cx+' 196 '+(cx+nw+1)+' 188 L'+(cx+nw)+' 140 Z" fill="url(#neck)"/>');
  }
  /* orelhas */
  var earY=eyeY+8,earW=baby?7:6;
  d.push('<ellipse cx="'+(cx-W-1)+'" cy="'+earY+'" rx="'+earW+'" ry="'+(baby?10:12)+'" fill="'+sk.s+'"/><ellipse cx="'+(cx+W+1)+'" cy="'+earY+'" rx="'+earW+'" ry="'+(baby?10:12)+'" fill="'+sk.s+'"/>');
  d.push('<ellipse cx="'+(cx-W-1)+'" cy="'+earY+'" rx="2.2" ry="6" fill="#000" opacity=".16"/><ellipse cx="'+(cx+W+1)+'" cy="'+earY+'" rx="2.2" ry="6" fill="#000" opacity=".16"/>');
  /* cabeça */
  d.push('<path d="'+headPath(cx,W,Wj,top,chin)+'" fill="url(#skinR)"/>');
  /* sombras e luzes na pele (recortadas na cabeça) */
  var sh=[];
  sh.push('<ellipse cx="'+(cx+W*.95)+'" cy="'+(eyeY+10)+'" rx="'+(W*.55)+'" ry="'+(chin-top)*.5+'" fill="'+sk.s+'" opacity=".55" filter="url(#b2)"/>');
  sh.push('<ellipse cx="'+cx+'" cy="'+(chin+4)+'" rx="'+(Wj+2)+'" ry="13" fill="'+mixHex(sk.s,"#000",.25)+'" opacity=".45" filter="url(#b1)"/>');
  sh.push('<ellipse cx="'+(cx-W*.35)+'" cy="'+(top+20)+'" rx="'+(W*.5)+'" ry="16" fill="'+sk.h+'" opacity=".55" filter="url(#b2)"/>');
  sh.push('<ellipse cx="'+(cx-W*.5)+'" cy="'+(noseY+2)+'" rx="10" ry="9" fill="#d0614a" opacity="'+(fem?.20:.14)+'" filter="url(#b1)"/>');
  sh.push('<ellipse cx="'+(cx+W*.5)+'" cy="'+(noseY+2)+'" rx="10" ry="9" fill="#d0614a" opacity="'+(fem?.17:.12)+'" filter="url(#b1)"/>');
  sh.push('<ellipse cx="'+(cx-18*eyeScale)+'" cy="'+eyeY+'" rx="15" ry="8" fill="'+mixHex(sk.s,"#000",.2)+'" opacity=".38" filter="url(#b1)"/>');
  sh.push('<ellipse cx="'+(cx+18*eyeScale)+'" cy="'+eyeY+'" rx="15" ry="8" fill="'+mixHex(sk.s,"#000",.2)+'" opacity=".42" filter="url(#b1)"/>');
  if(humor==="cansado"||age>45){
    sh.push('<ellipse cx="'+(cx-17*eyeScale)+'" cy="'+(eyeY+9)+'" rx="12" ry="3.4" fill="'+mixHex(sk.s,"#3a1a2a",.35)+'" opacity=".42" filter="url(#b1)"/>');
    sh.push('<ellipse cx="'+(cx+17*eyeScale)+'" cy="'+(eyeY+9)+'" rx="12" ry="3.4" fill="'+mixHex(sk.s,"#3a1a2a",.35)+'" opacity=".42" filter="url(#b1)"/>');
  }
  d.push('<g clip-path="url(#headclip)">'+sh.join("")+'</g>');
  /* nariz */
  d.push(nariz(cx,eyeY,noseY,sk,baby,kid));
  /* olhos */
  d.push(olho(cx-17*eyeScale,eyeY,eyeScale,sk,humor,-1,age)+olho(cx+17*eyeScale,eyeY,eyeScale,sk,humor,1,age));
  /* sobrancelhas */
  d.push(sobrancelhas(cx,browY,eyeScale,fem,hairC,humor,baby,age,R));
  /* boca */
  d.push(boca(cx,mouthY,fem,lipC,sk,humor,baby,kid));
  /* rugas */
  d.push(rugas(cx,W,eyeY,browY,noseY,mouthY,sk,age));
  /* barba */
  if(P.barba||P.bigode)d.push(barba(P,cx,W,Wj,chin,mouthY,hairC));
  /* cabelo da frente */
  d.push(cabeloFrente(P,cx,W,top,eyeY,hairC,hairHi,hairLo,age));
  /* óculos */
  if(P.oculos)d.push('<g fill="none" stroke="#1d1d1f" stroke-width="2.2" opacity=".9"><rect x="'+(cx-17*eyeScale-14)+'" y="'+(eyeY-9)+'" width="28" height="19" rx="7"/><rect x="'+(cx+17*eyeScale-14)+'" y="'+(eyeY-9)+'" width="28" height="19" rx="7"/><path d="M'+(cx-3)+' '+(eyeY-2)+' Q'+cx+' '+(eyeY-5)+' '+(cx+3)+' '+(eyeY-2)+'"/></g><g opacity=".14" fill="#fff"><rect x="'+(cx-17*eyeScale-12)+'" y="'+(eyeY-7)+'" width="12" height="7" rx="3"/><rect x="'+(cx+17*eyeScale-12)+'" y="'+(eyeY-7)+'" width="12" height="7" rx="3"/></g>');
  /* acabamento: textura, vinheta, tom */
  d.push('<rect width="200" height="240" filter="url(#grain)" opacity=".07" style="mix-blend-mode:multiply"/>');
  d.push('<rect width="200" height="240" fill="url(#vg)"/>');
  d.push('<rect width="200" height="240" fill="#f0c890" opacity=".05"/>');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="22 36 156 187" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice">'+d.join("")+'</svg>';
}

function headPath(cx,W,Wj,top,chin){
  var L=cx-W,Rr=cx+W,cr=chin-6;
  return "M"+cx+" "+top
   +" C"+(cx+W*.78)+" "+top+" "+Rr+" "+(top+20)+" "+Rr+" "+(top+46)
   +" C"+Rr+" "+(top+86)+" "+(cx+Wj+11)+" "+(chin-12)+" "+(cx+Wj*.6)+" "+(cr+1)
   +" Q"+(cx+Wj*.3)+" "+(chin+2)+" "+cx+" "+chin
   +" Q"+(cx-Wj*.3)+" "+(chin+2)+" "+(cx-Wj*.62)+" "+(cr+1)
   +" C"+(cx-Wj-11)+" "+(chin-12)+" "+L+" "+(top+86)+" "+L+" "+(top+46)
   +" C"+L+" "+(top+20)+" "+(cx-W*.78)+" "+top+" "+cx+" "+top+" Z";
}

function corpo(P,fem,age,baby,kid,cx,sk,cloth,R){
  var o=[],r=P.roupa;
  if(baby){
    var bc=mixHex("#d9c7a0","#ffffff",.1);
    o.push('<path d="M10 240 Q18 188 70 178 Q100 172 130 178 Q182 188 190 240 Z" fill="'+bc+'"/>');
    o.push('<path d="M40 190 Q100 214 160 190 M30 205 Q100 232 170 205" stroke="#a9976f" stroke-width="2" fill="none" opacity=".6"/>');
    o.push('<path d="M10 240 Q18 188 70 178 Q100 172 130 178 Q182 188 190 240 Z" fill="#000" opacity=".08"/>');
    return o.join("");
  }
  var sw=kid?62:fem?72:82,y0=kid?190:182;
  var path='M'+(cx-sw-22)+' 240 L'+(cx-sw-18)+' 214 Q'+(cx-sw-6)+' 190 '+(cx-30)+' '+(y0-2)+' Q'+cx+' '+(y0+10)+' '+(cx+30)+' '+(y0-2)+' Q'+(cx+sw+6)+' 190 '+(cx+sw+18)+' 214 L'+(cx+sw+22)+' 240 Z';
  if(r==="manta_wayuu"){
    var m1="#c0392b",m2="#e8a317",m3="#2c5aa0";
    o.push('<path d="'+path+'" fill="'+m1+'"/>');
    o.push('<path d="'+path+'" fill="url(#cl)" opacity=".35"/>');
    for(var i=0;i<5;i++)o.push('<path d="M'+(cx-sw-10+i*6)+' '+(226+i*2)+' L'+(cx+sw+10-i*6)+' '+(226+i*2)+'" stroke="'+(i%2?m2:m3)+'" stroke-width="3" opacity=".9"/>');
    o.push('<path d="M'+(cx-22)+' '+(y0+6)+' Q'+cx+' '+(y0+24)+' '+(cx+22)+' '+(y0+6)+'" fill="'+m2+'" opacity=".9"/>');
  }else{
    o.push('<path d="'+path+'" fill="url(#cl)"/>');
    /* dobras */
    o.push('<path d="M'+(cx-sw*.55)+' 205 Q'+(cx-sw*.4)+' 222 '+(cx-sw*.5)+' 240" stroke="#000" stroke-width="3" opacity=".12" fill="none" filter="url(#b05)"/>');
    o.push('<path d="M'+(cx+sw*.5)+' 200 Q'+(cx+sw*.38)+' 222 '+(cx+sw*.46)+' 240" stroke="#000" stroke-width="3" opacity=".16" fill="none" filter="url(#b05)"/>');
    if(r==="camisa"||r==="polo"){
      o.push('<path d="M'+(cx-17)+' '+(y0-4)+' L'+(cx-4)+' '+(y0+22)+' L'+(cx-26)+' '+(y0+16)+' Z" fill="'+mixHex(cloth,"#fff",.2)+'"/>');
      o.push('<path d="M'+(cx+17)+' '+(y0-4)+' L'+(cx+4)+' '+(y0+22)+' L'+(cx+26)+' '+(y0+16)+' Z" fill="'+mixHex(cloth,"#000",.1)+'"/>');
      if(r==="camisa"){o.push('<line x1="'+cx+'" y1="'+(y0+20)+'" x2="'+cx+'" y2="240" stroke="#000" stroke-width="1.2" opacity=".25"/>');for(var b=0;b<3;b++)o.push('<circle cx="'+cx+'" cy="'+(y0+32+b*14)+'" r="1.8" fill="#fff" opacity=".45"/>');}
      else o.push('<path d="M'+cx+' '+(y0+6)+' L'+cx+' '+(y0+26)+'" stroke="#000" stroke-width="1.2" opacity=".25"/>');
    }else if(r==="moletom"){
      o.push('<path d="M'+(cx-30)+' '+(y0-6)+' Q'+cx+' '+(y0-22)+' '+(cx+30)+' '+(y0-6)+' Q'+(cx+20)+' '+(y0+16)+' '+cx+' '+(y0+20)+' Q'+(cx-20)+' '+(y0+16)+' '+(cx-30)+' '+(y0-6)+' Z" fill="'+mixHex(cloth,"#000",.28)+'"/>');
      o.push('<line x1="'+(cx-8)+'" y1="'+(y0+14)+'" x2="'+(cx-9)+'" y2="'+(y0+36)+'" stroke="#e9e5da" stroke-width="1.6" opacity=".8"/><line x1="'+(cx+8)+'" y1="'+(y0+14)+'" x2="'+(cx+9)+'" y2="'+(y0+36)+'" stroke="#e9e5da" stroke-width="1.6" opacity=".8"/>');
    }else if(r==="jaqueta"){
      o.push('<path d="M'+(cx-26)+' '+(y0-4)+' L'+(cx-8)+' 240 L'+(cx+8)+' 240 L'+(cx+26)+' '+(y0-4)+' Q'+cx+' '+(y0+14)+' '+(cx-26)+' '+(y0-4)+' Z" fill="'+mixHex("#d8d2c4","#000",.1)+'"/>');
      o.push('<line x1="'+cx+'" y1="'+(y0+10)+'" x2="'+cx+'" y2="240" stroke="#222" stroke-width="2" opacity=".7"/>');
    }else if(r==="manta"){
    }else{ /* camiseta / blusa: decote redondo */
      o.push('<path d="M'+(cx-24)+' '+(y0-4)+' Q'+cx+' '+(y0+(fem?22:16))+' '+(cx+24)+' '+(y0-4)+' Q'+cx+' '+(y0+6)+' '+(cx-24)+' '+(y0-4)+' Z" fill="'+mixHex(sk.s,"#000",.1)+'"/>');
      o.push('<path d="M'+(cx-24)+' '+(y0-4)+' Q'+cx+' '+(y0+(fem?22:16))+' '+(cx+24)+' '+(y0-4)+'" stroke="'+mixHex(cloth,"#000",.4)+'" stroke-width="2.5" fill="none"/>');
    }
  }
  if(P.mochila){
    o.push('<path d="M'+(cx-sw*.62)+' 200 Q'+(cx-sw*.5)+' 222 '+(cx-sw*.56)+' 240" stroke="#2a2118" stroke-width="9" fill="none" opacity=".9"/>');
    o.push('<path d="M'+(cx+sw*.62)+' 200 Q'+(cx+sw*.5)+' 222 '+(cx+sw*.56)+' 240" stroke="#2a2118" stroke-width="9" fill="none" opacity=".9"/>');
  }
  return o.join("");
}

function nariz(cx,eyeY,noseY,sk,baby,kid){
  var o=[],sc=baby?.65:kid?.82:1;
  var dk=mixHex(sk.s,"#000",.3);
  o.push('<path d="M'+(cx-5)+' '+(eyeY+4)+' Q'+(cx-8)+' '+(noseY-12)+' '+(cx-9*sc)+' '+(noseY-3)+'" stroke="'+dk+'" stroke-width="3.4" fill="none" opacity=".22" filter="url(#b1)"/>');
  o.push('<path d="M'+(cx+5)+' '+(eyeY+4)+' Q'+(cx+8)+' '+(noseY-12)+' '+(cx+9*sc)+' '+(noseY-3)+'" stroke="'+dk+'" stroke-width="3.6" fill="none" opacity=".3" filter="url(#b1)"/>');
  o.push('<path d="M'+cx+' '+(eyeY+8)+' L'+cx+' '+(noseY-8)+'" stroke="'+sk.h+'" stroke-width="3" opacity=".42" filter="url(#b1)"/>');
  o.push('<ellipse cx="'+cx+'" cy="'+(noseY-3)+'" rx="'+(6*sc)+'" ry="'+(5*sc)+'" fill="'+sk.h+'" opacity=".5" filter="url(#b1)"/>');
  o.push('<ellipse cx="'+(cx-7*sc)+'" cy="'+(noseY+0.5)+'" rx="'+(5*sc)+'" ry="'+(4*sc)+'" fill="'+sk.s+'" opacity=".45" filter="url(#b05)"/><ellipse cx="'+(cx+7*sc)+'" cy="'+(noseY+0.5)+'" rx="'+(5*sc)+'" ry="'+(4*sc)+'" fill="'+sk.s+'" opacity=".5" filter="url(#b05)"/>');
  o.push('<ellipse cx="'+(cx-3.6*sc)+'" cy="'+(noseY+2.6)+'" rx="'+(2.5*sc)+'" ry="1.5" fill="#1d0c06" opacity=".72"/><ellipse cx="'+(cx+3.6*sc)+'" cy="'+(noseY+2.6)+'" rx="'+(2.5*sc)+'" ry="1.5" fill="#1d0c06" opacity=".72"/>');
  o.push('<ellipse cx="'+cx+'" cy="'+(noseY+9)+'" rx="'+(8*sc)+'" ry="2.6" fill="#000" opacity=".22" filter="url(#b1)"/>');
  return o.join("");
}

function olho(x,y,sc,sk,humor,side,age){
  var o=[],w=8.6*sc,hh=(humor==="cansado"?4.0:4.7)*sc;
  var shape='M'+(x-w)+' '+y+' Q'+(x-w*.4)+' '+(y-hh*1.4)+' '+x+' '+(y-hh*1.35)+' Q'+(x+w*.6)+' '+(y-hh*1.2)+' '+(x+w)+' '+(y+.4*side)+' Q'+(x+w*.35)+' '+(y+hh*.95)+' '+(x-w*.2)+' '+(y+hh*.9)+' Q'+(x-w*.7)+' '+(y+hh*.6)+' '+(x-w)+' '+y+' Z';
  var id="e"+(side>0?"r":"l");
  o.push('<clipPath id="'+id+'"><path d="'+shape+'"/></clipPath>');
  o.push('<path d="'+shape+'" fill="url(#sc)"/>');
  var ix=x+(side*0.3),ir=3.9*sc;
  o.push('<g clip-path="url(#'+id+')">'
    +'<circle cx="'+ix+'" cy="'+(y-.2)+'" r="'+ir+'" fill="url(#iris)"/>'
    +'<circle cx="'+ix+'" cy="'+(y-.2)+'" r="'+(ir*.42)+'" fill="#0a0504"/>'
    +'<circle cx="'+(ix-ir*.38)+'" cy="'+(y-ir*.42)+'" r="'+(ir*.26)+'" fill="#fff" opacity=".92"/>'
    +'<ellipse cx="'+x+'" cy="'+(y-hh*.9)+'" rx="'+(w*1.1)+'" ry="'+(hh*.8)+'" fill="#000" opacity=".33" filter="url(#b05)"/>'
    +'</g>');
  o.push('<path d="M'+(x-w)+' '+y+' Q'+(x-w*.4)+' '+(y-hh*1.4)+' '+x+' '+(y-hh*1.35)+' Q'+(x+w*.6)+' '+(y-hh*1.2)+' '+(x+w)+' '+(y+.4*side)+'" stroke="#150a06" stroke-width="'+(1.9*sc)+'" fill="none" stroke-linecap="round"/>');
  o.push('<path d="M'+(x+w*side*.4)+' '+(y-hh*1.15)+' L'+(x+w*side*1.15)+' '+(y-hh*.3)+'" stroke="#150a06" stroke-width="1.5" opacity=".8" stroke-linecap="round"/>');
  o.push('<path d="M'+(x-w*.6)+' '+(y+hh*.7)+' Q'+x+' '+(y+hh*1.15)+' '+(x+w*.7)+' '+(y+hh*.6)+'" stroke="'+mixHex(sk.s,"#000",.25)+'" stroke-width=".9" fill="none" opacity=".55"/>');
  o.push('<path d="M'+(x-w*.8)+' '+(y-hh*1.75)+' Q'+x+' '+(y-hh*2.6)+' '+(x+w*.9)+' '+(y-hh*1.8)+'" stroke="'+mixHex(sk.s,"#000",.2)+'" stroke-width="1" fill="none" opacity=".45"/>');
  return o.join("");
}

function sobrancelhas(cx,by,sc,fem,hairC,humor,baby,age,R){
  var o=[],c=mixHex(hairC,"#000",.15),th=baby?1.2:fem?2.0:3.0,op=baby?.35:1;
  var inner=humor==="assustado"?-4:humor==="cansado"?-1.5:0;
  [-1,1].forEach(function(sd){
    var x0=cx+sd*7*sc,x1=cx+sd*28*sc,xm=cx+sd*17*sc;
    var yin=by+1+inner,yout=by+(fem?5:4)+Math.max(0,inner*-.2);
    var yarch=by-(fem?5.5:4.5)+(humor==="assustado"?-2:0);
    var p='M'+x0+' '+yin+' Q'+xm+' '+yarch+' '+x1+' '+yout;
    o.push('<path d="'+p+'" stroke="'+c+'" stroke-width="'+th+'" fill="none" stroke-linecap="round" opacity="'+(.9*op)+'" filter="url(#b05)"/>');
    o.push('<path d="'+p+'" stroke="'+c+'" stroke-width="'+(th*.5)+'" fill="none" stroke-linecap="round" opacity="'+op+'" transform="translate(0,-.8)"/>');
  });
  return o.join("");
}

function boca(cx,my,fem,lipC,sk,humor,baby,kid){
  var o=[],mw=baby?9:kid?11:fem?13:14,dn=humor==="cansado"?1.2:humor==="assustado"?.6:0;
  var up=mixHex(lipC,"#000",.12),lo=mixHex(lipC,"#fff",.08);
  var thick=(fem?1.25:1)*(baby?.8:1);
  o.push('<ellipse cx="'+cx+'" cy="'+(my+5)+'" rx="'+(mw*.75)+'" ry="4.5" fill="#000" opacity=".12" filter="url(#b1)"/>');
  o.push('<path d="M'+(cx-mw)+' '+(my+dn)+' Q'+(cx-mw*.45)+' '+(my-4.6*thick)+' '+cx+' '+(my-3.6*thick)+' Q'+(cx+mw*.45)+' '+(my-4.6*thick)+' '+(cx+mw)+' '+(my+dn)+' Q'+cx+' '+(my+1.2)+' '+(cx-mw)+' '+(my+dn)+' Z" fill="'+up+'"/>');
  o.push('<path d="M'+(cx-mw*.9)+' '+(my+dn+.3)+' Q'+cx+' '+(my+8.6*thick)+' '+(cx+mw*.9)+' '+(my+dn+.3)+' Q'+cx+' '+(my+1.8)+' '+(cx-mw*.9)+' '+(my+dn+.3)+' Z" fill="'+lo+'"/>');
  o.push('<ellipse cx="'+(cx-1)+'" cy="'+(my+4.6*thick)+'" rx="'+(mw*.32)+'" ry="1.2" fill="#fff" opacity=".22"/>');
  o.push('<path d="M'+(cx-mw)+' '+(my+dn)+' Q'+cx+' '+(my+2.2)+' '+(cx+mw)+' '+(my+dn)+'" stroke="#3a1612" stroke-width="1.3" fill="none" opacity=".85" stroke-linecap="round"/>');
  o.push('<path d="M'+(cx-mw-1.5)+' '+(my+dn-.6)+' q-1.5 1.2 -.2 2.6 M'+(cx+mw+1.5)+' '+(my+dn-.6)+' q1.5 1.2 .2 2.6" stroke="'+mixHex(sk.s,"#000",.35)+'" stroke-width="1" fill="none" opacity=".5"/>');
  return o.join("");
}

function rugas(cx,W,eyeY,browY,noseY,mouthY,sk,age){
  var o=[],k=Math.max(0,Math.min(1,(age-28)/38)),c=mixHex(sk.s,"#000",.35);
  if(age<13)return "";
  if(k>0){
    o.push('<path d="M'+(cx-11)+' '+(noseY-4)+' Q'+(cx-17)+' '+(mouthY-8)+' '+(cx-15)+' '+(mouthY+1)+'" stroke="'+c+'" stroke-width="1.6" fill="none" opacity="'+(.05+k*.26)+'" filter="url(#b05)"/>');
    o.push('<path d="M'+(cx+11)+' '+(noseY-4)+' Q'+(cx+17)+' '+(mouthY-8)+' '+(cx+15)+' '+(mouthY+1)+'" stroke="'+c+'" stroke-width="1.6" fill="none" opacity="'+(.05+k*.26)+'" filter="url(#b05)"/>');
  }
  if(k>.35){
    [-1,1].forEach(function(sd){for(var i=0;i<3;i++)o.push('<path d="M'+(cx+sd*(35-i*.5))+' '+(eyeY-2+i*3.4)+' L'+(cx+sd*(41))+' '+(eyeY-5+i*4.6)+'" stroke="'+c+'" stroke-width=".9" opacity="'+(.22*k+.08)+'"/>');});
  }
  if(k>.45){
    for(var j=0;j<3;j++)o.push('<path d="M'+(cx-20)+' '+(browY-11-j*5)+' Q'+cx+' '+(browY-14-j*5)+' '+(cx+20)+' '+(browY-11-j*5)+'" stroke="'+c+'" stroke-width="1" fill="none" opacity="'+(.08+k*.16)+'" filter="url(#b05)"/>');
  }
  return o.join("");
}

function barba(P,cx,W,Wj,chin,my,hc){
  var o=[],cheia=P.barba==="cheia",leve=P.barba==="leve";
  var col=mixHex(hc,"#000",.1);
  var jaw='M'+(cx-W+3)+' '+(my-26)+' C'+(cx-W-1)+' '+(chin-40)+' '+(cx-Wj-5)+' '+(chin-22)+' '+(cx-Wj*.62)+' '+(chin-4)+' Q'+cx+' '+(chin+8)+' '+(cx+Wj*.62)+' '+(chin-4)+' C'+(cx+Wj+5)+' '+(chin-22)+' '+(cx+W+1)+' '+(chin-40)+' '+(cx+W-3)+' '+(my-26)+' Q'+(cx+W*.5)+' '+(my-12)+' '+(cx+16)+' '+(my-8)+' Q'+cx+' '+(my-16)+' '+(cx-16)+' '+(my-8)+' Q'+(cx-W*.5)+' '+(my-12)+' '+(cx-W+3)+' '+(my-26)+' Z';
  if(P.barba){
    o.push('<g mask="url(#bmask)"><path d="'+jaw+'" fill="'+col+'" opacity="'+(cheia?.95:.62)+'" filter="url(#stub)"/></g>');
    if(cheia)o.push('<path d="'+jaw+'" fill="'+col+'" opacity=".35" filter="url(#b05)"/>');
  }
  if(P.bigode||P.barba){
    o.push('<path d="M'+(cx-16)+' '+(my-8)+' Q'+(cx-8)+' '+(my-14)+' '+cx+' '+(my-10)+' Q'+(cx+8)+' '+(my-14)+' '+(cx+16)+' '+(my-8)+' Q'+(cx+8)+' '+(my-6)+' '+cx+' '+(my-6.5)+' Q'+(cx-8)+' '+(my-6)+' '+(cx-16)+' '+(my-8)+' Z" fill="'+col+'" opacity="'+(P.bigode?.92:leve?.5:.85)+'" '+(P.bigode?'filter="url(#b05)"':'filter="url(#stub)"')+'/>');
  }
  return o.join("");
}

function cabeloTras(P,cx,W,top,hc,lo){
  var c=P.cabelo,o=[];
  if(c==="longo"){
    o.push('<path d="M'+(cx-W-6)+' 96 C'+(cx-W-14)+' 150 '+(cx-W-12)+' 200 '+(cx-W-4)+' 232 L'+(cx+W+4)+' 232 C'+(cx+W+12)+' 200 '+(cx+W+14)+' 150 '+(cx+W+6)+' 96 Z" fill="'+lo+'"/>');
    o.push('<path d="M'+(cx-W-6)+' 96 C'+(cx-W-14)+' 150 '+(cx-W-12)+' 200 '+(cx-W-4)+' 232" stroke="'+hc+'" stroke-width="5" fill="none" opacity=".6" filter="url(#b05)"/>');
  }else if(c==="preso"){
    o.push('<ellipse cx="'+cx+'" cy="'+(top-6)+'" rx="'+(W*.5)+'" ry="13" fill="'+lo+'"/><ellipse cx="'+cx+'" cy="'+(top-8)+'" rx="'+(W*.4)+'" ry="10" fill="'+hc+'" opacity=".9"/>');
  }else if(c==="curto_f"){
    o.push('<path d="M'+(cx-W-7)+' 90 C'+(cx-W-13)+' 128 '+(cx-W-8)+' 150 '+(cx-W+2)+' 156 Q'+cx+' 162 '+(cx+W-2)+' 156 C'+(cx+W+8)+' 150 '+(cx+W+13)+' 128 '+(cx+W+7)+' 90 Z" fill="'+hc+'"/>');
  }else if(c==="lenco"){
    o.push('<path d="M'+(cx-W-8)+' 86 C'+(cx-W-14)+' 130 '+(cx-W-6)+' 168 '+(cx-W+6)+' 178 L'+(cx+W-6)+' 178 C'+(cx+W+6)+' 168 '+(cx+W+14)+' 130 '+(cx+W+8)+' 86 Z" fill="#7d5a8a"/>');
  }
  return o.join("");
}

function cabeloFrente(P,cx,W,top,eyeY,hc,hi,lo,age){
  var c=P.cabelo,o=[];
  if(c==="nenhum"){
    o.push('<path d="M'+(cx-W-4)+' '+(eyeY-8)+' C'+(cx-W-6)+' '+(top-2)+' '+(cx-W*.5)+' '+(top-12)+' '+cx+' '+(top-12)+' C'+(cx+W*.5)+' '+(top-12)+' '+(cx+W+6)+' '+(top-2)+' '+(cx+W+4)+' '+(eyeY-8)+' C'+(cx+W*.6)+' '+(top+14)+' '+(cx-W*.6)+' '+(top+14)+' '+(cx-W-4)+' '+(eyeY-8)+' Z" fill="#e9dcb6"/>');
    o.push('<path d="M'+(cx-W-2)+' '+(eyeY-12)+' C'+(cx-W*.5)+' '+(top+16)+' '+(cx+W*.5)+' '+(top+16)+' '+(cx+W+2)+' '+(eyeY-12)+'" stroke="#b9a878" stroke-width="3" fill="none" opacity=".7"/>');
    o.push('<ellipse cx="'+(cx-W*.3)+'" cy="'+(top-2)+'" rx="'+(W*.4)+'" ry="6" fill="#fff" opacity=".3" filter="url(#b1)"/>');
    return o.join("");
  }
  var L=cx-W,Rr=cx+W,hl=top+((P.g==="m")?25:30);
  if(c==="lenco"){
    o.push('<path d="M'+(L-8)+' 90 C'+(L-6)+' 52 '+(cx-W*.5)+' '+(top-8)+' '+cx+' '+(top-8)+' C'+(cx+W*.5)+' '+(top-8)+' '+(Rr+6)+' 52 '+(Rr+8)+' 90 C'+(Rr-2)+' 82 '+(cx+W*.6)+' '+(hl-4)+' '+cx+' '+(hl-8)+' C'+(cx-W*.6)+' '+(hl-4)+' '+(L+2)+' 82 '+(L-8)+' 90 Z" fill="#7d5a8a"/>');
    o.push('<path d="M'+(L-6)+' 78 Q'+cx+' '+(hl-14)+' '+(Rr+6)+' 78" stroke="#e8a317" stroke-width="3" fill="none" opacity=".85"/>');
    o.push('<path d="M'+(L+6)+' 90 Q'+cx+' '+(hl-2)+' '+(Rr-6)+' 90" stroke="'+hc+'" stroke-width="3" fill="none" opacity=".35" filter="url(#b05)"/>');
    return o.join("");
  }
  if(c==="rarefeito"){
    o.push('<path d="M'+(L-1)+' '+(eyeY-6)+' C'+(L-4)+' '+(eyeY-26)+' '+(L+2)+' '+(eyeY-34)+' '+(L+7)+' '+(eyeY-34)+' C'+(L+3)+' '+(eyeY-18)+' '+(L+4)+' '+(eyeY-6)+' '+(L+4)+' '+(eyeY+8)+' Z" fill="'+hc+'" filter="url(#b05)"/>');
    o.push('<path d="M'+(Rr+1)+' '+(eyeY-6)+' C'+(Rr+4)+' '+(eyeY-26)+' '+(Rr-2)+' '+(eyeY-34)+' '+(Rr-7)+' '+(eyeY-34)+' C'+(Rr-3)+' '+(eyeY-18)+' '+(Rr-4)+' '+(eyeY-6)+' '+(Rr-4)+' '+(eyeY+8)+' Z" fill="'+hc+'" filter="url(#b05)"/>');
    o.push('<path d="M'+(cx-W*.55)+' '+(top+16)+' Q'+cx+' '+(top+2)+' '+(cx+W*.55)+' '+(top+16)+' Q'+cx+' '+(top+10)+' '+(cx-W*.55)+' '+(top+16)+' Z" fill="'+hc+'" opacity=".5" filter="url(#b05)"/>');
    o.push('<ellipse cx="'+(cx-W*.25)+'" cy="'+(top+14)+'" rx="'+(W*.35)+'" ry="9" fill="#fff" opacity=".2" filter="url(#b1)"/>');
    return o.join("");
  }
  var cap='M'+(L-3)+' 98 C'+(L-6)+' 60 '+(cx-W*.65)+' '+(top-9)+' '+cx+' '+(top-9)+' C'+(cx+W*.65)+' '+(top-9)+' '+(Rr+6)+' 60 '+(Rr+3)+' 98'
   +' C'+(Rr+1)+' 90 '+(Rr-3)+' 80 '+(cx+W*.62)+' '+(hl+2)
   +' C'+(cx+W*.4)+' '+(hl-8)+' '+(cx+W*.1)+' '+(hl-6)+' '+(cx-W*.12)+' '+(hl+2)
   +' C'+(cx-W*.4)+' '+(hl-8)+' '+(cx-W*.72)+' '+(hl-2)+' '+(L-1)+' 98 Z';
  if(c==="lateral"||c==="curto"||c==="longo"||c==="curto_f"||c==="preso"||c==="ondulado"||!c){
    if(c==="ondulado"){
      for(var i=0;i<9;i++){var a=Math.PI*(1.02+i*.12);o.push('<circle cx="'+(cx+Math.cos(a)*(W+2))+'" cy="'+(98+Math.sin(a)*(W+30))+'" r="'+(13+((i*7)%4))+'" fill="'+hc+'"/>');}
    }
    o.push('<path d="'+cap+'" fill="url(#hair)" filter="url(#b05)"/>');
    /* linha do cabelo suave */
    o.push('<path d="M'+(L+2)+' 96 C'+(cx-W*.7)+' '+(hl-1)+' '+(cx-W*.4)+' '+(hl-8)+' '+(cx-W*.12)+' '+(hl+2)+' C'+(cx+W*.1)+' '+(hl-6)+' '+(cx+W*.4)+' '+(hl-8)+' '+(Rr-2)+' 96" stroke="'+hc+'" stroke-width="3.2" fill="none" opacity=".55" filter="url(#b05)"/>');
    /* fios */
    o.push('<clipPath id="capc"><path d="'+cap+'"/></clipPath><g clip-path="url(#capc)">');
    var n=c==="ondulado"?14:11;
    for(var k=0;k<n;k++){
      var t=k/(n-1),x0=cx+(t-.5)*W*1.5,y0=hl-6+Math.abs(t-.5)*14;
      var x1=cx+(t-.5)*W*2.3,y1=top-4+Math.abs(t-.5)*30;
      o.push('<path d="M'+x0+' '+y0+' Q'+((x0+x1)/2+(t<.5?-3:3))+' '+((y0+y1)/2-6)+' '+x1+' '+y1+'" stroke="'+(k%3===0?hi:lo)+'" stroke-width=".9" fill="none" opacity="'+(k%3===0?.4:.28)+'"/>');
    }
    o.push('<ellipse cx="'+(cx-W*.3)+'" cy="'+(top+2)+'" rx="'+(W*.55)+'" ry="8" fill="#fff" opacity=".2" filter="url(#b1)"/></g>');
    if(c==="longo"||c==="curto_f"){
      o.push('<path d="M'+(L-3)+' 98 C'+(L-8)+' 130 '+(L-5)+' 160 '+(L-2)+' 176" stroke="'+hc+'" stroke-width="9" fill="none" opacity=".92" stroke-linecap="round"/>');
      o.push('<path d="M'+(Rr+3)+' 98 C'+(Rr+8)+' 130 '+(Rr+5)+' 160 '+(Rr+2)+' 176" stroke="'+hc+'" stroke-width="9" fill="none" opacity=".92" stroke-linecap="round"/>');
    }
  }
  return o.join("");
}

/* v19 · RETRATO EDITORIAL: ilustração semirrealista com proporções corretas, luz suave e poucos detalhes */
// Estilo de retrato usado no jogo (v19): ilustração semirrealista com luz suave.
function retratoEditorial(p,w,h){
  var P=PERFIL[p.nome_base]||perfilAuto(p.seed),s=p.seed;
  function R(n){return rng(s,n+900);}
  var fem=P.g==="f",age=P.age,baby=age<2,kid=age>=2&&age<13,teen=age>=13&&age<19;
  var sk=PELES[P.pele==null?2:P.pele];
  var skin=sk.b,skS=mixHex(sk.s,"#2a1208",.12),skH=mixHex(sk.h,"#ffffff",.12),skM=mixHex(sk.b,sk.s,.5);
  var hb=CABELOS[Math.floor(R(2)*CABELOS.length)];
  var hc=mixHex(hb,"#c9c4bc",Math.max(0,Math.min(1,(age-42)/28))*.9),hcL=mixHex(hc,"#ffffff",.22),hcD=mixHex(hc,"#000000",.35);
  var cl=(fem?ROUPAS_F:ROUPAS_M)[Math.floor(R(4)*6)],clD=mixHex(cl,"#000000",.3),clL=mixHex(cl,"#ffffff",.14);
  var bgs=[["#d9cdb4","#b7a98a"],["#b9c7cc","#8fa4ab"],["#cdb7a6","#a98f7b"],["#bcc5b0","#97a58a"]][Math.floor(R(6)*4)];
  var humor=P.humor||(R(5)>.55?"cansado":"neutro");
  var hs=P.cabelo,r=P.roupa;
  /* escala da cabeça por faixa etária */
  var sc=baby?1.12:kid?1.05:teen?1:1, cx=100;
  var HW=(baby?44:kid?40:fem?36:39), top=baby?60:58, chin=baby?166:kid?164:fem?167:169;
  var ey=baby?118:kid?116:teen?109:108, ex=baby?16:kid?15.5:17;
  var u='e'+(s%997);
  var d=[];
  d.push('<defs><linearGradient id="bg'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+bgs[0]+'"/><stop offset="1" stop-color="'+bgs[1]+'"/></linearGradient>'
   +'<filter id="bl'+u+'"><feGaussianBlur stdDeviation="3.2"/></filter><filter id="bs'+u+'"><feGaussianBlur stdDeviation="1.2"/></filter>'
   +'<filter id="gr'+u+'"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="'+(s%50)+'"/><feColorMatrix type="matrix" values="0 0 0 0 .3 0 0 0 0 .25 0 0 0 0 .2 0 0 0 .12 0"/></filter>'
   +'<radialGradient id="vg'+u+'" cx=".5" cy=".42" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a1208" stop-opacity=".38"/></radialGradient></defs>');
  d.push('<rect width="200" height="240" fill="url(#bg'+u+')"/>');
  /* cabelo de trás */
  if(hs==="longo")d.push('<path d="M58 108 C48 150 50 196 46 232 L154 232 C150 196 152 150 142 108 Z" fill="'+hcD+'"/>');
  if(hs==="curto_f")d.push('<path d="M57 106 C50 138 54 160 62 168 L138 168 C146 160 150 138 143 106 Z" fill="'+hcD+'"/>');
  if(hs==="lenco")d.push('<path d="M54 100 C46 150 58 186 76 196 L124 196 C142 186 154 150 146 100 Z" fill="#6f5380"/>');
  /* tronco */
  var sw=kid||baby?58:fem?66:76, by=baby?190:196;
  if(baby){d.push('<path d="M14 240 C24 206 62 192 100 192 C138 192 176 206 186 240Z" fill="#e8dcbd"/><path d="M50 205 Q100 224 150 205" stroke="#c9b98f" stroke-width="3" fill="none"/>');}
  else{
    var bc=r==="manta_wayuu"?"#a8382b":cl;
    d.push('<path d="M'+(cx-sw-26)+' 240 C'+(cx-sw-22)+' 212 '+(cx-sw+8)+' 204 '+(cx-30)+' 198 L'+(cx+30)+' 198 C'+(cx+sw-8)+' 204 '+(cx+sw+22)+' 212 '+(cx+sw+26)+' 240Z" fill="'+bc+'"/>');
    d.push('<path d="M'+(cx+8)+' 200 C'+(cx+sw*.7)+' 204 '+(cx+sw+22)+' 214 '+(cx+sw+26)+' 240 L'+(cx+22)+' 240Z" fill="#000" opacity=".16"/>');
    d.push('<path d="M'+(cx-sw-26)+' 240 C'+(cx-sw-22)+' 214 '+(cx-sw+4)+' 206 '+(cx-sw*.5)+' 202 L'+(cx-sw*.5)+' 240Z" fill="#fff" opacity=".07"/>');
    if(r==="manta_wayuu"){d.push('<rect x="38" y="222" width="124" height="4" fill="#d89a1a"/><rect x="38" y="230" width="124" height="4" fill="#2c5aa0"/>');}
    if(r==="camisa"||r==="polo")d.push('<path d="M'+(cx-22)+' 196 L'+cx+' 222 L'+(cx-34)+' 214Z" fill="#ece7db"/><path d="M'+(cx+22)+' 196 L'+cx+' 222 L'+(cx+34)+' 214Z" fill="#d6d0c2"/>');
    if(r==="moletom")d.push('<path d="M'+(cx-34)+' 198 Q'+cx+' 176 '+(cx+34)+' 198 Q'+(cx+18)+' 216 '+cx+' 218 Q'+(cx-18)+' 216 '+(cx-34)+' 198Z" fill="'+clD+'"/><rect x="'+(cx-10)+'" y="212" width="2.4" height="24" rx="1.2" fill="#eee6d6"/><rect x="'+(cx+7)+'" y="212" width="2.4" height="24" rx="1.2" fill="#eee6d6"/>');
    if(r==="jaqueta")d.push('<path d="M'+(cx-28)+' 198 L'+(cx-6)+' 240 L'+(cx+6)+' 240 L'+(cx+28)+' 198 Q'+cx+' 212 '+(cx-28)+' 198Z" fill="#d8d1c1"/>');
    if(P.mochila)d.push('<path d="M'+(cx-sw*.62)+' 206 L'+(cx-sw*.62+9)+' 206 L'+(cx-sw*.62+14)+' 240 L'+(cx-sw*.62+2)+' 240Z" fill="#2a2118"/><path d="M'+(cx+sw*.62)+' 206 L'+(cx+sw*.62-9)+' 206 L'+(cx+sw*.62-14)+' 240 L'+(cx+sw*.62-2)+' 240Z" fill="#2a2118"/>');
    /* pescoço */
    d.push('<path d="M'+(cx-15)+' 150 L'+(cx+15)+' 150 C'+(cx+16)+' 176 '+(cx+22)+' 192 '+(cx+30)+' 200 L'+(cx-30)+' 200 C'+(cx-22)+' 192 '+(cx-16)+' 176 '+(cx-15)+' 150Z" fill="'+skM+'"/>');
    d.push('<path d="M'+(cx+2)+' 150 L'+(cx+15)+' 150 C'+(cx+16)+' 176 '+(cx+22)+' 192 '+(cx+30)+' 200 L'+(cx+6)+' 200Z" fill="'+skS+'" opacity=".55"/>');
    if(r==="camiseta"||r==="blusa"||!r)d.push('<path d="M'+(cx-30)+' 198 Q'+cx+' '+(fem?226:216)+' '+(cx+30)+' 198 Q'+cx+' 204 '+(cx-30)+' 198Z" fill="'+skM+'"/>');
  }
  /* sombra do queixo no pescoço */
  d.push('<ellipse cx="'+cx+'" cy="'+(chin+6)+'" rx="'+(HW*.62)+'" ry="9" fill="'+skS+'" opacity=".7" filter="url(#bl'+u+')"/>');
  /* orelhas */
  d.push('<ellipse cx="'+(cx-HW)+'" cy="'+(ey+6)+'" rx="6.4" ry="11" fill="'+skM+'"/><ellipse cx="'+(cx+HW)+'" cy="'+(ey+6)+'" rx="6.4" ry="11" fill="'+skS+'"/>');
  /* cabeça */
  var hp='M'+cx+' '+top+' C'+(cx+HW*.86)+' '+top+' '+(cx+HW+1)+' '+(top+30)+' '+(cx+HW)+' '+(ey+4)+' C'+(cx+HW-1)+' '+(ey+36)+' '+(cx+HW*.5)+' '+(chin-2)+' '+cx+' '+chin+' C'+(cx-HW*.5)+' '+(chin-2)+' '+(cx-HW+1)+' '+(ey+36)+' '+(cx-HW)+' '+(ey+4)+' C'+(cx-HW-1)+' '+(top+30)+' '+(cx-HW*.86)+' '+top+' '+cx+' '+top+'Z';
  d.push('<clipPath id="hp'+u+'"><path d="'+hp+'"/></clipPath><path d="'+hp+'" fill="'+skin+'"/>');
  d.push('<g clip-path="url(#hp'+u+')"><path d="M'+(cx+10)+' '+(top-4)+' C'+(cx+HW*1.4)+' '+(ey-20)+' '+(cx+HW*1.2)+' '+(chin-30)+' '+(cx+8)+' '+(chin+6)+' L'+(cx+HW+20)+' '+(chin+6)+' L'+(cx+HW+20)+' '+(top-4)+'Z" fill="'+skS+'" opacity=".5" filter="url(#bl'+u+')"/>'
   +'<ellipse cx="'+(cx-8)+'" cy="'+(top+22)+'" rx="22" ry="10" fill="'+skH+'" opacity=".5" filter="url(#bl'+u+')"/>'
   +'<ellipse cx="'+(cx-HW*.55)+'" cy="'+(ey+26)+'" rx="10" ry="8" fill="#d0675a" opacity="'+(fem?.2:.12)+'" filter="url(#bl'+u+')"/>'
   +'<ellipse cx="'+(cx+HW*.55)+'" cy="'+(ey+26)+'" rx="10" ry="8" fill="#b04a40" opacity=".12" filter="url(#bl'+u+')"/></g>');
  /* olhos */
  var es=baby?1.2:kid?1.1:1;
  [-1,1].forEach(function(sd){
    var X=cx+sd*ex*es,hw=9.5*es, lid=humor==="cansado"?3.6:humor==="assustado"?6.4:5;
    d.push('<ellipse cx="'+X+'" cy="'+(ey-1)+'" rx="'+(hw+4)+'" ry="6.5" fill="'+skS+'" opacity=".28" filter="url(#bs'+u+')"/>');
    d.push('<clipPath id="ey'+u+(sd<0?'a':'b')+'"><path d="M'+(X-hw)+' '+ey+' Q'+X+' '+(ey-lid*1.7)+' '+(X+hw)+' '+ey+' Q'+X+' '+(ey+lid*.9)+' '+(X-hw)+' '+ey+'Z"/></clipPath>');
    d.push('<path d="M'+(X-hw)+' '+ey+' Q'+X+' '+(ey-lid*1.7)+' '+(X+hw)+' '+ey+' Q'+X+' '+(ey+lid*.9)+' '+(X-hw)+' '+ey+'Z" fill="#ece5d8"/>');
    d.push('<g clip-path="url(#ey'+u+(sd<0?'a':'b')+')"><circle cx="'+(X+sd*-.4)+'" cy="'+(ey-.4)+'" r="'+(4.3*es)+'" fill="#3a2214"/><circle cx="'+(X+sd*-.4)+'" cy="'+(ey-.4)+'" r="'+(2)+'" fill="#120904"/><circle cx="'+(X-1.2)+'" cy="'+(ey-1.6)+'" r="1" fill="#fff" opacity=".8"/><rect x="'+(X-hw)+'" y="'+(ey-lid*1.9)+'" width="'+(hw*2)+'" height="'+(lid*.9)+'" fill="'+skS+'" opacity=".35"/></g>');
    d.push('<path d="M'+(X-hw-.5)+' '+(ey+.3)+' Q'+X+' '+(ey-lid*1.9)+' '+(X+hw+.5)+' '+(ey+.3)+'" stroke="#241208" stroke-width="'+(fem?2.3:1.9)+'" fill="none" stroke-linecap="round"/>');
    d.push('<path d="M'+(X-hw+2)+' '+(ey+3)+' Q'+X+' '+(ey+5.2)+' '+(X+hw-2)+' '+(ey+3)+'" stroke="'+skS+'" stroke-width="1" fill="none" opacity=".6"/>');
    if(humor==="cansado"||age>45)d.push('<path d="M'+(X-hw+1)+' '+(ey+8)+' Q'+X+' '+(ey+12)+' '+(X+hw-1)+' '+(ey+8)+'" stroke="'+skS+'" stroke-width="2" fill="none" opacity=".35" filter="url(#bs'+u+')"/>');
    var bo=humor==="assustado"?4:0, bt=baby?1.4:fem?3:4.4, by=ey-15-bo;
    if(!baby)d.push('<path d="M'+(X-hw-1)+' '+(by+(sd<0?3.5:1.5)+(humor==="cansado"?1.5:0))+' Q'+(X+sd*1)+' '+(by-3.2)+' '+(X+hw+2)+' '+(by+(sd<0?1.5:3.5)-(humor==="assustado"?2:0))+'" stroke="'+hc+'" stroke-width="'+bt+'" fill="none" stroke-linecap="round"/>');
  });
  /* nariz */
  var ny=ey+22;
  d.push('<path d="M'+(cx+3)+' '+(ey-2)+' Q'+(cx+6)+' '+(ny-6)+' '+(cx+8)+' '+(ny+3)+' Q'+cx+' '+(ny+9)+' '+(cx-8)+' '+(ny+3)+' Q'+(cx-5)+' '+(ny+1)+' '+(cx-3)+' '+(ny-4)+' Q'+(cx+1)+' '+(ey+8)+' '+(cx+3)+' '+(ey-2)+'Z" fill="'+skS+'" opacity=".38" filter="url(#bs'+u+')"/>');
  d.push('<path d="M'+(cx-7)+' '+(ny+3)+' Q'+(cx-4)+' '+(ny+6)+' '+(cx-1)+' '+(ny+4)+' M'+(cx+1)+' '+(ny+4)+' Q'+(cx+4)+' '+(ny+6)+' '+(cx+7)+' '+(ny+3)+'" stroke="'+mixHex(skS,"#000000",.35)+'" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>');
  d.push('<ellipse cx="'+(cx-3.4)+'" cy="'+(ny+5)+'" rx="1.5" ry="1" fill="#2a1208" opacity=".6"/><ellipse cx="'+(cx+3.4)+'" cy="'+(ny+5)+'" rx="1.5" ry="1" fill="#2a1208" opacity=".6"/>');
  /* boca */
  var my=ny+17+(baby?-2:0), mw=fem?11.5:12.5, lipC=mixHex(skin,fem?"#8d2f3b":"#6a3028",.55);
  var dn=humor==="cansado"?2.2:humor==="assustado"?.4:-.6;
  d.push('<path d="M'+(cx-mw)+' '+my+' Q'+(cx-mw*.5)+' '+(my-4.2)+' '+cx+' '+(my-2.6)+' Q'+(cx+mw*.5)+' '+(my-4.2)+' '+(cx+mw)+' '+my+' Q'+cx+' '+(my+1.4+dn*.3)+' '+(cx-mw)+' '+my+'Z" fill="'+mixHex(lipC,"#000000",.08)+'"/>');
  d.push('<path d="M'+(cx-mw)+' '+my+' Q'+cx+' '+(my+1.6+dn*.3)+' '+(cx+mw)+' '+my+' Q'+(cx+mw*.6)+' '+(my+(fem?7:5.6)+dn*.4)+' '+cx+' '+(my+(fem?7.4:5.8)+dn*.4)+' Q'+(cx-mw*.6)+' '+(my+(fem?7:5.6)+dn*.4)+' '+(cx-mw)+' '+my+'Z" fill="'+lipC+'"/>');
  d.push('<path d="M'+(cx-mw-.5)+' '+my+' Q'+cx+' '+(my+1.8)+' '+(cx+mw+.5)+' '+my+'" stroke="'+mixHex(lipC,"#000000",.55)+'" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
  d.push('<ellipse cx="'+(cx-1)+'" cy="'+(my+3.2)+'" rx="4" ry="1" fill="#fff" opacity=".16"/>');
  d.push('<path d="M'+(cx-5)+' '+(my+(fem?10:9))+' Q'+cx+' '+(my+(fem?12.5:11.5))+' '+(cx+5)+' '+(my+(fem?10:9))+'" stroke="'+skS+'" stroke-width="2" fill="none" opacity=".3" filter="url(#bs'+u+')"/>');
  if(age>48&&!baby)d.push('<path d="M'+(cx-HW*.52)+' '+(ey+20)+' q-4 11 -1 22 M'+(cx+HW*.52)+' '+(ey+20)+' q4 11 1 22 M'+(cx-14)+' '+(top+18)+' q14 -4 28 0" stroke="'+skS+'" stroke-width="1.5" fill="none" opacity=".45"/>');
  /* barba */
  var bcol=mixHex(hc,"#000000",.1);
  if(P.barba==="cheia"||P.barba==="leve"){
    var op=P.barba==="cheia"?.88:.34;
    d.push('<g clip-path="url(#hp'+u+')"><path d="M'+(cx-HW-2)+' '+(ey+12)+' C'+(cx-HW+4)+' '+(ey+20)+' '+(cx-22)+' '+(my-6)+' '+(cx-15)+' '+(my-5)+' Q'+cx+' '+(my-10)+' '+(cx+15)+' '+(my-5)+' C'+(cx+22)+' '+(my-6)+' '+(cx+HW-4)+' '+(ey+20)+' '+(cx+HW+2)+' '+(ey+12)+' L'+(cx+HW+4)+' '+(chin+8)+' L'+(cx-HW-4)+' '+(chin+8)+'Z" fill="'+bcol+'" opacity="'+op+'"/>'
     +(P.barba==="cheia"?'<path d="M'+(cx-mw-1)+' '+my+' Q'+cx+' '+(my+2)+' '+(cx+mw+1)+' '+my+' Q'+cx+' '+(my+7)+' '+(cx-mw-1)+' '+my+'Z" fill="'+lipC+'"/>':'')+'</g>');
  }
  if(P.bigode||P.barba==="cheia")d.push('<path d="M'+(cx-15)+' '+(my-5)+' Q'+(cx-7)+' '+(my-13)+' '+cx+' '+(my-8)+' Q'+(cx+7)+' '+(my-13)+' '+(cx+15)+' '+(my-5)+' Q'+(cx+8)+' '+(my-6)+' '+cx+' '+(my-5)+' Q'+(cx-8)+' '+(my-6)+' '+(cx-15)+' '+(my-5)+'Z" fill="'+bcol+'"/>');
  /* cabelo da frente */
  var hl=function(path){d.push('<path d="'+path+'" fill="'+hc+'"/>');};
  function brilho(x0,y0,x1,y1,x2,y2){d.push('<path d="M'+x0+' '+y0+' Q'+x1+' '+y1+' '+x2+' '+y2+'" stroke="'+hcL+'" stroke-width="5" fill="none" stroke-linecap="round" opacity=".38" filter="url(#bs'+u+')"/>');}
  if(baby){hl('M'+(cx-HW-1)+' '+(ey-12)+' C'+(cx-HW)+' '+(top-4)+' '+(cx-14)+' '+(top-12)+' '+cx+' '+(top-10)+' C'+(cx+14)+' '+(top-12)+' '+(cx+HW)+' '+(top-4)+' '+(cx+HW+1)+' '+(ey-12)+' C'+(cx+HW*.6)+' '+(top+14)+' '+(cx-HW*.6)+' '+(top+14)+' '+(cx-HW-1)+' '+(ey-12)+'Z');d.push('<path d="M'+(cx-HW)+' '+(top+6)+' Q'+cx+' '+(top-8)+' '+(cx+HW)+' '+(top+6)+'" stroke="#fff" stroke-width="3" fill="none" opacity=".3"/>');}
  else if(hs==="rarefeito"){hl('M'+(cx-HW-3)+' '+(ey+2)+' C'+(cx-HW-6)+' '+(ey-26)+' '+(cx-HW+2)+' '+(ey-38)+' '+(cx-HW+10)+' '+(ey-40)+' C'+(cx-HW+4)+' '+(ey-24)+' '+(cx-HW+5)+' '+(ey-8)+' '+(cx-HW+4)+' '+(ey+8)+'Z');hl('M'+(cx+HW+3)+' '+(ey+2)+' C'+(cx+HW+6)+' '+(ey-26)+' '+(cx+HW-2)+' '+(ey-38)+' '+(cx+HW-10)+' '+(ey-40)+' C'+(cx+HW-4)+' '+(ey-24)+' '+(cx+HW-5)+' '+(ey-8)+' '+(cx+HW-4)+' '+(ey+8)+'Z');}
  else if(hs==="lenco"){hl('M'+(cx-HW-10)+' 104 C'+(cx-HW-10)+' 50 '+(cx-HW*.4)+' '+(top-14)+' '+cx+' '+(top-14)+' C'+(cx+HW*.4)+' '+(top-14)+' '+(cx+HW+10)+' 50 '+(cx+HW+10)+' 104 C'+(cx+HW+4)+' 90 '+(cx+HW*.5)+' '+(top+22)+' '+cx+' '+(top+20)+' C'+(cx-HW*.5)+' '+(top+22)+' '+(cx-HW-4)+' 90 '+(cx-HW-10)+' 104Z');d.push('<path d="M'+(cx-HW-6)+' 84 Q'+cx+' '+(top+12)+' '+(cx+HW+6)+' 84" stroke="#d89a1a" stroke-width="4" fill="none"/>');d.forEach(function(){});}
  else{
    var gap=(P.g==="m")?25:30, hy=top+gap;
    var cap='M'+(cx-HW-3)+' '+(ey+4)+' C'+(cx-HW-8)+' 62 '+(cx-HW*.55)+' '+(top-12)+' '+cx+' '+(top-12)+' C'+(cx+HW*.55)+' '+(top-12)+' '+(cx+HW+8)+' 62 '+(cx+HW+3)+' '+(ey+4)+' C'+(cx+HW)+' '+(ey-12)+' '+(cx+HW-2)+' '+(hy+10)+' '+(cx+HW*.55)+' '+(hy+3)+' C'+(cx+HW*.3)+' '+(hy-6)+' '+(cx+HW*.05)+' '+(hy-3)+' '+(cx-HW*.15)+' '+(hy+3)+' C'+(cx-HW*.4)+' '+(hy-6)+' '+(cx-HW*.75)+' '+(hy+2)+' '+(cx-HW+1)+' '+(ey-6)+'Z';
    if(hs==="ondulado")for(var i=0;i<8;i++){var a=Math.PI*(1.04+i*.134);d.push('<circle cx="'+(cx+Math.cos(a)*(HW+3))+'" cy="'+(96+Math.sin(a)*(HW+28))+'" r="'+(13+((i*5)%4))+'" fill="'+hc+'"/>');}
    if(hs==="preso")d.push('<circle cx="'+cx+'" cy="'+(top-17)+'" r="13" fill="'+hc+'"/>');
    hl(cap);brilho(cx-HW*.7,top-1,cx-HW*.2,top-11,cx+HW*.35,top-4);
    if(hs==="longo"||hs==="curto_f"){d.push('<path d="M'+(cx-HW-3)+' '+(ey+4)+' Q'+(cx-HW-8)+' '+(ey+36)+' '+(cx-HW-3)+' '+(hs==="longo"?190:166)+'" stroke="'+hc+'" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M'+(cx+HW+3)+' '+(ey+4)+' Q'+(cx+HW+8)+' '+(ey+36)+' '+(cx+HW+3)+' '+(hs==="longo"?190:166)+'" stroke="'+hcD+'" stroke-width="13" fill="none" stroke-linecap="round"/>');}
  }
  if(P.oculos)d.push('<g fill="#dfe8ee" fill-opacity=".14" stroke="#1d1d1f" stroke-width="2.6"><rect x="'+(cx-ex*es-14)+'" y="'+(ey-9)+'" width="28" height="19" rx="7"/><rect x="'+(cx+ex*es-14)+'" y="'+(ey-9)+'" width="28" height="19" rx="7"/><path d="M'+(cx-ex*es+14)+' '+(ey-2)+' Q'+cx+' '+(ey-6)+' '+(cx+ex*es-14)+' '+(ey-2)+'" fill="none"/></g>');
  d.push('<rect width="200" height="240" fill="url(#vg'+u+')"/><rect width="200" height="240" filter="url(#gr'+u+')"/>');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="14 30 172 210" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice">'+d.join("")+'</svg>';
}

/* acabamentos sobre o editorial */
function _fxE(p,w,h,id,filt,over){
  var svg=retratoEditorial(p,w,h),vb=svg.match(/viewBox="([^"]+)"/)[1];
  var inner=svg.replace(/^<svg[^>]*>/,"").replace(/<\/svg>$/,"");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice"><defs>'+filt+'</defs><g filter="url(#'+id+')">'+inner+'</g>'+(over||"")+'</svg>';
}
function retratoEdLapis(p,w,h){
  var f='<filter id="el" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".3 .55 .15 0 0 .3 .55 .15 0 0 .3 .55 .15 0 0 0 0 0 1 0"/><feComponentTransfer result="t"><feFuncR type="gamma" amplitude="1.1" exponent="1.35" offset="0"/><feFuncG type="gamma" amplitude="1.1" exponent="1.35" offset="0"/><feFuncB type="gamma" amplitude="1.1" exponent="1.35" offset="0"/></feComponentTransfer><feTurbulence type="fractalNoise" baseFrequency=".6 .95" numOctaves="3" seed="9" result="g"/><feComposite in="t" in2="g" operator="arithmetic" k1="0" k2="1" k3=".3" k4="-.15"/><feColorMatrix type="matrix" values=".82 0 0 0 .17 0 .78 0 0 .16 0 0 .68 0 .13 0 0 0 1 0"/></filter>';
  return _fxE(p,w,h,"el",f);
}
function retratoEdPintura(p,w,h){
  var f='<filter id="ep" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="3" result="d"/><feDisplacementMap in="SourceGraphic" in2="d" scale="5" xChannelSelector="R" yChannelSelector="G" result="w"/><feGaussianBlur in="w" stdDeviation=".7" result="b"/><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="7" result="g"/><feComposite in="b" in2="g" operator="arithmetic" k1=".35" k2=".95" k3="0" k4="0"/></filter>';
  return _fxE(p,w,h,"ep",f);
}
function retratoEdNoir(p,w,h){
  var f='<filter id="en" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".3 .55 .15 0 0 .3 .55 .15 0 0 .3 .55 .15 0 0 0 0 0 1 0"/><feComponentTransfer result="t"><feFuncR type="gamma" amplitude="1.2" exponent="1.5" offset="-.03"/><feFuncG type="gamma" amplitude="1.2" exponent="1.5" offset="-.03"/><feFuncB type="gamma" amplitude="1.2" exponent="1.5" offset="-.03"/></feComponentTransfer><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="2" result="g"/><feComposite in="t" in2="g" operator="arithmetic" k1="0" k2="1" k3=".14" k4="-.07"/></filter>';
  var ov='<defs><linearGradient id="enl" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient></defs><rect x="0" y="0" width="200" height="240" fill="url(#enl)"/>';
  return _fxE(p,w,h,"en",f,ov);
}

/* v19: estilo J (editorial pintura) é o retrato oficial */
retrato=function(p,w,h){
  var key="J|"+p.nome_base+"|"+p.seed+"|"+w+"x"+h;
  if(_cacheRet[key])return _cacheRet[key];
  var uri="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(retratoEdPintura(p,w,h));
  _cacheRet[key]=uri;return uri;
};


/* ═══════════════════════════════════════════════════════════════
   v20 · CLAREZA: guia no 1º caso · opções escalonadas ·
        contador de marcações · resumo de uma frase
═══════════════════════════════════════════════════════════════ */
// Botão "Nada suspeito": libera o passo 3 sem marcar nenhuma declaração.
function semSinais(){if(!sel)return;sel._pronto=true;var ch=document.querySelector("#tela-caso .ch"),sc=ch?ch.scrollTop:0;renderDetalhe();if(ch)ch.scrollTop=sc;}
var _rdV19=renderDetalhe;
renderDetalhe=function(){
  _rdV19();
  try{guiaV20();}catch(e){}
};
// Guia passo a passo exibido apenas no primeiro caso da partida.
function guiaV20(){
  if(!G||!fila)return;
  fila.forEach(function(q){if(!q.vivo&&!q._cnt){q._cnt=1;G._resTot=(G._resTot||0)+1;}});
  if(!sel)return;
  var p=sel,ex=!!p.verif,nm=nMarcas(p),guiado=(G._resTot||0)<1;
  var hi=gid("hist-content"),de=gid("dec-content");
  if(!hi)return;
  var passo=!ex?1:((nm||p._pronto)?3:2);
  var pb=hi.querySelector(".passos");
  if(pb){pb.querySelectorAll(".passo").forEach(function(el,i){el.classList.toggle("on",passo===i+1);el.classList.toggle("ok",passo>i+1);});}
  /* contador de marcações + saída "nada suspeito" */
  var dica=hi.querySelector(".p-decl .pp-dica");
  if(dica&&ex){
    var c=document.createElement("div");c.className="decl-cnt"+(nm?" tem":"");
    c.innerHTML='<span>🚩 Marcadas: <b>'+nm+'</b></span>'+(nm?'<span class="dc-ok">Pronto: carimbe a decisão →</span>':(p._pronto?'<span class="dc-ok">✔ Sem marcações: carimbe a decisão →</span>':'<button class="dc-btn" onclick="semSinais()">Nada suspeito → ir ao passo 3</button>'));
    dica.insertAdjacentElement("afterend",c);
  }
  /* guia do primeiro caso */
  if(guiado&&pb){
    var txt={
      1:'<b>👉 Passo 1.</b> Clique em qualquer papel <b>🔒 LACRADO</b> (ou aperte <kbd>E</kbd>) para examinar os documentos desta pessoa.',
      2:'<b>👉 Passo 2.</b> Leia as declarações. Clique só nas linhas que parecem <b>sinal de risco</b> (ex.: promessa de emprego sem contrato, documento retido por outra pessoa). Pobreza, sotaque e nervosismo <b>não</b> são sinais. Não viu nada suspeito? Use o botão “Nada suspeito”.',
      3:'<b>👉 Passo 3.</b> Escolha um carimbo à direita: <b>Acolher</b> (dá vaga e abrigo), <b>Encaminhar</b> (sem custo), <b>Trabalho</b> (quem tem qualificação e documentos) ou <b>Denunciar</b> (só se você marcou sinais reais).'
    }[passo];
    var b=document.createElement("div");b.className="guia-bub";b.innerHTML=txt+'<span class="gb-tag">GUIA DO 1º CASO</span>';
    pb.insertAdjacentElement("afterend",b);
    hi.querySelectorAll(".lacre").forEach(function(l){l.classList.toggle("pulsa",passo===1);});
  }
  /* carimbos: opções escalonadas nos 2 primeiros dias */
  if(de){
    var st=de.querySelector(".stamps");
    if(st){
      if(guiado)st.classList.toggle("dim",passo!==3);
      if(guiado&&passo===3)st.classList.add("guia-st");
      if(G.dia<=2){
        var cm=de.querySelector(".stamp.s-estabilizar");if(cm)cm.classList.add("compacto");
        var cd=de.querySelector(".stamp.s-denunciar");
        if(cd){if(nm>0&&p.verif)cd.classList.add("destaque");else cd.classList.add("compacto");}
      }
    }
  }
}
/* resumo de uma frase + detalhes recolhidos */
var _gabV19=gabarito;
gabarito=function(p){
  var det=_gabV19(p);
  if(!det)return "";
  var q=qualMarcas(p),m=metaCaso(p),msg,cls;
  if(q.tot>0){
    if(q.a>=Math.min(2,q.tot)&&q.f===0){msg="✔ Muito bem: você marcou "+q.a+" de "+q.tot+" sinais reais de risco.";cls="ok";}
    else if(q.a>=1){msg="➖ Você marcou "+q.a+" de "+q.tot+" sinais reais"+(q.f?" e "+q.f+" linha(s) que não são crime":"")+". Ainda passou algo batido.";cls="mid";}
    else{msg="✖ Havia "+q.tot+" sinais reais de risco e você não marcou nenhum.";cls="err";}
  }else{
    if(q.f===0){msg="✔ Correto: não havia sinais de crime neste caso.";cls="ok";}
    else{msg="✖ Você marcou "+q.f+" linha(s) que não são sinal de crime. Pobreza e nervosismo não são suspeita.";cls="err";}
  }
  return '<div class="resumo1 '+cls+'">'+msg+'</div><details class="gab-det"><summary>Ver detalhes da conferência</summary>'+det+'</details>';
};

