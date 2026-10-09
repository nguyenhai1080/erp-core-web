import {Prisma} from '@erp/db';
import type {InvoiceLine} from './invoice-template.js';
type Source={id:string;serviceId:string;contractId:string;service:{serviceName:string};calculationJson:unknown};
// Owner override: bill and print parent TOTAL only, never expand CHILD on Invoice.
export function invoiceParentLines(rows:Source[],period:string):InvoiceLine[]{
 return rows.filter(v=>{const j=v.calculationJson as any;return j?.rowType==='TOTAL'&&j?.includeInMonthlyTotal===true;}).map(v=>{
  const j=v.calculationJson as any,amount=(s:string)=>new Prisma.Decimal(s).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
  return {revenueId:v.id,serviceId:v.serviceId,serviceName:v.service.serviceName,groupServiceId:v.serviceId,contractId:v.contractId,description:v.service.serviceName+' · '+period,revenue:amount(j.invoiceRevenueUsd),wht:amount(j.invoiceWhtUsd),payable:amount(j.invoicePayableUsd),uploadId:j.uploadId,lineNo:j.lineNo};
 });
}
