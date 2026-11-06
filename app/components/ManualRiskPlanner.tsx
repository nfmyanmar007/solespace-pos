'use client';
import {useMemo,useState} from 'react';
import {evaluateManualPosition,type PositionInput} from '@/lib/manual-risk';

type Fields={ticker:string;side:'CALL'|'PUT';strike:string;expiration:string;quantity:string;multiplier:string;entryPremium:string;stopPremium:string;targetPremium:string;currentPremium:string};
const initial:Fields={ticker:'QQQ',side:'CALL',strike:'',expiration:'',quantity:'1',multiplier:'100',entryPremium:'',stopPremium:'',targetPremium:'',currentPremium:''};
const dollars=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export default function ManualRiskPlanner(){
 const [fields,setFields]=useState<Fields>(initial);
 const [enabled,setEnabled]=useState(false);
 const change=(key:keyof Fields,value:string)=>{setFields(p=>({...p,[key]:value}));setEnabled(false);};
 const result=useMemo(()=>{
  if(!enabled)return null;
  try{
   const input:PositionInput={ticker:fields.ticker.trim().toUpperCase(),side:fields.side,
    strike:Number(fields.strike),expiration:fields.expiration,quantity:Number(fields.quantity),
    multiplier:Number(fields.multiplier),entryPremium:Number(fields.entryPremium),
    stopPremium:Number(fields.stopPremium),targetPremium:Number(fields.targetPremium),
    currentPremium:fields.currentPremium.trim()===''?null:Number(fields.currentPremium)};
   return {value:evaluateManualPosition(input),error:''};
  }catch(e){return {value:null,error:e instanceof Error?e.message:'Invalid input.'};}
 },[enabled,fields]);
 const numberInput=(key:keyof Fields,label:string,step='0.01')=><label className="manualRiskField">{label}
  <input type="number" min="0" step={step} value={fields[key]} onChange={e=>change(key,e.target.value)}
    autoComplete="off" inputMode="decimal" /></label>;
 return <section className="panel manualRiskPanel" aria-label="V3.4 manual options risk worksheet">
  <div className="paneltop"><div><h2>V3.4 · Manual Options Risk Worksheet</h2><p className="muted">Enter your own position and quote. Nothing is imported from Robinhood, saved, or sent to a server.</p></div></div>
  <form className="manualRiskForm" autoComplete="off" onSubmit={e=>{e.preventDefault();setEnabled(true);}}>
   <div className="manualRiskFields">
    <label className="manualRiskField">Underlying ticker<input maxLength={5} value={fields.ticker} onChange={e=>change('ticker',e.target.value.toUpperCase())} autoComplete="off"/></label>
    <label className="manualRiskField">Contract direction<select value={fields.side} onChange={e=>change('side',e.target.value as Fields['side'])}><option value="CALL">CALL (long)</option><option value="PUT">PUT (long)</option></select></label>
    {numberInput('strike','Strike price')}
    <label className="manualRiskField">Expiration date<input type="date" value={fields.expiration} onChange={e=>change('expiration',e.target.value)} /></label>
    {numberInput('quantity','Contracts','1')}
    {numberInput('multiplier','Shares per contract (verify)','1')}
    {numberInput('entryPremium','Paid premium / share')}
    {numberInput('stopPremium','Planned stop premium / share')}
    {numberInput('targetPremium','Profit target premium / share')}
    {numberInput('currentPremium','Current premium / share (optional)')}
   </div>
   <div className="manualRiskActions"><button className="refresh" type="submit">Calculate risk</button>
    <button className="manualRiskClear" type="button" onClick={()=>{setFields(initial);setEnabled(false);}}>Clear all</button></div>
  </form>
  {result?.error&&<p className="manualRiskError" role="alert">{result.error}</p>}
  {result?.value&&<div className="manualRiskResults" aria-live="polite">
    <div className="manualRiskMetrics">
     <div><span>Premium paid / total debit</span><strong>{dollars(result.value.entryCost)}</strong></div>
     <div><span>Planned loss at stop*</span><strong>{dollars(result.value.plannedLoss)}</strong></div>
     <div><span>Planned gain at target*</span><strong>{dollars(result.value.plannedGain)}</strong></div>
     <div><span>Planned reward : risk</span><strong>{result.value.riskReward.toFixed(2)} : 1</strong></div>
     <div><span>At-expiry break-even (ignores fees)</span><strong>{dollars(result.value.breakEvenAtExpiry)}</strong></div>
     <div><span>Estimated P/L at manually entered premium</span><strong>{result.value.pnl===null?'No quote entered':dollars(result.value.pnl)+' ('+result.value.pnlPct?.toFixed(2)+'%)'}</strong></div>
    </div>
    <p className="manualRiskStatus"><strong>{result.value.review.replaceAll('_',' ')}</strong> · {result.value.review==='AWAITING_QUOTE'?'Add a current contract premium to compare against the plan.':result.value.review==='BELOW_STOP_REVIEW'?'Manual premium is at/below planned stop; review your actual quotes and liquidity.':result.value.review==='AT_TARGET_REVIEW'?'Manual premium is at/above planned target; review your actual quotes and liquidity.':'Manual premium is between planned levels; this does not mean HOLD.'}</p>
   </div>}
  <p className="manualRiskDisclaimer">*Illustrative premium-level math only, before fees, taxes, spreads, slippage and contract adjustments. Premiums are dollars per underlying share; standard equity options generally use 100 shares, but adjusted contracts differ. Planned stop losses are <strong>not guaranteed</strong>; a long option can lose the entire debit. Current premium is manual and may be stale. Break-even is at expiration, not an intraday exit target. No execution, automatic alerts, or brokerage access.</p>
 </section>;
}
