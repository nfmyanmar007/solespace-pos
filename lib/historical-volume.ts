// Optional free IEX reference data for same-time-of-day relative volume.
// No trade/order API access. Invalid responses, pagination, and sparse coverage fail closed.
import {easternClock} from './market-calendar.ts';
import type {Ticker} from './engine.ts';
import type {HistoricalVolume} from './indicators.ts';
const cache=new Map<string,{until:number;data:HistoricalVolume[]}>();
export async function loadHistoricalVolume(ticker:Ticker,now:Date):Promise<HistoricalVolume[]>{
 const cached=cache.get(ticker);
 if(cached&&cached.until>Date.now())return cached.data;
 const key=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 if(!key||!secret)return [];
 const {date}=easternClock(now);
 const offset=new Date(date+'T12:00:00Z');
 const start=new Date(offset.getTime()-15*86400000).toISOString();
 // Midnight Eastern on current day is after prior-session data but before today.
 const end=now.toISOString();
 const url=new URL('https://data.alpaca.markets/v2/stocks/'+ticker+'/bars');
 for(const [k,v] of Object.entries({feed:'iex',timeframe:'1Min',start,end,limit:'10000',adjustment:'raw'}))url.searchParams.set(k,v);
 const values:HistoricalVolume[]=[];
 try{
  let token:string|null=null;
  for(let page=0;page<2;page++){
   if(token)url.searchParams.set('page_token',token);
   const response=await fetch(url,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return [];
   const body=await response.json();
   if(!Array.isArray(body.bars))return [];
   for(const b of body.bars){
    if(typeof b.t!=='string'||!Number.isFinite(Date.parse(b.t))||!Number.isInteger(b.v)||b.v<=0)continue;
    const clock=easternClock(new Date(b.t));
    if(clock.date>=date||clock.minute<570||clock.minute>=960)continue;
    values.push({time:b.t,volume:b.v});
   }
   token=typeof body.next_page_token==='string'&&body.next_page_token?body.next_page_token:null;
   if(!token)break;
   if(page===1)return []; // Incomplete pagination must not generate a misleading baseline.
  }
  cache.set(ticker,{until:Date.now()+20*60000,data:values});
  return values;
 }catch{return [];}
}
