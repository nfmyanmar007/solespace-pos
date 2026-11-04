import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateIndicators,scoreSetup} from '../lib/indicators.ts';
const start=Date.parse('2026-11-04T09:30:00-05:00');
function candles(count,{interval=1,rising=true}={}){
 return Array.from({length:count},(_,i)=>{
  const p=100+(rising?i*.12:0);
  return {time:new Date(start+i*interval*60000).toISOString(),
   open:p-.02,high:p+.14,low:p-.16,close:p,volume:1000+i*4,vwap:p-.15};
 });
}
test('EMA 9/21 initializes only after consecutive warmup bars',()=>{
 const r=calculateIndicators(candles(22),1);
 assert.equal(r[7].ema9,null);assert.ok(r[8].ema9!==null);
 assert.equal(r[19].ema21,null);assert.ok(r[20].ema21!==null);
 assert.ok(r[21].ema9>r[21].ema21);
});
test('flat candles produce RSI 50, MACD 0, and zero-width Bollinger bands',()=>{
 const r=calculateIndicators(candles(40,{rising:false}),1),last=r.at(-1);
 assert.equal(last.rsi14,50);
 assert.equal(last.macd,0);assert.equal(last.macdSignal,0);assert.equal(last.macdHistogram,0);
 assert.equal(last.bbMiddle,100);assert.equal(last.bbLower,100);assert.equal(last.bbUpper,100);
 assert.equal(last.atr14,0.3);
});
test('MACD 12/26/9 requires 34 complete bars and RSI Wilder starts at 15',()=>{
 const rows=calculateIndicators(candles(34),1);
 assert.equal(rows[13].rsi14,null);assert.equal(rows[14].rsi14,100);
 assert.equal(rows[24].macd,null);assert.ok(rows[25].macd!==null);
 assert.equal(rows[32].macdSignal,null);assert.ok(rows[33].macdSignal!==null);
 assert.ok(rows[33].macdHistogram!==null);
});
test('ATR 14 and Bollinger 20/2 require completed warmups',()=>{
 const rows=calculateIndicators(candles(22),1);
 assert.equal(rows[13].atr14,null);assert.ok(rows[14].atr14!==null);
 assert.equal(rows[18].bbUpper,null);assert.ok(rows[19].bbUpper!==null);
 assert.ok(rows[21].bbUpper>rows[21].bbLower);
});
test('missing IEX minute resets warmup, never invents EMA or MACD continuity',()=>{
 const source=candles(45).filter((_,i)=>i!==40);
 const rows=calculateIndicators(source,1);
 assert.equal(rows.at(-1).ema9,null);
 assert.equal(rows.at(-1).macd,null);
 assert.equal(rows.at(-1).rsi14,null);
});
test('RVOL requires five distinct prior NY sessions for the exact same clock minute',()=>{
 const data=candles(36),last=data.at(-1);
 const dates=['2026-10-28','2026-10-29','2026-10-30','2026-11-02','2026-11-03'];
 const hist=dates.map(date=>({time:date+'T10:05:00-04:00',volume:500}));
 // Daylight-saving change on Nov 2: correct clock time has -05:00 offset.
 hist[3].time='2026-11-02T10:05:00-05:00';
 hist[4].time='2026-11-03T10:05:00-05:00';
 const rows=calculateIndicators(data,1,hist);
 assert.equal(rows.at(-1).rvol,2.28);
 assert.equal(calculateIndicators(data,1,hist.slice(0,4)).at(-1).rvol,null);
});
test('5m RVOL needs all five matched historical minutes per prior day',()=>{
 const rows=candles(38,{interval:5}),target=rows.at(-1);
 const dates=['2026-10-28','2026-10-29','2026-10-30','2026-11-02','2026-11-03'];
 const minute=(Date.parse(target.time)-start)/60000; // local clock 12:35 ET
 const local='12:35';
 const history=dates.flatMap((date,i)=>Array.from({length:5},(_,j)=>({
  time:date+'T12:'+String(35+j).padStart(2,'0')+':00'+(i<3?'-04:00':'-05:00'),
  volume:200
 })));
 assert.equal(calculateIndicators(rows,5,history).at(-1).rvol,1.148);
 assert.equal(calculateIndicators(rows,5,history.slice(0,-1)).at(-1).rvol,null);
});
test('score is null for stale or insufficient feed and never masquerades as a probability',()=>{
 const bars=candles(40),rows=calculateIndicators(bars,1);
 assert.equal(scoreSetup(bars,rows,true).score,null);
 assert.equal(scoreSetup(bars.slice(0,10),rows.slice(0,10),false).grade,'Insufficient data');
 const score=scoreSetup(bars,rows,false);
 assert.ok(score.score!==null);
 assert.ok(score.score<=89); // Cannot reach A+ without time-of-day RVOL history
 assert.match(score.reason,/not win probability/);
});
