'use client';
import {useEffect,useState,useCallback} from 'react';
import LiveChart from './components/LiveChart';
import MobileWatchlist from './components/MobileWatchlist';
import AlertHistory from './components/AlertHistory';
import ScannerMonitor from './components/ScannerMonitor';
import WatchlistManager from './components/WatchlistManager';
import {CORE_TICKERS} from '@/lib/watchlist';
import {mergeUnifiedSignals,type DisplaySignal} from '@/lib/unified-watchlist';
import {DASHBOARD_TABS,type DashboardTab} from '@/lib/dashboard-tabs';
type Signal={ticker:string;status:string;callAbove:number|null;putBelow:number|null;price:number|null;vwap:number|null;volumeRatio:number|null;bias:string;reason:string;timestamp:string|null;fresh:boolean;feed:string};
type Report={mode:string;marketState:string;asOf:string;signals:Signal[]};
const tickers=['ALL','QQQ','SPY','TSLA','NVDA','AMD','AAPL','MSFT','GOOGL'];
const money=(v:number|null)=>v==null?'—':'$'+v.toFixed(2);
export default function Home(){
 const [activeTab,setActiveTab]=useState<DashboardTab>('watchlist');
 const [alertsRevision,setAlertsRevision]=useState(0);
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[ticker,setTicker]=useState('ALL'),[chartTicker,setChartTicker]=useState('QQQ'),[custom,setCustom]=useState<string[]>([]),[customRows,setCustomRows]=useState<DisplaySignal[]>([]),[customError,setCustomError]=useState(''),[busy,setBusy]=useState(false);
 const onSavedChange=useCallback((stocks:string[])=>setCustom(stocks),[]);
 const refresh=async()=>{setBusy(true);try{const res=await fetch('/api/triggers',{cache:'no-store'});if(!res.ok)throw new Error('Could not load triggers');setReport(await res.json());setError('')}catch(e){setError(String(e))}finally{setBusy(false)}};
 useEffect(()=>{refresh();const id=setInterval(refresh,60000);return()=>clearInterval(id)},[]);
 useEffect(()=>{
  if(!custom.length){setCustomRows([]);setCustomError('');return;}
  let active=true;
  const update=async()=>{
   try{
    const response=await fetch('/api/watchlist/signals?symbols='+encodeURIComponent(custom.join(',')),{cache:'no-store'});
    if(!response.ok)throw new Error('Additional stock data unavailable');
    const json=await response.json() as {signals:DisplaySignal[]};
    if(active){setCustomRows(json.signals);setCustomError('');}
   }catch{if(active){setCustomError('Custom ticker prices temporarily unavailable — scanner stocks unaffected.');setCustomRows([]);}}
  };
  setCustomRows([]);update();const id=window.setInterval(update,60_000);
  return ()=>{active=false;window.clearInterval(id);};
 },[custom,alertsRevision]);
 const combined=mergeUnifiedSignals(report?.signals||[],customRows);
 const rows=combined.filter(s=>ticker==='ALL'||s.ticker===ticker);
 const confirmed=report?.signals.filter(s=>s.status.startsWith('CONFIRMED')).length||0;
 const selectedCustomRow=customRows.find(s=>s.ticker===chartTicker);
 const openChart=useCallback((symbol:string)=>{setChartTicker(symbol);setActiveTab('chart');},[]);
 return <main className="shell">
  <aside className="sidebar"><div className="brand"><div className="brandIcon">⌁</div><div><strong>OPTIONTRIGGER</strong><small>PRO / SIGNAL TERMINAL</small></div></div><div className="navlabel">WORKSPACE</div>{DASHBOARD_TABS.map(t=><button key={t.key} className={'navitem dashboardSideTab '+(activeTab===t.key?'selected':'')} onClick={()=>setActiveTab(t.key)} type="button" aria-current={activeTab===t.key?'page':undefined}>{t.icon} <span>{t.shortLabel}</span></button>)}<div className="navlabel second">WATCHLIST</div>{tickers.slice(1).map(t=><button className={'watch '+(ticker===t?'active':'')} key={t} onClick={()=>{setTicker(t);openChart(t)}}><span className="watchDot"/> {t} <span className="chev">›</span></button>)}<div className="sidefoot"><strong>Research mode</strong><p>Signals do not place trades. All levels require independent verification.</p></div></aside>
  <section className="content"><header className="topbar"><div><span className="crumb">WORKSPACE /</span> DAILY DASHBOARD</div><div className="topright"><span className="liveDot"/> {report?.mode==='IEX LIVE'?'IEX DATA':'DEMO MODE'} <span className="dividerV"/> ET MARKET</div></header>
  <div className="mainInner"><div className="heading"><div><p className="eyebrow">TRADING INTELLIGENCE / V2.7</p><h1>Daily Trigger Dashboard</h1><p className="muted">Premarket levels · Opening range · VWAP confirmation</p></div><button className="refresh" onClick={refresh} disabled={busy}>{busy?'Refreshing…':'↻  Refresh data'}</button></div>
  {error&&<div className="notice error">{error}</div>}
  <div className="notice"><strong>{report?.mode==='IEX LIVE'?'IEX EQUITY FEED':'ILLUSTRATIVE DEMO'}</strong><span>{report?.mode==='IEX LIVE'?'Premarket highs/lows are provisional and may be sparse or stale on IEX. No consolidated exchange feed, options quotes, or automatic execution.':'This dashboard displays example values until Alpaca keys are configured. Do not trade from demo levels.'}</span></div>
  <nav className="dashboardTabs" aria-label="Dashboard sections">{DASHBOARD_TABS.map(t=><button key={t.key} type="button" aria-current={activeTab===t.key?'page':undefined} aria-controls={'dashboard-'+t.key} className={'dashboardTab '+(activeTab===t.key?'active':'')} onClick={()=>setActiveTab(t.key)}><span className="dashboardTabIcon">{t.icon}</span>{t.label}</button>)}</nav>
  {activeTab==='watchlist'&&<section id="dashboard-watchlist" aria-label="Unified watchlist" className="dashboardTabContent">
  <div className="stats"><div className="stat"><div className="statlabel">MARKET SESSION</div><strong>{report?.marketState||'LOADING'}</strong><span>New York / Eastern Time</span></div><div className="stat"><div className="statlabel">CURRENT CONFIRMATIONS</div><strong className="green">{confirmed.toString().padStart(2,'0')}</strong><span>Live conditions now · not total daily alerts</span></div><div className="stat"><div className="statlabel">TRACKED TICKERS</div><strong>{CORE_TICKERS.length+custom.length}</strong><span>8 core scanner stocks · {custom.length} custom stocks (up to 4 optional alerts)</span></div><div className="stat"><div className="statlabel">LAST DATA REQUEST</div><strong className="time">{report?new Date(report.asOf).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'}</strong><span>America/New_York</span></div></div>
  <div className="panel"><div className="paneltop"><div><h2>Unified Live Trigger Watchlist</h2><p className="muted">All stocks use the same IEX levels and evaluation format. Custom stocks start as RESEARCH ONLY; owner-approved opt-in stocks can receive Telegram confirmations. Premarket levels are provisional; opening-range levels begin after 9:35 ET.</p></div><div className="filter"><select aria-label="Filter ticker" value={ticker} onChange={e=>setTicker(e.target.value)}>{[...tickers,...custom].map(x=><option key={x} value={x}>{x==='ALL'?'All tickers':x}</option>)}</select></div></div>
  {customError&&<p className="watchFeedback" role="status">{customError}</p>}
  <MobileWatchlist signals={combined.filter(s=>ticker==='ALL'||s.ticker===ticker)} selected={chartTicker} onSelect={openChart}/>
  <div className="tableScroll"><table><thead><tr><th>TICKER</th><th>LAST PRICE</th><th>CALL ABOVE</th><th>PUT BELOW</th><th>VWAP</th><th>VOLUME</th><th>STATUS</th></tr></thead><tbody>{rows.map(s=><tr key={s.ticker}><td><div className="symbol">{s.ticker}<small>{s.scannerEnabled?'SCANNER · ':'RESEARCH ONLY · '}{s.bias}</small></div></td><td className="number">{money(s.price)}</td><td className="number positive">{money(s.callAbove)}</td><td className="number negative">{money(s.putBelow)}</td><td className="number">{money(s.vwap)}</td><td className="number">{s.volumeRatio==null?'—':s.volumeRatio+'×'}</td><td><span className={'pill '+(s.scannerEnabled&&s.status.startsWith('CONFIRMED')?'good':s.status.startsWith('RESEARCH')||s.status==='READY'||s.status==='PRELIMINARY'?'ready':s.status==='STALE'||s.status==='NO TRADE'||s.status==='NO DATA'?'bad':'neutral')}>{s.status}</span></td></tr>)}{!rows.length&&<tr><td colSpan={7}>Loading watchlist…</td></tr>}</tbody></table></div>
  <WatchlistManager selected={chartTicker} onSelect={openChart} onSavedChange={onSavedChange} onAlertsChange={()=>setAlertsRevision(n=>n+1)}/>
  </div>
  </section>}
  {activeTab==='chart'&&<section id="dashboard-chart" aria-label="Charts and technical analysis" className="dashboardTabContent">
  <div className="paneltop chartSectionHeading"><div><h2>Charts & Technical Analysis</h2><p className="muted">Choose any scanner or research-only symbol. Charts show completed IEX candles and optional technical studies.</p></div></div>
  <div className="quickTickerWrap" aria-label="Quick chart ticker selection">
    <span className="quickTickerLabel">CHART SYMBOL</span>
    <div className="quickTickerRow">{[...tickers.slice(1),...custom].map(t=><button type="button" key={t} className={'quickTicker '+(chartTicker===t?'isActive':'')} aria-pressed={chartTicker===t} onClick={()=>setChartTicker(t)}>{t}</button>)}</div>
   </div>
  {!tickers.includes(chartTicker)&&<div className="notice chartOnlyNotice"><strong>{selectedCustomRow?.scannerEnabled?'CUSTOM SCANNER':'RESEARCH ONLY'} · {chartTicker}</strong><span>Opening-range levels and indicators use the same format. {selectedCustomRow?.scannerEnabled?'Telegram scanner enabled for this stock.':'Telegram monitoring is off until enabled by the owner.'}</span></div>}
  <LiveChart ticker={chartTicker}/>
  </section>}
  {activeTab==='alerts'&&<section id="dashboard-alerts" aria-label="Telegram alert history" className="dashboardTabContent">
  <AlertHistory onSelectTicker={openChart}/>
  <div className="notice" style={{marginTop:20,background:'#102925',borderColor:'#285345',color:'#b4e8d5',alignItems:'flex-start'}}>
    <strong style={{color:'#55e3b5'}}>AUTOMATED ALERTS</strong>
    <span>Telegram alert setup is available in this release. The active Supabase scheduler is configured for checks every 2 minutes on weekdays; actual timing may vary. Exchange holidays and early closes are checked from the Alpaca calendar. Calendar or data failures prevent confirmation. Only completed, fresh, confirmed CALL/PUT signals during regular hours qualify. One alert per ticker and direction per NY trading day. Premarket preliminary levels never alert. The app cannot currently confirm options bid/ask or contract prices.</span>
  </div>
  </section>}
  {activeTab==='rules'&&<section id="dashboard-rules" aria-label="Scanner rules and risk notes" className="dashboardTabContent">
  <div className="lower"><div className="panel detail"><h2>Confirmation checklist</h2><p className="muted">All conditions must pass before a signal is marked confirmed.</p><div className="checks">{['Complete 9:30–9:35 opening range','Two completed, consecutive 1-minute candle closes','Price direction aligned with VWAP','Prior 5-minute trend alignment','Volume ratio ≥ 1.10×','Fresh IEX bars; no extended entry'].map((x,i)=><div className="check" key={x}><span className="checknum">{String(i+1).padStart(2,'0')}</span>{x}<span className="checkright">REQUIRED</span></div>)}</div></div><div className="panel detail"><h2>Signal explanation</h2><p className="muted">{ticker==='ALL'?'Select a ticker to inspect its latest scanner or research-only status.':'Latest evaluated setup for '+ticker}</p><div className="explanation">{ticker==='ALL'?'Use the ticker filter or choose a watchlist symbol to inspect detailed signal conditions.':rows[0]?.reason||'No data yet'}</div><div className="exfoot"><span>Last candle</span><strong>{rows[0]?.timestamp?new Date(rows[0].timestamp).toLocaleString('en-US',{timeZone:'America/New_York'}):'—'}</strong></div></div></div>
  </section>}
  {activeTab==='health'&&<section id="dashboard-health" aria-label="Scanner and Telegram monitoring" className="dashboardTabContent">
  <ScannerMonitor/>
  </section>}
  <footer>OPTIONTRIGGER PRO · RESEARCH / PAPER EVALUATION ONLY · NOT INVESTMENT ADVICE</footer></div></section></main>
}
