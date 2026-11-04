'use client';
import {useEffect,useMemo,useState} from 'react';
type Interval='1m'|'5m';
type Candle={time:string;open:number;high:number;low:number;close:number;volume:number;vwap:number};
type Marker={time:string;direction:'CALL'|'PUT';price:number};
type Data={ticker:string;interval:Interval;asOf:string;lastBarTime:string|null;feed:string;stale:boolean;callAbove:number|null;putBelow:number|null;bars:Candle[];markers:Marker[];warning:string};
const money=(n:number)=>'$'+n.toFixed(2);
const time=(s:string)=>new Date(s).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});
const W=900,H=340,top=20,priceBottom=240,volumeTop=267,volumeBottom=308;
const padLeft=65,padRight=70;
export default function LiveChart({ticker}:{ticker:string}){
 const [interval,setInterval]=useState<Interval>('1m');
 const [windowSize,setWindowSize]=useState(60);
 const [data,setData]=useState<Data|null>(null);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState<number|null>(null);
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const response=await fetch('/api/chart?ticker='+encodeURIComponent(ticker)+'&interval='+interval,{cache:'no-store'});
    if(!response.ok)throw new Error(response.status===503?'Market data temporarily unavailable':'Chart request failed');
    const json=await response.json() as Data;
    if(active){setData(json);setError('');setBusy(false);}
   }catch(e){if(active){setError(e instanceof Error?e.message:'Chart request failed');setBusy(false);}}
  };
  setBusy(true);setData(null);setSelected(null);load();
  const refresh=setInterval(load,60_000);
  return ()=>{active=false;clearInterval(refresh);};
 },[ticker,interval,refreshKey]);
 const visible=useMemo(()=>data?.bars.slice(-windowSize)||[],[data,windowSize]);
 const values=visible.flatMap(b=>[b.low,b.high,b.vwap]);
 if(data?.callAbove!=null)values.push(data.callAbove);
 if(data?.putBelow!=null)values.push(data.putBelow);
 const min=values.length?Math.min(...values):0,max=values.length?Math.max(...values):1;
 const buffer=Math.max((max-min)*.1,max*.0005,.01);
 const low=min-buffer,high=max+buffer;
 const plotWidth=W-padLeft-padRight;
 const step=plotWidth/Math.max(visible.length,1);
 const bodyWidth=Math.max(2,Math.min(14,step*.65));
 const x=(i:number)=>padLeft+step*(i+.5);
 const y=(v:number)=>top+(high-v)/(high-low)*(priceBottom-top);
 const volumeMax=Math.max(1,...visible.map(c=>c.volume));
 const lines=Array.from({length:5},(_,i)=>low+(high-low)*i/4);
 const vwapPath=visible.map((b,i)=>{
  const previous=i?visible[i-1]:null;
  const expected=interval==='1m'?60000:300000;
  return (previous&&Date.parse(b.time)-Date.parse(previous.time)===expected?'L':'M')+x(i).toFixed(1)+' '+y(b.vwap).toFixed(1);
 }).join(' ');
 const active=visible[selected==null?Math.max(0,visible.length-1):Math.min(selected,visible.length-1)];
 return <section className="panel chartPanel" aria-label="Live intraday candlestick chart">
  <div className="paneltop chartTop"><div><h2>{ticker} · Intraday Candles</h2><p className="muted">Alpaca IEX · Completed regular-session bars only · Display refreshes every 60 seconds</p></div>
   <div className="chartControls">
    <label>Timeframe <select aria-label="Chart timeframe" value={interval} onChange={e=>setInterval(e.target.value as Interval)}><option value="1m">1 minute</option><option value="5m">5 minutes</option></select></label>
    <label>Show <select aria-label="Chart history" value={windowSize} onChange={e=>setWindowSize(Number(e.target.value))}><option value={30}>30 bars</option><option value={60}>60 bars</option><option value={120}>120 bars</option></select></label>
    <button type="button" className="chartRefresh" onClick={()=>setRefreshKey(k=>k+1)} disabled={busy}>Refresh</button>
   </div>
  </div>
  <div className="chartInfo">
   <span className="chartKey"><i style={{background:'#49d9ad'}}/> Up candle</span>
   <span className="chartKey"><i style={{background:'#ef8897'}}/> Down candle</span>
   <span className="chartKey"><i style={{background:'#eac76b'}}/> Session VWAP</span>
   <span className="chartKey"><i style={{background:'#42bb90'}}/> CALL ABOVE</span>
   <span className="chartKey"><i style={{background:'#e36c85'}}/> PUT BELOW</span>
   <span className="chartKey">● Recorded confirmations</span>
  </div>
  {error?<div className="chartMessage chartError" role="alert">{error}</div>:
  busy&&!data?<div className="chartMessage">Loading completed market candles…</div>:
  !visible.length?<div className="chartMessage">{data?.warning||'No chart data yet.'}</div>:
  <div className="chartScroll">
   <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${ticker} ${interval} candlestick chart with session VWAP, opening range lines, volume and historical confirmed alert markers`} className="priceChart">
    {lines.map((v,i)=><g key={i}><line x1={padLeft} x2={W-padRight} y1={y(v)} y2={y(v)} stroke="#304155" strokeWidth=".7"/><text x={W-padRight+8} y={y(v)+4} fill="#8a9db5" fontSize="11">{v.toFixed(2)}</text></g>)}
    {data?.callAbove!=null&&<g><line x1={padLeft} x2={W-padRight} y1={y(data.callAbove)} y2={y(data.callAbove)} stroke="#42bb90" strokeDasharray="5 4"/><text x={W-padRight-6} y={y(data.callAbove)-5} textAnchor="end" fill="#42bb90" fontSize="11">CALL {money(data.callAbove)}</text></g>}
    {data?.putBelow!=null&&<g><line x1={padLeft} x2={W-padRight} y1={y(data.putBelow)} y2={y(data.putBelow)} stroke="#e36c85" strokeDasharray="5 4"/><text x={W-padRight-6} y={y(data.putBelow)+13} textAnchor="end" fill="#e36c85" fontSize="11">PUT {money(data.putBelow)}</text></g>}
    {visible.map((b,i)=>{const up=b.close>=b.open,color=up?'#49d9ad':'#ef8897';return <g key={b.time}>
      <line x1={x(i)} x2={x(i)} y1={y(b.high)} y2={y(b.low)} stroke={color} strokeWidth="1.3"/>
      <rect x={x(i)-bodyWidth/2} y={Math.min(y(b.open),y(b.close))} width={bodyWidth} height={Math.max(1.5,Math.abs(y(b.open)-y(b.close)))} fill={color}/>
      <rect x={x(i)-bodyWidth/2} y={volumeBottom-(b.volume/volumeMax)*(volumeBottom-volumeTop)} width={bodyWidth} height={Math.max(1,(b.volume/volumeMax)*(volumeBottom-volumeTop))} fill={color} opacity=".6"/>
      <rect x={x(i)-step/2} y={top} width={step} height={volumeBottom-top} fill="transparent" onMouseEnter={()=>setSelected(i)} onClick={()=>setSelected(i)} />
     </g>})}
    <path d={vwapPath} fill="none" stroke="#eac76b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    {data?.markers.map((m,j)=>{
     const ms=Date.parse(m.time),length=interval==='1m'?60000:300000;
     const index=visible.findIndex((b,i)=>{const bt=Date.parse(b.time);return ms>=bt&&ms<bt+length;});
     if(index<0)return null;
     return <g key={j}><circle cx={x(index)} cy={y(m.price)} r="7" fill={m.direction==='CALL'?'#36d9ac':'#ee8495'} stroke="#0d1621" strokeWidth="2"/><text x={x(index)} y={y(m.price)-11} textAnchor="middle" fontSize="11" fontWeight="700" fill={m.direction==='CALL'?'#36d9ac':'#ee8495'}>{m.direction}</text></g>;
    })}
    {selected!=null&&active&&<line x1={x(Math.min(selected,visible.length-1))} x2={x(Math.min(selected,visible.length-1))} y1={top} y2={volumeBottom} stroke="#dae6f5" strokeOpacity=".55" strokeDasharray="3 4"/>}
    <line x1={padLeft} x2={W-padRight} y1={256} y2={256} stroke="#304155"/>
    <text x="6" y="281" fill="#8193aa" fontSize="10">VOLUME</text>
    {visible.filter((b,i)=>i%Math.max(1,Math.floor(visible.length/7))===0||i===visible.length-1).map(b=><text key={b.time} x={x(visible.indexOf(b))} y={H-12} fill="#8c9eb4" fontSize="11" textAnchor="middle">{time(b.time)}</text>)}
   </svg>
  </div>}
  {active&&<div className="chartReadout" aria-live="polite">
   <strong>{time(active.time)} ET</strong>
   <span>O {money(active.open)}</span><span>H {money(active.high)}</span><span>L {money(active.low)}</span><span>C {money(active.close)}</span>
   <span>VWAP {money(active.vwap)}</span><span>Volume {active.volume.toLocaleString()}</span>
  </div>}
  <div className="chartFooter">
   <span>{data?.stale?'⚠ Stale chart data':'IEX-only feed'} · Last completed candle: {data?.lastBarTime?time(data.lastBarTime)+' ET':'—'}</span>
   <span>{data?.markers.length||0} recorded signal markers · {data?.warning||'Not a live options quote'}</span>
  </div>
 </section>;
}
