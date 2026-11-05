import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {loadBars,tickers,type Ticker} from '@/lib/engine';
import {buildChart,type ChartInterval,type ChartMarker} from '@/lib/chart-data';
import {calculateIndicators,scoreSetup} from '@/lib/indicators';
import {loadHistoricalVolume} from '@/lib/historical-volume';
import {validateWatchSymbol} from '@/lib/asset-validator';
import {cleanSymbol} from '@/lib/watchlist';
export const dynamic='force-dynamic';
export const maxDuration=30;
// Read-only historical/current intraday candles; no orders and no client API secrets.
export async function GET(req:NextRequest){
 const symbol=cleanSymbol(req.nextUrl.searchParams.get('ticker')||'QQQ');
 const rawInterval=req.nextUrl.searchParams.get('interval')||'1m';
 if(!symbol)return NextResponse.json({error:'Invalid ticker format'},{status:400});
 if(rawInterval!=='1m'&&rawInterval!=='5m')return NextResponse.json({error:'Unsupported timeframe'},{status:400});
 if(!process.env.ALPACA_API_KEY||!process.env.ALPACA_API_SECRET)
  return NextResponse.json({error:'Market data unavailable'},{status:503});
 try{
  // Extra symbols are chart-only; scanner membership remains the fixed eight tickers.
  if(!tickers.includes(symbol as Ticker)){
   const asset=await validateWatchSymbol(symbol);
   if(!asset.ok)return NextResponse.json({error:asset.reason||'Ticker unavailable'},{status:404});
  }
  const ticker=symbol as Ticker;
  const now=new Date();
  const [source,markers,volumeHistory]=await Promise.all([loadBars(ticker),tickers.includes(ticker)?readRecordedSignals(ticker,now):Promise.resolve([] as ChartMarker[]),loadHistoricalVolume(ticker,now)]);
  const chart=buildChart(ticker,source,now,rawInterval as ChartInterval,markers);
  const indicators=calculateIndicators(chart.bars,rawInterval==='1m'?1:5,volumeHistory);
  const researchScore=scoreSetup(chart.bars,indicators,chart.stale);
  return NextResponse.json({...chart,chartOnly:!tickers.includes(ticker),indicators,researchScore,indicatorContext:{source:'IEX EQUITIES',rvolHistoryAvailable:volumeHistory.length>0,disclaimer:'Research-only, not an option entry or a probability of profit'}},{headers:{'Cache-Control':'no-store, max-age=0'}});
 }catch{
  return NextResponse.json({error:'Chart feed unavailable; retry later'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
async function readRecordedSignals(ticker:Ticker,now:Date):Promise<ChartMarker[]>{
 const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)return [];
 // Read only confirmed events journaled by the authenticated scanner, never invent historical signals.
 try{
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const db=createClient(url,secret,{auth:{persistSession:false}});
  const {data,error}=await db.from('signal_events').select('bar_timestamp,direction,observed_price').eq('ticker',ticker).eq('session_date',date).order('bar_timestamp',{ascending:true}).limit(30);
  if(error)return [];
  return (data||[]).filter(x=>x&&(x.direction==='CALL'||x.direction==='PUT')&&typeof x.bar_timestamp==='string'&&typeof x.observed_price==='number')
    .map(x=>({time:x.bar_timestamp,direction:x.direction as 'CALL'|'PUT',price:x.observed_price}));
 }catch{return [];}
}
