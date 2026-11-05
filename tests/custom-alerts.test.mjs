import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_CUSTOM_ALERTS,enabledCustomTickers,validateCustomAlertTicker,isEligibleConfirmation} from '../lib/custom-alerts.ts';
import {checkAdminKey,createAdminSession,validAdminSession,isCustomAlertAdminConfigured} from '../lib/custom-alert-admin.ts';
test('core 8 cannot be enrolled as additional custom alerts',()=>{
 assert.equal(MAX_CUSTOM_ALERTS,4);
 for(const s of ['QQQ','SPY','TSLA','NVDA','AMD','AAPL','MSFT','GOOGL'])assert.equal(validateCustomAlertTicker(s),null);
 assert.equal(validateCustomAlertTicker('orcl'),'ORCL');
 for(const s of ['ORCL?x','<script>','LONGNAME',''])assert.equal(validateCustomAlertTicker(s),null);
});
test('enabled list deduplicates and filters inactive or forbidden tickers',()=>{
 assert.deepEqual(enabledCustomTickers([{ticker:'ORCL',enabled:true},{ticker:'ORCL',enabled:true},{ticker:'QQQ',enabled:true},{ticker:'META',enabled:false},{ticker:'PLTR',enabled:true}]),['ORCL','PLTR']);
 assert.deepEqual(enabledCustomTickers(null),[]);
 assert.deepEqual(enabledCustomTickers(['ORCL',{ticker:'ORCL',enabled:'yes'}]),[]);
});
test('over capacity fails completely closed',()=>{
 assert.deepEqual(enabledCustomTickers(['ORCL','META','PLTR','SOFI','RIVN'].map(ticker=>({ticker,enabled:true}))),[]);
});
test('custom alert candidate requires fresh genuine confirmed candle',()=>{
 const now=new Date('2026-11-05T15:02:00Z');
 const s={ticker:'ORCL',status:'CONFIRMED CALL',fresh:true,timestamp:'2026-11-05T15:00:00Z'};
 assert.equal(isEligibleConfirmation(s,now),true);
 assert.equal(isEligibleConfirmation({...s,status:'READY'},now),false);
 assert.equal(isEligibleConfirmation({...s,status:'RESEARCH CALL'},now),false);
 assert.equal(isEligibleConfirmation({...s,fresh:false},now),false);
 assert.equal(isEligibleConfirmation({...s,timestamp:'2026-11-05T14:40:00Z'},now),false);
 assert.equal(isEligibleConfirmation({...s,timestamp:'2026-11-05T15:10:00Z'},now),false);
});
test('owner-only access remains disabled without a configured key',()=>{
 const old=process.env.CUSTOM_ALERT_ADMIN_KEY;
 try{
  delete process.env.CUSTOM_ALERT_ADMIN_KEY;
  assert.equal(isCustomAlertAdminConfigured(),false);
  assert.equal(checkAdminKey('anything'),false);
  assert.equal(validAdminSession('123.notreal'),false);
 }finally{if(old===undefined)delete process.env.CUSTOM_ALERT_ADMIN_KEY;else process.env.CUSTOM_ALERT_ADMIN_KEY=old;}
});
test('owner session signs expiration and rejects forgery, expiry and altered signatures',()=>{
 const old=process.env.CUSTOM_ALERT_ADMIN_KEY;
 try{
  process.env.CUSTOM_ALERT_ADMIN_KEY='owner-example-secret-at-least-32-characters-only-for-tests';
  const now=Date.UTC(2026,10,5,13);
  assert.equal(checkAdminKey(process.env.CUSTOM_ALERT_ADMIN_KEY),true);
  assert.equal(checkAdminKey('wrong'),false);
  const cookie=createAdminSession(now);
  assert.equal(validAdminSession(cookie,now+1000),true);
  assert.equal(validAdminSession(cookie,now+13*3600000),false);
  assert.equal(validAdminSession(cookie.slice(0,-1)+'0',now+1000),false);
  assert.equal(validAdminSession(cookie+'.extra',now+1000),false);
 }finally{if(old===undefined)delete process.env.CUSTOM_ALERT_ADMIN_KEY;else process.env.CUSTOM_ALERT_ADMIN_KEY=old;}
});
