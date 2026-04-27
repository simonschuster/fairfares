// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(n).toLocaleString();
const norm = s => (s||'').trim().toUpperCase();

function findRoute(a,b){
  const ra=CMAP[norm(a)]||norm(a), rb=CMAP[norm(b)]||norm(b);
  return routes.find(x=>x.from===ra&&x.to===rb)||routes.find(x=>x.from===rb&&x.to===ra)||null;
}

let routes = JSON.parse(JSON.stringify(ROUTES));
let activeBench = null;

// ═══════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════
function openModal(){
  const m=$('modal'); m.classList.remove('off');
  requestAnimationFrame(()=>requestAnimationFrame(()=>m.classList.add('show')));
}
function closeModal(){
  const m=$('modal'); m.classList.remove('show');
  setTimeout(()=>m.classList.add('off'),500);
}
function saveModal(){
  const inst=$('m-inst').value;
  if(!inst){$('m-inst').style.borderColor='var(--red)';return;}
  localStorage.setItem('ff_inst',inst);
  localStorage.setItem('ff_dept',$('m-dept').value.trim()||'Not specified');
  localStorage.setItem('ff_seen','1');
  closeModal(); updateBadge();
}
function skipModal(){localStorage.setItem('ff_seen','1');closeModal();}
function updateBadge(){
  const i=localStorage.getItem('ff_inst');
  if(i){
    $('ub-txt').textContent=i.replace('UC San Francisco (UCSF)','UCSF').replace('UC Los Angeles (UCLA)','UCLA');
    $('ub').classList.add('on');
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  // Setup hotel city autocomplete (HOTEL_RATES must be defined first)
  if(!localStorage.getItem('ff_seen')){
    setTimeout(openModal,1500);
  } else {
    updateBadge();
    const i=localStorage.getItem('ff_inst'), d=localStorage.getItem('ff_dept');
    if(i)$('m-inst').value=i;
    if(d)$('m-dept').value=d;
  }
});

// ═══════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════
function tab(t,el){
  document.querySelectorAll('.ttab').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.tp').forEach(x=>x.classList.remove('on'));
  el.classList.add('on');
  $('tp-'+t).classList.add('on');
  if(t==='adm')renderAdmin();
  // Clear all inputs and results on tab switch
  document.querySelectorAll('.tp input').forEach(inp=>{
    if(inp.type==='date'){inp.value='';}
    else if(inp.type!=='number'||inp.closest('.atbl')){inp.value='';}
    else{inp.value='';}
  });
  document.querySelectorAll('.tp select').forEach(sel=>{
    if(!sel.closest('.atbl'))sel.selectedIndex=0;
  });
  document.querySelectorAll('.rbox').forEach(r=>r.classList.remove('show'));
  document.querySelectorAll('.nf').forEach(n=>n.style.display='none');
  document.querySelectorAll('.errmsg').forEach(e=>e.style.display='none');
  document.querySelectorAll('.pdf-sec').forEach(p=>p.style.display='none');
  document.querySelectorAll('.pd-exp').forEach(p=>p.style.display='none');
  document.querySelectorAll('.ac-drop').forEach(d=>d.style.display='none');
  // Reset dataset codes on autocomplete inputs
  ['df-o','df-d','if-o','if-d'].forEach(id=>{const el=$(id);if(el)el.dataset.code='';});
}

// ═══════════════════════════════════════════════
// AUTOCOMPLETE
// ═══════════════════════════════════════════════


function setupAC(inpId){
  const inp=$(inpId), drop=$(inpId+'-drop');
  if(!inp||!drop)return;
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLowerCase();
    drop.innerHTML='';
    if(q.length<1){drop.style.display='none';return;}
    const hits=AIRPORTS.filter(a=>a.c.toLowerCase().startsWith(q)||a.n.toLowerCase().includes(q)).slice(0,8);
    if(!hits.length){drop.style.display='none';return;}
    hits.forEach(a=>{
      const div=document.createElement('div');
      div.className='ac-item';
      div.innerHTML='<span>'+a.c+'</span> — '+a.n;
      div.addEventListener('mousedown',e=>{
        e.preventDefault();
        inp.value=a.d;
        inp.dataset.code=a.c;
        drop.style.display='none';
      });
      drop.appendChild(div);
    });
    drop.style.display='block';
  });
  inp.addEventListener('blur',()=>setTimeout(()=>drop.style.display='none',200));
  inp.addEventListener('focus',()=>{if(inp.value.trim().length>0)inp.dispatchEvent(new Event('input'));});
}
['df-o','df-d','if-o','if-d'].forEach(setupAC);
function setupCityAC(inpId){
  const inp=$(inpId), drop=$(inpId+'-drop');
  if(!inp||!drop)return;
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLowerCase();
    drop.innerHTML='';
    if(q.length<1){drop.style.display='none';return;}
    const hits=CITIES.filter(c=>c.key.startsWith(q)||c.key.includes(q)).slice(0,8);
    if(!hits.length){drop.style.display='none';return;}
    hits.forEach(c=>{
      const div=document.createElement('div');
      div.className='ac-item';
      div.textContent=c.display;
      div.addEventListener('mousedown',e=>{
        e.preventDefault();
        inp.value=c.display;
        drop.style.display='none';
      });
      drop.appendChild(div);
    });
    drop.style.display='block';
  });
  inp.addEventListener('blur',()=>setTimeout(()=>drop.style.display='none',200));
  inp.addEventListener('focus',()=>{if(inp.value.trim().length>0)inp.dispatchEvent(new Event('input'));});
}
['dh-city','ih-city'].forEach(setupCityAC);

