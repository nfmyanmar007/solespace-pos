'use client';
import {useEffect,useState} from 'react';
import SignalQuality,{type QualityData} from './SignalQuality';

type HorizonSummary={minutes:5|10|15;measured:number;favorable:number;unfavorable:number;flat:number;missing:number;pending:number;outsideSession:number;averageDirectionalPct:number|null};
type Group={key:string;signals:number;scorecard:HorizonSummary[]};
type Coverage={recordsRead:number;recordsTruncated:boolean;groupsTotal:number;groupsProcessed:number;groupsTruncated:boolean;skippedInvalid:number;calendarSkipped:number;unmeasurable:number;referenceMismatch:number;feedFailures:string[];measuredSignals:number;maxGroupsPerRequest:number};
type HistoricalResponse={days:7|30|90;from:string;to:string;signals:number;scorecard:HorizonSummary[];daily:Group[];tickers:Group[];segments:Group[];dataStatus:string;coverage:Coverage;quality?:QualityData;note:string};
const pct=(n:number|null)=>n===null?'—':(n>0?'+':'')+n.toFixed(2)+'%';
function head(h:HorizonSummary|undefined){return h?.measured?pct(h.averageDirectionalPct):'—';}
function groupScore(g:Group,minutes:5|10|15){return head(g.scorecard.find(s=>s.minutes===minutes));}
export default function HistoricalPerformance(){
 const [days,setDays]=useState<7|30|90>(7);
 const [result,setResult]=useState<HistoricalResponse|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let alive=true;
  async function refresh(){
   try{
    const response=await fetch('/api/historical-performance?days='+days,{cache:'no-store'});
    if(response.status===401)throw Error('Owner access required. Unlock under Watchlist → Manage first.');
    if(response.status===429)throw Error('Too many requests. Try again in one minute.');
    if(!response.ok)throw Error('Historical data temporarily unavailable.');
    const value=await response.json() as HistoricalResponse;
    if(alive){setResult(value);setError('');setLoading(false);}
   }catch(e){if(alive){setError(e instanceof Error?e.message:'Historical data unavailable.');setResult(null);setLoading(false);}}
  }
  setLoading(true);setResult(null);refresh();
  const timer=window.setInterval(refresh,120000);
  return()=>{alive=false;window.clearInterval(timer);};
 },[days]);
 const coverage=result?.coverage;
 return <section className="panel historicalPerformance" aria-label="V3.1 historical stock performance">
  <div className="paneltop"><div><h2>V3.1 · Historical Signal Analytics</h2>
   <p className="muted">Verified recorded Telegram confirmations · Underlying IEX stock movement, not option P&amp;L</p></div>
   <div className="historyPeriods" role="group" aria-label="Historical analysis period">
    {([7,30,90] as const).map(n=><button key={n} type="button" disabled={loading} aria-pressed={days===n} className={days===n?'active':''} onClick={()=>setDays(n)}>{n} days</button>)}
   </div>
  </div>
  {loading?<p className="alertHistoryEmpty">Checking historical IEX reference and outcome candles…</p>:
  error?<p role="alert" className="alertHistoryEmpty">{error}</p>:
  result&&<>
   <p className="perfIntro">Window <strong>{result.from}–{result.to}</strong> · {result.signals} records assessed · {result.dataStatus==='PARTIAL'?'PARTIAL COVERAGE':'Verified, with IEX limitations'}</p>
   {result.dataStatus==='PARTIAL'&&<p className="historyWarning" role="status">Some historical records could not be verified or processed. Results below are based ONLY on assessed records, not a complete-period accuracy or win rate.</p>}
   {coverage&&<p className="historyMeta">Coverage: {coverage.groupsProcessed}/{coverage.groupsTotal} ticker-days processed · {coverage.measuredSignals} valid alert rows · {coverage.referenceMismatch} reference mismatches · {coverage.feedFailures.length} IEX feed errors · {coverage.calendarSkipped} unverified-calendar rows{coverage.groupsTruncated||coverage.recordsTruncated?' · Safety limit reached':''}</p>}
   <div className="perfScoreGrid">{result.scorecard.map(h=><div className="perfScore" key={h.minutes}>
    <small>AFTER {h.minutes} MINUTES</small><strong>{head(h)}</strong>
    <span>{h.favorable}/{h.measured} favorable underlying moves</span>
    <small>{h.unfavorable} unfavorable · {h.flat} flat · {h.missing} no bar · {h.pending} pending</small>
   </div>)}</div>
   <div className="historyTables">
    <div><h3>Core vs custom</h3><div className="monitorTableWrap"><table className="monitorTable"><thead><tr><th>Segment</th><th>Alerts</th><th>+5m</th><th>+10m</th><th>+15m</th></tr></thead><tbody>
     {result.segments.map(g=><tr key={g.key}><td>{g.key==='CORE'?'Core scanner (8)':'Custom alerts'}</td><td>{g.signals}</td><td>{groupScore(g,5)}</td><td>{groupScore(g,10)}</td><td>{groupScore(g,15)}</td></tr>)}
    </tbody></table></div></div>
    <div><h3>Per-ticker performance</h3><div className="monitorTableWrap"><table className="monitorTable"><thead><tr><th>Ticker</th><th>Alerts</th><th>+5m</th><th>+10m</th><th>+15m</th></tr></thead><tbody>
     {result.tickers.map(g=><tr key={g.key}><td><strong>{g.key}</strong></td><td>{g.signals}</td><td>{groupScore(g,5)}</td><td>{groupScore(g,10)}</td><td>{groupScore(g,15)}</td></tr>)}
     {!result.tickers.length&&<tr><td colSpan={5}>No verified records for this window.</td></tr>}
    </tbody></table></div></div>
    <div><h3>Daily scorecard</h3><div className="monitorTableWrap"><table className="monitorTable"><thead><tr><th>ET date</th><th>Alerts</th><th>+5m</th><th>+10m</th><th>+15m</th></tr></thead><tbody>
     {result.daily.map(g=><tr key={g.key}><td>{g.key}</td><td>{g.signals}</td><td>{groupScore(g,5)}</td><td>{groupScore(g,10)}</td><td>{groupScore(g,15)}</td></tr>)}
     {!result.daily.length&&<tr><td colSpan={5}>No historical confirmations in this period.</td></tr>}
    </tbody></table></div></div>
   </div>
   {result.quality&&<SignalQuality data={result.quality}/>}
   <p className="monitorFootnote">{result.note}</p>
  </>}
 </section>;
}
