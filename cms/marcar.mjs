// Coloca no index.html e no ofício as marcações que o montador usa para
// trocar eventos, notícias, galeria e aviso pelo que foi cadastrado na Central.
// Pode rodar mais de uma vez: o que já está marcado fica como está.
//   node cms/marcar.mjs [pasta-do-site]
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(process.argv[2] || '.');
const avisos = [];

function marcarHtml(s, nome, abre, fecha, rotulo) {
  if (s.includes(`<!-- cms:${nome} -->`)) return s;
  const i = s.indexOf(abre);
  if (i < 0) { avisos.push(`${rotulo}: não achei ${JSON.stringify(abre.slice(0, 60))}`); return s; }
  const ini = i + abre.length;
  const fim = s.indexOf(fecha, ini);
  if (fim < 0) { avisos.push(`${rotulo}: não achei o fim de ${nome}`); return s; }
  return s.slice(0, ini) + `<!-- cms:${nome} -->` + s.slice(ini, fim) + `<!-- /cms:${nome} -->` + s.slice(fim);
}

function marcarJs(s, nome, abre, fecha, rotulo) {
  if (s.includes(`/*cms:${nome}*/`)) return s;
  const i = s.indexOf(abre);
  if (i < 0) { avisos.push(`${rotulo}: não achei ${JSON.stringify(abre.slice(0, 60))}`); return s; }
  const ini = i + abre.length;
  const fim = s.indexOf(fecha, ini);
  if (fim < 0) { avisos.push(`${rotulo}: não achei o fim de ${nome}`); return s; }
  return s.slice(0, ini) + `/*cms:${nome}*/` + s.slice(ini, fim) + `/*/cms:${nome}*/` + s.slice(fim);
}

// ---------- página inicial ----------
const pIndex = path.join(raiz, 'index.html');
let s = fs.readFileSync(pIndex, 'utf8');

// aviso: logo antes do topo
if (!s.includes('<!-- cms:aviso -->')) {
  const alvo = s.indexOf('<div class="progress"') >= 0 ? '<div class="progress"' : '<div class="topbar">';
  if (s.includes(alvo)) s = s.replace(alvo, '<!-- cms:aviso --><!-- /cms:aviso -->\n' + alvo);
  else avisos.push('index: não achei onde colocar o aviso');
}

// cartão "Próximo evento" do topo (o <article> inteiro)
if (!s.includes('<!-- cms:proximo -->')) {
  const a = s.indexOf('<article class="next" id="next-card">');
  const b = a >= 0 ? s.indexOf('</article>', a) : -1;
  if (a >= 0 && b >= 0) s = s.slice(0, a) + '<!-- cms:proximo -->' + s.slice(a, b + 10) + '<!-- /cms:proximo -->' + s.slice(b + 10);
  else avisos.push('index: não achei o cartão do próximo evento');
}

s = marcarJs(s, 'inicio', "var start=new Date(", ")", 'index (contagem do topo)');
s = marcarHtml(s, 'eventos', '<div class="events">', '\n      </div>\n    </div>\n  </section>', 'index (próximos eventos)');

// opções do formulário: só as linhas dos eventos (e1, e2)
if (!s.includes('<!-- cms:opcoes -->')) {
  const a = s.indexOf('<label class="opt" for="e1">');
  const b2 = s.indexOf('<label class="opt" for="e2">');
  const b = b2 >= 0 ? s.indexOf('</label>', b2) : -1;
  if (a >= 0 && b >= 0) s = s.slice(0, a) + '<!-- cms:opcoes -->' + s.slice(a, b + 8) + '<!-- /cms:opcoes -->' + s.slice(b + 8);
  else avisos.push('index: não achei as opções de evento do formulário');
}

s = marcarHtml(s, 'realizados', '<div class="done-list" id="done-strip" tabindex="0" role="region" aria-label="Eventos realizados em 2026">', '\n      </div>', 'index (realizados)');
s = marcarHtml(s, 'galeria', '<div class="mosaic">', '\n      </div>', 'index (galeria)');
s = marcarHtml(s, 'noticias', '<div class="news">', '\n      </div>', 'index (notícias)');
s = marcarJs(s, 'agenda', 'var EV=', ';\n', 'index (adicionar à agenda)');
s = marcarJs(s, 'contagem', 'var EVS=', ';\n', 'index (faixa de contagem)');
fs.writeFileSync(pIndex, s);

// ---------- ofício ----------
const pOf = path.join(raiz, 'ferramentas', 'oficio.html');
if (fs.existsSync(pOf)) {
  let o = fs.readFileSync(pOf, 'utf8');
  o = marcarJs(o, 'oficio', 'var EV=', ';\n', 'ofício');
  fs.writeFileSync(pOf, o);
}

if (avisos.length) { console.error('Marcações que faltaram:\n- ' + avisos.join('\n- ')); process.exit(1); }
console.log('Marcações da Central aplicadas.');
