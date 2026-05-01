// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(n).toLocaleString();
const norm = s => (s||'').trim().toUpperCase();

// ═══════════════════════════════════════════════
// AMADEUS FLIGHT PRICE ANALYSIS
// Get API key: developers.amadeus.com (free — 2,000 calls/month)
// Set your keys in the two lines below
// ═══════════════════════════════════════════════
const AMADEUS_KEY    = '';  // paste your API key here
const AMADEUS_SECRET = '';  // paste your API secret here
let _amadeusToken = null;
let _amadeusTokenExpiry = 0;

async function getAmadeusToken(){
  if(_amadeusToken && Date.now() < _amadeusTokenExpiry) return _amadeusToken;
  if(!AMADEUS_KEY || !AMADEUS_SECRET) return null;
  try{
    const r = await fetch('https://api.amadeus.com/v1/security/oauth2/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=client_credentials&client_id='+AMADEUS_KEY+'&client_secret='+AMADEUS_SECRET
    });
    const d = await r.json();
    if(d.access_token){
      _amadeusToken = d.access_token;
      _amadeusTokenExpiry = Date.now() + (d.expires_in - 60) * 1000;
      return _amadeusToken;
    }
  }catch(e){}
  return null;
}

async function getAmadeusPrice(from, to, depDate, isRoundTrip){
  const token = await getAmadeusToken();
  if(!token) return null;
  try{
    const params = new URLSearchParams({
      originIataCode: from,
      destinationIataCode: to,
      departureDate: depDate || new Date().toISOString().split('T')[0],
      currencyCode: 'USD',
      oneWay: isRoundTrip ? 'false' : 'true'
    });
    const r = await fetch('https://api.amadeus.com/v1/analytics/itinerary-price-metrics?'+params,{
      headers:{'Authorization':'Bearer '+token}
    });
    if(!r.ok) return null;
    const d = await r.json();
    if(!d.data || !d.data[0] || !d.data[0].priceMetrics) return null;
    const metrics = d.data[0].priceMetrics;
    const find = rank => {
      const m = metrics.find(x=>x.quintileRanking===rank);
      return m ? parseFloat(m.amount) : null;
    };
    return {
      min:    find('MINIMUM'),
      low:    find('FIRST'),
      mid:    find('MEDIUM'),
      high:   find('THIRD'),
      max:    find('MAXIMUM'),
      source: 'Amadeus Flight Price Analysis API'
    };
  }catch(e){ return null; }
}



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
['dh-city','ih-city'].forEach(setupCityAC);
['gt-from','gt-to'].forEach(setupAddressAC);


