// Presentation-only navigation. No scanner, Telegram or persistence logic changes.
export const DASHBOARD_TABS=[
 {key:'watchlist',label:'Watchlist',shortLabel:'Live Watchlist',icon:'▦'},
 {key:'chart',label:'Charts',shortLabel:'Charts & Indicators',icon:'◫'},
 {key:'alerts',label:'Alerts',shortLabel:'Telegram Alerts',icon:'◉'},
 {key:'rules',label:'Rules',shortLabel:'Trading Rules',icon:'☑'}
] as const;
export type DashboardTab=typeof DASHBOARD_TABS[number]['key'];
export function isDashboardTab(value:unknown):value is DashboardTab{
 return typeof value==='string'&&DASHBOARD_TABS.some(t=>t.key===value);
}
