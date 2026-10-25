export const STATUS_FLOW = Object.freeze({
  Available: ['Issued', 'Retired'],
  Issued: ['Returned', 'Lost'],
  Returned: ['Washed', 'Retired'],
  Washed: ['Inspected', 'Retired'],
  Inspected: ['Available', 'Retired'],
  Lost: [],
  Retired: []
});

export function canTransition(from, to) {
  return (STATUS_FLOW[from] || []).includes(to);
}

export function procurementParity(reusableUnit, disposableSet) {
  const r = Number(reusableUnit), d = Number(disposableSet);
  return r > 0 && d > 0 ? r / d : NaN;
}

export function sheffieldThreshold({meals, standing, service, wash, single, surcharge}) {
  const N=Number(meals), F=Number(standing), S=Number(service), W=Number(wash), D=Number(single), Q=Number(surcharge);
  if (![N,F,S,W,D,Q].every(Number.isFinite) || N <= 0) return NaN;
  const premium = S + W - D;
  const denom = premium + Q;
  if (denom === 0) return NaN;
  return Math.max(0, Math.min(1, (Q - F / N) / denom));
}

export function sheffieldIncrementalResult({meals, reuseShare, standing, service, wash, single, surcharge}) {
  const N=Number(meals), r=Number(reuseShare), F=Number(standing), S=Number(service), W=Number(wash), D=Number(single), Q=Number(surcharge);
  if (![N,r,F,S,W,D,Q].every(Number.isFinite) || N < 0 || r < 0 || r > 1) return NaN;
  return N * (1-r) * Q - (F + N * r * (S + W - D));
}

export function median(values) {
  const xs=(values||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if (!xs.length) return null;
  const mid=Math.floor(xs.length/2);
  return xs.length % 2 ? xs[mid] : (xs[mid-1]+xs[mid])/2;
}

export function returnDurationsHours(events) {
  const sorted=[...(events||[])].filter(e=>e && e.time && e.container && e.event)
    .sort((a,b)=>new Date(a.time)-new Date(b.time));
  const open=new Map();
  const durations=[];
  for (const e of sorted) {
    if (e.event === 'Issued') open.set(e.container, new Date(e.time).getTime());
    if (e.event === 'Returned' && open.has(e.container)) {
      const start=open.get(e.container), end=new Date(e.time).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) durations.push((end-start)/3600000);
      open.delete(e.container);
    }
    if (e.event === 'Lost') open.delete(e.container);
  }
  return durations;
}

export function operationalMetrics(state) {
  const events=Array.isArray(state?.events)?state.events:[];
  const observations=Array.isArray(state?.observations)?state.observations:[];
  const containers=Array.isArray(state?.containers)?state.containers:[];
  const issues=events.filter(e=>e.event==='Issued').length;
  const returns=events.filter(e=>e.event==='Returned').length;
  const completed=events.filter(e=>e.event==='Cycle completed').length;
  const lostEvents=events.filter(e=>e.event==='Lost').length;
  const eligible=observations.reduce((s,x)=>s+(Number(x.eligible)||0),0);
  const reusable=observations.reduce((s,x)=>s+(Number(x.reusable)||0),0);
  const durations=returnDurationsHours(events);
  const retiredCycles=containers.filter(c=>c.status==='Retired').map(c=>Number(c.cycles)||0);
  return {
    fleet: containers.length,
    available: containers.filter(c=>c.status==='Available').length,
    issued: containers.filter(c=>c.status==='Issued').length,
    returned: containers.filter(c=>c.status==='Returned').length,
    washed: containers.filter(c=>c.status==='Washed').length,
    inspected: containers.filter(c=>c.status==='Inspected').length,
    lost: containers.filter(c=>c.status==='Lost').length,
    retired: containers.filter(c=>c.status==='Retired').length,
    issues, returns, completed, lostEvents,
    returnRate: issues ? returns/issues : null,
    lossRate: issues ? lostEvents/issues : null,
    eligible, reusable,
    uptake: eligible ? reusable/eligible : null,
    medianReturnHours: median(durations),
    averageRetiredCycles: retiredCycles.length ? retiredCycles.reduce((a,b)=>a+b,0)/retiredCycles.length : null
  };
}

