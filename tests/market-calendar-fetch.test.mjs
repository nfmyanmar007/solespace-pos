import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchTradingSession} from '../lib/market-calendar.ts';
const originalFetch=globalThis.fetch;
const originalKey=process.env.ALPACA_API_KEY,originalSecret=process.env.ALPACA_API_SECRET;
function restore(){globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.ALPACA_API_KEY;else process.env.ALPACA_API_KEY=originalKey;if(originalSecret===undefined)delete process.env.ALPACA_API_SECRET;else process.env.ALPACA_API_SECRET=originalSecret;}
test('Alpaca calendar client requests trading date with auth headers and handles an early close',async()=>{
 process.env.ALPACA_API_KEY='TEST_ONLY';process.env.ALPACA_API_SECRET='TEST_ONLY';
 const now=new Date('2026-11-27T12:00:00-05:00');
 globalThis.fetch=async(url,config)=>{
  const parsed=new URL(url);
  assert.equal(parsed.hostname,'paper-api.alpaca.markets');
  assert.equal(parsed.pathname,'/v2/calendar');
  assert.equal(parsed.searchParams.get('start'),'2026-11-27');
  assert.equal(parsed.searchParams.get('end'),'2026-11-27');
  assert.equal(config.headers['APCA-API-KEY-ID'],'TEST_ONLY');
  return {ok:true,json:async()=>[{date:'2026-11-27',open:'09:30',close:'13:00'}]};
 };
 try{
  const s=await fetchTradingSession(now);
  assert.equal(s?.closeMinute,780);
  assert.equal(s?.isTradingDay,true);
 }finally{restore();}
});
test('Alpaca calendar network failure prevents trading rather than guessing',async()=>{
 process.env.ALPACA_API_KEY='TEST_ONLY';process.env.ALPACA_API_SECRET='TEST_ONLY';
 globalThis.fetch=async()=>{throw new Error('Network unavailable');};
 try{
  const s=await fetchTradingSession(new Date('2026-12-01T10:00:00-05:00'));
  assert.equal(s,null);
 }finally{restore();}
});
