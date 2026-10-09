import {Prisma} from '@erp/db';

type Row={periodStart:Date;serviceId:string;service:{serviceName:string};netAmount:Prisma.Decimal;calculationJson:unknown};
// DGC v61 Dashboard: aggregate TOTAL only; explicit service filters may show CHILD.
export function dashboardSummary(rows:Row[]){
 const D=Prisma.Decimal,buckets=new Map<string,any>(),services=new Map<string,string>();let payable=new D(0);
 for(const r of rows){
  const j=r.calculationJson as any,total=j?.rowType==='TOTAL'&&j?.includeInMonthlyTotal===true;
  if(!total&&!(j?.rowType==='CHILD'&&j?.includeInMonthlyTotal===false))continue;
  services.set(r.serviceId,r.service.serviceName);
  if(total)payable=payable.plus(r.netAmount);
  const period=r.periodStart.toISOString().slice(0,7),key=period+'|'+r.serviceId+'|'+total;
  if(!buckets.has(key))buckets.set(key,{period,serviceId:r.serviceId,total,revenue:new D(0),wht:new D(0),payable:new D(0)});
  const b=buckets.get(key);b.revenue=b.revenue.plus(j.invoiceRevenueUsd??0);b.wht=b.wht.plus(j.invoiceWhtUsd??0);b.payable=b.payable.plus(r.netAmount);
 }
 const fixed=(n:Prisma.Decimal)=>n.toDecimalPlaces(2,D.ROUND_HALF_UP).toFixed(2);
 return {totalPayableUsd:fixed(payable),services:[...services].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name)),series:[...buckets.values()].map(b=>({...b,revenue:fixed(b.revenue),wht:fixed(b.wht),payable:fixed(b.payable)}))};
}
