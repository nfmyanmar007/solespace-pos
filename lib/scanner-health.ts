// Pure scanner health classification. A schedule being active is NOT proof of successful execution.
export type RunRecord={created_at:string;mode:string;market_state:string;signal_count:number};
export type DeliveryRecord={created_at:string;event_type:string};
export type MonitorHealth={state:'HEALTHY'|'LATE'|'IDLE'|'NO DATA'|'UNKNOWN';reason:string;lastRunAt:string|null;ageSeconds:number|null;regularSession:boolean;recentRuns:number;missedWindows:number;lastIntervalsSeconds:number[]};
function eastern(now:Date){
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(now);
 const g=(k:string)=>p.find(x=>x.type===k)?.value||'';
 return {minute:Number(g('hour'))*60+Number(g('minute')),weekday:g('weekday')};
}
export function classifyScannerHealth(now:Date,runs:RunRecord[],marketState:string):MonitorHealth{
 const clock=eastern(now),regularSession=clock.weekday!=='Sat'&&clock.weekday!=='Sun'&&clock.minute>=570&&clock.minute<960&&marketState==='REGULAR SESSION';
 const valid=runs.filter(r=>Number.isFinite(Date.parse(r.created_at))&&Date.parse(r.created_at)<=now.getTime()+60000&&r.signal_count>=0).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 const lastRunAt=valid[0]?.created_at??null;
 const ageSeconds=lastRunAt?Math.max(0,Math.round((now.getTime()-Date.parse(lastRunAt))/1000)):null;
 // Compare cadence only within this trading day: overnight and weekend breaks are expected.
 const nyDate=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const today=nyDate(now);
 const todays=valid.filter(r=>nyDate(new Date(r.created_at))===today);
 const lastIntervalsSeconds=todays.slice(0,10).flatMap((r,i)=>i+1<todays.length?[Math.round((Date.parse(r.created_at)-Date.parse(todays[i+1].created_at))/1000)]:[]).filter(n=>n>=0);
 const missedWindows=lastIntervalsSeconds.filter(seconds=>seconds>300).length;
 const base={lastRunAt,ageSeconds,regularSession,recentRuns:valid.length,missedWindows,lastIntervalsSeconds};
 if(marketState==='CALENDAR UNAVAILABLE')return {...base,state:'UNKNOWN',reason:'Exchange calendar is unavailable; live session health cannot be verified.'};
 if(!regularSession)return {...base,state:'IDLE',reason:'Not in a verified regular-market session; scheduled scan freshness is not required now.'};
 if(ageSeconds===null)return {...base,state:'NO DATA',reason:'No scanner execution records are available during regular-market hours.'};
 if(ageSeconds>300)return {...base,state:'LATE',reason:'Last recorded scan is older than five minutes during regular-market hours.'};
 if(missedWindows>0)return {...base,state:'LATE',reason:'At least one interval exceeded five minutes among the latest recorded scans.'};
 return {...base,state:'HEALTHY',reason:'Recent scanner execution records are within the expected cadence.'};
}
export function summarizeDeliveryStatus(alerts:{status:string;created_at:string}[],events:DeliveryRecord[],now:Date){
 const dayAgo=now.getTime()-86400000;
 const recent=alerts.filter(a=>Number.isFinite(Date.parse(a.created_at))&&Date.parse(a.created_at)>=dayAgo&&Date.parse(a.created_at)<=now.getTime());
 const failed=recent.filter(a=>a.status==='failed').length;
 const sent=recent.filter(a=>a.status==='sent').length;
 const pending=recent.filter(a=>a.status!=='sent'&&a.status!=='failed').length;
 const deliveryFailures=events.filter(e=>Number.isFinite(Date.parse(e.created_at))&&Date.parse(e.created_at)>=dayAgo&&/fail|error/i.test(e.event_type)).length;
 return {sent,failed,pending,deliveryFailures,hasFailures:failed>0||deliveryFailures>0};
}
