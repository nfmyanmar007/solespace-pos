import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {normalizeDeliveredAlerts,todayNY} from '@/lib/dashboard-mobile';
export const dynamic='force-dynamic';
export async function GET(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'History unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 const now=new Date(),date=todayNY(now);
 try{
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await db.from('signal_alerts')
   .select('session_date,ticker,direction,price,trigger_price,bar_timestamp,sent_at,status')
   .eq('session_date',date).eq('status','sent').order('sent_at',{ascending:false}).limit(50);
  if(error)throw error;
  return NextResponse.json({sessionDate:date,asOf:now.toISOString(),alerts:normalizeDeliveredAlerts(data,now)},{
   headers:{'Cache-Control':'no-store, max-age=0'}
  });
 }catch{
  return NextResponse.json({error:'History temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
