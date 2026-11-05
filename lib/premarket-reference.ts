// Research/display-only premarket reference. Never use this quote in evaluate(), scan, or Telegram.
// Alpaca Basic permits historical SIP data ending >=15 minutes ago; request 17m delay
// to avoid the entitlement boundary. No new API key or paid subscription.
import {easternClock, type SessionWindow} from './market-calendar.ts';
export type PremarketReference={price:number;timestamp:string;source:'ALPACA SIP (DELAYED)';delayMinutes:number;displayOnly:true};
export const SIP_DELAY_MINUTES=17;
const MAX_AGE_MINUTES=90;
function validQuote(value:unknown):value is {t:string;c:number}{
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 return typeof v.t==='string'&&Number.isFinite(Date.parse(v.t))&&typeof v.c==='number'&&Number.isFinite(v.c)&&v.c>0;
}
export function selectDelayedReference(bars:unknown,now:Date,session:SessionWindow|null):PremarketReference|null{
 const clock=easternClock(now);
 if(!session||session.source!=='ALPACA'||!session.isTradingDay||clock.date!==session.date||clock.minute>=session.openMinute||clock.minute<240)return null;
 if(!Array.isArray(bars))return null;
 const allowable=bars.filter(validQuote).filter(b=>{
  const date=new Date(b.t),c=easternClock(date),age=now.getTime()-date.getTime();
  return c.date===clock.date&&c.minute>=240&&c.minute<session.openMinute&&age>=SIP_DELAY_MINUTES*60000&&age<=MAX_AGE_MINUTES*60000;
 }).sort((a,b)=>Date.parse(b.t)-Date.parse(a.t));
 const last=allowable[0];if(!last)return null;
 return {price:Math.round(last.c*100)/100,timestamp:last.t,source:'ALPACA SIP (DELAYED)',delayMinutes:Math.max(SIP_DELAY_MINUTES,Math.floor((now.getTime()-Date.parse(last.t))/60000)),displayOnly:true};
}
export async function getOrclPremarketReference(now:Date,session:SessionWindow|null,request:typeof fetch=fetch):Promise<PremarketReference|null>{
 const clock=easternClock(now);
 if(!session||session.source!=='ALPACA'||!session.isTradingDay||clock.date!==session.date||clock.minute>=session.openMinute||clock.minute<240)return null;
 const key=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 if(!key||!secret)return null;
 const offset=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'short'}).formatToParts(now).find(x=>x.type==='timeZoneName')?.value==='EST'?'-05:00':'-04:00';
 const start=new Date(clock.date+'T04:00:00'+offset);
 const end=new Date(now.getTime()-SIP_DELAY_MINUTES*60000);
 if(end<=start)return null;
 const url=new URL('https://data.alpaca.markets/v2/stocks/ORCL/bars');
 for(const [k,v] of Object.entries({feed:'sip',timeframe:'1Min',start:start.toISOString(),end:end.toISOString(),limit:'1000',adjustment:'raw'}))url.searchParams.set(k,v);
 try{
  const res=await request(url,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!res.ok)return null; // Free plan entitlement/network failures must not create guessed prices.
  const body=await res.json() as {bars?:unknown};
  return selectDelayedReference(body?.bars,now,session);
 }catch{return null;}
}
