// Research-only signals. IEX stock feed != consolidated market or options quotes.
import {sessionState,type SessionWindow} from './market-calendar.ts';
export const tickers=['QQQ','SPY','TSLA','NVDA','AMD','AAPL','MSFT','GOOGL'] as const;
export type Ticker=typeof tickers[number];
export type Bar={t:string;o:number;h:number;l:number;c:number;v:number};
export type Signal={ticker:Ticker;status:string;callAbove:number|null;putBelow:number|null;price:number|null;vwap:number|null;volumeRatio:number|null;bias:string;reason:string;timestamp:string|null;fresh:boolean;feed:string};
const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function et(ts:string){const p=fmt.formatToParts(new Date(ts));const g=(k:string)=>p.find(x=>x.type===k)?.value||'';return {day:g('year')+'-'+g('month')+'-'+g('day'),min:+g('hour')*60 + +g('minute')}}
const round=(x:number)=>Math.round(x*100)/100;
export function marketState(now=new Date()){const wd=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short'}).format(now);const m=et(now.toISOString()).min;if(wd==='Sat'||wd==='Sun')return 'MARKET CLOSED';if(m<570)return 'PRE-MARKET';if(m>=960)return 'AFTER HOURS';return 'REGULAR SESSION'}
export function evaluate(ticker:Ticker,bars:Bar[],now=new Date(),calendar?:SessionWindow|null):Signal{
 const blank:Signal={ticker,status:'WAIT',callAbove:null,putBelow:null,price:null,vwap:null,volumeRatio:null,bias:'NEUTRAL',reason:'Awaiting regular-session candles',timestamp:null,fresh:false,feed:'IEX'};
 const today=et(now.toISOString()).day;
 const valid=bars.filter(b=>{const t=Date.parse(b.t);if(!Number.isFinite(t))return false;const v=et(b.t);return v.day===today&&v.min>=240&&v.min<960&&Number.isFinite(t)&&t+60000<=now.getTime()&&[b.o,b.h,b.l,b.c,b.v].every(Number.isFinite)&&Number.isInteger(b.v)&&b.v>0&&b.l>0&&b.h>=Math.max(b.o,b.c,b.l)&&b.l<=Math.min(b.o,b.c)}).sort((a,b)=>a.t.localeCompare(b.t));
 const session=calendar===undefined?marketState(now):sessionState(now,calendar),clock=et(now.toISOString()).min;
 if(session==='CALENDAR UNAVAILABLE')return {...blank,status:'NO TRADE',reason:'Exchange calendar unavailable; fail closed'};
 if(session==='MARKET CLOSED')return {...blank,status:'NO TRADE',reason:'Exchange holiday or non-trading day'};
 // Prior to the opening bell, show only *provisional* extended-hours levels.
 // IEX premarket is sparse: absence of bars must never be presented as an actionable signal.
 if(session==='PRE-MARKET'){
   const pre=valid.filter(b=>et(b.t).min<570 && new Date(b.t).getTime()+60000<=now.getTime());
   if(clock<240)return {...blank,status:'PRE-MARKET',reason:'IEX premarket session has not started (4:00 AM ET)'};
   if(!pre.length)return {...blank,status:'NO PREMARKET DATA',reason:'No completed IEX premarket bars available yet; IEX covers only a small fraction of US trades'};
   const last=pre[pre.length-1],age=now.getTime()-(new Date(last.t).getTime()+60000),fresh=age>=0&&age<=300000;
   const volume=pre.reduce((s,b)=>s+b.v,0),vwap=round(pre.reduce((s,b)=>s+(b.h+b.l+b.c)/3*b.v,0)/volume);
   const hi=round(Math.max(...pre.map(b=>b.h))),lo=round(Math.min(...pre.map(b=>b.l)));
   return {...blank,status:fresh?'PRELIMINARY':'PREMARKET STALE',callAbove:hi,putBelow:lo,price:round(last.c),vwap,bias:last.c>vwap?'BULLISH':last.c<vwap?'BEARISH':'NEUTRAL',timestamp:last.t,fresh,reason:fresh?'Provisional 4:00 AM–now IEX high/low; opening bell replaces these levels. Not a confirmed entry.':'IEX premarket prices are old or thinly traded; levels are not actionable.'};
 }
 const arr=valid.filter(b=>et(b.t).min>=570);
 if(!arr.length)return blank;
 const last=arr[arr.length-1],age=now.getTime()-new Date(last.t).getTime();
 const fresh=age>=60000&&age<=180000; // completed 1m candle no older than 3m
 const total=arr.reduce((s,b)=>s+b.v,0),vwap=round(arr.reduce((s,b)=>s+((b.h+b.l+b.c)/3)*b.v,0)/total);
 const prev=arr.slice(-21,-1),avg=prev.length?prev.reduce((s,b)=>s+b.v,0)/prev.length:0,ratio=avg?round(last.v/avg):null;
 const first=arr.filter(b=>{const m=et(b.t).min;return m>=570&&m<575;});
 const common={...blank,price:round(last.c),vwap,volumeRatio:ratio,bias:last.c>vwap?'BULLISH':last.c<vwap?'BEARISH':'NEUTRAL',timestamp:last.t,fresh};
 if(first.length!==5 || [570,571,572,573,574].some(m=>!first.some(b=>et(b.t).min===m)))return {...common,status:'NO TRADE',reason:'Incomplete 9:30–9:35 ET opening range'};
 const callAbove=round(Math.max(...first.map(b=>b.h))),putBelow=round(Math.min(...first.map(b=>b.l)));
 const result={...common,callAbove,putBelow};
 if(session!=='REGULAR SESSION')return {...result,status:'STALE',reason:'Market closed; confirmation disabled'};
 if(!fresh)return {...result,status:'STALE',reason:'Incomplete or stale last candle'};
 if(et(now.toISOString()).min<577)return {...result,status:'WAIT',reason:'Opening period / confirmation guard'};
 if(last.c>callAbove*1.008||last.c<putBelow*.992)return {...result,status:'STALE',reason:'Price extended more than 0.8% past trigger'};
 const a=arr[arr.length-2],adjacent=!!a&&new Date(last.t).getTime()-new Date(a.t).getTime()===60000;
 const priorBlock=Math.floor((et(last.t).min-570)/5)-1;
 const prior5=arr.filter(b=>Math.floor((et(b.t).min-570)/5)===priorBlock);
 const trend=prior5.length>=3?prior5[prior5.length-1].c:null;
 const quality=ratio!==null&&ratio>=1.1;
 if(adjacent&&quality&&trend!==null&&last.c>trend&&a.c>callAbove&&last.c>callAbove&&a.c>vwap&&last.c>vwap)return {...result,status:'CONFIRMED CALL',reason:'Two completed 1m closes above opening high and VWAP; 5m direction + volume pass'};
 if(adjacent&&quality&&trend!==null&&last.c<trend&&a.c<putBelow&&last.c<putBelow&&a.c<vwap&&last.c<vwap)return {...result,status:'CONFIRMED PUT',reason:'Two completed 1m closes below opening low and VWAP; 5m direction + volume pass'};
 return {...result,status:last.c>callAbove||last.c<putBelow?'READY':'WAIT',reason:'No complete A+ confirmation: 2 candles, VWAP, direction and volume required'};
}
export async function loadBars(ticker:Ticker):Promise<Bar[]>{
 const key=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 if(!key||!secret)throw new Error('Market data keys missing');
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',timeZoneName:'short'}).formatToParts(new Date());
 const get=(k:string)=>p.find(x=>x.type===k)?.value||'';
 const day=get('year')+'-'+get('month')+'-'+get('day'),offset=get('timeZoneName')==='EST'?'-05:00':'-04:00';
 const start=new Date(day+'T04:00:00'+offset),end=new Date(Math.min(Date.now()-60000,new Date(day+'T16:00:00'+offset).getTime()));
 if(start>=end)return [];
 const url=new URL('https://data.alpaca.markets/v2/stocks/'+ticker+'/bars');
 for(const [k,v] of Object.entries({feed:'iex',timeframe:'1Min',start:start.toISOString(),end:end.toISOString(),limit:'1000',adjustment:'raw'}))url.searchParams.set(k,v);
 const r=await fetch(url,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Alpaca '+ticker+': '+r.status);
 const j=await r.json();return (j.bars||[]).map((b:Bar)=>({t:b.t,o:b.o,h:b.h,l:b.l,c:b.c,v:b.v}));
}
