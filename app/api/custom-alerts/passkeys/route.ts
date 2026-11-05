import {NextRequest,NextResponse} from 'next/server';
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse,type RegistrationResponseJSON,type AuthenticationResponseJSON} from '@simplewebauthn/server';
import {validAdminSession} from '@/lib/custom-alert-admin';
import {verifyStoredPasskey} from '@/lib/passkey-persistence';
import {ownerDb,ownerAuthenticated,isSameOrigin,webauthnOrigin,persistChallenge,consumeChallenge,createTrustedDevice,trustCookie,clearOwnerCookies} from '@/lib/owner-security';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers});
type RequestBody={action?:unknown;challengeId?:unknown;response?:unknown;credentialId?:unknown};
export async function GET(req:NextRequest){
 if(!await ownerAuthenticated(req))return fail('Owner access required',401);
 const db=ownerDb();if(!db)return fail('Owner database unavailable',503);
 const {data,error}=await db.from('owner_passkeys').select('credential_id,created_at,last_used_at').order('created_at',{ascending:true}).limit(10);
 return error?fail('Passkey database unavailable; apply the migration',503):NextResponse.json({passkeys:data||[]},{headers});
}
export async function POST(req:NextRequest){
 if(!isSameOrigin(req))return fail('Forbidden origin',403);
 const db=ownerDb();if(!db)return fail('Owner database unavailable',503);
 let rp:{origin:string;rpID:string};
 try{rp=webauthnOrigin(req);}catch{return fail('Passkeys require the production HTTPS website',409);}
 let body:RequestBody;
 try{body=await req.json() as RequestBody;}catch{return fail('Invalid request');}
 try{
  if(body.action==='start-register'){
   // A recent owner-key login is required to enroll a new authenticator.
   if(!validAdminSession(req.cookies.get('optiontrigger_custom_alert_owner')?.value))return fail('Unlock with owner key to enroll a new passkey',401);
   const {data,error}=await db.from('owner_passkeys').select('credential_id,transports').limit(6);
   if(error)return fail('Passkey migration required',503);
   if((data||[]).length>=5)return fail('Maximum five passkeys reached',409);
   const options=await generateRegistrationOptions({
    rpName:'OptionTrigger Pro',rpID:rp.rpID,userName:'OptionTrigger Owner',
    userID:new Uint8Array(Buffer.from('optiontrigger-owner-v1')),attestationType:'none',supportedAlgorithmIDs:[-7,-257],
    authenticatorSelection:{residentKey:'required',userVerification:'required'},
    excludeCredentials:(data||[]).map(k=>({id:k.credential_id,transports:k.transports||[]}))
   });
   const challengeId=await persistChallenge(db,req,'register',options.challenge);
   return NextResponse.json({challengeId,options},{headers});
  }
  if(body.action==='finish-register'){
   if(!validAdminSession(req.cookies.get('optiontrigger_custom_alert_owner')?.value))return fail('Owner key login required',401);
   const challenge=await consumeChallenge(db,body.challengeId,'register',req);
   if(!challenge)return fail('Passkey registration challenge expired, invalid or already used',401);
   const verification=await verifyRegistrationResponse({response:body.response as RegistrationResponseJSON,
    expectedChallenge:challenge,expectedOrigin:rp.origin,expectedRPID:rp.rpID,requireUserVerification:true,supportedAlgorithmIDs:[-7,-257]});
   if(!verification.verified||!verification.registrationInfo)return fail('Passkey registration not verified',401);
   const credential=verification.registrationInfo.credential;
   const {error}=await db.from('owner_passkeys').insert({credential_id:credential.id,
    public_key:Buffer.from(credential.publicKey).toString('base64url'),counter:credential.counter,
    transports:credential.transports||[]});
   if(error)return fail('Passkey could not be saved in the configured database',503);
   const stored=await verifyStoredPasskey(db,credential.id);
   if(!stored)return fail('Passkey could not be verified in the database. Registration is not confirmed.',503);
   return NextResponse.json({ok:true,passkeyRegistered:true,verifiedStored:true,credentialId:credential.id},{headers});
  }
  if(body.action==='start-login'){
   const {data,error}=await db.from('owner_passkeys').select('credential_id,transports').limit(6);
   if(error)return fail('Passkey migration required',503);
   if(!data?.length)return fail('Register a passkey after unlocking with your owner key',409);
   const options=await generateAuthenticationOptions({rpID:rp.rpID,userVerification:'required',
    allowCredentials:data.map(k=>({id:k.credential_id,transports:k.transports||[]}))});
   const challengeId=await persistChallenge(db,req,'authenticate',options.challenge);
   return NextResponse.json({challengeId,options},{headers});
  }
  if(body.action==='finish-login'){
   const challenge=await consumeChallenge(db,body.challengeId,'authenticate',req);
   if(!challenge)return fail('Passkey login challenge expired, invalid or already used',401);
   const response=body.response as AuthenticationResponseJSON;
   if(!response||typeof response.id!=='string')return fail('Invalid authenticator response');
   const {data:stored,error:lookupError}=await db.from('owner_passkeys').select('credential_id,public_key,counter,transports')
    .eq('credential_id',response.id).maybeSingle();
   if(lookupError||!stored)return fail('Unknown passkey',401);
   const verified=await verifyAuthenticationResponse({
    response,expectedChallenge:challenge,expectedOrigin:rp.origin,expectedRPID:rp.rpID,requireUserVerification:true,
    credential:{id:stored.credential_id,publicKey:new Uint8Array(Buffer.from(stored.public_key,'base64url')),
     counter:Number(stored.counter),transports:stored.transports||[]}
   });
   if(!verified.verified)return fail('Passkey authentication failed',401);
   // Counter rollback fails closed; zero counters are normal for synced passkeys.
   const {data:updated,error:updateError}=await db.from('owner_passkeys').update({
    counter:verified.authenticationInfo.newCounter,last_used_at:new Date().toISOString()
   }).eq('credential_id',stored.credential_id).eq('counter',stored.counter).select('credential_id').maybeSingle();
   if(updateError||!updated)return fail('Passkey counter changed; retry authentication',409);
   const {token,expiresAt}=await createTrustedDevice(db,'Passkey login');
   const res=NextResponse.json({ok:true,authenticated:true,expiresAt},{headers});
   clearOwnerCookies(res);trustCookie(res,token);
   return res;
  }
  if(body.action==='remove-passkey'){
   if(!validAdminSession(req.cookies.get('optiontrigger_custom_alert_owner')?.value))
    return fail('Unlock with owner key to remove a passkey',401);
   if(typeof body.credentialId!=='string'||body.credentialId.length>1024)return fail('Invalid passkey ID');
   const {error}=await db.from('owner_passkeys').delete().eq('credential_id',body.credentialId);
   return error?fail('Unable to remove passkey',503):NextResponse.json({ok:true},{headers});
  }
  return fail('Unknown passkey action');
 }catch{
  return fail('Passkey request could not be verified. Check device support and retry.',400);
 }
}
