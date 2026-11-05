import test from 'node:test';
import assert from 'node:assert/strict';
import {measureSignal,summarizeMeasurements,HORIZONS} from '../lib/signal-performance.ts';
const now=new Date('2026-11-05T15:50:00Z');
const session={date:'2026-11-05',openMinute:570,closeMinute:960,isTradingDay:true,source:'ALPACA'};
const signal=(direction='CALL',time='2026-11-05T15:10:00Z')=>({id:1,session_date:'2026-11-05',ticker:'QQQ',direction,price:100,bar_timestamp:time,sent_at:'2026-11-05T15:11:20Z',status:'sent'});
const bar=(minutes,close,origin='2026-11-05T15:10:00Z')=>({t:new Date(Date.parse(origin)+minutes*60000).toISOString(),o:close,h:close+1,l:close-1,c:close,v:100});
test('uses exact completed IEX candle closes, without interpolation, across 5/10/15m',()=>{
 const m=measureSignal(signal(),[bar(5,101),bar(10,99),bar(15,100)],now,session);
 assert.equal(m.entryAt,'2026-11-05T15:11:00.000Z');
 assert.deepEqual(m.horizons.map(h=>h.status),['MEASURED','MEASURED','MEASURED']);
 assert.deepEqual(m.horizons.map(h=>h.directionalMovePct),[1,-1,0]);
 assert.deepEqual(m.horizons.map(h=>h.barAt),[5,10,15].map(n=>bar(n,101).t));
});
test('PUT direction reverses underlying stock movement but does not model options profit',()=>{
 const m=measureSignal(signal('PUT'),[bar(5,98)],now,session);
 assert.equal(m.horizons[0].stockMovePct,-2);
 assert.equal(m.horizons[0].directionalMovePct,2);
 assert.equal(m.horizons[1].status,'MISSING_BAR');
 assert.equal(Object.hasOwn(m,'optionPnl'),false);
});
test('unfinished interval is pending even if a provider returns a future candle',()=>{
 const t=new Date('2026-11-05T15:15:20Z');
 const m=measureSignal(signal(),[bar(5,105)],t,session);
 assert.equal(m.horizons[0].status,'PENDING');
 assert.equal(m.horizons[0].price,null);
});
test('missing IEX candle is never reconstructed using nearby candles',()=>{
 const m=measureSignal(signal(),[bar(4,101),bar(6,102),bar(10,103)],now,session);
 assert.equal(m.horizons[0].status,'MISSING_BAR');
 assert.equal(m.horizons[1].status,'MEASURED');
});
test('duplicate candle timestamps fail closed instead of allowing ambiguous measurements',()=>{
 const m=measureSignal(signal(),[bar(5,101),bar(5,104)],now,session);
 assert.equal(m.horizons[0].status,'MISSING_BAR');
});
test('reject invalid OHLC, zero volume, negative prices and premarket intervals',()=>{
 const zero={...bar(5,101),v:0};
 const malformed={...bar(10,102),h:100};
 const m=measureSignal(signal(),[zero,malformed,{...bar(15,101),c:-1}],now,session);
 assert.deepEqual(m.horizons.map(h=>h.status),['MISSING_BAR','MISSING_BAR','MISSING_BAR']);
 assert.equal(measureSignal(signal('CALL','2026-11-05T13:00:00Z'),[bar(5,101)],now,session),null);
});
test('early close makes out-of-session horizons unavailable instead of losses',()=>{
 const closing={...session,closeMinute:780}; // 1:00 ET
 const late=signal('CALL','2026-11-05T17:57:00Z');
 const m=measureSignal(late,[],new Date('2026-11-05T19:00:00Z'),closing);
 assert.deepEqual(m.horizons.map(h=>h.status),['OUTSIDE_SESSION','OUTSIDE_SESSION','OUTSIDE_SESSION']);
});
test('reject unconfirmed, failed, demo, cross-day, stale session and invalid base records',()=>{
 for(const row of [{...signal(),status:'pending'},{...signal(),status:'failed'},{...signal(),direction:'SIDEWAYS'},
  {...signal(),price:0},{...signal(),session_date:'2026-11-04'}])
  assert.equal(measureSignal(row,[],now,session),null);
 assert.equal(measureSignal(signal(),[],now,null),null);
 assert.equal(measureSignal(signal(),[],now,{...session,isTradingDay:false}),null);
 assert.equal(measureSignal(signal(),[],new Date('2026-11-06T15:50:00Z'),session),null);
});
test('scorecard excludes pending and missing, reports measured denominators and neutral outcomes',()=>{
 const m1=measureSignal(signal(),[bar(5,101),bar(10,100),bar(15,99)],now,session);
 const m2=measureSignal({...signal('PUT'),id:2},[bar(5,101),bar(15,99)],now,session);
 const rows=summarizeMeasurements([m1,m2]);
 assert.deepEqual(rows.map(r=>r.minutes),HORIZONS);
 assert.equal(rows[0].measured,2);
 assert.equal(rows[0].favorable,1);
 assert.equal(rows[0].unfavorable,1);
 assert.equal(rows[0].averageDirectionalPct,0);
 assert.equal(rows[1].missing,1);
 assert.equal(rows[1].flat,1);
 assert.equal(summarizeMeasurements([])[0].averageDirectionalPct,null);
});
