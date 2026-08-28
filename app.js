// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(n).toLocaleString();
const norm = s => (s||'').trim().toUpperCase();

// ═══════════════════════════════════════════════
// FLIGHT DATA — loaded from flights.js (static file updated daily by Cowork)
// ═══════════════════════════════════════════════

// Build destination list from FLIGHT_DATA (defined in flights.js)
var SHEET_DESTINATIONS = (function() {
  var seen = {};
  var dests = [];
  (FLIGHT_DATA || []).forEach(function(r) {
    var key = r.destCode.toUpperCase();
    if (!seen[key] && r.destination && r.destCode) {
      seen[key] = true;
      dests.push({
        name: r.destination,
        code: r.destCode.toUpperCase(),
        display: r.destination + ' (' + r.destCode.toUpperCase() + ')'
      });
    }
  });
  dests.sort(function(a, b) { return a.name.localeCompare(b.name); });
  return dests;
})();

function loadSheetData(cb) {
  // Data is already loaded from flights.js — just return it
  cb(FLIGHT_DATA || []);
}

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
  document.querySelectorAll('.tp input').forEach(inp=>{
    if(inp.id==='fl-from') return; // always keep SFO
    if(inp.type==='date'||inp.type==='text'||inp.type==='number') inp.value='';
  });
  document.querySelectorAll('.tp select').forEach(sel=>sel.selectedIndex=0);
  document.querySelectorAll('.rbox').forEach(r=>r.classList.remove('show'));
  document.querySelectorAll('.nf').forEach(n=>n.style.display='none');
  document.querySelectorAll('.errmsg').forEach(e=>e.style.display='none');
  document.querySelectorAll('.ac-drop').forEach(d=>d.style.display='none');
  if(t==='pd') showDomesticPerDiem();
}

// ═══════════════════════════════════════════════
// AUTOCOMPLETE — Sheet destinations (TO field)
// ═══════════════════════════════════════════════
function setupSheetAC(inpId) {
  const inp = $(inpId), drop = $(inpId + '-drop');
  if (!inp || !drop) return;
  // Remove old listeners by cloning
  const newInp = inp.cloneNode(true);
  inp.parentNode.replaceChild(newInp, inp);
  const ni = $(inpId);
  ni.addEventListener('input', function() {
    const q = ni.value.trim().toLowerCase();
    drop.innerHTML = '';
    if (q.length < 1) { drop.style.display = 'none'; return; }
    if (!SHEET_DESTINATIONS.length) {
      // Data still loading — show a hint
      drop.innerHTML = '<div class="ac-item" style="color:var(--g400);cursor:default">Loading destinations…</div>';
      drop.style.display = 'block';
      return;
    }
    const hits = SHEET_DESTINATIONS.filter(function(d) {
      return d.name.toLowerCase().startsWith(q) ||
             d.code.toLowerCase().startsWith(q) ||
             d.name.toLowerCase().includes(q);
    }).slice(0, 10);
    if (!hits.length) { drop.style.display = 'none'; return; }
    hits.forEach(function(d) {
      const div = document.createElement('div');
      div.className = 'ac-item';
      div.innerHTML = '<span>' + d.code + '</span> — ' + d.name;
      div.addEventListener('mousedown', function(e) {
        e.preventDefault();
        ni.value = d.display;
        ni.dataset.code = d.code;
        ni.dataset.name = d.name;
        drop.style.display = 'none';
      });
      drop.appendChild(div);
    });
    drop.style.display = 'block';
  });
  ni.addEventListener('blur', function() {
    setTimeout(function() { drop.style.display = 'none'; }, 200);
  });
  ni.addEventListener('focus', function() {
    if (ni.value.trim().length > 0) ni.dispatchEvent(new Event('input'));
  });
}



// Setup autocomplete for ground transport address fields
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

document.addEventListener('DOMContentLoaded', function() {
  // Set SFO label in FROM field
  var fromEl = document.getElementById('fl-from');
  if (fromEl) fromEl.value = 'San Francisco (SFO)';
  setupSheetAC('fl-d');
  setupCountryAC();
  setupAdvAC();
  ['gt-from','gt-to'].forEach(setupAddressAC);
});

// ═══════════════════════════════════════════════
// GOOGLE FORM LOGGING
// ═══════════════════════════════════════════════
const USAGE_LOG_ENDPOINT='https://script.google.com/macros/s/AKfycbwDLCie-tqsC98cKMLxYsCYBVfLTm0gfJE-6i601ZlkBLRGcOo0AwRehTVu8x8RRoPy/exec';

