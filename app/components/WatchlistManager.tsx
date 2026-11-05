'use client';
import {useEffect,useState} from 'react';
import {CORE_TICKERS,MAX_WATCHLIST,STORAGE_KEY,parseSavedWatchlist,canAddSymbol} from '@/lib/watchlist';
type Validation={ok:boolean;symbol?:string;name?:string;reason?:string};
export default function WatchlistManager({selected,onSelect,onSavedChange}:{selected:string;onSelect:(ticker:string)=>void;onSavedChange:(stocks:string[])=>void}){
 const [saved,setSaved]=useState<string[]>([]);
 const [ready,setReady]=useState(false);
 const [draft,setDraft]=useState('');
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState('');
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  try{const raw=window.localStorage.getItem(STORAGE_KEY);const parsed=parseSavedWatchlist(raw?JSON.parse(raw):[]);setSaved(parsed);onSavedChange(parsed);}
  catch{setFeedback('Saved watchlist is unavailable in this browser.');}
  setReady(true);
 },[onSavedChange]);
 const save=(symbols:string[])=>{
  try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(symbols));setSaved(symbols);onSavedChange(symbols);return true;}
  catch{setFeedback('Your browser could not save changes. Check private browsing or storage settings.');return false;}
 };
 async function add(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!ready||busy)return;
  const candidate=canAddSymbol(saved,draft);
  if(!candidate.ok||!candidate.symbol){setFeedback(candidate.reason);return;}
  setBusy(true);setFeedback('');
  try{
   const res=await fetch('/api/watchlist/validate?ticker='+encodeURIComponent(candidate.symbol),{cache:'no-store'});
   const value=await res.json() as Validation;
   if(!res.ok||!value.ok){setFeedback(value.reason||'Ticker unavailable. Try again.');return;}
   if(save([...saved,candidate.symbol])){setDraft('');setFeedback(candidate.symbol+' added for charts and indicators only — Telegram scanner unchanged.');onSelect(candidate.symbol);}
  }catch{setFeedback('Could not validate this ticker. No changes saved.');}
  finally{setBusy(false);}
 }
 function remove(symbol:string){
  if(!save(saved.filter(s=>s!==symbol)))return;
  if(selected===symbol)onSelect('QQQ');
  setFeedback(symbol+' removed from this browser watchlist. Scanner unchanged.');
 }
 return <section className="panel watchManager" aria-label="Manage chart watchlist">
  <div className="paneltop"><div><h2>My Chart Watchlist <span className="watchCount">{CORE_TICKERS.length+saved.length}/{MAX_WATCHLIST}</span></h2>
   <p className="muted">Add US stocks and ETFs without GitHub. Extra tickers are <strong>CHART ONLY</strong> — no Telegram scans or alert changes.</p></div>
   <button type="button" className="watchManageToggle" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'Close':'＋ Manage'}</button></div>
  <div className="watchManagedSymbols" aria-label="Select a saved chart symbol">
   {saved.map(t=><button type="button" key={t} className={'watchSavedChip '+(selected===t?'active':'')} onClick={()=>onSelect(t)} aria-pressed={selected===t}>{t} <small>CHART ONLY</small></button>)}
   {!saved.length&&<span className="watchEmpty">No additional tickers yet. Tap Manage to add ORCL, META, or another active US stock.</span>}
  </div>
  {open&&<div className="watchManageBody">
   <form onSubmit={add} className="watchAddForm"><label htmlFor="watchTickerInput">Add stock symbol</label><div>
     <input id="watchTickerInput" autoComplete="off" maxLength={6} value={draft} onChange={e=>setDraft(e.target.value.toUpperCase())} placeholder="e.g. ORCL" disabled={!ready||busy} aria-describedby="watchNote"/>
     <button type="submit" disabled={!ready||busy||saved.length>=MAX_WATCHLIST-CORE_TICKERS.length}>{busy?'Checking…':'Add stock'}</button></div>
   </form>
   <p id="watchNote" className="watchNote">Saved on this browser only, not synced across devices. The 8 original scanner stocks stay active. Custom tickers display chart-only opening-range levels and indicators, not confirmed alerts.</p>
   {saved.length>0&&<div className="watchRemovalList">{saved.map(t=><div key={t}><strong>{t}</strong><button type="button" onClick={()=>remove(t)} aria-label={'Remove '+t+' from chart watchlist'}>Remove</button></div>)}</div>}
  </div>}
  {feedback&&<p className="watchFeedback" role="status">{feedback}</p>}
 </section>;
}
