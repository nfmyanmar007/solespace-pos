'use client';
import {useEffect,useState} from 'react';
type Health={state:'HEALTHY'|'LATE'|'IDLE'|'NO DATA'|'UNKNOWN';reason:string;lastRunAt:string|null;ageSeconds:number|null;recentRuns:number;missedWindows:number;regularSession:boolean};
type Data={asOf:string;marketState:string;health:Health;deliveries:{sent:number;failed:number;pending:number;deliveryFailures:number;hasFailures:boolean};recentRuns:{at:string;marketState:string;signalCount:number;mode:string}[];configuration:string;note:string};
const time=(x:string)=>new Date(x).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'});
export default function ScannerMonitor(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let alive=true;
  async function refresh(){
   try{const res=await fetch('/api/scanner-health',{cache:'no-store'});if(!res.ok)throw new Error('Unavailable');
    const response=await res.json() as Data;if(alive){setData(response);setError('');setLoading(false);}
   }catch{if(alive){setError('Monitoring is temporarily unavailable. Scanner status cannot be verified.');setLoading(false);}}
  }
  refresh();const timer=window.setInterval(refresh,60000);return()=>{alive=false;window.clearInterval(timer);};
 },[]);
 return <section className="panel scannerMonitor" aria-label="Scanner reliability monitor">
  <div className="paneltop"><div><h2>Scanner Reliability</h2><p className="muted">Read-only health checks · New York time · Updates every 60 seconds</p></div></div>
  {loading?<p className="monitorMessage">Loading scanner history…</p>:
   error?<p className="monitorMessage" role="alert">{error}</p>:
   data&&<>
    <div className="monitorHealth">
     <strong className={'monitorStatus monitor'+data.health.state.replace(' ','')}>{data.health.state}</strong>
     <div><b>{data.health.reason}</b><p>Market: {data.marketState} · Checked {time(data.asOf)} ET</p></div>
    </div>
    <div className="monitorMetrics">
     <div><small>LAST RECORDED SCAN</small><strong>{data.health.lastRunAt?time(data.health.lastRunAt)+' ET':'No record'}</strong></div>
     <div><small>RECENT SCANS</small><strong>{data.health.recentRuns}</strong></div>
     <div><small>GAPS OVER 5 MINUTES</small><strong>{data.health.missedWindows}</strong></div>
     <div><small>TELEGRAM SENT (24H)</small><strong>{data.deliveries.sent}</strong></div>
     <div><small>FAILED (24H)</small><strong className={data.deliveries.hasFailures?'monitorWarning':''}>{data.deliveries.failed}</strong></div>
     <div><small>DELIVERY ERROR EVENTS (24H)</small><strong className={data.deliveries.deliveryFailures?'monitorWarning':''}>{data.deliveries.deliveryFailures}</strong></div>
    </div>
    {data.deliveries.hasFailures&&<p className="monitorMessage monitorWarning" role="alert">Some delivery failures were recorded. Review the Telegram delivery journal before relying on alerts.</p>}
    <h3 className="monitorSubheading">Recent scanner executions</h3>
    <div className="monitorTableWrap"><table className="monitorTable"><thead><tr><th>Time (ET)</th><th>Session</th><th>Signals checked</th></tr></thead><tbody>
     {data.recentRuns.map((r,i)=><tr key={r.at+i}><td>{time(r.at)}</td><td>{r.marketState}</td><td>{r.signalCount}</td></tr>)}
     {!data.recentRuns.length&&<tr><td colSpan={3}>No scanner execution records.</td></tr>}
    </tbody></table></div>
    <p className="monitorFootnote">{data.configuration} A healthy record does not guarantee future delivery. This panel does not scan markets, send alerts, or place trades.</p>
   </>}
 </section>;
}
