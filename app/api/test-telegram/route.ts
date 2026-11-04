import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual,createHash} from 'node:crypto';
import {sendTelegram} from '@/lib/telegram';
export const dynamic='force-dynamic';
const hash=(s:string)=>createHash('sha256').update(s).digest();
export async function POST(req:NextRequest){
 const secret=process.env.SCAN_SECRET;
 const auth=req.headers.get('authorization')||'';
 if(!secret||secret.length<32||!timingSafeEqual(hash(auth),hash('Bearer '+secret)))
  return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
 try{
  await sendTelegram('✅ OptionTrigger Pro test notification\nYour Telegram connection is working.\nThis is only a delivery test — not a trading signal.');
  return NextResponse.json({ok:true,message:'Test Telegram message accepted by Telegram'});
 }catch(err){
  return NextResponse.json({ok:false,error:'Telegram delivery failed; inspect server configuration'},{status:502});
 }
}
