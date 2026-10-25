import {
  canTransition, procurementParity, sheffieldThreshold, sheffieldIncrementalResult,
  operationalMetrics, siteEconomics, modelDerivedThresholds, gateSummary, validateImportedState
} from './core.mjs';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const gbp=v=>Number.isFinite(v)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v):'-';
const pct=v=>Number.isFinite(v)?`${(v*100).toFixed(1)}%`:'-';
const n1=v=>Number.isFinite(v)?new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(v):'-';
const now=()=>new Date().toISOString();
const STORE='ecoloop-pack-pilot-final-v1';
const GATE_STORE='ecoloop-pack-gates-final-v1';

let benchmarks=[], sources=[], gates=[];
let currentThresholds={requiredUptake:null,requiredReturn:null,requiredInspection:null};

const objectives=[
  {id:'O1',title:'Evaluate external drivers',feature:'Market context and source register',measure:'Official market/procurement evidence remains separate from EcoLoop demand claims.'},
  {id:'O2',title:'Synthesize programme evidence',feature:'Return benchmark comparison',measure:'Cross-case return values are displayed without pooling into an assumed EcoLoop rate.'},
  {id:'O3',title:'Identify operational requirements',feature:'Lifecycle state machine and timing',measure:'Issue, return, wash, inspection, reissue, loss and retirement are recorded as separate events.'},
  {id:'O4',title:'Analyse procurement and economics',feature:'Benchmark + conditional site model',measure:'Published economics, public procurement and EcoLoop commercial variables remain analytically separate.'},
  {id:'O5',title:'Define the business/revenue architecture',feature:'Cost/revenue separation',measure:'Fixed site-management and variable completed-circulation charges are distinct from operating costs.'},
  {id:'O6',title:'Support stop, redesign or scale decisions',feature:'Eight evidence gates',measure:'Evidence readiness is separated from performance against model-derived thresholds.'}
];

const trace=[
  {id:'T1',q:'Why is QR not presented as the innovation?',evidence:'Existing reuse providers already use QR/barcode/RFID and dashboards.',decision:'QR is retained as an enabling control layer. The service proposition is the managed physical loop plus evidence governance.'},
  {id:'T2',q:'Why are uptake and return separate?',evidence:'Selected programmes show that high recovery can coexist with low adoption.',decision:'Eligible orders and reusable issues are recorded separately from issue/return events.'},
  {id:'T3',q:'Why is there no generic carbon-saving output?',evidence:'Published break-even points vary materially with asset, washing, transport and system boundaries.',decision:'The sustainability module reports benchmark attainment only; it is not an EcoLoop LCA.'},
  {id:'T4',q:'Why begin with a dense anchor site?',evidence:'Network-density and scale evidence indicate that acquisition and operating efficiency are conditional on geography and throughput.',decision:'The first commercial step is a controlled dense-site pilot rather than city-wide rollout.'},
  {id:'T5',q:'Why are evidence readiness and performance separate?',evidence:'A measured result can still be commercially poor.',decision:'Each gate records whether credible evidence exists and whether that evidence satisfies the relevant business test.'}
];

async function loadData(){
  [benchmarks,sources,gates]=await Promise.all([
    'data/benchmark_programmes.json','data/source_register.json','data/evidence_gates.json'
  ].map(u=>fetch(u).then(r=>{if(!r.ok) throw new Error(`Could not load ${u}`); return r.json();})));
  try{
    const saved=JSON.parse(localStorage.getItem(GATE_STORE));
    if(Array.isArray(saved)&&saved.length===gates.length){
      gates=gates.map((g,i)=>({...g,...saved[i],mode:g.mode}));
    }
  }catch{}
}

