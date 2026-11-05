import test from 'node:test';
import assert from 'node:assert/strict';
import {exitWindow,confirmedExitWindow} from '../lib/exit-window.ts';
const bar='2026-11-05T15:05:00Z'; // 10:05 ET, candle begins at :05, closes :06
const at=x=>new Date('2026-11-05T15:'+x+':00Z');
test('live confirmation exit window starts after completed candle',()=>{
 const p=confirmedExitWindow('CONFIRMED CALL',bar,at('07'));
 assert.equal(p.confirmedAt,'2026-11-05T15:06:00.000Z');
 assert.equal(p.reviewAt,'2026-11-05T15:11:00.000Z');
 assert.equal(p.timeboxAt,'2026-11-05T15:21:00.000Z');
 assert.equal(p.phase,'MONITOR');
 assert.equal(confirmedExitWindow('CONFIRMED PUT',bar,at('12')).phase,'REVIEW EXIT');
 assert.equal(confirmedExitWindow('CONFIRMED CALL',bar,at('22')).phase,'TIMEBOX ELAPSED');
});
test('sent Telegram alert plans are timed from actual alert delivery, not candle open',()=>{
 const p=exitWindow('2026-11-05T15:07:40Z',new Date('2026-11-05T15:13:00Z'));
 assert.equal(p.reviewAt,'2026-11-05T15:12:40.000Z');
 assert.equal(p.timeboxAt,'2026-11-05T15:22:40.000Z');
 assert.equal(p.phase,'REVIEW EXIT');
});
test('no sell-time hints from WAIT, READY, DEMO, premarket or missing records',()=>{
 for(const status of ['WAIT','PRELIMINARY','NO PREMARKET DATA','RESEARCH CALL','READY','STALE','DEMO'])
  assert.equal(confirmedExitWindow(status,bar,at('12')),null);
 for(const value of ['',null,'invalid','2026-11-06T15:05:00Z','2026-11-04T15:05:00Z'])
  assert.equal(exitWindow(value,at('12')),null);
});
test('timebox is informational and does not return any trade price or order intent',()=>{
 const p=confirmedExitWindow('CONFIRMED PUT',bar,at('22'));
 assert.deepEqual(Object.keys(p).sort(),['confirmedAt','phase','reviewAt','timeboxAt'].sort());
});