// ═══════════════════════════════════════════════
// ADDRESS AUTOCOMPLETE (Nominatim)
// ═══════════════════════════════════════════════
function setupAddressAC(inpId){
  const inp=$(inpId), drop=$(inpId+'-drop');
  if(!inp||!drop) return;
  let timer=null;
  inp.addEventListener('input',()=>{
    clearTimeout(timer);
    const q=inp.value.trim();
    drop.innerHTML='';
    if(q.length<3){drop.style.display='none';return;}
    timer=setTimeout(async ()=>{
      try{
        const url='https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)
          +'&format=json&limit=6&addressdetails=1';
        const r=await fetch(url,{headers:{'Accept-Language':'en','User-Agent':'FairFares/1.0'}});
        const results=await r.json();
        drop.innerHTML='';
        if(!results.length){drop.style.display='none';return;}
        results.forEach(place=>{
          const div=document.createElement('div');
          div.className='ac-item';
          // Show a clean short label
          const addr=place.address||{};
          const parts=[
            place.name||addr.amenity||addr.building||addr.road||'',
            addr.city||addr.town||addr.village||addr.county||'',
            addr.state||'',
            addr.country_code?addr.country_code.toUpperCase():''
          ].filter(Boolean);
          div.textContent=parts.slice(0,3).join(', ');
          div.addEventListener('mousedown',e=>{
            e.preventDefault();
            inp.value=div.textContent;
            inp.dataset.lat=place.lat;
            inp.dataset.lon=place.lon;
            drop.style.display='none';
            // Trigger the geo lookup
            gtGeo();
          });
          drop.appendChild(div);
        });
        drop.style.display=results.length?'block':'none';
      }catch(e){drop.style.display='none';}
    },400);
  });
  inp.addEventListener('blur',()=>setTimeout(()=>drop.style.display='none',200));
}


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
  const cm=cabMult(cab);
  const staticHigh=Math.round(r.high*mult*cm);
  const staticAvg=Math.round(r.mid*mult*cm);

  // Show static result immediately, then try Amadeus upgrade
  activeBench={avg:staticHigh,from:r.from,to:r.to,type,cab,dep,pfx};
  $(pfx+'-avg').textContent=fmt(staticHigh);
  $(pfx+'-cab-sub') && ($(pfx+'-cab-sub').textContent=cabLabel(cab));
  $(pfx+'-cab-disp').textContent=cabLabel(cab);
  $(pfx+'-lbl').textContent=r.from+' → '+r.to+' · '+(type==='rt'?'Round trip':'One way')+' · '+cabLabel(cab);
  $(pfx+'-note').innerHTML='<b>High-end benchmark: '+fmt(staticHigh)+'</b> &nbsp;|&nbsp; Market avg: '+fmt(staticAvg)
    +'<br>Source: FairFares static table derived from <a href="https://www.bts.gov/air-fares" target="_blank">BTS</a> historical averages. Checking live Amadeus data…';
  res.classList.add('show');
  if(pfx==='df') logUse('Domestic flight',r.from+'→'+r.to);
  else logUse('International flight',r.from+'→'+r.to);

  // Try Amadeus Flight Price Analysis for more accurate pricing
  if(AMADEUS_KEY){
    getAmadeusPrice(r.from, r.to, dep, type==='rt').then(function(am){
      if(!am || !am.max) return; // fall back to static
      // Use MAXIMUM quintile as the high-end benchmark
      const amHigh = Math.round(am.max * cm);
      const amMid  = Math.round(am.mid * cm);
      // Use whichever is higher — static or Amadeus
      const displayHigh = Math.max(amHigh, staticHigh);
      activeBench.avg = displayHigh;
      $(pfx+'-avg').textContent=fmt(displayHigh);
      $(pfx+'-note').innerHTML='<b>High-end benchmark: '+fmt(displayHigh)+'</b> &nbsp;|&nbsp; Market avg: '+fmt(amMid)
        +'<br>Source: <a href="https://developers.amadeus.com" target="_blank">Amadeus Flight Price Analysis API</a> — live market data. '
        +'Policy basis: UCOP G-28, non-refundable '+cabLabel(cab).toLowerCase()+'.';
    }).catch(function(){
      // Already showing static result — just update the note
      $(pfx+'-note').innerHTML='<b>High-end benchmark: '+fmt(staticHigh)+'</b> &nbsp;|&nbsp; Market avg: '+fmt(staticAvg)
        +'<br>Source: FairFares static table derived from <a href="https://www.bts.gov/air-fares" target="_blank">BTS</a> historical averages. '
        +'Policy basis: UCOP G-28, non-refundable '+cabLabel(cab).toLowerCase()+'.';
    });
  } else {
    $(pfx+'-note').innerHTML='<b>High-end benchmark: '+fmt(staticHigh)+'</b> &nbsp;|&nbsp; Market avg: '+fmt(staticAvg)
      +'<br>Source: FairFares static table derived from <a href="https://www.bts.gov/air-fares" target="_blank">BTS</a> historical averages. '
      +'Policy basis: UCOP G-28, non-refundable '+cabLabel(cab).toLowerCase()+'.'
      +'<br><small style="color:var(--g400)">Add Amadeus API key in app.js for live pricing.</small>';
  }


}

// ═══════════════════════════════════════════════
// DOMESTIC HOTEL
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// HOTEL RATE TABLE — Market rates USD/night (4-star avg)
// Sources: Hotels.com Price Index 2025, CheapHotels.org 2026, market data
// Update: Q2 2026 | 5-star approx 2.2x the 4-star rate
// ═══════════════════════════════════════════════


