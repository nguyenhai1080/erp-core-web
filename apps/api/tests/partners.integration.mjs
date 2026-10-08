import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { buildApp } from '../dist/app.js';
import { csrfToken, tokenHash } from '../dist/modules/auth/access.js';
import { prisma } from '@erp/db';
import { hashPassword } from '../dist/modules/auth/password.js';
if (!new URL(process.env.DATABASE_URL).pathname.startsWith('/erp_execution_acceptance_')) throw new Error('Use a disposable erp_execution_acceptance_ database');
const marker=randomUUID(), origin='https://partners.example.test';
const config={secret:randomBytes(32).toString('hex'),appOrigin:origin,secureCookies:true,bootstrapEnabled:false,bootstrapToken:'disabled',defaultCompanyCode:'GST'};
const company=await prisma.company.create({data:{companyCode:'PARTNER_'+marker,companyName:'Disposable partner test'}});
const other=await prisma.company.create({data:{companyCode:'POTHER_'+marker,companyName:'Other test'}});
const user=await prisma.user.create({data:{companyId:company.id,email:'partner@example.test',fullName:'Test',passwordHash:await hashPassword('Disposable local partner fixture password')}});
const role=await prisma.role.create({data:{companyId:company.id,code:'PARTNER',name:'Test',permissions:{create:(await prisma.permission.findMany()).map(p=>({permissionId:p.id}))}}});
await prisma.userRole.create({data:{userId:user.id,roleId:role.id}});
const raw=randomBytes(32).toString('hex');await prisma.authSession.create({data:{tokenHash:tokenHash(raw),companyId:company.id,userId:user.id,expiresAt:new Date(Date.now()+3600000)}});
const app=await buildApp({auth:config,logger:false});let checks=0;
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const request=(method,url,payload,headers={})=>app.inject({method,url,payload,headers:{origin,cookie:'erp_session='+raw,'x-csrf-token':csrfToken(raw,config.secret),...headers}});
const post=(path,body)=>request('POST',path,body);
const profile={legalName:'  Local partner full profile  ',partnerType:'SUPPLIER',partnerCategory:'Outsourcing',countryName:'Việt Nam',paymentTermDays:45,
  registrationNumber:'LOCAL-BR-TEST',taxCode:'LOCAL-TAX-TEST',invoiceRecipient:'Local invoice contact',invoiceEmail:'invoice@example.test',email:'contact@example.test',
  phone:'+84 000000000',registeredAddress:'Local fixture address\nLine 2',billingAddress:'Local invoice address\nLine 2'};
