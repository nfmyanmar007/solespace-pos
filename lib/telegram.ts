export type AlertMessage={ticker:string;direction:'CALL'|'PUT';observed:number;trigger:number;vwap:number|null;volumeRatio:number|null;barTimestamp:string;reason:string;feed:string};
export function formatAlert(a:AlertMessage){
 const time=new Date(a.barTimestamp).toLocaleString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:true,month:'short',day:'numeric'});
 return [
  'OPTIONTRIGGER PRO — CONFIRMED '+a.direction,
  a.ticker+' | '+time+' ET',
  'Stock price: $'+a.observed.toFixed(2),
  (a.direction==='CALL'?'CALL ABOVE: $':'PUT BELOW: $')+a.trigger.toFixed(2),
  'VWAP: '+(a.vwap==null?'Unavailable':'$'+a.vwap.toFixed(2)),
  'Volume ratio: '+(a.volumeRatio==null?'Unavailable':a.volumeRatio.toFixed(2)+'x'),
  'Validation: '+a.reason,
  'Feed: '+a.feed+' only — not consolidated, not an options bid/ask quote.',
  'This is a monitoring signal, NOT an order or guaranteed profitable entry.',
  'Check spread, trend, news, and price in your broker before deciding.'
 ].join('\n');
}
export async function sendTelegram(text:string){
 const token=process.env.TELEGRAM_BOT_TOKEN,chatId=process.env.TELEGRAM_CHAT_ID;
 if(!token||!chatId)throw new Error('Telegram credentials missing');
 const res=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true}),
   signal:AbortSignal.timeout(12000),cache:'no-store'
 });
 const result=await res.json().catch(()=>({ok:false}));
 if(!res.ok||!result.ok)throw new Error('Telegram failed ('+res.status+'): '+String(result.description||'unknown error').slice(0,180));
}
