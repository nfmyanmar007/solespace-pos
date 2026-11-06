'use client';
import {useEffect,useState} from 'react';
import type {DeliveredAlert} from '@/lib/dashboard-mobile';
import ExitWindowHint from './ExitWindowHint';
type History={sessionDate:string;asOf:string;alerts:DeliveredAlert[]};
const clock=(s:string)=>new Date(s).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});
const money=(n:number)=>'$'+n.toFixed(2);
export default function AlertHistory({onSelectTicker}:{onSelectTicker:(ticker:string)=>void}){
 const [history,setHistory]=useState<History|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let mounted=true;
  async function load(){
   try{
    const response=await fetch('/api/alert-history',{cache:'no-store'});
    if(response.status===401)throw new Error('Unlock owner access under Watchlist → Manage to view sent alerts.');
    if(response.status===429)throw new Error('Too many requests. Retry in one minute.');
    if(!response.ok)throw new Error('History unavailable');
    const result=await response.json() as History;
    if(mounted){setHistory(result);setError('');setLoading(false);}
   }catch(e){if(mounted){setError(e instanceof Error&&/Unlock owner|Too many requests/.test(e.message)?e.message:'Today’s delivery history is temporarily unavailable.');setLoading(false);}}
  }
  load();
  const timer=globalThis.setInterval(load,60000);
  return ()=>{mounted=false;clearInterval(timer);};
 },[]);
 return <section className="panel todayAlerts" aria-label="Today's delivered Telegram alerts">
  <div className="paneltop"><div><h2>Today’s confirmed alerts <span className="alertHistoryCount">{history?.alerts.length??'—'}</span></h2>
  <p className="muted">Owner-only records accepted by Telegram today (Eastern Time). Exit times are example review reminders, not confirmed sell signals.</p></div></div>
  {loading?<p className="alertHistoryEmpty">Loading alert history…</p>:
   error?<p role="status" className="alertHistoryEmpty">{error}</p>:
   history?.alerts.length?<div className="alertHistoryGrid">{history.alerts.map(a=><button type="button" className="historyItem" key={a.ticker+a.direction+a.barTimestamp}
      onClick={()=>onSelectTicker(a.ticker)} title={'Open '+a.ticker+' chart'}>
      <span className="historyItemHead"><strong>{a.ticker}</strong><span className={'mobileSignalBadge '+(a.direction==='CALL'?'confirmed':'blocked')}>{a.direction}</span></span>
      <span className="historyItemMeta">Sent {clock(a.sentAt)} ET</span>
      <span className="historyItemMeta">Stock {money(a.price)} · Trigger {money(a.trigger)}</span>
      <ExitWindowHint timestamp={a.barTimestamp} sentAt={a.sentAt}/>
    </button>)}</div>:
    <p className="alertHistoryEmpty">No confirmed Telegram deliveries recorded today. The scanner only alerts when all confirmation conditions pass.</p>}
 </section>;
}
