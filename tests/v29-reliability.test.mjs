import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionGapSummary,deliveryIncidents,customDiagnosticSummary,ownerOnlyCustomPayload} from '../lib/reliability-v29.ts';
import {outcomeFromSignal,inspectCustomTickers,skippedCustomTickers} from '../lib/scanner-diagnostics.ts';
const now=new Date('2026-11-05T15:10:00.000Z'); // Thu 10:10 ET
const session={date:'2026-11-05',isTradingDay:true,source:'ALPACA',openMinute:570,closeMinute:960};
const run=(minute,state='REGULAR SESSION')=>({created_at:new Date(Date.UTC(2026,10,5,14,minute)).toISOString(),market_state:state});
test('2-minute scan cadence has no gaps inside verified regular session',()=>{
 const d=sessionGapSummary(now,[run(30),run(32),run(34),run(36),run(38),run(40),run(42),run(44),run(46),run(48),run(50),run(52),run(54),run(56),run(58),run(60),run(62),run(64),run(66),run(68),run(70)],session);
 assert.equal(d.verifiable,true);assert.equal(d.gaps,0);assert.equal(d.stale,false);
});
test('detects missing scanner interval without counting premarket or overnight records',()=>{
 const d=sessionGapSummary(now,[run(22,'PRE-MARKET'),run(30),run(32),run(44),run(68)],session);
 assert.equal(d.gaps,2);assert.equal(d.longestSeconds,24*60);assert.equal(d.regularRuns,4);
});
test('missing regular scans after 5 minutes is stale; no fabricated market on unverified holiday',()=>{
 const no=sessionGapSummary(now,[],session);assert.equal(no.stale,true);assert.ok(no.gaps>=1);
 assert.equal(sessionGapSummary(now,[],null).verifiable,false);
 assert.equal(sessionGapSummary(now,[],{...session,isTradingDay:false}).verifiable,false);
 const after=new Date('2026-11-05T22:00:00Z');
 assert.equal(sessionGapSummary(after,[run(68)],session).stale,false); // No live freshness requirement once the market is closed.
});
test('shortened Alpaca trading session prevents false after-close stale when fully scanned',()=>{
 const t=new Date('2026-11-05T19:31:00Z'); // 2:31pm ET
 const early={...session,closeMinute:870}; // 2:30pm ET
 const d=sessionGapSummary(t,[{created_at:'2026-11-05T19:28:00Z',market_state:'REGULAR SESSION'}],early);
 assert.equal(d.stale,false);
 const hoursLater=sessionGapSummary(new Date('2026-11-05T20:00:00Z'),[{created_at:'2026-11-05T19:28:00Z',market_state:'REGULAR SESSION'}],early);
 assert.equal(hoursLater.stale,false); // Closing at 2:30 ET means no scans are expected at 3:00 ET.
});
test('Telegram distinguishes sent, failed, stuck pending and no alerts from delivery success',()=>{
 const fresh=new Date(now.getTime()-60000).toISOString(),stuck=new Date(now.getTime()-3600000).toISOString();
 const d=deliveryIncidents(now,[{ticker:'ORCL',direction:'CALL',status:'pending',created_at:stuck},
  {ticker:'QQQ',direction:'PUT',status:'sent',created_at:fresh},
  {ticker:'SPY',direction:'CALL',status:'failed',created_at:fresh}],
 [{event_type:'failed',created_at:fresh}]);
 assert.equal(d.sent,1);assert.equal(d.failed,1);assert.equal(d.pending,1);assert.equal(d.stalePending,1);assert.equal(d.deliveryFailures,1);assert.equal(d.hasIncident,true);
 assert.equal(deliveryIncidents(now,[],[]).hasIncident,false);
});
test('custom summary does not call no record a successful scan and excludes old records',()=>{
 const r=[{ticker:'ORCL',outcome:'NOT_CONFIRMED',signal_status:'WAIT',scan_at:new Date(now.getTime()-120000).toISOString()},
  {ticker:'ORCL',outcome:'ERROR',signal_status:null,scan_at:new Date(now.getTime()-3600000).toISOString()}];
 const out=customDiagnosticSummary(now,['ORCL','PLTR'],r,true);
 assert.equal(out[0].outcome,'NOT_CONFIRMED');assert.equal(out[0].errorsLast15m,0);
 assert.equal(out[1].outcome,'NO_RECORD');
 assert.equal(customDiagnosticSummary(now,['ORCL'],r,false)[0].outcome,'OUTSIDE_SESSION');
});
test('custom scans report NO DATA/ERROR, but only fully eligible confirmation joins alerts',async()=>{
 const signal=(ticker,status)=>({ticker,status,timestamp:new Date(now.getTime()-60000).toISOString(),fresh:true});
 const fakeLoad=async ticker=>ticker==='PLTR'?Promise.reject(Error('feed offline')):[];
 const fakeScore=ticker=>signal(ticker,ticker==='ORCL'?'CONFIRMED CALL':'NO DATA');
 const result=await inspectCustomTickers(['ORCL','PLTR'],now,session,fakeLoad,fakeScore);
 assert.deepEqual(result.eligible.map(s=>s.ticker),['ORCL']);
 assert.deepEqual(result.checks.map(c=>c.outcome),['CONFIRMED','ERROR']);
 assert.equal(outcomeFromSignal(signal('ORCL','NO DATA'),now),'NO_DATA');
 assert.equal(outcomeFromSignal(signal('ORCL','WAIT'),now),'NOT_CONFIRMED');
 assert.equal(skippedCustomTickers(['ORCL'])[0].outcome,'SKIPPED_CALENDAR');
});
test('custom diagnostic scanning refuses duplicate, core, or over-capacity tickers',async()=>{
 const load=async()=>{throw Error('should not fetch');};
 for(const symbols of [['ORCL','ORCL'],['QQQ'],['ORCL','META','PLTR','SOFI','RIVN']])
  await assert.rejects(inspectCustomTickers(symbols,now,session,load));
});

test('anonymous Health responses cannot expose owner custom ticker subscriptions',()=>{
 const data={access:'AVAILABLE',monitored:1,symbols:[{ticker:'ORCL',outcome:'CONFIRMED'}]};
 assert.deepEqual(ownerOnlyCustomPayload(false,data),{access:'OWNER_ONLY',monitored:null,symbols:[]});
 assert.deepEqual(ownerOnlyCustomPayload(true,data),data);
});