// ═══════════════════════════════════════════════
// GOOGLE FORM LOGGING
// ═══════════════════════════════════════════════
const FORM='https://docs.google.com/forms/d/e/1FAIpQLSfkYiN7-jMuQePAfxmu4oGf0ieKLP--6F9KxvGdTyBZl-6GSA/formResponse';
function logUse(type,route){
  try{
    const i=localStorage.getItem('ff_inst')||'Unknown';
    const d=localStorage.getItem('ff_dept')||'Unknown';
    const url=FORM+'?entry.966295239='+encodeURIComponent(i)+'&entry.145688488='+encodeURIComponent(d)+'&entry.1072801797='+encodeURIComponent(type)+'&entry.1974151503='+encodeURIComponent(route)+'&entry.553755023='+new Date().toISOString().split('T')[0];
    fetch(url,{method:'POST',mode:'no-cors'}).catch(()=>{});
  }catch(e){}
}

// ═══════════════════════════════════════════════
// FLIGHTS
// ═══════════════════════════════════════════════
function cabMult(c){return c==='eco'?0.85:c==='biz'?3.2:1;}
function cabLabel(c){return c==='eco'?'Basic economy':c==='biz'?'Business class':'Economy extra';}

function lookFlight(pfx){
  const oEl=$(pfx+'-o'), dEl=$(pfx+'-d');
  const o=oEl.dataset.code||oEl.value;
  const d=dEl.dataset.code||dEl.value;
  const cab=$(pfx+'-cab').value;
  const type=$(pfx+'-type').value;
  const dep=$(pfx+'-dep').value;
  const err=$(pfx+'-err'), nf=$(pfx+'-nf'), res=$(pfx+'-res');

  err.style.display='none';
  nf.style.display='none';
  res.classList.remove('show');
  if(pfx==='df'){const p=$('df-pdf');if(p)p.style.display='none';}

  if(!o||!d){err.textContent='Please enter origin and destination.';err.style.display='block';return;}
  const r=findRoute(o,d);
  if(!r){nf.style.display='block';return;}

  const mult=type==='rt'?r.rt:1;
  const avg=r.mid*mult*cabMult(cab);
  activeBench={avg,from:r.from,to:r.to,type,cab,dep,pfx};

  $(pfx+'-avg').textContent=fmt(avg);
  $(pfx+'-cab-sub') && ($(pfx+'-cab-sub').textContent=cabLabel(cab));
  $(pfx+'-cab-disp').textContent=cabLabel(cab);
  $(pfx+'-lbl').textContent=r.from+' → '+r.to+' · '+(type==='rt'?'Round trip':'One way')+' · '+cabLabel(cab);
  $(pfx+'-note').innerHTML='Source: <a href="https://www.bts.gov/air-fares" target="_blank">Bureau of Transportation Statistics (BTS)</a> — US DOT official air fare database. Benchmark reflects average fares for this route and cabin class. Policy basis: UCOP G-28 authorized dates, non-refundable '+cabLabel(cab).toLowerCase()+'.';
  res.classList.add('show');

  logUse((pfx==='df'?'Domestic':'International')+' flight',r.from+'→'+r.to);
}

