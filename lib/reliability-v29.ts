// Pure, read-only reliability analytics. Never change trading decisions or send messages.
import {easternClock,type SessionWindow} from './market-calendar.ts';
export type RunTime={created_at:string;market_state:string};
export function sessionGapSummary(now:Date,runs:RunTime[],session:SessionWindow|null){
 if(!session||!session.isTradingDay||session.source!=='ALPACA'||easternClock(now).date!==session.date)
  return {verifiable:false,gaps:0,longestSeconds:0,regularRuns:0,lastRegularAt:null as string|null,stale:false};
 const minute=easternClock(now).minute;
 const started=minute>=session.openMinute;
 const elapsed=Math.max(0,Math.min(minute,session.closeMinute)-session.openMinute)*60;
 const valid=runs.filter(r=>r.market_state==='REGULAR SESSION'&&Number.isFinite(Date.parse(r.created_at))&&Date.parse(r.created_at)<=now.getTime()+60000&&easternClock(new Date(r.created_at)).date===session.date)
  .sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
 let gaps=0,longestSeconds=0;
 const check=(seconds:number)=>{if(seconds>300){gaps++;longestSeconds=Math.max(longestSeconds,Math.round(seconds));}};
 if(started&&valid.length){
  const firstClock=easternClock(new Date(valid[0].created_at)).minute;
  check(Math.max(0,firstClock-session.openMinute)*60);
  for(let i=1;i<valid.length;i++)check((Date.parse(valid[i].created_at)-Date.parse(valid[i-1].created_at))/1000);
 }else if(started)check(elapsed);
 const last=valid.at(-1)?.created_at||null;
 // A current outage should be reported even if the previous 2-minute scans were regular.
 const stale=started&&minute<session.closeMinute&&elapsed>300&&(!last||now.getTime()-Date.parse(last)>300000);
 return {verifiable:true,gaps,longestSeconds,regularRuns:valid.length,lastRegularAt:last,stale};
}
export type AlertRow={ticker:string;direction:string;status:string;created_at:string;error_message?:string|null};
export type DeliveryEventRow={created_at:string;event_type:string;ticker?:string};
export function deliveryIncidents(now:Date,alerts:AlertRow[],events:DeliveryEventRow[]){
 const since=now.getTime()-86400000;
 const recent=alerts.filter(a=>{const t=Date.parse(a.created_at);return Number.isFinite(t)&&t>=since&&t<=now.getTime();});
 const sent=recent.filter(a=>a.status==='sent').length;
 const failed=recent.filter(a=>a.status==='failed').length;
 const pending=recent.filter(a=>a.status==='pending').length;
 const stalePending=recent.filter(a=>a.status==='pending'&&now.getTime()-Date.parse(a.created_at)>300000).length;
 const deliveryFailures=events.filter(e=>{const t=Date.parse(e.created_at);return Number.isFinite(t)&&t>=since&&t<=now.getTime()&&/fail|error/i.test(e.event_type);}).length;
 const counts={sent,failed,pending,stalePending,deliveryFailures,duplicatesPrevented:'NOT_RECORDED' as const,hasIncident:failed>0||stalePending>0||deliveryFailures>0};
 return counts;
}
export type CustomRow={ticker:string;outcome:string;signal_status:string|null;scan_at:string};
export function customDiagnosticSummary(now:Date,enabled:string[],rows:CustomRow[],regularSession:boolean){
 const since=now.getTime()-15*60000;
 return enabled.map(ticker=>{
  const matches=rows.filter(r=>r.ticker===ticker&&Number.isFinite(Date.parse(r.scan_at))&&Date.parse(r.scan_at)<=now.getTime()+60000).sort((a,b)=>Date.parse(b.scan_at)-Date.parse(a.scan_at));
  const last=matches[0],recent=last&&Date.parse(last.scan_at)>=since;
  return {ticker,lastCheckedAt:last?.scan_at||null,outcome:!regularSession?'OUTSIDE_SESSION':!last?'NO_RECORD':!recent?'STALE':last.outcome,
   signalStatus:recent?last?.signal_status:null,confirmedLast15m:matches.filter(r=>r.outcome==='CONFIRMED'&&Date.parse(r.scan_at)>=since).length,
   errorsLast15m:matches.filter(r=>r.outcome==='ERROR'&&Date.parse(r.scan_at)>=since).length};
 });
}

/** Defense in depth: always mask personal stock subscriptions from public Health responses. */
export function ownerOnlyCustomPayload<T extends {access:string;monitored:number|null;symbols:unknown[]}>(authenticated:boolean,data:T):T|{access:'OWNER_ONLY';monitored:null;symbols:[]}{
 if(!authenticated)return {access:'OWNER_ONLY',monitored:null,symbols:[]};
 return data;
}
