import {NextRequest,NextResponse} from 'next/server';
import {ADMIN_COOKIE,ADMIN_COOKIE_AGE,checkAdminKey,createAdminSession,isCustomAlertAdminConfigured,isSameOrigin,validAdminSession} from '@/lib/custom-alert-admin';
import {ownerDb,ownerAuthenticated,createTrustedDevice,trustCookie,clearOwnerCookies,revokeCurrentDevice} from '@/lib/owner-security';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(req:NextRequest){
 return NextResponse.json({configured:isCustomAlertAdminConfigured(),authenticated:await ownerAuthenticated(req),ownerKeySession:validAdminSession(req.cookies.get(ADMIN_COOKIE)?.value)},{headers});
}
export async function POST(req:NextRequest){
 if(!isSameOrigin(req))return NextResponse.json({error:'Forbidden origin'},{status:403,headers});
 if(!isCustomAlertAdminConfigured())return NextResponse.json({error:'Owner access not configured on Vercel'},{status:503,headers});
 let body:{key?:unknown;rememberDevice?:unknown};
 try{body=await req.json();}catch{return NextResponse.json({error:'Invalid request'},{status:400,headers});}
 if(!checkAdminKey(body.key))return NextResponse.json({error:'Invalid owner access key'},{status:401,headers});
 if(body.rememberDevice===true){
  const db=ownerDb();if(!db)return NextResponse.json({error:'Trusted device storage not configured'},{status:503,headers});
  try{
   const {token,expiresAt}=await createTrustedDevice(db);
   const res=NextResponse.json({authenticated:true,remembered:true,expiresAt},{headers});
   clearOwnerCookies(res);trustCookie(res,token);
   return res;
  }catch{return NextResponse.json({error:'Trusted device database migration required'},{status:503,headers});}
 }
 const res=NextResponse.json({authenticated:true,remembered:false},{headers});
 res.cookies.set(ADMIN_COOKIE,createAdminSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:ADMIN_COOKIE_AGE});
 return res;
}
export async function DELETE(req:NextRequest){
 if(!isSameOrigin(req))return NextResponse.json({error:'Forbidden origin'},{status:403,headers});
 try{await revokeCurrentDevice(req);}catch{return NextResponse.json({error:'Could not revoke this trusted device. Try again.'},{status:503,headers});}
 const res=NextResponse.json({authenticated:false},{headers});
 clearOwnerCookies(res);
 return res;
}
