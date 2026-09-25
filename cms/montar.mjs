// Montador do site UVERGS.
// Lê o que foi cadastrado na Central (pasta conteudo/) e gera o site pronto em public/.
// Roda sozinho na Vercel a cada publicação:  npm run build
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const SAIDA = path.join(RAIZ, 'public');
const CONTEUDO = path.join(RAIZ, 'conteudo');
const FORA = new Set(['public', 'node_modules', '.git', '.github', '.vercel', 'cms', 'conteudo', 'api',
  'package.json', 'package-lock.json', 'vercel.json', 'README.md', 'LEIA-ME.md', '.gitignore']);
const SITE = process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'https://uvergs-kappa.vercel.app');
const WA = '555191665195';
const alertas = [];

let marked = null;
try { ({ marked } = await import('marked')); } catch { /* sem a biblioteca: usa o conversor simples abaixo */ }
// HTML colado no texto aparece como texto, para não quebrar a página
if (marked) marked.use({ renderer: { html: ({ text }) => esc(text) } });

// ---------- utilidades ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const js = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES3 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const p2 = (n) => String(n).padStart(2, '0');
const dia = (n) => (n === 1 ? '1º' : String(n));

function hojeRS() {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(new Date());
}
function partes(ymd) { const [a, m, d] = ymd.slice(0, 10).split('-').map(Number); return { a, m, d }; }
function maisUmDia(ymd) { const { a, m, d } = partes(ymd); const t = new Date(Date.UTC(a, m - 1, d + 1)); return t.toISOString().slice(0, 10); }
function diasEntre(i, f) { const x = partes(i), y = partes(f); return Math.round((Date.UTC(y.a, y.m - 1, y.d) - Date.UTC(x.a, x.m - 1, x.d)) / 864e5) + 1; }

