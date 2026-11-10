/* SafeHeal Cloud — browser dashboard. No AI token or live-auth secret is stored here. */
(() => {
'use strict';
const svgPaths = {
 layout:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 sparkles:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16ZM5 2l.8 1.9L8 5l-2.2.9L5 8l-.8-2.1L2 5l2.2-1.1L5 2Z"/>',
 cube:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/>',
 activity:'<path d="M2 12h4l3-8 5 16 3-8h5"/>',radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 12 19 5"/>',
 file:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10l-7-7Z"/><path d="M13 3v7h7M8 15h8M8 18h6"/>',settings:'<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15.1 1.2.8-1.4 2.5-1.5-.5a8 8 0 0 1-2.1 1.2l-.3 1.6h-2.9l-.3-1.6a8 8 0 0 1-2.1-1.2l-1.5.5-1.4-2.5 1.2-.8a8.7 8.7 0 0 1 0-2.4l-1.2-.8 1.4-2.5 1.5.5a8 8 0 0 1 2.1-1.2l.3-1.6h2.9l.3 1.6a8 8 0 0 1 2.1 1.2l1.5-.5 1.4 2.5-1.2.8a8.7 8.7 0 0 1 0 2.4Z" transform="translate(-1 -2)"/>',
 shield:'<path d="m12 2 9 4v6c0 6-4 9-9 11-5-2-9-5-9-11V6l9-4Z"/><path d="m8.5 12 2.5 2.5 5-5"/>',alert:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 18h.01"/>',refresh:'<path d="M20 11a8 8 0 0 0-14-5L3 9m0-6v6h6M4 13a8 8 0 0 0 14 5l3-3m0 6v-6h-6"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 17v4h16v-4"/>',play:'<path d="m8 5 12 7-12 7V5Z"/>',lock:'<rect x="5" y="11" width="14" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',code:'<path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 3l-4 18"/>',scan:'<path d="M3 8V4a1 1 0 0 1 1-1h4M16 3h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4M16 21h4a1 1 0 0 0 1-1v-4M6 12h12"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',zap:'<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',pause:'<path d="M7 5v14M17 5v14"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>'
};
const ICON = n => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgPaths[n]||svgPaths.info}</svg>`;
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=ICON(el.dataset.icon)});}
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const integer=x=>Number.isFinite(Number(x))?Number(x):0;
const safeArray=x=>Array.isArray(x)?x:[];
const clip=(s,n=100)=>String(s??'').slice(0,n);
const EVENT_COLORS=['#8b7bfd','#43d7cb','#f66b92','#ffbe73','#779aff','#4fdaad'];
const classicEvents = [
 {timestamp:'2026-10-25T10:14:02Z',source_ip:'198.51.100.45',event_type:'PORT_SCAN',target_port:22,status:'DETECTED',details:'SYN scan detected targeting exposed SSH daemon on container.'},
 {timestamp:'2026-10-25T10:14:15Z',source_ip:'198.51.100.45',event_type:'AUTH_ATTEMPT',target_port:22,user:'root',status:'FAILED',details:'Repeated unauthorized SSH login attempts (brute-force pattern).'},
 {timestamp:'2026-10-25T10:15:00Z',source_ip:'198.51.100.45',event_type:'EXPLOITATION_ATTEMPT',target_port:5000,payload:'/api/debug?env=true',status:'FLAGGED',details:'Attempt to dump environment variables to extract AWS_SECRET_KEY.'}
];
const extendedEvents = [
 ['10:00:01','10.0.0.15','HTTP_REQUEST','/index.html','ALLOWED','Normal regular customer browsing the homepage'],
 ['10:00:03','198.51.100.44','PORT_SCAN','21','LOGGED','Port probe detected on FTP service'],
 ['10:00:04','198.51.100.44','PORT_SCAN','22','LOGGED','Port scan identified open SSH service'],
 ['10:00:05','198.51.100.44','PORT_SCAN','8080','LOGGED','Port scan on alternate web port'],
 ['10:00:07','10.0.0.22','API_CALL','/api/v1/products','ALLOWED','Valid mobile application data retrieval'],
 ['10:00:10','198.51.100.44','BRUTE_FORCE','/login','ALERT_LOW','Failed authentication attempt'],
 ['10:00:11','198.51.100.44','BRUTE_FORCE','/login','ALERT_MEDIUM','Failed authentication attempt - root target'],
 ['10:00:12','198.51.100.44','BRUTE_FORCE','/login','ALERT_HIGH','Rapid repeated login failures detected'],
 ['10:00:13','198.51.100.44','BRUTE_FORCE','/login','ALERT_HIGH','Dictionary attack signature confirmed'],
 ['10:00:15','172.16.0.8','HTTP_REQUEST','/contact','ALLOWED','Legitimate contact form load'],
 ['10:00:18','203.0.113.88','EXPLOIT_ATTEMPT','/api/users?id=1%27%20OR%20%271%27=%271','BLOCKED','SQL Injection pattern matched in query parameter'],
 ['10:00:19','203.0.113.88','PATH_TRAVERSAL','/download?file=../../../../etc/passwd','BLOCKED','Attempted arbitrary file disclosure via directory traversal'],
 ['10:00:20','10.0.0.15','HTTP_REQUEST','/checkout','ALLOWED','Legitimate payment completion workflow'],
 ['10:00:22','198.51.100.44','INCIDENT_ISOLATION','FIREWALL_POLICY_UPDATE','QUARANTINED','Scenario claims IP was isolated at border firewall'],
 ['10:00:25','203.0.113.88','INCIDENT_ISOLATION','WAF_DROP_RULE','QUARANTINED','Scenario claims IP was blacklisted'],
 ['10:00:28','10.0.0.99','HTTP_REQUEST','/dashboard','ALLOWED','Legitimate internal staff access unaffected']
].map(([t,ip,event_type,endpoint,action_taken,description])=>({timestamp:'2026-10-27T'+t+'Z',source_ip:ip,event_type,endpoint,action_taken,description,status:action_taken}));
const DEMO_DOCKER=`FROM python:3.9-slim\n\nENV AWS_SECRET_KEY="DEMO_INSECURE_SECRET_VALUE"\nENV DEBUG_MODE="true"\n\nWORKDIR /app\n\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\n\nRUN apt-get update && apt-get install -y openssh-server\n\nCOPY . .\n\nEXPOSE 5000\nEXPOSE 22\n\nCMD ["python", "app.py"]`;
const state={online:false,scenario:'classic',events:classicEvents,source:'preview',analysis:null,analysisEvidence:null,dockerfile:null,logs:null,original:'',demoLoaded:false,activePage:'overview',lastId:0,live:[],polling:true,loading:false,liveError:'',toastTimer:null};
function toast(message,error=false){const t=$('toast');t.textContent=message;t.className=`toast show${error?' error':''}`;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{t.className='toast'},4300)}
async function request(url,opts={}){const c=new AbortController();const timer=setTimeout(()=>c.abort(),opts.timeout||9000);try{const r=await fetch(url,{...opts,signal:c.signal});const type=r.headers.get('content-type')||'';const body=type.includes('json')?await r.json().catch(()=>({detail:'Invalid JSON response'})):await r.text();if(!r.ok){if(r.status===403&&type.includes('html')&&typeof body==='string'&&body.includes('<title>Blocked</title>'))throw Error('The hosting security gateway blocked this upload. Try Load demo Dockerfile + logs to run the built-in mock analysis.');throw Error(typeof body==='string'?clip(body,180):typeof body.detail==='string'?body.detail:`HTTP ${r.status}`)}return body;}finally{clearTimeout(timer)}}
function severity(e){const t=String(e.event_type||'').toUpperCase();if(t==='INCIDENT_ISOLATION')return 'simulation';if(['HTTP_REQUEST','API_CALL'].includes(t))return 'info';if(t.includes('EXPLOIT')||t.includes('TRAVERSAL')||t.includes('BRUTE')||t.includes('AUTH'))return 'high';if(t.includes('PORT_SCAN')||t.includes('SUSPICIOUS'))return 'medium';return 'low'}
function suspicious(e){return !['HTTP_REQUEST','API_CALL'].includes(String(e.event_type||'').toUpperCase())&&!['INCIDENT_ISOLATION'].includes(String(e.event_type||'').toUpperCase())}
const eventDetail=e=>e.description||e.details||e.payload||e.endpoint||(e.target_port!==undefined?`Port ${e.target_port}`:'—');
const shortTime=t=>{if(!t)return '—';const m=String(t).match(/T(\d\d:\d\d:\d\d)/);return m?m[1]:'—'};
function showPage(name){if(!$('page-'+name))return;state.activePage=name;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+name));document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===name));const titles={overview:'Overview',analysis:'AI Investigation',docker:'Docker Security',threats:'Threat Monitoring',live:'Live Attack Feed',reports:'Reports',settings:'Settings'};$('crumbName').textContent=titles[name];$('sidebar').classList.remove('open');if(location.hash!==`#${name}`)history.replaceState(null,'',`#${name}`);window.scrollTo({top:0,behavior:'smooth'});if(name==='live')pollLive();if(name==='settings')refreshSettings()}
// Render free services may take longer than an initial health probe to wake.
// Retry only the inexpensive health endpoint; never auto-trigger paid Nebius inference.
let healthCheckInFlight=false;
let healthRetryTimer=null;
let healthFailures=0;
function scheduleHealthCheck(){
  clearTimeout(healthRetryTimer);
  // Back off when unavailable, and poll less frequently once connected.
  const delay=state.online?30000:Math.min(15000,3000*2**Math.max(0,healthFailures-1));
  healthRetryTimer=setTimeout(async()=>{
    try{await checkHealth()}finally{scheduleHealthCheck()}
  },delay);
}
function renderMode(){const m=$('modeTag');m.className='mode-tag '+(state.online?'online':'offline');$('modeText').textContent=state.online?'BACKEND CONNECTED':healthFailures?'RECONNECTING · AUTO RETRY':'CHECKING CONNECTION';$('topologyBadge').textContent=state.source==='api'?'BACKEND DEMO DATA':'OFFLINE DEMO DATA'}
async function checkHealth(){
  if(healthCheckInFlight)return state.online;
  healthCheckInFlight=true;
  const wasOnline=state.online;
  try{
    const data=await request('/api/health',{timeout:5000,cache:'no-store'});
    state.online=Boolean(data&&data.status==='ok');
  }catch{state.online=false}
  finally{healthCheckInFlight=false}
  if(state.online)healthFailures=0;
  else healthFailures++;
  renderMode();
  if(!state.analysis&&!state.loading){
    if(state.online&&!wasOnline)status('Backend connected. Ready to investigate.','success');
    else if(!state.online)status('Demo server is waking up or temporarily unavailable. Retrying automatically…');
  }
  if(state.online&&!wasOnline){
    // Replace bundled preview with backend scenario when the server recovers.
    await loadScenario(true);
    if(state.activePage==='live')pollLive();
  }
  if(state.activePage==='settings')refreshSettings();
  return state.online;
}
async function loadScenario(silent=false){const scenario=state.scenario;let source='preview';let data=scenario==='classic'?classicEvents:extendedEvents;
 if(state.online){try{const result=await request(`/api/attack-events?scenario=${encodeURIComponent(scenario)}`);if(!Array.isArray(result.events))throw Error('Invalid event response');data=result.events;source='api';}catch(e){if(!silent)toast(`Scenario unavailable: ${e.message}. Showing bundled sample.`,true)}}
 if(state.scenario!==scenario)return; // Ignore stale response after switching scenarios.
 state.events=data;state.source=source;renderMode();renderEvents();renderOverview();if(!silent)toast(source==='api'?'Scenario loaded from backend':'Showing bundled offline preview');}
function stats(){const list=state.analysis?.findings||[];return{findings:list.length,high:list.filter(f=>['high','critical'].includes(String(f.severity||'').toLowerCase())).length,correlations:safeArray(state.analysis?.correlations).length}}
function renderOverview(){const s=stats();$('metricFindings').textContent=state.analysis?s.findings:'—';$('metricFindingsSub').textContent=state.analysis?'Latest investigation':'Run an investigation';$('metricRisk').textContent=state.analysis?s.high:'—';$('metricRiskSub').textContent=state.analysis?'High and critical findings':'Awaiting assessment';$('metricEvents').textContent=state.events.length;$('metricEventsSub').textContent=state.source==='api'?'Backend demo scenario':'Bundled demo preview';const review=state.analysis?.tests?.proposed_patch;$('metricPatch').textContent=review?(review.passed?'PASS':'ISSUES'):'—';$('metricPatchSub').textContent=review?'Static text review only':'Static review only';$('legendSignals').textContent=state.events.filter(suspicious).length;$('legendCorrelation').textContent=state.analysis?s.correlations:'—';$('legendMode').textContent=state.analysis?String(state.analysis?.ai?.source||'Unknown').toUpperCase():'Not run';renderProofRail();
 const last=state.events.slice(-5).reverse();$('recentEvents').innerHTML=last.length?last.map(e=>{const kind=severity(e);return `<div class="event-item"><div class="event-icon ${kind==='info'?'benign':kind==='medium'?'medium':''}">${ICON(kind==='info'?'shield':kind==='medium'?'radar':'alert')}</div><div class="event-main"><strong>${esc(clip(e.event_type||'EVENT',35).replaceAll('_',' '))}</strong><small>${esc(e.source_ip||'Unknown IP')} · ${esc(clip(eventDetail(e),55))}</small></div><span class="event-time">${esc(shortTime(e.timestamp))}</span><span class="severity-pill ${kind}">${kind==='info'?'NORMAL':kind==='simulation'?'SIMULATED':kind.toUpperCase()}</span></div>`}).join(''):'<div class="empty-inline">No events.</div>';
 renderDonut();}
function renderProofRail(){
  const a=state.analysis;
  $('proofDetect').textContent=`${state.events.filter(suspicious).length} suspicious-looking signals · demo`;
  $('proofExplain').textContent=a?.status==='completed'?`${safeArray(a.correlations).length} evidence correlations`:a?.status==='ai_error'?'AI request failed · see details':'Waiting for AI analysis';
  $('proofPropose').textContent=typeof a?.patch?.patched_dockerfile==='string'&&a.patch.patched_dockerfile.trim()?'Dockerfile fix proposed · not applied':'No patch proposed';
  const review=a?.tests?.proposed_patch;
  $('proofReview').textContent=review?(review.passed===true?'Static review passed · not built':review.passed===false?'Static review found issues':'Static review incomplete'):'Static checks not run';
}
function openBriefing(){
  $('modalTitle').textContent='SafeHeal Cloud · Mission briefing';
  $('modalBody').innerHTML=`<div class="briefing-kicker">THE FALCONS · HACKATHON DEMO</div>
    <p class="briefing-lede">What if the attack logs and the vulnerable Dockerfile could tell <strong>one connected story?</strong></p>
    <div class="briefing-list"><div><b>01</b><span><strong>Detect</strong><small>Load synthetic attack activity and expose the signals.</small></span></div>
    <div><b>02</b><span><strong>Explain</strong><small>Correlate logged evidence with specific container weaknesses.</small></span></div>
    <div><b>03</b><span><strong>Propose</strong><small>Generate an inspectable Dockerfile patch and diff.</small></span></div>
    <div><b>04</b><span><strong>Review</strong><small>Run independent static checks; never apply an unverified fix.</small></span></div></div>
    <div class="briefing-caution">Demo uses synthetic logs. AI may be mock or Nebius depending on backend configuration. No real IP blocks or patch deployment.</div>
    <button class="btn btn-primary full-width" id="briefingStart">Load the investigation demo <span class="right-arrow">→</span></button>`;
  $('modal').hidden=false;
  $('briefingStart').addEventListener('click',async()=>{closeModal();showPage('analysis');await loadDemo();});
  $('modalClose').focus();
}
function categories(events){const counts={};events.forEach(e=>{const k=String(e.event_type||'UNKNOWN');counts[k]=(counts[k]||0)+1});return Object.entries(counts).sort((a,b)=>b[1]-a[1]);}
function renderDonut(){const cats=categories(state.events);const total=state.events.length;$('donutTotal').textContent=total;let degree=0;const colors=cats.map((_,i)=>EVENT_COLORS[i%EVENT_COLORS.length]);const stops=cats.map(([_,value],i)=>{const start=degree;degree+=(total?value/total*360:0);return `${colors[i]} ${start}deg ${degree}deg`});$('donut').style.background=stops.length?`conic-gradient(${stops.join(',')})`:'conic-gradient(#36435d 0deg 360deg)';$('distributionLegend').innerHTML=cats.slice(0,5).map(([type,count],i)=>`<div class="distribution-row"><span class="label"><i style="background:${colors[i]}"></i>${esc(clip(type.replaceAll('_',' '),22))}</span><strong>${count}</strong></div>`).join('')||'<div class="empty-inline">No events</div>';}
function renderEvents(){const rows=state.events;const term=($('eventSearch').value||'').trim().toLowerCase();const type=$('typeFilter').value;const types=[...new Set(rows.map(e=>String(e.event_type||'UNKNOWN')))].sort();$('typeFilter').innerHTML='<option value="all">All event types</option>'+types.map(t=>`<option value="${esc(t)}">${esc(t.replaceAll('_',' '))}</option>`).join('');$('typeFilter').value=types.includes(type)?type:'all';const shown=rows.filter(e=>($('typeFilter').value==='all'||e.event_type===$('typeFilter').value)&&[e.event_type,e.source_ip,eventDetail(e),e.status,e.action_taken].some(s=>String(s||'').toLowerCase().includes(term)));
 $('eventCount').textContent=shown.length;$('eventsTableBody').innerHTML=shown.map(e=>{const sev=severity(e);const s=e.action_taken||e.status||'LOGGED';return `<tr><td>${esc(shortTime(e.timestamp))}</td><td>${esc(e.event_type||'UNKNOWN')}</td><td>${esc(e.source_ip||'—')}</td><td title="${esc(eventDetail(e))}">${esc(clip(eventDetail(e),76))}</td><td><span class="severity-pill ${sev}">${esc(clip(s,22))}</span></td></tr>`}).join('')||'<tr><td colspan="5" class="empty-inline">No matching events.</td></tr>';renderTimeline();renderCategories();}
function renderCategories(){const cats=categories(state.events);const max=Math.max(1,...cats.map(x=>x[1]));$('categoryBars').innerHTML=cats.slice(0,7).map(([label,value],i)=>`<div><div class="bar-label"><span>${esc(clip(label.replaceAll('_',' '),30))}</span><strong>${value}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${(value/max)*100}%;background:${EVENT_COLORS[i%EVENT_COLORS.length]}"></div></div></div>`).join('')||'<div class="empty-inline">No events</div>'}
function renderTimeline(){const ev=state.events.filter(e=>e.timestamp).slice().sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));const groups=new Map();for(const e of ev){const key=String(e.timestamp).slice(0,16);groups.set(key,(groups.get(key)||0)+1)}let arr=Array.from(groups.entries());if(arr.length>12){const step=Math.ceil(arr.length/12);arr=Array.from({length:Math.ceil(arr.length/step)},(_,i)=>[arr[i*step][0],arr.slice(i*step,(i+1)*step).reduce((sum,x)=>sum+x[1],0)]);}const max=Math.max(1,...arr.map(x=>x[1]));const len=Math.max(1,arr.length-1);const coord=arr.map((a,i)=>[42+580*(i/len),211-155*(a[1]/max)]);const line=coord.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');const area=coord.length?line+` L${coord.at(-1)[0]} 211 L${coord[0][0]} 211 Z`:'';const pointDots=coord.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="#9e93ff" stroke="#161f3a" stroke-width="3"/>`).join('');let grid='';for(let i=0;i<=4;i++){const y=211-i*40;grid+=`<line x1="42" y1="${y}" x2="628" y2="${y}" stroke="#30415b" stroke-dasharray="4 7"/><text x="32" y="${y+4}" fill="#7892b2" font-size="11" text-anchor="end">${Math.round(max*i/4)}</text>`;}
 const labels=arr.filter((_,i)=>arr.length<=6||i%Math.ceil(arr.length/5)===0||i===arr.length-1).map(([label],i)=>{const idx=arr.findIndex(x=>x[0]===label);const x=42+580*(idx/len);return `<text x="${x}" y="236" text-anchor="middle" fill="#8497b2" font-size="10">${esc(label.slice(11)||'--')}</text>`}).join('');$('timelineChart').innerHTML=`<svg viewBox="0 0 660 265" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Event timeline chart"><defs><linearGradient id="chartShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7e73fa" stop-opacity=".35"/><stop offset="1" stop-color="#7e73fa" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#chartShade)"/><path d="${line}" fill="none" stroke="#9a8cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${pointDots}${labels}</svg>`;}
