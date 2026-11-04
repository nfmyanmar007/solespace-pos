import test from 'node:test';
import assert from 'node:assert/strict';
import {buildChart} from '../lib/chart-data.ts';
const now=new Date('2026-11-04T09:41:10-05:00');
const mk=(minute,o=100)=>({
 t:new Date(`2026-11-04T09:${String(minute).padStart(2,'0')}:00-05:00`).toISOString(),
 o,h:o+.15,l:o-.12,c:o+.05,v:1000
});
const bars=()=>Array.from({length:11},(_,i)=>mk(30+i,100+i*.08));
test('1m chart keeps completed source bars, VWAP and real opening levels',()=>{
 const result=buildChart('QQQ',bars(),now,'1m');
 assert.equal(result.bars.length,11);
 assert.equal(result.callAbove,100.47);
 assert.equal(result.putBelow,99.88);
 assert.ok(result.bars[0].vwap>0);
 assert.equal(result.stale,false);
});
test('5m chart aggregates only complete five consecutive minute buckets',()=>{
 const result=buildChart('QQQ',bars(),now,'5m');
 assert.equal(result.bars.length,2);
 assert.equal(result.bars[0].volume,5000);
 assert.equal(result.bars[0].open,100);
 assert.equal(result.bars[0].close,bars()[4].c);
 assert.equal(result.bars[1].time,bars()[5].t);
});
test('missing minute is not synthesized; incomplete 5m group is omitted',()=>{
 const source=bars().filter(b=>b.t!==bars()[7].t);
 const minute=buildChart('QQQ',source,now,'1m');
 const five=buildChart('QQQ',source,now,'5m');
 assert.equal(minute.bars.length,10);
 assert.equal(five.bars.length,1);
});
test('incomplete 9:30–9:35 range hides trigger lines',()=>{
 const source=bars().slice(1);
 const result=buildChart('SPY',source,now,'1m');
 assert.equal(result.callAbove,null);
 assert.equal(result.putBelow,null);
 assert.match(result.warning,/Opening range incomplete/);
});
test('invalid, future and unfinished bars are filtered out',()=>{
 const invalid={...mk(38),h:1};
 const future=mk(42);
 const unfinished=mk(41);
 const result=buildChart('TSLA',[...bars(),invalid,future,unfinished],new Date('2026-11-04T09:40:10-05:00'),'1m');
 assert.equal(result.bars.length,10);
 assert.ok(result.bars.every(b=>b.time!==future.t));
});
test('historical markers must come from recorded, same-date confirmed events',()=>{
 const signals=[
 {time:bars()[6].t,direction:'CALL',price:100.4},
 {time:'2026-11-03T15:30:00Z',direction:'PUT',price:101},
 {time:bars()[7].t,direction:'PUT',price:-4}
 ];
 const result=buildChart('QQQ',bars(),now,'1m',signals);
 assert.equal(result.markers.length,1);
 assert.equal(result.markers[0].direction,'CALL');
});
test('stale market feed is labeled, not presented as live',()=>{
 const result=buildChart('QQQ',bars(),new Date('2026-11-04T11:15:00-05:00'),'5m');
 assert.equal(result.stale,true);
 assert.match(result.warning,/old/);
});
