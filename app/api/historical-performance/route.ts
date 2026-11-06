import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {ownerAuthenticated} from '@/lib/owner-security';
import {allowPerformanceRead,shortLivedServerCache} from '@/lib/performance-read-guard';
import {todayNY} from '@/lib/dashboard-mobile';
import {historyStart,historicalAggregate,decorateHistoricalMeasurement} from '@/lib/historical-performance';
import {historicalQueryDays,validHistoricalSignal,historyPairs,historicalSessions,historicalIexBars,MAX_HISTORY_PAIRS} from '@/lib/historical-data';
import {measureSignal,verifyReferenceCandle,type SentSignal,type SignalMeasurement} from '@/lib/signal-performance';

export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store, max-age=0'};
const caches={
 7:shortLivedServerCache<Record<string,unknown>>(30_000),
 30:shortLivedServerCache<Record<string,unknown>>(30_000),
 90:shortLivedServerCache<Record<string,unknown>>(30_000)
};
export async function GET(req:NextRequest){
 if(!await ownerAuthenticated(req))return NextResponse.json({error:'Owner session required'},{status:401,headers});
 if(!allowPerformanceRead())return NextResponse.json({error:'Too many requests; retry in one minute'},{status:429,headers:{...headers,'Retry-After':'60'}});
 const days=historicalQueryDays(req.nextUrl.searchParams.get('days'));
 if(!days)return NextResponse.json({error:'Only 7, 30 and 90-day windows are available'},{status:400,headers});
 try{
  const data=await caches[days].get(()=>buildHistoricalPayload(days));
  return NextResponse.json(data,{headers});
 }catch{
  return NextResponse.json({error:'Historical data temporarily unavailable'},{status:503,headers});
 }
}
async function buildHistoricalPayload(days:7|30|90):Promise<Record<string,unknown>>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!process.env.ALPACA_API_KEY||!process.env.ALPACA_API_SECRET)throw Error('Missing historical data credentials');
 const now=new Date(),end=todayNY(now),start=historyStart(end,days);
 const db=createClient(url,key,{auth:{persistSession:false}});
 // Use the sent journal as ground truth. Strictly bounded reads make partial coverage visible.
 const {data,error}=await db.from('signal_alerts')
  .select('id,session_date,ticker,direction,price,bar_timestamp,sent_at,status')
  .gte('session_date',start).lte('session_date',end).eq('status','sent')
  .order('session_date',{ascending:false}).order('id',{ascending:false}).limit(1001);
 if(error)throw Error('Historical journal unavailable');
 const sourceRecords=(data||[]) as SentSignal[];
 const recordsTruncated=sourceRecords.length>1000;
 const records=sourceRecords.slice(0,1000);
 const eligible=records.filter(validHistoricalSignal);
 const skippedInvalid=records.length-eligible.length;
 const groups=historyPairs(eligible);
 const selectedGroups=groups.slice(0,MAX_HISTORY_PAIRS);
 const groupsTruncated=groups.length>MAX_HISTORY_PAIRS;
 // Single verified Alpaca calendar request for the whole selected date range.
 const sessions=await historicalSessions(start,end);
 const rows:ReturnType<typeof decorateHistoricalMeasurement>[]=[],feedFailures:string[]=[];
 let calendarSkipped=0,unmeasurable=0,referenceMismatch=0;
 for(let i=0;i<selectedGroups.length;i+=4){
  const result=await Promise.all(selectedGroups.slice(i,i+4).map(async group=>{
   const session=sessions.get(group.date);
   if(!session)return {group,session:null,bars:null};
   try{return {group,session,bars:await historicalIexBars(group)};}
   catch{return {group,session,bars:null};}
  }));
  for(const {group,session,bars} of result){
   if(!session){calendarSkipped+=group.signals.length;continue;}
   if(bars===null)feedFailures.push(group.key);
   const referenceNow=group.date===end?now:new Date(group.date+'T23:59:00Z');
   for(const alert of group.signals){
    const result=measureSignal(alert,bars||[],referenceNow,session);
    if(!result){unmeasurable++;continue;}
    if(bars===null){
     result.horizons=result.horizons.map(h=>h.status==='MEASURED'||h.status==='MISSING_BAR'?{...h,status:'INVALID' as const,price:null,stockMovePct:null,directionalMovePct:null,barAt:null}:h);
    }else{
     result.referenceStatus=verifyReferenceCandle(alert,bars,referenceNow,session);
     if(result.referenceStatus!=='MATCHED'){
      referenceMismatch++;
      result.horizons=result.horizons.map(h=>h.status==='MEASURED'||h.status==='MISSING_BAR'?{...h,status:'INVALID' as const,price:null,stockMovePct:null,directionalMovePct:null,barAt:null}:h);
     }
    }
    rows.push(decorateHistoricalMeasurement(result,group.date));
   }
  }
 }
 const coverageIncomplete=recordsTruncated||groupsTruncated||skippedInvalid>0||calendarSkipped>0||unmeasurable>0||feedFailures.length>0||referenceMismatch>0;
 return {
  sessionDate:end,asOf:now.toISOString(),feed:'Alpaca IEX 1Min',dataStatus:coverageIncomplete?'PARTIAL':'VERIFIED_WITH_LIMITATIONS',
  coverage:{recordsRead:records.length,recordsTruncated,groupsTotal:groups.length,groupsProcessed:selectedGroups.length,
   groupsTruncated,skippedInvalid,calendarSkipped,unmeasurable,referenceMismatch,feedFailures,
   measuredSignals:rows.length, maxGroupsPerRequest:MAX_HISTORY_PAIRS},
  ...historicalAggregate(rows,end,days),
  note:'Historical statistics cover only recorded sent confirmations with verified Alpaca trading calendars. IEX reference prices are reconciled with their exact completed IEX minute candle. Outcomes are underlying stock directional movements at +5/+10/+15 minutes after confirmation-bar close; NOT options profits, user executions or post-Telegram-entry returns. Missing, invalid, pending and unprocessed outcomes are not losses and are excluded from averages. PARTIAL coverage must never be interpreted as a complete-period win rate.'
 };
}
