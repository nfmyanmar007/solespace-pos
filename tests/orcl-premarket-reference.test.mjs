import test from 'node:test';
import assert from 'node:assert/strict';
import {selectDelayedReference,getOrclPremarketReference,SIP_DELAY_MINUTES} from '../lib/premarket-reference.ts';
import {withPremarketReference,asScannerSignal} from '../lib/unified-watchlist.ts';
const now=new Date('2026-11-05T14:23:00.000Z'); // 9:23 ET
const session={date:'2026-11-05',openMinute:570,closeMinute:960,isTradingDay:true,source:'ALPACA'};
const bar=(t,c)=>({t,c});
test('SIP fallback takes only delayed same-day premarket bars and exposes source/time',()=>{
 const quote=selectDelayedReference([
  bar('2026-11-04T14:04:00.000Z',200),
  bar('2026-11-05T14:05:00.000Z',198.426),
  bar('2026-11-05T14:20:00.000Z',210.3), // forbidden: too recent
  bar('2026-11-05T14:08:00.000Z',211.4), // 15m age, below 17m safety buffer
 ],now,session);
 assert.equal(quote.price,198.43);
 assert.equal(quote.timestamp,'2026-11-05T14:05:00.000Z');
 assert.equal(quote.source,'ALPACA SIP (DELAYED)');
 assert.equal(quote.displayOnly,true);
 assert.ok(quote.delayMinutes>=SIP_DELAY_MINUTES);
});
test('missing, invalid, stale, malicious and postmarket data return no reference',()=>{
 assert.equal(selectDelayedReference([],now,session),null);
 assert.equal(selectDelayedReference([bar('2026-11-05T13:00:00.000Z',-22)],now,session),null);
 assert.equal(selectDelayedReference([bar('2026-11-05T10:00:00.000Z',200)],now,session),null);
 assert.equal(selectDelayedReference([bar('2026-11-05T14:22:00.000Z',200)],now,session),null);
 assert.equal(selectDelayedReference([bar('2026-11-04T14:05:00.000Z',200)],now,session),null);
 assert.equal(selectDelayedReference([bar('2026-11-05T14:05:00.000Z',200)],now,{...session,isTradingDay:false}),null);
 assert.equal(selectDelayedReference([bar('2026-11-05T14:05:00.000Z',200)],new Date('2026-11-05T14:31:00Z'),session),null);
});
test('fetch is limited to ORCL and eligible historical SIP window; no extra paid credentials',async()=>{
 const before=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 process.env.ALPACA_API_KEY='fake-key';process.env.ALPACA_API_SECRET='fake-secret';
 try{
  let calls=0;
  const fake=async (url,opts)=>{
   calls++;
   assert.equal(url.pathname,'/v2/stocks/ORCL/bars');
   assert.equal(url.searchParams.get('feed'),'sip');
   assert.equal(url.searchParams.get('timeframe'),'1Min');
   assert.ok(Date.parse(url.searchParams.get('end'))<=now.getTime()-17*60000);
   assert.equal(opts.headers['APCA-API-KEY-ID'],'fake-key');
   return {ok:true,json:async()=>({bars:[bar('2026-11-05T14:05:00.000Z',201.21)]})};
  };
  const result=await getOrclPremarketReference(now,session,fake);
  assert.equal(result.price,201.21);
  assert.equal(calls,1);
  assert.equal(await getOrclPremarketReference(new Date('2026-11-05T14:33:00Z'),session,fake),null);
  assert.equal(calls,1);
 }finally{
  if(before===undefined)delete process.env.ALPACA_API_KEY;else process.env.ALPACA_API_KEY=before;
  if(secret===undefined)delete process.env.ALPACA_API_SECRET;else process.env.ALPACA_API_SECRET=secret;
 }
});
test('entitlement failures and timeouts do not manufacture fallback values',async()=>{
 const before=process.env.ALPACA_API_KEY,secret=process.env.ALPACA_API_SECRET;
 process.env.ALPACA_API_KEY='test';process.env.ALPACA_API_SECRET='test';
 try{
  assert.equal(await getOrclPremarketReference(now,session,async()=>({ok:false,status:403})),null);
  assert.equal(await getOrclPremarketReference(now,session,async()=>{throw Error('timeout')}),null);
 }finally{
  if(before===undefined)delete process.env.ALPACA_API_KEY;else process.env.ALPACA_API_KEY=before;
  if(secret===undefined)delete process.env.ALPACA_API_SECRET;else process.env.ALPACA_API_SECRET=secret;
 }
});
test('reference does not modify signal price, levels, VWAP, signal status or scanner opt-in',()=>{
 const base=asScannerSignal({ticker:'ORCL',status:'NO PREMARKET DATA',price:null,callAbove:null,putBelow:null,vwap:null,volumeRatio:null,bias:'NEUTRAL',reason:'No IEX bars',timestamp:null,fresh:false,feed:'IEX'});
 const ref=selectDelayedReference([bar('2026-11-05T14:05:00Z',209.3)],now,session);
 const shown=withPremarketReference(base,ref);
 assert.equal(shown.price,null);assert.equal(shown.callAbove,null);assert.equal(shown.putBelow,null);
 assert.equal(shown.status,'NO PREMARKET DATA');assert.equal(shown.feed,'IEX');assert.equal(shown.scannerEnabled,true);
 assert.equal(shown.premarketReference.price,209.3);
 assert.equal(withPremarketReference({...base,ticker:'QQQ'},ref).premarketReference,undefined);
 assert.equal(withPremarketReference({...base,price:190},ref).premarketReference,undefined);
 assert.equal(withPremarketReference({...base,status:'PRELIMINARY'},ref).premarketReference,undefined);
});
