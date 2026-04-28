const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(n).toLocaleString();
const norm = s => (s||'').trim().toUpperCase();

function findRoute(a,b){
  const ra=CMAP[norm(a)]||norm(a), rb=CMAP[norm(b)]||norm(b);
  return routes.find(x=>x.from===ra&&x.to===rb)||routes.find(x=>x.from===rb&&x.to===ra)||null;
}
...