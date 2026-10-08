import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, Prisma } from '@erp/db';
import { requirePermission, type AuthConfig } from '../auth/access.js';
import { audit, code, CommandError, text, timestamp, unchanged, writeGuard } from './commands.js';

const optionalText = (max = 500) => z.string().trim().max(max).nullable().optional();
const optionalEmail = z.union([z.email().max(254), z.literal('')]).nullable().optional();
const profile = z.object({
  legalName: text,
  partnerType: z.enum(['CUSTOMER','SUPPLIER','BOTH','OTHER']),
  partnerCategory: z.enum(['Telco','Content Provider','Aggregator','Vendor','Customer','Outsourcing','Other']).nullable().optional(),
  countryName: optionalText(100), paymentTermDays: z.number().int().min(0).max(3650).nullable().optional(),
  registrationNumber: optionalText(100), taxCode: optionalText(100), invoiceRecipient: optionalText(200),
  invoiceEmail: optionalEmail, email: optionalEmail, phone: optionalText(100),
  registeredAddress: optionalText(2000), billingAddress: optionalText(2000)
});
function parseProfile<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new CommandError(400, 'Hồ sơ đối tác chưa hợp lệ. Kiểm tra tên, email, nhóm và số ngày thanh toán (0–3650).');
  return result.data;
}
const normalize = (body: Record<string, unknown>) => Object.fromEntries(Object.entries(body).map(([k,v]) => [k, v === '' ? null : v]));
const idOf = (input: unknown) => parseProfile(z.object({ id: z.uuid() }).strict(), input).id;
async function availableCode(tx: Prisma.TransactionClient, companyId: string) {
  // Manual codes may already occupy a generated sequence value. Advance without overwriting.
  for (let i=0; i<100; i++) {
    const next = await code(tx,companyId,'PARTNER','PTR');
    if (!await tx.partner.findUnique({where:{companyId_partnerCode:{companyId,partnerCode:next}}})) return next;
  }
  throw new CommandError(409,'Chưa thể cấp mã tự động. Vui lòng nhập mã đối tác riêng.');
}
export async function partnerRoutes(app: FastifyInstance, config: AuthConfig) {
  app.get('/api/v1/partners', { preHandler: requirePermission('PARTNER_VIEW') }, async request => {
    const query = parseProfile(z.object({ search: z.string().trim().max(200).optional(), page: z.coerce.number().int().min(1).max(100000).optional() }).strict(), request.query);
    const where: Prisma.PartnerWhereInput = {companyId:request.auth!.companyId,status:{in:['ACTIVE','PROSPECT']},
      ...(query.search ? { OR:['legalName','partnerCode','taxCode','email'].map(key=>({[key]:{contains:query.search,mode:'insensitive'}})) } : {})};
    const limit=query.page ? 50 : 100;
    const [items,total] = await prisma.$transaction([
      prisma.partner.findMany({where,take:limit,skip:((query.page??1)-1)*limit,orderBy:[{legalName:'asc'},{id:'asc'}],
        select:{id:true,partnerCode:true,legalName:true,partnerType:true,partnerCategory:true,countryName:true,countryCode:true,taxCode:true,email:true,status:true}}),
      prisma.partner.count({where})
    ]);
    return {items,total,limit,page:query.page??1};
  });
  app.get('/api/v1/partners/:id', { preHandler: requirePermission('PARTNER_VIEW') }, async request => {
    const item=await prisma.partner.findFirst({where:{id:idOf(request.params),companyId:request.auth!.companyId}});
    if (!item) throw new CommandError(404,'Không tìm thấy đối tác của công ty.');
    return {item};
  });
  app.post('/api/v1/partners', { preHandler: writeGuard('PARTNER_CREATE',config) }, async (request,reply) => {
    const body=parseProfile(profile.extend({partnerCode:z.string().trim().min(1).max(100).regex(/^[\p{L}\p{N}_.-]+$/u).optional()}).strict(),request.body);
    const {partnerCode,...fields}=body; const user=request.auth!;
    const item=await prisma.$transaction(async tx=>{
      const item=await tx.partner.create({data:{...normalize(fields),legalName:fields.legalName,partnerType:fields.partnerType,
        companyId:user.companyId,ownerUserId:user.userId,partnerCode:partnerCode??await availableCode(tx,user.companyId)}});
      await audit(tx,user,'PARTNER_CREATE','Partner',item.id,null,item); return item;
    }); return reply.code(201).send({item});
  });
  app.post('/api/v1/partners/:id/update', { preHandler: writeGuard('PARTNER_EDIT',config) }, async request => {
    const body=parseProfile(profile.extend({expectedUpdatedAt:timestamp,reason:text}).strict(),request.body);
    const {expectedUpdatedAt,reason,...fields}=body; const user=request.auth!; const id=idOf(request.params);
    const item=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM partners WHERE id=${id}::uuid AND company_id=${user.companyId}::uuid FOR UPDATE`;
      const old=await tx.partner.findFirst({where:{id,companyId:user.companyId}});
      if (!old) throw new CommandError(404,'Không tìm thấy đối tác của công ty.');
      unchanged(old,expectedUpdatedAt);
      if (!['ACTIVE','PROSPECT'].includes(old.status)) throw new CommandError(409,'Đối tác đã ngừng sử dụng; không thể sửa hồ sơ.');
      const item=await tx.partner.update({where:{id},data:normalize(fields)});
      await audit(tx,user,'PARTNER_EDIT','Partner',id,old,item,reason); return item;
    }); return {item};
  });
}