function lookHotel(){
  var city=$('dh-city').value.trim();
  var addrEl=$('dh-addr');
  var addr=addrEl?addrEl.value.trim():'';
  var checkin=$('dh-in').value;
  var checkout=$('dh-out').value;
  var err=$('dh-err'),res=$('dh-res'),btn=$('dh-btn');
  var nearby=$('dh-nearby');
  err.style.display='none';
  res.classList.remove('show');
  if(nearby)nearby.classList.remove('show');
  if(!city){err.textContent='Please enter a city.';err.style.display='block';return;}
  var key=city.toLowerCase().trim();
  var hr=HOTEL_RATES[key]||HOTEL_RATES[key.split(',')[0].trim()]||null;
  var nights=1;
  if(checkin&&checkout){
    var d1=new Date(checkin),d2=new Date(checkout);
    nights=Math.max(1,Math.round((d2-d1)/86400000));
  }
  var baseS4=hr?hr.s4:207, baseS5=hr?hr.s5:455;
  var src=hr?hr.src:'National average — check gsa.gov for exact rates';
  // Apply seasonal multiplier based on check-in month
  var month=checkin?new Date(checkin).getMonth():new Date().getMonth();
  var s4=getSeasonalRate(key,baseS4,month);
  var s5=getSeasonalRate(key,baseS5,month);
  var monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var label=city.split(' ').map(function(w){return w?w[0].toUpperCase()+w.slice(1):'';}).join(' ');
  $('dh-avg').textContent=fmt(s4);
  $('dh-n').textContent=nights;
  $('dh-lbl').textContent=label;
  // Apply a 15% high-end uplift to give a defensible upper-range benchmark
  var s4high=Math.round(s4*1.15);
  $('dh-note').innerHTML='<b>4&#9733; high-end benchmark: '+fmt(s4high)+'/night</b> ('+monthNames[month]+' seasonal rate)'
    +'<br>4&#9733; market avg: '+fmt(s4)+' &nbsp;|&nbsp; 5&#9733; avg: '+fmt(s5)
    +'<br>Source: '+src+'. G-28 domestic cap: $333/night.';
  // Update displayed rate to high-end
  $('dh-avg').textContent=fmt(s4high);
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
  const fromEl=$('gt-from'), toEl=$('gt-to');
  const fromVal=fromEl.value.trim();
  const toVal=toEl.value.trim();
  if(fromVal.length<3||toVal.length<3)return;
  // Use pre-geocoded coords from autocomplete selection if available
  if(fromEl.dataset&&fromEl.dataset.lat) gtFromCoord={lat:parseFloat(fromEl.dataset.lat),lon:parseFloat(fromEl.dataset.lon)};
  else gtFromCoord=null;
  if(toEl.dataset&&toEl.dataset.lat) gtToCoord={lat:parseFloat(toEl.dataset.lat),lon:parseFloat(toEl.dataset.lon)};
  else gtToCoord=null;
  if(!gtFromCoord||!gtToCoord){
    [gtFromCoord,gtToCoord]=await Promise.all([
      gtFromCoord||geocode(fromVal),
      gtToCoord||geocode(toVal)
    ]);
  }
}

