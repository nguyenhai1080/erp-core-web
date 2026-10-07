import type { FastifyInstance } from 'fastify';
import { prisma } from '../../plugins/prisma.js';
import { projectAccessWhere, requirePermission } from '../auth/access.js';

export async function projectRoutes(app: FastifyInstance) {
  app.get('/api/v1/projects', { preHandler: requirePermission('PROJECT_VIEW') }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const items = await prisma.project.findMany({
      where: projectAccessWhere(request.auth!), take: 100, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, projectCode: true, projectName: true, status: true, progressPercent: true, currency: true }
    });
    return { items, limit: 100 };
  });
}
