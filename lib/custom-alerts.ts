// Secure opt-in: original eight symbols are permanently monitored by the existing scanner.
// Custom symbols are OFF until an authenticated owner explicitly enables each one.
import {createClient} from '@supabase/supabase-js';
import {cleanSymbol,isCore} from './watchlist.ts';
import {evaluate,loadBars,type Signal,type Ticker} from './engine.ts';
import {fetchTradingSession,type SessionWindow} from './market-calendar.ts';
export const MAX_CUSTOM_ALERTS=4;
export type CustomAlertRow={ticker:string;enabled:boolean};
export function validateCustomAlertTicker(value:unknown):string|null{
 const ticker=cleanSymbol(value);
 return ticker&&!isCore(ticker)?ticker:null;
}
export function enabledCustomTickers(rows:unknown):string[]{
 if(!Array.isArray(rows))return [];
 const out:string[]=[];
 for(const raw of rows){
  if(!raw||typeof raw!=='object')continue;
  const r=raw as Record<string,unknown>,ticker=validateCustomAlertTicker(r.ticker);
  if(r.enabled===true&&ticker&&!out.includes(ticker))out.push(ticker);
 }
 // Corruption or excess enrollment must fail closed instead of silently expanding scanning.
 return out.length>MAX_CUSTOM_ALERTS?[]:out;
}
export function isEligibleConfirmation(s:Signal,now:Date):boolean{
 if(!s.fresh||!s.timestamp||!['CONFIRMED CALL','CONFIRMED PUT'].includes(s.status))return false;
 const timestamp=Date.parse(s.timestamp);
 return Number.isFinite(timestamp)&&timestamp<=now.getTime()&&now.getTime()-timestamp<5*60000;
}
export async function getEnabledCustomAlerts():Promise<string[]>{
 const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)return [];
 const db=createClient(url,secret,{auth:{persistSession:false}});
 const {data,error}=await db.from('custom_alert_tickers').select('ticker,enabled').eq('enabled',true).limit(MAX_CUSTOM_ALERTS+1);
 if(error)throw new Error('Custom alert subscriptions unavailable');
 const tickers=enabledCustomTickers(data);
 if(data&&data.length>MAX_CUSTOM_ALERTS)throw new Error('Custom alert capacity exceeded');
 return tickers;
}
export async function evaluateCustomAlerts(tickers:string[],now:Date,session?:SessionWindow|null):Promise<Signal[]>{
 if(tickers.length>MAX_CUSTOM_ALERTS||tickers.some(t=>!validateCustomAlertTicker(t)))return [];
 const calendar=session===undefined?await fetchTradingSession(now):session;
 const results:Signal[]=[];
 // Small fixed batch; IEX free data and cron execution limits must remain bounded.
 for(let i=0;i<tickers.length;i+=2){
  const batch=await Promise.all(tickers.slice(i,i+2).map(async symbol=>{
   try{
    const t=symbol as Ticker;
    const signal=evaluate(t,await loadBars(t),now,calendar);
    return isEligibleConfirmation(signal,now)?signal:null;
   }catch{return null;} // Custom errors never block the original scanner.
  }));
  for(const signal of batch)if(signal)results.push(signal);
 }
 return results;
}
