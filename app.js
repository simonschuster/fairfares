
const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(n).toLocaleString();
const norm = s => (s||'').trim().toUpperCase();

function findRoute(a,b){
  const ra=CMAP[norm(a)]||norm(a), rb=CMAP[norm(b)]||norm(b);
  return routes.find(x=>x.from===ra&&x.to===rb)||routes.find(x=>x.from===rb&&x.to===ra)||null;
}

// Persist Admin data locally
let storedRoutes = localStorage.getItem('ff_custom_routes');
let routes = storedRoutes ? JSON.parse(storedRoutes) : JSON.parse(JSON.stringify(ROUTES));

function saveModal(){
  const inst=$('m-inst').value;
  if(!inst){$('m-inst').style.borderColor='var(--red)';return;}
  localStorage.setItem('ff_inst',inst);
  localStorage.setItem('ff_dept',$('m-dept').value.trim()||'Not specified');
  closeModal();
}

function closeModal(){
  const m=$('modal'); 
  m.classList.remove('show');
  setTimeout(()=>m.classList.add('off'),500);
}

window.onload = () => {
  if(!localStorage.getItem('ff_inst')) {
    const m=$('modal'); 
    m.classList.remove('off');
    setTimeout(()=>m.classList.add('show'),10);
  }
};

function setTab(t){
  document.querySelectorAll('.tp').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  $(t).classList.add('on');
  if(event) event.currentTarget.classList.add('active');
}

function runBench(){
  const from = $('f-from').value;
  const to = $('f-to').value;
  
  if(!from || !to) { alert("Enter both locations."); return; }
  
  const route = findRoute(from, to);
  if(!route){
    alert("Route not found. Try SFO, LAX, or airport codes.");
    $('res').classList.add('off');
    return;
  }
  
  $('res').classList.remove('off');
  $('res-mid').innerText = fmt(route.mid);
  $('res-low').innerText = fmt(route.low);
}

function addRoute(){
  const f = norm($('nr-f').value);
  const t = norm($('nr-t').value);
  const m = parseFloat($('nr-m').value);
  
  if(!f || !t || isNaN(m)) { alert("Please fill all fields"); return; }
  
  const newRoute = {from:f, to:t, mid:m, low:m*0.5, high:m*1.8, rt:1.5};
  routes.push(newRoute);
  localStorage.setItem('ff_custom_routes', JSON.stringify(routes));
  alert("Route added to your local library.");
}

function printTab(){
  window.print();
}
