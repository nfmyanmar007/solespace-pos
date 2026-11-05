'use client';
import {useEffect,useState} from 'react';
import {confirmedExitWindow,exitWindow} from '@/lib/exit-window';
export default function ExitWindowHint({timestamp,status,sentAt}:{timestamp:string|null;status?:string;sentAt?:string}){
 const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{setNow(new Date());const timer=window.setInterval(()=>setNow(new Date()),30000);return()=>window.clearInterval(timer);},[]);
 const windowPlan=now&&(sentAt?exitWindow(sentAt,now):confirmedExitWindow(status||'',timestamp,now));
 if(!windowPlan)return null;
 const et=(v:string)=>new Date(v).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});
 return <span className="exitWindowHint" aria-label="Suggested scalp exit review window">
  <strong>EXIT PLAN · {windowPlan.phase}</strong>
  <span>Review {et(windowPlan.reviewAt)} ET · Timebox {et(windowPlan.timeboxAt)} ET</span>
  <small>Example 5/15-min scalp window, not a sell order. Exit sooner if setup invalidates; verify your option price and risk separately.</small>
 </span>;
}
