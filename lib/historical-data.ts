// Historical IEX reads use verified Alpaca calendar sessions and bounded API work.
// Never infer a candle from neighbouring minutes, or infer a trade/options return.
import type {Bar} from './engine.ts';
import {resolveSession,type SessionWindow} from './market-calendar.ts';
import type {SentSignal} from './signal-performance.ts';
export const MAX_HISTORY_PAIRS=60;
const tickerPattern=/^[A-Z]{1,5}(\.[A-Z])?$/;
export function historicalQueryDays(value:string|null):7|30|90|null{
 return value===null||value==='7'?7:value==='30'?30:value==='90'?90:null;
}
export function validHistoricalSignal(s:SentSignal):boolean{
 return Number.isInteger(s.id)&&s.id>0&&s.status==='sent'&&tickerPattern.test(s.ticker)&&
 (s.direction==='CALL'||s.direction==='PUT')&&Number.isFinite(Number(s.price))&&Number(s.price)>0&&
 Number.isFinite(Date.parse(s.bar_timestamp))&&!!s.sent_at&&Number.isFinite(Date.parse(s.sent_at));
}
export function historyPairs(records:SentSignal[]):{key:string;date:string;ticker:string;signals:SentSignal[]}[]{
 const pairs=new Map<string,{key:string;date:string;ticker:string;signals:SentSignal[]}>();
 for(const s of records){
  if(!validHistoricalSignal(s))continue;
  const key=s.session_date+'|'+s.ticker;
  const group=pairs.get(key)||{key,date:s.session_date,ticker:s.ticker,signals:[]};
  group.signals.push(s);pairs.set(key,group);
 }
 return [...pairs.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.ticker.localeCompare(b.ticker));
}
export async function historicalSessions(from:string,to:string):Promise<Map<string,SessionWindow>>{
 const key=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 if(!key||!secret)throw Error('Market calendar credentials unavailable');
 const url=new URL('https://paper-api.alpaca.markets/v2/calendar');
 url.searchParams.set('start',from);url.searchParams.set('end',to);
 const res=await fetch(url,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},cache:'no-store',signal:AbortSignal.timeout(6500)});
 if(!res.ok)throw Error('Verified historical calendar unavailable');
 const rows=await res.json() as {date:string;open:string;close:string}[];
 if(!Array.isArray(rows))throw Error('Invalid Alpaca calendar');
 const sessions=new Map<string,SessionWindow>();
 for(const item of rows){
  if(!item||typeof item.date!=='string')continue;
  const session=resolveSession(item.date,rows);
  if(session.isTradingDay)sessions.set(item.date,session);
 }
 return sessions;
}
export async function historicalIexBars(group:{date:string;ticker:string;signals:SentSignal[]}):Promise<Bar[]>{
 const key=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 if(!key||!secret)throw Error('IEX credentials unavailable');
 // Bound the query around observed confirmation candles and the last +15m result.
 const stamps=group.signals.map(s=>Date.parse(s.bar_timestamp));
 const start=new Date(Math.min(...stamps)).toISOString();
 const end=new Date(Math.max(...stamps)+16*60000).toISOString();
 const url=new URL('https://data.alpaca.markets/v2/stocks/'+encodeURIComponent(group.ticker)+'/bars');
 for(const [k,v] of Object.entries({feed:'iex',timeframe:'1Min',start,end,limit:'1000',adjustment:'raw'}))url.searchParams.set(k,v);
 const bars:Bar[]=[];let token:string|null=null;
 for(let i=0;i<3;i++){
  if(token)url.searchParams.set('page_token',token);
  const res=await fetch(url,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('Historical IEX retrieval failed');
  const json=await res.json() as {bars?:Bar[];next_page_token?:string|null};
  if(!Array.isArray(json.bars))throw Error('Malformed historical IEX response');
  bars.push(...json.bars.map(b=>({t:b.t,o:b.o,h:b.h,l:b.l,c:b.c,v:b.v})));
  token=json.next_page_token||null;
  if(!token)return bars;
 }
 throw Error('Historical IEX pagination exceeded safety limit');
}
