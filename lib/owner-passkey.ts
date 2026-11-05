import {randomUUID} from 'node:crypto';
import type {NextRequest} from 'next/server';
import type {OwnerDB} from './owner-device-session';
export const RP_ID='optiontrigger-pro.vercel.app';
export const RP_ORIGIN='https://optiontrigger-pro.vercel.app';
export const CHALLENGE_TTL_MS=5*60*1000;
export function validPasskeyOrigin(req:NextRequest):boolean{
 return req.nextUrl.origin===RP_ORIGIN&&req.headers.get('origin')===RP_ORIGIN;
}
export function validPasskeyResponseOrigin(req:NextRequest):boolean{
 return validPasskeyOrigin(req);
}
export type ChallengeKind='register'|'authenticate';
export async function storeChallenge(db:OwnerDB,kind:ChallengeKind,challenge:string):Promise<string>{
 const id=randomUUID();
 const {error}=await db.from('owner_webauthn_challenges').insert({id,kind,challenge,expires_at:new Date(Date.now()+CHALLENGE_TTL_MS).toISOString()});
 if(error)throw new Error('Unable to save WebAuthn challenge');
 return id;
}
export async function consumeChallenge(db:OwnerDB,id:unknown,kind:ChallengeKind):Promise<string|null>{
 if(typeof id!=='string'||!/^[-a-f0-9]{36}$/i.test(id))return null;
 const now=new Date().toISOString();
 const {data,error}=await db.from('owner_webauthn_challenges').update({consumed_at:now})
 .eq('id',id).eq('kind',kind).is('consumed_at',null).gt('expires_at',now).select('challenge').maybeSingle();
 return error||!data?null:data.challenge;
}
export function safeCredentialId(id:unknown):id is string{return typeof id==='string'&&/^[a-zA-Z0-9_-]{12,1500}$/.test(id);}
export function decodeCredentialKey(value:unknown):Uint8Array{
 if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{20,4000}$/.test(value))throw Error('Invalid public key');
 return new Uint8Array(Buffer.from(value,'base64url'));
}
