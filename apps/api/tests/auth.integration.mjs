import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { buildApp } from '../dist/app.js';
import { hashPassword } from '../dist/modules/auth/password.js';
import { tokenHash } from '../dist/modules/auth/access.js';
import { prisma } from '@erp/db';

if (!new URL(process.env.DATABASE_URL).pathname.startsWith('/erp_auth_acceptance')) {
  throw new Error('Tests require an isolated erp_auth_acceptance database');
}
const marker = randomUUID();
const origin = 'https://erp-ui.example.test';
const config = { secret: randomBytes(32).toString('hex'), appOrigin: origin, secureCookies: true,
  bootstrapEnabled: true, bootstrapToken: randomBytes(32).toString('hex'), defaultCompanyCode: 'AUTH_' + marker };
const password = 'Local fixture password for integration tests only';
let app;
const companies = [];
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
async function send(method, url, payload, cookie, csrf) {
  return app.inject({ method, url, payload, headers: { origin, ...(cookie ? { cookie } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}) } });
}
try {
  const c = await prisma.company.create({ data: { companyCode: config.defaultCompanyCode, companyName: 'Auth test' } }); companies.push(c.id);
  const other = await prisma.company.create({ data: { companyCode: 'AUTH_OTHER_' + marker, companyName: 'Other tenant' } }); companies.push(other.id);
  const permission = await prisma.permission.findUniqueOrThrow({ where: { code: 'PROJECT_VIEW' } });
  const all = await prisma.permission.findUniqueOrThrow({ where: { code: 'PROJECT_VIEW_ALL' } });
  const admin = await prisma.role.create({ data: { companyId: c.id, code: 'ADMIN', name: 'Fixture admin',
    permissions: { create: [{ permissionId: permission.id }, { permissionId: all.id }] } } });
  app = await buildApp({ auth: config, logger: false });
  check((await send('GET', '/api/v1/projects')).statusCode, 401);
  check((await send('GET', '/api/v1/auth/me', undefined, 'erp_session=malformed')).statusCode, 401);
  const setup = { companyCode: c.companyCode, email: 'admin@example.test', fullName: 'Fixture admin', password, setupToken: config.bootstrapToken };
  check((await send('POST', '/api/v1/auth/bootstrap', { ...setup, setupToken: 'invalid'.repeat(8) })).statusCode, 403);
  const attempts = await Promise.all([send('POST', '/api/v1/auth/bootstrap', setup), send('POST', '/api/v1/auth/bootstrap', { ...setup, email: 'second@example.test' })]);
  check(attempts.map(r => r.statusCode).sort(), [201, 409]);
  check(await prisma.user.count({ where: { companyId: c.id } }), 1);
  check((await send('POST', '/api/v1/auth/bootstrap', setup)).statusCode, 409);
  const user = await prisma.user.findFirstOrThrow({ where: { companyId: c.id } });
  const credentials = { companyCode: c.companyCode, email: user.email, password };
  check((await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: credentials })).statusCode, 403);
  check((await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: credentials, headers: { origin: 'https://attacker.example.test' } })).statusCode, 403);
  check((await send('POST', '/api/v1/auth/login', { ...credentials, password: 'wrong' })).statusCode, 401);
  const unknown = await send('POST', '/api/v1/auth/login', { ...credentials, email: 'missing@example.test' });
  check(unknown.statusCode, 401); check(unknown.json().message, 'Thông tin đăng nhập không hợp lệ.');
  const login = await send('POST', '/api/v1/auth/login', credentials); check(login.statusCode, 200);
  const setCookie = Array.isArray(login.headers['set-cookie']) ? login.headers['set-cookie'][0] : login.headers['set-cookie'];
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Secure/); assert.match(setCookie, /SameSite=Lax/); checks += 3;
  const cookie = setCookie.split(';')[0]; const token = cookie.split('=')[1];
  check(await prisma.authSession.count({ where: { tokenHash: token } }), 0);
  const session = await prisma.authSession.findUniqueOrThrow({ where: { tokenHash: tokenHash(token) } });
  const me = await send('GET', '/api/v1/auth/me', undefined, cookie); check(me.statusCode, 200);
  check(me.json().user.companyId, c.id); check(me.json().user.permissions, ['PROJECT_VIEW', 'PROJECT_VIEW_ALL']);
  assert.equal('passwordHash' in me.json().user, false); checks++;
  const csrf = me.json().csrfToken;

  const partner = await prisma.partner.create({ data: { companyId: c.id, partnerCode: 'TEST', legalName: 'Fixture', partnerType: 'CUSTOMER' } });
  const otherPartner = await prisma.partner.create({ data: { companyId: other.id, partnerCode: 'TEST', legalName: 'Other fixture', partnerType: 'CUSTOMER' } });
  const owned = await prisma.project.create({ data: { companyId: c.id, partnerId: partner.id, ownerUserId: user.id, projectCode: 'OWN', projectName: 'Owned' } });
  await prisma.project.create({ data: { companyId: c.id, partnerId: partner.id, projectCode: 'UNASSIGNED', projectName: 'Unassigned' } });
  await prisma.project.create({ data: { companyId: other.id, partnerId: otherPartner.id, projectCode: 'OTHER', projectName: 'Other company' } });
  check((await send('GET', '/api/v1/projects?companyId=' + other.id, undefined, cookie)).json().items.length, 2);
  await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId: admin.id, permissionId: all.id } } });
  const crossRole = await prisma.role.create({ data: { companyId: other.id, code: 'CROSS', name: 'Invalid assignment fixture', permissions: { create: { permissionId: all.id } } } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: crossRole.id } });
  check((await send('GET', '/api/v1/projects', undefined, cookie)).json().items.map(p => p.id), [owned.id]);
  await prisma.role.update({ where: { id: admin.id }, data: { status: 'INACTIVE' } });
  check((await send('GET', '/api/v1/projects', undefined, cookie)).statusCode, 403);
  await prisma.role.update({ where: { id: admin.id }, data: { status: 'ACTIVE' } });
  await prisma.user.update({ where: { id: user.id }, data: { status: 'LOCKED' } });
  check((await send('GET', '/api/v1/auth/me', undefined, cookie)).statusCode, 401);
  await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
  await prisma.company.update({ where: { id: c.id }, data: { status: 'INACTIVE' } });
  check((await send('GET', '/api/v1/auth/me', undefined, cookie)).statusCode, 401);
  await prisma.company.update({ where: { id: c.id }, data: { status: 'ACTIVE' } });
  await assert.rejects(prisma.authSession.create({ data: { tokenHash: 'a'.repeat(64), companyId: other.id, userId: user.id, expiresAt: new Date(Date.now() + 60000) } }), e => e.code === 'P2003'); checks++;
  await app.close(); app = await buildApp({ auth: config, logger: false });
  check((await send('GET', '/api/v1/auth/me', undefined, cookie)).statusCode, 200);
  check((await send('POST', '/api/v1/auth/logout', {}, cookie)).statusCode, 403);
  check((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', payload: {}, headers: { cookie, origin: 'https://attacker.example.test', 'x-csrf-token': csrf } })).statusCode, 403);
  check((await send('POST', '/api/v1/auth/logout', {}, cookie, csrf)).statusCode, 200);
  check((await send('GET', '/api/v1/auth/me', undefined, cookie)).statusCode, 401);
  const newLogin = await send('POST', '/api/v1/auth/login', credentials);
  const newCookie = newLogin.headers['set-cookie'].split(';')[0];
  check((await send('POST', '/api/v1/auth/logout', {}, newCookie, csrf)).statusCode, 403);
  const newToken = newCookie.split('=')[1];
  const rotated = await send('POST', '/api/v1/auth/login', credentials, newCookie);
  check(rotated.statusCode, 200);
  check((await send('GET', '/api/v1/auth/me', undefined, newCookie)).statusCode, 401);
  const rotatedCookie = rotated.headers['set-cookie'].split(';')[0];
  const rotatedToken = rotatedCookie.split('=')[1];
  check(await prisma.authSession.count({ where: { tokenHash: tokenHash(newToken) } }), 0);
  await prisma.authSession.update({ where: { tokenHash: tokenHash(rotatedToken) }, data: { createdAt: new Date(Date.now() - 120000), expiresAt: new Date(Date.now() - 60000) } });
  check((await send('GET', '/api/v1/auth/me', undefined, rotatedCookie)).statusCode, 401);
  for (let i = 0; i < 10; i++) check((await send('POST', '/api/v1/auth/login', { ...credentials, email: 'rate@example.test', password: 'wrong' })).statusCode, 401);
  check((await send('POST', '/api/v1/auth/login', { ...credentials, email: 'rate@example.test', password: 'wrong' })).statusCode, 429);
  const audits = await prisma.auditLog.findMany({ where: { companyId: c.id } });
  assert(audits.some(a => a.action === 'AUTH_BOOTSTRAP_ADMIN')); assert(audits.some(a => a.action === 'AUTH_LOGIN')); assert(audits.some(a => a.action === 'AUTH_LOGOUT')); checks += 3;
  await app.close(); app = await buildApp({ auth: { ...config, bootstrapEnabled: false }, logger: false });
  check((await send('POST', '/api/v1/auth/bootstrap', setup)).statusCode, 404);
  await app.close(); app = await buildApp({ auth: { ...config, bootstrapToken: 'short' }, logger: false });
  check((await send('POST', '/api/v1/auth/bootstrap', setup)).statusCode, 404);
  console.log(`PASS: ${checks} authentication, CSRF, tenant isolation, RBAC, session persistence and bootstrap checks`);
} finally {
  await app?.close();
  await prisma.authSession.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.auditLog.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.project.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.partner.deleteMany({ where: { companyId: { in: companies } } });
  const users = await prisma.user.findMany({ where: { companyId: { in: companies } }, select: { id: true } });
  await prisma.userRole.deleteMany({ where: { userId: { in: users.map(u => u.id) } } });
  await prisma.user.deleteMany({ where: { companyId: { in: companies } } });
  const roles = await prisma.role.findMany({ where: { companyId: { in: companies } }, select: { id: true } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: roles.map(r => r.id) } } });
  await prisma.role.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.company.deleteMany({ where: { id: { in: companies } } });
  await prisma.$disconnect();
}
