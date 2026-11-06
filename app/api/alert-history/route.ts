import {NextRequest,NextResponse} from 'next/server';
import {ownerAuthenticated} from '@/lib/owner-security';
import {allowPerformanceRead} from '@/lib/performance-read-guard';
import {createClient} from '@supabase/supabase-js';
import {normalizeDeliveredAlerts,todayNY} from '@/lib/dashboard-mobile';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store, max-age=0'};
export async function GET(req:NextRequest){
 if(!await ownerAuthenticated(req))return NextResponse.json({error:'Owner session required'},{status:401,headers:noStore});
 if(!allowPerformanceRead())return NextResponse.json({error:'Too many history requests; retry in one minute'},{status:429,headers:{...noStore,'Retry-After':'60'}});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'History unavailable'},{status:503,headers:noStore});
 const now=new Date(),date=todayNY(now);
 try{
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await db.from('signal_alerts')
   .select('session_date,ticker,direction,price,trigger_price,bar_timestamp,sent_at,status')
   .eq('session_date',date).eq('status','sent').order('sent_at',{ascending:false}).limit(50);
  if(error)throw error;
  return NextResponse.json({sessionDate:date,asOf:now.toISOString(),alerts:normalizeDeliveredAlerts(data,now)},{
   headers:noStore
  });
 }catch{
  return NextResponse.json({error:'History temporarily unavailable'},{status:503,headers:noStore});
 }
}
