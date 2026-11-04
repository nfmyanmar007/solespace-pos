import test from 'node:test';
import assert from 'node:assert/strict';
import {WATCHLIST,isWatchTicker,statusDetails,todayNY,normalizeDeliveredAlerts} from '../lib/dashboard-mobile.ts';
const now=new Date('2026-11-04T14:30:00-05:00');
const record=(overrides={})=>({
 session_date:'2026-11-04',ticker:'QQQ',direction:'CALL',status:'sent',
 price:692.57,trigger_price:691.36,
 bar_timestamp:'2026-11-04T18:12:00Z',sent_at:'2026-11-04T18:14:00Z',...overrides
});
test('eight supported tickers and no unsupported symbol',()=>{
 assert.equal(WATCHLIST.length,8);assert.ok(isWatchTicker('TSLA'));assert.equal(isWatchTicker('ORCL'),false);
});
test('current confirmation and historical delivered alerts use different labels',()=>{
 assert.equal(statusDetails('READY').kind,'watch');
 assert.match(statusDetails('READY').description,/NOT confirmed/);
 assert.equal(statusDetails('CONFIRMED CALL').kind,'confirmed');
 assert.equal(statusDetails('STALE').kind,'blocked');
 assert.equal(statusDetails('NO TRADE').kind,'blocked');
});
test('New York trading date handles UTC boundary correctly',()=>{
 assert.equal(todayNY(new Date('2026-11-05T01:00:00Z')),'2026-11-04');
 assert.equal(todayNY(new Date('2026-11-05T15:00:00Z')),'2026-11-05');
});
test('only genuine sent alerts from current NY date are presented',()=>{
 const result=normalizeDeliveredAlerts([
  record(),record({status:'pending'}),record({status:'failed'}),
  record({session_date:'2026-11-03'}),
  record({ticker:'UNSUPPORTED'}),
  record({direction:'HOLD'}),
  record({bar_timestamp:'2026-11-03T18:12:00Z'}),
  record({sent_at:'2026-11-05T01:00:00Z'})
 ],now);
 assert.equal(result.length,1);
 assert.equal(result[0].ticker,'QQQ');
 assert.equal(result[0].direction,'CALL');
 assert.equal(result[0].trigger,691.36);
});
test('duplicate deliveries collapse and list is sorted newest first',()=>{
 const result=normalizeDeliveredAlerts([
  record(),
  record(),
  record({ticker:'TSLA',direction:'PUT',bar_timestamp:'2026-11-04T18:20:00Z',sent_at:'2026-11-04T18:21:00Z'})
 ],now);
 assert.equal(result.length,2);
 assert.equal(result[0].ticker,'TSLA');
});
test('invalid prices and dates never appear in confirmed alert history',()=>{
 assert.equal(normalizeDeliveredAlerts([record({price:-1}),record({price:'bad'}),record({sent_at:'not-a-date'}),record({trigger_price:null})],now).length,0);
});
test('history supports empty or unavailable rows without fabricating alerts',()=>{
 assert.deepEqual(normalizeDeliveredAlerts(null,now),[]);
 assert.deepEqual(normalizeDeliveredAlerts([],now),[]);
});
