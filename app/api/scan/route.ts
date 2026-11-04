import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual,createHash} from 'node:crypto';
import {getReport} from '@/lib/report';
export const dynamic='force-dynamic';
const eq=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export async function POST(req:NextRequest){
 const secret=process.env.SCAN_SECRET;
 if(!secret||secret.length<32||!eq(req.headers.get('authorization')||'','Bearer '+secret))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.ALPACA_API_KEY||!process.env.ALPACA_API_SECRET||!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Live data or Supabase not configured'},{status:503});
 const report=await getReport(),db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const {error}=await db.from('scan_runs').insert({mode:report.mode,market_state:report.marketState,signal_count:report.signals.length,report});
 if(error)return NextResponse.json({error:'Scan storage failed'},{status:500});
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const signals=report.signals.filter(s=>s.status.startsWith('CONFIRMED '));
 if(signals.length){
  const rows=signals.map(s=>({session_date:day,ticker:s.ticker,direction:s.status==='CONFIRMED CALL'?'CALL':'PUT',bar_timestamp:s.timestamp,observed_price:s.price,trigger_price:s.status==='CONFIRMED CALL'?s.callAbove:s.putBelow,vwap:s.vwap,volume_ratio:s.volumeRatio,reason:s.reason,feed:s.feed}));
  const {error:e}=await db.from('signal_events').upsert(rows,{onConflict:'session_date,ticker,direction,bar_timestamp',ignoreDuplicates:true});
  if(e)return NextResponse.json({error:'Signal storage failed'},{status:500});
 }
 return NextResponse.json({ok:true,asOf:report.asOf,confirmed:signals.length,notice:'No push delivery in MVP'});
}
