import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateManualPosition} from '../lib/manual-risk.ts';
const base={ticker:'QQQ',side:'CALL',strike:600,expiration:'2026-11-20',
 quantity:2,multiplier:100,entryPremium:2,stopPremium:1.5,targetPremium:3,
 currentPremium:null};
test('CALL multi-contract cost, max planned downside, target and ratio',()=>{
 const r=evaluateManualPosition(base);
 assert.equal(r.entryCost,400);assert.equal(r.plannedLoss,100);
 assert.equal(r.plannedGain,200);assert.equal(r.riskReward,2);
 assert.equal(r.breakEvenAtExpiry,602);
 assert.equal(r.pnl,null);assert.equal(r.review,'AWAITING_QUOTE');
});
test('PUT break-even and manual mark-to-market estimate',()=>{
 const r=evaluateManualPosition({...base,side:'PUT',currentPremium:2.5});
 assert.equal(r.breakEvenAtExpiry,598);assert.equal(r.currentValue,500);
 assert.equal(r.pnl,100);assert.equal(r.pnlPct,25);
 assert.equal(r.review,'BETWEEN_LEVELS');
});
test('inclusive stop and profit checkpoints use manual premium only',()=>{
 assert.equal(evaluateManualPosition({...base,currentPremium:1.5}).review,'BELOW_STOP_REVIEW');
 assert.equal(evaluateManualPosition({...base,currentPremium:3}).review,'AT_TARGET_REVIEW');
 assert.equal(evaluateManualPosition({...base,currentPremium:1}).pnl,-200);
});
test('rejects inverted levels, impossible dates, invalid quantity, and unsafe marks',()=>{
 for(const changes of [{stopPremium:2},{targetPremium:2},{quantity:0},
 {quantity:1.5},{multiplier:0},{expiration:'2026-02-30'},{ticker:'QQQ;'},
 {entryPremium:NaN},{currentPremium:0},{currentPremium:Infinity}]){
  assert.throws(()=>evaluateManualPosition({...base,...changes}));
 }
});
test('premium stop is planned loss, never guaranteed execution or maximum option loss',()=>{
 const r=evaluateManualPosition({...base,currentPremium:0.5});
 assert.equal(r.review,'BELOW_STOP_REVIEW');
 assert.equal(r.plannedLoss,100); // Entire $400 debit can be lost despite $100 planned loss.
 assert.equal(r.entryCost,400);
});
