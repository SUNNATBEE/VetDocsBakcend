const path = require('path');
const fs = require('fs');
const yaml = require('yaml');
const swaggerUi = require('swagger-ui-express');

function loadOpenApiDocument(env) {
  const specPath = path.join(__dirname, '../../docs/openapi.yaml');
  const raw = fs.readFileSync(specPath, 'utf8');
  const doc = yaml.parse(raw);
  const base = `${env.apiPublicUrl}${env.apiPrefix}`;
  doc.servers = [{ url: base, description: 'API v1' }];
  return doc;
}

function setupSwagger(app, env) {
  if (!env.enableSwagger) {
    return;
  }
  const document = loadOpenApiDocument(env);
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
