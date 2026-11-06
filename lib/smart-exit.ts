// V3.3: advisory-only monitoring of recorded sent confirmations.
// Does not know whether user bought an option, contract quote, stop, or fill.
import type {Bar} from './engine.ts';
import type {SessionWindow} from './market-calendar.ts';
import {easternClock} from './market-calendar.ts';
import type {SentSignal} from './signal-performance.ts';
import {verifyReferenceCandle} from './signal-performance.ts';

export type ReviewFlag='VWAP_REVERSAL'|'MOMENTUM_WEAKNESS'|'TIME_REVIEW'|'TIMEBOX';
export type ReviewStatus='MONITOR'|'REVIEW'|'UNAVAILABLE'|'TIMEBOX_ELAPSED';
export type ExitAdvisory={
 id:number;ticker:string;direction:'CALL'|'PUT';sentAt:string;
 status:ReviewStatus;flags:ReviewFlag[];observedAt:string|null;
 lastPrice:number|null;vwap:number|null;ageSeconds:number|null;
 elapsedSinceTelegramMinutes:number;reason:string;
};
const round=(n:number)=>Math.round(n*100)/100;
function validBar(b:Bar,now:Date,session:SessionWindow):boolean{
 const t=Date.parse(b.t);
 if(!Number.isFinite(t)||t+60_000>now.getTime()||easternClock(new Date(t)).date!==session.date)return false;
 const minute=easternClock(new Date(t)).minute;
 return minute>=session.openMinute&&minute<session.closeMinute&&[b.o,b.h,b.l,b.c,b.v].every(Number.isFinite)
  &&b.l>0&&Number.isInteger(b.v)&&b.v>0&&b.h>=Math.max(b.o,b.c,b.l)&&b.l<=Math.min(b.o,b.c);
}
export function exitAdvisory(signal:SentSignal,bars:Bar[],now:Date,session:SessionWindow|null):ExitAdvisory|null{
 const t=Date.parse(signal.bar_timestamp),sent=Date.parse(signal.sent_at||'');
 if(signal.status!=='sent'||(signal.direction!=='CALL'&&signal.direction!=='PUT')||
  !session||!session.isTradingDay||session.source!=='ALPACA'||
  !Number.isInteger(signal.id)||!Number.isFinite(t)||!Number.isFinite(sent)||
  !Number.isFinite(Number(signal.price))||Number(signal.price)<=0||
  easternClock(now).date!==session.date||signal.session_date!==session.date||
  easternClock(new Date(t)).date!==session.date||sent<t+60_000||sent>now.getTime())return null;
 const elapsed=(now.getTime()-sent)/60_000;
 const base={id:signal.id,ticker:signal.ticker,direction:signal.direction as 'CALL'|'PUT',
  sentAt:signal.sent_at!,flags:[] as ReviewFlag[],observedAt:null as string|null,
  lastPrice:null as number|null,vwap:null as number|null,ageSeconds:null as number|null,
  elapsedSinceTelegramMinutes:round(elapsed),reason:''};
 if(elapsed>=15)return {...base,status:'TIMEBOX_ELAPSED',flags:['TIMEBOX'],
  reason:'15 minutes elapsed since Telegram acceptance. Review any position independently; no automatic exit.'};
 // If feed, calendar or original reference cannot be verified: no market-based exit assessment.
 if(!bars.length||verifyReferenceCandle(signal,bars,now,session)!=='MATCHED')
  return {...base,status:'UNAVAILABLE',reason:'Confirmation reference or completed IEX candles cannot be verified.'};
 const distinct=new Map<number,Bar>(),duplicates=new Set<number>();
 for(const b of bars){
  if(!validBar(b,now,session))continue;
  const k=Date.parse(b.t);
  if(duplicates.has(k))continue;
  if(distinct.has(k)){distinct.delete(k);duplicates.add(k);}
  else distinct.set(k,b);
 }
 // Monitor *post-Telegram* candles only, never pre-delivery results.
 const after=[...distinct.values()].filter(b=>Date.parse(b.t)>=sent&&Date.parse(b.t)<t+16*60_000)
  .sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));
 const last=after.at(-1);
 if(!last)return {...base,status:'UNAVAILABLE',reason:'No completed post-Telegram IEX candle available.'};
 const closeAt=Date.parse(last.t)+60_000,age=Math.round((now.getTime()-closeAt)/1000);
 if(age<0||age>180)return {...base,status:'UNAVAILABLE',observedAt:new Date(closeAt).toISOString(),ageSeconds:age,
  reason:'Latest post-Telegram IEX candle is stale; no live price-based assessment.'};
 const prior=after.at(-2),adjacent=!!prior&&Date.parse(last.t)-Date.parse(prior.t)===60_000;
 // Cumulative session VWAP is computed only when all regular-session minute bars
 // from the verified opening minute through this candle are present, uniquely.
 const all=[...distinct.values()].filter(b=>Date.parse(b.t)<=Date.parse(last.t))
  .sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));
 const first=easternClock(new Date(last.t)).minute;
 const expected=first-session.openMinute+1;
 const complete=all.length===expected&&easternClock(new Date(all[0]?.t||last.t)).minute===session.openMinute&&
  all.every((b,i)=>i===0||Date.parse(b.t)-Date.parse(all[i-1].t)===60_000);
 const volume=complete?all.reduce((a,b)=>a+b.v,0):0;
 const vwap=volume>0?all.reduce((a,b)=>a+(b.h+b.l+b.c)/3*b.v,0)/volume:null;
 const flags:ReviewFlag[]=[];
 if(vwap!==null&&adjacent){
  const cross=signal.direction==='CALL'?(prior!.c>=vwap&&last.c<vwap):(prior!.c<=vwap&&last.c>vwap);
  // A cross must be validated against the previous candle's contemporaneous VWAP,
  // not today's final VWAP (avoid hindsight).
  const previous=all.slice(0,-1),pv=previous.reduce((a,b)=>a+b.v,0);
  const priorVwap=pv>0?previous.reduce((a,b)=>a+(b.h+b.l+b.c)/3*b.v,0)/pv:null;
  if(priorVwap!==null&&(signal.direction==='CALL'?(prior!.c>=priorVwap&&last.c<vwap):(prior!.c<=priorVwap&&last.c>vwap)))
   flags.push('VWAP_REVERSAL');
 }
 if(adjacent&&(signal.direction==='CALL'?last.c<prior!.c:last.c>prior!.c))flags.push('MOMENTUM_WEAKNESS');
 if(elapsed>=5)flags.push('TIME_REVIEW');
 return {...base,status:flags.length?'REVIEW':'MONITOR',flags,
  observedAt:new Date(closeAt).toISOString(),lastPrice:last.c,vwap:vwap===null?null:round(vwap),
  ageSeconds:age,reason:flags.length?'Advisory review flags detected; verify option quotes and your actual position.':
  'No review flag from the available completed IEX bars. This does not imply a safe hold.'};
}