function logUse(type,route,tripDuration){
  try{
    const inst=localStorage.getItem('ff_inst')||'Unknown';
    const payload={
      institution:inst,
      lookupType:type,
      destination:route,
      tripDuration:tripDuration||''
    };
    fetch(USAGE_LOG_ENDPOINT,{
      method:'POST',
      body:JSON.stringify(payload)
    }).catch(()=>{});
  }catch(e){}
}

// ═══════════════════════════════════════════════
// FEEDBACK FORM
// ═══════════════════════════════════════════════
function openFeedbackForm(destination) {
  const inst = localStorage.getItem('ff_inst') || '';
  const feedbackFormId = '1FAIpQLSdqsL2QOAZz5Cf6FAwosiqfbA1upYOwuh8jdMJg2944KeHUlQ';
  const feedbackUrl = 'https://docs.google.com/forms/d/e/' + feedbackFormId + '/viewform?' +
    'entry.467677869=' + encodeURIComponent(destination || '') +
    '&entry.1640901322=' + encodeURIComponent('') +
    '&entry.585384888=' + encodeURIComponent(inst);
  window.open(feedbackUrl, '_blank');
}

// ═══════════════════════════════════════════════
// FLIGHT LOOKUP — from Google Sheet
// ═══════════════════════════════════════════════
function lookFlight() {
  var dEl = $('fl-d');
  var dep = $('fl-dep').value;
  var ret = $('fl-ret').value;
  var err = $('fl-err');
  var res = $('fl-res');
  var nf  = $('fl-nf');

  err.style.display = 'none';
  nf.style.display = 'none';
  res.classList.remove('show');

  var destCode = dEl.dataset.code || '';
  var destName = dEl.dataset.name || dEl.value.trim();

  if (!destCode && !destName) {
    err.textContent = 'Please select a destination.';
    err.style.display = 'block';
    return;
  }
  if (!dep || !ret) {
    err.textContent = 'Please enter departure and return dates.';
    err.style.display = 'block';
    return;
  }

  var nights = Math.round((new Date(ret) - new Date(dep)) / 86400000);
  if (nights < 1 || nights > 7) {
    err.textContent = 'Trip duration must be between 1 and 7 nights.';
    err.style.display = 'block';
    return;
  }

  // Show loading state
  $('fl-avg').textContent = '…';
  $('fl-lbl').textContent = 'SFO → ' + destName;
  $('fl-note').textContent = 'Loading price data…';
  res.classList.add('show');

  loadSheetData(function(data) {
    if (!data) {
      $('fl-note').textContent = 'Unable to load price data. Please try again.';
      return;
    }

    // Convert user dates to YYYY-MM-DD format for matching
    var userDepDate = new Date(dep).toISOString().split('T')[0];
    var userRetDate = new Date(ret).toISOString().split('T')[0];

    // Find matching rows: destination + exact departure date + exact return date
    var matches = data.filter(function(r) {
      var codeMatch = destCode && r.destCode.toUpperCase() === destCode.toUpperCase();
      var nameMatch = !destCode && r.destination.toLowerCase() === destName.toLowerCase();
      var dateMatch = r.departDate === userDepDate && r.returnDate === userRetDate;
      return (codeMatch || nameMatch) && dateMatch;
    });

    if (!matches.length) {
      // Try without date filter — show what trip durations are available
      var anyMatch = data.filter(function(r) {
        var codeMatch = destCode && r.destCode.toUpperCase() === destCode.toUpperCase();
        var nameMatch = !destCode && r.destination.toLowerCase() === destName.toLowerCase();
        return codeMatch || nameMatch;
      });
      res.classList.remove('show');
      nf.style.display = 'block';
      if (anyMatch.length) {
        // Show what dates we have data for instead of just trip durations
        var availableDates = [...new Set(anyMatch.map(function(r) {
          return r.departDate + ' to ' + r.returnDate;
        }))].slice(0, 3); // Show first 3 date combos available
        nf.innerHTML = 'No data for ' + destName + ' on ' + userDepDate + ' to ' + userRetDate + '. '
          + 'Available dates include: ' + availableDates.join('; ') + '.';
      } else {
        nf.textContent = destName + ' is not in our current dataset. We add new destinations regularly.';
        logUse('Flight lookup', 'SFO→' + destName + ' (not found)', nights);
      }
      return;
    }

    // Use the most recently collected price for this exact date combo
    matches.sort(function(a, b) {
      return new Date(b.dateSearched) - new Date(a.dateSearched);
    });
    var best = matches[0];
    var price = best.price;
    var dateCollected = best.dateSearched;

    $('fl-avg').textContent = fmt(price);
    $('fl-nights').textContent = nights + ' night' + (nights !== 1 ? 's' : '');
    $('fl-lbl').textContent = 'SFO → ' + best.destination + ' · Economy return · ' + nights + ' nights';
    $('fl-note').innerHTML = '<b>Economy return fare: ' + fmt(price) + '</b>'
      + '<br>Origin: San Francisco (SFO) &nbsp;|&nbsp; Destination: ' + best.destination + ' (' + best.destCode.toUpperCase() + ')'
      + '<br>Depart: ' + userDepDate + ' &nbsp;|&nbsp; Return: ' + userRetDate
      + '<br>Trip duration: ' + nights + ' night' + (nights !== 1 ? 's' : '')
      + '<br>Source: <a href="https://www.google.com/travel/flights" target="_blank">Google Flights</a>'
      + ' — collected ' + dateCollected
      + '<br><small style="color:var(--g400)">Prices collected daily via automated search. Actual fares vary by booking date and availability.</small>';

    res.classList.add('show');
    logUse('Flight lookup', 'SFO→' + best.destCode, nights);
  });
}