// ═══════════════════════════════════════════════
// DOMESTIC HOTEL
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// HOTEL RATE TABLE — Market rates USD/night (4-star avg)
// Sources: Hotels.com Price Index 2025, CheapHotels.org 2026, market data
// Update: Q2 2026 | 5-star approx 2.2x the 4-star rate
// ═══════════════════════════════════════════════
const HOTEL_RATES = {
  // ── US DOMESTIC ──
  "new york":         {s4:340, s5:750, src:"Hotels.com Price Index 2025"},
  "new york city":    {s4:340, s5:750, src:"Hotels.com Price Index 2025"},
  "nyc":              {s4:340, s5:750, src:"Hotels.com Price Index 2025"},
  "manhattan":        {s4:340, s5:750, src:"Hotels.com Price Index 2025"},
  "jersey city":      {s4:310, s5:620, src:"CheapHotels.org 2026"},
  "boston":           {s4:320, s5:700, src:"CheapHotels.org 2026"},
  "san francisco":    {s4:310, s5:680, src:"Google Hotels April 2026"},
  "sfo":              {s4:310, s5:680, src:"Google Hotels April 2026"},
  "washington":       {s4:290, s5:640, src:"CheapHotels.org 2026"},
  "washington dc":    {s4:290, s5:640, src:"CheapHotels.org 2026"},
  "chicago":          {s4:270, s5:590, src:"Hotels.com Price Index 2025"},
  "los angeles":      {s4:260, s5:580, src:"Hotels.com Price Index 2025"},
  "seattle":          {s4:250, s5:560, src:"Hotels.com Price Index 2025"},
  "miami":            {s4:280, s5:620, src:"Hotels.com 5-star avg $386"},
  "san diego":        {s4:240, s5:530, src:"CheapHotels.org +31% 2025"},
  "raleigh":          {s4:258, s5:570, src:"CheapHotels.org 2026"},
  "denver":           {s4:200, s5:440, src:"Hotels.com best value list"},
  "atlanta":          {s4:190, s5:420, src:"Hotels.com best value list"},
  "portland":         {s4:195, s5:430, src:"Hotels.com 5-star avg $287"},
  "orlando":          {s4:185, s5:410, src:"Hotels.com best value list"},
  "houston":          {s4:180, s5:400, src:"Hotels.com best value list"},
  "las vegas":        {s4:185, s5:410, src:"Hotels.com best value list"},
  "phoenix":          {s4:175, s5:385, src:"Market average 2026"},
  "dallas":           {s4:185, s5:410, src:"Hotels.com best value list"},
  "austin":           {s4:195, s5:430, src:"Market average 2026"},
  "nashville":        {s4:205, s5:455, src:"Market average 2026"},
  "new orleans":      {s4:200, s5:440, src:"Market average 2026"},
  "baltimore":        {s4:195, s5:430, src:"CheapHotels.org 2026"},
  "philadelphia":     {s4:225, s5:500, src:"Market average 2026"},
  "pittsburgh":       {s4:175, s5:385, src:"Market average 2026"},
  "minneapolis":      {s4:180, s5:400, src:"Market average 2026"},
  "detroit":          {s4:195, s5:430, src:"CheapHotels.org 2026"},
  "charlotte":        {s4:185, s5:410, src:"Market average 2026"},
  "cleveland":        {s4:160, s5:355, src:"Market average 2026"},
  "indianapolis":     {s4:160, s5:355, src:"Market average 2026"},
  "kansas city":      {s4:165, s5:365, src:"Market average 2026"},
  "st louis":         {s4:160, s5:355, src:"Market average 2026"},
  "tampa":            {s4:185, s5:410, src:"Market average 2026"},
  "sacramento":       {s4:200, s5:440, src:"Market average 2026"},
  "san jose":         {s4:270, s5:595, src:"Market average 2026"},
  "oakland":          {s4:225, s5:495, src:"Market +12% 2026"},
  "honolulu":         {s4:320, s5:700, src:"Market average 2026"},
  "anchorage":        {s4:210, s5:465, src:"Market average 2026"},
  "salt lake city":   {s4:175, s5:385, src:"Market average 2026"},
  "san antonio":      {s4:175, s5:385, src:"Hotels.com 5-star avg $340"},
  "fort worth":       {s4:175, s5:385, src:"Market average 2026"},
  "memphis":          {s4:160, s5:355, src:"Market average 2026"},
  "louisville":       {s4:165, s5:365, src:"Market average 2026"},
  "richmond":         {s4:170, s5:375, src:"Market average 2026"},
  "hartford":         {s4:175, s5:385, src:"Market average 2026"},
  "buffalo":          {s4:160, s5:355, src:"Market average 2026"},
  "rochester":        {s4:155, s5:345, src:"Market average 2026"},
  "oklahoma city":    {s4:155, s5:345, src:"Market average 2026"},
  "tucson":           {s4:150, s5:330, src:"Market average 2026"},
  "albuquerque":      {s4:160, s5:355, src:"Market average 2026"},
  "el paso":          {s4:145, s5:320, src:"Market average 2026"},
  "boise":            {s4:165, s5:365, src:"Market average 2026"},
  "spokane":          {s4:150, s5:330, src:"Market average 2026"},

  // ── CANADA ──
  "toronto":          {s4:245, s5:540, src:"CheapHotels.org 2025"},
  "vancouver":        {s4:230, s5:505, src:"Market average 2026"},
  "montreal":         {s4:210, s5:465, src:"Market average 2026"},
  "calgary":          {s4:195, s5:430, src:"Market average 2026"},
  "ottawa":           {s4:200, s5:440, src:"Market average 2026"},

  // ── MEXICO ──
  "mexico city":      {s4:145, s5:320, src:"Hotels.com great value list"},
  "cancun":           {s4:160, s5:355, src:"Market average 2026"},
  "guadalajara":      {s4:120, s5:265, src:"Market average 2026"},

  // ── LATIN AMERICA ──
  "sao paulo":        {s4:150, s5:330, src:"Hotels.com great value"},
  "rio de janeiro":   {s4:155, s5:345, src:"Market average 2026"},
  "buenos aires":     {s4:120, s5:265, src:"Market average 2026"},
  "bogota":           {s4:115, s5:255, src:"Hotels.com ADR $97 all-star"},
  "lima":             {s4:130, s5:285, src:"Market average 2026"},
  "santiago":         {s4:155, s5:345, src:"Market average 2026"},
  "panama city":      {s4:140, s5:310, src:"Market average 2026"},

  // ── UNITED KINGDOM ──
  "london":           {s4:320, s5:700, src:"CheapHotels.org avg $247 all-star 2026"},
  "edinburgh":        {s4:220, s5:485, src:"Market average 2026"},
  "manchester":       {s4:195, s5:430, src:"Market average 2026"},
  "birmingham":       {s4:180, s5:400, src:"Market average 2026"},

  // ── WESTERN EUROPE ──
  "paris":            {s4:290, s5:640, src:"Hotels avg €212/night 2026"},
  "amsterdam":        {s4:250, s5:550, src:"CheapHotels.org 2025"},
  "frankfurt":        {s4:220, s5:485, src:"Market average 2026"},
  "munich":           {s4:240, s5:530, src:"Market average 2026"},
  "berlin":           {s4:200, s5:440, src:"Market average 2026"},
  "hamburg":          {s4:195, s5:430, src:"Market average 2026"},
  "zurich":           {s4:320, s5:705, src:"CheapHotels.org global rank 3rd"},
  "geneva":           {s4:300, s5:660, src:"Market average 2026"},
  "vienna":           {s4:250, s5:550, src:"CheapHotels.org 2025"},
  "brussels":         {s4:220, s5:485, src:"Market average 2026"},
  "madrid":           {s4:230, s5:505, src:"Hotels.com +12% YoY 2025"},
  "barcelona":        {s4:215, s5:475, src:"Market average 2026"},
  "rome":             {s4:240, s5:530, src:"CheapHotels.org 2025"},
  "milan":            {s4:255, s5:560, src:"CheapHotels.org global top 10"},
  "florence":         {s4:220, s5:485, src:"Market average 2026"},
  "venice":           {s4:250, s5:550, src:"Market average 2026"},
  "lisbon":           {s4:195, s5:430, src:"Market average 2026"},
  "porto":            {s4:175, s5:385, src:"Market average 2026"},
  "athens":           {s4:180, s5:400, src:"Market average 2026"},
  "copenhagen":       {s4:265, s5:585, src:"Market average 2026"},
  "stockholm":        {s4:255, s5:560, src:"Market average 2026"},
  "oslo":             {s4:270, s5:595, src:"Market average 2026"},
  "helsinki":         {s4:220, s5:485, src:"Market average 2026"},
  "dublin":           {s4:255, s5:560, src:"Market average 2026"},
  "warsaw":           {s4:170, s5:375, src:"Market average 2026"},
  "prague":           {s4:175, s5:385, src:"Market average 2026"},
  "budapest":         {s4:165, s5:365, src:"Market average 2026"},

  // ── MIDDLE EAST ──
  "dubai":            {s4:280, s5:620, src:"Market average 2026"},
  "abu dhabi":        {s4:255, s5:560, src:"Market average 2026"},
  "doha":             {s4:210, s5:465, src:"Market average 2026"},
  "tel aviv":         {s4:270, s5:595, src:"Market average 2026"},
  "istanbul":         {s4:185, s5:410, src:"Hotels.com -2% YoY 2025"},
  "cairo":            {s4:130, s5:285, src:"Market average 2026"},
  "riyadh":           {s4:220, s5:485, src:"Market average 2026"},

  // ── AFRICA ──
  "nairobi":          {s4:155, s5:345, src:"Market average 2026"},
  "cape town":        {s4:170, s5:375, src:"Market average 2026"},
  "johannesburg":     {s4:160, s5:355, src:"Market average 2026"},
  "lagos":            {s4:175, s5:385, src:"Market average 2026"},
  "accra":            {s4:145, s5:320, src:"Market average 2026"},
  "addis ababa":      {s4:130, s5:285, src:"Market average 2026"},
  "casablanca":       {s4:145, s5:320, src:"Market average 2026"},

  // ── INDIA ──
  "mumbai":           {s4:140, s5:310, src:"Market average 2026"},
  "delhi":            {s4:130, s5:285, src:"Market average 2026"},
  "new delhi":        {s4:130, s5:285, src:"Market average 2026"},
  "bangalore":        {s4:125, s5:275, src:"Market average 2026"},
  "hyderabad":        {s4:120, s5:265, src:"Market average 2026"},
  "chennai":          {s4:120, s5:265, src:"Market average 2026"},

  // ── EAST ASIA ──
  "tokyo":            {s4:220, s5:485, src:"Hotels.com +12% YoY, weak yen 2025"},
  "osaka":            {s4:185, s5:410, src:"Market average 2026"},
  "kyoto":            {s4:195, s5:430, src:"Hotels.com +13% YoY 2025"},
  "seoul":            {s4:200, s5:440, src:"Market average 2026"},
  "beijing":          {s4:190, s5:420, src:"Market average 2026"},
  "shanghai":         {s4:200, s5:440, src:"Market average 2026"},
  "hong kong":        {s4:260, s5:575, src:"Market average 2026"},
  "taipei":           {s4:165, s5:365, src:"Market average 2026"},

  // ── SOUTHEAST ASIA ──
  "singapore":        {s4:280, s5:620, src:"Market avg $250 all-star"},
  "bangkok":          {s4:130, s5:285, src:"Hotels.com great value 5-star"},
  "kuala lumpur":     {s4:115, s5:255, src:"Market average 2026"},
  "jakarta":          {s4:110, s5:245, src:"Market average 2026"},
  "bali":             {s4:130, s5:285, src:"Market average 2026"},
  "ho chi minh city": {s4:95,  s5:210, src:"Market average 2026"},
  "hanoi":            {s4:85,  s5:190, src:"Hotels.com 5-star $156"},
  "manila":           {s4:100, s5:220, src:"Market average 2026"},
  "phuket":           {s4:120, s5:265, src:"Market average 2026"},

  // ── AUSTRALIA & NZ ──
  "sydney":           {s4:250, s5:550, src:"ADR A$275 2026"},
  "melbourne":        {s4:235, s5:520, src:"Market average 2026"},
  "brisbane":         {s4:210, s5:465, src:"ADR A$230 2026"},
  "perth":            {s4:195, s5:430, src:"Market average 2026"},
  "auckland":         {s4:210, s5:465, src:"Hotels.com 5-star $192"},

  // ── JAPAN EXTRA ──
  "sapporo":          {s4:170, s5:375, src:"Market average 2026"},
  "hiroshima":        {s4:160, s5:355, src:"Market average 2026"},
  "fukuoka":          {s4:165, s5:365, src:"Market average 2026"},
};

