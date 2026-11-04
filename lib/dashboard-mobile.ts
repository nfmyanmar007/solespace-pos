import {easternClock} from './market-calendar.ts';
export const WATCHLIST=['QQQ','SPY','TSLA','NVDA','AMD','AAPL','MSFT','GOOGL'] as const;
export type WatchTicker=typeof WATCHLIST[number];
export type DeliveredAlert={ticker:WatchTicker;direction:'CALL'|'PUT';price:number;trigger:number;barTimestamp:string;sentAt:string};
export function todayNY(now:Date){return easternClock(now).date;}
export function isWatchTicker(value:unknown):value is WatchTicker{
 return typeof value==='string'&&WATCHLIST.some(t=>t===value);
}
export function statusDetails(status:string):{label:string;kind:'confirmed'|'watch'|'blocked';description:string}{
 if(status==='CONFIRMED CALL')return {label:'CONFIRMED CALL',kind:'confirmed',description:'Current candles pass the CALL checks; not a guaranteed trade'};
 if(status==='CONFIRMED PUT')return {label:'CONFIRMED PUT',kind:'confirmed',description:'Current candles pass the PUT checks; not a guaranteed trade'};
 if(status==='READY')return {label:'READY',kind:'watch',description:'Watch level only. Entry NOT confirmed'};
 if(status==='WAIT')return {label:'WAIT',kind:'watch',description:'Required confirmation conditions have not passed'};
 if(status==='STALE'||status==='PREMARKET STALE')return {label:'STALE',kind:'blocked',description:'Old or extended setup. Do not chase'};
 if(status==='PRELIMINARY')return {label:'PRELIMINARY',kind:'watch',description:'Premarket levels are not entries'};
 return {label:status||'NO DATA',kind:'blocked',description:'No valid confirmed trading setup'};
}
export function normalizeDeliveredAlerts(records:unknown,now:Date):DeliveredAlert[]{
 if(!Array.isArray(records))return [];
 const date=todayNY(now);const seen=new Set<string>();const alerts:DeliveredAlert[]=[];
 for(const r of records){
  if(!r||typeof r!=='object')continue;
  const a=r as Record<string,unknown>;
  if(!isWatchTicker(a.ticker)||(a.direction!=='CALL'&&a.direction!=='PUT')||a.status!=='sent'||a.session_date!==date)continue;
  if(typeof a.bar_timestamp!=='string'||typeof a.sent_at!=='string')continue;
  const bar=Date.parse(a.bar_timestamp),sent=Date.parse(a.sent_at);
  const price=Number(a.price),trigger=Number(a.trigger_price);
  if(!Number.isFinite(bar)||!Number.isFinite(sent)||sent>now.getTime()+60000||!Number.isFinite(price)||price<=0||!Number.isFinite(trigger)||trigger<=0)continue;
  if(todayNY(new Date(bar))!==date||todayNY(new Date(sent))!==date)continue;
  const key=a.ticker+'|'+a.direction+'|'+a.bar_timestamp;
  if(seen.has(key))continue;
  seen.add(key);
  alerts.push({ticker:a.ticker,direction:a.direction,price,trigger,barTimestamp:a.bar_timestamp,sentAt:a.sent_at});
 }
 return alerts.sort((a,b)=>Date.parse(b.sentAt)-Date.parse(a.sentAt));
}
