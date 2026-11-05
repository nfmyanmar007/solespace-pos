import {NextRequest,NextResponse} from 'next/server';
import {validateWatchSymbol} from '@/lib/asset-validator';
import {cleanSymbol} from '@/lib/watchlist';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const symbol=cleanSymbol(req.nextUrl.searchParams.get('ticker'));
 if(!symbol)return NextResponse.json({ok:false,reason:'Invalid ticker.'},{status:400});
 try{
  const result=await validateWatchSymbol(symbol);
  return NextResponse.json(result,{status:result.ok?200:404,headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({ok:false,reason:'Market validation unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
