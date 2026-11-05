import {randomBytes,createHash} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {NextRequest,NextResponse} from 'next/server';
import {ADMIN_COOKIE,isSameOrigin,validAdminSession} from './custom-alert-admin.ts';

export const TRUSTED_COOKIE='optiontrigger_trusted_device';
export const TRUSTED_SECONDS=30*24*60*60;
export const CHALLENGE_SECONDS=5*60;
export function randomToken(){return randomBytes(32).toString('base64url');}
export function hashToken(token:string){return createHash('sha256').update(token).digest('hex');}
export function validTokenShape(value:unknown):value is string{
 return typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
}
export function ownerDb():SupabaseClient|null{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 return url&&key?createClient(url,key,{auth:{persistSession:false}}):null;
}
export function trustCookie(res:NextResponse,token:string){
 res.cookies.set(TRUSTED_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:TRUSTED_SECONDS});
}
export function clearOwnerCookies(res:NextResponse){
 for(const name of [TRUSTED_COOKIE,ADMIN_COOKIE])res.cookies.set(name,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
}
export async function createTrustedDevice(db:SupabaseClient,label='Trusted browser'):{
 token:string; expiresAt:string
}|Promise<{token:string;expiresAt:string}>{
 const token=randomToken(),expiresAt=new Date(Date.now()+TRUSTED_SECONDS*1000).toISOString();
 const {error}=await db.from('owner_trusted_devices').insert({token_hash:hashToken(token),expires_at:expiresAt,label:label.slice(0,80)});
 if(error)throw new Error('Cannot save trusted session. Database migration may be missing.');
 return {token,expiresAt};
}
export async function trustedSessionValid(db:SupabaseClient|null,token:unknown,now=Date.now()):Promise<boolean>{
 if(!db||!validTokenShape(token))return false;
 const {data,error}=await db.from('owner_trusted_devices').select('expires_at').eq('token_hash',hashToken(token)).gt('expires_at',new Date(now).toISOString()).maybeSingle();
 return !error&&!!data&&Number.isFinite(Date.parse(data.expires_at))&&Date.parse(data.expires_at)>now;
}
export async function ownerAuthenticated(req:NextRequest):Promise<boolean>{
 if(validAdminSession(req.cookies.get(ADMIN_COOKIE)?.value))return true;
 return trustedSessionValid(ownerDb(),req.cookies.get(TRUSTED_COOKIE)?.value);
}
export async function revokeCurrentDevice(req:NextRequest){
 const token=req.cookies.get(TRUSTED_COOKIE)?.value,db=ownerDb();
 if(db&&validTokenShape(token))await db.from('owner_trusted_devices').delete().eq('token_hash',hashToken(token));
}
export function webauthnOrigin(req:NextRequest):{rpID:string;origin:string}{
 // Never trust Host, Forwarded or a caller-supplied origin for verification.
 const configured=process.env.PASSKEY_RP_ORIGIN||'https://optiontrigger-pro.vercel.app';
 const origin=new URL(configured);
 if(origin.protocol!=='https:'&&origin.hostname!=='localhost')throw Error('Passkey origin requires HTTPS');
 if(origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error('Invalid passkey origin configuration');
 if(req.nextUrl.origin!==origin.origin)throw Error('Passkeys are available only on the configured canonical website');
 return {origin:origin.origin,rpID:origin.hostname};
}
export function challengeClientHash(req:NextRequest):string{
 const ip=req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
 return hashToken(ip.slice(0,150));
}
export async function persistChallenge(db:SupabaseClient,req:NextRequest,kind:'register'|'authenticate',challenge:string):Promise<string>{
 const clientHash=challengeClientHash(req),cutoff=new Date(Date.now()-10*60*1000).toISOString();
 const {count,error:countError}=await db.from('owner_auth_challenges').select('id',{count:'exact',head:true}).eq('client_hash',clientHash).gte('created_at',cutoff);
 if(countError)throw Error('Unable to issue challenge');
 if((count||0)>=10)throw Error('Too many requests. Retry later.');
 const {data,error}=await db.from('owner_auth_challenges').insert({challenge,kind,client_hash:clientHash,expires_at:new Date(Date.now()+CHALLENGE_SECONDS*1000).toISOString()}).select('id').single();
 if(error||!data?.id)throw Error('Unable to save passkey challenge');
 return data.id;
}
export async function consumeChallenge(db:SupabaseClient,id:unknown,kind:'register'|'authenticate',req:NextRequest):Promise<string|null>{
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return null;
 const {data,error}=await db.from('owner_auth_challenges').delete().eq('id',id).eq('kind',kind).eq('client_hash',challengeClientHash(req)).gt('expires_at',new Date().toISOString()).select('challenge').maybeSingle();
 return error?null:data?.challenge||null;
}
export {isSameOrigin};
