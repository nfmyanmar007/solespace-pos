import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {ownerAuthenticated} from '@/lib/owner-security';
import {allowPerformanceRead,shortLivedServerCache} from '@/lib/performance-read-guard';
import {todayNY} from '@/lib/dashboard-mobile';
import {fetchTradingSession} from '@/lib/market-calendar';
import {loadBars,type Bar,type Ticker} from '@/lib/engine';
import {exitAdvisory,type ExitAdvisory} from '@/lib/smart-exit';
import type {SentSignal} from '@/lib/signal-performance';

export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store, max-age=0'};
const cached=shortLivedServerCache<Record<string,unknown>>(30_000);
const validTicker=(ticker:string)=>/^[A-Z]{1,5}(\.[A-Z])?$/.test(ticker);
export async function GET(req:NextRequest){
 if(!await ownerAuthenticated(req))return NextResponse.json({error:'Owner session required'},{status:401,headers});
 if(!allowPerformanceRead())return NextResponse.json({error:'Too many requests; retry in one minute'},{status:429,headers:{...headers,'Retry-After':'60'}});
 try{return NextResponse.json(await cached.get(build),{headers});}
 catch{return NextResponse.json({error:'Exit monitoring unavailable'},{status:503,headers});}
}
async function build():Promise<Record<string,unknown>>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!process.env.ALPACA_API_KEY||!process.env.ALPACA_API_SECRET)
  throw Error('Required market feed unavailable');
 const now=new Date(),sessionDate=todayNY(now);
 const db=createClient(url,key,{auth:{persistSession:false}});
 const [stored,session]=await Promise.all([
  db.from('signal_alerts').select('id,session_date,ticker,direction,price,bar_timestamp,sent_at,status')
   .eq('session_date',sessionDate).eq('status','sent').order('sent_at',{ascending:false}).limit(50),
  fetchTradingSession(now)
 ]);
 if(stored.error)throw Error('Signal journal unavailable');
 if(!session||!session.isTradingDay||session.source!=='ALPACA')return {
  sessionDate,asOf:now.toISOString(),dataStatus:'CALENDAR_UNAVAILABLE',advisories:[],
  note:'Exchange calendar not verified; no exit-monitoring inference is possible.'
 };
 const rows=((stored.data||[]) as SentSignal[]).filter(s=>validTicker(s.ticker)&&
  (s.direction==='CALL'||s.direction==='PUT')&&s.sent_at&&Number.isFinite(Date.parse(s.sent_at))&&
  Date.parse(s.sent_at)<=now.getTime()&&now.getTime()-Date.parse(s.sent_at)<30*60_000);
 const symbols=[...new Set(rows.map(s=>s.ticker))].slice(0,12);
 const prices=new Map<string,Bar[]|null>();
 for(let i=0;i<symbols.length;i+=4){
  const batch=await Promise.all(symbols.slice(i,i+4).map(async ticker=>{
   try{return {ticker,bars:await loadBars(ticker as Ticker)};}
   catch{return {ticker,bars:null};}
  }));
  for(const p of batch)prices.set(p.ticker,p.bars);
 }
 const advisories:ExitAdvisory[]=[];
 for(const s of rows){
  if(!prices.has(s.ticker))continue;
  const assessment=exitAdvisory(s,prices.get(s.ticker)||[],now,session);
  if(assessment)advisories.push(assessment);
 }
 return {sessionDate,asOf:now.toISOString(),dataStatus:[...prices.values()].some(b=>b===null)?'PARTIAL_FEED_ERROR':'AVAILABLE',
  totalRecentSent:rows.length,monitored:advisories.length,
  advisories,
  note:'Advisory research only. These are time-limited, post-Telegram IEX-stock checks, not executed options positions or sale recommendations. VWAP review requires complete unique session candles and does not use future data. Missing, stale, and unverified feeds fail closed. No Telegram or broker orders are sent.'};
}
