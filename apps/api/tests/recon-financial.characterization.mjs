import {parseReconIdentity} from '../dist/modules/projects/recon-identity.js';
import assert from 'node:assert/strict';
import {parseReconFinancial,correctFinancial,englishMoneyWords} from '../dist/modules/projects/recon-financial.js';
import {usdWords} from '../dist/modules/projects/invoice-template.js';
// Synthetic fixtures encode verified DGC v61 expectations, not live GST/DGC data.
export const singleText=`STATEMENT CONFIRMATION ON SHARING REVENUE OF TESTSERVICE BETWEEN
Under the Agreement No.: SYNTHETIC-001 signed on: 01/01/2026
Service: TESTSERVICE
Period: Jan-2026
Exchange rate: 64.5
1 TESTSERVICE 1,160.00 160.00 0.00 1,000.00 10.00% 100.00% 100.00 10.00 90.00
In MZN 1,160.00 160.00 1,000.00 100.00 10.00 90.00
In USD 17.98 2.48 15.50 1.55 0.16 1.40
The Total revenue in January of DIGICOM is: 1.40 USD
(In word: One US Dollars and Forty Cents Only)`;
export const bundleText=`STATEMENT CONFIRMATION ON SHARING REVENUE OF MCAVM - ISIGN BETWEEN
Under the Agreement No.: SYNTHETIC-BUNDLE signed on: 01/01/2026
Service: MCAVM - ISIGN
Period: Jan-2026
Exchange rate: 64.5
1 VOICEMAIL 1,160.00 160.00 0.00 1,000.00 10.00% 100.00% 100.00 10.00 90.00
2 ISIGN 1,160.00 160.00 0.00 1,000.00 10.00% 100.00% 100.00 10.00 90.00
3 MCA 1,160.00 160.00 0.00 1,000.00 10.00% 100.00% 100.00 10.00 90.00
In MZN 3,480.00 480.00 3,000.00 300.00 30.00 270.00
In USD 53.95 7.44 46.51 4.65 0.47 4.19
The Total revenue in January of DIGICOM is: 4.19 USD
(In word: Four US Dollars and Nineteen Cents Only)`;
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
check(parseReconIdentity(singleText).service,'TESTSERVICE');check(englishMoneyWords('Six thousands Eight hundreds Seventy Dollars and Seventy Five Cents'),'6870.75');
const a=parseReconFinancial(singleText);check(a.errors,[]);check(a.ready,true);check(a.details.length,1);check(a.details[0].rowType,'TOTAL');check(a.usd.remunerationProvider,'1.55');check(a.usd.wht,'0.16');check(a.usd.partnerRevenue,'1.40');check(a.details[0].usd.partnerRevenue,'1.40');
const b=parseReconFinancial(bundleText);check(b.errors,[]);check(b.ready,true);check(b.details.map(d=>d.rowType),['CHILD','CHILD','CHILD','TOTAL']);check(b.details.at(-1).usd.partnerRevenue,'4.19');check(b.details[0].usd.partnerRevenue,'1.40');
const edited=correctFinancial(b,[{lineNo:1,revenueMzn:'200'}],'Synthetic verified correction');check(edited.details[0].wht,'20.00');check(edited.details[0].partnerRevenue,'180.00');check(edited.mzn.remunerationProvider,'400.00');check(edited.mzn.wht,'40.00');check(edited.usd.partnerRevenue,'5.58');check(edited.details.at(-1).usd.partnerRevenue,'5.58');
check(correctFinancial(a,[{lineNo:1,revenueMzn:'100.00'}],'unchanged').usd.partnerRevenue,'1.40');
assert.throws(()=>correctFinancial(b,[{lineNo:4,revenueMzn:'200'}],'bad'));checks++;
assert.throws(()=>correctFinancial(b,[{lineNo:1,revenueMzn:'100'},{lineNo:1,revenueMzn:'200'}],'duplicate'));checks++;
for(const broken of [singleText.replace('Exchange rate: 64.5','Exchange rate: 0'),singleText.replace('1.40 USD','3.00 USD'),singleText.replace('Forty Cents','Ninety Cents'),singleText.replace('In MZN 1,160.00','In MZN 9,160.00'),bundleText.replace(/2 ISIGN.*\n/,''),singleText+'\nIn USD 17.98 2.48 15.50 1.55 0.16 8.40']){check(parseReconFinancial(broken).ready,false);}
check(englishMoneyWords('One hundred and twenty-three US Dollars and forty-five Cents Only'),'123.45');check(englishMoneyWords('Unknown dollars'),null);check(usdWords('4.19'),'Four US Dollars and Nineteen Cents Only');
const columns=singleText.replace(/1 TESTSERVICE.*\nIn MZN.*\nIn USD.*\n/,'Sharing Rate 10.00% Revenue ratio 100.00% Service sharing 1,000.00 Cost or Excluding IVA Tax (16%) 160.00 Total service revenue (3) 1,160.00\n');check(parseReconFinancial(columns).source,'SINGLE_LABELLED_COLUMNS');check(parseReconFinancial(columns).ready,true);check(parseReconFinancial(columns).usd.partnerRevenue,'1.40');
const historical=`STATEMENT REVENUE OF MOVTV (CONTENT) SERVICE
MONTH: Jan-26
SHARING REVENUE
1 MOVTV TEST PARTNER Jan-26 2,925.00 1,170.00 1,000.00 470.00 47.00 423.00
Total Revenue in MZN 2,925.00 1,170.00 1,000.00 470.00 47.00 423.00
Total Revenue in USD 45.36 18.14 15.51 7.29 0.73 6.56
The Total revenue in period Jan-26 for TEST PARTNER is: 6.56 USD
(In word: Six Dollars and Fifty Six Cents)`;
const hist=parseReconFinancial(historical);check(hist.source,'HISTORICAL_MOVTV');check(hist.ready,true);check(hist.mzn.partnerRevenue,'423.00');check(hist.usd.partnerRevenue,'6.56');check(parseReconFinancial(historical.replace('Fifty Six','Seventy Five')).ready,false);
console.log(`PASS: ${checks} DGC financial characterization checks (independent Decimal USD, aggregate/child, corrections, source/word guards).`);
