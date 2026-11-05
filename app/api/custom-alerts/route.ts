import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {isSameOrigin} from '@/lib/custom-alert-admin';
import {ownerAuthenticated} from '@/lib/owner-security';
import {validateCustomAlertTicker,MAX_CUSTOM_ALERTS} from '@/lib/custom-alerts';
import {validateWatchSymbol} from '@/lib/asset-validator';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
function db(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return null;
 return createClient(url,key,{auth:{persistSession:false}});
}
export async function GET(req:NextRequest){
 if(!await ownerAuthenticated(req))return NextResponse.json({error:'Owner access required'},{status:401,headers});
 const client=db();if(!client)return NextResponse.json({error:'Database unavailable'},{status:503,headers});
 const {data,error}=await client.from('custom_alert_tickers').select('ticker,enabled').order('ticker',{ascending:true}).limit(25);
 if(error)return NextResponse.json({error:'Custom alert setup is not installed yet'},{status:503,headers});
 return NextResponse.json({subscriptions:data||[],maxEnabled:MAX_CUSTOM_ALERTS},{headers});
}
export async function PUT(req:NextRequest){
 if(!isSameOrigin(req))return NextResponse.json({error:'Forbidden origin'},{status:403,headers});
 if(!await ownerAuthenticated(req))return NextResponse.json({error:'Owner access required'},{status:401,headers});
 const client=db();if(!client)return NextResponse.json({error:'Database unavailable'},{status:503,headers});
 let payload:{ticker?:unknown;enabled?:unknown};
 try{payload=await req.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400,headers});}
 const ticker=validateCustomAlertTicker(payload.ticker);
 if(!ticker||typeof payload.enabled!=='boolean')return NextResponse.json({error:'Invalid custom stock or switch state'},{status:400,headers});
 if(payload.enabled){
  try{const asset=await validateWatchSymbol(ticker);
   if(!asset.ok)return NextResponse.json({error:asset.reason||'Untradable ticker'},{status:422,headers});
  }catch{return NextResponse.json({error:'Unable to verify stock eligibility. No change saved.'},{status:503,headers});}
  const {data,error}=await client.from('custom_alert_tickers').select('ticker').eq('enabled',true).limit(MAX_CUSTOM_ALERTS+1);
  if(error)return NextResponse.json({error:'Cannot verify scanner capacity'},{status:503,headers});
  if((data||[]).length>=MAX_CUSTOM_ALERTS&&!(data||[]).some(r=>r.ticker===ticker))
   return NextResponse.json({error:'Only four custom tickers can have Telegram alerts enabled.'},{status:409,headers});
 }
 const {error}=await client.from('custom_alert_tickers').upsert({ticker,enabled:payload.enabled},{onConflict:'ticker'});
 if(error)return NextResponse.json({error:error.code==='P0001'?'Maximum four enabled custom stocks reached':'Could not save subscription; check database setup'},{status:error.code==='P0001'?409:503,headers});
 return NextResponse.json({ok:true,ticker,enabled:payload.enabled},{headers});
}
