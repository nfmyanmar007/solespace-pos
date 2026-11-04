import {tickers,evaluate,loadBars,marketState,type Signal,type Ticker,type Bar} from './engine';
import {fetchTradingSession,sessionState} from './market-calendar.ts';
function demoBars(ticker:Ticker):Bar[]{
 const now=new Date(),f=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',timeZoneName:'short'}).formatToParts(now),g=(k:string)=>f.find(x=>x.type===k)?.value||'';
 const off=g('timeZoneName')==='EST'?'-05:00':'-04:00',start=new Date(g('year')+'-'+g('month')+'-'+g('day')+'T09:30:00'+off).getTime();
 const base=({QQQ:620,SPY:675,TSLA:440,NVDA:205,AMD:260,AAPL:320,MSFT:525,GOOGL:295} as Record<Ticker,number>)[ticker];
 return Array.from({length:30},(_,i)=>{const c=base+(i-15)*.045+Math.sin(i/3)*.12;return {t:new Date(start+i*60000).toISOString(),o:c-.08,h:c+.13,l:c-.15,c,v:6000+i*90}});
}
export async function getReport(){
 const mode=process.env.ALPACA_API_KEY&&process.env.ALPACA_API_SECRET?'IEX LIVE':'DEMO';
 const now=new Date();const calendar=mode==='IEX LIVE'?await fetchTradingSession(now):undefined;
 const state=mode==='IEX LIVE'?sessionState(now,calendar??null):marketState(now);
 const results=await Promise.all(tickers.map(async ticker=>{try{return mode==='DEMO'?evaluate(ticker,demoBars(ticker),now):evaluate(ticker,await loadBars(ticker),now,calendar)}catch(e){return {ticker,status:'NO TRADE',callAbove:null,putBelow:null,price:null,vwap:null,volumeRatio:null,bias:'NEUTRAL',reason:String(e),timestamp:null,fresh:false,feed:'IEX'} as Signal}}));
 // Demo values intentionally do not represent live market confirmations.
 return {mode,marketState:state,calendarSource:calendar?.source||'UNAVAILABLE',asOf:now.toISOString(),signals:mode==='DEMO'?results.map(s=>({...s,status:'DEMO',reason:'Illustrative sample data; connect Alpaca for live signals',fresh:false})):results};
}