function status(s,mode=''){const el=$('analysisStatus');el.textContent=s;el.className='analysis-status '+mode}
function chooseDocker(file){if(!file)return;state.demoLoaded=false;state.dockerfile=file;state.original='';$('dockerFileName').textContent=file.name;$('dockerFileHint').textContent=`${(file.size/1024).toFixed(1)} KB • selected`;$('dockerDrop').style.borderColor='#46d7b6';file.text().then(text=>{if(state.dockerfile===file){state.original=text;renderDocker()}}).catch(()=>{});status('Dockerfile selected. Ready to analyze.')}
function chooseLogs(file){if(!file)return;state.demoLoaded=false;state.logs=file;$('logsFileName').textContent=file.name;status('Evidence selected. Ready to analyze.')}
async function loadDemo(){
 // Server-side mock and private Nemotron routes always use the same bundled Classic log.
 state.scenario='classic';
 $('scenarioSelect').value='classic';
 $('settingsScenario').value='classic';
 refreshDropdownWidgets(); // Keep the visible custom dropdown labels in sync.
 await loadScenario(true);
 let text=DEMO_DOCKER;
 if(state.online){try{const r=await request('/web/demo-dockerfile');if(typeof r==='string'&&r.startsWith('FROM'))text=r}catch{}}
 chooseDocker(new File([text],'Dockerfile',{type:'text/plain'}));
 chooseLogs(new File([JSON.stringify(state.events,null,2)],'attack_logs.json',{type:'application/json'}));
 state.demoLoaded=true;
 status('Classic demo evidence selected: 3 synthetic events. Ready to investigate.');
 toast('Classic demo loaded: 3 synthetic events. Start the investigation.');
}
async function analyze(){if(state.loading)return;if(!state.dockerfile){toast('Choose a Dockerfile or load the demo first.',true);showPage('analysis');return}if(!state.online){toast('Demo server is waking up or temporarily unavailable. Retrying automatically.',true);status('Backend reconnecting automatically. Please retry shortly.','error');return}
 if(state.dockerfile.name!=='Dockerfile'){toast('The uploaded file must be named exactly Dockerfile.',true);return}if(state.dockerfile.size>1024*1024||state.logs?.size>1024*1024){toast('Each file must be at most 1 MB.',true);return}if(state.logs&&!state.logs.name.toLowerCase().endsWith('.json')){toast('Attack logs must be a JSON file.',true);return}state.loading=true;$('analyzeBtn').disabled=true;$('analyzeBtn').textContent='Analyzing evidence…';status('Working with the backend. Live AI mode may take longer.');$('resultStatus').textContent='PROCESSING';$('resultStatus').className='result-state muted-state';
 const form=new FormData();form.append('dockerfile',state.dockerfile,'Dockerfile');if(state.logs)form.append('attack_logs',state.logs,state.logs.name);
 try{
    let data;
    if(state.demoLoaded){
      // Server-side bundled mock analysis: CDN security never sees uploaded
      // fake credentials or attack logs. Live mode still needs private auth.
      try{data=await request('/web/demo-analysis',{timeout:180000})}
      catch(e){
        if(!['Not Found','HTTP 404','Demo-only analysis is disabled in live mode'].includes(e.message))throw e;
      }
    }
    if(!data)data=await request('/api/analyze',{method:'POST',body:form,timeout:180000});
    state.analysis=data;state.analysisEvidence=state.demoLoaded?'Classic demo · 3 bundled synthetic events (server-side)':state.logs?'Uploaded Dockerfile + uploaded JSON event logs':'Uploaded Dockerfile only · no event logs';renderAnalysis();renderDocker();renderOverview();if(data.status==='ai_error'){status(`AI returned an error: ${data.ai?.error?.message||'Check backend configuration'}`,'error');toast('Backend returned an AI error; no findings or patch were fabricated.',true)}else{status('Investigation complete. Review findings and static checks.','success');toast('Investigation completed — review before using any suggested patch.')}}catch(e){state.analysis=null;state.analysisEvidence=null;renderAnalysis();status(`Request failed: ${e.message}`,'error');toast(`Analysis failed: ${e.message}`,true)}finally{state.loading=false;$('analyzeBtn').disabled=false;$('analyzeBtn').innerHTML=ICON('play')+' Start AI investigation <span class="right-arrow">→</span>'}}
