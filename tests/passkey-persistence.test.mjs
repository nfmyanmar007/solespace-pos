import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyStoredPasskey} from '../lib/passkey-persistence.ts';
const db=(row,error=null)=>({from(table){
 assert.equal(table,'owner_passkeys');
 return {select(field){assert.equal(field,'credential_id');return this;},
  eq(field,id){assert.equal(field,'credential_id');assert.equal(id,'credential-12345678');return this;},
  async maybeSingle(){return {data:row,error};}};
}});
test('acknowledges a credential only when same ID is readable from server DB',async()=>{
 assert.equal(await verifyStoredPasskey(db({credential_id:'credential-12345678'}),'credential-12345678'),true);
});
test('does not claim success for a missing or differently saved credential',async()=>{
 assert.equal(await verifyStoredPasskey(db(null),'credential-12345678'),false);
 assert.equal(await verifyStoredPasskey(db({credential_id:'credential-different'}),'credential-12345678'),false);
});
test('fails closed when Supabase returns an error, throws or ID is malformed',async()=>{
 assert.equal(await verifyStoredPasskey(db(null,{code:'42P01'}),'credential-12345678'),false);
 assert.equal(await verifyStoredPasskey({from(){throw Error('offline');}},'credential-12345678'),false);
 assert.equal(await verifyStoredPasskey(db(null),'x'.repeat(1025)),false);
 assert.equal(await verifyStoredPasskey(db(null),''),false);
});
