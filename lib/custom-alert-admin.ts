import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import type {NextRequest} from 'next/server';
const COOKIE='optiontrigger_custom_alert_owner';
const MAX_AGE=12*60*60;
const safeEqual=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export function isCustomAlertAdminConfigured():boolean{return (process.env.CUSTOM_ALERT_ADMIN_KEY?.length??0)>=32;}
export function checkAdminKey(value:unknown):boolean{
 const configured=process.env.CUSTOM_ALERT_ADMIN_KEY;
 return typeof value==='string'&&!!configured&&configured.length>=32&&safeEqual(value,configured);
}
function sign(payload:string,secret:string){return createHmac('sha256',secret).update(payload).digest('hex');}
export function createAdminSession(now=Date.now()):string{
 const secret=process.env.CUSTOM_ALERT_ADMIN_KEY;
 if(!secret||secret.length<32)throw new Error('Custom alert owner authentication is not configured');
 const expires=String(now+MAX_AGE*1000);
 return expires+'.'+sign(expires,secret);
}
export function validAdminSession(session:unknown,now=Date.now()):boolean{
 const secret=process.env.CUSTOM_ALERT_ADMIN_KEY;
 if(!secret||secret.length<32||typeof session!=='string')return false;
 const [expiry,signature,extra]=session.split('.');
 if(extra!==undefined||!/^\d{13}$/.test(expiry||'')||!signature||!Number.isFinite(Number(expiry))||Number(expiry)<=now||Number(expiry)>now+MAX_AGE*1000)return false;
 return safeEqual(signature,sign(expiry,secret));
}
export function isOwnerRequest(req:NextRequest){return validAdminSession(req.cookies.get(COOKIE)?.value);}
export function isSameOrigin(req:NextRequest):boolean{
 const origin=req.headers.get('origin');
 return !!origin&&origin===req.nextUrl.origin;
}
export const ADMIN_COOKIE=COOKIE;
export const ADMIN_COOKIE_AGE=MAX_AGE;
