import test from 'node:test';
import assert from 'node:assert/strict';
import {CORE_TICKERS,MAX_WATCHLIST,cleanSymbol,parseSavedWatchlist,canAddSymbol,eligibleAsset} from '../lib/watchlist.ts';
test('symbol parser normalizes supported US common ticker forms and rejects URL/code injection',()=>{
 assert.equal(cleanSymbol(' orcl '),'ORCL');assert.equal(cleanSymbol('brk.b'),'BRK.B');
 for(const input of ['ORCL/../QQQ','<script>','ORCL&x','ORCL?x','TOOLONG','ABC-1',''])assert.equal(cleanSymbol(input),null,input);
});
test('saved browser list drops corrupted, duplicate and scanner symbols',()=>{
 assert.deepEqual(parseSavedWatchlist(['orcl','ORCL','QQQ','META',3,'TSLA','bad?','PLTR']),['ORCL','META','PLTR']);
 assert.deepEqual(parseSavedWatchlist(null),[]);
 assert.equal(CORE_TICKERS.length,8);
});
test('custom list enforces twenty total symbols and protects scanner originals',()=>{
 assert.equal(canAddSymbol([],'SPY').ok,false);
 assert.equal(canAddSymbol(['ORCL'],'orcl').ok,false);
 assert.equal(canAddSymbol(['ORCL'],'meta').symbol,'META');
 const max=Array.from({length:MAX_WATCHLIST-CORE_TICKERS.length},(_,i)=>'X'+i);
 assert.equal(canAddSymbol(max,'META').ok,false);
});
test('Alpaca asset validation excludes untradable, inactive and non-US assets',()=>{
 const ok={symbol:'ORCL',name:'Oracle Corporation',class:'us_equity',tradable:true,status:'active'};
 assert.equal(eligibleAsset('ORCL',ok).ok,true);
 assert.equal(eligibleAsset('ORCL',{...ok,status:'inactive'}).ok,false);
 assert.equal(eligibleAsset('ORCL',{...ok,tradable:false}).ok,false);
 assert.equal(eligibleAsset('ORCL',{...ok,class:'crypto'}).ok,false);
 assert.equal(eligibleAsset('QQQ',ok).ok,false);
 assert.equal(eligibleAsset('ORCL',null).ok,false);
});
test('malformed local saved list is capped to twelve custom symbols',()=>{
 const symbols=Array.from({length:16},(_,i)=>String.fromCharCode(65+i)+'Y');
 assert.equal(parseSavedWatchlist(symbols).length,12);
});