// "6 a 9 de outubro de 2026", "30 de setembro a 2 de outubro de 2026", "19 de maio de 2026"
function quando(ev, comAno = true) {
  const i = partes(ev.inicio), f = partes(ev.fim);
  const ano = comAno ? ` de ${f.a}` : '';
  if (ev.inicio.slice(0, 10) === ev.fim) return `${dia(i.d)} de ${MESES[i.m - 1]}${ano}`;
  if (i.m === f.m && i.a === f.a) return `${dia(i.d)} a ${dia(f.d)} de ${MESES[i.m - 1]}${ano}`;
  return `${dia(i.d)} de ${MESES[i.m - 1]}${i.a !== f.a ? ' de ' + i.a : ''} a ${dia(f.d)} de ${MESES[f.m - 1]}${ano}`;
}
// selo da data no cartão: <b>06–09</b><small>Out</small>
function seloData(ev) {
  const i = partes(ev.inicio), f = partes(ev.fim);
  if (ev.inicio.slice(0, 10) === ev.fim) return `<b>${p2(i.d)}</b><small>${MES3[i.m - 1]}</small>`;
  if (i.m === f.m) return `<b>${p2(i.d)}–${p2(f.d)}</b><small>${MES3[i.m - 1]}</small>`;
  return `<b>${p2(i.d)}–${p2(f.d)}</b><small>${MES3[i.m - 1]}/${MES3[f.m - 1]}</small>`;
}
function curtoForm(ev) {
  const i = partes(ev.inicio), f = partes(ev.fim);
  if (ev.inicio.slice(0, 10) === ev.fim) return `${i.d} ${MES3[i.m - 1].toLowerCase()}`;
  if (i.m === f.m) return `${i.d}–${f.d} ${MES3[i.m - 1].toLowerCase()}`;
  return `${i.d} ${MES3[i.m - 1].toLowerCase()}–${f.d} ${MES3[f.m - 1].toLowerCase()}`;
}
// endereço de imagem ou página, visto de uma página na profundidade "nivel" (0 = raiz)
function url(p, nivel = 0) {
  if (!p) return '';
  if (/^(https?:|mailto:|tel:|#)/.test(p)) return p;
  return '../'.repeat(nivel) + p.replace(/^\/+/, '');
}
const externo = (p) => /^https?:/.test(p || '');
const alvo = (p) => (externo(p) ? ' target="_blank" rel="noopener"' : '');

function markdown(txt) {
  if (!txt) return '';
  if (marked) return marked.parse(txt);
  return txt.split(/\n{2,}/).map((b) => `<p>${esc(b).replace(/\n/g, '<br>')}</p>`).join('\n');
}

function lerPasta(nome) {
  const dir = path.join(CONTEUDO, nome);
  if (!fs.existsSync(dir)) return null;
  const itens = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      d._id = f.replace(/\.json$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
      itens.push(d);
    } catch (e) { alertas.push(`conteudo/${nome}/${f} está com erro e ficou de fora (${e.message})`); }
  }
  return itens;
}
function lerArquivo(nome) {
  const p = path.join(CONTEUDO, nome);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { alertas.push(`conteudo/${nome} está com erro e ficou de fora (${e.message})`); return null; }
}

function trocarHtml(s, nome, novo) {
  const re = new RegExp(`(<!-- cms:${nome} -->)[\\s\\S]*?(<!-- /cms:${nome} -->)`);
  if (!re.test(s)) { alertas.push(`marcação "${nome}" não encontrada; essa parte ficou como estava`); return s; }
  return s.replace(re, (_, a, b) => a + novo + b);
}
function trocarJs(s, nome, novo) {
  const re = new RegExp(`(/\\*cms:${nome}\\*/)[\\s\\S]*?(/\\*/cms:${nome}\\*/)`);
  if (!re.test(s)) { alertas.push(`marcação "${nome}" não encontrada; essa parte ficou como estava`); return s; }
  return s.replace(re, (_, a, b) => a + novo + b);
}

// ---------- 1. copia o site para public/ ----------
fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(SAIDA, { recursive: true });
for (const f of fs.readdirSync(RAIZ)) {
  if (FORA.has(f) || f.startsWith('.')) continue;
  fs.cpSync(path.join(RAIZ, f), path.join(SAIDA, f), { recursive: true });
}

// ---------- 2. lê o conteúdo ----------
const HOJE = hojeRS();
const eventos = (lerPasta('eventos') || []).filter((e) => {
  if (e.publicado === false) return false;
  if (!e.titulo || !/^\d{4}-\d{2}-\d{2}/.test(e.inicio || '')) { alertas.push(`evento "${e._id}" sem nome ou sem data de início; ficou de fora`); return false; }
  if (!e.inicio.includes('T')) e.inicio += 'T08:30';
  e.inicio = e.inicio.slice(0, 16);
  e.fim = (e.fim && /^\d{4}-\d{2}-\d{2}/.test(e.fim) && e.fim.slice(0, 10) >= e.inicio.slice(0, 10)) ? e.fim.slice(0, 10) : e.inicio.slice(0, 10);
  e.av = e.avancado || {};
  e.of = e.oficio || {};
  e.pg = e.av.pagina ? e.av.pagina.replace(/^\/+/, '') : `eventos/${e._id}.html`;
  e.gerar = !e.av.pagina;
  e.passou = e.fim < HOJE;
  e.inicioIso = e.inicio + ':00-03:00';
  return true;
});
const proximos = eventos.filter((e) => !e.passou).sort((a, b) => a.inicio.localeCompare(b.inicio));
const realizados = eventos.filter((e) => e.passou).sort((a, b) => b.inicio.localeCompare(a.inicio) || b.fim.localeCompare(a.fim));
const noticias = lerPasta('noticias');
const galeria = lerArquivo('galeria.json');
const aviso = lerArquivo('aviso.json');

const nomeCurto = (e) => e.nome_curto || e.titulo;
const linkCartao = (e, nivel = 0) => url(e.pg, nivel);
const linkRealizado = (e) => (e.av.link_externo && (e.gerar && !(e.fotos || []).length && !e.programacao) ? e.av.link_externo : url(e.pg));
function agendaDe(e) {
  return {
    t: e.tipo ? `${e.titulo} | ${e.tipo}` : e.titulo,
    s: e.inicio.slice(0, 10).replace(/-/g, ''),
    e: maisUmDia(e.fim).replace(/-/g, ''),
    l: e.local || '',
    d: [e.resumo, e.av.link_externo || `${SITE}/${e.pg}`].filter(Boolean).join(' ')
  };
}
const addcal = (key) => `<details class="addcal" data-cal="${esc(key)}"><summary class="btn btn-line"><svg class="i"><use href="#i-calplus"/></svg>Adicionar à minha agenda</summary><div class="menu"></div></details>`;

// ---------- 3. página inicial ----------
const pIndex = path.join(SAIDA, 'index.html');
let h = fs.readFileSync(pIndex, 'utf8');

// aviso
if (aviso) {
  h = trocarHtml(h, 'aviso', aviso.ativo && aviso.texto
    ? `<div class="aviso-central" role="note" style="background:#F4B400;color:#0A1F44;text-align:center;padding:10px 16px;font-weight:600;font-size:.95rem;line-height:1.4">${esc(aviso.texto)}${aviso.link ? ` <a href="${esc(url(aviso.link))}"${alvo(aviso.link)} style="color:#0A1F44;font-weight:800;margin-left:8px;text-decoration:underline">${esc(aviso.texto_link || 'Saiba mais')}</a>` : ''}</div>`
    : '');
}

// agenda (adicionar à agenda) e contagens
const agenda = {};
for (const e of eventos) agenda[e._id] = agendaDe(e);
h = trocarJs(h, 'agenda', js(agenda));
h = trocarJs(h, 'contagem', js(proximos.map((e) => ({ n: e.titulo, i: quando(e, false) + (e.local_curto || e.local ? ' · ' + (e.local_curto || e.local) : ''), s: e.inicioIso }))));
h = trocarJs(h, 'inicio', js(proximos[0] ? proximos[0].inicioIso : '2000-01-01T00:00:00-03:00'));

// cartão do próximo evento
const px = proximos[0];
if (px) {
  const falta = Math.max(0, Math.floor((new Date(px.inicioIso) - new Date()) / 864e5));
  h = trocarHtml(h, 'proximo', `<article class="next" id="next-card">
        <img src="${esc(url(px.capa))}" alt="${esc(px.capa_alt || px.titulo)}"${px.capa_topo ? ' style="object-position:top"' : ''}>
        <div class="bd">
          <div class="k"><span class="eyebrow f">Próximo evento</span><span class="pill">${esc(px.selo || 'Vagas abertas')}</span></div>
          <h3>${esc(px.titulo)}</h3>
          <div class="meta">
            <span><svg class="i"><use href="#i-cal"/></svg>${esc(quando(px))}</span>
            ${px.local ? `<span><svg class="i"><use href="#i-pin"/></svg>${esc(px.local)}</span>` : ''}
          </div>
          <div class="count" id="countdown" aria-live="polite">
            <div><b data-u="d">${falta}</b><small>dias</small></div>
            <div><b data-u="h">00</b><small>horas</small></div>
            <div><b data-u="m">00</b><small>min</small></div>
          </div>
          <a class="btn btn-blue" href="#inscricao" data-event="${esc(px.titulo)}">Garantir minha vaga <svg class="i"><use href="#i-arrow"/></svg></a>
          ${addcal(px._id)}
        </div>
      </article>`);
} else {
  h = trocarHtml(h, 'proximo', `<article class="next" id="next-card">
        <div class="bd">
          <div class="k"><span class="eyebrow f">Agenda</span><span class="pill">Em breve</span></div>
          <h3>Novos eventos em breve</h3>
          <p>Fale com a UVERGS e seja avisado quando a próxima agenda abrir.</p>
          <div class="count" id="countdown" hidden></div>
          <a class="btn btn-blue" href="https://api.whatsapp.com/send?phone=${WA}" target="_blank" rel="noopener">Falar no WhatsApp <svg class="i"><use href="#i-arrow"/></svg></a>
        </div>
      </article>`);
}

// próximos eventos
const transicoes = proximos.filter((e) => e.gerar).map((e) => `html:active-view-transition-type(ev) .event[data-ev="${e._id}"] .ph img{view-transition-name:ev-${e._id}-img}`).join('');
h = trocarHtml(h, 'eventos', (transicoes ? `\n        <style>${transicoes}</style>` : '') + proximos.map((e) => `
        <article class="event" data-end="${e.fim}" data-ev="${esc(e._id)}">
          <div class="ph"><a href="${esc(linkCartao(e))}" tabindex="-1" aria-hidden="true"><img src="${esc(url(e.capa))}" alt="${esc(e.capa_alt || e.titulo)}" loading="lazy"${e.capa_topo ? ' style="object-position:top"' : ''}></a><div class="date">${seloData(e)}</div></div>
          <div class="bd">
            <div class="top"><span class="type">${esc(e.tipo || 'Evento')}</span><span class="pill">${esc(e.selo || 'Vagas abertas')}</span></div>
            <h3><a href="${esc(linkCartao(e))}">${esc(e.titulo)}</a></h3>
            ${e.resumo ? `<p>${esc(e.resumo)}</p>` : ''}
            ${e.local ? `<div class="meta"><span><svg class="i"><use href="#i-pin"/></svg>${esc(e.local)}</span></div>` : ''}
            <div class="cta"><a class="btn btn-blue" href="#inscricao" data-event="${esc(e.titulo)}">Quero participar</a>${addcal(e._id)}<a class="more" href="${esc(linkCartao(e))}" style="align-self:center">${e.programacao ? 'Ver programação' : 'Ver página do evento'} <svg class="i"><use href="#i-arrow"/></svg></a></div>
            <p class="oficio-link"><a href="ferramentas/oficio.html?evento=${encodeURIComponent(e._id)}">Precisa de autorização da Câmara? Gere o ofício</a></p>
          </div>
        </article>`).join('') + '\n');

// opções do formulário
h = trocarHtml(h, 'opcoes', proximos.map((e, i) => `<label class="opt" for="ev-${esc(e._id)}"><input type="checkbox" id="ev-${esc(e._id)}" value="${esc(e.titulo)}"${i === 0 ? ' checked' : ''}> ${esc(nomeCurto(e))} (${esc(curtoForm(e))})</label>`).join('\n            '));

// realizados
h = trocarHtml(h, 'realizados', realizados.map((e) => {
  const l = linkRealizado(e);
  return `
        <a class="done" href="${esc(l)}"${alvo(l)}><img src="${esc(url(e.capa))}" alt="${esc(e.capa_alt || e.titulo)}" loading="lazy"${e.capa_topo ? ' style="object-position:top"' : ''}><time>${esc(e.rotulo_data || quando(e, false))}</time><h3>${esc(e.titulo)}</h3></a>`;
}).join('') + '\n');
h = h.replace(/(<span id="car-count"[^>]*>)1 \/ \d+(<\/span>)/, `$11 / ${realizados.length}$2`);

// galeria
if (galeria && Array.isArray(galeria.fotos)) {
  const cls = { grande: ' class="big"', alta: ' class="tall"' };
  h = trocarHtml(h, 'galeria', galeria.fotos.filter((f) => f && f.imagem).map((f) => `
        <figure${cls[f.formato] || ''}><img src="${esc(url(f.imagem))}" alt="${esc(f.alt || f.legenda || '')}" loading="lazy"><figcaption>${esc(f.legenda || '')}</figcaption></figure>`).join('') + '\n');
}

// notícias
if (noticias) {
  const lista = noticias.filter((n) => n.publicado !== false && n.titulo && /^\d{4}-\d{2}-\d{2}/.test(n.data || ''))
    .map((n) => ({ ...n, data: n.data.slice(0, 10), gerar: !!n.texto, pg: n.texto ? `noticias/${n._id}.html` : n.link_externo }))
    .sort((a, b) => b.data.localeCompare(a.data));
  h = trocarHtml(h, 'noticias', lista.slice(0, 4).map((n) => {
    const { a, m, d } = partes(n.data);
    const l = url(n.pg || '#noticias');
    return `
        <a class="post" href="${esc(l)}"${alvo(l)}><img src="${esc(url(n.capa))}" alt="" loading="lazy"><div class="bd"><time datetime="${n.data}">${dia(d)} de ${MESES[m - 1]} de ${a}</time><h3>${esc(n.titulo)}</h3></div></a>`;
  }).join('') + '\n');
  noticias.lista = lista;
}
fs.writeFileSync(pIndex, h);

// ---------- 4. ofício ----------
const pOf = path.join(SAIDA, 'ferramentas', 'oficio.html');
if (fs.existsSync(pOf)) {
  const EV = {};
  for (const e of proximos) {
    const pr = e.precos || {};
    EV[e._id] = {
      nome: e.titulo,
      tipo: e.of.tipo || (e.tipo || 'evento').toLowerCase(),
      ini: e.inicio.slice(0, 10), fim: e.fim,
      quando: 'de ' + quando(e),
      local: e.of.local || (e.local ? 'no local ' + e.local : 'em local a confirmar'),
      dias: diasEntre(e.inicio, e.fim),
      preco: pr.associada && pr.nao_associada ? [pr.associada, pr.nao_associada] : null,
      pagina: `${SITE}/${e.pg}`, rel: '../' + e.pg,
      temas: (e.of.temas || []).length ? e.of.temas : null,
      extra: e.of.extra || ''
    };
    if (e.inicio.slice(0, 10) === e.fim) EV[e._id].quando = 'em ' + quando(e);
  }
  let o = fs.readFileSync(pOf, 'utf8');
  o = trocarJs(o, 'oficio', js(EV));
  fs.writeFileSync(pOf, o);
}

// ---------- 5. páginas próprias (eventos e notícias sem página sob medida) ----------
// usa a página do Outubro Rosa como molde: mesmo topo, menu, rodapé e estilos
function molde() {
  const base = ['eventos/outubro-rosa.html', 'eventos/aparte-artistico.html'].map((p) => path.join(SAIDA, p)).find((p) => fs.existsSync(p));
  if (!base) return null;
  const s = fs.readFileSync(base, 'utf8');
  const iMain = s.indexOf('<main'), fMain = s.indexOf('</main>'), iScript = s.indexOf('<script', fMain);
  if (iMain < 0 || fMain < 0 || iScript < 0) return null;
  return { topo: s.slice(0, iMain), rodape: s.slice(fMain + 7, iScript) };
}
const M = molde();
const ESTILO = `<style>
.cms-texto{max-width:760px;font-size:1.05rem;line-height:1.7}
.cms-texto h2,.cms-texto h3{font-family:var(--display);margin:1.6em 0 .5em}
.cms-texto ul,.cms-texto ol{padding-left:1.3em}
.cms-texto li{margin:.3em 0}
.cms-texto blockquote{margin:1.2em 0;padding:.4em 1.2em;border-left:4px solid var(--gold);background:var(--surface);border-radius:0 10px 10px 0}
.cms-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.cms-fotos figure{margin:0;border-radius:12px;overflow:hidden;background:var(--surface)}
.cms-fotos img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.cms-fotos figcaption{padding:10px 12px;font-size:.9rem}
.cms-capa{width:100%;max-height:520px;object-fit:cover;border-radius:14px;margin:18px 0 26px}
html:active-view-transition-type(ev) .ev-ph img{view-transition-name:VT}
</style>`;
function pagina({ titulo, descricao, imagem, caminho, vt, main, script }) {
  let topo = M.topo
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)} | UVERGS</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(descricao)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(descricao)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(imagem ? (externo(imagem) ? imagem : SITE + '/' + imagem.replace(/^\/+/, '')) : SITE + '/img/logo.png')}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(SITE + '/' + caminho)}$2`)
    .replace('</head>', ESTILO.replace('VT', vt || 'none') + '\n</head>');
  return topo + main + '\n</main>' + M.rodape + `<script>
