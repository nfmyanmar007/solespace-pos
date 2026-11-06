// V3.4: deterministic, manually supplied option-premium risk worksheet.
// No market-data feed, brokerage link, persistence, or trading instructions.
export type PositionInput={
 ticker:string;side:'CALL'|'PUT';strike:number;expiration:string;
 quantity:number;multiplier:number;entryPremium:number;
 stopPremium:number;targetPremium:number;currentPremium:number|null;
};
export type PositionReview='AWAITING_QUOTE'|'BELOW_STOP_REVIEW'|'AT_TARGET_REVIEW'|'BETWEEN_LEVELS';
export type PositionResult={
 entryCost:number;plannedLoss:number;plannedGain:number;riskReward:number;
 breakEvenAtExpiry:number;currentValue:number|null;pnl:number|null;
 pnlPct:number|null;review:PositionReview;
};
const cents=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const validMoney=(n:number)=>Number.isFinite(n)&&n>0&&n<=100000;
export function evaluateManualPosition(p:PositionInput):PositionResult{
 if(!/^[A-Z]{1,5}$/.test(p.ticker)||!Number.isFinite(p.strike)||p.strike<=0||
  p.strike>100000||!/^\d{4}-\d{2}-\d{2}$/.test(p.expiration)||
  !Number.isFinite(Date.parse(p.expiration+'T12:00:00Z'))||
  new Date(p.expiration+'T12:00:00Z').toISOString().slice(0,10)!==p.expiration||
  (p.side!=='CALL'&&p.side!=='PUT')||
  !Number.isSafeInteger(p.quantity)||p.quantity<1||p.quantity>1000||
  !Number.isSafeInteger(p.multiplier)||p.multiplier<1||p.multiplier>10000||
  ![p.entryPremium,p.stopPremium,p.targetPremium].every(validMoney)||
  p.stopPremium>=p.entryPremium||p.targetPremium<=p.entryPremium||
  (p.currentPremium!==null&&!validMoney(p.currentPremium)))
  throw new Error('Enter a valid contract and premiums: stop < entry < target. No zero, negative, or invalid prices.');
 const units=p.quantity*p.multiplier;
 const entryCost=cents(units*p.entryPremium);
 const plannedLoss=cents(units*(p.entryPremium-p.stopPremium));
 const plannedGain=cents(units*(p.targetPremium-p.entryPremium));
 const riskReward=cents(plannedGain/plannedLoss);
 const breakEvenAtExpiry=cents(p.side==='CALL'?p.strike+p.entryPremium:p.strike-p.entryPremium);
 const currentValue=p.currentPremium===null?null:cents(units*p.currentPremium);
 const pnl=currentValue===null?null:cents(currentValue-entryCost);
 const pnlPct=pnl===null?null:cents((pnl/entryCost)*100);
 const review:PositionReview=p.currentPremium===null?'AWAITING_QUOTE':
  p.currentPremium<=p.stopPremium?'BELOW_STOP_REVIEW':
  p.currentPremium>=p.targetPremium?'AT_TARGET_REVIEW':'BETWEEN_LEVELS';
 return {entryCost,plannedLoss,plannedGain,riskReward,breakEvenAtExpiry,
  currentValue,pnl,pnlPct,review};
}