// ═══════════════════════════════════════════════
// PER DIEM TAB
// ═══════════════════════════════════════════════

// Country code -> name (for autocomplete)
var COUNTRY_NAMES = {
  'AE':'UAE','AT':'Austria','AU':'Australia','BE':'Belgium','BR':'Brazil',
  'CA':'Canada','CH':'Switzerland','CN':'China','DE':'Germany','DK':'Denmark',
  'ES':'Spain','FI':'Finland','FR':'France','GB':'United Kingdom','GR':'Greece',
  'HK':'Hong Kong','IE':'Ireland','IL':'Israel','IN':'India','IT':'Italy',
  'JP':'Japan','KR':'South Korea','MX':'Mexico','MY':'Malaysia','NL':'Netherlands',
  'NO':'Norway','NZ':'New Zealand','PT':'Portugal','SE':'Sweden','SG':'Singapore',
  'TH':'Thailand','TW':'Taiwan','ZA':'South Africa'
};

// Country code -> available cities
var COUNTRY_CITIES = {
  'AE': ['Dubai', 'Abu Dhabi', 'Other UAE'],
  'AT': ['Vienna', 'Other Austria'],
  'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Canberra', 'Other Australia'],
  'BE': ['Brussels', 'Antwerp', 'Other Belgium'],
  'BR': ['Sao Paulo', 'Rio de Janeiro', 'Brasilia', 'Other Brazil'],
  'CA': ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Other Canada'],
  'CH': ['Geneva', 'Zurich', 'Bern', 'Other Switzerland'],
  'CN': ['Beijing', 'Shanghai', 'Guangzhou', 'Chengdu', 'Other China'],
  'DE': ['Berlin', 'Frankfurt', 'Munich', 'Hamburg', 'Other Germany'],
  'DK': ['Copenhagen', 'Other Denmark'],
  'ES': ['Madrid', 'Barcelona', 'Seville', 'Other Spain'],
  'FI': ['Helsinki', 'Other Finland'],
  'FR': ['Paris', 'Lyon', 'Nice', 'Other France'],
  'GB': ['Belfast', 'Birmingham', 'Bristol', 'Cambridge', 'Cardiff', 'Edinburgh (Jul-Aug)', 'Edinburgh (Sep-Jun)', 'Glasgow', 'Liverpool', 'London', 'Manchester', 'Oxford', 'Other UK'],
  'GR': ['Athens', 'Thessaloniki', 'Other Greece'],
  'HK': ['Hong Kong'],
  'IE': ['Dublin', 'Other Ireland'],
  'IL': ['Tel Aviv', 'Jerusalem', 'Other Israel'],
  'IN': ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Other India'],
  'IT': ['Rome', 'Milan', 'Florence', 'Venice', 'Other Italy'],
  'JP': ['Tokyo', 'Osaka', 'Kyoto', 'Other Japan'],
  'KR': ['Seoul', 'Busan', 'Other South Korea'],
  'MX': ['Mexico City', 'Guadalajara', 'Monterrey', 'Other Mexico'],
  'MY': ['Kuala Lumpur', 'Other Malaysia'],
  'NL': ['Amsterdam', 'The Hague', 'Rotterdam', 'Other Netherlands'],
  'NO': ['Oslo', 'Other Norway'],
  'NZ': ['Auckland', 'Wellington', 'Other New Zealand'],
  'PT': ['Lisbon', 'Porto', 'Other Portugal'],
  'SE': ['Stockholm', 'Gothenburg', 'Other Sweden'],
  'SG': ['Singapore'],
  'TH': ['Bangkok', 'Chiang Mai', 'Other Thailand'],
  'TW': ['Taipei', 'Other Taiwan'],
  'ZA': ['Cape Town', 'Johannesburg', 'Pretoria', 'Other South Africa']
};

