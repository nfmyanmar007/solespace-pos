// V2.9 read-only analytics records. The scanner's eligible-signal logic is unchanged.
import {evaluate,loadBars,type Signal,type Ticker} from './engine.ts';
import {isEligibleConfirmation,MAX_CUSTOM_ALERTS,validateCustomAlertTicker} from './custom-alerts.ts';
import type {SessionWindow} from './market-calendar.ts';
export type CustomOutcome='CONFIRMED'|'NOT_CONFIRMED'|'NO_DATA'|'ERROR'|'SKIPPED_CALENDAR';
export type CustomCheck={ticker:string;outcome:CustomOutcome;signal_status:string|null;detail:string|null};
export function outcomeFromSignal(signal:Signal,now:Date):CustomOutcome{
 if(signal.status==='NO DATA'||!signal.fresh)return 'NO_DATA';
 return isEligibleConfirmation(signal,now)?'CONFIRMED':'NOT_CONFIRMED';
}
export async function inspectCustomTickers(tickers:string[],now:Date,calendar:SessionWindow,load=loadBars,score=evaluate):Promise<{eligible:Signal[];checks:CustomCheck[]}>{
 if(tickers.length>MAX_CUSTOM_ALERTS||new Set(tickers).size!==tickers.length||tickers.some(s=>validateCustomAlertTicker(s)!==s))
  throw Error('Invalid custom alert configuration');
 const eligible:Signal[]=[],checks:CustomCheck[]=[];
 for(let i=0;i<tickers.length;i+=2){
  const batch=await Promise.all(tickers.slice(i,i+2).map(async ticker=>{
   try{
    const signal=score(ticker as Ticker,await load(ticker as Ticker),now,calendar);
    return {signal,check:{ticker,outcome:outcomeFromSignal(signal,now),signal_status:signal.status,detail:null} as CustomCheck};
   }catch{
    return {signal:null,check:{ticker,outcome:'ERROR',signal_status:null,detail:'Evaluation or market data unavailable'} as CustomCheck};
   }
  }));
  for(const {signal,check} of batch){
   checks.push(check);
   if(signal&&check.outcome==='CONFIRMED')eligible.push(signal);
  }
 }
 return {eligible,checks};
}
export function skippedCustomTickers(tickers:string[]):CustomCheck[]{
 return tickers.map(ticker=>({ticker,outcome:'SKIPPED_CALENDAR',signal_status:null,detail:'Verified exchange calendar unavailable'}));
}
