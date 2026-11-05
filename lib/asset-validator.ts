import {cleanSymbol,eligibleAsset,type AssetCheck} from './watchlist.ts';
const memo=new Map<string,{value:AssetCheck,until:number}>();
// Free Alpaca asset metadata only; credentials remain server-side.
export async function validateWatchSymbol(input:unknown):Promise<AssetCheck>{
 const symbol=cleanSymbol(input);
 if(!symbol)return {ok:false,symbol:'',name:'',reason:'Invalid ticker format.'};
 const cached=memo.get(symbol);
 if(cached&&cached.until>Date.now())return cached.value;
 const key=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 if(!key||!secret)throw new Error('Market validation temporarily unavailable');
 const res=await fetch('https://paper-api.alpaca.markets/v2/assets/'+encodeURIComponent(symbol),{
  headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},
  cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(res.status===404)return {ok:false,symbol,name:'',reason:'Ticker not found on Alpaca.'};
 if(!res.ok)throw new Error('Asset lookup unavailable');
 const value=eligibleAsset(symbol,await res.json());
 memo.set(symbol,{value,until:Date.now()+3600000});
 return value;
}
