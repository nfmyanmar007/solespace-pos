'use client';
import {statusDetails} from '@/lib/dashboard-mobile';
import {isCore} from '@/lib/watchlist';
type Signal={ticker:string;status:string;callAbove:number|null;putBelow:number|null;price:number|null;vwap:number|null;volumeRatio:number|null;bias:string;reason:string;timestamp:string|null;fresh:boolean;feed:string};
const money=(v:number|null)=>v===null?'—':'$'+v.toFixed(2);
export default function MobileWatchlist({signals,selected,onSelect}:{signals:Signal[];selected:string;onSelect:(ticker:string)=>void}){
 return <div className="mobileCards" aria-label="Mobile stock trigger cards">
  {signals.map(s=>{
   const detail=statusDetails(s.status),scanner=isCore(s.ticker);
   const label=scanner?detail.label:s.status.startsWith('RESEARCH')?s.status:detail.label;
   const description=scanner?detail.description:s.status.startsWith('RESEARCH')?'Research setup passed current candle checks; Telegram alerts are NOT enabled.':detail.description+' · No Telegram alerts';
   return <button key={s.ticker} type="button" className={'mobileStockCard '+(selected===s.ticker?'isSelected':'')}
    onClick={()=>onSelect(s.ticker)} aria-pressed={selected===s.ticker} aria-label={s.ticker+', '+label+', '+(scanner?'Telegram scanner enabled':'research only, no Telegram alerts')+', stock '+money(s.price)+'. Open chart'}>
    <span className="mobileCardTop"><strong>{s.ticker}<small className="mobileStockScope">{scanner?'SCANNER':'RESEARCH ONLY'}</small></strong><span className={'mobileSignalBadge '+(scanner?detail.kind:'watch')}>{label}</span></span>
    <span className="mobileLastPrice">{money(s.price)}</span>
    <span className="mobileCardLevels"><span><small>CALL ABOVE</small><b className="positive">{money(s.callAbove)}</b></span><span><small>PUT BELOW</small><b className="negative">{money(s.putBelow)}</b></span></span>
    <span className="mobileCardFoot"><span>VWAP {money(s.vwap)}</span><span>Vol {s.volumeRatio==null?'—':s.volumeRatio.toFixed(2)+'×'}</span></span>
    <span className="mobileCardReason">{description}</span>
   </button>;
  })}
 </div>;
}
