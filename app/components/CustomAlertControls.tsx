'use client';
import {useEffect,useState} from 'react';
import {startRegistration,startAuthentication,browserSupportsWebAuthn} from '@simplewebauthn/browser';
type Subscription={ticker:string;enabled:boolean};
type Session={configured:boolean;authenticated:boolean;ownerKeySession?:boolean};
type PasskeyInfo={credential_id:string;created_at:string;last_used_at:string|null};
export default function CustomAlertControls({symbols,onChanged}:{symbols:string[];onChanged:()=>void}){
 const [session,setSession]=useState<Session|null>(null),[key,setKey]=useState(''),[subscriptions,setSubscriptions]=useState<Subscription[]>([]);
 const [maxEnabled,setMaxEnabled]=useState(4),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 const [remember,setRemember]=useState(true),[passkeys,setPasskeys]=useState<PasskeyInfo[]>([]),[supportsPasskey,setSupportsPasskey]=useState(false);
 useEffect(()=>{setSupportsPasskey(browserSupportsWebAuthn());},[]);
 useEffect(()=>{let alive=true;fetch('/api/custom-alerts/session',{cache:'no-store'}).then(r=>r.json()).then((value:Session)=>{if(alive)setSession(value);}).catch(()=>{if(alive)setFeedback('Unable to verify owner session.');});return()=>{alive=false;};},[]);
 useEffect(()=>{if(!session?.authenticated)return;let alive=true;
  fetch('/api/custom-alerts',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to load');return data;})
   .then(v=>{if(alive){setSubscriptions(v.subscriptions||[]);setMaxEnabled(v.maxEnabled||4);setFeedback('');}})
   .catch(e=>{if(alive)setFeedback(String(e.message||e));});
  fetch('/api/custom-alerts/passkeys',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>{if(alive&&x)setPasskeys(x.passkeys||[]);}).catch(()=>{});
  return()=>{alive=false;};
 },[session?.authenticated]);
 async function login(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!key)return;setBusy(true);setFeedback('');
  try{const res=await fetch('/api/custom-alerts/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,rememberDevice:remember})});const result=await res.json();
   setKey('');if(!res.ok)throw Error(result.error||'Owner login failed');setSession({configured:true,authenticated:true,ownerKeySession:!remember});
  }catch(e){setFeedback(e instanceof Error?e.message:'Owner login failed');}finally{setBusy(false);}
 }
 async function passkeyFlow(mode:'register'|'login'){
  if(busy)return;setBusy(true);setFeedback('');
  try{
   const start=await fetch('/api/custom-alerts/passkeys',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode==='register'?'start-register':'start-login'})});
   const request=await start.json();if(!start.ok)throw Error(request.error||'Passkey is unavailable');
   const credential=mode==='register'?await startRegistration({optionsJSON:request.options}):await startAuthentication({optionsJSON:request.options});
   const finish=await fetch('/api/custom-alerts/passkeys',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:mode==='register'?'finish-register':'finish-login',challengeId:request.challengeId,response:credential})});
   const result=await finish.json();if(!finish.ok)throw Error(result.error||'Passkey verification failed');
   if(mode==='login'){setSession({configured:true,authenticated:true,ownerKeySession:false});setFeedback('Signed in with your passkey. This browser is trusted for 30 days.');}
   else{
    const list=await fetch('/api/custom-alerts/passkeys',{cache:'no-store'});if(list.ok)setPasskeys((await list.json()).passkeys||[]);
    setFeedback('Passkey registered successfully. Next time use Face ID / passkey.');
   }
  }catch(e){setFeedback(e instanceof Error?e.message:'Passkey request was canceled or unsupported');}
  finally{setBusy(false);}
 }
 async function removePasskey(id:string){
  if(busy||!session?.ownerKeySession)return;setBusy(true);setFeedback('');
  try{
   const r=await fetch('/api/custom-alerts/passkeys',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove-passkey',credentialId:id})});
   const v=await r.json();if(!r.ok)throw Error(v.error||'Failed to remove passkey');
   setPasskeys(old=>old.filter(p=>p.credential_id!==id));setFeedback('Passkey removed.');
  }catch(e){setFeedback(e instanceof Error?e.message:'Could not remove passkey');}
  finally{setBusy(false);}
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
  setSession({configured:true,authenticated:false,ownerKeySession:false});setSubscriptions([]);setKey('');setFeedback('');
 }
 const active=subscriptions.filter(s=>s.enabled).length;
 return <div className="customAlertControls" aria-label="Custom stock Telegram alert settings">
  <div className="customAlertHeading"><strong>Custom stock Telegram alerts</strong>{session?.authenticated&&<button type="button" onClick={logout} className="alertOwnerLogout">Lock settings</button>}</div>
  <p className="watchNote">Opt in to up to {maxEnabled} additional stocks. The original 8 Telegram stocks remain enabled. Only confirmed CALL/PUT triggers qualify.</p>
  {!session?<p className="watchNote">Checking owner access…</p>:
   !session.configured?<p className="watchFeedback">Owner access is not configured. Set CUSTOM_ALERT_ADMIN_KEY (32+ characters) in Vercel before using these switches.</p>:
   !session.authenticated?<form onSubmit={login} className="watchAddForm"><label htmlFor="alertOwnerKey">Owner access key</label><div><input id="alertOwnerKey" type="password" value={key} autoComplete="off" onChange={e=>setKey(e.target.value)} placeholder="Enter private owner key" disabled={busy}/><button type="submit" disabled={busy||!key}>{busy?'Checking…':'Unlock'}</button></div><label className="trustedCheckbox"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember this device for 30 days</label>
    <p className="watchNote">Uncheck to use the original 12-hour key session (required to register or remove passkeys). Your key is never saved in the browser.</p>
    {supportsPasskey&&<button type="button" className="passkeyButton" disabled={busy} onClick={()=>passkeyFlow('login')}>Unlock with Face ID / Passkey</button>}
   </form>:
   <div className="alertSwitchList">
    <div className="passkeySettings">
     <strong>Face ID / Passkeys</strong>
     <p className="watchNote">{session.ownerKeySession?'Enroll a passkey for quick secure login using Face ID, Touch ID, or your device PIN.':'To enroll or remove a passkey, lock settings, sign in with your owner key and uncheck “Remember this device”.'}</p>
     {session.ownerKeySession&&supportsPasskey&&<button type="button" className="passkeyButton" disabled={busy||passkeys.length>=5} onClick={()=>passkeyFlow('register')}>＋ Register Face ID / Passkey</button>}
     {passkeys.map((p,i)=><div className="passkeyRow" key={p.credential_id}><span>Passkey {i+1} · Added {new Date(p.created_at).toLocaleDateString('en-US')}</span>{session.ownerKeySession&&<button type="button" disabled={busy} onClick={()=>removePasskey(p.credential_id)}>Remove</button>}</div>)}
     {!passkeys.length&&<p className="watchNote">No passkeys registered yet.</p>}
    </div>
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