function lookHotel(){
  var city=document.getElementById('dh-city').value.trim();
  var addrEl=document.getElementById('dh-addr');
  var addr=addrEl?addrEl.value.trim():'';
  var checkin=document.getElementById('dh-in').value;
  var checkout=document.getElementById('dh-out').value;
  var err=document.getElementById('dh-err');
  var res=document.getElementById('dh-res');
  var btn=document.getElementById('dh-btn');
  var nearby=document.getElementById('dh-nearby');
  err.style.display='none';
  res.classList.remove('show');
  if(nearby)nearby.classList.remove('show');
  if(!city){err.textContent='Please enter a city.';err.style.display='block';return;}
  var cityKey=city.toLowerCase().trim();
  var hr=HOTEL_RATES[cityKey]||HOTEL_RATES[cityKey.split(',')[0].trim()]||null;
  var nights=1;
  if(checkin&&checkout){
    var d1=new Date(checkin),d2=new Date(checkout);
    nights=Math.max(1,Math.round((d2-d1)/86400000));
  }
  var s4=hr?hr.s4:207;
  var s5=hr?hr.s5:455;
  var src=hr?hr.src:'National average market rate';
  var cityDisplay=city.split(' ').map(function(w){return w?w[0].toUpperCase()+w.slice(1):'';}).join(' ');
  document.getElementById('dh-avg').textContent=fmt(s4);
  document.getElementById('dh-n').textContent=nights;
  document.getElementById('dh-lbl').textContent=cityDisplay;
  document.getElementById('dh-note').innerHTML='<b>4&#9733; avg: '+fmt(s4)+'/night &nbsp;|&nbsp; 5&#9733; avg: '+fmt(s5)+'/night</b><br>Source: '+src+'. G-28 domestic cap: $333/night. Conference hotel exception: attach agenda if rate exceeds cap.';
  res.classList.add('show');
  logUse('Domestic hotel',city);
  if(addr)findNearbyHotels(addr,city,s4);
}

