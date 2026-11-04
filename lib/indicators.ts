// Research indicators: IEX equity candles only, never an order or alert gate.
// All values are null until the required consecutive, completed candles exist.
export type Candle={time:string;open:number;high:number;low:number;close:number;volume:number;vwap:number};
export type IndicatorRow={time:string;ema9:number|null;ema21:number|null;rsi14:number|null;macd:number|null;macdSignal:number|null;macdHistogram:number|null;atr14:number|null;bbMiddle:number|null;bbUpper:number|null;bbLower:number|null;rvol:number|null};
export type HistoricalVolume={time:string;volume:number}; // Prior sessions only, matching ET slot
const round=(x:number)=>Number(x.toFixed(4));
const safe=(x:number|null)=>x===null||!Number.isFinite(x)?null:round(x);
const et=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23'});
function slot(time:string){const p=et.formatToParts(new Date(time));const v=(k:string)=>p.find(x=>x.type===k)?.value||'';return {date:v('year')+'-'+v('month')+'-'+v('day'),minute:+v('hour')*60+ +v('minute')};}
function ema(arr:number[],n:number):number|null{
 if(arr.length<n)return null;
 let value=arr.slice(0,n).reduce((s,v)=>s+v,0)/n;
 for(let i=n;i<arr.length;i++)value+=(arr[i]-value)*2/(n+1);
 return safe(value);
}
function rollingRsi(bars:Candle[],n=14):number|null{
 if(bars.length<n+1)return null;
 let gain=0,loss=0;
 for(let i=1;i<=n;i++){const d=bars[i].close-bars[i-1].close;gain+=Math.max(0,d);loss+=Math.max(0,-d);}
 gain/=n;loss/=n;
 for(let i=n+1;i<bars.length;i++){
  const d=bars[i].close-bars[i-1].close;
  gain=(gain*(n-1)+Math.max(0,d))/n;loss=(loss*(n-1)+Math.max(0,-d))/n;
 }
 return safe(loss===0?(gain===0?50:100):100-100/(1+gain/loss));
}
function rollingAtr(bars:Candle[],n=14):number|null{
 if(bars.length<n+1)return null;
 const tr=bars.slice(1).map((b,i)=>Math.max(b.high-b.low,Math.abs(b.high-bars[i].close),Math.abs(b.low-bars[i].close)));
 let atr=tr.slice(0,n).reduce((s,v)=>s+v,0)/n;
 for(let i=n;i<tr.length;i++)atr=(atr*(n-1)+tr[i])/n;
 return safe(atr);
}
function macdValues(closes:number[]):{macd:number|null;signal:number|null;histogram:number|null}{
 if(closes.length<26)return {macd:null,signal:null,histogram:null};
 // MACD line is EMA12 - EMA26. Signal EMA9 initializes from nine computed MACD values.
 const macds:number[]=[];
 for(let n=26;n<=closes.length;n++){
  const segment=closes.slice(0,n);
  macds.push(ema(segment,12)!-ema(segment,26)!);
 }
 const macd=safe(macds.at(-1)!);
 const signal=ema(macds,9);
 return {macd,signal,histogram:signal===null||macd===null?null:safe(macd-signal)};
}
function bollinger(closes:number[],n=20){
 if(closes.length<n)return {middle:null,upper:null,lower:null};
 const sample=closes.slice(-n),mean=sample.reduce((a,b)=>a+b,0)/n;
 const sd=Math.sqrt(sample.reduce((s,v)=>s+(v-mean)**2,0)/n);
 return {middle:safe(mean),upper:safe(mean+2*sd),lower:safe(mean-2*sd)};
}
function rvolValue(bar:Candle,intervalMinutes:number,history:HistoricalVolume[]):number|null{
 const target=slot(bar.time),perDate=new Map<string,number>();
 for(const h of history){
  const p=slot(h.time);
  if(p.date>=target.date||!Number.isFinite(h.volume)||h.volume<=0)continue;
  if(intervalMinutes===1){if(p.minute!==target.minute)continue;perDate.set(p.date,h.volume);}
  else if(p.minute>=target.minute&&p.minute<target.minute+5){perDate.set(p.date,(perDate.get(p.date)||0)+h.volume);}
 }
 // Five independent prior sessions are required, each with a matching interval.
 if(perDate.size<5)return null;
 const vols=[...perDate.values()];
 const avg=vols.reduce((a,b)=>a+b,0)/vols.length;
 return avg>0?safe(bar.volume/avg):null;
}
export function calculateIndicators(bars:Candle[],intervalMinutes:1|5,history:HistoricalVolume[]=[]):IndicatorRow[]{
 const ms=intervalMinutes*60000;
 return bars.map((bar,i)=>{
  let start=i;
  while(start>0&&Date.parse(bars[start].time)-Date.parse(bars[start-1].time)===ms)start--;
  const segment=bars.slice(start,i+1),closes=segment.map(b=>b.close);
  const m=macdValues(closes),bb=bollinger(closes);
  return {time:bar.time,ema9:ema(closes,9),ema21:ema(closes,21),
   rsi14:rollingRsi(segment),macd:m.macd,macdSignal:m.signal,macdHistogram:m.histogram,
   atr14:rollingAtr(segment),bbMiddle:bb.middle,bbUpper:bb.upper,bbLower:bb.lower,
   rvol:history.length?rvolValue(bar,intervalMinutes,history):null};
 });
}
export type ResearchScore={score:number|null;grade:'A+ candidate'|'Developing'|'Mixed'|'Insufficient data';direction:'CALL'|'PUT'|'NEUTRAL';passed:string[];cautions:string[];reason:string};
export function scoreSetup(bars:Candle[],rows:IndicatorRow[],stale:boolean):ResearchScore{
 const last=bars.at(-1),v=rows.at(-1);
 const insufficient=(reason:string):ResearchScore=>({score:null,grade:'Insufficient data',direction:'NEUTRAL',passed:[],cautions:[reason],reason:'Research only: no entry recommendation'});
 if(!last||!v)return insufficient('No valid completed candles');
 if(stale)return insufficient('IEX stock price is stale');
 if([v.ema9,v.ema21,v.rsi14,v.macd,v.macdSignal,v.atr14,v.bbUpper,v.bbLower].some(x=>x===null))
  return insufficient('Not enough consecutive IEX candles to warm up indicators (MACD needs at least 34)');
 const call=last.close>last.vwap&&v.ema9!>v.ema21!;
 const put=last.close<last.vwap&&v.ema9!<v.ema21!;
 const direction=call?'CALL':put?'PUT':'NEUTRAL';
 if(direction==='NEUTRAL')return {score:35,grade:'Mixed',direction,passed:[],cautions:['Price and EMA trend disagree'],reason:'Research-only chart context; not a confirmed signal'};
 const sign=direction==='CALL'?1:-1;
 const passed:string[]=[],cautions:string[]=[];
 let points=0;
 const apply=(ok:boolean,weight:number,positive:string,negative:string)=>{
  if(ok){points+=weight;passed.push(positive);}else cautions.push(negative);
 };
 apply((last.close-last.vwap)*sign>0,20,'Price aligned with VWAP','Against VWAP');
 apply((v.ema9!-v.ema21!)*sign>0,20,'EMA 9/21 aligned','EMA trend conflicts');
 apply((v.macd!-v.macdSignal!)*sign>0,20,'MACD momentum agrees','MACD lacks confirmation');
 apply(direction==='CALL'?v.rsi14!>=50&&v.rsi14!<=70:v.rsi14!<=50&&v.rsi14!>=30,15,'RSI supports directional momentum','RSI momentum weak or extended');
 const distance=Math.abs(last.close-v.ema9!);
 apply(distance<=1.25*v.atr14!,15,'Within 1.25 ATR of EMA 9','Entry potentially extended');
 if(v.rvol!==null)apply(v.rvol>=1.1,10,'Time-of-day RVOL ≥ 1.10','RVOL below 1.10');
 else cautions.push('RVOL unavailable: fewer than five comparable historical sessions');
 // Never claim an A+ score from missing comparable RVOL data.
 const score=v.rvol===null?Math.min(points,89):points;
 return {score,grade:score>=90?'A+ candidate':score>=65?'Developing':'Mixed',direction,passed,cautions,
  reason:'Uncalibrated checklist score, not win probability, option entry, or Telegram confirmation'};
}
