'use client';
import {useEffect,useState} from 'react';
type Flag='VWAP_REVERSAL'|'MOMENTUM_WEAKNESS'|'TIME_REVIEW'|'TIMEBOX';
type Advisory={id:number;ticker:string;direction:'CALL'|'PUT';sentAt:string;status:'MONITOR'|'REVIEW'|'UNAVAILABLE'|'TIMEBOX_ELAPSED';flags:Flag[];observedAt:string|null;lastPrice:number|null;vwap:number|null;ageSeconds:number|null;elapsedSinceTelegramMinutes:number;reason:string};
type Response={sessionDate:string;asOf:string;dataStatus:string;advisories:Advisory[];note:string};
const time=(s:string)=>new Date(s).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:'2-digit'});
const flags:Record<Flag,string>={VWAP_REVERSAL:'IEX VWAP cross against signal direction',MOMENTUM_WEAKNESS:'Latest consecutive candle weakened',TIME_REVIEW:'5-minute Telegram review point',TIMEBOX:'15-minute Telegram timebox elapsed'};
export default function SmartExitMonitor(){
 const [data,setData]=useState<Response|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   try{
    const response=await fetch('/api/smart-exit',{cache:'no-store'});
    if(response.status===401)throw Error('Unlock owner access under Watchlist → Manage.');
    if(response.status===429)throw Error('Too many requests. Retry in one minute.');
    if(!response.ok)throw Error('Exit-monitoring feed is temporarily unavailable.');
    const result=await response.json() as Response;
    if(active){setData(result);setError('');setLoading(false);}
   }catch(e){if(active){setData(null);setError(e instanceof Error?e.message:'Monitoring unavailable.');setLoading(false);}}
  };
  refresh();const id=window.setInterval(refresh,60000);
  return()=>{active=false;window.clearInterval(id);};
 },[]);
 return <section className="panel smartExitMonitor" aria-label="V3.3 advisory exit monitoring">
  <div className="paneltop"><div><h2>V3.3 · Smart Exit Review</h2>
   <p className="muted">Owner-only advisory research · Post-Telegram completed IEX stock candles · Refreshes every minute</p>
  </div></div>
  {loading?<p className="alertHistoryEmpty">Checking recent sent confirmations…</p>:
  error?<p className="alertHistoryEmpty" role="alert">{error}</p>:
  data&&<>
   <p className="perfIntro">ET session {data.sessionDate} · {data.advisories.length} recent monitored confirmations · {data.dataStatus.replaceAll('_',' ')}</p>
   <div className="smartExitGrid">{data.advisories.map(a=><article className="smartExitCard" key={a.id}>
    <div className="smartExitHeading"><strong>{a.ticker} · {a.direction}</strong><span className={'smartExitState '+(a.status==='REVIEW'?'smartExitReview':'')}>{a.status.replaceAll('_',' ')}</span></div>
    <p className="smartExitDetails">Telegram accepted {time(a.sentAt)} ET · {a.elapsedSinceTelegramMinutes.toFixed(1)} min elapsed</p>
    <p className="smartExitDetails">IEX close {a.observedAt?time(a.observedAt)+' ET':'unverified'} · Stock {a.lastPrice===null?'—':'$'+a.lastPrice.toFixed(2)} · Verified-session VWAP {a.vwap===null?'unavailable':'$'+a.vwap.toFixed(2)}</p>
    {a.flags.length>0&&<ul>{a.flags.map(f=><li key={f}>{flags[f]}</li>)}</ul>}
    <p className="smartExitDetails">{a.reason}</p>
   </article>)}
   {!data.advisories.length&&<p className="alertHistoryEmpty">No sent confirmations in the recent monitoring window. Nothing is inferred about open positions.</p>}
   </div>
   <p className="monitorFootnote">{data.note} A review flag is not a confirmed sell signal; assess your actual option contract, bid/ask, and personal stop rules.</p>
  </>}
 </section>;
}