(function(){
  var t=document.getElementById('menu-toggle'),m=document.getElementById('menu');
  if(t&&m){t.addEventListener('click',function(){var o=m.classList.toggle('open');t.setAttribute('aria-expanded',o)});
  m.addEventListener('click',function(e){if(e.target.closest('a'))m.classList.remove('open')})}
${script || ''}
  var bar=document.querySelector('.progress'),calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(bar&&(calm||!(window.CSS&&CSS.supports&&CSS.supports('animation-timeline','scroll()')))){
    var ler=function(){var h=document.documentElement;bar.style.setProperty('--p',Math.min(1,h.scrollTop/((h.scrollHeight-h.clientHeight)||1)))};
    addEventListener('scroll',ler,{passive:true});addEventListener('resize',ler);ler()}
})();
</script>
</body>
</html>
`;
}

let geradas = 0;
if (!M) alertas.push('não achei a página do Outubro Rosa para servir de molde; páginas próprias não foram geradas');
else {
  fs.mkdirSync(path.join(SAIDA, 'eventos'), { recursive: true });
  for (const e of eventos.filter((x) => x.gerar && (!x.passou || x.programacao || (x.fotos || []).length || !x.av.link_externo))) {
    const outro = proximos.find((x) => x !== e);
    const pr = e.precos || {};
    const inscr = `../?evento=${encodeURIComponent(e.titulo)}#inscricao`;
    const main = `<main id="inicio">
  <section class="ev-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="Você está em"><a href="../">Início</a><span aria-hidden="true">›</span><a href="../#${e.passou ? 'realizados' : 'eventos'}">${e.passou ? 'Realizados' : 'Agenda'}</a><span aria-hidden="true">›</span><span aria-current="page">${esc(e.titulo)}</span></nav>
      <div class="ev-grid">
        <div class="ev-ph"><img src="${esc(url(e.capa, 1))}" alt="${esc(e.capa_alt || e.titulo)}"${e.capa_topo ? ' style="object-position:top"' : ''}><div class="date">${seloData(e)}</div></div>
        <div class="ev-bd">
          <div class="top"><span class="type">${esc(e.tipo || 'Evento')}</span><span class="pill" id="ev-pill">${esc(e.selo || 'Vagas abertas')}</span></div>
          <h1>${esc(e.titulo)}</h1>
          ${e.resumo ? `<p class="lead">${esc(e.resumo)}</p>` : ''}
          <p class="ev-count" id="ev-count" hidden></p>
          <ul class="facts"><li><span class="ic"><svg aria-hidden="true"><use href="#i-cal"/></svg></span><div><small>Quando</small><span>${esc(e.rotulo_data || quando(e))}</span></div></li>${e.local ? `<li><span class="ic"><svg aria-hidden="true"><use href="#i-pin"/></svg></span><div><small>Onde</small><span>${esc(e.local)}</span>${e.mapa ? `<a class="more" href="${esc(e.mapa)}" target="_blank" rel="noopener">Abrir no mapa</a>` : ''}</div></li>` : ''}</ul>
          ${pr.associada || pr.nao_associada ? `<div class="prices">${pr.associada ? `<div class="yes"><small>Câmara associada</small><b>R$ ${Number(pr.associada).toLocaleString('pt-BR')}</b><span>por inscrição</span></div>` : ''}${pr.nao_associada ? `<div><small>Câmara não associada</small><b>R$ ${Number(pr.nao_associada).toLocaleString('pt-BR')}</b><span>por inscrição</span></div>` : ''}</div><p class="prices-note">Sua Câmara ainda não é associada? <a href="../#associe">Veja como associar e pagar menos</a></p>` : ''}
          ${e.passou ? '' : `<div class="cta"><a class="btn btn-gold" href="${inscr}">Quero participar <svg class="i"><use href="#i-arrow"/></svg></a>${addcal(e._id)}</div>
          <a class="more" href="../ferramentas/oficio.html?evento=${encodeURIComponent(e._id)}">Precisa de autorização da Câmara? Gere o ofício <svg class="i"><use href="#i-arrow"/></svg></a>`}
          ${e.av.link_externo ? `<a class="more" href="${esc(e.av.link_externo)}" target="_blank" rel="noopener">Mais informações <svg class="i"><use href="#i-arrow"/></svg></a>` : ''}
        </div>
      </div>
    </div>
  </section>
${e.programacao ? `
  <section class="block" id="programacao" style="background:var(--surface)">
    <div class="wrap">
      <div class="head"><div><span class="eyebrow f">${e.passou ? 'Sobre o evento' : 'Programação'}</span></div></div>
      <div class="cms-texto">${markdown(e.programacao)}</div>
    </div>
  </section>` : ''}
${(e.fotos || []).filter((f) => f && f.imagem).length ? `
  <section class="block" id="fotos">
    <div class="wrap">
      <div class="head"><div><span class="eyebrow f">Fotos</span><h2>${e.passou ? 'Como foi' : 'Fotos do evento'}</h2></div></div>
      <div class="cms-fotos">${e.fotos.filter((f) => f && f.imagem).map((f) => `<figure><a href="${esc(url(f.imagem, 1))}" target="_blank" rel="noopener"><img src="${esc(url(f.imagem, 1))}" alt="${esc(f.legenda || e.titulo)}" loading="lazy"></a>${f.legenda ? `<figcaption>${esc(f.legenda)}</figcaption>` : ''}</figure>`).join('')}</div>
    </div>
  </section>` : ''}
${outro ? `
  <section class="block">
    <div class="wrap">
      <div class="head"><div><span class="eyebrow f">Também na agenda</span><h2>Próximo encontro da UVERGS</h2></div><a class="more" href="../#eventos">Voltar para a agenda <svg class="i"><use href="#i-arrow"/></svg></a></div>
      <a class="ev-other" href="${esc(url(outro.pg, 1))}"><img src="${esc(url(outro.capa, 1))}" alt="" loading="lazy"><div><small>${esc(outro.tipo || 'Evento')}</small><h3>${esc(outro.titulo)}</h3><p>${esc(quando(outro, false))}${outro.local_curto || outro.local ? ' · ' + esc(outro.local_curto || outro.local) : ''}</p></div></a>
    </div>
  </section>` : ''}

  <section class="ev-band">
    <div class="wrap">
      ${e.passou
        ? `<div><h2>Venha para o próximo encontro</h2><p>Veja a agenda da UVERGS e faça sua pré-inscrição.</p></div>
      <div class="acts"><a class="btn btn-gold" href="../#eventos">Ver próximos eventos</a></div>`
        : `<div><h2>Garanta sua vaga no ${esc(e.titulo)}</h2><p>Faça a pré-inscrição. A equipe da UVERGS confirma sua vaga pelo WhatsApp.</p></div>
      <div class="acts"><a class="btn btn-gold" href="${inscr}">Fazer pré-inscrição</a><a class="btn btn-ghost" href="https://api.whatsapp.com/send?phone=${WA}&amp;text=${encodeURIComponent('Olá, UVERGS! Quero saber mais sobre o ' + e.titulo + '.')}" target="_blank" rel="noopener">Falar no WhatsApp</a></div>`}
    </div>
  </section>`;
    const script = `
  var EV=${js({ [e._id]: agendaDe(e) })};
  function iso(d){return d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6)}
  [].forEach.call(document.querySelectorAll('.addcal'),function(el){
    var e=EV[el.dataset.cal],q=encodeURIComponent;if(!e)return;
    var g='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+q(e.t)+'&dates='+e.s+'/'+e.e+'&details='+q(e.d)+'&location='+q(e.l);
    var o='https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&allday=true&subject='+q(e.t)+'&startdt='+iso(e.s)+'&enddt='+iso(e.e)+'&location='+q(e.l)+'&body='+q(e.d);
    var o365=o.replace('outlook.live.com','outlook.office.com');
    el.querySelector('.menu').innerHTML=
      '<a href="'+g+'" target="_blank" rel="noopener"><b style="background:#1A73E8">G</b>Google Agenda</a>'+
      '<a href="'+o+'" target="_blank" rel="noopener"><b style="background:#0F6CBD">O</b>Outlook.com</a>'+
      '<a href="'+o365+'" target="_blank" rel="noopener"><b style="background:#0F6CBD">365</b>Outlook do trabalho</a>';
  });
  document.addEventListener('click',function(ev){[].forEach.call(document.querySelectorAll('.addcal[open]'),function(d){if(!d.contains(ev.target))d.removeAttribute('open')})});
  var ini=new Date(${js(e.inicioIso)}),fim=new Date(${js(e.fim + 'T23:59:59-03:00')}),now=new Date(),c=document.getElementById('ev-count');
  if(now>fim){var pl=document.getElementById('ev-pill');pl.textContent='Realizado';pl.classList.add('done')}
  else if(now<ini){var d=Math.floor((ini-now)/864e5);c.innerHTML=d>1?'Faltam <b>'+d+'</b> dias':d===1?'Falta <b>1</b> dia':'Começa amanhã';c.hidden=false}
  else{c.textContent='Acontecendo agora';c.hidden=false}`;
    fs.writeFileSync(path.join(SAIDA, e.pg), pagina({
      titulo: e.titulo,
      descricao: e.resumo || `${e.titulo}, ${quando(e)}${e.local ? ', ' + e.local : ''}.`,
      imagem: e.capa, caminho: e.pg, vt: `ev-${e._id}-img`, main, script
    }));
    geradas++;
  }

  for (const n of (noticias && noticias.lista || []).filter((x) => x.gerar)) {
    fs.mkdirSync(path.join(SAIDA, 'noticias'), { recursive: true });
    const { a, m, d } = partes(n.data);
    const main = `<main id="inicio">
  <section class="block">
    <div class="wrap">
      <nav class="crumbs" aria-label="Você está em"><a href="../">Início</a><span aria-hidden="true">›</span><a href="../#noticias">Notícias</a><span aria-hidden="true">›</span><span aria-current="page">${esc(n.titulo)}</span></nav>
      <article class="cms-texto" style="margin-top:14px">
        <time datetime="${n.data}" style="color:var(--muted,#5b6b86);font-weight:600">${dia(d)} de ${MESES[m - 1]} de ${a}</time>
        <h1 style="font-family:var(--display);font-size:clamp(1.9rem,4vw,2.8rem);line-height:1.1;margin:.3em 0 0">${esc(n.titulo)}</h1>
        ${n.capa ? `<img class="cms-capa" src="${esc(url(n.capa, 1))}" alt="">` : ''}
        ${markdown(n.texto)}
        ${n.link_externo ? `<p><a class="more" href="${esc(n.link_externo)}" target="_blank" rel="noopener">Leia também no site de origem <svg class="i"><use href="#i-arrow"/></svg></a></p>` : ''}
        <p style="margin-top:2em"><a class="more" href="../#noticias">Voltar para as notícias <svg class="i"><use href="#i-arrow"/></svg></a></p>
      </article>
    </div>
  </section>

  <section class="ev-band">
    <div class="wrap">
      <div><h2>Participe dos eventos da UVERGS</h2><p>Veja a agenda e faça sua pré-inscrição pelo WhatsApp.</p></div>
      <div class="acts"><a class="btn btn-gold" href="../#eventos">Ver próximos eventos</a></div>
    </div>
  </section>`;
    const resumo = String(n.texto).replace(/[#*_>\[\]()`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 155);
    fs.writeFileSync(path.join(SAIDA, n.pg), pagina({ titulo: n.titulo, descricao: resumo, imagem: n.capa, caminho: n.pg, main }));
    geradas++;
  }
}

// ---------- 6. reduz fotos enviadas pela Central ----------
let reduzidas = 0;
const pastaFotos = path.join(SAIDA, 'img', 'uploads');
if (fs.existsSync(pastaFotos)) {
  let sharp = null;
  try { sharp = (await import('sharp')).default; } catch { alertas.push('biblioteca de fotos indisponível; fotos enviadas ficaram no tamanho original'); }
  if (sharp) {
    for (const f of fs.readdirSync(pastaFotos)) {
      if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
      const p = path.join(pastaFotos, f);
      try {
        const img = sharp(p, { failOn: 'none' }).rotate();
        const meta = await img.metadata();
        if ((meta.width || 0) <= 1600 && fs.statSync(p).size < 400 * 1024) continue;
        let out = img.resize({ width: 1600, withoutEnlargement: true });
        out = /\.png$/i.test(f) ? out.png({ compressionLevel: 9 }) : /\.webp$/i.test(f) ? out.webp({ quality: 80 }) : out.jpeg({ quality: 80, mozjpeg: true });
        const buf = await out.toBuffer();
        if (buf.length < fs.statSync(p).size) { fs.writeFileSync(p, buf); reduzidas++; }
      } catch (e) { alertas.push(`não consegui reduzir a foto ${f} (${e.message})`); }
    }
  }
}

console.log(`Site montado em public/: ${proximos.length} próximos eventos, ${realizados.length} realizados, ${noticias ? noticias.lista.length : 0} notícias, ${galeria && galeria.fotos ? galeria.fotos.length : 0} fotos na galeria, ${geradas} páginas geradas, ${reduzidas} fotos reduzidas.`);
if (alertas.length) console.warn('Avisos:\n- ' + alertas.join('\n- '));
