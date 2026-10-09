import AdmZip from 'adm-zip';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument,rgb} from 'pdf-lib';
import {Prisma} from '@erp/db';
import {CommandError} from './commands.js';
import {drawPlacement,image,type Placement} from './financial-documents.js';

const xml=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const decode=(v:string)=>v.replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
export function readGstTemplate(bytes:Buffer){
 try{
  const zip=new AdmZip(bytes),book=zip.readAsText('xl/workbook.xml'),sheet=zip.readAsText('xl/worksheets/sheet1.xml'),strings=zip.readAsText('xl/sharedStrings.xml');
  if(/<!DOCTYPE|<!ENTITY/.test(book+sheet+strings)||!book.includes('Invoice Feb 2019')||sheet.length>2*1024*1024||strings.length>2*1024*1024)throw new Error();
  const shared=[...strings.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>[...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(t=>decode(t[1])).join(''));
  function cell(ref:string){const c=sheet.match(new RegExp('<c\\b[^>]*r="'+ref+'"[^>]*>[\\s\\S]*?<\\/c>'))?.[0]??'',v=c.match(/<v>([\s\S]*?)<\/v>/)?.[1]??'';return (c.includes('t="s"')?shared[Number(v)]??'':decode(v)).replace(/^'/,'').trim();}
  if(!/GST/i.test(cell('B1'))||!cell('C22')||!cell('C23')||!cell('C25')||!cell('C26'))throw new Error();
  const logo=zip.getEntries().filter(e=>/^xl\/media\/.*\.(?:jpe?g|png)$/i.test(e.entryName));
  if(logo.length!==1||logo[0].header.size>5*1024*1024)throw new Error();
  return {issuerName:cell('B1'),address:cell('C2'),taxCode:cell('C3'),phone:cell('C4'),bank:{beneficiary:cell('C22'),bankName:cell('C23'),bankAddress:cell('C24'),account:cell('C25'),swift:cell('C26')},logo:logo[0].getData(),logoMime:/\.png$/i.test(logo[0].entryName)?'image/png':'image/jpeg',layout:'GST_MOVIGAME_V1' as const};
 }catch{throw new CommandError(409,'Template chưa khớp mẫu GST đã cung cấp (Invoice Feb 2019). Kiểm tra hoặc thay lại template GST gốc.');}
}
export type InvoiceLine={revenueId:string;serviceId:string;serviceName:string;groupServiceId:string;contractId:string;description:string;revenue:string;wht:string;payable:string;uploadId:string;lineNo:number};
export type InvoiceData={invoiceNumber:string;invoiceDate:string;dueDate:string;period:string;paymentTermDays:number;companyName:string;companyCode:string;partner:{name:string;address:string;registration:string;tax:string;attn:string;email:string};lines:InvoiceLine[];totals:{revenue:string;wht:string;payable:string};amountInWords:string;agreementNumbers:string[]};
const D=(s:string)=>new Prisma.Decimal(s);
export function usdWords(amount:string){
 const small=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
 const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
 const part=(n:number):string=>n<20?small[n]:n<100?tens[Math.floor(n/10)]+(n%10?' '+small[n%10]:''):small[Math.floor(n/100)]+' Hundred'+(n%100?' '+part(n%100):'');
 const cents=D(amount).mul(100).toDecimalPlaces(0).toFixed(0),b=BigInt(cents),whole=b/100n;
 if(whole>999999999999n)throw new CommandError(422,'Số tiền vượt giới hạn đọc bằng chữ.');
 let n=Number(whole),chunks:string[]=[];for(const scale of [[1e9,'Billion'],[1e6,'Million'],[1e3,'Thousand']] as const){const q=Math.floor(n/scale[0]);if(q){chunks.push(part(q)+' '+scale[1]);n%=scale[0];}}if(n||!chunks.length)chunks.push(part(n));return chunks.join(' ')+' US Dollars and '+part(Number(b%100n))+' Cents Only';
}
export function fillGstWorkbook(template:Buffer,data:InvoiceData){
 readGstTemplate(template);const zip=new AdmZip(template);let sheet=zip.readAsText('xl/worksheets/sheet1.xml');
 const values:Record<string,string|number>={B1:data.companyName,C6:data.invoiceNumber,C7:data.invoiceDate,C8:data.dueDate,C9:data.partner.name,C10:data.partner.address,C11:data.partner.registration,C12:data.partner.tax,C13:data.partner.attn,B14:'Under the Agreement No.: '+data.agreementNumbers.join('; '),C17:data.lines.map(l=>l.description).join('\n'),D17:D(data.totals.revenue).toFixed(2),D18:D(data.totals.wht).toFixed(2),D19:D(data.totals.payable).toFixed(2),C20:data.amountInWords,C27:data.invoiceNumber,D27:''};
 for(const [ref,value] of Object.entries(values)){
  const re=new RegExp('<c\\b[^>]*r="'+ref+'"[^>]*>[\\s\\S]*?<\\/c>'),old=sheet.match(re)?.[0];if(!old)throw new CommandError(409,'Template thiếu ô '+ref+'.');
  const style=old.match(/\bs="(\d+)"/)?.[1],c='<c r="'+ref+'"'+(style?' s="'+style+'"':'')+(['D17','D18','D19'].includes(ref)?'><v>'+String(value)+'</v>':' t="inlineStr"><is><t xml:space="preserve">'+xml(String(value))+'</t></is>')+'</c>';sheet=sheet.replace(re,c);
 }
 // Cached macro/formula values are replaced only for mapped live invoice cells.
 // All VBA, drawings, source sheets and unmodified package entries are retained.
 zip.updateFile('xl/worksheets/sheet1.xml',Buffer.from(sheet));return zip.toBuffer();
}
export async function renderGstInvoice(data:InvoiceData,template:ReturnType<typeof readGstTemplate>,signing:{bytes:Buffer;mime:string|null},placement:Placement,includeSigning=true){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(await readFile(fileURLToPath(new URL('../../../assets/fonts/NotoSans-Regular.ttf',import.meta.url))),{subset:true});
 let page=doc.addPage([595.28,841.89]);const black=rgb(.06,.12,.18),border=rgb(.6,.65,.7),left=40,right=555;
 const text=(s:string,x:number,y:number,size=10)=>page.drawText(s,{x,y,size,font,color:black});
 const wrap=(s:string,width:number,size=10)=>{const out:string[]=[];let line='';for(const word of s.split(/\s+/)){if(font.widthOfTextAtSize((line?line+' ':'')+word,size)>width&&line){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out;};
 const block=(s:string,x:number,y:number,width:number,size=10)=>{const lines=wrap(s,width,size);for(const line of lines){text(line,x,y,size);y-=size+4;}return y;};
 const logo=await image(doc,template.logo,template.logoMime),ld=logo.scaleToFit(125,55);page.drawImage(logo,{x:right-ld.width,y:765,width:ld.width,height:ld.height});
 let y=block(data.companyName,left,802,365,12);y=block(template.address,left,y-4,360,9);text('Tax code: '+template.taxCode,left,y-3,9);text('Tel: '+template.phone,left,y-17,9);
 text('INVOICE',230,703,21);text('No.: '+data.invoiceNumber,320,675,11);text('Date: '+data.invoiceDate,320,658);text('Due date: '+data.dueDate,320,641);
 y=block('TO: '+data.partner.name,left,612,500,11);y=block(data.partner.address,left,y-2,500,9);
 text('Business registration: '+data.partner.registration,left,y-2,9);y-=18;text('Tax registration: '+data.partner.tax,left,y,9);y-=18;
 y=block('Attn: '+data.partner.attn+'   '+data.partner.email,left,y,500,9);y=block('Under the Agreement No.: '+data.agreementNumbers.join('; '),left,y-8,500,9);y-=18;
 const heading=()=>{page.drawRectangle({x:left,y:y-25,width:right-left,height:27,color:rgb(.94,.96,.98),borderWidth:.5,borderColor:border});text('DESCRIPTION',left+8,y-15,9);text('Revenue USD',337,y-15,9);text('WHT USD',419,y-15,9);text('Payable USD',484,y-15,9);y-=27;};heading();
 for(const line of data.lines){const desc=wrap(line.description,275,9),height=Math.max(30,desc.length*13+14);
  if(y-height<335){page=doc.addPage([595.28,841.89]);text('INVOICE '+data.invoiceNumber+' · continued',left,795,12);y=765;heading();}
  page.drawRectangle({x:left,y:y-height,width:right-left,height,borderWidth:.5,borderColor:border});for(let i=0;i<desc.length;i++)text(desc[i],left+8,y-18-i*13,9);
  for(const [value,x] of [[line.revenue,399],[line.wht,475],[line.payable,547]] as const)text(value,x-font.widthOfTextAtSize(value,9),y-18,9);y-=height;
 }
 const paymentRows=[['Beneficiary',template.bank.beneficiary],['Bank',template.bank.bankName],['Bank address',template.bank.bankAddress],['Account',template.bank.account],['SWIFT',template.bank.swift],['Payment reference',data.invoiceNumber]];
 const footerHeight=22+63+wrap('In words: '+data.amountInWords,500,10).length*14+5+32+paymentRows.reduce((sum,[label,value])=>sum+wrap(label+': '+value,500,9).length*13+3,0);
 if(y-footerHeight<150){page=doc.addPage([595.28,841.89]);text('INVOICE '+data.invoiceNumber+' · totals and payment details',left,795,12);y=760;}
 y-=22;for(const [label,value] of [['Revenue USD',data.totals.revenue],['Withholding tax USD',data.totals.wht],['Net payable USD',data.totals.payable]]){text(label,325,y,10);text(value,right-font.widthOfTextAtSize(value,11),y,11);y-=21;}
 y=block('In words: '+data.amountInWords,left,y-5,500,10);y-=12;text('Payment details',left,y,11);y-=20;
 for(const [label,value] of paymentRows){y=block(label+': '+value,left,y,500,9)-3;}
 if(y<150)throw new CommandError(422,'Thông tin Invoice quá dài cho vùng thanh toán/chữ ký. Rút gọn mô tả hoặc tách theo dịch vụ.');
 text('Authorized signature and company stamp',left,133,10);
 if(doc.getPageCount()>12)throw new CommandError(422,'Invoice vượt giới hạn 12 trang. Tách theo dịch vụ.');
 if(placement.page>doc.getPageCount())throw new CommandError(400,'Trang ký Invoice không tồn tại.');if(includeSigning)drawPlacement(doc.getPage(placement.page-1),await image(doc,signing.bytes,signing.mime),placement);
 doc.setTitle('Invoice '+data.invoiceNumber);return Buffer.from(await doc.save({useObjectStreams:false}));
}
