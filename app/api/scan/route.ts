import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual,createHash} from 'node:crypto';
import {getReport} from '@/lib/report';
import {sendTelegram,formatAlert} from '@/lib/telegram';
import {getEnabledCustomAlerts,isEligibleConfirmation} from '@/lib/custom-alerts';
import {inspectCustomTickers,skippedCustomTickers,type CustomCheck} from '@/lib/scanner-diagnostics';
import {fetchTradingSession} from '@/lib/market-calendar';
export const dynamic='force-dynamic';
export const maxDuration=60;
const safeEq=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
const nyDay=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export async function POST(req:NextRequest){
 const secret=process.env.SCAN_SECRET;
 if(!secret||secret.length<32||!safeEq(req.headers.get('authorization')||'','Bearer '+secret))
  return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.ALPACA_API_KEY||!process.env.ALPACA_API_SECRET||!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.TELEGRAM_BOT_TOKEN||!process.env.TELEGRAM_CHAT_ID)
  return NextResponse.json({error:'Configure Alpaca, Supabase, and Telegram environment variables before enabling alerts'},{status:503});
 const report=await getReport(),now=new Date();
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 // Only confirmed, fresh, same-session records are candidates. Never alert on demo or premarket levels.
 const confirmed=report.mode==='IEX LIVE'&&report.marketState==='REGULAR SESSION'
   ?report.signals.filter(s=>isEligibleConfirmation(s,now))
   :[];
 // Diagnostic rows are best-effort and never affect confirmation, Telegram or the core 8.
 let diagnosticChecks:CustomCheck[]=[];
 if(report.mode==='IEX LIVE'&&report.marketState==='REGULAR SESSION'){
  try{
   const enabled=await getEnabledCustomAlerts();
   if(enabled.length){
    const session=await fetchTradingSession(now);
    if(session?.isTradingDay&&session.source==='ALPACA'){
     const result=await inspectCustomTickers(enabled,now,session);
     confirmed.push(...result.eligible);
     diagnosticChecks=result.checks;
    }else diagnosticChecks=skippedCustomTickers(enabled);
   }
  }catch{console.error('Custom alert scan unavailable; core scanner continues');}
 }
 if(diagnosticChecks.length){
  try{
   const {error}=await db.from('custom_scan_diagnostics').insert(diagnosticChecks.map(check=>({...check,scan_at:now.toISOString()})));
   if(error)console.error('Custom diagnostic logging unavailable',error.code);
  }catch{console.error('Custom diagnostic logging unavailable');}
 }
 const {error:logError}=await db.from('scan_runs').insert({mode:report.mode,market_state:report.marketState,signal_count:report.signals.length,report});
 if(logError)return NextResponse.json({error:'Database missing scan_runs; apply db/schema.sql'},{status:503});
 const day=nyDay(now);
 // This table is populated after db/v2-phase1-delivery-events.sql is applied.
 // Audit problems never trigger duplicate Telegram attempts.
 const audit=async(alertId:number,ticker:string,direction:'CALL'|'PUT',eventType:string,detail:string|null=null)=>{
  const {error}=await db.from('alert_delivery_events').insert({alert_id:alertId,ticker,direction,event_type:eventType,detail});
  if(error)console.error('Delivery audit insertion failed',error.code);
 };
 let sent=0,duplicate=0,failed=0;
 for(const s of confirmed){
  const direction=s.status==='CONFIRMED CALL'?'CALL':'PUT';
  const row={session_date:day,ticker:s.ticker,direction,bar_timestamp:s.timestamp,
    price:s.price,trigger_price:direction==='CALL'?s.callAbove:s.putBelow,status:'pending'};
  // Unique (day, ticker, direction) makes a scanner retry nonduplicating.
  // Claim BEFORE sending to prevent parallel requests from sending the same signal twice.
  const claimed=await db.from('signal_alerts').insert(row).select('id').single();
  if(claimed.error?.code==='23505'){duplicate++;continue;}
  if(claimed.error)return NextResponse.json({error:'Database missing signal_alerts; apply db/alerts-migration.sql',detail:claimed.error.message},{status:503});
  const id=claimed.data.id as number;
  await audit(id,s.ticker,direction,'claimed');
  const signalRow={session_date:day,ticker:s.ticker,direction,bar_timestamp:s.timestamp,observed_price:s.price,
    trigger_price:direction==='CALL'?s.callAbove:s.putBelow,vwap:s.vwap,volume_ratio:s.volumeRatio,reason:s.reason,feed:s.feed};
  // Journal is separate from delivery; journal failures do not generate repeat Telegram messages.
  const journal=await db.from('signal_events').upsert(signalRow,{onConflict:'session_date,ticker,direction,bar_timestamp',ignoreDuplicates:true});
  if(journal.error)await audit(id,s.ticker,direction,'journal_failed',journal.error.code);
  try{
   const messageId=await sendTelegram(formatAlert({ticker:s.ticker,direction,observed:s.price!,trigger:direction==='CALL'?s.callAbove!:s.putBelow!,
     vwap:s.vwap,volumeRatio:s.volumeRatio,barTimestamp:s.timestamp!,reason:s.reason,feed:s.feed}));
   const {error}=await db.from('signal_alerts').update({status:'sent',sent_at:new Date().toISOString(),error_message:null}).eq('id',id);
   if(error)throw new Error('Message accepted but database acknowledgment failed: delivery uncertain');
   await audit(id,s.ticker,direction,'sent',messageId==null?'Telegram accepted message':'Telegram message id '+messageId);
   sent++;
  }catch(error){
   failed++;
   const message=error instanceof Error?error.message:'Unknown delivery failure';
   await db.from('signal_alerts').update({status:'failed',error_message:message.slice(0,300)}).eq('id',id);
   await audit(id,s.ticker,direction,'failed',message.slice(0,240));
  }
 }
 return NextResponse.json({ok:failed===0,asOf:report.asOf,eligible:confirmed.length,sent,duplicate,failed,
  note: 'At most one alert per ticker/direction/day; optional custom monitoring uses identical confirmations. Failed delivery requires manual intervention.'},
  {status:failed?502:200});
}
