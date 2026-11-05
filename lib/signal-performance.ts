// V3.0 read-only measurement of actual sent confirmations, NOT options returns.
// Entry reference is the scanner-observed IEX close of the confirmed bar.
// A 5-minute outcome uses the close of the candle opening exactly 5 minutes AFTER
// the confirmation candle's opening timestamp (5 full minutes after its close).
import type {Bar} from './engine.ts';
import {easternClock,type SessionWindow} from './market-calendar.ts';
export const HORIZONS=[5,10,15] as const;
export type Horizon=typeof HORIZONS[number];
export type ResultStatus='MEASURED'|'PENDING'|'MISSING_BAR'|'OUTSIDE_SESSION'|'INVALID';
export type HorizonResult={minutes:Horizon;status:ResultStatus;barAt:string|null;price:number|null;stockMovePct:number|null;directionalMovePct:number|null};
export type SentSignal={id:number;session_date:string;ticker:string;direction:string;price:number;bar_timestamp:string;sent_at:string|null;status:string};
export type SignalMeasurement={id:number;ticker:string;direction:'CALL'|'PUT';entryPrice:number;confirmationBarAt:string;entryAt:string;sentAt:string|null;horizons:HorizonResult[]};
const round=(v:number)=>Math.round(v*10000)/10000;
const day=(d:Date)=>easternClock(d).date;
const okBar=(b:Bar,now:Date,session:SessionWindow)=>{
 const time=Date.parse(b.t);
 if(!Number.isFinite(time)||time+60000>now.getTime()||day(new Date(time))!==session.date)return false;
 const minute=easternClock(new Date(time)).minute;
 return minute>=session.openMinute&&minute<session.closeMinute
  &&[b.o,b.h,b.l,b.c,b.v].every(Number.isFinite)&&Number.isInteger(b.v)&&b.v>0&&b.l>0
  &&b.h>=Math.max(b.o,b.c,b.l)&&b.l<=Math.min(b.o,b.c);
};
export function measureSignal(s:SentSignal,bars:Bar[],now:Date,session:SessionWindow|null):SignalMeasurement|null{
 const t=Date.parse(s.bar_timestamp),sent=s.sent_at?Date.parse(s.sent_at):NaN;
 if(s.status!=='sent'||(s.direction!=='CALL'&&s.direction!=='PUT')||!Number.isFinite(t)
  ||!Number.isFinite(sent)||!Number.isFinite(s.price)||s.price<=0||!Number.isInteger(s.id)
  ||!session||session.source!=='ALPACA'||!session.isTradingDay
  ||day(new Date(t))!==s.session_date||s.session_date!==session.date||day(now)!==session.date)return null;
 const candle=easternClock(new Date(t)).minute;
 if(candle<session.openMinute||candle>=session.closeMinute||t+60000>now.getTime())return null;
 const unique=new Map<number,Bar>();
 for(const b of bars){
  if(!okBar(b,now,session))continue;
  const ts=Date.parse(b.t);
  if(!unique.has(ts))unique.set(ts,b);
  else unique.delete(ts); // duplicated candle = ambiguous; never score
 }
 const horizons=HORIZONS.map(minutes=>{
  const target=t+minutes*60000;
  const at=new Date(target).toISOString();
  const base={minutes,status:'INVALID' as ResultStatus,barAt:null as string|null,price:null as number|null,stockMovePct:null as number|null,directionalMovePct:null as number|null};
  if(easternClock(new Date(target)).date!==session.date||easternClock(new Date(target)).minute>=session.closeMinute)
   return {...base,status:'OUTSIDE_SESSION' as const};
  if(now.getTime()<target+60000)return {...base,status:'PENDING' as const};
  const bar=unique.get(target);
  if(!bar)return {...base,status:'MISSING_BAR' as const};
  const stockMovePct=round((bar.c-s.price)/s.price*100);
  return {...base,status:'MEASURED' as const,barAt:at,price:bar.c,stockMovePct,
   directionalMovePct:s.direction==='CALL'?stockMovePct:-stockMovePct};
 });
 return {id:s.id,ticker:s.ticker,direction:s.direction,entryPrice:s.price,confirmationBarAt:s.bar_timestamp,
  entryAt:new Date(t+60000).toISOString(),sentAt:s.sent_at,horizons};
}
export type MetricSummary={minutes:Horizon;measured:number;favorable:number;unfavorable:number;flat:number;missing:number;pending:number;outsideSession:number;averageDirectionalPct:number|null};
export function summarizeMeasurements(rows:SignalMeasurement[]):MetricSummary[]{
 return HORIZONS.map(minutes=>{
  const observations=rows.map(r=>r.horizons.find(h=>h.minutes===minutes)).filter((h):h is HorizonResult=>!!h);
  const measured=observations.filter(h=>h.status==='MEASURED'&&h.directionalMovePct!==null);
  const values=measured.map(h=>h.directionalMovePct!);
  return {minutes,measured:values.length,favorable:values.filter(v=>v>0).length,
   unfavorable:values.filter(v=>v<0).length,flat:values.filter(v=>v===0).length,
   missing:observations.filter(h=>h.status==='MISSING_BAR').length,
   pending:observations.filter(h=>h.status==='PENDING').length,
   outsideSession:observations.filter(h=>h.status==='OUTSIDE_SESSION').length,
   averageDirectionalPct:values.length?round(values.reduce((a,b)=>a+b,0)/values.length):null};
 });
}