try{
  check((await request('POST','/api/v1/partners',profile,{cookie:''})).statusCode,401);
  check((await request('POST','/api/v1/partners',profile,{'x-csrf-token':'bad'})).statusCode,403);
  check((await request('POST','/api/v1/partners',profile,{origin:'https://foreign.example.test'})).statusCode,403);
  for(const invalid of [{email:'bad'},{invoiceEmail:'bad'},{paymentTermDays:-1},{paymentTermDays:1.5},{paymentTermDays:'45'},{paymentTermDays:3651},{partnerCategory:'Unknown'},{companyId:other.id},{ownerUserId:user.id},{legalName:' '},{partnerCode:'with spaces'},{registeredAddress:'x'.repeat(2001)},{status:'ACTIVE'}])
    check((await post('/api/v1/partners',{...profile,...invalid})).statusCode,400);
  const manual=await post('/api/v1/partners',{...profile,partnerCode:'PTR-0001'});check(manual.statusCode,201);let item=manual.json().item;
  check(item.companyId,company.id);check(item.ownerUserId,user.id);check(item.legalName,profile.legalName.trim());
  for(const [key,value] of Object.entries(profile).filter(([key])=>key!=='legalName'))check(item[key],value);
  check((await post('/api/v1/partners',{...profile,partnerCode:'PTR-0001'})).statusCode,409);
  const auto=await post('/api/v1/partners',{legalName:'Automatic legacy payload',partnerType:'CUSTOMER'});check(auto.statusCode,201);check(auto.json().item.partnerCode,'PTR-0002');
  const foreign=await prisma.partner.create({data:{companyId:other.id,partnerCode:'PTR-0001',legalName:'Foreign scope',partnerType:'CUSTOMER'}});
  check((await request('GET','/api/v1/partners/'+foreign.id)).statusCode,404);
  const list=(await request('GET','/api/v1/partners?page=1&search=LOCAL-TAX')).json();check(list.total,1);check(list.items[0].id,item.id);check(list.items[0].partnerType,'SUPPLIER');
  check((await request('GET','/api/v1/partners?page=0')).statusCode,400);
  const base='/api/v1/partners/'+item.id;
  const old=item.updatedAt;
  const changed={...profile,legalName:'Changed fixture',partnerType:'BOTH',countryName:'Mozambique',paymentTermDays:0,invoiceEmail:null,billingAddress:'',expectedUpdatedAt:old,reason:'Correct fixture details'};
  check((await post('/api/v1/partners/'+foreign.id+'/update',changed)).statusCode,404);
  check((await post(base+'/update',{...changed,partnerCode:'CHANGE'})).statusCode,400);
  check((await post(base+'/update',{...changed,reason:' '})).statusCode,400);
  const races=await Promise.all([post(base+'/update',changed),post(base+'/update',{...changed,legalName:'Second editor'})]);check(races.map(r=>r.statusCode).sort(),[200,409]);
  item=(await request('GET',base)).json().item;check(item.partnerCode,'PTR-0001');check(item.partnerType,'BOTH');check(item.paymentTermDays,0);check(item.invoiceEmail,null);check(item.billingAddress,null);
  check((await post(base+'/update',changed)).statusCode,409);
  const log=await prisma.auditLog.findFirst({where:{entityId:item.id,action:'PARTNER_EDIT'}});check(log.companyId,company.id);check(log.userId,user.id);check(log.reason,changed.reason);check(log.oldValue.invoiceEmail,profile.invoiceEmail);check(log.newValue.invoiceEmail,null);
  for(const direction of ['CUSTOMER','SUPPLIER','BOTH','OTHER'])check((await post('/api/v1/partners',{...profile,partnerType:direction})).statusCode,201);
  for(const category of ['Telco','Content Provider','Aggregator','Vendor','Customer','Outsourcing','Other'])check((await post('/api/v1/partners',{...profile,partnerCategory:category})).statusCode,201);
  await prisma.partner.createMany({data:Array.from({length:52},(_,i)=>({companyId:company.id,partnerCode:'PAGE-'+i,legalName:'Pagination '+i,partnerType:'CUSTOMER'}))});
  const first=(await request('GET','/api/v1/partners?page=1&search=Pagination')).json(),second=(await request('GET','/api/v1/partners?page=2&search=Pagination')).json();
  check(first.total,52);check(first.items.length,50);check(second.items.length,2);check(second.items.some(b=>first.items.some(a=>a.id===b.id)),false);
  const edit=await prisma.permission.findUniqueOrThrow({where:{code:'PARTNER_EDIT'}});await prisma.rolePermission.delete({where:{roleId_permissionId:{roleId:role.id,permissionId:edit.id}}});
  check((await post(base+'/update',{...changed,expectedUpdatedAt:item.updatedAt})).statusCode,403);
  const create=await prisma.permission.findUniqueOrThrow({where:{code:'PARTNER_CREATE'}});await prisma.rolePermission.delete({where:{roleId_permissionId:{roleId:role.id,permissionId:create.id}}});check((await post('/api/v1/partners',profile)).statusCode,403);
  const view=await prisma.permission.findUniqueOrThrow({where:{code:'PARTNER_VIEW'}});await prisma.rolePermission.delete({where:{roleId_permissionId:{roleId:role.id,permissionId:view.id}}});
  check((await request('GET',base)).statusCode,403);check((await request('GET','/api/v1/partners')).statusCode,403);
  console.log(`${checks} partner profile checks passed (disposable company only).`);
}finally{await app.close();await prisma.$disconnect();}
