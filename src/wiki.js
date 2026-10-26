const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const href = u => /^(https?:|#|\.|\/)/.test(u) ? u : `page.html?slug=${u}`;
const inline = s => esc(s)
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${href(u)}">${t}</a>`)
  .replace(/\{\{(.+?)\}\}/g, '<span class="small">$1</span>').replace(/&lt;br&gt;/g, '<br>')
  .replace(/\^(.+?)\^/g, '<sup>$1</sup>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

// Markdown minimal : ## titre, ### sous-titre, - liste, tableaux |a|b|, **gras**, *italique*, ^exposant^, [texte](slug-ou-url)
function table(rows) {
  const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  let al = [], R = rows.map(cells);
  if (R[1] && R[1].every(c => /^:?-+:?$/.test(c))) { al = R[1].map(c => c.endsWith(':') ? (c.startsWith(':') ? 'center' : 'right') : 'left'); R.splice(1, 1); }
  R = R.filter(r => r.some(c => c));
  const td = (t, r) => r.map((c, i) => `<${t} style="text-align:${al[i] || 'left'}">${inline(c)}</${t}>`).join('');
  return `<table><thead><tr>${td('th', R[0])}</tr></thead><tbody>${R.slice(1).map(r => `<tr>${td('td', r)}</tr>`).join('')}</tbody></table>`;
}
function md(src) {
  const toc = [], L = (src || '').split('\n'); let h = '', list = false, p = [];
  const flush = () => { if (p.length) h += `<p>${inline(p.join(' '))}</p>`; p = []; };
  const endList = () => { if (list) h += '</ul>'; list = false; };
  for (let i = 0; i < L.length; i++) {
    const l = L[i]; let m;
    if (/^\s*\|/.test(l)) { flush(); endList(); const rows = []; while (i < L.length && /^\s*\|/.test(L[i])) rows.push(L[i++]); i--; h += table(rows); }
    else if (m = l.match(/^(#{2,3}) (.+)/)) {
      flush(); endList(); const id = slugify(m[2]); toc.push({ lvl: m[1].length, id, t: m[2] });
      h += m[1] === '##' ? `<h2 class="linux-font" id="${id}">${inline(m[2])}</h2>` : `<h3 class="font" id="${id}">${inline(m[2])}</h3>`;
    } else if (m = l.match(/^[-*] (.+)/)) { flush(); if (!list) h += '<ul>'; list = true; h += `<li>${inline(m[1])}</li>`; }
    else if (!l.trim()) { flush(); endList(); } else { endList(); p.push(l.trim()); }
  }
  flush(); endList(); return { html: h, toc };
}

// Infobox : "@image url | légende" / "## Section" / "Label | Valeur"
function parseBox(t) {
  const o = { images: [], sections: [{ rows: [] }] };
  for (const l of (t || '').split('\n')) {
    if (!l.trim()) continue; let m;
    if (m = l.match(/^@image (.+?)(?:\s*\|\s*(.*))?$/)) o.images.push({ src: m[1], cap: m[2] || '' });
    else if (m = l.match(/^@map (.+?)(?:\s*\|\s*(.*))?$/)) o.sections.at(-1).rows.push({ map: { src: m[1], cap: m[2] || '' } });
    else if (m = l.match(/^## (.+)/)) o.sections.push({ title: m[1], rows: [] });
    else { const [a, ...b] = l.split('|'); o.sections.at(-1).rows.push([a.trim(), b.join('|').trim()]); }
  }
  return o;
}
function infobox(type, title, text) {
  const b = parseBox(text), p = type === 'person';
  const imgs = b.images.map(i => `<div class="${p ? 'infobox-image-people' : 'infobox-image'}">${p ? `<img src="${esc(i.src)}">` : `<div class="flag"><img src="${esc(i.src)}"></div>`}<div class="infobox-legend">${esc(i.cap)}</div></div>`).join('');
  const rows = b.sections.map(s => (s.title ? `<div class="${p ? 'section_box-people' : 'section_box'}"><p>${esc(s.title)}</p></div>` : '') +
    s.rows.map(r => !Array.isArray(r) ? `<div class="infobox-image"><div class="map"><img src="${esc(r.map.src)}" alt=""></div><div class="infobox-legend--2">${esc(r.map.cap)}</div></div>` : (([a, v]) => `<div class="infobox-row"><div class="infobox-label">${inline(a)}</div><div class="infobox-value">${inline(v)}</div></div>`)(r)).join('')).join('');
  return `<div class="infobox"><div class="infobox-title ${p ? 'people' : 'country'}">${esc(title)}</div><div class="flex-box">${imgs}</div><div class="infobox-data">${rows}</div></div>`;
}

function renderPage(p) {
  const { html, toc } = md(p.body), intro = md(p.intro).html;
  const sommaire = toc.length ? `<div class="bloc-sommaire fit-content"><h4>Sommaire</h4><ol>${toc.map(t => `<li style="margin-left:${(t.lvl - 2) * 18}px;list-style:none"><a href="#${t.id}">${esc(t.t)}</a></li>`).join('')}</ol></div>` : '';
  return `<h1 class="article-title">${esc(p.title)}</h1><div class="grille"><div class="content grid gap"><div>${intro}</div>${sommaire}<div>${html}</div></div>${infobox(p.type, p.title, p.infobox)}</div>`;
}

function shell(inner) {
  return `<div class="header"><div class="page-tools"><a href="index.html">Accueil</a></div><div class="user-tools"><a href="admin.html">Admin</a></div></div>
<div class="container"><div class="menu"><div class="sidebar"><div class="sidebar-logo"><a href="index.html"><img src="./public/img/Wikipedia-logo-v2.svg.png" alt=""></a></div><p class="title">Wikipedia</p><div class="tagline">L'encyclopédie libre</div></div>
<div class="sidebar-nav"><div class="sidebar-nav-group"><h3>Navigation</h3><ul><li><a href="index.html">Accueil</a></li><li><a href="index.html#pays">Pays</a></li><li><a href="index.html#personnalites">Personnalités</a></li></ul></div></div></div>
<div class="main-content"><div class="article-wrapper"><div class="article-tabs"><a class="active">Article</a></div><div class="article-content">${inner}</div></div></div></div>`;
}