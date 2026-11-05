import test from 'node:test';
import assert from 'node:assert/strict';
import {randomToken,hashToken,validTokenShape,webauthnOrigin,challengeClientHash,TRUSTED_SECONDS,CHALLENGE_SECONDS} from '../lib/owner-security.ts';
import {checkAdminKey,validAdminSession,createAdminSession} from '../lib/custom-alert-admin.ts';
const req=(origin='https://optiontrigger-pro.vercel.app',ip='192.0.2.4')=>({nextUrl:new URL(origin+'/api/custom-alerts/passkeys'),headers:new Headers({'x-real-ip':ip})});
test('trusted cookie uses unguessable opaque token, never plain owner password',()=>{
 const token=randomToken();
 assert.equal(validTokenShape(token),true);
 assert.equal(token.length,43);
 assert.notEqual(token,randomToken());
 assert.match(hashToken(token),/^[0-9a-f]{64}$/);
 assert.notEqual(hashToken(token),token);
 for(const bad of ['ownerpassword','abc','A'.repeat(44),null,{},'A'.repeat(42)])assert.equal(validTokenShape(bad),false);
 assert.equal(TRUSTED_SECONDS,30*24*60*60);
 assert.equal(CHALLENGE_SECONDS,300);
});
test('canonical origin never follows hostile host names or proxy headers',()=>{
 const before=process.env.PASSKEY_RP_ORIGIN;
 try{
  delete process.env.PASSKEY_RP_ORIGIN;
  assert.deepEqual(webauthnOrigin(req()),{origin:'https://optiontrigger-pro.vercel.app',rpID:'optiontrigger-pro.vercel.app'});
  assert.throws(()=>webauthnOrigin(req('https://evil.example')));
  process.env.PASSKEY_RP_ORIGIN='http://attacker.example';
  assert.throws(()=>webauthnOrigin(req('http://attacker.example')));
 }finally{if(before===undefined)delete process.env.PASSKEY_RP_ORIGIN;else process.env.PASSKEY_RP_ORIGIN=before;}
});
test('challenge client binding hashes IP and never exposes raw IP',()=>{
 const a=challengeClientHash(req()),b=challengeClientHash(req('https://optiontrigger-pro.vercel.app','192.0.2.5'));
 assert.match(a,/^[0-9a-f]{64}$/);assert.notEqual(a,b);
 assert.equal(a.includes('192.0.2.4'),false);
});
test('existing 12h owner key session remains valid separately from trusted sessions',()=>{
 const old=process.env.CUSTOM_ALERT_ADMIN_KEY;
 try{
  process.env.CUSTOM_ALERT_ADMIN_KEY='an-example-owner-key-long-enough-for-testing-only';
  assert.equal(checkAdminKey(process.env.CUSTOM_ALERT_ADMIN_KEY),true);
  const now=Date.UTC(2026,10,5,13);
  const session=createAdminSession(now);
  assert.equal(validAdminSession(session,now+12*3600000-1000),true);
  assert.equal(validAdminSession(session,now+12*3600000),false);
 }finally{if(old===undefined)delete process.env.CUSTOM_ALERT_ADMIN_KEY;else process.env.CUSTOM_ALERT_ADMIN_KEY=old;}
});