async function findNearbyHotels(addr, city, marketRate){
  try{
    // Geocode the address
    // Combine city + address to prevent wrong-city geocoding
    const cityVal=$('dh-city')?$('dh-city').value.trim():'';
    const searchQuery=cityVal?addr+', '+cityVal:addr;
    const geoResp=await fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(searchQuery)+'&format=json&limit=1&countrycodes='+encodeURIComponent('us,gb,ca,au,de,fr,jp,sg,nl,ch,at,be,dk,fi,gr,ie,it,no,pt,es,se,ae,il,in,kr,cn,hk,tw,th,my,nz,za,br,mx'),{headers:{'Accept-Language':'en','User-Agent':'FairFares/1.0'}});
    const geoData=await geoResp.json();
    if(!geoData||!geoData.length) return;

    const lat=parseFloat(geoData[0].lat);
    const lon=parseFloat(geoData[0].lon);
    const radius=1609; // 1 mile in metres

    // Query Overpass for hotels 4-star+ within 1 mile
    const query='[out:json][timeout:15];(node["tourism"="hotel"]["stars"~"^[4-5]$"](around:'+radius+','+lat+','+lon+');way["tourism"="hotel"]["stars"~"^[4-5]$"](around:'+radius+','+lat+','+lon+');node["tourism"="hotel"](around:'+radius+','+lat+','+lon+'););out center;';
    const ovResp=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query));
    const ovData=await ovResp.json();
    const hotels=(ovData.elements||[]).filter(h=>h.tags&&h.tags.tourism==='hotel');
    const starred=hotels.filter(h=>parseInt(h.tags&&h.tags.stars||0)>=4);
    const allHotels=starred.length>0?starred:hotels;

    // ── BUILD LEAFLET MAP ──
    const mapEl=$('dh-map');
    mapEl.style.display='block';
    // Destroy previous map instance if exists
    if(window._dhMap){window._dhMap.remove();window._dhMap=null;}
    const map=L.map('dh-map').setView([lat,lon],14);
    window._dhMap=map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom:19
    }).addTo(map);

    // 1-mile circle
    L.circle([lat,lon],{radius:1609,color:'#0d9e8a',fillColor:'#0d9e8a',fillOpacity:0.08,weight:2}).addTo(map);

    // Address pin
    const addressIcon=L.divIcon({
      html:'<div style="width:14px;height:14px;background:#0a1628;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
      className:'',iconSize:[14,14],iconAnchor:[7,7]
    });
    L.marker([lat,lon],{icon:addressIcon}).addTo(map).bindPopup('<b>Search address</b><br>'+addr);

    // Hotel pins
    const hotelIcon=L.divIcon({
      html:'<div style="width:12px;height:12px;background:#0d9e8a;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
      className:'',iconSize:[12,12],iconAnchor:[6,6]
    });
    allHotels.forEach(h=>{
      const hlat=h.lat||(h.center&&h.center.lat);
      const hlon=h.lon||(h.center&&h.center.lon);
      if(!hlat||!hlon)return;
      const name=(h.tags.name||'Hotel');
      const stars=h.tags.stars?'★'.repeat(parseInt(h.tags.stars)):'';
      const est=Math.round(marketRate*(parseInt(h.tags.stars||4)>=5?1.95:1.4));
      L.marker([hlat,hlon],{icon:hotelIcon}).addTo(map)
       .bindPopup('<b>'+name+'</b>'+(stars?'<br>'+stars:'')+'<br>Est. ~'+fmt(est)+'/night');
    });

    // Force map to render correctly after container becomes visible
    setTimeout(()=>map.invalidateSize(),100);

    // ── BUILD TABLE ──
    if(!allHotels.length){
      $('dh-nearby-lbl').textContent='Hotels near '+addr+' (1 mile radius)';
      $('dh-hotel-list').innerHTML='<p style="font-size:.84rem;color:var(--g600);margin-top:4px">No 4-star+ hotels found in OpenStreetMap data for this area. OSM coverage varies — the map shows all hotels found. The market rate benchmark of '+fmt(marketRate)+'/night applies.</p>';
    }else{
      const sorted=allHotels.sort((a,b)=>(parseInt(b.tags&&b.tags.stars||3))-(parseInt(a.tags&&a.tags.stars||3))).slice(0,10);
      let table='<table style="width:100%;border-collapse:collapse;font-size:.84rem;margin-top:8px">';
      table+='<thead><tr style="border-bottom:2px solid var(--g200)"><th style="text-align:left;padding:6px 0;font-size:.7rem;color:var(--g600);text-transform:uppercase">Hotel</th><th style="text-align:center;padding:6px 0;font-size:.7rem;color:var(--g600);text-transform:uppercase">Stars</th><th style="text-align:right;padding:6px 0;font-size:.7rem;color:var(--g600);text-transform:uppercase">Est. rate</th></tr></thead><tbody>';
      sorted.forEach(h=>{
        const name=(h.tags.name||'Unnamed hotel');
        const stars=parseInt(h.tags&&h.tags.stars||4);
        const est=Math.round(marketRate*(stars>=5?1.95:1.4));
        table+='<tr style="border-bottom:0.5px solid var(--g100)"><td style="padding:7px 0;color:var(--navy)">'+name+'</td><td style="text-align:center;padding:7px 0;color:#b7791f">'+('★'.repeat(stars))+'</td><td style="text-align:right;padding:7px 0;font-weight:500;color:var(--navy)">~'+fmt(est)+'/night</td></tr>';
      });
      table+='</tbody></table>';
      if(allHotels.length>10)table+='<p style="font-size:.72rem;color:var(--g400);margin-top:4px">Showing top 10 of '+allHotels.length+' hotels found.</p>';
      $('dh-nearby-lbl').textContent=allHotels.length+' hotel'+(allHotels.length!==1?'s':'')+' within 1 mile of '+addr;
      $('dh-hotel-list').innerHTML=table;
    }

    $('dh-nearby-note').innerHTML='Map and hotel data: <a href="https://www.openstreetmap.org" target="_blank">OpenStreetMap</a> contributors via Overpass API. Nightly rates are estimates based on local market average × star rating multiplier.';
    $('dh-nearby').classList.add('show');

  }catch(e){
    console.log('Nearby search error:',e);
  }
}