function seedState(){
  return {
    outlets:[{id:'O-001',name:'Demo Food Outlet',active:true},{id:'O-002',name:'Demo Return Point',active:true}],
    containers:Array.from({length:10},(_,i)=>({id:`EC-${String(i+1).padStart(4,'0')}`,status:'Available',cycles:0,lastPoint:'-',updated:now()})),
    events:[],observations:[]
  };
}
function loadState(){try{const s=JSON.parse(localStorage.getItem(STORE));const v=validateImportedState(s);return v.ok?s:seedState();}catch{return seedState();}}
let state=loadState();
function save(){localStorage.setItem(STORE,JSON.stringify(state));}
function saveGates(){localStorage.setItem(GATE_STORE,JSON.stringify(gates.map(g=>({id:g.id,readiness:g.readiness,performance:g.performance,note:g.note||''}))));}
function announce(msg){$('liveStatus').textContent=msg;}
function getContainer(id){return state.containers.find(c=>c.id===id);}
function selected(){return getContainer($('containerSelect').value);}
function pointName(){return state.outlets.find(o=>o.id===$('outletSelect').value)?.name||'-';}
function addEvent(c,eventName,point,ref){state.events.unshift({time:now(),container:c.id,event:eventName,point,ref:ref||''});}

function renderEvidence(){
  $('returnChart').innerHTML=benchmarks.map(b=>`<div class="bar-row"><span>${esc(b.programme)}</span><div class="bar-track"><div class="bar-fill" style="width:${b.returnRate}%"></div></div><strong>${b.returnRate}%</strong></div>`).join('');
  $('benchmarkBody').innerHTML=benchmarks.map(b=>`<tr><td><strong>${esc(b.programme)}</strong></td><td>${esc(b.setting)}</td><td>${b.returnRate}%</td><td>${b.uptake==null?'-':b.uptake+'%'}</td><td>${esc(b.evidence)}</td><td>${esc(b.signal)}</td></tr>`).join('');
  $('sourceBody').innerHTML=sources.map(s=>`<tr><td><strong>${esc(s.source)}</strong></td><td>${esc(s.type)}</td><td>${esc(s.usedFor)}</td><td>${esc(s.boundary)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noreferrer">Open source</a></td></tr>`).join('');
  $('objectiveGrid').innerHTML=objectives.map(o=>`<article class="objective-card"><div class="trace-id">${o.id}</div><h3>${esc(o.title)}</h3><p><strong>Artefact feature:</strong> ${esc(o.feature)}</p><p>${esc(o.measure)}</p></article>`).join('');
  $('traceGrid').innerHTML=trace.map(t=>`<article class="trace-card"><div class="trace-id">${t.id}</div><h3>${esc(t.q)}</h3><dl><dt>Evidence</dt><dd>${esc(t.evidence)}</dd><dt>Design decision</dt><dd>${esc(t.decision)}</dd></dl></article>`).join('');
}

