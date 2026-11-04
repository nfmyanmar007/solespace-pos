import {easternClock} from './market-calendar.ts';
import type {Bar,Ticker} from './engine.ts';
export type ChartInterval='1m'|'5m';
export type ChartCandle={time:string;open:number;high:number;low:number;close:number;volume:number;vwap:number};
export type ChartMarker={time:string;direction:'CALL'|'PUT';price:number};
export type ChartData={ticker:Ticker;interval:ChartInterval;feed:'IEX';asOf:string;lastBarTime:string|null;stale:boolean;callAbove:number|null;putBelow:number|null;bars:ChartCandle[];markers:ChartMarker[];warning:string};
const etMinute=(date:Date)=>easternClock(date).minute;
const round=(v:number)=>Math.round(v*100)/100;
export function buildChart(ticker:Ticker,source:Bar[],now:Date,interval:ChartInterval,markers:ChartMarker[]=[]):ChartData{
 const date=easternClock(now).date;
 const valid=source.filter(b=>{
  const t=Date.parse(b.t);if(!Number.isFinite(t)||t+60000>now.getTime())return false;
  const v=easternClock(new Date(t));const m=v.minute;
  return v.date===date&&m>=570&&m<960&&[b.o,b.h,b.l,b.c,b.v].every(Number.isFinite)&&
   b.l>0&&b.v>0&&Number.isInteger(b.v)&&b.h>=Math.max(b.o,b.c,b.l)&&b.l<=Math.min(b.o,b.c);
 }).sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));
 // Keep one bar per minute, and preserve missing minutes as gaps (never synthesize values).
 const unique:Bar[]=[];const seen=new Set<number>();
 for(const b of valid){const t=Date.parse(b.t);if(!seen.has(t)){seen.add(t);unique.push(b);}}
 let cumulativePV=0,cumulativeVol=0;
 const one=unique.map(b=>{
  cumulativePV+=((b.h+b.l+b.c)/3)*b.v;
  cumulativeVol+=b.v;
  return {time:b.t,open:b.o,high:b.h,low:b.l,close:b.c,volume:b.v,vwap:round(cumulativePV/cumulativeVol)};
 });
 const open=unique.filter(b=>{const m=etMinute(new Date(b.t));return m>=570&&m<575;});
 const completeOpening=open.length===5&&[570,571,572,573,574].every(m=>open.some(b=>etMinute(new Date(b.t))===m));
 const callAbove=completeOpening?round(Math.max(...open.map(b=>b.h))):null;
 const putBelow=completeOpening?round(Math.min(...open.map(b=>b.l))):null;
 let bars:ChartCandle[];
 if(interval==='1m')bars=one;
 else{
  const groups=new Map<number,ChartCandle[]>();
  for(const b of one){const group=Math.floor(etMinute(new Date(b.time))/5)*5;const rows=groups.get(group)||[];rows.push(b);groups.set(group,rows);}
  bars=[];
  for(const group of [...groups.keys()].sort((a,b)=>a-b)){
   const groupBars=groups.get(group)!;
   // 5-minute candles must include ALL five completed consecutive IEX minutes.
   if(groupBars.length!==5)continue;
   const mins=groupBars.map(b=>etMinute(new Date(b.time)));
   if(![0,1,2,3,4].every(i=>mins.includes(group+i)))continue;
   bars.push({time:groupBars[0].time,open:groupBars[0].open,high:Math.max(...groupBars.map(b=>b.high)),low:Math.min(...groupBars.map(b=>b.low)),close:groupBars[4].close,volume:groupBars.reduce((s,b)=>s+b.volume,0),vwap:groupBars[4].vwap});
  }
 }
 const last=one.at(-1);
 const stale=!last||now.getTime()-(Date.parse(last.time)+60000)>3*60000;
 const recorded=markers.filter(m=>Number.isFinite(Date.parse(m.time))&&Number.isFinite(m.price)&&m.price>0&&easternClock(new Date(m.time)).date===date&&['CALL','PUT'].includes(m.direction))
  .map(m=>({...m,price:round(m.price)}));
 const warning=one.length===0?'No completed regular-session IEX bars are available.':
 !completeOpening?'Opening range incomplete: CALL/PUT levels hidden.':
 interval==='5m'&&bars.length===0?'No complete five-minute groups available from the IEX feed.':
 stale?'Last completed IEX candle is old; chart is not a current trading quote.':
 'IEX only, not consolidated. Missing candles are not filled.';
 return {ticker,interval,feed:'IEX',asOf:now.toISOString(),lastBarTime:last?.time||null,stale,callAbove,putBelow,bars:bars.slice(-150),markers:recorded,warning};
}
