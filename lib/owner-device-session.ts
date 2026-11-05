import {createHash,randomBytes} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {NextRequest,NextResponse} from 'next/server';
import {isOwnerRequest as isLegacyOwner,ADMIN_COOKIE as LEGACY_COOKIE} from './custom-alert-admin';
export const DEVICE_COOKIE='optiontrigger_trusted_device';
export const DEVICE_MAX_AGE=30*24*60*60;
export const SHORT_MAX_AGE=12*60*60;
export type OwnerDB=SupabaseClient;
export function ownerDB():OwnerDB{
 const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)throw new Error('Owner authentication storage unavailable');
 return createClient(url,secret,{auth:{persistSession:false}});
}
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export function validTokenShape(token:unknown):token is string{return typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);}
export function safeTrustedDuration(requested:unknown):number{return requested===true?DEVICE_MAX_AGE:SHORT_MAX_AGE;}
export async function issueOwnerDeviceSession(db:OwnerDB,trusted:boolean):Promise<{token:string;maxAge:number}>{
 const token=randomBytes(32).toString('hex'),maxAge=safeTrustedDuration(trusted);
 const {error}=await db.from('owner_trusted_sessions').insert({token_hash:tokenHash(token),expires_at:new Date(Date.now()+maxAge*1000).toISOString()});
 if(error)throw new Error('Unable to establish secure owner session');
 return {token,maxAge};
}
export function setDeviceCookie(res:NextResponse,session:{token:string;maxAge:number}){
 res.cookies.set(DEVICE_COOKIE,session.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:session.maxAge});
 res.cookies.set(LEGACY_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
}
export async function revokeDeviceSession(db:OwnerDB,token:unknown):Promise<void>{
 if(!validTokenShape(token))return;
 const {error}=await db.from('owner_trusted_sessions').update({revoked_at:new Date().toISOString()}).eq('token_hash',tokenHash(token)).is('revoked_at',null);
 if(error)throw new Error('Owner session revocation failed');
}
export async function hasDeviceSession(db:OwnerDB,token:unknown):Promise<boolean>{
 if(!validTokenShape(token))return false;
 const {data,error}=await db.from('owner_trusted_sessions').select('expires_at,revoked_at').eq('token_hash',tokenHash(token)).maybeSingle();
 if(error||!data||data.revoked_at||Date.parse(data.expires_at)<=Date.now())return false;
 return true;
}
export async function isOwnerAuthorized(req:NextRequest):Promise<boolean>{
 const token=req.cookies.get(DEVICE_COOKIE)?.value;
 if(token){
  try{return await hasDeviceSession(ownerDB(),token);}catch{return false;}
 }
 // Preserve old valid 12h owner sessions during rollout.
 return isLegacyOwner(req);
}
export async function requireOwner(req:NextRequest):Promise<boolean>{return isOwnerAuthorized(req);}
export async function clearOwnerCookie(res:NextResponse){
 res.cookies.set(DEVICE_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
 res.cookies.set(LEGACY_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
}