function renderOps(){
  const currentId=$('containerSelect').value;
  $('containerSelect').innerHTML=state.containers.map(c=>`<option value="${c.id}">${c.id} - ${c.status}</option>`).join('');
  if(currentId&&getContainer(currentId)) $('containerSelect').value=currentId;
  const c=selected();
  $('containerId').textContent=c?.id||'-'; $('containerStatus').textContent=c?.status||'-';
  $('qrImage').src=c?`assets/qr/${c.id}.png`:'';
  const options=state.outlets.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('');
  const keepPoint=$('outletSelect').value, keepObs=$('obsOutlet').value;
  $('outletSelect').innerHTML=options; $('obsOutlet').innerHTML=options;
  if(state.outlets.some(o=>o.id===keepPoint)) $('outletSelect').value=keepPoint;
  if(state.outlets.some(o=>o.id===keepObs)) $('obsOutlet').value=keepObs;
  const m=operationalMetrics(state);
  $('kFleet').textContent=m.fleet; $('kAvailable').textContent=m.available; $('kIssued').textContent=m.issued; $('kReturned').textContent=m.returned; $('kWashed').textContent=m.washed; $('kInspected').textContent=m.inspected; $('kLost').textContent=m.lost; $('kCycles').textContent=m.completed; $('kReturnRate').textContent=m.returnRate==null?'-':pct(m.returnRate); $('kReturnTime').textContent=m.medianReturnHours==null?'-':formatHours(m.medianReturnHours); $('kUptake').textContent=m.uptake==null?'-':pct(m.uptake);
  $('inventoryBody').innerHTML=state.containers.map(c=>`<tr><td><strong>${c.id}</strong></td><td>${c.status}</td><td>${c.cycles}</td><td>${esc(c.lastPoint)}</td><td>${new Date(c.updated).toLocaleString('en-GB')}</td></tr>`).join('');
  $('eventsBody').innerHTML=state.events.length?state.events.map(e=>`<tr><td>${new Date(e.time).toLocaleString('en-GB')}</td><td>${e.container}</td><td>${esc(e.event)}</td><td>${esc(e.point)}</td><td>${esc(e.ref)}</td></tr>`).join(''):'<tr><td colspan="5">No events recorded.</td></tr>';
  $('observationsBody').innerHTML=state.observations.length?state.observations.slice().reverse().map(o=>`<tr><td>${o.date}</td><td>${esc(o.outlet)}</td><td>${o.eligible}</td><td>${o.reusable}</td><td>${o.eligible?((o.reusable/o.eligible)*100).toFixed(1)+'%':'-'}</td><td>${esc(o.note)}</td></tr>`).join(''):'<tr><td colspan="6">No daily observations recorded.</td></tr>';
  $('outletCards').innerHTML=state.outlets.map(o=>`<article><h3>${esc(o.name)}</h3><p>${o.id}</p><small>${o.active?'Active':'Inactive'}</small></article>`).join('');
  const actionTargets={issue:'Issued',return:'Returned',wash:'Washed',inspect:'Inspected',reissue:'Available',lost:'Lost',retire:'Retired'};
  document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=!c||!canTransition(c.status,actionTargets[b.dataset.action]);});
  updateAutoGates();
}

function formatHours(h){if(h<24)return `${h.toFixed(1)} h`;return `${(h/24).toFixed(1)} d`;}

function operate(action){
  const c=selected(); if(!c)return;
  const target={issue:'Issued',return:'Returned',wash:'Washed',inspect:'Inspected',reissue:'Available',lost:'Lost',retire:'Retired'}[action];
  if(!canTransition(c.status,target)){setOperation(`Transition ${c.status} → ${target} is not allowed.`);return;}
  const before=c.status; c.status=target; c.lastPoint=pointName(); c.updated=now();
  let eventName=target;
  if(action==='inspect') eventName='Inspection passed';
  if(action==='reissue'){c.cycles+=1; eventName='Cycle completed';}
  addEvent(c,eventName,c.lastPoint,$('transactionRef').value.trim());
  save(); renderOps(); renderGates();
  setOperation(`${c.id}: ${before} → ${target}. ${action==='reissue'?'One completed circulation has been counted after inspection.':'Event recorded.'}`);
}
function setOperation(msg){$('operationMessage').textContent=msg;announce(msg);}