// ═══════════════════════════════════════════════
// GROUND TRANSPORT — geocode then calc
// ═══════════════════════════════════════════════
let gtGeoTimer=null;
let gtFromCoord=null, gtToCoord=null;

function gtGeo(){
  clearTimeout(gtGeoTimer);
  gtGeoTimer=setTimeout(doGeoLookup,800);
// Hotel city list — same pattern as AIRPORTS
const CITIES = Object.keys(HOTEL_RATES).map(function(k){
  return {
    key: k,
    display: k.split(' ').map(function(w){return w?w[0].toUpperCase()+w.slice(1):'';}).join(' ')
  };
}).sort(function(a,b){return a.key.localeCompare(b.key);});


}

async function geocode(query){
  try{
    const url='https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(query)+'&format=json&limit=1';
    const resp=await fetch(url,{headers:{'Accept-Language':'en','User-Agent':'FairFares/1.0'}});
    const data=await resp.json();
    if(data&&data.length>0) return {lat:parseFloat(data[0].lat),lon:parseFloat(data[0].lon),display:data[0].display_name};
    return null;
  }catch(e){return null;}
}

async function doGeoLookup(){
  const fromVal=$('gt-from').value.trim();
  const toVal=$('gt-to').value.trim();
  if(fromVal.length<3||toVal.length<3)return;
  // Geocode both in parallel
  [gtFromCoord,gtToCoord]=await Promise.all([geocode(fromVal),geocode(toVal)]);
}