function haversine(lat1,lon1,lat2,lon2){
  const R=3958.8;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function detectCity(lat,lon){
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

  // Taxi — with airport surcharge and tip
  const tBase=r.base;
  const tMeter=parseFloat((miles*r.mile).toFixed(2));
  const tTime=parseFloat((mins*r.min).toFixed(2));
  const tApt=r.apt||0;
  const tSubtotal=tBase+tMeter+tTime+tApt;
  const tTip=parseFloat((tSubtotal*(r.tip||0.18)).toFixed(2));
  const tTotal=parseFloat((tSubtotal+tTip).toFixed(2));
  // Uber X
  const uBase=1.30,uDist=parseFloat((miles*1.45).toFixed(2)),uTime=parseFloat((mins*0.28).toFixed(2)),uSafe=1.80;
  const uApt=tApt;
  const uSubtotal=parseFloat((uBase+uDist+uTime+uSafe+uApt).toFixed(2));
  const uTip=parseFloat((uSubtotal*0.15).toFixed(2));
  const uTotal=parseFloat((uSubtotal+uTip).toFixed(2));
  // Lyft
  const lBase=1.20,lDist=parseFloat((miles*1.42).toFixed(2)),lTime=parseFloat((mins*0.26).toFixed(2)),lSafe=1.75;
  const lApt=tApt;
  const lSubtotal=parseFloat((lBase+lDist+lTime+lSafe+lApt).toFixed(2));
  const lTip=parseFloat((lSubtotal*0.15).toFixed(2));
  const lTotal=parseFloat((lSubtotal+lTip).toFixed(2));

  // Build tables
  const mkRow=(l,v)=>'<tr><td>'+l+'</td><td>'+v+'</td></tr>';
  const aptRow=tApt>0?mkRow('Airport surcharge',fmt(tApt)):'';
  const tollNote=(r.toll&&r.tollNote)?'<br><small style="color:#888">&#9888; '+r.tollNote+'</small>':'';

  $('gt-taxi-rows').innerHTML=
    mkRow('Flag fall',fmt(tBase))
    +mkRow('Distance ('+miles+' mi)',fmt(tMeter))
    +mkRow('Time (~'+mins+' min)',fmt(tTime))
    +aptRow
    +mkRow('Subtotal',fmt(tSubtotal))
    +mkRow('Tip ('+Math.round((r.tip||0.18)*100)+'%)',fmt(tTip));
  $('gt-taxi-tot').textContent=fmt(tTotal);
  $('gt-taxi-src').innerHTML='Source: '+r.name+' — calculated from straight-line distance '+asCrow.toFixed(1)+' mi x 1.35 road factor = '+miles+' mi.'+tollNote;

  $('gt-uber-rows').innerHTML=
    mkRow('Base fare',fmt(uBase))
    +mkRow('Distance ('+miles+' mi)',fmt(uDist))
    +mkRow('Time (~'+mins+' min)',fmt(uTime))
    +mkRow('Safe rides fee',fmt(uSafe))
    +(uApt>0?mkRow('Airport surcharge',fmt(uApt)):'')
    +mkRow('Subtotal',fmt(uSubtotal))
    +mkRow('Tip (15%)',fmt(uTip));
  $('gt-uber-tot').textContent=fmt(uTotal);

  $('gt-lyft-rows').innerHTML=
    mkRow('Base fare',fmt(lBase))
    +mkRow('Distance ('+miles+' mi)',fmt(lDist))
    +mkRow('Time (~'+mins+' min)',fmt(lTime))
    +mkRow('Trust & service fee',fmt(lSafe))
    +(lApt>0?mkRow('Airport surcharge',fmt(lApt)):'')
    +mkRow('Subtotal',fmt(lSubtotal))
    +mkRow('Tip (15%)',fmt(lTip));
  $('gt-lyft-tot').textContent=fmt(lTotal);

  // Verdict
  const lowest=Math.min(tTotal,uTotal,lTotal);
  const lowestName=lowest===tTotal?'Taxi':lowest===uTotal?'Uber X':'Lyft';
  $('gt-vt').textContent='G-28 benchmark: '+fmt(lowest)+' ('+lowestName+')';
  $('gt-vb').textContent='If a rental car was used, the total cost (rental + gas + parking + tolls) must be less than '+fmt(lowest)+' to be fully reimbursable.';

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
  var raw = document.getElementById('adv-in').value.trim();
  var input = raw.toLowerCase();
  var err = document.getElementById('adv-err');
  var res = document.getElementById('adv-res');
  err.style.display = 'none';
  res.style.display = 'none';
  if(!input){
    err.textContent = 'Please enter a country name.';
    err.style.display = 'block';
    return;
  }
  var rec = ADV_DATA[input];
  if(!rec){
    err.textContent = 'Country not in our database. Check travel.state.gov directly.';
    err.style.display = 'block';
    return;
  }
  var lvl = ADV_LEVELS[rec.level];
  if(!lvl){
    err.textContent = 'Advisory data error for level ' + rec.level;
    err.style.display = 'block';
    return;
  }
  document.getElementById('adv-hd').className = 'adv-hd ' + lvl.cls;
  document.getElementById('adv-cn').textContent = raw.charAt(0).toUpperCase() + raw.slice(1);
  document.getElementById('adv-lt').textContent = lvl.lbl;
  document.getElementById('adv-badge').textContent = lvl.badge;
  document.getElementById('adv-badge').className = 'adv-badge ' + lvl.cls;
  document.getElementById('adv-msg').textContent = rec.msg;
  document.getElementById('adv-url').href = rec.url;
  res.style.display = 'block';
  logUse('Advisory', input);
}

function qa(el){document.getElementById('adv-in').value=el.textContent;lookAdv();}

// ═══════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════


function lookIntlHotel(){
  var city=$('ih-city').value.trim();
  var ctry=$('ih-ctry').value;
  var checkin=$('ih-in').value;
  var checkout=$('ih-out').value;
  var err=$('ih-err'), res=$('ih-res');
  err.style.display='none';
  res.classList.remove('show');
  if(!city||!ctry){err.textContent='Please enter city and country.';err.style.display='block';return;}

  var nights=1;
  if(checkin&&checkout){
    var d1=new Date(checkin),d2=new Date(checkout);
    nights=Math.max(1,Math.round((d2-d1)/86400000));
  }

  // Look up rate from HOTEL_RATES
  var key=city.toLowerCase().trim();
  var hr=HOTEL_RATES[key]||HOTEL_RATES[key.split(',')[0].trim()]||null;

  // Also look up per diem from INTL_HOTELS
  var pd=INTL_HOTELS.find(function(h){return h.city.toUpperCase()===city.toUpperCase()&&h.country===ctry;});

  if(!hr&&!pd){
    err.textContent='City not in our table yet. Use the DoD per diem link for exact rates.';
    err.style.display='block';
    $('pd-exp').style.display='block';
    return;
  }

  var s4=hr?hr.s4:(pd?pd.mid:200);
  var s5=hr?hr.s5:Math.round(s4*2.2);
  var src=hr?hr.src:'FairFares curated rate table';
  var label=city.split(' ').map(function(w){return w?w[0].toUpperCase()+w.slice(1):'';}).join(' ');

  $('ih-avg').textContent=fmt(s4);
  $('ih-n').textContent=nights;
  $('ih-lbl').textContent=label+', '+ctry;
  var s4high=Math.round(s4*1.15);
  $('ih-avg').textContent=fmt(s4high);
  $('ih-note').innerHTML='<b>4&#9733; high-end benchmark: '+fmt(s4high)+'/night</b>'
    +'<br>4&#9733; market avg: '+fmt(s4)+' &nbsp;|&nbsp; 5&#9733; avg: '+fmt(s5)
    +'<br>Source: '+src
    +'. <a href="https://www.travel.dod.mil/Travel-Transportation-Rates/Per-Diem/Per-Diem-Rate-Lookup/" target="_blank">DoD per diem</a>'
    +(pd?' — M&amp;IE: '+fmt(pd.dm)+'/day':'')+'.'  ;
  res.classList.add('show');

  if(pd){
    $('pd-city').textContent=label;
    $('pd-lodge').textContent=fmt(pd.dl);
    $('pd-mie').textContent=fmt(pd.dm);
    $('pd-prop').textContent=fmt(Math.round(pd.dm*0.75));
    $('pd-inc').textContent=fmt(Math.round(pd.dm*0.14));
    $('pd-tot').textContent=fmt(pd.dl+pd.dm);
    $('pd-exp').style.display='block';
  }
  logUse('International hotel',city+', '+ctry);
}


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
  // ── Build print styles ──
  var s=document.createElement("style");
  s.id="print-override";
  s.textContent=`@media print{
    @page{size:letter portrait;margin:0.75in 0.75in 0.75in 0.75in}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    #pw-gate,nav,.hero,section.hero,.sec:not(.tool-sec),footer,
    .ttabs,.lbtn,.pdf-btn,.errmsg,.nf,.f,.slbl,.ibox,.g2,.g3,
    .pd-rule,.map-wrap,.divider,.stag,.sh,.ss,.hbtns,.mo{display:none!important}
    body{font-family:'DM Sans',Arial,sans-serif;font-size:10.5pt;
         background:#fff!important;margin:0;padding:0;color:#0a1628}
    .tool-sec{padding:0!important;background:transparent!important}
    .si{padding:0!important}
    .tw{box-shadow:none!important;border:none!important;
        padding:0!important;margin:0!important;background:transparent!important}
    .tp{display:none!important}
    .tp.on{display:block!important;padding:0!important}
    .rbox{display:block!important;box-shadow:none!important;
          border:1.5px solid #dee2e6!important;border-radius:6px!important;
          padding:1rem 1.1rem!important;margin:.5rem 0!important;
          page-break-inside:avoid!important;background:#fff!important}
    .rbox:not(.show){display:none!important}
    .rrow{display:flex!important;gap:1.5rem!important;flex-wrap:wrap!important;align-items:flex-end!important}
    .rm{flex:1;min-width:130px}
    .ml{font-size:7.5pt!important;color:#6c757d!important;
        text-transform:uppercase!important;letter-spacing:.07em!important;margin-bottom:3px!important}
    .mv{font-size:24pt!important;font-weight:700!important;
        color:#0a1628!important;line-height:1.1!important}
    .ms{font-size:7.5pt!important;color:#6c757d!important;margin-top:2px!important}
    .rlbl{font-size:12pt!important;font-weight:600!important;
          color:#0a1628!important;margin-bottom:.4rem!important;
          border-bottom:1px solid #e9ecef!important;padding-bottom:.3rem!important}
    .rn{font-size:8.5pt!important;color:#555!important;line-height:1.6!important;
        margin-top:.4rem!important;padding-top:.4rem!important;
        border-top:1px solid #e9ecef!important}
    .pd-exp{display:block!important;page-break-inside:avoid!important;
            border:1.5px solid #dee2e6!important;border-radius:6px!important;
            padding:.75rem 1rem!important;margin:.5rem 0!important}
    .pd-exp h4{font-size:9.5pt!important;font-weight:600!important;margin:.4rem 0 .25rem!important}
    table{border-collapse:collapse!important;width:100%!important;font-size:8.5pt!important}
    td,th{padding:3px 7px!important;border:1px solid #dee2e6!important}
    th{background:#f8f9fa!important;font-weight:600!important;color:#0a1628!important}
    .gt-panel{display:none!important}
    .gt-panel.on{display:block!important;page-break-inside:avoid!important}
    .gt-res{display:block!important}
    .gt-verdict{display:block!important;border:1.5px solid #dee2e6!important;
                border-radius:6px!important;padding:.75rem!important;margin-top:.5rem!important}
    #print-hdr,#print-ftr,#print-context{display:block!important}
    #print-body{display:block!important}
    .adv-card{border:1.5px solid #dee2e6!important;border-radius:6px!important;
              padding:.75rem 1rem!important;page-break-inside:avoid!important}
  }`
  document.head.appendChild(s);

  // ── Header ──
  var h=document.createElement("div");
  h.id="print-hdr";
  var now=new Date();
  var dateStr=now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  h.style.cssText="display:none";
  h.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:3px solid #0A1628;margin-bottom:10px">
      <div style="display:flex;flex-direction:column;gap:3px">
        <div style="font-family:'DM Serif Display',Georgia,serif;font-size:20pt;font-weight:700;color:#0A1628;letter-spacing:-.5px;line-height:1">Fair<span style="color:#0D9E8A">Fares</span></div>
        <div style="font-size:8pt;color:#6c757d;letter-spacing:.05em;text-transform:uppercase">Travel Cost Benchmark Report</div>
      </div>
      <div style="text-align:right;font-size:8pt;color:#6c757d;line-height:1.7">
        <div style="font-weight:600;color:#0a1628;font-size:9pt">${dateStr}</div>
        <div>getfairfares.com</div>
      </div>
    </div>
    <div style="font-size:8pt;color:#555;background:#f8f9fa;border-radius:4px;padding:6px 10px;margin-bottom:8px;line-height:1.5">
      The figures below are <strong>estimated market benchmarks</strong> based on current pricing data from Google Flights and Booking.com.
      They represent the high-end range of available options for the dates and route shown — not the traveler's actual booked fare.
      For internal compliance review only.
    </div>`;
  document.body.insertBefore(h,document.body.firstChild);

  // ── Footer ──
  var f=document.createElement("div");
  f.id="print-ftr";
  f.style.cssText="display:none";
  f.innerHTML=`
    <div style="border-top:1px solid #dee2e6;padding-top:8px;margin-top:12px;display:flex;justify-content:space-between;font-size:7.5pt;color:#adb5bd">
      <span>FairFares — getfairfares.com — Travel expense benchmarking</span>
      <span>Data sourced from Google Flights &amp; Booking.com. High-end benchmark shown.</span>
    </div>`;
  document.body.appendChild(f);

  window.print();
  setTimeout(function(){
    ['print-override','print-hdr','print-ftr'].forEach(function(id){
      var el=document.getElementById(id);
      if(el)el.remove();
    });
  },1200);
}
