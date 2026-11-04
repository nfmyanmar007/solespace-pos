import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSession,sessionState,easternClock} from '../lib/market-calendar.ts';
import {evaluate} from '../lib/engine.ts';
const on=(date,open='09:30',close='16:00')=>resolveSession(date,[{date,open,close}]);
const at=(stamp)=>new Date(stamp);
const session=on('2026-11-04');
function bars({skip=null,pattern='bull',bad=false}={}){
 const rows=[];
 for(let i=0;i<35;i++){
  if(i===skip)continue;
  const minutes=30+i, hh=Math.floor((9*60+minutes)/60),mm=(9*60+minutes)%60;
  const ts=`2026-11-04T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00-05:00`;
  const isOpen=i<5;
  const c=isOpen?100:pattern==='bull'?100.25+i*.012:99.75-i*.012;
  const v=i===34?2000:1000;
  rows.push({t:new Date(ts).toISOString(),o:c,h:c+.15,l:c-.15,c,v});
 }
 if(bad)rows[34]={...rows[34],h:1};
 return rows;
}
test('calendar exposes authoritative early close',()=>{
 const d=on('2026-11-27','09:30','13:00');
 assert.equal(sessionState(at('2026-11-27T12:59:00-05:00'),d),'REGULAR SESSION');
 assert.equal(sessionState(at('2026-11-27T13:01:00-05:00'),d),'AFTER HOURS');
});
test('market holiday is closed even on a weekday',()=>{
 const d=resolveSession('2026-11-26',[]);
 assert.equal(sessionState(at('2026-11-26T11:00:00-05:00'),d),'MARKET CLOSED');
 assert.equal(evaluate('QQQ',bars(),at('2026-11-26T11:00:00-05:00'),d).status,'NO TRADE');
});
test('calendar network failure fails closed',()=>{
 assert.equal(sessionState(at('2026-11-04T10:06:00-05:00'),null),'CALENDAR UNAVAILABLE');
 assert.equal(evaluate('QQQ',bars(),at('2026-11-04T10:06:00-05:00'),null).status,'NO TRADE');
});
test('regular candle must be complete and cannot be future-dated',()=>{
 const rows=bars();
 const now=at('2026-11-04T10:04:30-05:00');
 const s=evaluate('QQQ',rows,now,session);
 assert.notEqual(s.timestamp,rows.at(-1).t);
});
test('invalid OHLCV candles are removed before scoring',()=>{
 const rows=bars({bad:true});
 const s=evaluate('QQQ',rows,at('2026-11-04T10:05:20-05:00'),session);
 assert.notEqual(s.status,'CONFIRMED CALL');
});
test('incomplete opening range produces NO TRADE',()=>{
 const s=evaluate('QQQ',bars({skip:2}),at('2026-11-04T10:05:20-05:00'),session);
 assert.equal(s.status,'NO TRADE');
});
test('stale last candle cannot become a confirmed signal',()=>{
 const s=evaluate('QQQ',bars(),at('2026-11-04T10:20:20-05:00'),session);
 assert.equal(s.status,'STALE');
});
test('two consecutive completed candles, VWAP, direction and volume allow CALL',()=>{
 const s=evaluate('QQQ',bars(),at('2026-11-04T10:05:20-05:00'),session);
 assert.equal(s.status,'CONFIRMED CALL');
});
test('volume below 1.10x prevents CALL confirmation',()=>{
 const rows=bars();rows.at(-1).v=500;
 const s=evaluate('QQQ',rows,at('2026-11-04T10:05:20-05:00'),session);
 assert.notEqual(s.status,'CONFIRMED CALL');
});
test('bad market calendar data is rejected',()=>{
 assert.throws(()=>resolveSession('2026-11-04',{calendar:'bad'}));
 assert.throws(()=>resolveSession('2026-11-04',[{date:'2026-11-04',open:'09:30',close:'garbage'}]));
});

test('invalid timestamps are ignored without crashing the ticker scan',()=>{
 const rows=bars();rows.push({...rows.at(-1),t:'not-a-date'});
 const s=evaluate('QQQ',rows,at('2026-11-04T10:05:20-05:00'),session);
 assert.equal(s.status,'CONFIRMED CALL');
});
test('completed bearish breakdown with volume can confirm PUT',()=>{
 const s=evaluate('QQQ',bars({pattern:'bear'}),at('2026-11-04T10:05:20-05:00'),session);
 assert.equal(s.status,'CONFIRMED PUT');
});
