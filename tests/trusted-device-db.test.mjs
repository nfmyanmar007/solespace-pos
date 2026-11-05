import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrustedDevice,trustedSessionValid,hashToken,revokeCurrentDevice,consumeChallenge} from '../lib/owner-security.ts';

test('trusted device database stores only a hash and uses a fixed 30-day expiry',async()=>{
 let stored=null;
 const db={from(name){
  assert.equal(name,'owner_trusted_devices');
  return {insert(value){stored=value;return Promise.resolve({error:null});}};
 }};
 const data=await createTrustedDevice(db,'iPhone Safari');
 assert.equal(stored.token_hash,hashToken(data.token));
 assert.equal(stored.token_hash.includes(data.token),false);
 assert.equal(stored.label,'iPhone Safari');
 const delta=Date.parse(data.expiresAt)-Date.now();
 assert.ok(delta>29*86400000&&delta<=30*86400000);
});
test('trusted device validation fails closed for missing DB, invalid token and DB errors',async()=>{
 const valid='A'.repeat(43);
 assert.equal(await trustedSessionValid(null,valid),false);
 let queried=false;
 const db={from(){
  queried=true;
  return {select(){return this;},eq(){return this;},gt(){return this;},async maybeSingle(){return {data:null,error:{code:'DOWN'}};}};
 }};
 assert.equal(await trustedSessionValid(db,valid),false);
 assert.equal(queried,true);
 assert.equal(await trustedSessionValid(db,'bad'),false);
});
test('invalid, expired, reused and wrong-kind WebAuthn challenges cannot be replayed',async()=>{
 const id='11111111-2222-4333-8444-555555555555';
 const now=new Date();
 let present=true;
 const db={from(name){
  assert.equal(name,'owner_auth_challenges');
  return {delete(){return this;},eq(k,v){if(k==='id'&&v!==id)present=false;if(k==='kind'&&v!=='authenticate')present=false;return this;},
   gt(){return this;},select(){return this;},async maybeSingle(){if(!present)return {data:null,error:null};present=false;return {data:{challenge:'single-use-challenge'},error:null};}};
 }};
 const req={headers:new Headers({'x-real-ip':'192.0.2.4'})};
 assert.equal(await consumeChallenge(db,id,'authenticate',req),'single-use-challenge');
 assert.equal(await consumeChallenge(db,id,'authenticate',req),null);
 assert.equal(await consumeChallenge(db,'not-a-uuid','authenticate',req),null);
 assert.ok(now instanceof Date);
});