function detectCity(lat,lon){
  // Rough city detection from coords
  const cities=[
    {k:'sf',  lat:37.75,lon:-122.42,r:0.5},{k:'la',  lat:34.05,lon:-118.35,r:0.7},
    {k:'nyc', lat:40.72,lon:-73.95, r:0.5},{k:'chi', lat:41.88,lon:-87.75, r:0.5},
    {k:'bos', lat:42.36,lon:-71.06, r:0.4},{k:'dc',  lat:38.90,lon:-77.04, r:0.4},
    {k:'sea', lat:47.61,lon:-122.33,r:0.4},{k:'mia', lat:25.79,lon:-80.22, r:0.5},
    {k:'den', lat:39.74,lon:-104.98,r:0.5},{k:'atl', lat:33.75,lon:-84.39, r:0.5},
    {k:'lon', lat:51.51,lon:-0.13,  r:0.5},{k:'par', lat:48.85,lon:2.35,   r:0.5},
    {k:'tok', lat:35.68,lon:139.76, r:0.5},{k:'syd', lat:-33.87,lon:151.21,r:0.5},
    {k:'sin', lat:1.35, lon:103.82, r:0.3},
  ];
  for(const c of cities){
    const d=Math.sqrt(Math.pow(lat-c.lat,2)+Math.pow(lon-c.lon,2));
    if(d<c.r)return c.k;
  }
  return 'default';
}

function haversine(lat1,lon1,lat2,lon2){
  const R=3958.8;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

async function calcGT(){
  const fromVal=$('gt-from').value.trim();
  const toVal=$('gt-to').value.trim();
  const err=$('gt-err'), btn=$('gt-btn');
  err.style.display='none';
  if(!fromVal||!toVal){err.textContent='Please enter pickup and dropoff locations.';err.style.display='block';return;}

  btn.disabled=true; btn.textContent='Calculating…';

  // Geocode if not already done
  if(!gtFromCoord)gtFromCoord=await geocode(fromVal);
  if(!gtToCoord)gtToCoord=await geocode(toVal);

  if(!gtFromCoord||!gtToCoord){
    err.textContent='Could not find one or both locations. Try being more specific (e.g. add city name).';
    err.style.display='block';
    btn.disabled=false; btn.textContent='Get fare estimates';
    return;
  }

  // Distance
  const asCrow=haversine(gtFromCoord.lat,gtFromCoord.lon,gtToCoord.lat,gtToCoord.lon);
  const miles=parseFloat((asCrow*1.35).toFixed(1)); // road factor
  const cityKey=detectCity(gtFromCoord.lat,gtFromCoord.lon);
  const r=GT_RATES[cityKey]||GT_RATES.default;
  const avgSpeed={sf:18,la:16,nyc:14,chi:20,bos:18,dc:20,sea:20,mia:22,den:25,atl:22,lon:12,par:14,tok:12,syd:22,sin:20,default:20}[cityKey]||20;
  const mins=Math.round((miles/avgSpeed)*60);

  // Taxi
  const tBase=r.base, tMeter=parseFloat((miles*r.mile).toFixed(2)), tTime=parseFloat((mins*r.min).toFixed(2));
  const tTotal=tBase+tMeter+tTime;
  // Uber X
  const uBase=1.30,uDist=parseFloat((miles*1.45).toFixed(2)),uTime=parseFloat((mins*0.28).toFixed(2)),uSafe=1.80;
  const uTotal=uBase+uDist+uTime+uSafe;
  // Lyft
  const lBase=1.20,lDist=parseFloat((miles*1.42).toFixed(2)),lTime=parseFloat((mins*0.26).toFixed(2)),lSafe=1.75;
  const lTotal=lBase+lDist+lTime+lSafe;

  // Build tables
  const mkRow=(l,v)=>'<tr><td>'+l+'</td><td>'+v+'</td></tr>';
  $('gt-taxi-rows').innerHTML=mkRow('Initial charge',fmt(tBase))+mkRow('Metered fare ('+miles+' mi)',fmt(tMeter))+mkRow('Time charge (~'+mins+' min)',fmt(tTime));
  $('gt-taxi-tot').textContent=fmt(tTotal);
  $('gt-taxi-src').innerHTML='Source: <a href="https://taxifarefinder.com" target="_blank">TaxiFareFinder.com</a> — '+r.name+'. Straight-line distance '+asCrow.toFixed(1)+' mi × 1.35 road factor = '+miles+' mi estimated route.';

  $('gt-uber-rows').innerHTML=mkRow('Base fare',fmt(uBase))+mkRow('Distance ('+miles+' mi)',fmt(uDist))+mkRow('Time (~'+mins+' min)',fmt(uTime))+mkRow('Safe rides fee',fmt(uSafe));
  $('gt-uber-tot').textContent=fmt(uTotal);

  $('gt-lyft-rows').innerHTML=mkRow('Base fare',fmt(lBase))+mkRow('Distance ('+miles+' mi)',fmt(lDist))+mkRow('Time (~'+mins+' min)',fmt(lTime))+mkRow('Trust & service fee',fmt(lSafe));
  $('gt-lyft-tot').textContent=fmt(lTotal);

  // Verdict
  const lowest=Math.min(tTotal,uTotal,lTotal);
  const lowestName=lowest===tTotal?'Taxi':lowest===uTotal?'Uber X':'Lyft';
  $('gt-vt').textContent='G-28 benchmark: '+fmt(lowest)+' ('+lowestName+')';
  $('gt-vb').textContent=lowestName+' is the most economical option for '+fromVal+' to '+toVal+'. Under G-28, any ground transport reimbursement is capped at the most economical mode for the same route ('+fmt(lowest)+'). If a rental car was used, the total cost (rental + gas + parking + tolls) must be less than this figure to be fully reimbursable.';

  $('gt-lbl').textContent=fromVal+' → '+toVal;

  // Map via OpenStreetMap
  const lat1=gtFromCoord.lat,lon1=gtFromCoord.lon,lat2=gtToCoord.lat,lon2=gtToCoord.lon;
  const minLat=Math.min(lat1,lat2)-0.02, maxLat=Math.max(lat1,lat2)+0.02;
  const minLon=Math.min(lon1,lon2)-0.02, maxLon=Math.max(lon1,lon2)+0.02;
  $('gt-map').src='https://www.openstreetmap.org/export/embed.html?bbox='+minLon+','+minLat+','+maxLon+','+maxLat+'&layer=mapnik&marker='+lat1+','+lon1;
  $('gt-map-wrap').style.display='block';

  $('gt-res').classList.add('show');
  logUse('Ground transport',fromVal+' to '+toVal);

  btn.disabled=false; btn.textContent='Get fare estimates';
}

function gtTab(t,el){
  document.querySelectorAll('.gt-tab').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.gt-panel').forEach(x=>x.classList.remove('on'));
  el.classList.add('on');
  $('gt-'+t+'-p').classList.add('on');
}

// ═══════════════════════════════════════════════
// TRAVEL ADVISORIES
// ═══════════════════════════════════════════════
function lookAdv(){
  const input=$('adv-in').value.trim().toLowerCase();
  const err=$('adv-err');
  err.style.display='none'; $('adv-res').style.display='none';
  if(!input){err.textContent='Please enter a country name.';err.style.display='block';return;}
  const data=ADV_DATA[input];
  if(!data){
    err.innerHTML='Country not in our database. <a href="https://travel.state.gov" target="_blank" style="color:var(--teal)">Check travel.state.gov directly →</a>';
    err.style.display='block'; return;
  }
  const lvl=ADV_LEVELS[data.level];
  $('adv-hd').className='adv-hd '+lvl.cls;
  $('adv-cn').textContent=$('adv-in').value.trim().replace(/\b\w/g,c=>c.toUpperCase());
  $('adv-lt').textContent=lvl.lbl;
  $('adv-badge').textContent=lvl.badge;
  $('adv-badge').className='adv-badge '+lvl.cls;
  $('adv-msg').textContent=data.msg;
  $('adv-url').href=data.url;
  $('adv-res').style.display='block';
  logUse('Advisory',input);
}
function qa(el){$('adv-in').value=el.textContent;lookAdv();}

// ═══════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════
function renderAdmin(){
  const tb=$('adm-body'); tb.innerHTML='';
  routes.forEach((r,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+r.from+'</td><td>'+r.to+'</td><td><input type="number" value="'+r.low+'" onchange="routes['+i+'].low=+this.value"></td><td><input type="number" value="'+r.mid+'" onchange="routes['+i+'].mid=+this.value"></td><td><input type="number" value="'+r.high+'" onchange="routes['+i+'].high=+this.value"></td><td><input type="number" value="'+r.rt+'" step="0.1" onchange="routes['+i+'].rt=+this.value"></td><td><button class="delbtn" onclick="routes.splice('+i+',1);renderAdmin()">✕</button></td>';
    tb.appendChild(tr);
  });
}
function addRoute(){
  const f=norm($('nr-f').value),t=norm($('nr-t').value);
  const lo=+$('nr-l').value,mi=+$('nr-m').value,hi=+$('nr-h').value,rt=+$('nr-r').value||1.7;
  if(!f||!t||!lo||!mi||!hi){$('adm-err').style.display='block';return;}
  $('adm-err').style.display='none';
  routes.push({from:f,to:t,low:lo,mid:mi,high:hi,rt});
  ['nr-f','nr-t','nr-l','nr-m','nr-h','nr-r'].forEach(id=>$(id).value='');
  renderAdmin();
}
function exportData(){
  const blob=new Blob([JSON.stringify({version:'7.0',updated:'Q2 2026',routes},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fairfares-benchmarks.json';a.click();
}
function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.routes)routes=d.routes;renderAdmin();}catch{alert('Invalid JSON.');}};
  reader.readAsText(file);
}