function confirmRealAI(){
 const dialog=$('teamConfirmDialog');
 if(!dialog||typeof dialog.showModal!=='function')return Promise.resolve(window.confirm('Run real Nebius? This uses team credits and is limited.'));
 if(dialog.open)return Promise.resolve(false);
 dialog.returnValue='cancel';
 return new Promise(resolve=>{
  dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true});
  dialog.showModal();
 });
}
function setTeamButtonLoading(running){
 const btn=$('teamNebiusBtn');btn.disabled=running;btn.setAttribute('aria-busy',String(running));
 const label=btn.querySelector('.team-nebius-button-label');
 if(label)label.textContent=running?'Running real Nemotron…':'Run real Nemotron';
}
async function teamLiveDemo(){
 if(state.loading)return;
 if(!state.online)return toast('Demo server is reconnecting automatically. Please retry shortly.',true);
 if(!await confirmRealAI())return;
 await loadDemo();
 state.loading=true;$('analyzeBtn').disabled=true;setTeamButtonLoading(true);
 status('Requesting real Nemotron analysis. Model inference can take time.');$('resultStatus').textContent='PROCESSING';$('resultStatus').className='result-state muted-state';
 try{
   const data=await request('/web/team-nebius-demo',{method:'POST',timeout:180000});
   state.analysis=data;state.analysisEvidence='Classic demo · 3 bundled synthetic events (server-side Nemotron)';renderAnalysis();renderDocker();renderOverview();
   if(data.status==='completed'){status('Real Nemotron analysis finished. Review patch and static checks.','success');toast('Live Nebius investigation complete.')}
   else{status('Nebius returned an error: '+(data.ai?.error?.message||'See report.'),'error');toast('Real Nebius analysis failed.',true)}
 }catch(e){
   status('Real Nemotron request failed: '+e.message+'. The demo may be unavailable or at its usage limit.','error');
   toast('Real Nemotron is unavailable right now. Mock analysis still works.',true)
 }finally{
   state.loading=false;$('analyzeBtn').disabled=false;setTeamButtonLoading(false);
 }
}
function renderAnalysis(){const a=state.analysis;$('analysisEvidence').textContent=a?'Evidence analyzed: '+(state.analysisEvidence||'Source unavailable'):'Evidence analyzed: none yet. Bundled AI demos use Classic (3 synthetic events).';const findings=safeArray(a?.findings);const corr=safeArray(a?.correlations);const s=stats();$('resultCount').textContent=a?s.findings:'—';$('resultHigh').textContent=a?s.high:'—';$('resultCorr').textContent=a?s.correlations:'—';$('findingsCountPill').textContent=findings.length;$('correlationsCountPill').textContent=corr.length;
 const resultStatus=$('resultStatus');if(!a){resultStatus.textContent='NOT RUN';resultStatus.className='result-state muted-state';$('analysisModeLabel').textContent='NO ANALYSIS YET';$('analysisSummary').innerHTML=ICON('shield')+'<div><strong>Run your first investigation</strong><p>Findings, grounded explanations, and static patch checks will appear here.</p></div>';}
 else{const ok=a.status==='completed';resultStatus.textContent=ok?'COMPLETED':'AI ERROR';resultStatus.className='result-state '+(ok?'success-state':'error-state');$('analysisModeLabel').textContent=`${String(a.ai?.source||'unknown').toUpperCase()} · ${ok?'ANALYZED':'AI ERROR'}`;$('analysisSummary').className='result-callout'+(ok?'':' error-callout');$('analysisSummary').innerHTML=ICON(ok?'sparkles':'alert')+`<div><strong>${esc(ok?'Evidence-based assessment':a.ai?.error?.message||'AI analysis error')}</strong><p>${esc(clip(ok?(a.ai?.summary||'Analysis received from backend.'):'The backend returned a structured AI error. No synthetic findings were substituted.',350))}</p></div>`;}
 $('findingsList').innerHTML=findings.length?findings.map((f,i)=>{const sev=String(f.severity||'unknown').toLowerCase();return `<div class="finding-row"><span class="finding-number">${esc(f.id||'#'+(i+1))}</span><div class="finding-info"><strong>${esc(f.title||'Finding')}</strong><small>${esc(clip(f.description||'',95))}</small></div><span class="severity-pill ${['critical','high','medium','low'].includes(sev)?sev:'info'}">${esc(sev.toUpperCase())}</span><button class="finding-details-btn" data-finding="${i}">View ↗</button></div>`}).join(''):'<div class="empty-inline">No findings returned.</div>';
 $('correlationsList').innerHTML=corr.length?corr.map(c=>`<div class="correlation-item"><strong>${esc(c.event_type||'Event')} • ${esc(c.source_ip||'Unspecified IP')}</strong><small>${esc(clip(c.explanation||'Correlation reported by AI.',230))}</small><small>Related: ${esc(safeArray(c.related_finding_ids).join(', ')||'Not specified')}</small></div>`).join(''):'<div class="empty-inline">No event correlations returned.</div>';
 const patch=a?.patch?.patched_dockerfile||'';$('patchCode').innerHTML=patch?`<code>${highlightCode(patch)}</code>`:'<code>No patch proposed.</code>';$('patchStatus').textContent=a?.tests?.proposed_patch?(a.tests.proposed_patch.passed?'Static review: passed':'Static review: issues found'):'No proposed patch available';renderValidation();}
