const { createApp } = require('./app');
const { connectPrisma, disconnectPrisma } = require('./infrastructure/database/prisma.client');

const DB_RECONNECT_DELAY_MS = 5000;

async function bootstrap() {
  const { app, env } = createApp();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] tinglanmoqda: ${env.apiPublicUrl}${env.apiPrefix}`);
    if (env.enableSwagger) {
      // eslint-disable-next-line no-console
      console.log(`[api] swagger ui: ${env.apiPublicUrl}/docs`);
    }
  });

  // Railway healthcheck port ochilganini kutadi; DB vaqtincha yo'q bo'lsa ham
  // servisni yiqitmaymiz va fonda qayta ulanishni davom ettiramiz.
  let reconnectTimer = null;
  let shuttingDown = false;

  async function connectDatabaseWithRetry() {
    try {
      await connectPrisma();
      // eslint-disable-next-line no-console
      console.log('[db] Postgres ulanish OK');
      reconnectTimer = null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[db] Postgres ulanish xatosi:', err.message);
      if (!shuttingDown) {
        reconnectTimer = setTimeout(connectDatabaseWithRetry, DB_RECONNECT_DELAY_MS);
        reconnectTimer.unref();
      }
    }
  }

  void connectDatabaseWithRetry();

  async function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`\n[api] ${signal} qabul qilindi, server yopilmoqda...`);
    shuttingDown = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
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
