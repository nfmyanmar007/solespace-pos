import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {loadBars,type Bar,type Ticker} from '@/lib/engine';
import {fetchTradingSession} from '@/lib/market-calendar';
import {measureSignal,summarizeMeasurements,type SentSignal,type SignalMeasurement} from '@/lib/signal-performance';
import {todayNY} from '@/lib/dashboard-mobile';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'no-store, max-age=0'};
const tickerOk=(value:string)=>/^[A-Z]{1,5}(\.[A-Z])?$/.test(value);
export async function GET(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!process.env.ALPACA_API_KEY||!process.env.ALPACA_API_SECRET)
  return NextResponse.json({error:'Performance feed unavailable'},{status:503,headers});
 const now=new Date(),sessionDate=todayNY(now);
 try{
  const db=createClient(url,key,{auth:{persistSession:false}});
  const [stored,calendar]=await Promise.all([
   db.from('signal_alerts').select('id,session_date,ticker,direction,price,bar_timestamp,sent_at,status')
    .eq('session_date',sessionDate).eq('status','sent').order('sent_at',{ascending:false}).limit(50),
   fetchTradingSession(now)
  ]);
  if(stored.error)throw Error('Signal journal unavailable');
  if(!calendar||calendar.source!=='ALPACA'||!calendar.isTradingDay){
   return NextResponse.json({sessionDate,asOf:now.toISOString(),feed:'IEX 1Min',dataStatus:'CALENDAR_UNAVAILABLE',
    signals:[],scorecard:[],note:'No historical performance is inferred without a verified trading calendar.'},{headers});
  }
  const data=(stored.data||[]) as SentSignal[];
  // Only completed, sent confirmations; never include pending/failed or invented rows.
  const eligible=data.filter(s=>tickerOk(s.ticker)&&s.session_date===sessionDate&&
   (s.direction==='CALL'||s.direction==='PUT')&&Number.isFinite(Number(s.price))&&Number(s.price)>0);
  const unique=[...new Set(eligible.map(s=>s.ticker))].slice(0,12);
  const candles=new Map<string,Bar[]|null>();
  for(let i=0;i<unique.length;i+=3){
   const batch=await Promise.all(unique.slice(i,i+3).map(async ticker=>{
    try{return {ticker,bars:await loadBars(ticker as Ticker)};}
    catch{return {ticker,bars:null};}
   }));
   for(const item of batch)candles.set(item.ticker,item.bars);
  }
  const signals:SignalMeasurement[]=[],feedFailures:string[]=[];
  for(const ticker of unique)if(candles.get(ticker)===null)feedFailures.push(ticker);
  for(const item of eligible){
   if(!candles.has(item.ticker))continue;
   const measured=measureSignal(item,candles.get(item.ticker)||[],now,calendar);
   if(measured){
    // Data feed failure is explicitly distinguished from missing individual bars.
    if(candles.get(item.ticker)===null)measured.horizons=measured.horizons.map(h=>h.status==='MISSING_BAR'?{...h,status:'INVALID' as const}:h);
    signals.push(measured);
   }
  }
  return NextResponse.json({sessionDate,asOf:now.toISOString(),feed:'Alpaca IEX 1Min',dataStatus:feedFailures.length?'PARTIAL_FEED_ERROR':'AVAILABLE',
   feedFailures,signals,scorecard:summarizeMeasurements(signals),
   note:'Underlying stock movements only, not options P&L. Reference is the IEX observed confirmation bar close; each horizon needs an exact completed IEX minute candle. Missing and unfinished horizons are excluded from averages. No prices are extrapolated. Research only.'},
   {headers});
 }catch{
  return NextResponse.json({error:'Performance measurement temporarily unavailable'},{status:503,headers});
 }
}
