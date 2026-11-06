// V3.2 research-only signal quality. Sources: verified V3.1 horizon measurements
// plus exact-key joined scanner signal_events (never inferred from current prices).
import {easternClock} from './market-calendar.ts';
import {HORIZONS,type Horizon} from './signal-performance.ts';
import type {HistoricalMeasurement} from './historical-performance.ts';

export type SignalJournalMeta={
 session_date:string;ticker:string;direction:string;bar_timestamp:string;
 observed_price:number|null;vwap:number|null;volume_ratio:number|null;feed:string|null
};
export type QualityInput={measurement:HistoricalMeasurement;meta:SignalJournalMeta|null};
export type QualityBand={minutes:Horizon;eligible:number;measured:number;favorable:number;unfavorable:number;flat:number;missingOrInvalid:number;favorableRatePct:number|null;wilson95LowPct:number|null;wilson95HighPct:number|null;meanDirectionalPct:number|null};
export type QualityGroup={key:string;signals:number;bands:QualityBand[]};
export type QualityDimension={name:string;available:number;unavailable:number;groups:QualityGroup[]};
const round=(n:number)=>Math.round(n*100)/100;
const validNumber=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function metadataKey(value:Pick<SignalJournalMeta,'session_date'|'ticker'|'direction'|'bar_timestamp'>){
 const t=Date.parse(value.bar_timestamp);
 return Number.isFinite(t)?value.session_date+'|'+value.ticker+'|'+value.direction+'|'+new Date(t).toISOString():null;
}
export function journalMetadata(meta:SignalJournalMeta,measurement:HistoricalMeasurement):SignalJournalMeta|null{
 if(metadataKey(meta)!==metadataKey({session_date:measurement.sessionDate,ticker:measurement.ticker,direction:measurement.direction,bar_timestamp:measurement.confirmationBarAt}))return null;
 if(meta.feed!=='IEX'||!validNumber(meta.observed_price)||meta.observed_price<=0||
  Math.abs(meta.observed_price-measurement.entryPrice)>0.011)return null;
 return meta;
}
export function timeBucket(timestamp:string):string|null{
 const date=new Date(timestamp);
 if(!Number.isFinite(date.getTime()))return null;
 const min=easternClock(date).minute;
 if(min>=570&&min<630)return '09:30–10:29 ET';
 if(min>=630&&min<720)return '10:30–11:59 ET';
 if(min>=720&&min<840)return '12:00–13:59 ET';
 if(min>=840&&min<960)return '14:00–15:59 ET';
 return null;
}
export function vwapBucket(price:number,vwap:number|null):string|null{
 if(!validNumber(vwap)||vwap<=0||!validNumber(price)||price<=0)return null;
 const distance=Math.abs((price-vwap)/vwap)*100;
 return distance<0.25?'<0.25%':distance<0.75?'0.25–<0.75%':distance<1.5?'0.75–<1.5%':'≥1.5%';
}
export function volumeBucket(ratio:number|null):string|null{
 if(!validNumber(ratio)||ratio<=0)return null;
 return ratio<1.5?'<1.5×':ratio<2?'1.5–<2.0×':'≥2.0×';
}
export function qualityBand(rows:QualityInput[],minutes:Horizon):QualityBand{
 const results=rows.map(row=>row.measurement.horizons.find(h=>h.minutes===minutes));
 const values=results.filter((h):h is NonNullable<typeof h>=>!!h&&h.status==='MEASURED'&&
  validNumber(h.directionalMovePct)).map(h=>h.directionalMovePct!);
 const n=values.length,k=values.filter(v=>v>0).length,positive=n?k/n:null;
 // Wilson score 95% interval: descriptive uncertainty, not causation or an options win rate.
 const z=1.959963984540054;
 const denom=1+z*z/(n||1);
 const centre=n?(positive!+z*z/(2*n))/denom:null;
 const margin=n?z*Math.sqrt(positive!*(1-positive!)/n+z*z/(4*n*n))/denom:null;
 return {minutes,eligible:rows.length,measured:n,favorable:k,unfavorable:values.filter(v=>v<0).length,
  flat:values.filter(v=>v===0).length,missingOrInvalid:rows.length-n,
  favorableRatePct:n?round(positive!*100):null,
  wilson95LowPct:n?round(Math.max(0,(centre!-margin!))*100):null,
  wilson95HighPct:n?round(Math.min(1,(centre!+margin!))*100):null,
  meanDirectionalPct:n?round(values.reduce((a,b)=>a+b,0)/n):null};
}
function group(key:string,rows:QualityInput[]):QualityGroup{
 return {key,signals:rows.length,bands:HORIZONS.map(m=>qualityBand(rows,m))};
}
export function qualityDimension(name:string,rows:QualityInput[],category:(row:QualityInput)=>string|null):QualityDimension{
 const grouped=new Map<string,QualityInput[]>();let unavailable=0;
 for(const row of rows){
  const key=category(row);
  if(key===null){unavailable++;continue;}
  grouped.set(key,[...(grouped.get(key)||[]),row]);
 }
 return {name,available:rows.length-unavailable,unavailable,
  groups:[...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,samples])=>group(key,samples))};
}
export function signalQuality(rows:QualityInput[],coveragePartial:boolean){
 const byDirection=qualityDimension('CALL vs PUT',rows,r=>r.measurement.direction);
 const byTicker=qualityDimension('Ticker',rows,r=>r.measurement.ticker);
 const byTime=qualityDimension('Time of day (confirmation candle ET)',rows,r=>timeBucket(r.measurement.confirmationBarAt));
 const byVwap=qualityDimension('Absolute distance from recorded VWAP',rows,r=>{
  const meta=r.meta&&journalMetadata(r.meta,r.measurement);
  return meta?vwapBucket(r.measurement.entryPrice,meta.vwap):null;
 });
 const byVolume=qualityDimension('Recorded IEX volume ratio',rows,r=>{
  const meta=r.meta&&journalMetadata(r.meta,r.measurement);
  return meta?volumeBucket(meta.volume_ratio):null;
 });
 return {sampleSize:rows.length,coveragePartial,overall:group('All assessed records',rows),
  dimensions:[byDirection,byTicker,byTime,byVwap,byVolume],
  eventDays:{status:'UNAVAILABLE' as const,reason:'No independently verified CPI, Federal Reserve or per-ticker earnings event calendar has been configured. No event labels or event-day comparisons are inferred.'},
  note:'Research only. Favorable means a directionally favorable underlying IEX stock close, never options profit or a fill. Wilson 95% intervals describe sampling uncertainty only; selection bias, source gaps and unverified or omitted history remain. VWAP distance uses the scanner journal at confirmation time; groups exclude missing or mismatched journal metadata.'};
}
