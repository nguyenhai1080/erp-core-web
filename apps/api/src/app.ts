import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { healthRoutes } from './modules/health/health.routes.js';
export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(helmet);
  await app.register(cookie);
  await app.register(healthRoutes);
  return app;
}
