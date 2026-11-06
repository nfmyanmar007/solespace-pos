// V3.1: pure historical aggregation, no options fills or inferred trades.
import {CORE_TICKERS} from './watchlist.ts';
import {summarizeMeasurements,type SignalMeasurement,type MetricSummary} from './signal-performance.ts';
export type HistoricalMeasurement=SignalMeasurement&{sessionDate:string;segment:'CORE'|'CUSTOM'};
export type PeriodDays=7|30|90;
export type HistoricalGroup={key:string;signals:number;scorecard:MetricSummary[]};
export const HISTORY_PERIODS=[7,30,90] as const;
export function historyStart(date:string,days:number):string{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(days)||days<1||days>90)throw Error('Invalid historical date window');
 const start=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(start.getTime())||start.toISOString().slice(0,10)!==date)throw Error('Invalid date');
 start.setUTCDate(start.getUTCDate()-(days-1));
 return start.toISOString().slice(0,10);
}
export function historicalSegment(ticker:string):'CORE'|'CUSTOM'{
 return (CORE_TICKERS as readonly string[]).includes(ticker)?'CORE':'CUSTOM';
}
export function historicalAggregate(rows:HistoricalMeasurement[],endDate:string,days:PeriodDays){
 const from=historyStart(endDate,days);
 const selected=rows.filter(r=>r.sessionDate>=from&&r.sessionDate<=endDate);
 const summarize=(key:string,subset:HistoricalMeasurement[]):HistoricalGroup=>({key,signals:subset.length,scorecard:summarizeMeasurements(subset)});
 const dates=[...new Set(selected.map(r=>r.sessionDate))].sort().reverse();
 const symbols=[...new Set(selected.map(r=>r.ticker))].sort();
 return {
  days,from,to:endDate,signals:selected.length,scorecard:summarizeMeasurements(selected),
  daily:dates.map(date=>summarize(date,selected.filter(r=>r.sessionDate===date))),
  tickers:symbols.map(ticker=>summarize(ticker,selected.filter(r=>r.ticker===ticker))),
  segments:['CORE','CUSTOM'].map(segment=>summarize(segment,selected.filter(r=>r.segment===segment)))
 };
}
export function decorateHistoricalMeasurement(row:SignalMeasurement,date:string):HistoricalMeasurement{
 return {...row,sessionDate:date,segment:historicalSegment(row.ticker)};
}
