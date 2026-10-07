import type { FastifyInstance } from 'fastify';
import { prisma } from '../../plugins/prisma.js';
export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/v1/health', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'erp-core-api', database: 'connected' };
  });
}
