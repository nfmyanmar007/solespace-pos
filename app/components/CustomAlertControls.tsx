'use client';
import {useEffect,useState} from 'react';
type Subscription={ticker:string;enabled:boolean};
type Session={configured:boolean;authenticated:boolean};
export default function CustomAlertControls({symbols,onChanged}:{symbols:string[];onChanged:()=>void}){
 const [session,setSession]=useState<Session|null>(null),[key,setKey]=useState(''),[subscriptions,setSubscriptions]=useState<Subscription[]>([]);
 const [maxEnabled,setMaxEnabled]=useState(4),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 useEffect(()=>{let alive=true;fetch('/api/custom-alerts/session',{cache:'no-store'}).then(r=>r.json()).then((value:Session)=>{if(alive)setSession(value);}).catch(()=>{if(alive)setFeedback('Unable to verify owner session.');});return()=>{alive=false;};},[]);
 useEffect(()=>{if(!session?.authenticated)return;let alive=true;
  fetch('/api/custom-alerts',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to load');return data;})
   .then(v=>{if(alive){setSubscriptions(v.subscriptions||[]);setMaxEnabled(v.maxEnabled||4);setFeedback('');}})
   .catch(e=>{if(alive)setFeedback(String(e.message||e));});
  return()=>{alive=false;};
 },[session?.authenticated]);
 async function login(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!key)return;setBusy(true);setFeedback('');
  try{const res=await fetch('/api/custom-alerts/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});const result=await res.json();
   setKey('');if(!res.ok)throw Error(result.error||'Owner login failed');setSession({configured:true,authenticated:true});
  }catch(e){setFeedback(e instanceof Error?e.message:'Owner login failed');}finally{setBusy(false);}
 }
 async function toggle(ticker:string,enabled:boolean){
  if(busy)return;setBusy(true);setFeedback('');
  try{const res=await fetch('/api/custom-alerts',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker,enabled})});
   const result=await res.json();if(!res.ok)throw Error(result.error||'Unable to save');
   setSubscriptions(items=>[...items.filter(s=>s.ticker!==ticker),{ticker,enabled}]);
   onChanged();setFeedback(ticker+(enabled?' Telegram monitoring enabled. Confirmation required; no immediate alert.':' Telegram monitoring disabled.'));
  }catch(e){setFeedback(e instanceof Error?e.message:'Unable to save switch');}finally{setBusy(false);}
 }
 async function logout(){
  await fetch('/api/custom-alerts/session',{method:'DELETE',credentials:'same-origin'}).catch(()=>{});
  setSession({configured:true,authenticated:false});setSubscriptions([]);setKey('');setFeedback('');
 }
 const active=subscriptions.filter(s=>s.enabled).length;
 return <div className="customAlertControls" aria-label="Custom stock Telegram alert settings">
  <div className="customAlertHeading"><strong>Custom stock Telegram alerts</strong>{session?.authenticated&&<button type="button" onClick={logout} className="alertOwnerLogout">Lock settings</button>}</div>
  <p className="watchNote">Opt in to up to {maxEnabled} additional stocks. The original 8 Telegram stocks remain enabled. Only confirmed CALL/PUT triggers qualify.</p>
  {!session?<p className="watchNote">Checking owner access…</p>:
   !session.configured?<p className="watchFeedback">Owner access is not configured. Set CUSTOM_ALERT_ADMIN_KEY (32+ characters) in Vercel before using these switches.</p>:
   !session.authenticated?<form onSubmit={login} className="watchAddForm"><label htmlFor="alertOwnerKey">Owner access key</label><div><input id="alertOwnerKey" type="password" value={key} autoComplete="off" onChange={e=>setKey(e.target.value)} placeholder="Enter private owner key" disabled={busy}/><button type="submit" disabled={busy||!key}>{busy?'Checking…':'Unlock'}</button></div><p className="watchNote">The key is never stored in browser storage; a secure session lasts up to 12 hours.</p></form>:
   <div className="alertSwitchList">
    <p className="watchNote">{active}/{maxEnabled} optional stocks enabled. Changes apply to the next scheduled scan; they do not create immediate Telegram messages.</p>
    {symbols.map(ticker=>{
     const enabled=subscriptions.some(s=>s.ticker===ticker&&s.enabled);
     return <label key={ticker} className="alertToggleRow"><span><b>{ticker}</b><small>{enabled?'Telegram scan ON':'Research only'}</small></span><span className="alertToggleEnd"><input type="checkbox" checked={enabled} disabled={busy||(!enabled&&active>=maxEnabled)} onChange={e=>toggle(ticker,e.target.checked)}/>{enabled?'ON':'OFF'}</span></label>;
    })}
    {!symbols.length&&<p className="watchNote">Add a custom stock above to configure its alerts.</p>}
    {subscriptions.filter(s=>s.enabled&&!symbols.includes(s.ticker)).map(s=><label key={s.ticker} className="alertToggleRow"><span><b>{s.ticker}</b><small>Enabled on another browser — not in this local chart list</small></span><span className="alertToggleEnd"><input type="checkbox" checked disabled={busy} onChange={()=>toggle(s.ticker,false)}/>ON</span></label>)}
   </div>
  }
  {feedback&&<p className="watchFeedback" role="status">{feedback}</p>}
 </div>;
}
