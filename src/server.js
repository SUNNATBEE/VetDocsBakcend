const { createApp } = require('./app');
const { connectPrisma, disconnectPrisma } = require('./infrastructure/database/prisma.client');

async function bootstrap() {
  const { app, env } = createApp();

  try {
    await connectPrisma();
    // eslint-disable-next-line no-console
    console.log('[db] Postgres ulanish OK');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] Postgres ulanish xatosi:', err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] tinglanmoqda: ${env.apiPublicUrl}${env.apiPrefix}`);
    if (env.enableSwagger) {
      // eslint-disable-next-line no-console
      console.log(`[api] swagger ui: ${env.apiPublicUrl}/docs`);
    }
  });

  async function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`\n[api] ${signal} qabul qilindi, server yopilmoqda...`);
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));

  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('[api] unhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('[api] uncaughtException:', err);
  });
}

bootstrap();