// City -> country (for lookup)
var CITY_COUNTRY = {};
Object.keys(COUNTRY_CITIES).forEach(function(code) {
  COUNTRY_CITIES[code].forEach(function(city) {
    CITY_COUNTRY[city] = code;
  });
});
function showDomesticPerDiem() {
  $('pd-domestic').style.display = 'block';
}

function pdToggle(type, el) {
  document.querySelectorAll('.pd-toggle-btn').forEach(function(b) { b.classList.remove('on'); });
  el.classList.add('on');
  $('pd-domestic').style.display = type === 'dom' ? 'block' : 'none';
  $('pd-intl-section').style.display = type === 'intl' ? 'block' : 'none';
}

function triggerPD(){
  // Called when city select changes — look up rates immediately
  var city = $('ih-city') ? $('ih-city').value.trim() : '';
  if(city) lookIntlPerDiem();
}

function setupCountryAC() {
  var inp = $('ih-ctry-text');
  var drop = $('ih-ctry-drop');
  if(!inp || !drop) return;
  var countries = Object.keys(COUNTRY_NAMES).map(function(code) {
    return { code: code, name: COUNTRY_NAMES[code] };
  }).sort(function(a,b){ return a.name.localeCompare(b.name); });

  inp.addEventListener('input', function() {
    var q = inp.value.trim().toLowerCase();
    drop.innerHTML = '';
    if(q.length < 1) { drop.style.display='none'; return; }
    var hits = countries.filter(function(c) {
      return c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q);
    }).slice(0, 8);
    if(!hits.length) { drop.style.display='none'; return; }
    hits.forEach(function(c) {
      var div = document.createElement('div');
      div.className = 'ac-item';
      div.textContent = c.name;
      div.addEventListener('mousedown', function(e) {
        e.preventDefault();
        inp.value = c.name;
        $('ih-ctry').value = c.code;
        drop.style.display = 'none';
        // Populate city dropdown
        populateCityDropdown(c.code);
      });
      drop.appendChild(div);
    });
    drop.style.display = 'block';
  });
  inp.addEventListener('blur', function() {
    setTimeout(function() { drop.style.display='none'; }, 200);
  });
  inp.addEventListener('focus', function() {
    if(inp.value.trim().length > 0) inp.dispatchEvent(new Event('input'));
  });
}

function populateCityDropdown(countryCode) {
  var cities = COUNTRY_CITIES[countryCode] || [];
  var sel = $('ih-city');
  var field = $('ih-city-field');
  if(!sel || !field) return;
  sel.innerHTML = '<option value="">Select a city...</option>';
  cities.forEach(function(city) {
    var opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    sel.appendChild(opt);
  });
  field.style.display = 'block';
  // If only one city, auto-select it
  if(cities.length === 1) {
    sel.value = cities[0];
    lookIntlPerDiem();
  }
}

function lookIntlPerDiem(){
  var cityEl = $('ih-city');
  var city = cityEl ? cityEl.value.trim() : '';
  var ctry = $('ih-ctry').value;
  var err=$('ih-err');
  err.style.display='none';
  if(!city){err.textContent='Please select a city.';err.style.display='block';return;}
  var pd=INTL_HOTELS.find(function(h){return h.city.toUpperCase()===city.toUpperCase()&&h.country===ctry;});
  if(!pd){
    err.innerHTML = '<b>' + city + '</b> is not in our DoD per diem table.'
      + ' For unlisted cities, the DoD uses the nearest listed location\'s rate.'
      + ' <a href="https://www.travel.dod.mil/Travel-Transportation-Rates/Per-Diem/Per-Diem-Rate-Lookup/" target="_blank">Look up the exact rate on travel.dod.mil →</a>';
    err.style.display='block';
    return;
  }
  var label=city.split(' ').map(function(w){return w?w[0].toUpperCase()+w.slice(1):'';}).join(' ');
  $('pd-city').textContent=label;
  $('pd-lodge').textContent=fmt(pd.dl);
  $('pd-mie').textContent=fmt(pd.dm);
  $('pd-tot').textContent=fmt(pd.dl+pd.dm);
  $('pd-exp').style.display='block';
  logUse('Per diem',city+', '+ctry);
}