function setupOps(){
  $('containerSelect').addEventListener('change',renderOps);
  $('addOutlet').addEventListener('click',()=>{const name=$('outletName').value.trim();if(!name)return;const next=`O-${String(state.outlets.length+1).padStart(3,'0')}`;state.outlets.push({id:next,name,active:true});$('outletName').value='';save();renderOps();});
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>operate(b.dataset.action)));
  $('manualLoad').addEventListener('click',()=>{const id=$('manualId').value.trim().toUpperCase();if(!getContainer(id)){setOperation('That ID is not present in this local fleet.');return;}$('containerSelect').value=id;renderOps();setOperation(`${id} loaded.`);});
  $('addObservation').addEventListener('click',()=>{const eligible=+$('obsEligible').value,reusable=+$('obsReusable').value;if(!$('obsDate').value||!Number.isFinite(eligible)||!Number.isFinite(reusable)||eligible<0||reusable<0||reusable>eligible){alert('Check the date and values. Reusable issues cannot exceed eligible orders.');return;}state.observations.push({date:$('obsDate').value,outlet:state.outlets.find(o=>o.id===$('obsOutlet').value)?.name||'-',eligible,reusable,note:$('obsNote').value.trim()});save();renderOps();renderGates();$('obsEligible').value='';$('obsReusable').value='';$('obsNote').value='';});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(`tab-${b.dataset.tab}`).classList.add('active');}));
  $('exportEvents').addEventListener('click',()=>downloadCsv('EcoLoop_event_log.csv',[['time','container_id','event','point','reference'],...state.events.slice().reverse().map(e=>[e.time,e.container,e.event,e.point,e.ref])]));
  $('exportObservations').addEventListener('click',()=>downloadCsv('EcoLoop_daily_uptake.csv',[['date','outlet','eligible_orders','reusable_issues','uptake','note'],...state.observations.map(o=>[o.date,o.outlet,o.eligible,o.reusable,o.eligible?o.reusable/o.eligible:'',o.note])]));
  $('backup').addEventListener('click',()=>downloadBlob('EcoLoop_evidence_bundle.json',JSON.stringify({version:1,exportedAt:now(),state,gates},null,2),'application/json'));
  $('importState').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const x=JSON.parse(await f.text());const s=x.state||x;const v=validateImportedState(s);if(!v.ok)throw new Error(v.errors.join(' '));state=s;if(Array.isArray(x.gates)&&x.gates.length===gates.length){gates=gates.map((g,i)=>({...g,...x.gates[i],mode:g.mode}));saveGates();}save();renderOps();renderGates();setOperation('Imported and validated local evidence bundle.');}catch(err){alert(`Import rejected: ${err.message}`);}e.target.value='';});
  $('reset').addEventListener('click',()=>{if(confirm('Reset all local demonstration data?')){state=seedState();localStorage.removeItem(GATE_STORE);save();location.reload();}});
  $('obsDate').value=new Date().toISOString().slice(0,10); $('scanBtn').addEventListener('click',scanQr); renderOps();
}

function downloadCsv(name,rows){const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');downloadBlob(name,csv,'text/csv');}
function downloadBlob(name,text,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

async function scanQr(){
  if(!('BarcodeDetector' in window)){ $('scanStatus').textContent='Camera QR decoding is not available in this browser. Manual ID entry remains available.'; return; }
  let stream;
  try{
    const detector=new BarcodeDetector({formats:['qr_code']});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});const video=$('camera');video.hidden=false;video.srcObject=stream;await video.play();$('scanStatus').textContent='Camera active - point it at an EcoLoop QR code.';
    const stop=()=>{stream?.getTracks().forEach(t=>t.stop());video.pause();video.hidden=true;};const started=Date.now();
    const loop=async()=>{if(Date.now()-started>20000){stop();$('scanStatus').textContent='No QR detected within 20 seconds. Use manual ID if required.';return;}const codes=await detector.detect(video);if(codes.length){const id=String(codes[0].rawValue||'').trim().toUpperCase();stop();if(getContainer(id)){$('containerSelect').value=id;renderOps();$('scanStatus').textContent=`Scanned ${id}.`;}else{$('scanStatus').textContent=`Scanned ${id}, but it is not in this local fleet.`;}return;}requestAnimationFrame(loop);};loop();
  }catch(err){stream?.getTracks().forEach(t=>t.stop());$('camera').hidden=true;$('scanStatus').textContent=`Camera scan unavailable: ${err.message}. Manual ID remains active.`;}
}