function printTab(t){
  var s=document.createElement("style");
  s.id="print-override";
  s.textContent="@media print{nav,.hero,.sec:not(.tool-sec),footer,.ttabs,.lbtn,.pdf-btn,.errmsg,.nf,.f,.slbl,.ibox,.g2,.g3,.pd-rule{display:none!important}.tp{display:none!important}.tp.on{display:block!important}.rbox{display:block!important}.rbox:not(.show){display:none!important}.pd-exp{display:block!important}.map-wrap{display:block!important}.gt-panel{display:none!important}.gt-panel.on{display:block!important}body{font-family:serif}.tw{box-shadow:none;border:none}}";
  document.head.appendChild(s);
  var h=document.createElement("div");
  h.id="print-hdr";
  h.style.cssText="display:block;font-family:serif;padding:1rem 0 .5rem;border-bottom:2px solid #0a1628;margin-bottom:1rem";
  h.innerHTML="<b>FairFares</b> <span style='color:#0d9e8a'>getfairfares.com</span><span style='float:right;font-size:.8rem;color:#666'>"+new Date().toLocaleString()+"</span>";
  document.body.insertBefore(h,document.body.firstChild);
  window.print();
  setTimeout(function(){
    var se=document.getElementById("print-override");
    var he=document.getElementById("print-hdr");
    if(se)se.remove();
    if(he)he.remove();
  },1000);
}
