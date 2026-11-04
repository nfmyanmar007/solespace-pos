'use client';
import type {IndicatorRow,ResearchScore} from '@/lib/indicators';
const number=(v:number|null,digits=2)=>v===null||!Number.isFinite(v)?'—':v.toFixed(digits);
const money=(v:number|null)=>v===null?'—':'$'+v.toFixed(2);
function Metric({label,value,detail}:{label:string;value:string;detail:string}){
 return <div className="indicatorMetric"><span className="indicatorLabel">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
export default function IndicatorPanel({rows,score,interval,stale}:{rows:IndicatorRow[];score:ResearchScore|null;interval:'1m'|'5m';stale:boolean}){
 const last=rows.at(-1);
 const quality=stale?'STALE IEX DATA':'IEX-ONLY EQUITIES';
 return <section className="indicatorPanel" aria-label="Research technical indicators and setup score">
  <div className="indicatorHeading"><div><h3>Technical Analysis <span className="indicatorMode">{interval}</span></h3>
   <p>Completed candles · {quality} · Indicators do not place trades</p></div></div>
  <div className="indicatorScore">
   <div className="indicatorScoreNumber"><strong>{score?.score==null?'—':score.score+'/100'}</strong><span>{score?.grade||'Insufficient data'}</span></div>
   <div className="indicatorScoreText"><b>Research-only A+ setup score</b><p>Uncalibrated checklist, NOT win probability or a confirmed CALL/PUT entry.</p><span>{score?.direction||'NEUTRAL'} context</span></div>
  </div>
  <div className="indicatorMetrics">
   <Metric label="EMA 9 / 21" value={money(last?.ema9??null)+' / '+money(last?.ema21??null)} detail="Short-term trend"/>
   <Metric label="RSI 14" value={number(last?.rsi14??null)} detail="Momentum, 0–100"/>
   <Metric label="MACD 12/26/9" value={number(last?.macd??null,3)} detail={'Signal '+number(last?.macdSignal??null,3)+' · Hist '+number(last?.macdHistogram??null,3)}/>
   <Metric label="ATR 14" value={money(last?.atr14??null)} detail="Average price range"/>
   <Metric label="Bollinger 20/2" value={money(last?.bbLower??null)+' – '+money(last?.bbUpper??null)} detail={'Middle '+money(last?.bbMiddle??null)}/>
   <Metric label="Time-of-day RVOL" value={last?.rvol===null||last?.rvol===undefined?'Not available':number(last.rvol)+'×'} detail="Needs 5 comparable prior sessions"/>
  </div>
  <div className="indicatorDetails">
   <div><strong>What supports the setup</strong>{score?.passed.length?<ul>{score.passed.map(x=><li key={x}>{x}</li>)}</ul>:<p>Not enough agreement to establish a research candidate.</p>}</div>
   <div><strong>Warnings / missing data</strong>{score?.cautions.length?<ul>{score.cautions.map(x=><li key={x}>{x}</li>)}</ul>:<p>No additional warnings.</p>}</div>
  </div>
  <p className="indicatorDisclaimer">RSI/MACD/ATR/Bands require consecutive bars. Missing IEX minutes reset their warmup. The score cannot override the independent scanner’s two-candle confirmation, VWAP, freshness or volume requirements.</p>
 </section>;
}
