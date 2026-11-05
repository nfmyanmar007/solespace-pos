// Informational time-window plan only. Never an order or a recommendation to sell at profit.
// Uses actual confirmed stock-candle time, not system time or predicted future price.
export const EXIT_REVIEW_MINUTES=5;
export const EXIT_TIMEBOX_MINUTES=15;
export type ExitWindow={confirmedAt:string;reviewAt:string;timeboxAt:string;phase:'MONITOR'|'REVIEW EXIT'|'TIMEBOX ELAPSED'};
export function exitWindow(confirmedAt:string|null|undefined,now:Date):ExitWindow|null{
 if(!confirmedAt||!Number.isFinite(Date.parse(confirmedAt))||!Number.isFinite(now.getTime()))return null;
 const base=Date.parse(confirmedAt);
 if(base>now.getTime()+60000)return null;
 // Protect against old/overnight signals; the UI only provides same-day alert history.
 const nyDay=(ms:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
 if(nyDay(base)!==nyDay(now))return null;
 const review=base+EXIT_REVIEW_MINUTES*60000,timebox=base+EXIT_TIMEBOX_MINUTES*60000;
 return {confirmedAt:new Date(base).toISOString(),reviewAt:new Date(review).toISOString(),timeboxAt:new Date(timebox).toISOString(),
  phase:now.getTime()<review?'MONITOR':now.getTime()<timebox?'REVIEW EXIT':'TIMEBOX ELAPSED'};
}
export function confirmedExitWindow(status:string,timestamp:string|null|undefined,now:Date):ExitWindow|null{
 return status==='CONFIRMED CALL'||status==='CONFIRMED PUT'?exitWindow(timestamp,now):null;
}
