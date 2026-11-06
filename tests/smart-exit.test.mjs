import test from 'node:test';
import assert from 'node:assert/strict';
import {exitAdvisory} from '../lib/smart-exit.ts';
const session={date:'2026-11-05',openMinute:570,closeMinute:960,isTradingDay:true,source:'ALPACA'};
const signal=(direction='CALL',overrides={})=>({
 id:50,session_date:'2026-11-05',ticker:'QQQ',direction,price:100,
 bar_timestamp:'2026-11-05T14:30:00Z',sent_at:'2026-11-05T14:31:20Z',
 status:'sent',...overrides
});
const bar=(minute,c)=>({t:new Date(Date.parse('2026-11-05T14:30:00Z')+minute*60000).toISOString(),
 o:c,h:c+0.1,l:c-0.1,c,v:100});
const at=(minute,seconds=0)=>new Date(Date.parse('2026-11-05T14:30:00Z')+minute*60000+seconds*1000);
test('requires sent confirmation, verified calendar, same NY session and sane timestamps',()=>{
 const raw=[bar(0,100),bar(2,100)];
 assert.equal(exitAdvisory({...signal(),status:'failed'},raw,at(3),session),null);
 assert.equal(exitAdvisory(signal(),raw,at(3),null),null);
 assert.equal(exitAdvisory(signal(),raw,at(3),{...session,isTradingDay:false}),null);
 assert.equal(exitAdvisory(signal('PUT',{sent_at:'2026-11-05T14:30:20Z'}),raw,at(3),session),null);
 assert.equal(exitAdvisory(signal(),raw,new Date('2026-11-06T15:00:00Z'),session),null);
 assert.equal(exitAdvisory(signal(),raw,at(1),session),null);
});
test('before any completed post-Telegram bar, exit advice is unavailable',()=>{
 const result=exitAdvisory(signal(),[bar(0,100),bar(1,100)],at(2,10),session);
 assert.equal(result.status,'UNAVAILABLE');
 assert.equal(result.lastPrice,null);
});
test('a verified timely post-Telegram candle is observed but no hold is promised',()=>{
 const result=exitAdvisory(signal(),[bar(0,100),bar(1,100),bar(2,100)],at(3,15),session);
 assert.equal(result.status,'MONITOR');
 assert.equal(result.lastPrice,100);
 assert.equal(result.vwap,100);
 assert.deepEqual(result.flags,[]);
});
test('consecutive post-Telegram bars weakening against CALL and PUT flags momentum',()=>{
 const call=exitAdvisory(signal(),[bar(0,100),bar(1,100),bar(2,102),bar(3,101)],at(4),session);
 assert.ok(call.flags.includes('MOMENTUM_WEAKNESS'));
 const put=exitAdvisory(signal('PUT'),[bar(0,100),bar(1,100),bar(2,98),bar(3,99)],at(4),session);
 assert.ok(put.flags.includes('MOMENTUM_WEAKNESS'));
});
test('VWAP reversal uses contemporaneous preceding VWAP and complete regular-session bars',()=>{
 const result=exitAdvisory(signal(),[bar(0,100),bar(1,100),bar(2,101),bar(3,99)],at(4),session);
 assert.ok(result.flags.includes('VWAP_REVERSAL'));
 const missingOpen=exitAdvisory(signal(),[bar(0,100),bar(2,101),bar(3,99)],at(4),session);
 assert.equal(missingOpen.vwap,null);
 assert.ok(!missingOpen.flags.includes('VWAP_REVERSAL'));
});
test('stale IEX candle fails closed and is not falsely reported as actionable',()=>{
 const result=exitAdvisory(signal(),[bar(0,100),bar(2,100)],at(7),session);
 assert.equal(result.status,'UNAVAILABLE');
 assert.equal(result.lastPrice,null);
});
test('5-min review and 15-min timebox use Telegram accepted time, not candle timestamp',()=>{
 const five=exitAdvisory(signal(),[bar(0,100),bar(2,100),bar(6,100)],at(6,25),session);
 assert.ok(five.flags.includes('TIME_REVIEW'));
 const fifteen=exitAdvisory(signal(),[],at(17),session);
 assert.equal(fifteen.status,'TIMEBOX_ELAPSED');
 assert.deepEqual(fifteen.flags,['TIMEBOX']);
 assert.equal(fifteen.lastPrice,null);
});
test('ambiguous duplicate reference is not accepted',()=>{
 const result=exitAdvisory(signal(),[bar(0,100),bar(0,100),bar(2,100)],at(3),session);
 assert.equal(result.status,'UNAVAILABLE');
});
