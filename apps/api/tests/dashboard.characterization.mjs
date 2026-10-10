import assert from 'node:assert/strict';
import {Prisma} from '@erp/db';
import {dashboardSummary} from '../dist/modules/projects/dashboard-summary.js';

// Characterization from the owner's MEUBEAT Jan-2026 reconciliation:
// parent controls monthly totals; APP/IVR remain independently inspectable.
const row=(serviceId,name,type,revenue,wht,payable,period='2026-01')=>({serviceId,service:{serviceName:name},periodStart:new Date(period+'-01'),netAmount:new Prisma.Decimal(payable),calculationJson:{rowType:type,includeInMonthlyTotal:type==='TOTAL',invoiceRevenueUsd:revenue,invoiceWhtUsd:wht}});
const result=dashboardSummary([
 row('parent','MEUBEAT','TOTAL','520.68','52.07','468.61'),
 row('app','MEUBEAT APP','CHILD','518.61','51.86','466.75'),
 row('ivr','MEUBEAT IVR','CHILD','2.06','0.21','1.86')
]);
assert.equal(result.totalPayableUsd,'468.61');
assert.equal(result.series.filter(r=>r.total).length,1);
assert.equal(result.series.find(r=>r.total).revenue,'520.68');
assert.equal(result.series.find(r=>r.total).wht,'52.07');
assert.equal(result.series.find(r=>r.serviceId==='app').payable,'466.75');
assert.equal(result.services.length,3);
const mixed=dashboardSummary([row('parent','MEUBEAT','TOTAL','520.68','52.07','468.61'),row('parent','MEUBEAT','TOTAL','1.11','0.11','1.00'),row('parent','MEUBEAT','TOTAL','2.22','0.22','2.00','2025-12')]);
assert.equal(mixed.totalPayableUsd,'471.61');
assert.equal(mixed.series.length,2);
assert.equal(mixed.series.find(r=>r.period==='2026-01').revenue,'521.79');
assert.deepEqual(dashboardSummary([]),{totalPayableUsd:'0.00',nativeTotals:{USD:'0.00',VND:'0'},totals:{usd:'0.00',vnd:'0',missingUsd:0,missingVnd:0},services:[],series:[]});
const payableReport=dashboardSummary([row('parent','MEUBEAT','TOTAL','520.68','52.07','468.61'),row('app','MEUBEAT APP','CHILD','518.61','51.86','466.75')],new Map([['2026-01',{rate:'25000'}]]));
assert.equal(payableReport.totals.usd,'468.61');
assert.equal(payableReport.totals.vnd,'11715250');
assert.equal(payableReport.series.find(r=>r.total).payable,'468.61');
assert.equal(payableReport.series.find(r=>r.total).payableVnd,'11715250');
assert.notEqual(payableReport.series.find(r=>r.total).payable,payableReport.series.find(r=>r.total).revenue);
console.log('Dashboard: 15 DGC/GST characterization checks passed.');