function getSiteInput(){
  const ids=['siteEligible','siteUptakePct','siteReturnPct','siteInspectionPassPct','siteAssetUnitCost','siteExpectedAssetCycles','siteWashCost','siteHandlingCost','siteLogisticsCost','siteFixedOperatingCost','siteFixedSiteCharge','siteVariableCharge'];
  const values=Object.fromEntries(ids.map(id=>[id,$(id).value]));
  if(ids.some(id=>values[id]==='')) return null;
  return {eligibleOrders:+values.siteEligible,uptakePct:+values.siteUptakePct,returnPct:+values.siteReturnPct,inspectionPassPct:+values.siteInspectionPassPct,assetUnitCost:+values.siteAssetUnitCost,expectedAssetCycles:+values.siteExpectedAssetCycles,washCost:+values.siteWashCost,handlingCost:+values.siteHandlingCost,logisticsCost:+values.siteLogisticsCost,fixedOperatingCost:+values.siteFixedOperatingCost,fixedSiteCharge:+values.siteFixedSiteCharge,variableCharge:+values.siteVariableCharge};
}

function updateAutoGates(){
  const m=operationalMetrics(state);
  for(const g of gates){
    if(g.mode==='auto-uptake'){
      g.readiness=m.eligible>0?'Observed':'Not evidenced';
      if(m.uptake!=null&&currentThresholds.requiredUptake!=null&&currentThresholds.requiredUptake>=0&&currentThresholds.requiredUptake<=1) g.performance=m.uptake>=currentThresholds.requiredUptake?'Pass':'Fail'; else g.performance=m.uptake!=null?'Not assessed':'Not assessed';
      g.note=m.uptake==null?'':`Observed uptake ${pct(m.uptake)}${currentThresholds.requiredUptake!=null?`; model-derived minimum ${pct(currentThresholds.requiredUptake)}`:''}.`;
    }
    if(g.mode==='auto-return'){
      g.readiness=m.issues>0?'Observed':'Not evidenced';
      if(m.returnRate!=null&&currentThresholds.requiredReturn!=null&&currentThresholds.requiredReturn>=0&&currentThresholds.requiredReturn<=1) g.performance=m.returnRate>=currentThresholds.requiredReturn?'Pass':'Fail'; else g.performance=m.returnRate!=null?'Not assessed':'Not assessed';
      g.note=m.issues?`Issues ${m.issues}; returns ${m.returns}; return ${pct(m.returnRate)}; median return ${m.medianReturnHours==null?'not yet available':formatHours(m.medianReturnHours)}${currentThresholds.requiredReturn!=null?`; model-derived minimum ${pct(currentThresholds.requiredReturn)}`:''}.`:'';
    }
    if(g.mode==='auto-durability'){
      const hasEvidence=m.completed>0||m.lost>0||m.retired>0;
      g.readiness=hasEvidence?'Observed':'Not evidenced';
      const model=getSiteInput();
      if(m.averageRetiredCycles!=null&&model){g.performance=m.averageRetiredCycles>=model.expectedAssetCycles?'Pass':'Fail';}
      else g.performance='Not assessed';
      g.note=hasEvidence?`Completed cycles ${m.completed}; lost ${m.lost}; retired ${m.retired}${m.averageRetiredCycles==null?'':`; average cycles at retirement ${m.averageRetiredCycles.toFixed(1)}`}.`:'';
    }
  }
  saveGates();
}

