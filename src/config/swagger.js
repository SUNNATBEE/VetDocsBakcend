const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const yaml = require('yaml');
const swaggerUi = require('swagger-ui-express');

function loadOpenApiDocument(env) {
  const specPath = path.join(__dirname, '../../docs/openapi.yaml');
  const raw = fs.readFileSync(specPath, 'utf8');
  const doc = yaml.parse(raw);
  doc.servers = [{ url: `${env.apiPublicUrl}${env.apiPrefix}`, description: 'API v1' }];
  return doc;
}

function setupSwagger(app, env) {
  if (!env.enableSwagger) {
    return;
  }
  let document;
  try {
    document = loadOpenApiDocument(env);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[swagger] OpenAPI hujjatini yuklab bo\'lmadi:', err.message);
    return;
  }
  const requiresSwaggerAuth = Boolean(env.swaggerUsername && env.swaggerPassword);
  if (requiresSwaggerAuth) {
    app.use('/docs', (req, res, next) => {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="Swagger Docs"');
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Swagger autentifikatsiyasi talab qilinadi' },
        });
      }

      const encoded = authHeader.slice('Basic '.length).trim();
      let decoded = '';
      try {
        decoded = Buffer.from(encoded, 'base64').toString('utf8');
      } catch {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Noto‘g‘ri auth header' },
        });
      }

      const separatorIndex = decoded.indexOf(':');
      if (separatorIndex < 0) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Noto‘g‘ri login yoki parol' },
        });
      }

      const username = decoded.slice(0, separatorIndex);
      const password = decoded.slice(separatorIndex + 1);
      const expectedUsername = Buffer.from(env.swaggerUsername, 'utf8');
      const expectedPassword = Buffer.from(env.swaggerPassword, 'utf8');
      const inputUsername = Buffer.from(username, 'utf8');
      const inputPassword = Buffer.from(password, 'utf8');
      const isUsernameMatch =
        inputUsername.length === expectedUsername.length &&
        crypto.timingSafeEqual(inputUsername, expectedUsername);
      const isPasswordMatch =
        inputPassword.length === expectedPassword.length &&
        crypto.timingSafeEqual(inputPassword, expectedPassword);

      if (!isUsernameMatch || !isPasswordMatch) {
        res.set('WWW-Authenticate', 'Basic realm="Swagger Docs"');
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Noto‘g‘ri login yoki parol' },
        });
      }

      return next();
    });
  }

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customCssUrl: undefined,
      customSiteTitle: 'Vet Clinic API — Swagger',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    }),
  );
  app.get('/docs/openapi.yaml', (req, res) => {
    const abs = path.resolve(__dirname, '../../docs/openapi.yaml');
    res.type('text/yaml').sendFile(abs);
  });
}

module.exports = { setupSwagger, loadOpenApiDocument };