function highlightCode(text,diff=false){return esc(text).split('\n').map(line=>{let cls='';if(diff){cls=line.startsWith('+')&&!line.startsWith('+++')?'add':line.startsWith('-')&&!line.startsWith('---')?'remove':line.startsWith('@@')||line.startsWith('+++')||line.startsWith('---')?'header':'';}return `<span class="code-line ${cls}">${line||' '}</span>`}).join('')}
function renderValidation(){const a=state.analysis;const root=$('validationContent');if(!a){root.innerHTML=`<div class="validation-empty">${ICON('scan')}<strong>No validation yet</strong><p>Checks will appear after an investigation.</p></div>`;return}const checks=[['Original Dockerfile',a.tests],['Proposed patch',a.tests?.proposed_patch]];root.innerHTML=checks.map(([name,v])=>{if(!v)return `<div class="validation-group"><h3>${esc(name)} <span style="color:#99abc4">NOT PROVIDED</span></h3></div>`;const pass=v.passed;return `<div class="validation-group"><h3>${esc(name)} <span style="color:${pass===true?'#48dcab':pass===false?'#ff7799':'#a4b8d3'}">${pass===true?'✓ PASS':pass===false?'! ISSUES':'NOT RUN'}</span></h3>${safeArray(v.details).slice(0,8).map(d=>`<p>• ${esc(typeof d==='string'?d:JSON.stringify(d))}</p>`).join('')||'<p>No additional details returned.</p>'}</div>`}).join('');}
function renderDocker(){const original=state.original||'';const patch=state.analysis?.patch?.patched_dockerfile||'';const diff=state.analysis?.patch?.diff||'';$('originalCode').innerHTML=`<code>${original?highlightCode(original):'Load a demo or choose a Dockerfile in AI Investigation.'}</code>`;$('secureCode').innerHTML=`<code>${patch?highlightCode(patch):'No proposal available until analysis completes.'}</code>`;$('diffCode').innerHTML=`<code>${diff?highlightCode(diff,true):'Run AI Investigation to see a generated diff.'}</code>`;}
function openFinding(index){const f=safeArray(state.analysis?.findings)[index];if(!f)return;$('modalTitle').textContent=f.title||'Finding';$('modalBody').innerHTML=`<section><strong>Severity</strong><p>${esc(f.severity||'Unspecified')}</p></section><section><strong>Explanation</strong><p>${esc(f.description||'No explanation provided.')}</p></section><section><strong>Recommendation</strong><p>${esc(f.recommendation||'No recommendation provided.')}</p></section>${state.analysis?.ai?.finding_evidence?.[f.id]?`<section><strong>Evidence</strong><div class="evidence">${esc(state.analysis.ai.finding_evidence[f.id])}</div></section>`:''}`;$('modal').hidden=false;$('modalClose').focus()}
function closeModal(){$('modal').hidden=true}
function download(name,text,mime='text/plain'){const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800)}
function downloadJson(){if(!state.analysis)return toast('Run an investigation before exporting a report.',true);download('SafeHeal-Cloud-investigation.json',JSON.stringify({exported_at:new Date().toISOString(),note:'Static checks only; simulated defenses; no patch applied',analysis:state.analysis,evidence_context:state.analysisEvidence||'Source unavailable'},null,2),'application/json')}
function downloadPatch(){const patch=state.analysis?.patch?.patched_dockerfile;if(!patch)return toast('No proposed Dockerfile available yet.',true);download('Dockerfile.proposed',patch)}
function copyPatch(){const patch=state.analysis?.patch?.patched_dockerfile;if(!patch)return toast('No proposed patch available.',true);if(navigator.clipboard?.writeText){navigator.clipboard.writeText(patch).then(()=>toast('Proposed patch copied to clipboard.')).catch(()=>toast('Clipboard unavailable in this browser.',true));}else toast('Clipboard unavailable in this browser.',true)}
function downloadEventLog(){download(`SafeHeal-Cloud-${state.scenario}-scenario.json`,JSON.stringify(state.events,null,2),'application/json');toast('Scenario events downloaded (demo data).')}
function reportMode(){const a=state.analysis;const label=$('settingsAi');label.textContent=a?.ai?.source?String(a.ai.source).toUpperCase():'Not analyzed';label.className='connection-pill'+(a?.status==='completed'?' good':'')}
async function refreshSettings(){const ap=$('settingsApi');ap.textContent=state.online?'Connected':'Offline';ap.className='connection-pill '+(state.online?'good':'bad');reportMode();$('settingsLive').textContent=state.liveError?'Unavailable':state.online?'Anonymized public feed':'Offline';$('settingsLive').className='connection-pill '+(state.liveError||!state.online?'bad':'good');}
async function pollLive(){if(!state.online||!state.polling)return;try{const d=await request('/web/live-events?after_id='+state.lastId,{timeout:4500});if(d.mode!=='live'||!Array.isArray(d.events))throw Error('Unexpected live response');state.liveError='';$('liveConnStatus').textContent='PUBLIC ANONYMIZED FEED';$('liveHeroTitle').textContent='Monitoring is active';$('liveHeroDescription').textContent='Observed demo HTTP requests with visitor IP addresses and URL paths hidden. No blocking is performed.';for(const e of d.events){if(typeof e.id!=='number')continue;if(!state.live.some(old=>old.id===e.id))state.live.push(e);state.lastId=Math.max(state.lastId,e.id)}state.live=state.live.slice(-200);renderLive()}catch(e){state.liveError=e.message;$('liveConnStatus').textContent='GATEWAY UNAVAILABLE';$('liveHeroTitle').textContent='Live monitoring unavailable';$('liveHeroDescription').textContent=e.message==='HTTP 503'?'Live monitoring is unavailable on this deployment.':clip(e.message,240);refreshSettings()}}
function renderLive(){$('liveTotal').textContent=state.live.length;const es=state.live.slice().reverse();$('liveEventRows').innerHTML=es.length?es.map(e=>`<div class="live-event-row"><strong>${esc(e.event_type||'OBSERVED')}</strong><span>${esc(e.source_ip||'—')}</span><span>${esc(clip(e.endpoint||'—',60))}</span><small>${esc(clip(e.timestamp||'—',26))}</small></div>`).join(''):'<div class="empty-inline">No events observed in this process yet. Try the harmless test probe.</div>';}
async function triggerProbe(){if(!state.online)return toast('The backend must be running for live demo probes.',true);try{await fetch('/api/debug/demo',{method:'GET',cache:'no-store'});toast('Harmless request sent. The backend may record it as suspicious.');setTimeout(pollLive,650)}catch{toast('Could not reach local backend.',true)}}
function togglePolling(){state.polling=!state.polling;$('pollToggle').innerHTML=ICON(state.polling?'pause':'play')+(state.polling?' Pause feed':' Resume feed');$('settingsPollToggle').textContent=state.polling?'Pause':'Resume';toast(state.polling?'Live feed resumed.':'Live feed paused.');if(state.polling)pollLive()}
function wire(){icons();document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>showPage(el.dataset.page)));document.querySelectorAll('[data-goto]').forEach(el=>el.addEventListener('click',()=>showPage(el.dataset.goto)));$('mobileMenu').addEventListener('click',()=>{$('sidebar').classList.toggle('open')});$('refreshOverview').addEventListener('click',async()=>{await checkHealth();await loadScenario(true);toast('Dashboard refreshed.')});$('openBriefing').addEventListener('click',openBriefing);$('quickDemo').addEventListener('click',async()=>{showPage('analysis');await loadDemo();if(state.online)analyze()});$('loadDemo').addEventListener('click',loadDemo);
 $('dockerDrop').addEventListener('click',()=>$('dockerInput').click());$('dockerDrop').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('dockerInput').click()}});$('dockerInput').addEventListener('change',e=>chooseDocker(e.target.files?.[0]));['dragover','dragenter'].forEach(name=>$('dockerDrop').addEventListener(name,e=>{e.preventDefault();$('dockerDrop').classList.add('dragging')}));['dragleave','drop'].forEach(name=>$('dockerDrop').addEventListener(name,e=>{e.preventDefault();$('dockerDrop').classList.remove('dragging')}));$('dockerDrop').addEventListener('drop',e=>chooseDocker(e.dataTransfer?.files?.[0]));$('logsChoose').addEventListener('click',()=>$('logsInput').click());$('logsInput').addEventListener('change',e=>chooseLogs(e.target.files?.[0]));$('analyzeBtn').addEventListener('click',analyze);$('teamNebiusBtn').addEventListener('click',teamLiveDemo);
 $('findingsList').addEventListener('click',e=>{const btn=e.target.closest('[data-finding]');if(btn)openFinding(Number(btn.dataset.finding))});$('modalClose').addEventListener('click',closeModal);$('modalDismiss').addEventListener('click',closeModal);$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});$('copyPatch').addEventListener('click',copyPatch);$('downloadPatch').addEventListener('click',downloadPatch);
 const setScenario=async v=>{state.scenario=v;$('scenarioSelect').value=v;$('settingsScenario').value=v;await loadScenario()};$('scenarioSelect').addEventListener('change',e=>setScenario(e.target.value));$('settingsScenario').addEventListener('change',e=>setScenario(e.target.value));$('refreshThreats').addEventListener('click',()=>loadScenario());$('eventSearch').addEventListener('input',renderEvents);$('typeFilter').addEventListener('change',renderEvents);$('downloadEvents').addEventListener('click',downloadEventLog);
 $('pollToggle').addEventListener('click',togglePolling);$('settingsPollToggle').addEventListener('click',togglePolling);$('triggerProbe').addEventListener('click',triggerProbe);$('settingsCheck').addEventListener('click',async()=>{await checkHealth();await pollLive();refreshSettings();toast('Connection checked.')});$('reportJSON').addEventListener('click',downloadJson);$('reportDocker').addEventListener('click',downloadPatch);$('reportEvents').addEventListener('click',downloadEventLog);
 window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(next&&next!==state.activePage)showPage(next)});
}
function clock(){
  // Display browser-local time using its regional 12h/24h preference.
  const now = new Date();
  $('clock').textContent = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
/* SafeHeal Cloud — accessible custom dropdowns (progressively enhance native selects).
   Native select elements remain the source of truth for existing filtering logic. */
let refreshDropdownWidgets=()=>{};
function enhanceDropdowns(){
  const allWidgets=[];
  refreshDropdownWidgets=()=>allWidgets.forEach(render);
  const descriptions={
    all:'Show every recorded signal',
    HTTP_REQUEST:'Routine web traffic',
    API_CALL:'Application requests',
    BRUTE_FORCE:'Repeated login attempts',
    PORT_SCAN:'Network port probes',
    EXPLOIT_ATTEMPT:'Potential exploit activity',
    EXPLOITATION_ATTEMPT:'Potential exploit activity',
    PATH_TRAVERSAL:'Suspicious file access',
    INCIDENT_ISOLATION:'Simulated response records',
    AUTH_ATTEMPT:'Authentication evidence',
    SUSPICIOUS_HTTP_REQUEST:'Observed HTTP path probe',
    classic:'3 sample security events',
    extended:'16 sample security events'
  };
  const palettes={
    all:'violet',HTTP_REQUEST:'teal',API_CALL:'teal',BRUTE_FORCE:'pink',PORT_SCAN:'amber',
    EXPLOIT_ATTEMPT:'pink',EXPLOITATION_ATTEMPT:'pink',PATH_TRAVERSAL:'pink',
    INCIDENT_ISOLATION:'violet',AUTH_ATTEMPT:'amber',SUSPICIOUS_HTTP_REQUEST:'pink',
    classic:'teal',extended:'violet'
  };
  let opened=null;
  function makeNode(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function close(widget,returnFocus=false){
    if(!widget)return;
    widget.open=false;
    widget.menu.hidden=true;
    widget.trigger.classList.remove('is-open');
    widget.trigger.setAttribute('aria-expanded','false');
    if(opened===widget)opened=null;
    if(returnFocus)widget.trigger.focus();
  }
  function closeOthers(except){allWidgets.forEach(w=>{if(w!==except)close(w)});}
  function layout(widget){
    if(!widget.open)return;
    const r=widget.trigger.getBoundingClientRect();
    const width=Math.min(Math.max(r.width,250),Math.max(180,window.innerWidth-24));
    widget.menu.style.width=width+'px';
    const left=Math.max(12,Math.min(r.right-width,window.innerWidth-width-12));
    widget.menu.style.left=left+'px';
    widget.menu.style.maxHeight=Math.min(320,window.innerHeight-24)+'px';
    const height=Math.min(widget.menu.scrollHeight,320,window.innerHeight-24);
    const above=(window.innerHeight-r.bottom<height+15 && r.top>height+15);
    widget.menu.classList.toggle('opens-up',above);
    widget.menu.style.top=above?Math.max(12,r.top-height-7)+'px':Math.min(window.innerHeight-height-12,r.bottom+7)+'px';
  }
  function render(widget){
    const {select,trigger,title,menu}=widget;
    const chosen=select.selectedOptions[0]||select.options[0];
    title.textContent=chosen?chosen.textContent:'Choose option';
    trigger.setAttribute('aria-label',(select.getAttribute('aria-label')||widget.label)+': '+title.textContent);
    menu.replaceChildren();
    const head=makeNode('div','sh-dropdown-head');
    head.append(makeNode('span','',widget.kind==='events'?'EVENT TYPE FILTER':'DEMO SCENARIO'));
    head.append(makeNode('span','sh-dropdown-head-count',select.options.length+' OPTIONS'));
    menu.append(head);
    [...select.options].forEach((entry,index)=>{
      const item=makeNode('div','sh-dropdown-option');
      item.setAttribute('role','option');
      item.setAttribute('aria-selected',String(entry.value===select.value));
      item.setAttribute('tabindex','-1');
      item.dataset.value=entry.value;
      item.dataset.optionIndex=String(index);
      if(entry.value===select.value)item.classList.add('selected');
      const dot=makeNode('span','sh-dropdown-dot '+(palettes[entry.value]||'blue'));
      dot.setAttribute('aria-hidden','true');
      const labels=makeNode('span','sh-dropdown-option-text');
      labels.append(makeNode('strong','',entry.textContent));
      let sub=descriptions[entry.value]||'Filter recorded events';
      if(widget.kind==='events'){
        const count=entry.value==='all'?state.events.length:state.events.filter(e=>e.event_type===entry.value).length;
        sub=count+' event'+(count===1?'':'s')+' · '+sub;
      }
      labels.append(makeNode('small','',sub));
      const check=makeNode('span','sh-dropdown-check',entry.value===select.value?'✓':'');
      check.setAttribute('aria-hidden','true');
      item.append(dot,labels,check);
      menu.append(item);
    });
    layout(widget);
  }
  function show(widget,focusIndex){
    closeOthers(widget);
    widget.open=true;
    opened=widget;
    render(widget);
    widget.menu.hidden=false;
    widget.trigger.classList.add('is-open');
    widget.trigger.setAttribute('aria-expanded','true');
    layout(widget);
    if(focusIndex!==undefined)focusOption(widget,focusIndex);
  }
  function focusOption(widget,index){
    const opts=[...widget.menu.querySelectorAll('[role="option"]')];
    if(!opts.length)return;
    const safe=(index+opts.length)%opts.length;
    opts[safe].focus();
    opts[safe].scrollIntoView({block:'nearest'});
  }
  function choose(widget,value){
    if(![...widget.select.options].some(opt=>opt.value===value))return;
    const changed=widget.select.value!==value;
    widget.select.value=value;
    if(changed)widget.select.dispatchEvent(new Event('change',{bubbles:true}));
    allWidgets.forEach(render);
    close(widget,true);
  }
  for(const id of ['typeFilter','scenarioSelect','settingsScenario']){
    const select=$(id);
    if(!select||select.closest('.sh-dropdown-host'))continue;
    const host=makeNode('span','sh-dropdown-host'+(id==='typeFilter'?' sh-event-filter':''));
    select.parentNode.insertBefore(host,select);
    host.appendChild(select);
    select.classList.add('sh-select-native');
    select.tabIndex=-1;
    select.setAttribute('aria-hidden','true');
    const label=document.querySelector('label[for="'+id+'"]')?.textContent.trim()||select.getAttribute('aria-label')||'Select';
    const trigger=makeNode('button','sh-dropdown-trigger');
    trigger.type='button';
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    const glyph=makeNode('span','sh-dropdown-glyph');
    glyph.innerHTML=ICON(id==='typeFilter'?'scan':id==='scenarioSelect'?'activity':'settings');
    const title=makeNode('span','sh-dropdown-value');
    const arrow=makeNode('span','sh-dropdown-chevron');
    arrow.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    trigger.append(glyph,title,arrow);
    host.appendChild(trigger);
    const menu=makeNode('div','sh-dropdown-menu');
    menu.id='sh-menu-'+id;
    menu.setAttribute('role','listbox');
    menu.setAttribute('aria-label',label);
    menu.hidden=true;
    trigger.setAttribute('aria-controls',menu.id);
    document.body.appendChild(menu); // escape parent panel overflow:hidden
    const widget={select,trigger,title,menu,label,kind:id==='typeFilter'?'events':'scenarios',open:false};
    allWidgets.push(widget);
    trigger.addEventListener('click',()=>widget.open?close(widget):show(widget));
    trigger.addEventListener('keydown',e=>{
      if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){
        e.preventDefault();
        const selected=Math.max(0,select.selectedIndex);
        const target=e.key==='End'?select.options.length-1:e.key==='Home'?0:e.key==='ArrowUp'?selected-1:selected;
        show(widget,target);
      }
    });
    menu.addEventListener('click',e=>{
      const opt=e.target.closest('[role="option"]');
      if(opt&&menu.contains(opt))choose(widget,opt.dataset.value);
    });
    menu.addEventListener('keydown',e=>{
      const opts=[...menu.querySelectorAll('[role="option"]')];
      const active=opts.indexOf(document.activeElement);
      if(e.key==='Escape'){e.preventDefault();close(widget,true);}
      else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
        e.preventDefault();
        const next=e.key==='Home'?0:e.key==='End'?opts.length-1:e.key==='ArrowDown'?active+1:active-1;
        focusOption(widget,next);
      } else if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        if(active>=0)choose(widget,opts[active].dataset.value);
      } else if(e.key==='Tab'){close(widget);}
    });
    select.addEventListener('change',()=>allWidgets.forEach(render));
    // The event filter is repopulated from attack data by renderEvents().
    // This observer keeps the custom visual list in sync with those native options.
    new MutationObserver(()=>render(widget)).observe(select,{childList:true,subtree:true,characterData:true});
    render(widget);
  }
  document.addEventListener('pointerdown',e=>{
    if(opened&&!opened.menu.contains(e.target)&&!opened.trigger.contains(e.target))close(opened);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&opened){e.preventDefault();close(opened,true);}
  });
  window.addEventListener('resize',()=>{if(opened)layout(opened)});
  window.addEventListener('scroll',()=>{if(opened)layout(opened)},true);
}

async function boot(){wire();state.scenario='classic';$('scenarioSelect').value='classic';$('settingsScenario').value='classic';renderMode();renderOverview();renderEvents();enhanceDropdowns();renderAnalysis();renderDocker();renderLive();clock();setInterval(clock,1000);const page=location.hash.slice(1);if(page&&$('page-'+page))showPage(page);await checkHealth();refreshSettings();scheduleHealthCheck();setInterval(()=>{if(state.polling&&state.online)pollLive()},4000);}
boot().catch(e=>{console.error('SafeHeal boot failure:',e);toast('The dashboard could not initialize.',true)});
})();
