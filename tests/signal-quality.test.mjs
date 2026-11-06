import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataKey,journalMetadata,timeBucket,vwapBucket,volumeBucket,qualityBand,signalQuality} from '../lib/signal-quality.ts';
import {measureSignal,verifyReferenceCandle} from '../lib/signal-performance.ts';
import {decorateHistoricalMeasurement} from '../lib/historical-performance.ts';
const session={date:'2026-11-05',openMinute:570,closeMinute:960,isTradingDay:true,source:'ALPACA'};
const now=new Date('2026-11-05T20:30:00Z');
const sent=(id,ticker='QQQ',direction='CALL')=>({id,session_date:'2026-11-05',ticker,direction,price:100,bar_timestamp:'2026-11-05T15:10:00Z',sent_at:'2026-11-05T15:12:00Z',status:'sent'});
const bar=(offset,price)=>({t:new Date(Date.parse('2026-11-05T15:10:00Z')+offset*60000).toISOString(),o:price,h:price+1,l:price-1,c:price,v:100});
const make=(s,results,meta=null)=>({measurement:decorateHistoricalMeasurement(measureSignal(s,results,now,session),'2026-11-05'),meta});
const metadata=(ticker='QQQ',direction='CALL')=>({session_date:'2026-11-05',ticker,direction,bar_timestamp:'2026-11-05T15:10:00+00:00',observed_price:100,vwap:99.7,volume_ratio:1.6,feed:'IEX'});

test('metadata join key normalizes ISO instants and rejects mismatched ticker, direction and timestamp',()=>{
 const item=make(sent(1),[bar(5,102)],metadata());
 assert.equal(metadataKey(item.meta),'2026-11-05|QQQ|CALL|2026-11-05T15:10:00.000Z');
 assert.equal(journalMetadata(item.meta,item.measurement)?.ticker,'QQQ');
 assert.equal(journalMetadata({...item.meta,ticker:'AMZN'},item.measurement),null);
 assert.equal(journalMetadata({...item.meta,direction:'PUT'},item.measurement),null);
 assert.equal(journalMetadata({...item.meta,bar_timestamp:'2026-11-05T15:11:00Z'},item.measurement),null);
 assert.equal(journalMetadata({...item.meta,feed:'SIP'},item.measurement),null);
 assert.equal(journalMetadata({...item.meta,observed_price:99},item.measurement),null);
 assert.equal(metadataKey({...item.meta,bar_timestamp:'bad'}),null);
});
test('ET time bucket correctly handles US DST and four non-overlapping intraday windows',()=>{
 assert.equal(timeBucket('2026-11-05T14:42:00Z'),'09:30–10:29 ET');
 assert.equal(timeBucket('2026-11-05T15:30:00Z'),'10:30–11:59 ET');
 assert.equal(timeBucket('2026-11-05T18:00:00Z'),'12:00–13:59 ET');
 assert.equal(timeBucket('2026-11-05T19:00:00Z'),'14:00–15:59 ET');
 assert.equal(timeBucket('2026-07-01T13:31:00Z'),'09:30–10:29 ET');
 assert.equal(timeBucket('2026-11-05T13:00:00Z'),null);
});
test('VWAP distance and volume bins are precise, with no invented value for missing metadata',()=>{
 assert.equal(vwapBucket(100,100),'<0.25%');
 assert.equal(vwapBucket(100.25,100),'0.25–<0.75%');
 assert.equal(vwapBucket(100.75,100),'0.75–<1.5%');
 assert.equal(vwapBucket(102,100),'≥1.5%');
 assert.equal(vwapBucket(100,null),null);
 assert.equal(vwapBucket(100,0),null);
 assert.equal(volumeBucket(1.1),'<1.5×');
 assert.equal(volumeBucket(1.5),'1.5–<2.0×');
 assert.equal(volumeBucket(2),'≥2.0×');
 assert.equal(volumeBucket(null),null);
});
test('quality scorecard uses measured-only denominator, missing coverage and bounded Wilson intervals',()=>{
 const rows=[make(sent(1),[bar(5,101),bar(10,102),bar(15,103)]),make(sent(2,'AMZN','PUT'),[bar(5,101)]),make(sent(3,'NVDA'),[])];
 const h=qualityBand(rows,5);
 assert.equal(h.eligible,3);assert.equal(h.measured,2);assert.equal(h.favorable,1);assert.equal(h.unfavorable,1);
 assert.equal(h.missingOrInvalid,1);assert.equal(h.favorableRatePct,50);
 assert.ok(h.wilson95LowPct>0&&h.wilson95HighPct<100);
 const h15=qualityBand(rows,15);
 assert.equal(h15.measured,1);assert.equal(h15.missingOrInvalid,2);
 assert.equal(h15.favorableRatePct,100);
 assert.ok(h15.wilson95LowPct<100);
 const empty=qualityBand([],15);
 assert.equal(empty.favorableRatePct,null);assert.equal(empty.wilson95LowPct,null);
});
test('quality groups preserve CALL/PUT and tickers, with metadata unavailable explicit',()=>{
 const q=signalQuality([
  make(sent(1,'QQQ','CALL'),[bar(5,101)],metadata()),
  make(sent(2,'AMZN','PUT'),[bar(5,98)],metadata('AMZN','PUT')),
  make(sent(3,'NVDA','PUT'),[],null)
 ],true);
 assert.equal(q.sampleSize,3);assert.equal(q.coveragePartial,true);
 assert.equal(q.overall.bands[0].measured,2);
 assert.deepEqual(q.dimensions[0].groups.map(g=>g.key),['CALL','PUT']);
 assert.deepEqual(q.dimensions[1].groups.map(g=>g.key),['AMZN','NVDA','QQQ']);
 assert.equal(q.dimensions[3].available,2);assert.equal(q.dimensions[3].unavailable,1);
 assert.equal(q.dimensions[4].unavailable,1);
 assert.equal(q.eventDays.status,'UNAVAILABLE');
});
test('unverified underlying reference candle never becomes a quality win',()=>{
 const s=sent(1);
 const m=measureSignal(s,[bar(5,103)],now,session);
 assert.equal(verifyReferenceCandle(s,[bar(0,99)],now,session),'PRICE_MISMATCH');
 m.horizons=m.horizons.map(h=>h.status==='MEASURED'?{...h,status:'INVALID',directionalMovePct:null,price:null,stockMovePct:null,barAt:null}:h);
 const h=qualityBand([{measurement:decorateHistoricalMeasurement(m,'2026-11-05'),meta:metadata()}],5);
 assert.equal(h.eligible,1);assert.equal(h.measured,0);assert.equal(h.missingOrInvalid,1);
});
