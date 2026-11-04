// Exchange calendar is obtained from Alpaca's trading Calendar API, not inferred
// from weekdays: holidays, emergency closures and early closes must fail closed.
export type SessionWindow={date:string;openMinute:number;closeMinute:number;isTradingDay:boolean;source:'ALPACA'|'UNAVAILABLE'};
export function easternClock(now:Date){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const value=(type:string)=>parts.find(p=>p.type===type)?.value||'';
 return {date:`${value('year')}-${value('month')}-${value('day')}`,minute:Number(value('hour'))*60+Number(value('minute'))};
}
function minutes(s:string){if(!/^\d{2}:\d{2}$/.test(s))throw new Error('Invalid calendar time');const [h,m]=s.split(':').map(Number);if(h>23||m>59)throw new Error('Invalid calendar time');return h*60+m;}
export function resolveSession(date:string,rows:unknown):SessionWindow{
 if(!Array.isArray(rows))throw new Error('Market calendar unavailable');
 const row=rows.find(r=>r&&typeof r==='object'&&r.date===date);
 if(!row)return {date,openMinute:570,closeMinute:960,isTradingDay:false,source:'ALPACA'};
 if(typeof row.open!=='string'||typeof row.close!=='string')throw new Error('Incomplete calendar session');
 const openMinute=minutes(row.open),closeMinute=minutes(row.close);
 if(closeMinute<=openMinute)throw new Error('Invalid session window');
 return {date,openMinute,closeMinute,isTradingDay:true,source:'ALPACA'};
}
export function sessionState(now:Date,session:SessionWindow|null):'REGULAR SESSION'|'PRE-MARKET'|'AFTER HOURS'|'MARKET CLOSED'|'CALENDAR UNAVAILABLE'{
 if(!session||session.source==='UNAVAILABLE')return 'CALENDAR UNAVAILABLE';
 if(!session.isTradingDay)return 'MARKET CLOSED';
 const {minute}=easternClock(now);
 if(minute<session.openMinute)return 'PRE-MARKET';
 if(minute>=session.closeMinute)return 'AFTER HOURS';
 return 'REGULAR SESSION';
}
// Cache by ET date; bounded to 30 minutes and re-fetch on a new date.
let cache:{date:string;expires:number;session:SessionWindow}|null=null;
export async function fetchTradingSession(now:Date=new Date()):Promise<SessionWindow|null>{
 const {date}=easternClock(now);
 if(cache?.date===date&&Date.now()<cache.expires)return cache.session;
 const key=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 if(!key||!secret)return null;
 try{
  const url=new URL('https://paper-api.alpaca.markets/v2/calendar');
  url.searchParams.set('start',date);url.searchParams.set('end',date);
  const res=await fetch(url,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!res.ok)throw new Error('Alpaca calendar HTTP '+res.status);
  const session=resolveSession(date,await res.json());
  cache={date,session,expires:Date.now()+30*60000};
  return session;
 }catch{return null;} // Do not assume an ordinary trading day on network failures.
}
