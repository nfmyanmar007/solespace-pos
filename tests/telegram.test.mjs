import test from 'node:test';
import assert from 'node:assert/strict';
import {sendTelegram} from '../lib/telegram.ts';
const originalFetch=globalThis.fetch, originalToken=process.env.TELEGRAM_BOT_TOKEN,originalChat=process.env.TELEGRAM_CHAT_ID;
function restore(){
 globalThis.fetch=originalFetch;
 if(originalToken===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=originalToken;
 if(originalChat===undefined)delete process.env.TELEGRAM_CHAT_ID;else process.env.TELEGRAM_CHAT_ID=originalChat;
}
test('Telegram success returns API message id',async()=>{
 process.env.TELEGRAM_BOT_TOKEN='TEST_ONLY_FAKE_TOKEN';
 process.env.TELEGRAM_CHAT_ID='TEST_ONLY_CHAT';
 globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({ok:true,result:{message_id:42}})});
 try{assert.equal(await sendTelegram('TEST — not a market signal'),42);}finally{restore();}
});
test('Telegram transport ambiguity is never automatically retried',async()=>{
 process.env.TELEGRAM_BOT_TOKEN='TEST_ONLY_FAKE_TOKEN';
 process.env.TELEGRAM_CHAT_ID='TEST_ONLY_CHAT';
 let attempts=0;
 globalThis.fetch=async()=>{attempts++;throw new Error('Connection terminated');};
 try{
  await assert.rejects(sendTelegram('TEST'),/delivery uncertain/);
  assert.equal(attempts,1);
 }finally{restore();}
});
test('Telegram explicit 401 is not retried',async()=>{
 process.env.TELEGRAM_BOT_TOKEN='TEST_ONLY_FAKE_TOKEN';
 process.env.TELEGRAM_CHAT_ID='TEST_ONLY_CHAT';
 let attempts=0;
 globalThis.fetch=async()=>{attempts++;return {ok:false,status:401,json:async()=>({ok:false,description:'Unauthorized'})};};
 try{
  await assert.rejects(sendTelegram('TEST'),/HTTP 401/);
  assert.equal(attempts,1);
 }finally{restore();}
});
test('Telegram explicit rate limit receives bounded retry',async()=>{
 process.env.TELEGRAM_BOT_TOKEN='TEST_ONLY_FAKE_TOKEN';
 process.env.TELEGRAM_CHAT_ID='TEST_ONLY_CHAT';
 let attempts=0;
 globalThis.fetch=async()=>{
  attempts++;
  return attempts===1
   ?{ok:false,status:429,json:async()=>({ok:false,parameters:{retry_after:0},description:'Too Many Requests'})}
   :{ok:true,status:200,json:async()=>({ok:true,result:{message_id:43}})};
 };
 try{assert.equal(await sendTelegram('TEST'),43);assert.equal(attempts,2);}finally{restore();}
});
