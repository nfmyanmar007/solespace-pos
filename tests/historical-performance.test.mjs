import test from 'node:test';
import assert from 'node:assert/strict';
import {historyStart,historicalSegment,historicalAggregate,decorateHistoricalMeasurement} from '../lib/historical-performance.ts';
import {historicalQueryDays,validHistoricalSignal,historyPairs,MAX_HISTORY_PAIRS} from '../lib/historical-data.ts';
import {measureSignal,verifyReferenceCandle} from '../lib/signal-performance.ts';

const session={date:'2026-11-05',openMinute:570,closeMinute:960,isTradingDay:true,source:'ALPACA'};
const now=new Date('2026-11-05T21:00:00Z');
const sent=(id,ticker='QQQ',direction='PUT',date='2026-11-05')=>({
 id,session_date:date,ticker,direction,price:100,bar_timestamp:date+'T15:10:00Z',
 sent_at:date+'T15:12:02Z',status:'sent'
});
const bar=(minute,close,base='2026-11-05T15:10:00Z')=>({
 t:new Date(Date.parse(base)+minute*60000).toISOString(),o:close,h:close+.5,l:close-.5,c:close,v:100
});
test('history windows use inclusive NY session-date boundaries, including month and year crossover',()=>{
 assert.equal(historyStart('2026-11-06',7),'2026-10-31');
 assert.equal(historyStart('2026-11-06',30),'2026-10-08');
 assert.equal(historyStart('2026-11-06',90),'2026-08-09');
 assert.equal(historyStart('2026-01-02',7),'2025-12-27');
 assert.throws(()=>historyStart('2026-02-30',7));
 assert.throws(()=>historyStart('2026-11-06',91));
});
test('historical query only accepts fixed safe lookback windows',()=>{
 assert.equal(historicalQueryDays(null),7);
 assert.equal(historicalQueryDays('7'),7);
 assert.equal(historicalQueryDays('30'),30);
 assert.equal(historicalQueryDays('90'),90);
 for(const x of ['0','-1','91','1000','NaN','7&x=1'])assert.equal(historicalQueryDays(x),null);
});
test('the original eight are core and valid custom tickers are separately classified',()=>{
 assert.equal(historicalSegment('QQQ'),'CORE');
 assert.equal(historicalSegment('GOOGL'),'CORE');
 assert.equal(historicalSegment('AMZN'),'CUSTOM');
 assert.equal(historicalSegment('ORCL'),'CUSTOM');
});
test('historical record candidates exclude bad, failed and not-sent records',()=>{
 assert.equal(validHistoricalSignal(sent(46)),true);
 assert.equal(validHistoricalSignal(sent(47,'AMZN')),true);
 assert.equal(validHistoricalSignal({...sent(46),status:'failed'}),false);
 assert.equal(validHistoricalSignal({...sent(46),sent_at:null}),false);
 assert.equal(validHistoricalSignal({...sent(46),ticker:'QQQ;DROP'}),false);
 assert.equal(validHistoricalSignal({...sent(46),price:0}),false);
 assert.equal(validHistoricalSignal({...sent(46),direction:'SIDEWAYS'}),false);
});
test('history pairs group same-day ticker/direction records without losing custom symbols',()=>{
 const groups=historyPairs([sent(1),sent(2,'QQQ','CALL'),sent(3,'AMZN'),sent(4,'ORCL'),sent(5,'AMZN','PUT','2026-11-04')]);
 assert.equal(groups.length,4);
 assert.equal(groups.find(x=>x.key==='2026-11-05|QQQ').signals.length,2);
 assert.equal(groups.find(x=>x.key==='2026-11-05|AMZN').signals.length,1);
 assert.equal(MAX_HISTORY_PAIRS,60);
});
test('computed history summarizes verified exact +5/10/15m outcomes with proper denominators',()=>{
 const s1=sent(46,'QQQ','PUT'),s2=sent(47,'AMZN','CALL');
 const m1=measureSignal(s1,[bar(5,98),bar(10,97),bar(15,96)],now,session);
 const m2=measureSignal(s2,[bar(5,101),bar(15,99)],now,session);
 assert.equal(verifyReferenceCandle(s1,[bar(0,100)],now,session),'MATCHED');
 const rows=[decorateHistoricalMeasurement(m1,'2026-11-05'),decorateHistoricalMeasurement(m2,'2026-11-05')];
 const h=historicalAggregate(rows,'2026-11-06',7);
 assert.equal(h.signals,2);
 assert.equal(h.scorecard[0].measured,2);
 assert.equal(h.scorecard[0].favorable,2);
 assert.equal(h.scorecard[1].measured,1);
 assert.equal(h.scorecard[1].missing,1);
 assert.equal(h.scorecard[2].favorable,1);
 assert.equal(h.scorecard[2].unfavorable,1);
 assert.equal(h.segments.find(x=>x.key==='CORE').signals,1);
 assert.equal(h.segments.find(x=>x.key==='CUSTOM').signals,1);
 assert.deepEqual(h.tickers.map(x=>x.key),['AMZN','QQQ']);
 assert.deepEqual(h.daily.map(x=>x.key),['2026-11-05']);
});
test('out-of-window results never enter 7-day averages but may enter 90-day averages',()=>{
 const sample=decorateHistoricalMeasurement(measureSignal(sent(46),[bar(5,98)],now,session),'2026-09-01');
 assert.equal(historicalAggregate([sample],'2026-11-06',7).signals,0);
 assert.equal(historicalAggregate([sample],'2026-11-06',30).signals,0);
 assert.equal(historicalAggregate([sample],'2026-11-06',90).signals,1);
});
test('no data displays empty scorecard instead of invented win rate',()=>{
 const h=historicalAggregate([],'2026-11-06',90);
 assert.equal(h.signals,0);
 assert.equal(h.scorecard[0].averageDirectionalPct,null);
 assert.equal(h.segments[0].signals,0);
 assert.equal(h.segments[1].signals,0);
});
