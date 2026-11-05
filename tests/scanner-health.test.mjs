import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyScannerHealth,summarizeDeliveryStatus} from '../lib/scanner-health.ts';
const now=new Date('2026-11-05T15:00:00Z'); // Thursday 10:00 Eastern
const run=(secondsAgo)=>({created_at:new Date(now.getTime()-secondsAgo*1000).toISOString(),mode:'IEX LIVE',market_state:'REGULAR SESSION',signal_count:8});
test('recent two-minute scanner records are healthy during regular hours',()=>{
 const h=classifyScannerHealth(now,[run(60),run(180),run(300)],'REGULAR SESSION');
 assert.equal(h.state,'HEALTHY');assert.equal(h.missedWindows,0);assert.equal(h.recentRuns,3);
});
test('missing runs are not called healthy',()=>{
 assert.equal(classifyScannerHealth(now,[],'REGULAR SESSION').state,'NO DATA');
 assert.equal(classifyScannerHealth(now,[run(360)],'REGULAR SESSION').state,'LATE');
});
test('historical missed scan windows produce a warning even if latest run is timely',()=>{
 const h=classifyScannerHealth(now,[run(60),run(180),run(700)],'REGULAR SESSION');
 assert.equal(h.state,'LATE');assert.equal(h.missedWindows,1);
});
test('after hours and unverified calendar never imply successful live scanning',()=>{
 const after=new Date('2026-11-05T22:00:00Z');
 assert.equal(classifyScannerHealth(after,[run(3600)],'AFTER HOURS').state,'IDLE');
 assert.notEqual(classifyScannerHealth(now,[run(60)],'CALENDAR UNAVAILABLE').state,'HEALTHY');
});
test('future or malformed timestamp records are ignored',()=>{
 const h=classifyScannerHealth(now,[{...run(60),created_at:'invalid'},run(120)],'REGULAR SESSION');
 assert.equal(h.lastRunAt,run(120).created_at);
});
test('Telegram 24h count differentiates sent, failed and delivery error events',()=>{
 const recent=new Date(now.getTime()-3600000).toISOString(),old=new Date(now.getTime()-90000000).toISOString();
 const d=summarizeDeliveryStatus([{status:'sent',created_at:recent},{status:'failed',created_at:recent},{status:'sent',created_at:old}],
 [{created_at:recent,event_type:'telegram_error'},{created_at:old,event_type:'failed'}],now);
 assert.deepEqual(d,{sent:1,failed:1,pending:0,deliveryFailures:1,hasFailures:true});
});
