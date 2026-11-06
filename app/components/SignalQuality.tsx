'use client';
type Band={minutes:5|10|15;eligible:number;measured:number;favorable:number;unfavorable:number;flat:number;missingOrInvalid:number;favorableRatePct:number|null;wilson95LowPct:number|null;wilson95HighPct:number|null;meanDirectionalPct:number|null};
type Group={key:string;signals:number;bands:Band[]};
type Dimension={name:string;available:number;unavailable:number;groups:Group[]};
export type QualityData={
 sampleSize:number;coveragePartial:boolean;overall:Group;dimensions:Dimension[];
 eventDays:{status:'UNAVAILABLE';reason:string};note:string;journalUnavailable:boolean;journalTruncated:boolean
};
const percent=(n:number|null)=>n===null?'—':n.toFixed(1)+'%';
const move=(n:number|null)=>n===null?'—':(n>0?'+':'')+n.toFixed(2)+'%';
function BandView({band}:{band:Band}){
 return <div className="qualityBand"><strong>+{band.minutes}m · {percent(band.favorableRatePct)}</strong>
  <span>{band.favorable}/{band.measured} favorable · {band.missingOrInvalid} unmeasured of {band.eligible}</span>
  <small>95% Wilson interval: {band.measured?percent(band.wilson95LowPct)+'–'+percent(band.wilson95HighPct):'insufficient data'} · Mean direction: {move(band.meanDirectionalPct)}</small>
 </div>;
}
export default function SignalQuality({data}:{data:QualityData}){
 const overall=data.overall.bands;
 return <section className="qualitySection" aria-label="V3.2 signal quality intelligence">
  <div className="qualityHeading"><h3>V3.2 · Signal Quality Intelligence</h3>
   <p className="muted">Descriptive research, not options win rates. Each comparison shows verified sample sizes and missing outcomes.</p></div>
  {(data.coveragePartial||data.journalUnavailable||data.journalTruncated)&&<p className="historyWarning" role="status">Partial coverage: interpret all rates and group comparisons cautiously. Missing source records are not counted as losses.</p>}
  <div className="qualityBands">{overall.map(b=><BandView key={b.minutes} band={b}/>)}</div>
  <div className="qualityDimensions">{data.dimensions.map(d=><div className="qualityDimension" key={d.name}>
   <h4>{d.name}</h4><p className="historyMeta">Metadata: {d.available}/{data.sampleSize} eligible · {d.unavailable} unavailable</p>
   <div className="monitorTableWrap"><table className="monitorTable"><thead><tr><th>Category</th><th>Signals</th><th>+5m favorable</th><th>+10m favorable</th><th>+15m favorable</th><th>+15m missing</th><th>95% interval (+15m)</th></tr></thead><tbody>
   {d.groups.map(g=>{const pick=(m:5|10|15)=>g.bands.find(b=>b.minutes===m)!;const b=pick(15);return <tr key={g.key}><td><strong>{g.key}</strong></td><td>{g.signals}</td>
    {([5,10,15] as const).map(m=><td key={m}>{percent(pick(m).favorableRatePct)} <small>({pick(m).favorable}/{pick(m).measured})</small></td>)}
    <td>{b.missingOrInvalid}/{b.eligible}</td>
    <td>{b.measured?percent(b.wilson95LowPct)+'–'+percent(b.wilson95HighPct):'—'}</td></tr>})}
   {!d.groups.length&&<tr><td colSpan={7}>No verified eligible records.</td></tr>}
   </tbody></table></div>
  </div>)}</div>
  <div className="qualityEvents"><h4>Economic & earnings event-day context</h4>
   <p>{data.eventDays.reason}</p><small>Event comparisons will remain unavailable until a verified dated event source can be matched to each ET trading session and, for earnings, the specific ticker.</small>
  </div>
  <p className="monitorFootnote">{data.note}</p>
 </section>;
}