export function siteEconomics(input) {
  const E=Number(input.eligibleOrders), u=Number(input.uptakePct)/100, r=Number(input.returnPct)/100, p=Number(input.inspectionPassPct)/100;
  const A=Number(input.assetUnitCost), L=Number(input.expectedAssetCycles), W=Number(input.washCost), H=Number(input.handlingCost), G=Number(input.logisticsCost);
  const Fcost=Number(input.fixedOperatingCost), Frev=Number(input.fixedSiteCharge), V=Number(input.variableCharge);
  const vals=[E,u,r,p,A,L,W,H,G,Fcost,Frev,V];
  if (!vals.every(Number.isFinite) || E<0 || u<0 || u>1 || r<0 || r>1 || p<0 || p>1 || A<0 || L<=0 || W<0 || H<0 || G<0 || Fcost<0 || Frev<0 || V<0) return null;
  const issues=E*u;
  const returned=issues*r;
  const completed=returned*p;
  const losses=issues-returned;
  const assetAmort=A/L;
  const variableCostPerCompleted=assetAmort+W+H+G;
  const replacementCost=losses*A;
  const totalVariableCost=completed*variableCostPerCompleted+replacementCost;
  const totalCost=Fcost+totalVariableCost;
  const revenue=Frev+completed*V;
  const contribution=revenue-totalCost;
  const requiredVariableCharge=completed>0?Math.max(0,(totalCost-Frev)/completed):null;
  const requiredFixedSiteCharge=Math.max(0,totalCost-completed*V);
  return {issues,returned,completed,losses,assetAmort,variableCostPerCompleted,replacementCost,totalVariableCost,totalCost,revenue,contribution,requiredVariableCharge,requiredFixedSiteCharge};
}

export function modelDerivedThresholds(input) {
  const E=Number(input.eligibleOrders), r=Number(input.returnPct)/100, p=Number(input.inspectionPassPct)/100;
  const A=Number(input.assetUnitCost), L=Number(input.expectedAssetCycles), W=Number(input.washCost), H=Number(input.handlingCost), G=Number(input.logisticsCost);
  const Fcost=Number(input.fixedOperatingCost), Frev=Number(input.fixedSiteCharge), V=Number(input.variableCharge), u=Number(input.uptakePct)/100;
  const vals=[E,r,p,A,L,W,H,G,Fcost,Frev,V,u];
  if(!vals.every(Number.isFinite)||E<=0||L<=0||r<0||r>1||p<0||p>1||u<0||u>1) return {requiredUptake:null,requiredReturn:null,requiredInspection:null};
  const C=A/L+W+H+G;
  const fixedGap=Fcost-Frev;
  const perIssueMarginAtReturn = r*p*(V-C) - (1-r)*A;
  const requiredUptake = perIssueMarginAtReturn>0 ? fixedGap/(E*perIssueMarginAtReturn) : null;
  const denomReturn = p*(V-C)+A;
  const requiredReturn = (u>0 && denomReturn>0) ? (A + fixedGap/(E*u))/denomReturn : null;
  const requiredInspection = (u>0 && r>0 && (V-C)>0) ? (fixedGap/(E*u*r) + ((1-r)/r)*A)/(V-C) : null;
  return {
    requiredUptake: Number.isFinite(requiredUptake)?requiredUptake:null,
    requiredReturn: Number.isFinite(requiredReturn)?requiredReturn:null,
    requiredInspection: Number.isFinite(requiredInspection)?requiredInspection:null
  };
}

export function gateSummary(gates) {
  const arr=Array.isArray(gates)?gates:[];
  const ready=arr.filter(g=>(g.readiness==='Observed'||g.readiness==='Quoted/contracted') && (g.mode!=='manual' || String(g.note||'').trim().length>0)).length;
  const passed=arr.filter(g=>g.performance==='Pass').length;
  const failed=arr.filter(g=>g.performance==='Fail').length;
  return {total:arr.length,ready,passed,failed,allReady:arr.length>0&&ready===arr.length,allPass:arr.length>0&&passed===arr.length};
}

export function validateImportedState(candidate) {
  const errors=[];
  if(!candidate || typeof candidate!=='object') return {ok:false,errors:['Import must be a JSON object.']};
  const state=candidate.state||candidate;
  if(!Array.isArray(state.containers)) errors.push('containers must be an array');
  if(!Array.isArray(state.events)) errors.push('events must be an array');
  if(!Array.isArray(state.observations)) errors.push('observations must be an array');
  if(!Array.isArray(state.outlets)) errors.push('outlets must be an array');
  if(errors.length) return {ok:false,errors};
  const allowed=new Set(Object.keys(STATUS_FLOW));
  const ids=new Set();
  for(const c of state.containers){
    if(!c || typeof c.id!=='string' || !/^EC-\d{4}$/.test(c.id)) errors.push('invalid container id');
    if(ids.has(c.id)) errors.push(`duplicate container id ${c.id}`); ids.add(c.id);
    if(!allowed.has(c.status)) errors.push(`invalid status ${c.status}`);
    if(!Number.isFinite(Number(c.cycles)) || Number(c.cycles)<0) errors.push(`invalid cycle count for ${c.id}`);
  }
  for(const o of state.observations){
    if(!Number.isFinite(Number(o.eligible))||Number(o.eligible)<0) errors.push('invalid eligible orders');
    if(!Number.isFinite(Number(o.reusable))||Number(o.reusable)<0||Number(o.reusable)>Number(o.eligible)) errors.push('invalid reusable issues');
  }
  return {ok:errors.length===0,errors:[...new Set(errors)]};
}
