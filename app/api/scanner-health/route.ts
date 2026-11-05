import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {classifyScannerHealth,summarizeDeliveryStatus,type RunRecord,type DeliveryRecord} from '@/lib/scanner-health';
import {fetchTradingSession,sessionState} from '@/lib/market-calendar';
export const dynamic='force-dynamic';
export async function GET(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Monitoring unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 const now=new Date();
 try{
  const db=createClient(url,key,{auth:{persistSession:false}});
  const recentCutoff=new Date(now.getTime()-86400000).toISOString();
  const [runResult,alertResult,eventResult,calendar]=await Promise.all([
   db.from('scan_runs').select('created_at,mode,market_state,signal_count').order('created_at',{ascending:false}).limit(20),
   db.from('signal_alerts').select('status,created_at').gte('created_at',recentCutoff).order('created_at',{ascending:false}).limit(200),
   db.from('alert_delivery_events').select('created_at,event_type').gte('created_at',recentCutoff).order('created_at',{ascending:false}).limit(200),
   fetchTradingSession(now)
  ]);
  if(runResult.error||alertResult.error||eventResult.error)throw new Error('Monitoring read failed');
  const state=sessionState(now,calendar);
  const health=classifyScannerHealth(now,(runResult.data||[]) as RunRecord[],state);
  const deliveries=summarizeDeliveryStatus(alertResult.data||[],(eventResult.data||[]) as DeliveryRecord[],now);
  return NextResponse.json({asOf:now.toISOString(),marketState:state,health,deliveries,
   configuration:'Configured for two-minute weekday scans; actual run timestamps are shown below.',
   recentRuns:(runResult.data||[]).slice(0,10).map(r=>({at:r.created_at,marketState:r.market_state,signalCount:r.signal_count,mode:r.mode})),
   note:'Read-only monitoring. No scanner trigger or Telegram message is sent by this endpoint.'
  },{headers:{'Cache-Control':'no-store, max-age=0'}});
 }catch{return NextResponse.json({error:'Monitoring temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