// ═══════════════════════════════════════════════
// GROUND TRANSPORT
// ═══════════════════════════════════════════════
let gtGeoTimer=null;
let gtFromCoord=null, gtToCoord=null;

function gtGeo(){
  clearTimeout(gtGeoTimer);
  gtGeoTimer=setTimeout(doGeoLookup,800);
}

async function geocode(query){
  try{
    const cacheKey='geo_'+query.trim().toLowerCase().replace(/\s+/g,'_');
    const cached=localStorage.getItem(cacheKey);
    if(cached){
      const obj=JSON.parse(cached);
      return obj.result===null?null:{lat:obj.lat,lon:obj.lon,display:obj.display};
    }
    const url='https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(query)+'&format=json&limit=1';
    const resp=await fetch(url,{headers:{'Accept-Language':'en','User-Agent':'FairFares/1.0'}});
    const data=await resp.json();
    let result=null;
    if(data&&data.length>0){
      result={lat:parseFloat(data[0].lat),lon:parseFloat(data[0].lon),display:data[0].display_name};
    }
    localStorage.setItem(cacheKey,JSON.stringify(result?{lat:result.lat,lon:result.lon,display:result.display}:{result:null}));
    return result;
  }catch(e){return null;}
}

async function doGeoLookup(){
  const fromEl=$('gt-from'), toEl=$('gt-to');
  const fromVal=fromEl.value.trim();
  const toVal=toEl.value.trim();
  if(fromVal.length<3||toVal.length<3)return;
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
  if(!gtFromCoord)gtFromCoord=await geocode(fromVal);
  if(!gtToCoord)gtToCoord=await geocode(toVal);
  if(!gtFromCoord||!gtToCoord){
    err.textContent='Could not find one or both locations. Try being more specific (e.g. add city name).';
    err.style.display='block';
    btn.disabled=false; btn.textContent='Get fare estimates';
    return;
  }
  const asCrow=haversine(gtFromCoord.lat,gtFromCoord.lon,gtToCoord.lat,gtToCoord.lon);
  const miles=parseFloat((asCrow*1.35).toFixed(1));
  const cityKey=detectCity(gtFromCoord.lat,gtFromCoord.lon);
  const r=GT_RATES[cityKey]||GT_RATES.default;
  const avgSpeed={sf:18,la:16,nyc:14,chi:20,bos:18,dc:20,sea:20,mia:22,den:25,atl:22,lon:12,par:14,tok:12,syd:22,sin:20,default:20}[cityKey]||20;
  const mins=Math.round((miles/avgSpeed)*60);
  const tBase=r.base;
  const tMeter=parseFloat((miles*r.mile).toFixed(2));
  const tTime=parseFloat((mins*r.min).toFixed(2));
  const tApt=r.apt||0;
  const tSubtotal=tBase+tMeter+tTime+tApt;
  const tTip=parseFloat((tSubtotal*(r.tip||0.18)).toFixed(2));
  const tTotal=parseFloat((tSubtotal+tTip).toFixed(2));
  const uBase=1.30,uDist=parseFloat((miles*1.45).toFixed(2)),uTime=parseFloat((mins*0.28).toFixed(2)),uSafe=1.80;
  const uApt=tApt;
  const uSubtotal=parseFloat((uBase+uDist+uTime+uSafe+uApt).toFixed(2));
  const uTip=parseFloat((uSubtotal*0.15).toFixed(2));
  const uTotal=parseFloat((uSubtotal+uTip).toFixed(2));
  const lBase=1.20,lDist=parseFloat((miles*1.42).toFixed(2)),lTime=parseFloat((mins*0.26).toFixed(2)),lSafe=1.75;
  const lApt=tApt;
  const lSubtotal=parseFloat((lBase+lDist+lTime+lSafe+lApt).toFixed(2));
  const lTip=parseFloat((lSubtotal*0.15).toFixed(2));
  const lTotal=parseFloat((lSubtotal+lTip).toFixed(2));
  const mkRow=(l,v)=>'<tr><td>'+l+'</td><td>'+v+'</td></tr>';
  const aptRow=tApt>0?mkRow('Airport surcharge',fmt(tApt)):'';
  const tollNote=(r.toll&&r.tollNote)?'<br><small style="color:#888">&#9888; '+r.tollNote+'</small>':'';
  $('gt-taxi-rows').innerHTML=mkRow('Flag fall',fmt(tBase))+mkRow('Distance ('+miles+' mi)',fmt(tMeter))+mkRow('Time (~'+mins+' min)',fmt(tTime))+aptRow+mkRow('Subtotal',fmt(tSubtotal))+mkRow('Tip ('+Math.round((r.tip||0.18)*100)+'%)',fmt(tTip));
  $('gt-taxi-tot').textContent=fmt(tTotal);
  $('gt-taxi-src').innerHTML='Source: '+r.name+' — calculated from straight-line distance '+asCrow.toFixed(1)+' mi x 1.35 road factor = '+miles+' mi.'+tollNote;
  $('gt-uber-rows').innerHTML=mkRow('Base fare',fmt(uBase))+mkRow('Distance ('+miles+' mi)',fmt(uDist))+mkRow('Time (~'+mins+' min)',fmt(uTime))+mkRow('Safe rides fee',fmt(uSafe))+(uApt>0?mkRow('Airport surcharge',fmt(uApt)):'')+mkRow('Subtotal',fmt(uSubtotal))+mkRow('Tip (15%)',fmt(uTip));
  $('gt-uber-tot').textContent=fmt(uTotal);
  $('gt-lyft-rows').innerHTML=mkRow('Base fare',fmt(lBase))+mkRow('Distance ('+miles+' mi)',fmt(lDist))+mkRow('Time (~'+mins+' min)',fmt(lTime))+mkRow('Trust & service fee',fmt(lSafe))+(lApt>0?mkRow('Airport surcharge',fmt(lApt)):'')+mkRow('Subtotal',fmt(lSubtotal))+mkRow('Tip (15%)',fmt(lTip));
  $('gt-lyft-tot').textContent=fmt(lTotal);
  const lowest=Math.min(tTotal,uTotal,lTotal);
  const lowestName=lowest===tTotal?'Taxi':lowest===uTotal?'Uber X':'Lyft';
  // Store all totals for per-tab benchmark display
  window._gtTotals = { taxi: tTotal, uber: uTotal, lyft: lTotal };
  updateGTBenchmark('taxi'); // default to taxi tab
  $('gt-lbl').textContent=fromVal+' → '+toVal;
  // Simple route summary — no map iframe
  $('gt-route-from').textContent = fromVal;
  $('gt-route-to').textContent = toVal;
  $('gt-route-miles').textContent = miles + ' mi · ~' + mins + ' min';
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
  updateGTBenchmark(t);
}

