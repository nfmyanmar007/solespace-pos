// Best-effort per-process budget. NOT a distributed/global rate limit.
// Protects a warm instance from rapid repeated requests; enforce a distributed
// edge/WAF limit as a separate deployment control for abuse across instances.
const WINDOW_MS=60_000;
const MAX_REQUESTS=15;
let windowStarted=0;
let requests=0;
export function allowPerformanceRead(now=Date.now()):boolean{
 if(!Number.isFinite(now))return false;
 if(now<windowStarted||now-windowStarted>=WINDOW_MS){windowStarted=now;requests=0;}
 if(requests>=MAX_REQUESTS)return false;
 requests++;
 return true;
}
// A cached payload is returned only AFTER owner authentication. In-flight
// promises coalesce overlapping reads; failed results are never stored.
export function shortLivedServerCache<T>(ttlMs:number){
 let item:{expires:number;value:T}|null=null;
 let inflight:Promise<T>|null=null;
 return {
  async get(loader:()=>Promise<T>,now=Date.now()):Promise<T>{
   if(item&&now<item.expires)return item.value;
   if(inflight)return inflight;
   const job=loader();
   inflight=job;
   try{
    const value=await job;
    item={expires:Date.now()+ttlMs,value};
    return value;
   }finally{if(inflight===job)inflight=null;}
  },
  clear(){item=null;inflight=null;}
 };
}