function badgeClass(v){if(v==='Observed'||v==='Quoted/contracted'||v==='Pass')return v==='Pass'?'pass':'ready';if(v==='Public benchmark'||v==='Watch'||v==='Not assessed')return 'public';return v==='Fail'?'fail':'none';}
function renderGates(){
  updateAutoGates();
  const readinessOptions=['Not evidenced','Public benchmark','Quoted/contracted','Observed'];
  const perfOptions=['Not assessed','Pass','Fail','Watch'];
  $('gateGrid').innerHTML=gates.map((g,i)=>{
    const auto=g.mode!=='manual';
    return `<article><div class="gate-meta">${g.id} - ${esc(g.required)}</div><h3>${esc(g.name)}</h3><p>${esc(g.question)}</p>${auto?`<p><span class="badge ${badgeClass(g.readiness)}">${esc(g.readiness)}</span> <span class="badge ${badgeClass(g.performance)}">${esc(g.performance)}</span></p><p class="micro">${esc(g.note||'Evidence will update from recorded pilot data.')}</p>`:`<label>Evidence readiness<select data-gate-ready="${i}">${readinessOptions.map(o=>`<option ${o===g.readiness?'selected':''}>${o}</option>`).join('')}</select></label><label>Performance result<select data-gate-performance="${i}">${perfOptions.map(o=>`<option ${o===g.performance?'selected':''}>${o}</option>`).join('')}</select></label><label>Evidence reference / note<input data-gate-note="${i}" value="${esc(g.note||'')}" placeholder="quotation, file, data extract or approval ref"></label>`}</article>`;
  }).join('');
  document.querySelectorAll('[data-gate-ready]').forEach(el=>el.addEventListener('change',()=>{const g=gates[+el.dataset.gateReady];g.readiness=el.value;saveGates();renderGates();}));
  document.querySelectorAll('[data-gate-performance]').forEach(el=>el.addEventListener('change',()=>{gates[+el.dataset.gatePerformance].performance=el.value;saveGates();renderGates();}));
  document.querySelectorAll('[data-gate-note]').forEach(el=>el.addEventListener('change',()=>{gates[+el.dataset.gateNote].note=el.value.trim();saveGates();renderGates();}));
  const s=gateSummary(gates); $('gateReady').textContent=`${s.ready} / ${s.total}`; $('gatePassed').textContent=`${s.passed} / ${s.total}`;
  let decision='Evidence incomplete', message='<strong>No scale conclusion is justified.</strong> Evidence gaps remain.';
  if(s.allReady&&!s.allPass){decision=s.failed?'Redesign / stop review':'Performance review required';message='<strong>Evidence is mature enough to evaluate, but readiness is not the same as success.</strong> Any failed or unassessed performance gate requires redesign, additional analysis or a stop decision.';}
  if(s.allReady&&s.allPass){decision='Scale review eligible';message='<strong>All gates are evidence-ready and pass their current tests.</strong> This authorises a formal commercial scale review; it does not automatically authorise expansion.';}
  $('gateDecision').textContent=decision; $('gateMessage').innerHTML=message;
}

function calcPublished(){
  const input={meals:+$('econMeals').value,reuseShare:+$('econReuse').value/100,standing:+$('econStanding').value,service:+$('econService').value,wash:+$('econWash').value,single:+$('econSingle').value,surcharge:+$('econSurcharge').value};
  const th=sheffieldThreshold(input), res=sheffieldIncrementalResult(input), prem=input.service+input.wash-input.single;
  $('econThreshold').textContent=pct(th); $('econResult').textContent=gbp(res); $('econPremium').textContent=gbp(prem);
  $('econExplanation').textContent=`At ${input.meals.toLocaleString('en-GB')} eligible transactions, the retained published inputs produce a no-loss threshold of ${(th*100).toFixed(1)}%. This reconstructs a published case and is not an EcoLoop tariff or forecast.`;
}