function updateGTBenchmark(t) {
  if(!window._gtTotals) return;
  var totals = window._gtTotals;
  var labels = { taxi:'Taxi', uber:'Uber X', lyft:'Lyft' };
  var fare = totals[t];
  var label = labels[t] || t;
  if(!fare) return;
  $('gt-vt').textContent = label + ' benchmark: ' + fmt(fare);
  $('gt-vb').textContent = 'G-28 reimbursement benchmark for ' + label + '. Taxi, Uber X, and Lyft are all acceptable — use whichever mode the traveler used. If a rental car was used, the total cost (rental + gas + parking + tolls) must not exceed ' + fmt(fare) + ' to be fully reimbursable.';
}

// ═══════════════════════════════════════════════
// TRAVEL ADVISORIES
// ═══════════════════════════════════════════════
function setupAdvAC() {
  var inp = document.getElementById('adv-in');
  var drop = document.getElementById('adv-in-drop');
  if(!inp || !drop) return;
  var countries = Object.keys(ADV_DATA).map(function(k) {
    return k.charAt(0).toUpperCase() + k.slice(1);
  }).sort();
  inp.addEventListener('input', function() {
    var q = inp.value.trim().toLowerCase();
    drop.innerHTML = '';
    if(q.length < 1) { drop.style.display='none'; return; }
    var hits = countries.filter(function(c) {
      return c.toLowerCase().startsWith(q) || c.toLowerCase().includes(q);
    }).slice(0, 8);
    if(!hits.length) { drop.style.display='none'; return; }
    hits.forEach(function(c) {
      var div = document.createElement('div');
      div.className = 'ac-item';
      div.textContent = c;
      div.addEventListener('mousedown', function(e) {
        e.preventDefault();
        inp.value = c;
        drop.style.display = 'none';
        lookAdv();
      });
      drop.appendChild(div);
    });
    drop.style.display = 'block';
  });
  inp.addEventListener('blur', function() {
    setTimeout(function() { drop.style.display='none'; }, 200);
  });
}

