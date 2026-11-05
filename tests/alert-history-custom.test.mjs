import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDeliveredAlerts} from '../lib/dashboard-mobile.ts';
const now=new Date('2026-11-05T17:00:00Z');
const record=(ticker='QQQ',status='sent',sent_at='2026-11-05T14:42:02.000Z')=>({
 session_date:'2026-11-05',ticker,direction:'PUT',price:268.48,trigger_price:269.10,
 bar_timestamp:'2026-11-05T14:41:00.000Z',sent_at,status
});
test('shows both core and custom successfully sent signals in alert history',()=>{
 const result=normalizeDeliveredAlerts([record('QQQ'),record('AMZN'),record('ORCL')],now);
 assert.equal(result.length,3);
 assert.deepEqual(result.map(r=>r.ticker),['QQQ','AMZN','ORCL']);
});
test('reconciles today four recorded deliveries including an AMZN custom alert',()=>{
 const records=[record('QQQ'),record('AMZN'),record('MSFT','sent','2026-11-05T14:48:02.000Z'),
  record('AAPL','sent','2026-11-05T15:02:08.000Z')];
 const result=normalizeDeliveredAlerts(records,now);
 assert.equal(result.length,4);
 assert.deepEqual(result.map(r=>r.ticker),['AAPL','MSFT','QQQ','AMZN']);
});
test('keeps rejecting unsent, wrong day, malformed tickers, missing timestamps, and bad prices',()=>{
 const records=[record('AMZN'),record('AMZN','pending'),record('MSFT','failed'),
  {...record('AAPL'),session_date:'2026-11-04'},record('AMZN;DROP'),
  record('lowercase'),record('A'.repeat(6)),{...record('QQQ'),price:0},
  {...record('QQQ'),sent_at:'invalid'}, {...record('QQQ'),bar_timestamp:'2026-11-04T14:41:00Z'}];
 const result=normalizeDeliveredAlerts(records,now);
 assert.deepEqual(result.map(r=>r.ticker),['AMZN']);
});
test('deduplicates an identical alert, preserves direction and includes valid dotted symbols',()=>{
 const amzn=record('AMZN'),brk={...record('BRK.B'),direction:'CALL'};
 const result=normalizeDeliveredAlerts([amzn,amzn,brk],now);
 assert.equal(result.length,2);
 assert.equal(result.find(r=>r.ticker==='BRK.B')?.direction,'CALL');
});
