import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {loadBars,tickers,type Ticker} from '@/lib/engine';
import {buildChart,type ChartInterval,type ChartMarker} from '@/lib/chart-data';
export const dynamic='force-dynamic';
export const maxDuration=30;
// Read-only historical/current intraday candles; no orders and no client API secrets.
export async function GET(req:NextRequest){
 const symbol=req.nextUrl.searchParams.get('ticker')||'QQQ';
 const rawInterval=req.nextUrl.searchParams.get('interval')||'1m';
 if(!tickers.includes(symbol as Ticker))return NextResponse.json({error:'Unsupported ticker'},{status:400});
 if(rawInterval!=='1m'&&rawInterval!=='5m')return NextResponse.json({error:'Unsupported timeframe'},{status:400});
 if(!process.env.ALPACA_API_KEY||!process.env.ALPACA_API_SECRET)
  return NextResponse.json({error:'Market data unavailable'},{status:503});
 try{
  const ticker=symbol as Ticker;
  const now=new Date();
  const [source,markers]=await Promise.all([loadBars(ticker),readRecordedSignals(ticker,now)]);
  const chart=buildChart(ticker,source,now,rawInterval as ChartInterval,markers);
  return NextResponse.json(chart,{headers:{'Cache-Control':'no-store, max-age=0'}});
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