function lookAdv(){
  var raw=document.getElementById('adv-in').value.trim();
  var input=raw.toLowerCase();
  var err=document.getElementById('adv-err');
  var res=document.getElementById('adv-res');
  err.style.display='none';
  res.style.display='none';
  if(!input){err.textContent='Please enter a country name.';err.style.display='block';return;}
  var rec=ADV_DATA[input];
  if(!rec){err.textContent='Country not in our database. Check travel.state.gov directly.';err.style.display='block';return;}
  var lvl=ADV_LEVELS[rec.level];
  if(!lvl){err.textContent='Advisory data error for level '+rec.level;err.style.display='block';return;}
  document.getElementById('adv-hd').className='adv-hd '+lvl.cls;
  document.getElementById('adv-cn').textContent=raw.charAt(0).toUpperCase()+raw.slice(1);
  document.getElementById('adv-lt').textContent=lvl.lbl;
  document.getElementById('adv-badge').textContent=lvl.badge;
  document.getElementById('adv-badge').className='adv-badge '+lvl.cls;
  document.getElementById('adv-msg').textContent=rec.msg;
  document.getElementById('adv-url').href=rec.url;
  res.style.display='block';
  logUse('Advisory',input);
}

function qa(el){document.getElementById('adv-in').value=el.textContent;lookAdv();}

// ═══════════════════════════════════════════════
// PDF PRINT
// ═══════════════════════════════════════════════
function printTab(t){
  var s=document.createElement("style");
  s.id="print-override";
  s.textContent=`@media print{
    @page{size:letter portrait;margin:0.75in 0.75in 0.75in 0.75in}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    #pw-gate,nav,.hero,section.hero,.sec:not(.tool-sec),footer,
    .ttabs,.lbtn,.pdf-btn,.errmsg,.nf,.f,.slbl,.ibox,.g2,.g3,
    .pd-rule,.map-wrap,.divider,.stag,.sh,.ss,.hbtns,.mo,.pd-toggle{display:none!important}
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
    #print-hdr,#print-ftr{display:block!important}
    .adv-card{border:1.5px solid #dee2e6!important;border-radius:6px!important;
              padding:.75rem 1rem!important;page-break-inside:avoid!important}
  }`;
  document.head.appendChild(s);
  var h=document.createElement("div");
  h.id="print-hdr";
  var now=new Date();
  var dateStr=now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  h.style.cssText="display:none";
  var contextNote = {
    'fl': 'The figures below are <strong>estimated market benchmarks</strong> based on current pricing data from <strong>Google Flights</strong>. They represent economy return fares for the dates and route shown — not the traveler\'s actual booked fare. For internal compliance review only.',
    'gt': 'The figures below are <strong>estimated fare benchmarks</strong> based on published rate cards from taxi commissions and rideshare providers (Uber, Lyft). Calculated from straight-line distance with a road factor applied. For internal compliance review only.',
    'pd': 'The figures below are <strong>official per diem rates</strong> from the US Department of Defense (international) and UCOP G-28 Travel Policy (domestic). For internal compliance review only.',
    'adv': 'The advisory below is sourced from the <strong>US Department of State</strong> (travel.state.gov). For internal compliance review only.'
  }[t] || 'For internal compliance review only.';
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
      ${contextNote}
    </div>`;
  document.body.insertBefore(h,document.body.firstChild);
  var f=document.createElement("div");
  f.id="print-ftr";
  f.style.cssText="display:none";
  f.innerHTML=`
    <div style="border-top:1px solid #dee2e6;padding-top:8px;margin-top:12px;display:flex;justify-content:space-between;font-size:7.5pt;color:#adb5bd">
      <span>FairFares — getfairfares.com — Travel expense benchmarking</span>
      <span>Data sourced from Google Flights. Economy return benchmark shown.</span>
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
