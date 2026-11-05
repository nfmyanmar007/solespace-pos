import {NextRequest,NextResponse} from 'next/server';
import {ADMIN_COOKIE,ADMIN_COOKIE_AGE,checkAdminKey,createAdminSession,isCustomAlertAdminConfigured,isOwnerRequest,isSameOrigin} from '@/lib/custom-alert-admin';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(req:NextRequest){
 return NextResponse.json({configured:isCustomAlertAdminConfigured(),authenticated:isOwnerRequest(req)},{headers});
}
export async function POST(req:NextRequest){
 if(!isSameOrigin(req))return NextResponse.json({error:'Forbidden origin'},{status:403,headers});
 if(!isCustomAlertAdminConfigured())return NextResponse.json({error:'Owner access not configured on Vercel'},{status:503,headers});
 let body:{key?:unknown};
 try{body=await req.json();}catch{return NextResponse.json({error:'Invalid request'},{status:400,headers});}
 if(!checkAdminKey(body.key))return NextResponse.json({error:'Invalid owner access key'},{status:401,headers});
 const res=NextResponse.json({authenticated:true},{headers});
 res.cookies.set(ADMIN_COOKIE,createAdminSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:ADMIN_COOKIE_AGE});
 return res;
}
export async function DELETE(req:NextRequest){
 if(!isSameOrigin(req))return NextResponse.json({error:'Forbidden origin'},{status:403,headers});
 const res=NextResponse.json({authenticated:false},{headers});
 res.cookies.set(ADMIN_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
 return res;
}
