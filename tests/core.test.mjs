import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransition, procurementParity, sheffieldThreshold, sheffieldIncrementalResult,
  operationalMetrics, siteEconomics, modelDerivedThresholds, gateSummary, validateImportedState
} from '../core.mjs';

test('lifecycle enforces return-wash-inspect-reissue sequence and loss path',()=>{
  assert.equal(canTransition('Available','Issued'),true);
  assert.equal(canTransition('Issued','Lost'),true);
  assert.equal(canTransition('Returned','Available'),false);
  assert.equal(canTransition('Washed','Inspected'),true);
  assert.equal(canTransition('Inspected','Available'),true);
});

test('Sheffield benchmark reconstructs approximately 77.6% no-loss threshold',()=>{
  const x=sheffieldThreshold({meals:1000,standing:20,service:.30,wash:.011,single:.25,surcharge:.30});
  assert.ok(x>0.775&&x<0.777);
});

test('Sheffield selected-point result is finite',()=>{
  const x=sheffieldIncrementalResult({meals:1000,reuseShare:.70,standing:20,service:.30,wash:.011,single:.25,surcharge:.30});
  assert.ok(Number.isFinite(x));
});

test('current public procurement parity is approximately 34.9 uses',()=>{
  const x=procurementParity(73.99/12,(30.50+22.50)/300);
  assert.ok(x>34.8&&x<35.0);
});

test('operational metrics keep uptake and return separate and calculate return time',()=>{
  const t0='2026-01-01T10:00:00Z',t1='2026-01-02T10:00:00Z';
  const state={containers:[{status:'Available',cycles:1},{status:'Issued',cycles:0}],events:[{time:t0,container:'EC-0001',event:'Issued'},{time:t1,container:'EC-0001',event:'Returned'},{time:t1,container:'EC-0001',event:'Cycle completed'},{time:t0,container:'EC-0002',event:'Issued'}],observations:[{eligible:100,reusable:20}]};
  const m=operationalMetrics(state);
  assert.equal(m.returnRate,.5);
  assert.equal(m.uptake,.2);
  assert.equal(m.completed,1);
  assert.equal(m.medianReturnHours,24);
});

test('EcoLoop site economics separate fixed and variable revenue from operating cost',()=>{
  const r=siteEconomics({eligibleOrders:1000,uptakePct:50,returnPct:90,inspectionPassPct:95,assetUnitCost:6.17,expectedAssetCycles:50,washCost:.10,handlingCost:.05,logisticsCost:.08,fixedOperatingCost:200,fixedSiteCharge:300,variableCharge:.75});
  assert.ok(r && Number.isFinite(r.contribution));
  assert.equal(r.issues,500);
  assert.ok(r.completed>400&&r.completed<430);
  assert.ok(r.revenue>300);
});

test('model-derived thresholds return numerical commercial tests where solvable',()=>{
  const t=modelDerivedThresholds({eligibleOrders:1000,uptakePct:50,returnPct:90,inspectionPassPct:95,assetUnitCost:6.17,expectedAssetCycles:50,washCost:.10,handlingCost:.05,logisticsCost:.08,fixedOperatingCost:250,fixedSiteCharge:300,variableCharge:1.2});
  assert.ok(t.requiredUptake===null || Number.isFinite(t.requiredUptake));
  assert.ok(t.requiredReturn===null || Number.isFinite(t.requiredReturn));
});

test('manual gate is not evidence-ready without an evidence reference',()=>{
  const s=gateSummary([{mode:'manual',readiness:'Quoted/contracted',note:'',performance:'Pass'},{mode:'auto',readiness:'Observed',note:'',performance:'Pass'}]);
  assert.equal(s.ready,1);
});

test('import validation rejects duplicate IDs and invalid status',()=>{
  const bad={outlets:[],containers:[{id:'EC-0001',status:'Available',cycles:0},{id:'EC-0001',status:'Broken',cycles:0}],events:[],observations:[]};
  const v=validateImportedState(bad);
  assert.equal(v.ok,false);
  assert.ok(v.errors.length>=1);
});

test('import validation accepts valid prototype state',()=>{
  const good={outlets:[],containers:[{id:'EC-0001',status:'Available',cycles:0}],events:[],observations:[]};
  assert.equal(validateImportedState(good).ok,true);
});
