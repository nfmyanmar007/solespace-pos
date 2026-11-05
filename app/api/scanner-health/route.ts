import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {classifyScannerHealth,summarizeDeliveryStatus,type RunRecord,type DeliveryRecord} from '@/lib/scanner-health';
import {sessionGapSummary,deliveryIncidents,customDiagnosticSummary,type CustomRow} from '@/lib/reliability-v29';
import {fetchTradingSession,sessionState} from '@/lib/market-calendar';
import {ownerAuthenticated} from '@/lib/owner-security';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store, max-age=0'};
export async function GET(req:NextRequest){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Monitoring unavailable'},{status:503,headers:noStore});
 const now=new Date();
 try{
  const db=createClient(url,key,{auth:{persistSession:false}});
  const cutoff=new Date(now.getTime()-86400000).toISOString();
  // 240 runs cover a complete 2-minute regular session, plus premarket records;
  // sessionGapSummary excludes non-regular-session timestamps.
  const [runs,alerts,events,calendar,authorized]=await Promise.all([
   db.from('scan_runs').select('created_at,mode,market_state,signal_count').gte('created_at',cutoff).order('created_at',{ascending:false}).limit(450),
   db.from('signal_alerts').select('ticker,direction,status,created_at').gte('created_at',cutoff).order('created_at',{ascending:false}).limit(300),
   db.from('alert_delivery_events').select('created_at,event_type').gte('created_at',cutoff).order('created_at',{ascending:false}).limit(300),
   fetchTradingSession(now),
   ownerAuthenticated(req)
  ]);
  if(runs.error||alerts.error||events.error)throw Error('Monitoring read failed');
  const list=(runs.data||[]) as RunRecord[],marketState=sessionState(now,calendar);
  const health=classifyScannerHealth(now,list,marketState);
  const deliveries=summarizeDeliveryStatus(alerts.data||[],(events.data||[]) as DeliveryRecord[],now);
  const gaps=sessionGapSummary(now,list,calendar);
  const telegram=deliveryIncidents(now,alerts.data||[],events.data||[]);
  // Owner-only custom subscriptions and per-ticker diagnostics. Do not leak symbol
  // names or results on unauthenticated public Health tab requests.
  let custom:{access:'OWNER_ONLY'|'AVAILABLE'|'SETUP_REQUIRED'|'UNAVAILABLE';monitored:number|null;symbols:ReturnType<typeof customDiagnosticSummary>}=
   {access:'OWNER_ONLY',monitored:null,symbols:[]};
  if(authorized){
   const subs=await db.from('custom_alert_tickers').select('ticker').eq('enabled',true).limit(5);
   if(subs.error)custom={access:'UNAVAILABLE',monitored:null,symbols:[]};
   else{
    const enabled=(subs.data||[]).map(r=>r.ticker as string);
    if(enabled.length>4)custom={access:'UNAVAILABLE',monitored:null,symbols:[]};
    else if(!enabled.length)custom={access:'AVAILABLE',monitored:0,symbols:[]};
    else{
     const diag=await db.from('custom_scan_diagnostics').select('ticker,outcome,signal_status,scan_at')
      .in('ticker',enabled).gte('scan_at',new Date(now.getTime()-86400000).toISOString()).order('scan_at',{ascending:false}).limit(800);
     custom=diag.error?
      {access:diag.error.code==='42P01'?'SETUP_REQUIRED':'UNAVAILABLE',monitored:enabled.length,symbols:[]}:
      {access:'AVAILABLE',monitored:enabled.length,symbols:customDiagnosticSummary(now,enabled,(diag.data||[]) as CustomRow[],marketState==='REGULAR SESSION')};
    }
   }
  }
  return NextResponse.json({
   asOf:now.toISOString(),marketState,health,deliveries,
   reliability:{gaps,telegram,custom},
   configuration:'Scheduled two-minute weekday scans. Scanner gaps are assessed only against verified Alpaca exchange sessions.',
   recentRuns:list.slice(0,10).map(r=>({at:r.created_at,marketState:r.market_state,signalCount:r.signal_count,mode:r.mode})),
   note:'Read-only monitoring. Telegram SENT means API acknowledgement, not phone receipt. No scan, Telegram message or trade is started by this endpoint.'
  },{headers:noStore});
 }catch{return NextResponse.json({error:'Monitoring temporarily unavailable'},{status:503,headers:noStore});}
}