function calcSite(){
  const input=getSiteInput();
  if(!input){currentThresholds={requiredUptake:null,requiredReturn:null,requiredInspection:null};['siteCompleted','siteCost','siteRevenue','siteContribution','reqUptake','reqReturn','reqInspection'].forEach(id=>$(id).textContent='-');$('siteResult').textContent='No EcoLoop result is shown until all required site-model fields are entered.';renderGates();return;}
  const result=siteEconomics(input); currentThresholds=modelDerivedThresholds(input);
  if(!result){$('siteResult').textContent='Check site-model values. Percentages must be between 0 and 100 and expected cycles must be greater than zero.';return;}
  $('siteCompleted').textContent=n1(result.completed); $('siteCost').textContent=gbp(result.totalCost); $('siteRevenue').textContent=gbp(result.revenue); $('siteContribution').textContent=gbp(result.contribution);
  $('reqUptake').textContent=currentThresholds.requiredUptake!=null&&currentThresholds.requiredUptake>=0&&currentThresholds.requiredUptake<=1?pct(currentThresholds.requiredUptake):'Not solvable';
  $('reqReturn').textContent=currentThresholds.requiredReturn!=null&&currentThresholds.requiredReturn>=0&&currentThresholds.requiredReturn<=1?pct(currentThresholds.requiredReturn):'Not solvable';
  $('reqInspection').textContent=currentThresholds.requiredInspection!=null&&currentThresholds.requiredInspection>=0&&currentThresholds.requiredInspection<=1?pct(currentThresholds.requiredInspection):'Not solvable';
  $('siteResult').innerHTML=`<strong>${result.contribution>=0?'Non-negative':'Negative'} monthly contribution at the entered evidence/assumptions: ${gbp(result.contribution)}.</strong><br>Required variable charge at the entered operating performance: ${gbp(result.requiredVariableCharge)} per completed circulation. Required fixed site-management charge at the entered variable tariff: ${gbp(result.requiredFixedSiteCharge)} per month. These outputs are conditional on the entered inputs.`;
  renderGates();
}

function setupEconomics(){
  document.querySelectorAll('#sheffieldForm input').forEach(x=>x.addEventListener('input',calcPublished));
  document.querySelectorAll('#siteForm input').forEach(x=>x.addEventListener('input',calcSite));
  calcPublished(); $('parityResult').textContent=`${procurementParity(73.99/12,(30.50+22.50)/300).toFixed(1)} successful uses`; calcSite();
}

const envCases=[
  {id:'hitt',label:'Hitt et al. (2023) base GWP case',gwpMin:4,gwpMax:6,water:null,note:'The paper reports approximately four to six uses in its base case.'},
  {id:'sheffield-base',label:'Hoseini et al. (2024) Sheffield base case',gwpMin:60,gwpMax:60,water:136,note:'Published base-case thresholds.'},
  {id:'sheffield-light',label:'Hoseini et al. (2024) 40g reusable sensitivity',gwpMin:13,gwpMax:13,water:30,note:'Published lighter-container sensitivity; durability remains a separate condition.'},
  {id:'sheffield-best',label:'Hoseini et al. (2024) combined best case',gwpMin:5,gwpMax:5,water:15,note:'Published best-case sensitivity.'}
];
function setupEnvironment(){
  $('envCase').innerHTML=envCases.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
  const update=()=>{const c=envCases.find(x=>x.id===$('envCase').value);$('gwpBep').textContent=c.gwpMin===c.gwpMax?`${c.gwpMin} uses`:`${c.gwpMin}-${c.gwpMax} uses`;$('waterBep').textContent=c.water?`${c.water} uses`:'Not reported';const raw=$('observedUses').value;if(raw===''){$('envMessage').textContent=`${c.note} Enter verified completed cycles for comparison.`;return;}const n=+raw;const gwpok=n>=c.gwpMin;let msg=`At ${n} verified completed uses, the asset ${gwpok?'reaches':'does not reach'} the lower GWP threshold reported for this study case.`;if(c.water)msg+=` It ${n>=c.water?'reaches':'does not reach'} the reported water threshold.`;msg+=' This remains benchmark comparison rather than an EcoLoop LCA because the pilot system boundary may differ.';$('envMessage').textContent=msg;};
  $('envCase').addEventListener('change',update); $('observedUses').addEventListener('input',update); update();
}

document.addEventListener('DOMContentLoaded',async()=>{
  try{await loadData();renderEvidence();setupOps();setupEconomics();setupEnvironment();renderGates();}
  catch(err){console.error(err);document.body.insertAdjacentHTML('afterbegin',`<div class="decision-boundary"><strong>Prototype data failed to load:</strong> ${esc(err.message)}. Open the repository through a local server or GitHub Pages, or use the standalone demo.</div>`);}
});
