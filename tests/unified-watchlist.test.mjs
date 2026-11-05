import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCustomQuery,asChartOnlySignal,asScannerSignal,mergeUnifiedSignals} from '../lib/unified-watchlist.ts';
const sample=(ticker,status='READY')=>({ticker,status,callAbove:102,putBelow:98,price:101,vwap:100,volumeRatio:1.25,bias:'BULLISH',reason:'Sample research condition',timestamp:null,fresh:true,feed:'IEX'});
test('custom query is normalized, deduplicated and constrained to 12 tickers',()=>{
 assert.deepEqual(normalizeCustomQuery(' orcl, meta,ORCL '),['ORCL','META']);
 assert.deepEqual(normalizeCustomQuery(null),[]);
 assert.equal(normalizeCustomQuery('ORCL,QQQ'),null);
 assert.equal(normalizeCustomQuery('ORCL/<script>'),null);
 assert.equal(normalizeCustomQuery(Array(13).fill('ORCL').join(',')),null);
});
test('scanner confirmations keep existing status and Telegram scope',()=>{
 const s=asScannerSignal(sample('QQQ','CONFIRMED CALL'));
 assert.equal(s.status,'CONFIRMED CALL');assert.equal(s.scannerEnabled,true);
});
test('custom ticker never displays a Telegram CONFIRMED status',()=>{
 const call=asChartOnlySignal(sample('ORCL','CONFIRMED CALL'));
 const put=asChartOnlySignal(sample('META','CONFIRMED PUT'));
 assert.equal(call.status,'RESEARCH CALL');assert.equal(put.status,'RESEARCH PUT');
 assert.equal(call.scannerEnabled,false);
 assert.match(call.reason,/Telegram alert scanning is disabled/);
});
test('unconfirmed custom statuses use the same format, with no alert enrollment',()=>{
 for(const st of ['READY','WAIT','STALE','PRELIMINARY','NO TRADE']){
  const row=asChartOnlySignal(sample('ORCL',st));
  assert.equal(row.status,st);assert.equal(row.scannerEnabled,false);
 }
});
test('unified list keeps scanner originals and removes any custom duplicates',()=>{
 const rows=mergeUnifiedSignals([sample('QQQ','WAIT'),sample('SPY','CONFIRMED PUT')],[
  asChartOnlySignal(sample('ORCL','READY')),asChartOnlySignal(sample('QQQ','CONFIRMED CALL'))]);
 assert.deepEqual(rows.map(r=>r.ticker),['QQQ','SPY','ORCL']);
 assert.equal(rows[0].scannerEnabled,true);assert.equal(rows[2].scannerEnabled,false);
});
