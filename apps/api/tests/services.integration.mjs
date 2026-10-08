import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { buildApp } from '../dist/app.js';
import { csrfToken, tokenHash } from '../dist/modules/auth/access.js';
import { prisma } from '@erp/db';
import { hashPassword } from '../dist/modules/auth/password.js';
if(!new URL(process.env.DATABASE_URL).pathname.startsWith('/erp_execution_acceptance_'))throw new Error('Use a disposable erp_execution_acceptance_ database');
const marker=randomUUID(),origin='https://services.example.test';
const config={secret:randomBytes(32).toString('hex'),appOrigin:origin,secureCookies:true,bootstrapEnabled:false,bootstrapToken:'disabled',defaultCompanyCode:'GST'};
const company=await prisma.company.create({data:{companyCode:'SERVICE_'+marker,companyName:'Disposable service test'}});
const other=await prisma.company.create({data:{companyCode:'SOTHER_'+marker,companyName:'Other test'}});
const user=await prisma.user.create({data:{companyId:company.id,email:'service@example.test',fullName:'Test',passwordHash:await hashPassword('Disposable local service fixture password')}});
const role=await prisma.role.create({data:{companyId:company.id,code:'SERVICE',name:'Test',permissions:{create:(await prisma.permission.findMany()).map(p=>({permissionId:p.id}))}}});
await prisma.userRole.create({data:{userId:user.id,roleId:role.id}});
const raw=randomBytes(32).toString('hex');await prisma.authSession.create({data:{tokenHash:tokenHash(raw),companyId:company.id,userId:user.id,expiresAt:new Date(Date.now()+3600000)}});
const app=await buildApp({auth:config,logger:false});let checks=0;
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const request=(method,url,payload,headers={})=>app.inject({method,url,payload,headers:{origin,cookie:'erp_session='+raw,'x-csrf-token':csrfToken(raw,config.secret),...headers}});
const post=(path,body)=>request('POST',path,body);
const profile={serviceName:'  Local DGC service  ',dgcCategory:'Basic',keyword:'LOCAL-KEYWORD',description:'Full service fixture\nLine 2',status:'ACTIVE',startDate:'2026-10-01',endDate:'2027-10-01'};
try{
  check((await request('POST','/api/v1/services',profile,{cookie:''})).statusCode,401);
  check((await request('POST','/api/v1/services',profile,{'x-csrf-token':'bad'})).statusCode,403);
  check((await request('POST','/api/v1/services',profile,{origin:'https://foreign.example.test'})).statusCode,403);
  for(const invalid of [{serviceName:' '},{dgcCategory:'VAS'},{status:'ARCHIVED'},{status:'Unknown'},{startDate:'2026-02-30'},{endDate:'2026-13-01'},
    {companyId:other.id},{createdBy:'spoofed'},{updatedBy:'spoofed'},{category:'VAS'},{keyword:'x'.repeat(501)},{description:'x'.repeat(4001)},{serviceCode:' '}])
    check((await post('/api/v1/services',{...profile,...invalid})).statusCode,400);
  const manual=await post('/api/v1/services',{...profile,serviceCode:'SVC0001'});check(manual.statusCode,201);let item=manual.json().item;
  check(item.companyId,company.id);check(item.serviceKey,'SVC0001');check(item.createdBy,user.email);check(item.updatedBy,user.email);
  check(item.serviceName,profile.serviceName.trim());check(item.dgcCategory,'Basic');check(item.keyword,profile.keyword);check(item.description,profile.description);
  check(item.startDate,'2026-10-01T00:00:00.000Z');check(item.endDate,'2027-10-01T00:00:00.000Z');check(item.category,'OTHER');
  check((await post('/api/v1/services',{...profile,serviceCode:'SVC0001'})).statusCode,409);
  const auto=await post('/api/v1/services',{serviceName:'Minimal donor payload'});check(auto.statusCode,201);check(auto.json().item.serviceKey,'SVC0002');
  check(auto.json().item.serviceCode,'SVC0002');check(auto.json().item.dgcCategory,'Other');check(auto.json().item.status,'ACTIVE');check(auto.json().item.startDate,null);
  check((await post('/api/v1/services',{...profile,serviceKey:'SEPARATE',serviceCode:'SVC0001'})).statusCode,409);
  const foreign=await prisma.service.create({data:{companyId:other.id,serviceKey:'SVC0001',serviceCode:'SVC0001',serviceName:'Foreign scope',category:'VAS'}});
  const base='/api/v1/services/'+item.id;
  check((await request('GET','/api/v1/services/'+foreign.id)).statusCode,404);
  const list=(await request('GET','/api/v1/services?page=1&search=LOCAL-KEYWORD')).json();check(list.total,1);check(list.items[0].id,item.id);
  check((await request('GET','/api/v1/services?page=0')).statusCode,400);
  const changed={...profile,serviceCode:'EDITED-CODE',status:'SUSPENDED',dgcCategory:'Content',keyword:null,description:'',startDate:null,endDate:null,expectedUpdatedAt:item.updatedAt,reason:'Correct service fixture'};
  check((await post('/api/v1/services/'+foreign.id+'/update',changed)).statusCode,404);
  check((await post(base+'/update',{...changed,serviceKey:'CHANGED'})).statusCode,400);
  check((await post(base+'/update',{...changed,reason:' '})).statusCode,400);
  check((await post(base+'/update',{...changed,serviceCode:'SVC0002'})).statusCode,409);
  const races=await Promise.all([post(base+'/update',changed),post(base+'/update',{...changed,serviceName:'Second editor'})]);check(races.map(r=>r.statusCode).sort(),[200,409]);
  item=(await request('GET',base)).json().item;check(item.serviceKey,'SVC0001');check(item.serviceCode,'EDITED-CODE');check(item.status,'SUSPENDED');check(item.keyword,null);check(item.description,null);check(item.startDate,null);check(item.endDate,null);
  check((await post(base+'/update',changed)).statusCode,409);
  const log=await prisma.auditLog.findFirst({where:{entityId:item.id,action:'SERVICE_EDIT'}});check(log.companyId,company.id);check(log.userId,user.id);check(log.reason,changed.reason);check(log.oldValue.keyword,profile.keyword);check(log.newValue.keyword,null);
  for(const dgcCategory of ['Basic','Application','Content','Utility','Other'])check((await post('/api/v1/services',{...profile,dgcCategory})).statusCode,201);
  for(const status of ['ACTIVE','INACTIVE','SUSPENDED'])check((await post('/api/v1/services',{...profile,status})).statusCode,201);
  const filtered=(await request('GET','/api/v1/services?status=SUSPENDED')).json();check(filtered.items.every(s=>s.status==='SUSPENDED'),true);check(filtered.total,2);
  // The donor does not reject reversed periods. Preserve its behavior, documenting this limitation.
  check((await post('/api/v1/services',{...profile,startDate:'2027-01-01',endDate:'2026-01-01'})).statusCode,201);
  const child=auto.json().item;
  const partner=await prisma.partner.create({data:{companyId:company.id,partnerCode:'FIXTURE',legalName:'Fixture',partnerType:'SUPPLIER'}});
  const link=await prisma.partnerService.create({data:{companyId:company.id,partnerId:partner.id,serviceId:item.id,businessModel:'REVENUE_SHARE',effectiveFrom:new Date('2026-10-01')}});
  let deletion={expectedUpdatedAt:item.updatedAt,reason:'Disposable fixture deletion'};
  check((await post(base+'/delete',deletion)).statusCode,409);check(await prisma.service.count({where:{id:item.id}}),1);
  const suspend=await post(base+'/update',{...changed,expectedUpdatedAt:item.updatedAt,status:'INACTIVE'});check(suspend.statusCode,200);item=suspend.json().item;deletion.expectedUpdatedAt=item.updatedAt;
  await prisma.partnerService.delete({where:{id:link.id}});
  const relation=await prisma.serviceRelationship.create({data:{companyId:company.id,parentServiceId:item.id,childServiceId:child.id,relationshipType:'BUNDLED',effectiveFrom:new Date('2026-10-01')}});
  check((await post(base+'/delete',deletion)).statusCode,409);
  check((await post('/api/v1/services/'+child.id+'/delete',{...deletion,expectedUpdatedAt:child.updatedAt})).statusCode,409);
  await prisma.serviceRelationship.delete({where:{id:relation.id}});
  check((await post(base+'/delete',{...deletion,expectedUpdatedAt:changed.expectedUpdatedAt})).statusCode,409);
  check((await post('/api/v1/services/'+foreign.id+'/delete',deletion)).statusCode,404);
  check((await post(base+'/delete',deletion)).statusCode,200);check((await request('GET',base)).statusCode,404);
  const deletionLog=await prisma.auditLog.findFirst({where:{entityId:item.id,action:'SERVICE_DELETE'}});check(deletionLog.oldValue.serviceKey,'SVC0001');check(deletionLog.userId,user.id);
  await prisma.service.createMany({data:Array.from({length:52},(_,i)=>({companyId:company.id,serviceKey:'PAGE-'+i,serviceCode:'PAGE-'+i,serviceName:'Pagination '+i,category:'OTHER'}))});
  const first=(await request('GET','/api/v1/services?page=1&search=Pagination')).json(),second=(await request('GET','/api/v1/services?page=2&search=Pagination')).json();
  check(first.total,52);check(first.items.length,50);check(second.items.length,2);check(second.items.some(b=>first.items.some(a=>a.id===b.id)),false);
  for(const [permission,path,body] of [['SERVICE_ARCHIVE','/'+child.id+'/delete',{expectedUpdatedAt:child.updatedAt,reason:'Fixture'}],['SERVICE_EDIT','/'+child.id+'/update',{...changed,expectedUpdatedAt:child.updatedAt}],['SERVICE_CREATE','',profile]]){
    const p=await prisma.permission.findUniqueOrThrow({where:{code:permission}});await prisma.rolePermission.delete({where:{roleId_permissionId:{roleId:role.id,permissionId:p.id}}});check((await post('/api/v1/services'+path,body)).statusCode,403);
  }
  const p=await prisma.permission.findUniqueOrThrow({where:{code:'SERVICE_VIEW'}});await prisma.rolePermission.delete({where:{roleId_permissionId:{roleId:role.id,permissionId:p.id}}});
  check((await request('GET','/api/v1/services/'+child.id)).statusCode,403);check((await request('GET','/api/v1/services')).statusCode,403);
  console.log(`${checks} DGC service checks passed (disposable company only).`);
}finally{await app.close();await prisma.$disconnect();}
