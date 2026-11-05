// Personal chart-only watchlist. Persisted in this browser, never the scanner.
export const CORE_TICKERS=['QQQ','SPY','TSLA','NVDA','AMD','AAPL','MSFT','GOOGL'] as const;
export const MAX_WATCHLIST=20;
export const STORAGE_KEY='optiontrigger:watchlist:v1';
export function cleanSymbol(input:unknown):string|null{
 if(typeof input!=='string')return null;
 const symbol=input.trim().toUpperCase();
 return /^[A-Z]{1,5}(?:\.[A-Z])?$/.test(symbol)?symbol:null;
}
export function isCore(symbol:string){return (CORE_TICKERS as readonly string[]).includes(symbol);}
export function parseSavedWatchlist(raw:unknown):string[]{
 if(!Array.isArray(raw))return [];
 const symbols:string[]=[];
 for(const item of raw){const symbol=cleanSymbol(item);if(symbol&&!isCore(symbol)&&!symbols.includes(symbol))symbols.push(symbol);}
 return symbols.slice(0,MAX_WATCHLIST-CORE_TICKERS.length);
}
export function canAddSymbol(saved:readonly string[],input:unknown):{ok:boolean;symbol:string|null;reason:string}{
 const symbol=cleanSymbol(input);
 if(!symbol)return {ok:false,symbol:null,reason:'Enter a US stock ticker (letters, or e.g. BRK.B).'};
 if(isCore(symbol)||saved.includes(symbol))return {ok:false,symbol,reason:'This stock is already in your watchlist.'};
 if(saved.length+CORE_TICKERS.length>=MAX_WATCHLIST)return {ok:false,symbol,reason:'Maximum 20 stocks including 8 scanner stocks.'};
 return {ok:true,symbol,reason:''};
}
export type AssetCheck={ok:boolean;symbol:string;name:string;reason?:string};
export function eligibleAsset(symbol:string,record:unknown):AssetCheck{
 if(!record||typeof record!=='object')return {ok:false,symbol,name:'',reason:'Stock not found on Alpaca.'};
 const x=record as Record<string,unknown>;
 if(x.symbol!==symbol||x.class!=='us_equity'||x.status!=='active'||x.tradable!==true)
  return {ok:false,symbol,name:'',reason:'Only active, tradable US stocks and ETFs are supported.'};
 return {ok:true,symbol,name:typeof x.name==='string'?x.name.slice(0,120):symbol};
}
