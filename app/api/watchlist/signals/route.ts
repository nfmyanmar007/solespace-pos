import {NextRequest,NextResponse} from 'next/server';
import {loadBars,evaluate,type Ticker} from '@/lib/engine';
import {fetchTradingSession} from '@/lib/market-calendar';
import {validateWatchSymbol} from '@/lib/asset-validator';
import {normalizeCustomQuery,asChartOnlySignal} from '@/lib/unified-watchlist';
export const dynamic='force-dynamic';
export const maxDuration=30;
// Read-only personalized display; does NOT change scanner membership or Telegram delivery.
export async function GET(req:NextRequest){
 const symbols=normalizeCustomQuery(req.nextUrl.searchParams.get('symbols'));
 if(symbols===null)return NextResponse.json({error:'Invalid custom ticker list'},{status:400});
 if(symbols.length===0)return NextResponse.json({signals:[],asOf:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 if(!process.env.ALPACA_API_KEY||!process.env.ALPACA_API_SECRET)
  return NextResponse.json({error:'Market feed unavailable'},{status:503});
 const now=new Date(),session=await fetchTradingSession(now);
 const signals=[];
 // Bounded parallelism protects free-tier IEX data/API rate limits.
 for(let i=0;i<symbols.length;i+=3){
  const batch=await Promise.all(symbols.slice(i,i+3).map(async symbol=>{
   try{
    const result=await validateWatchSymbol(symbol);
    if(!result.ok)return {ticker:symbol,status:'NO DATA',callAbove:null,putBelow:null,price:null,vwap:null,volumeRatio:null,bias:'NEUTRAL',reason:result.reason||'Symbol unavailable',timestamp:null,fresh:false,feed:'IEX',scannerEnabled:false};
    const bars=await loadBars(symbol as Ticker);
    return asChartOnlySignal(evaluate(symbol as Ticker,bars,now,session));
   }catch{return {ticker:symbol,status:'NO DATA',callAbove:null,putBelow:null,price:null,vwap:null,volumeRatio:null,bias:'NEUTRAL',reason:'IEX feed unavailable for this custom stock',timestamp:null,fresh:false,feed:'IEX',scannerEnabled:false};}
  }));
  signals.push(...batch);
 }
 return NextResponse.json({signals,asOf:now.toISOString(),feed:'IEX',scannerScope:'CORE_ONLY'},{headers:{'Cache-Control':'no-store'}});
}
