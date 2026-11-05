// Read-only dashboard classification. Never enroll a custom ticker into Telegram.
import type {Signal} from './engine.ts';
import type {PremarketReference} from './premarket-reference.ts';
import {CORE_TICKERS,cleanSymbol,MAX_WATCHLIST,isCore} from './watchlist.ts';
export type CoreDisplayRow=Omit<Signal,'ticker'>&{ticker:string};
export type DisplaySignal=CoreDisplayRow&{scannerEnabled:boolean;premarketReference?:PremarketReference|null};
export function normalizeCustomQuery(raw:string|null):string[]|null{
 if(raw===null||raw.trim()==='')return [];
 const requested=raw.split(',');
 if(requested.length>MAX_WATCHLIST-CORE_TICKERS.length)return null;
 const unique:string[]=[];
 for(const value of requested){
  const ticker=cleanSymbol(value);
  if(!ticker||isCore(ticker))return null;
  if(!unique.includes(ticker))unique.push(ticker);
 }
 return unique;
}
export function asChartOnlySignal(signal:Signal):DisplaySignal{
 return {...signal,status:signal.status.startsWith('CONFIRMED')?'RESEARCH '+signal.status.replace('CONFIRMED ',''):signal.status,scannerEnabled:false,
  reason:signal.status.startsWith('CONFIRMED')?'Research checks pass, but Telegram alert scanning is disabled for this custom ticker. '+signal.reason:signal.reason};
}
export function asScannerSignal(signal:CoreDisplayRow):DisplaySignal{return {...signal,scannerEnabled:true};}
export function mergeUnifiedSignals(core:CoreDisplayRow[],custom:DisplaySignal[]):DisplaySignal[]{
 const originals=core.filter(s=>isCore(s.ticker)).map(asScannerSignal),seen=new Set(originals.map(s=>s.ticker));
 return [...originals,...custom.filter(s=>!seen.has(s.ticker)&&!isCore(s.ticker))];
}

/** The research price is separate metadata; trading signal fields stay untouched. */
export function withPremarketReference<T extends DisplaySignal>(signal:T,reference:PremarketReference|null):T{
 if(!reference||signal.ticker!=='ORCL'||signal.price!==null||signal.status!=='NO PREMARKET DATA')return signal;
 return {...signal,premarketReference:reference};
}
