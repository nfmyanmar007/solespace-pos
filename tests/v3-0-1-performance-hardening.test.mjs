import test from 'node:test';
import assert from 'node:assert/strict';
import {allowPerformanceRead,shortLivedServerCache} from '../lib/performance-read-guard.ts';
import {measureSignal,verifyReferenceCandle} from '../lib/signal-performance.ts';
const session={date:'2026-11-05',openMinute:570,closeMinute:960,isTradingDay:true,source:'ALPACA'};
const now=new Date('2026-11-05T15:50:00Z');
const sent={id:47,session_date:'2026-11-05',ticker:'AMZN',direction:'PUT',price:268.48,bar_timestamp:'2026-11-05T14:41:00Z',sent_at:'2026-11-05T14:42:03Z',status:'sent'};
const bar=(t,c)=>({t,o:c,h:c+0.5,l:c-0.5,c,v:100});
test('request budget rejects the 16th request in a window and resets later',()=>{
 for(let i=0;i<15;i++)assert.equal(allowPerformanceRead(1000),true);
 assert.equal(allowPerformanceRead(1000),false);
 assert.equal(allowPerformanceRead(61000),true);
});
test('server cache coalesces concurrent loads, expires values and excludes failed loads',async()=>{
 const cache=shortLivedServerCache(120000);
 let calls=0;
 const load=async()=>{calls++;await Promise.resolve();return {ok:true};};
 const [a,b]=await Promise.all([cache.get(load),cache.get(load)]);
 assert.deepEqual(a,{ok:true});assert.deepEqual(b,a);assert.equal(calls,1);
 assert.deepEqual(await cache.get(load),a);assert.equal(calls,1);
 cache.clear();
 await assert.rejects(cache.get(async()=>{throw Error('upstream');}));
 await cache.get(load);assert.equal(calls,2);
});
test('exact confirmation bar must be present and agree within scanner cent rounding',()=>{
 const actual=bar('2026-11-05T14:41:00Z',268.484);
 assert.equal(verifyReferenceCandle(sent,[actual],now,session),'MATCHED');
 assert.equal(verifyReferenceCandle(sent,[],now,session),'REFERENCE_BAR_MISSING');
 assert.equal(verifyReferenceCandle(sent,[bar(actual.t,267.98)],now,session),'PRICE_MISMATCH');
 assert.equal(verifyReferenceCandle(sent,[actual,actual],now,session),'REFERENCE_BAR_MISSING');
 assert.equal(verifyReferenceCandle(sent,[bar('2026-11-05T14:41:01Z',268.48)],now,session),'REFERENCE_BAR_MISSING');
});
test('recorded Telegram delivery delay is computed relative to completed candle close',()=>{
 const m=measureSignal(sent,[],now,session);
 assert.equal(m.entryAt,'2026-11-05T14:42:00.000Z');
 assert.equal(m.sentAt,'2026-11-05T14:42:03Z');
 assert.equal(m.deliveryDelaySeconds,3);
});
test('triple duplicate IEX minute timestamps remain invalid',()=>{
 const same=bar('2026-11-05T14:46:00Z',266);
 const m=measureSignal(sent,[same,same,same],now,session);
 assert.equal(m.horizons[0].status,'MISSING_BAR');
});
