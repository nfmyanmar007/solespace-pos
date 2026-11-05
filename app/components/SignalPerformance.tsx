'use client';
import {useEffect,useState} from 'react';
type Horizon={minutes:5|10|15;status:'MEASURED'|'PENDING'|'MISSING_BAR'|'OUTSIDE_SESSION'|'INVALID';barAt:string|null;price:number|null;stockMovePct:number|null;directionalMovePct:number|null};
type Signal={id:number;ticker:string;direction:'CALL'|'PUT';entryPrice:number;entryAt:string;sentAt:string|null;horizons:Horizon[]};
type Summary={minutes:5|10|15;measured:number;favorable:number;unfavorable:number;flat:number;missing:number;pending:number;outsideSession:number;averageDirectionalPct:number|null};
type Data={sessionDate:string;asOf:string;dataStatus:string;feedFailures?:string[];signals:Signal[];scorecard:Summary[];note:string};
const money=(v:number|null)=>v===null?'—':'$'+v.toFixed(2);
const percent=(v:number|null)=>v===null?'—':(v>0?'+':'')+v.toFixed(2)+'%';
const time=(v:string)=>new Date(v).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});
function outcome(h:Horizon){
 if(h.status==='MEASURED')return <span className={h.directionalMovePct!>0?'perfGood':h.directionalMovePct!<0?'perfBad':''}>{percent(h.directionalMovePct)} <small>({money(h.price)})</small></span>;
 if(h.status==='PENDING')return <span className="perfMuted">Awaiting close</span>;
 if(h.status==='OUTSIDE_SESSION')return <span className="perfMuted">After market close</span>;
 if(h.status==='MISSING_BAR')return <span className="perfMuted">No IEX candle</span>;
 return <span className="perfMuted">Feed unavailable</span>;
}
export default function SignalPerformance(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   try{
    const response=await fetch('/api/signal-performance',{cache:'no-store'});
    if(!response.ok)throw Error('Performance feed unavailable');
    const result=await response.json() as Data;
    if(active){setData(result);setError('');setLoading(false);}
   }catch{if(active){setError('Performance scorecard is temporarily unavailable. No results can be verified.');setLoading(false);}}
  };
  refresh();const timer=window.setInterval(refresh,120000);
  return()=>{active=false;window.clearInterval(timer);};
 },[]);
 return <section className="panel signalPerformance" aria-label="V3.0 stock signal performance">
  <div className="paneltop"><div><h2>V3.0 · Signal Performance Tracker</h2>
   <p className="muted">Measured at +5, +10 and +15 minutes after each confirmed IEX candle · New York time · Updates every 2 minutes</p>
  </div></div>
  {loading?<p className="alertHistoryEmpty">Measuring confirmed signals…</p>:error?<p className="alertHistoryEmpty" role="alert">{error}</p>:data&&<>
   <p className="perfIntro"><strong>Session {data.sessionDate}</strong> · {data.signals.length} recorded sent confirmations · Feed: {data.dataStatus==='AVAILABLE'?'IEX 1-minute candles':data.dataStatus.replaceAll('_',' ')}</p>
   {(data.feedFailures?.length??0)>0&&<p role="status" className="perfWarning">IEX data unavailable for {(data.feedFailures??[]).join(', ')}. Their missing outcomes are not included as losses.</p>}
   {data.scorecard.length>0&&<div className="perfScoreGrid">{data.scorecard.map(s=><div className="perfScore" key={s.minutes}>
     <small>AFTER {s.minutes} MINUTES</small><strong>{s.measured?percent(s.averageDirectionalPct):'No measured data'}</strong>
     <span>{s.favorable} favorable · {s.unfavorable} unfavorable · {s.flat} flat</span>
     <small>{s.measured} measured · {s.pending} pending · {s.missing} missing · {s.outsideSession} outside session</small>
    </div>)}</div>}
   <div className="monitorTableWrap"><table className="monitorTable perfTable"><thead><tr><th>Confirmed stock</th><th>CALL / PUT</th><th>Entry reference</th><th>+5m</th><th>+10m</th><th>+15m</th></tr></thead><tbody>
     {data.signals.map(s=><tr key={s.id}><td><strong>{s.ticker}</strong><small className="perfDetail">{time(s.entryAt)} ET</small></td><td>{s.direction}</td><td>{money(s.entryPrice)}</td>
      {[5,10,15].map(m=><td key={m}>{outcome(s.horizons.find(h=>h.minutes===m)!)}</td>)}</tr>)}
     {!data.signals.length&&<tr><td colSpan={6}>No sent A+ confirmation records with measurable IEX data today. No performance result is assumed.</td></tr>}
    </tbody></table></div>
   <p className="monitorFootnote">{data.note} A positive directional stock move is not an options profit: spreads, theta, implied volatility and actual execution prices are excluded. This is not a live trade or sell instruction.</p>
  </>}
 </section>;
}
