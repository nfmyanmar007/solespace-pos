import test from 'node:test';
import assert from 'node:assert/strict';
import {DASHBOARD_TABS,isDashboardTab} from '../lib/dashboard-tabs.ts';
test('dashboard sections are unique and appear in requested sequence',()=>{
 assert.deepEqual(DASHBOARD_TABS.map(t=>t.key),['watchlist','chart','alerts','rules']);
 assert.equal(new Set(DASHBOARD_TABS.map(t=>t.key)).size,4);
});
test('tabs have accessible nonempty labels and navigation titles',()=>{
 for(const t of DASHBOARD_TABS){assert.ok(t.label.trim());assert.ok(t.shortLabel.trim());}
});
test('invalid and unsafe tab ids are never recognized',()=>{
 for(const v of ['scanner','telegram','<script>','',undefined,5])assert.equal(isDashboardTab(v),false);
 for(const t of DASHBOARD_TABS)assert.equal(isDashboardTab(t.key),true);
});
